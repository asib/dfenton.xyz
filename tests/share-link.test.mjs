import { expect, test } from 'bun:test';
import { configurationLink, decodeConfiguration, encodeConfiguration, readConfigurationHash } from '../src/components/cad/shareLink';

const config = { Width: 30, Runner_style: 'dado', Show_cut_list: false, Drawers: [[4, 0], [5, 0], [0, 0], [0, 0], [0, 0]] };

test('configurations round-trip through deflated URL-safe base64', async () => {
  const encoded = await encodeConfiguration(config);
  expect(encoded).toMatch(/^1\.[A-Za-z0-9_-]+$/);
  expect(await decodeConfiguration(encoded)).toEqual(config);
  // Compression keeps a typical edit short.
  expect(encoded.length).toBeLessThan(120);
});

test('plain JSON links decode where compression is unavailable', async () => {
  const saved = globalThis.CompressionStream;
  globalThis.CompressionStream = undefined;
  try {
    const encoded = await encodeConfiguration(config);
    expect(encoded.startsWith('0.')).toBe(true);
    expect(await decodeConfiguration(encoded)).toEqual(config);
  } finally { globalThis.CompressionStream = saved; }
});

test('malformed, oversized or non-object data decodes to null', async () => {
  for (const bad of ['', 'garbage', '2.abc', '1.!!!', '1.AAAA', `0.${'A'.repeat(20001)}`]) expect(await decodeConfiguration(bad)).toBeNull();
  const array = `0.${Buffer.from('[1,2]').toString('base64url')}`;
  expect(await decodeConfiguration(array)).toBeNull();
});

test('links live in the fragment and are read back from it', () => {
  expect(configurationLink('https://dfenton.xyz/misc/drawer-cabinet/#old', '1.abc')).toBe('https://dfenton.xyz/misc/drawer-cabinet/#config=1.abc');
  expect(readConfigurationHash('#config=1.abc')).toBe('1.abc');
  expect(readConfigurationHash('#cad-drawings-title&config=0.xyz')).toBe('0.xyz');
  expect(readConfigurationHash('#cad-drawings-title')).toBeNull();
});
