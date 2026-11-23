import { expect, test } from 'bun:test';
import { choosePrinter, connect, parseStatus, PrinterError, readinessProblem, requestStatus, STATUS_REQUEST } from '../public/misc/drawer-labels/ptouch.js';

// A 32-byte status frame, as ptouch_status.py reads it.
function frame({ width = 6, media = 1, type = 0, phase = 0, err1 = 0, err2 = 0, tape = 1, text = 8 } = {}) {
  const packet = new Uint8Array(32);
  packet.set([0x80, 0x20, 0x42]);
  Object.assign(packet, { 8: err1, 9: err2, 10: width, 11: media, 18: type, 19: phase, 24: tape, 25: text });
  return packet;
}

// A WebUSB device that answers the status request with the `reply` packets,
// after `stale` packets left over from earlier.
function fakePrinter({ reply = [frame()], stale = [], answer = true, claimFails = false } = {}) {
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
      if (answer) { queue.push(...reply); deliver(); }
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
