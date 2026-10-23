import { expect, test } from 'bun:test';
import { configurationLink, decodeConfiguration, encodeConfiguration, readConfigurationHash } from '../src/components/cad/shareLink';

const values = { Width: 30, Runner_style: 'dado', Show_cut_list: false, Drawers: [[4, 0], [5, 0], [0, 0], [0, 0], [0, 0]] };
const worksheets = { sheetLayout: { method: 'rip', sheetLength: 60, kerf: 0.1 }, cutList: { extraPercent: 30, thicknesses: { 'runner-0': '1.25' } } };
const base64url = text => Buffer.from(text).toString('base64url');

test('configurations round-trip through deflated URL-safe base64', async () => {
  const encoded = await encodeConfiguration({ values, worksheets });
  expect(encoded).toMatch(/^3\.[A-Za-z0-9_-]+$/);
  expect(await decodeConfiguration(encoded)).toEqual({ values, worksheets });
  // Compression keeps a typical edit short, with or without worksheet settings.
  expect((await encodeConfiguration({ values })).length).toBeLessThan(130);
  expect(encoded.length).toBeLessThan(260);
});

test('plain JSON links decode where compression is unavailable', async () => {
  const saved = globalThis.CompressionStream;
  globalThis.CompressionStream = undefined;
  try {
    const encoded = await encodeConfiguration({ values, worksheets });
    expect(encoded.startsWith('2.')).toBe(true);
    expect(await decodeConfiguration(encoded)).toEqual({ values, worksheets });
  } finally { globalThis.CompressionStream = saved; }
});

test('links from before worksheet settings still open, with values alone', async () => {
  const json = new TextEncoder().encode(JSON.stringify(values));
  const deflated = new Uint8Array(await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
  expect(await decodeConfiguration(`1.${Buffer.from(deflated).toString('base64url')}`)).toEqual({ values });
  expect(await decodeConfiguration(`0.${base64url(JSON.stringify(values))}`)).toEqual({ values });
});

test('malformed, oversized or non-object data decodes to null', async () => {
  for (const bad of ['', 'garbage', '4.abc', '1.!!!', '1.AAAA', `0.${'A'.repeat(20001)}`]) expect(await decodeConfiguration(bad)).toBeNull();
  for (const data of ['[1,2]', '{"values":[1]}', '{"worksheets":{}}']) expect(await decodeConfiguration(`2.${base64url(data)}`)).toBeNull();
  expect(await decodeConfiguration(`0.${base64url('[1,2]')}`)).toBeNull();
  // Worksheet settings are checked when they load, not here.
  expect(await decodeConfiguration(`2.${base64url('{"values":{},"worksheets":"rip"}')}`)).toEqual({ values: {}, worksheets: 'rip' });
});

test('links live in the fragment and are read back from it', () => {
  expect(configurationLink('https://dfenton.xyz/misc/drawer-cabinet/#old', '3.abc')).toBe('https://dfenton.xyz/misc/drawer-cabinet/#config=3.abc');
  expect(readConfigurationHash('#config=3.abc')).toBe('3.abc');
  expect(readConfigurationHash('#cad-drawings-title&config=0.xyz')).toBe('0.xyz');
  expect(readConfigurationHash('#cad-drawings-title')).toBeNull();
});
