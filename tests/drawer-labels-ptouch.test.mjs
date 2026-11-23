import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { buildStrip, decodeLabelData, encodeRaster, renderLabel } from '../public/misc/drawer-labels/labels.js';
import {
  checkRaster, choosePrinter, completionTimeoutMs, connect, describeNotification, INITIALIZE, jobCommands, parseStatus,
  PrinterError, printRaster, readinessProblem, requestStatus, STATUS_REQUEST,
} from '../public/misc/drawer-labels/ptouch.js';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
// The fixture strip, and the job print_batch.py's job_commands() makes for it.
const fixtures = read('./fixtures/drawer-labels.json');
const data = decodeLabelData(read('../public/misc/drawer-labels/label-data.json'));
const raster = encodeRaster(buildStrip(fixtures.labels.map((label) => renderLabel(data, label))).strip);

// A 32-byte status frame, as ptouch_status.py reads it.
function frame({ width = 6, media = 1, type = 0, phase = 0, err1 = 0, err2 = 0, tape = 1, text = 8 } = {}) {
  const packet = new Uint8Array(32);
  packet.set([0x80, 0x20, 0x42]);
  Object.assign(packet, { 8: err1, 9: err2, 10: width, 11: media, 18: type, 19: phase, 24: tape, 25: text });
  return packet;
}

// A WebUSB device that answers the status request with the `reply` packets,
// after `stale` packets left over from earlier, and the end of a print job
// with the `done` packets.
const finished = [frame({ type: 6, phase: 1 }), frame({ type: 1 })];
function fakePrinter({ reply = [frame()], stale = [], answer = true, claimFails = false, done = finished } = {}) {
  const queue = [...stale];
  let waiting = null;
  const deliver = () => {
    if (waiting && queue.length) {
      const resolve = waiting;
      waiting = null;
      const data = queue.shift();
      resolve({ status: 'ok', data: new DataView(data.buffer, data.byteOffset, data.byteLength) });
    }
  };
  const device = {
    vendorId: 0x04f9, productId: 0x20df, configuration: null, opened: false, claimed: false, writes: [],
    async open() { this.opened = true; },
    async close() { this.opened = false; },
    async selectConfiguration() {
      this.configuration = { interfaces: [{ interfaceNumber: 0, alternate: { endpoints: [
        { endpointNumber: 1, direction: 'in', type: 'bulk', packetSize: 64 },
        { endpointNumber: 2, direction: 'out', type: 'bulk', packetSize: 64 },
      ] } }] };
    },
    async claimInterface() { if (claimFails) throw new Error('Unable to claim interface.'); this.claimed = true; },
    async releaseInterface() { this.claimed = false; },
    async transferOut(endpoint, bytes) {
      this.writes.push([endpoint, Array.from(bytes)]);
      const isStatusRequest = bytes.length === 3 && bytes.every((b, i) => b === STATUS_REQUEST[i]);
      if (isStatusRequest && answer) { queue.push(...reply); deliver(); }
      if (bytes.length === 1 && bytes[0] === 0x1a) { queue.push(...done); deliver(); }
      return { status: 'ok', bytesWritten: bytes.length };
    },
    transferIn() {
      return new Promise((resolve) => { waiting = resolve; deliver(); });
    },
  };
  return device;
}

test('status replies are read as ptouch_status.py reads them', () => {
  const status = parseStatus(frame());
  expect(status).toMatchObject({ mediaWidthMm: 6, mediaType: 'laminated tape', tapeColor: 'white', textColor: 'black', hasError: false });
  expect(readinessProblem(status)).toBeNull();
  expect(parseStatus(frame({ err2: 0x10, err1: 0x01 })).errors).toEqual(['no tape', 'cover open']);
  expect(readinessProblem(parseStatus(frame({ err2: 0x10 })))).toBe('The printer reports: cover open.');
  expect(readinessProblem(parseStatus(frame({ width: 12 })))).toMatch(/need 6 mm laminated tape; the printer has 12 mm laminated tape/);
  expect(readinessProblem(parseStatus(frame({ media: 3 })))).toMatch(/non-laminated/);
  expect(readinessProblem(parseStatus(frame({ phase: 1 })))).toBe('The printer is busy.');
  expect(() => parseStatus(new Uint8Array(32))).toThrow(PrinterError);
});

test('a status check sends the status request and nothing else', async () => {
  const device = fakePrinter({ stale: [frame({ type: 6 })] });
  const connection = await connect(device);
  expect(device.claimed).toBe(true);
  const status = await requestStatus(connection);
  await connection.close();
  expect(status.mediaWidthMm).toBe(6);
  expect(device.writes).toEqual([[2, Array.from(STATUS_REQUEST)]]);
  expect(device.claimed).toBe(false);
  expect(device.opened).toBe(false);
});

test('replies split across packets, and other notifications, are handled', async () => {
  const reply = frame({ width: 9 });
  // A phase-change notification, then the reply in two pieces.
  const device = fakePrinter({ reply: [frame({ type: 6 }), reply.slice(0, 20), reply.slice(20)] });
  const connection = await connect(device);
  expect((await requestStatus(connection)).mediaWidthMm).toBe(9);
  await connection.close();
});

test('a printer that never answers times out without sending more', async () => {
  const device = fakePrinter({ answer: false });
  const connection = await connect(device);
  await expect(requestStatus(connection, { replyMs: 300 })).rejects.toThrow('No status reply within 0.3 seconds');
  await connection.close();
  expect(device.writes).toHaveLength(1);
});

test('an interface another program holds is explained, and the device closed', async () => {
  const device = fakePrinter({ claimFails: true });
  await expect(connect(device)).rejects.toThrow(/couldn’t take the printer’s USB interface/);
  expect(device.opened).toBe(false);
});

test('a printer this site may already use is picked without asking', async () => {
  const printer = fakePrinter();
  const usb = { getDevices: async () => [printer], requestDevice: async () => { throw new Error('asked'); } };
  expect(await choosePrinter(usb)).toBe(printer);
  const ask = { getDevices: async () => [], requestDevice: async (options) => options };
  expect(await choosePrinter(ask)).toEqual({ filters: [{ vendorId: 0x04f9, productId: 0x20df }] });
});

test('the print job is the one print_batch.py sends', () => {
  const chunks = jobCommands(raster);
  expect(chunks.length).toBe(fixtures.job.chunks);
  const hex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(' ');
  expect(chunks.slice(0, 3).map(hex)).toEqual(fixtures.job.head);
  expect(hex(chunks.at(-1))).toBe(fixtures.job.tail);
  const all = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  chunks.reduce((offset, c) => { all.set(c, offset); return offset + c.length; }, 0);
  expect(createHash('sha256').update(all).digest('hex')).toBe(fixtures.job.sha256);
});

test('printing checks, initialises, checks again, sends the job and waits for completion', async () => {
  const device = fakePrinter();
  const connection = await connect(device);
  const phases = [];
  const result = await printRaster(connection, raster, { onProgress: (phase) => phases.push(phase) });
  await connection.close();
  expect(result).toMatchObject({ completionConfirmed: true, jobSent: true, printDataWriteAttempted: true, commandsWritten: fixtures.job.chunks });
  expect(result.notifications).toEqual(['phase change to printing', 'printing completed']);
  expect(result.waitLimitMs).toBe(completionTimeoutMs(raster));
  const writes = device.writes.map(([endpoint, bytes]) => [endpoint, bytes]);
  expect(writes.slice(0, 3)).toEqual([[2, Array.from(STATUS_REQUEST)], [2, Array.from(INITIALIZE)], [2, Array.from(STATUS_REQUEST)]]);
  expect(writes.slice(3).map(([, bytes]) => bytes)).toEqual(jobCommands(raster).map((c) => Array.from(c)));
  expect(phases[0]).toBe('checking');
  expect(phases.at(-1)).toBe('printing');
});

test('the wrong tape stops printing before anything but the status request is sent', async () => {
  const device = fakePrinter({ reply: [frame({ width: 12 })] });
  const connection = await connect(device);
  const error = await printRaster(connection, raster).catch((e) => e);
  await connection.close();
  expect(error).toBeInstanceOf(PrinterError);
  expect(error.message).toMatch(/need 6 mm laminated tape/);
  expect(error.result.printDataWriteAttempted).toBe(false);
  expect(device.writes).toEqual([[2, Array.from(STATUS_REQUEST)]]);
});

test('an error while printing is reported, saying printing may have started', async () => {
  const device = fakePrinter({ done: [frame({ type: 2, err2: 0x10 })] });
  const connection = await connect(device);
  const error = await printRaster(connection, raster).catch((e) => e);
  await connection.close();
  expect(error.message).toBe('The printer reports: cover open.');
  expect(error.result).toMatchObject({ printDataWriteAttempted: true, jobSent: true, completionConfirmed: false });
});

test('a job the printer never confirms is sent once and left unconfirmed', async () => {
  const device = fakePrinter({ done: [] });
  const connection = await connect(device);
  const result = await printRaster(connection, raster, { completionMs: 300 });
  await connection.close();
  expect(result).toMatchObject({ jobSent: true, completionConfirmed: false, notifications: [], waitLimitMs: 300 });
  expect(result.waitedMs).toBeGreaterThanOrEqual(300);
  expect(device.writes.filter(([, bytes]) => bytes.length === 1 && bytes[0] === 0x1a)).toHaveLength(1);
});

test('a raster with dots off the tape is refused', () => {
  const bad = raster.slice();
  bad[0] = 1;
  expect(() => checkRaster(bad)).toThrow('outside the 6 mm tape');
  expect(() => checkRaster(new Uint8Array(16))).toThrow('at least two');
});

test('the wait for completion grows with the strip', () => {
  // 30 seconds, plus 5 mm of tape a second: 180 lines are an inch.
  expect(completionTimeoutMs(new Uint8Array(2 * 16))).toBe(30000 + Math.round(2 * 25.4 / 180 / 5 * 1000));
  expect(completionTimeoutMs(new Uint8Array(1260 * 16))).toBe(30000 + 35560);
  // An 8-label strip, around 1200 lines, gets about a minute, three times print_batch.py's 20 seconds.
  expect(completionTimeoutMs(new Uint8Array(1200 * 16))).toBeGreaterThan(60000);
});

test('notifications are named for the page', () => {
  expect(describeNotification(parseStatus(frame({ type: 6, phase: 1 })))).toBe('phase change to printing');
  expect(describeNotification(parseStatus(frame({ type: 6, phase: 0 })))).toBe('phase change to ready');
  expect(describeNotification(parseStatus(frame({ type: 1 })))).toBe('printing completed');
  expect(describeNotification(parseStatus(frame({ type: 9 })))).toBe('status type 9');
});
