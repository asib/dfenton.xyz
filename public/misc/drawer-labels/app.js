import { buildStrip, decodeLabelData, dotsToMm, encodeRaster, HEIGHT, LabelError, renderLabel } from './labels.js';
import { hasLength, isMetric, labelSpec, lengthSuggestions, partById, PARTS, sizeSuggestions } from './parts.js';
import { choosePrinter, connect, describeTape, PrinterError, printRaster, readinessProblem, requestStatus } from './ptouch.js';

const data = decodeLabelData(await (await fetch(new URL('label-data.json', import.meta.url))).json());

// 6 mm tape is about 43 dots across; the head prints the middle 32.
const TAPE_DOTS = 43;
const TAPE_OFFSET = 5;
const STORAGE_KEY = 'drawer-labels';
const $ = (id) => document.getElementById(id);
const hasUsb = 'usb' in navigator;
let busy = false; // one printer conversation at a time

const state = {
  part: 'hex',
  fields: { size: '1/4-20', length: '1', top: '', bottom: '' },
  strip: [],
};

function restore() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (!saved || typeof saved !== 'object') return;
    if (PARTS.some((part) => part.id === saved.part)) state.part = saved.part;
    for (const key of Object.keys(state.fields)) {
      if (typeof saved.fields?.[key] === 'string') state.fields[key] = saved.fields[key];
    }
    if (Array.isArray(saved.strip)) {
      state.strip = saved.strip.filter((item) => item && typeof item.icon === 'string' &&
        typeof item.top === 'string' && typeof item.bottom === 'string');
    }
  } catch { /* nothing saved, or storage unavailable */ }
}

function save() {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
}

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// A bitmap on white tape, scale screen pixels to a dot.
function drawTape(canvas, bitmap, scale, width = bitmap?.width ?? 0) {
  canvas.width = Math.max(1, width) * scale;
  canvas.height = TAPE_DOTS * scale;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = css('--tape');
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!bitmap) return;
  ctx.fillStyle = css('--ink');
  for (let y = 0; y < bitmap.height; y++) {
    for (let x = 0; x < bitmap.width; x++) {
      if (bitmap.bits[y * bitmap.width + x]) ctx.fillRect(x * scale, (TAPE_OFFSET + y) * scale, scale, scale);
    }
  }
}

function drawIcon(canvas, bitmap, scale) {
  canvas.width = bitmap.width * scale;
  canvas.height = HEIGHT * scale;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = getComputedStyle(canvas).color;
  for (let y = 0; y < bitmap.height; y++) {
    for (let x = 0; x < bitmap.width; x++) {
      if (bitmap.bits[y * bitmap.width + x]) ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
}

const describe = (spec) => [spec.top, spec.bottom].filter(Boolean).join(' / ') || 'icon only';

function render(spec) {
  try {
    return { label: renderLabel(data, spec) };
  } catch (error) {
    if (error instanceof LabelError) return { error: error.message };
    throw error;
  }
}

// Part tiles, each with its icon.
function buildParts() {
  const container = $('parts');
  for (const part of PARTS) {
    const tile = document.createElement('label');
    tile.className = 'part';
    const input = Object.assign(document.createElement('input'), { type: 'radio', name: 'part', value: part.id });
    input.addEventListener('change', () => selectPart(part.id));
    let picture;
    if (part.icon === 'none') {
      picture = Object.assign(document.createElement('span'), { className: 'glyph', textContent: 'Aa' });
    } else {
      picture = document.createElement('canvas');
      picture.dataset.icon = part.icon;
    }
    picture.setAttribute('aria-hidden', 'true');
    tile.append(input, picture, part.name);
    container.append(tile);
  }
}

function drawPartIcons() {
  for (const canvas of $('parts').querySelectorAll('canvas[data-icon]')) drawIcon(canvas, data.icons[canvas.dataset.icon], 2);
}

function fillList(id, values) {
  $(id).replaceChildren(...values.map((value) => Object.assign(document.createElement('option'), { value })));
}

function selectPart(id) {
  const previous = partById(state.part);
  const part = partById(id);
  state.part = part.id;
  // A part's own second line replaces the previous part's, but not one typed in.
  if (!state.fields.bottom || state.fields.bottom === (previous.bottom ?? '')) state.fields.bottom = part.bottom ?? '';
  if (part.kind !== previous.kind && !sizeSuggestions(part).includes(state.fields.size)) state.fields.size = '';
  syncBuilder();
}

function syncBuilder() {
  const part = partById(state.part);
  for (const input of document.querySelectorAll('input[name="part"]')) input.checked = input.value === part.id;
  const text = part.kind === 'text';
  $('size-field').hidden = text;
  $('top-field').hidden = !text;
  $('length-field').hidden = !hasLength(part);
  $('size-name').textContent = { wood: 'Gauge', washer: 'Size' }[part.kind] ?? 'Thread';
  $('length-name').textContent = `Length (${isMetric(state.fields.size) ? 'mm' : 'inches'})`;
  for (const [key, value] of Object.entries(state.fields)) if ($(key).value !== value) $(key).value = value;
  fillList('size-list', sizeSuggestions(part));
  fillList('length-list', lengthSuggestions(part, state.fields.size));
  updatePreview();
  save();
}

function currentSpec() {
  return labelSpec(partById(state.part), state.fields);
}

function updatePreview() {
  const spec = currentSpec();
  const { label, error } = render(spec);
  const info = $('label-info');
  drawTape($('label-canvas'), label ?? null, 4, label?.width ?? 120);
  $('label-canvas').setAttribute('aria-label', label ? `Label preview: ${describe(spec)}` : 'Empty label');
  info.className = error ? 'error' : '';
  info.textContent = error ?? `${describe(spec)} · ${dotsToMm(label.width).toFixed(1)} mm`;
  $('add').disabled = !label;
}

function renderStrip() {
  const rendered = state.strip.map((spec) => ({ spec, ...render(spec) }));
  const labels = rendered.filter((item) => item.label).map((item) => item.label);
  const { strip } = buildStrip(labels);
  const count = state.strip.length;
  $('strip-scroll').hidden = !labels.length;
  if (labels.length) drawTape($('strip-canvas'), strip, 2);
  $('strip-canvas').setAttribute('aria-label', `Strip of ${count} labels`);
  $('strip-info').textContent = count
    ? `${count} label${count === 1 ? '' : 's'}, ${dotsToMm(strip.width).toFixed(1)} mm of tape, with cut marks between them.`
    : 'No labels yet. Add one above.';
  const list = $('strip-list');
  list.replaceChildren(...rendered.map((item, index) => {
    const li = document.createElement('li');
    const thumb = document.createElement('canvas');
    thumb.className = 'tape thumb';
    thumb.setAttribute('aria-hidden', 'true');
    if (item.label) drawTape(thumb, item.label, 2);
    const text = document.createElement('span');
    text.className = item.error ? 'text error' : 'text';
    text.textContent = item.error ? `${describe(item.spec)}: ${item.error}` : `${describe(item.spec)} · ${dotsToMm(item.label.width).toFixed(1)} mm`;
    const buttons = document.createElement('span');
    buttons.className = 'buttons';
    const button = (label, title, disabled, action) => {
      const b = Object.assign(document.createElement('button'), { type: 'button', textContent: label, title, disabled });
      b.setAttribute('aria-label', `${title}: ${describe(item.spec)}`);
      b.addEventListener('click', action);
      return b;
    };
    buttons.append(
      button('↑', 'Move up', index === 0, () => move(index, -1)),
      button('↓', 'Move down', index === count - 1, () => move(index, 1)),
      button('✕', 'Remove', false, () => { state.strip.splice(index, 1); renderStrip(); }),
    );
    li.append(thumb, text, buttons);
    return li;
  }));
  $('download').disabled = !labels.length;
  $('clear').disabled = !count;
  updatePrinterButtons();
  save();
}

const stripLabels = () => state.strip.map((spec) => render(spec).label).filter(Boolean);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function updatePrinterButtons() {
  const count = stripLabels().length;
  $('print-strip').textContent = count ? `Print ${plural(count, 'label')}` : 'Print strip';
  $('print-strip').disabled = busy || !hasUsb || !count;
  $('check-printer').disabled = busy || !hasUsb;
}

function move(index, step) {
  const [item] = state.strip.splice(index, 1);
  state.strip.splice(index + step, 0, item);
  renderStrip();
}

function addCurrent() {
  const spec = currentSpec();
  if (!render(spec).label) return;
  state.strip.push(spec);
  renderStrip();
}

function download() {
  const labels = stripLabels();
  if (!labels.length) return;
  const { strip } = buildStrip(labels);
  const canvas = document.createElement('canvas');
  canvas.width = strip.width;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(strip.width, HEIGHT);
  strip.bits.forEach((bit, i) => {
    const v = bit ? 0 : 255;
    image.data.set([v, v, v, 255], i * 4);
  });
  ctx.putImageData(image, 0, 0);
  canvas.toBlob((blob) => {
    const link = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: 'drawer-labels.png',
    });
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }, 'image/png');
}

function report(element, text, tone = '') {
  element.className = `print-status ${tone}`;
  element.textContent = text;
}
const showPrinter = (text, tone) => report($('printer-status'), text, tone);

function printerErrorText(error) {
  if (error instanceof PrinterError) return error.message;
  if (error.name === 'NotFoundError') return 'No printer was chosen.';
  if (error.name === 'SecurityError') return `The browser won’t allow USB here: ${error.message}`;
  return `${error.name}: ${error.message}`;
}

// Read-only: the printer is sent the status request and nothing else.
async function checkPrinter() {
  if (busy) return;
  busy = true;
  updatePrinterButtons();
  $('printer-raw').hidden = true;
  showPrinter('Choose the PT-D410 if the browser asks…');
  let connection;
  try {
    const device = await choosePrinter(navigator.usb);
    connection = await connect(device);
    showPrinter('Reading status…');
    const status = await requestStatus(connection);
    const problem = readinessProblem(status);
    showPrinter(`${device.productName || 'PT-D410'}: ${describeTape(status)}. ${problem ?? 'Ready.'}`, problem ? 'error' : 'ok');
    $('printer-raw-bytes').textContent = status.raw;
    $('printer-raw').hidden = false;
  } catch (error) {
    showPrinter(printerErrorText(error), 'error');
  } finally {
    await connection?.close();
    busy = false;
    updatePrinterButtons();
  }
}

// Print a strip bitmap, reporting progress in `out`. `what` names it, as
// "3 labels".
async function printStrip(strip, out, what) {
  if (busy) return;
  busy = true;
  updatePrinterButtons();
  const phases = {
    checking: () => 'Checking the printer…',
    sending: (fraction) => `Sending ${what}… ${Math.round(fraction * 100)}%`,
    printing: () => 'Printing…',
  };
  let connection;
  try {
    const raster = encodeRaster(strip);
    report(out, 'Choose the PT-D410 if the browser asks…');
    connection = await connect(await choosePrinter(navigator.usb));
    const result = await printRaster(connection, raster, { onProgress: (phase, fraction) => report(out, phases[phase](fraction)) });
    if (result.completionConfirmed) {
      report(out, `Printed ${what}. Cut a little past the last mark, then trim at the marks.`, 'ok');
    } else {
      report(out, `Sent ${what}, but the printer didn’t say it had finished. Check the tape before printing again.`, 'error');
    }
  } catch (error) {
    const started = error.result?.printDataWriteAttempted;
    report(out, `${printerErrorText(error)}${started ? ' Printing may have started: check the printer before trying again. Nothing was resent.' : ''}`, 'error');
  } finally {
    await connection?.close();
    busy = false;
    updatePrinterButtons();
  }
}

function redrawAll() {
  drawPartIcons();
  updatePreview();
  renderStrip();
}

// The host page sends the site theme; follow it without rebuilding anything.
window.addEventListener('message', (event) => {
  if (event.source !== window.parent || event.origin !== window.location.origin) return;
  const theme = event.data?.type === 'site-theme' ? event.data.theme : null;
  if (theme !== 'light' && theme !== 'dark') return;
  if (document.documentElement.dataset.theme !== theme) {
    document.documentElement.dataset.theme = theme;
    redrawAll();
  }
});

// Report the content's height so the host sizes its frame to fit.
if (window.parent !== window) {
  const main = document.querySelector('main');
  let last = 0;
  new ResizeObserver(() => {
    const height = Math.ceil(main.getBoundingClientRect().bottom + window.scrollY);
    if (height !== last) {
      last = height;
      window.parent.postMessage({ type: 'diagram-height', height }, window.location.origin);
    }
  }).observe(main);
}

restore();
buildParts();
for (const key of Object.keys(state.fields)) {
  $(key).addEventListener('input', (event) => {
    state.fields[key] = event.target.value;
    if (key === 'size') {
      $('length-name').textContent = `Length (${isMetric(state.fields.size) ? 'mm' : 'inches'})`;
      fillList('length-list', lengthSuggestions(partById(state.part), state.fields.size));
    }
    updatePreview();
    save();
  });
  $(key).addEventListener('keydown', (event) => { if (event.key === 'Enter') addCurrent(); });
}
$('add').addEventListener('click', addCurrent);
$('download').addEventListener('click', download);
$('clear').addEventListener('click', () => { state.strip = []; renderStrip(); });
$('check-printer').addEventListener('click', checkPrinter);
$('print-strip').addEventListener('click', () => {
  const labels = stripLabels();
  if (labels.length) printStrip(buildStrip(labels).strip, $('strip-print-status'), plural(labels.length, 'label'));
});
if (!hasUsb) {
  const why = 'This browser can’t reach USB devices, so it can’t print. Use Chrome or Edge on a computer.';
  showPrinter(why, 'error');
  report($('strip-print-status'), why, 'error');
}
drawPartIcons();
syncBuilder();
renderStrip();
