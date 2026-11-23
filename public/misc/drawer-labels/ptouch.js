// A Brother PT-D410 over WebUSB, following the PT-D410 label scripts:
// ptouch_status.py for interface 0's bulk endpoints, the status request ESC i S
// and its 32-byte reply, and print_batch.py for the print job. Protocol facts
// are from https://github.com/vowstar/ptouch-rs (crates/ptouch-core).

export const VENDOR_ID = 0x04f9;
export const PRODUCT_ID = 0x20df;
export const STATUS_REQUEST = Uint8Array.of(0x1b, 0x69, 0x53);

const COLORS = { 1: 'white', 3: 'clear', 4: 'red', 5: 'blue', 6: 'yellow', 7: 'green', 8: 'black' };
const MEDIA = { 0: 'no tape', 1: 'laminated tape', 3: 'non-laminated tape' };
const ERRORS_1 = ['no tape', 'end of tape', 'cutter jam', 'weak batteries', 'printer in use',
  'printer turned off', 'high-voltage adapter', 'fan motor error'];
const ERRORS_2 = ['wrong tape', 'expansion buffer full', 'communication error', 'communication buffer full',
  'cover open', 'cancel key pressed', 'tape cannot be fed', 'system error'];
export const STATUS_TYPES = { REPLY: 0, PRINTING_COMPLETED: 1, ERROR: 2, TURNED_OFF: 4, PHASE_CHANGE: 6 };

export class PrinterError extends Error {}

const hex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(' ');
const bitNames = (byte, names) => names.filter((_, bit) => byte & (1 << bit));

export function parseStatus(packet) {
  if (packet.length !== 32 || packet[0] !== 0x80 || packet[1] !== 0x20 || packet[2] !== 0x42) {
    throw new PrinterError(`Not a Brother status reply: ${hex(packet)}`);
  }
  return {
    mediaWidthMm: packet[10],
    mediaTypeCode: packet[11],
    mediaType: MEDIA[packet[11]] ?? 'unknown tape',
    tapeColor: COLORS[packet[24]] ?? 'unknown',
    textColor: COLORS[packet[25]] ?? 'unknown',
    extendedError: packet[7],
    errorInfo1: packet[8],
    errorInfo2: packet[9],
    errors: [...bitNames(packet[8], ERRORS_1), ...bitNames(packet[9], ERRORS_2)],
    statusType: packet[18],
    phaseType: packet[19],
    hasError: Boolean(packet[7] || packet[8] || packet[9] || packet[18] === STATUS_TYPES.ERROR),
    raw: hex(packet),
  };
}

export const describeTape = (status) => status.mediaTypeCode === 0
  ? 'no tape'
  : `${status.mediaWidthMm} mm ${status.mediaType}, ${status.textColor} on ${status.tapeColor}`;

// Why the labels can't print now, or null. As check_ready() in print_batch.py.
export function readinessProblem(status) {
  if (status.hasError) {
    return status.errors.length
      ? `The printer reports: ${status.errors.join(', ')}.`
      : `The printer reports an error (${status.raw}).`;
  }
  if (status.mediaWidthMm !== 6 || status.mediaTypeCode !== 1) {
    return `These labels need 6 mm laminated tape; the printer has ${describeTape(status)}.`;
  }
  if (status.phaseType !== 0) return 'The printer is busy.';
  return null;
}

const isPtD410 = (device) => device.vendorId === VENDOR_ID && device.productId === PRODUCT_ID;

// A PT-D410 this site may already use, or the browser's chooser.
export async function choosePrinter(usb) {
  const known = (await usb.getDevices()).filter(isPtD410);
  if (known.length === 1) return known[0];
  return usb.requestDevice({ filters: [{ vendorId: VENDOR_ID, productId: PRODUCT_ID }] });
}

class Connection {
  constructor(device, input, output) {
    this.device = device;
    this.input = input;
    this.output = output;
    this.pending = null;
    this.buffer = new Uint8Array(0);
    this.writes = [];
  }

  async write(bytes) {
    const result = await this.device.transferOut(this.output.endpointNumber, bytes);
    this.writes.push(bytes);
    if (result.status !== 'ok' || result.bytesWritten !== bytes.length) {
      throw new PrinterError(`Incomplete USB write (${result.bytesWritten ?? 0} of ${bytes.length} bytes); not retried.`);
    }
  }

  // The next packet, or null after ms; a read that times out stays pending
  // and its data is returned by the next call.
  async read(ms) {
    this.pending ??= this.device.transferIn(this.input.endpointNumber, Math.max(64, this.input.packetSize));
    let timer;
    const timeout = new Promise((resolve) => { timer = setTimeout(resolve, ms, null); });
    const result = await Promise.race([this.pending, timeout]).finally(() => clearTimeout(timer));
    if (result === null) return null;
    this.pending = null;
    if (result.status !== 'ok') throw new PrinterError(`USB read failed (${result.status}).`);
    return new Uint8Array(result.data.buffer, result.data.byteOffset, result.data.byteLength);
  }

  // The next status frame, or null after ms.
  async frame(ms) {
    const deadline = Date.now() + ms;
    for (;;) {
      if (this.buffer.length >= 32) {
        const status = parseStatus(this.buffer.slice(0, 32));
        this.buffer = this.buffer.slice(32);
        return status;
      }
      const left = deadline - Date.now();
      if (left <= 0) return null;
      const data = await this.read(Math.min(left, 500));
      if (data?.length) {
        const joined = new Uint8Array(this.buffer.length + data.length);
        joined.set(this.buffer);
        joined.set(data, this.buffer.length);
        this.buffer = joined;
      }
    }
  }

  // The next status frame of one of the given types; others are skipped.
  async status(types, ms) {
    const deadline = Date.now() + ms;
    for (;;) {
      const status = await this.frame(Math.max(0, deadline - Date.now()));
      if (!status || types.includes(status.statusType)) return status;
    }
  }

  async close() {
    this.pending?.catch(() => {});
    try { await this.device.releaseInterface(0); } catch { /* already released */ }
    try { await this.device.close(); } catch { /* already closed */ }
  }
}

// Open the printer and claim interface 0, reading its configuration as is.
export async function connect(device) {
  await device.open();
  try {
    if (!device.configuration) await device.selectConfiguration(1);
    const iface = device.configuration.interfaces.find((i) => i.interfaceNumber === 0);
    const bulk = iface?.alternate.endpoints.filter((e) => e.type === 'bulk') ?? [];
    const inputs = bulk.filter((e) => e.direction === 'in');
    const outputs = bulk.filter((e) => e.direction === 'out');
    if (inputs.length !== 1 || outputs.length !== 1) {
      throw new PrinterError('Expected one bulk IN and one bulk OUT endpoint on interface 0.');
    }
    try {
      await device.claimInterface(0);
    } catch (error) {
      throw new PrinterError(`The browser couldn’t take the printer’s USB interface (${error.message}). ` +
        'Another program may be using it: close it, or unplug the printer and plug it in again.');
    }
    return new Connection(device, inputs[0], outputs[0]);
  } catch (error) {
    try { await device.close(); } catch { /* not open */ }
    throw error;
  }
}

// Ask for status, as exchange_status() does: drop a few stale replies, send
// ESC i S once, and wait for its reply. Nothing else is sent.
export async function requestStatus(connection, { replyMs = 5000 } = {}) {
  for (let drained = 0; ; drained++) {
    if (drained === 8) throw new PrinterError('The printer keeps sending data; no status request was sent.');
    const stale = await connection.read(80);
    if (!stale?.length) break;
  }
  connection.buffer = new Uint8Array(0);
  await connection.write(STATUS_REQUEST);
  const status = await connection.status([STATUS_TYPES.REPLY, STATUS_TYPES.ERROR], replyMs);
  if (!status) throw new PrinterError(`No status reply within ${replyMs / 1000} seconds; nothing else was sent.`);
  return status;
}

// Protocol initialisation as print_batch.py sends it: 100 NULs, then ESC @.
// It is not a USB reset.
export const INITIALIZE = Uint8Array.from({ length: 102 }, (_, i) => [0x1b, 0x40][i - 100] ?? 0);

// Refuse a raster print_hardware_batch.py would refuse: whole 16-byte lines,
// more than one of them, and no dots outside the 6 mm tape's bytes 6 to 9.
export function checkRaster(raster) {
  if (raster.length < 32 || raster.length % 16) throw new PrinterError('The strip must be at least two whole raster lines.');
  for (let i = 0; i < raster.length; i += 16) {
    if (raster.subarray(i, i + 6).some(Boolean) || raster.subarray(i + 10, i + 16).some(Boolean)) {
      throw new PrinterError('The strip has dots outside the 6 mm tape’s printable area.');
    }
  }
}

// The job print_batch.py's job_commands() sends, one USB write per chunk:
// raster mode, print information with the line count, the D460BT margin
// bytes, one line per column (G and 16 bytes, or Z for a blank line), and
// print with feeding. The whole strip is one page.
export function jobCommands(raster) {
  checkRaster(raster);
  const lines = raster.length / 16;
  const chunks = [
    Uint8Array.of(0x1b, 0x69, 0x52, 0x01),
    Uint8Array.of(0x1b, 0x69, 0x7a, 0x00, 0x00, 0x06, 0x00,
      lines & 0xff, (lines >> 8) & 0xff, (lines >> 16) & 0xff, (lines >>> 24) & 0xff, 0x02, 0x00),
    Uint8Array.of(0x1b, 0x69, 0x64, 0x01, 0x00, 0x4d, 0x00),
  ];
  for (let i = 0; i < raster.length; i += 16) {
    const line = raster.subarray(i, i + 16);
    chunks.push(line.some(Boolean) ? Uint8Array.of(0x47, 0x10, 0x00, ...line) : Uint8Array.of(0x5a));
  }
  chunks.push(Uint8Array.of(0x1a));
  return chunks;
}

// Print a raster as print_batch.py's send_batch() does: check the printer is
// idle with 6 mm laminated tape, initialise, check again, write each chunk
// once without retrying, then wait for the printing-completed notification.
// An error carries `result`, whose printDataWriteAttempted says whether
// printing may have started.
export async function printRaster(connection, raster, { onProgress = () => {}, completionMs = 20000, replyMs } = {}) {
  const result = { printDataWriteAttempted: false, jobSent: false, completionConfirmed: false, commandsWritten: 0 };
  const ready = async () => {
    const problem = readinessProblem(await requestStatus(connection, { replyMs }));
    if (problem) throw new PrinterError(problem);
  };
  try {
    const chunks = jobCommands(raster);
    onProgress('checking');
    await ready();
    await connection.write(INITIALIZE);
    await ready();
    for (const [i, chunk] of chunks.entries()) {
      if (chunk[0] === 0x47 || chunk[0] === 0x5a || chunk[0] === 0x1a) result.printDataWriteAttempted = true;
      await connection.write(chunk);
      result.commandsWritten += 1;
      if (i % 64 === 0) onProgress('sending', i / chunks.length);
    }
    result.jobSent = true;
    onProgress('printing');
    const deadline = Date.now() + completionMs;
    for (;;) {
      const status = await connection.frame(Math.max(0, deadline - Date.now()));
      if (!status) break;
      if (status.statusType === STATUS_TYPES.TURNED_OFF) throw new PrinterError('The printer turned off.');
      if (status.hasError) throw new PrinterError(readinessProblem(status));
      if (status.statusType === STATUS_TYPES.PRINTING_COMPLETED) {
        result.completionConfirmed = true;
        break;
      }
    }
    return result;
  } catch (error) {
    error.result = result;
    throw error;
  }
}
