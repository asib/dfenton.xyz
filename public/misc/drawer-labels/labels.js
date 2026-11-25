// Drawer labels for a Brother PT-D410 on 6 mm tape: 180 dpi, 32 printable dots
// across the tape. A bitmap is { width, height, bits }, row-major, 1 for ink.
//
// The layout copies the PT-D410 label scripts: an icon, a 6-dot gap, then the
// size in 20 px Liberation Sans Bold, optionally over a centred 14 px line,
// 3 dots between lines and 7 blank dots at each end.

export const HEIGHT = 32;
export const MAX_WIDTH = 180; // 1 inch: the longest label print_hardware_batch.py accepts
export const DPI = 180;
const MARGIN = 7;
const ICON_GAP = 6;
const LINE_GAP = 3;

export const dotsToMm = (dots) => dots * 25.4 / DPI;

function blank(width, height) {
  return { width, height, bits: new Uint8Array(width * height) };
}

function decodeRows(rows, width) {
  const bitmap = blank(width, rows.length);
  rows.forEach((row, y) => {
    for (let x = 0; x < width; x++) {
      const nibble = parseInt(row[x >> 2], 16);
      bitmap.bits[y * width + x] = (nibble >> (3 - (x & 3))) & 1;
    }
  });
  return bitmap;
}

// label-data.json, made by scripts/export-drawer-labels.py.
export function decodeLabelData(json) {
  const fonts = {};
  for (const [size, font] of Object.entries(json.fonts)) {
    const glyphs = new Map();
    for (const [char, g] of Object.entries(font.glyphs)) {
      glyphs.set(char, {
        advance: g.advance,
        x: g.x ?? 0,
        y: g.y ?? 0,
        bitmap: g.rows ? decodeRows(g.rows, g.width) : null,
      });
    }
    fonts[size] = { glyphs, kerning: new Map(Object.entries(font.kerning)) };
  }
  const icons = {};
  for (const [kind, icon] of Object.entries(json.icons)) icons[kind] = decodeRows(icon.rows, icon.width);
  return { fonts, icons };
}

export class LabelError extends Error {}

// The text's ink, cropped. Advances and kerning are in 1/64 px; each glyph is
// drawn at its pen position rounded to the nearest dot.
export function textBitmap(font, text) {
  const points = [];
  let pen = 0;
  let previous = null;
  for (const char of text) {
    const glyph = font.glyphs.get(char);
    if (!glyph) throw new LabelError(`The label font has no “${char}”.`);
    if (previous) pen += font.kerning.get(previous + char) ?? 0;
    if (glyph.bitmap) {
      const px = Math.floor((pen + 32) / 64);
      const { width, height, bits } = glyph.bitmap;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (bits[y * width + x]) points.push(px + glyph.x + x, glyph.y + y);
        }
      }
    }
    pen += glyph.advance;
    previous = char;
  }
  if (!points.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < points.length; i += 2) {
    x0 = Math.min(x0, points[i]); x1 = Math.max(x1, points[i]);
    y0 = Math.min(y0, points[i + 1]); y1 = Math.max(y1, points[i + 1]);
  }
  const bitmap = blank(x1 - x0 + 1, y1 - y0 + 1);
  for (let i = 0; i < points.length; i += 2) {
    bitmap.bits[(points[i + 1] - y0) * bitmap.width + points[i] - x0] = 1;
  }
  return bitmap;
}

function paste(target, source, left, top) {
  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < source.width; x++) {
      if (source.bits[y * source.width + x]) target.bits[(top + y) * target.width + left + x] = 1;
    }
  }
}

// { icon, top, bottom } → a label 32 dots tall. icon is a key of data.icons,
// or 'none' for text alone.
export function renderLabel(data, { icon, top, bottom }) {
  const head = icon === 'none' ? null : data.icons[icon];
  if (head === undefined) throw new LabelError(`Unknown icon “${icon}”.`);
  const lines = [];
  for (const [text, size] of [[top, '20'], [bottom, '14']]) {
    if (!text?.trim()) continue;
    const line = textBitmap(data.fonts[size], text.trim());
    if (line) lines.push(line);
  }
  if (!lines.length && !head) throw new LabelError('The label is empty.');
  const textWidth = Math.max(0, ...lines.map((line) => line.width));
  const textHeight = lines.reduce((sum, line) => sum + line.height, 0) + LINE_GAP * Math.max(0, lines.length - 1);
  if (textHeight > HEIGHT) throw new LabelError(`The text is ${textHeight} dots tall; the tape prints ${HEIGHT}.`);
  const left = MARGIN + (head ? head.width + (lines.length ? ICON_GAP : 0) : 0);
  const label = blank(left + textWidth + MARGIN, HEIGHT);
  if (label.width > MAX_WIDTH) {
    throw new LabelError(`The label is ${dotsToMm(label.width).toFixed(1)} mm long; it can be at most ${dotsToMm(MAX_WIDTH).toFixed(1)} mm.`);
  }
  if (head) paste(label, head, MARGIN, 0);
  let y = Math.floor((HEIGHT - textHeight) / 2);
  for (const line of lines) {
    paste(label, line, left + Math.floor((textWidth - line.width) / 2), y);
    y += line.height + LINE_GAP;
  }
  return label;
}

// Labels end to end, with 2-dot cut ticks at the top and bottom of every
// boundary, both ends included, as the label scripts print them.
export function buildStrip(labels) {
  const guides = [0];
  for (const label of labels) guides.push(guides.at(-1) + label.width);
  const strip = blank(guides.at(-1) + 1, HEIGHT);
  labels.forEach((label, i) => paste(strip, label, guides[i], 0));
  for (const x of guides) {
    for (const y of [0, 1, HEIGHT - 2, HEIGHT - 1]) strip.bits[y * strip.width + x] = 1;
  }
  return { strip, guides };
}

// One 16-byte line per column, for the D410's 128-dot head: the 32 rows land
// on head bits 79 down to 48, so bytes 6 to 9, most significant bit first.
export function encodeRaster(strip) {
  if (strip.height !== HEIGHT) throw new Error(`Expected a ${HEIGHT}-row bitmap`);
  const raster = new Uint8Array(strip.width * 16);
  for (let x = 0; x < strip.width; x++) {
    for (let y = 0; y < HEIGHT; y++) {
      if (strip.bits[y * strip.width + x]) raster[x * 16 + 6 + (y >> 3)] |= 0x80 >> (y & 7);
    }
  }
  return raster;
}

// A strip as RGBA pixels, one per dot, black ink on white: what Download PNG saves.
export function stripToImageData(strip) {
  const data = new Uint8ClampedArray(strip.width * strip.height * 4);
  strip.bits.forEach((bit, i) => {
    const v = bit ? 0 : 255;
    data.set([v, v, v, 255], i * 4);
  });
  return { width: strip.width, height: strip.height, data };
}

// A strip PNG saved from this page, read back into dots: dark, opaque pixels
// are ink. It has to be 32 pixels tall, one per dot across the tape.
export function stripFromImageData({ width, height, data }) {
  if (height !== HEIGHT) {
    throw new LabelError(`This image is ${width} × ${height} pixels. A strip saved from this page is ${HEIGHT} pixels tall, one per dot across the tape.`);
  }
  if (width < 2) throw new LabelError('This image is too short to print.');
  const strip = blank(width, height);
  for (let i = 0; i < width * height; i++) {
    const [r, g, b, a] = data.subarray(i * 4, i * 4 + 4);
    strip.bits[i] = a >= 128 && 0.299 * r + 0.587 * g + 0.114 * b < 128 ? 1 : 0;
  }
  return strip;
}

// Columns carrying a cut tick: ink in the top two and bottom two rows, where
// labels themselves never print.
export function cutMarks(strip) {
  const marks = [];
  for (let x = 0; x < strip.width; x++) {
    if ([0, 1, HEIGHT - 2, HEIGHT - 1].every((y) => strip.bits[y * strip.width + x])) marks.push(x);
  }
  return marks;
}
