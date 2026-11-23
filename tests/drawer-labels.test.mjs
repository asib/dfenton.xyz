import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  buildStrip, cutMarks, decodeLabelData, encodeRaster, LabelError, MAX_WIDTH, renderLabel, stripFromImageData, stripToImageData, textBitmap,
} from '../public/misc/drawer-labels/labels.js';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const data = decodeLabelData(read('../public/misc/drawer-labels/label-data.json'));
// Made by scripts/export-drawer-labels.py with a Python copy of labels.js; the
// strip's raster comes from the label scripts' own encode_columns().
const fixtures = read('./fixtures/drawer-labels.json');
const rows = (bitmap) => Array.from({ length: bitmap.height }, (_, y) =>
  Array.from(bitmap.bits.subarray(y * bitmap.width, (y + 1) * bitmap.width)).join(''));

test('labels match the Python renderer dot for dot', () => {
  for (const expected of fixtures.labels) {
    const label = renderLabel(data, { icon: expected.icon, top: expected.top, bottom: expected.bottom });
    expect({ text: expected.top, rows: rows(label) }).toEqual({ text: expected.top, rows: expected.rows });
  }
});

test('labels keep 7 blank dots at each end', () => {
  for (const expected of fixtures.labels) {
    const label = renderLabel(data, expected);
    const inked = (x) => Array.from({ length: 32 }, (_, y) => label.bits[y * label.width + x]).some(Boolean);
    const columns = Array.from({ length: label.width }, (_, x) => inked(x));
    expect(columns.indexOf(true)).toBe(7);
    expect(label.width - 1 - columns.lastIndexOf(true)).toBe(7);
  }
});

test('the strip and its raster match the label scripts', () => {
  const labels = fixtures.labels.map((expected) => renderLabel(data, expected));
  const { strip, guides } = buildStrip(labels);
  expect(guides).toEqual(fixtures.strip.guides);
  expect(strip.width).toBe(fixtures.strip.columns);
  const raster = encodeRaster(strip);
  expect(raster.length).toBe(strip.width * 16);
  expect(createHash('sha256').update(raster).digest('hex')).toBe(fixtures.strip.raster_sha256);
  // Nothing outside the 6 mm tape's printable bytes.
  for (let i = 0; i < raster.length; i += 16) {
    expect([...raster.subarray(i, i + 6), ...raster.subarray(i + 10, i + 16)].every((b) => b === 0)).toBe(true);
  }
});

test('kerning pulls a pair of ones together', () => {
  const font = data.fonts['20'];
  expect(textBitmap(font, '11').width).toBeLessThan(2 * textBitmap(font, '1').width + 3);
  expect(font.kerning.get('11')).toBeLessThan(0);
});

test('labels that cannot print are refused with a reason', () => {
  expect(() => renderLabel(data, { icon: 'socket', top: 'M4×35mm stainless button' }))
    .toThrow(/^The label is \d+\.\d mm long; it can be at most 25\.4 mm\.$/);
  expect(MAX_WIDTH).toBe(180);
  expect(() => renderLabel(data, { icon: 'hexx', top: 'M4' })).toThrow(LabelError);
  expect(() => renderLabel(data, { icon: 'none', top: ' ', bottom: '' })).toThrow('The label is empty.');
  expect(() => renderLabel(data, { icon: 'hex', top: 'M4→' })).toThrow('The label font has no “→”.');
});

test('an icon alone is a label', () => {
  const label = renderLabel(data, { icon: 'washer', top: '' });
  expect(label.width).toBe(7 + data.icons.washer.width + 7);
});

test('a downloaded strip PNG reads back as the same dots', () => {
  const labels = fixtures.labels.map((expected) => renderLabel(data, expected));
  const { strip, guides } = buildStrip(labels);
  const back = stripFromImageData(stripToImageData(strip));
  expect(back.width).toBe(strip.width);
  expect(Array.from(back.bits)).toEqual(Array.from(strip.bits));
  expect(cutMarks(back)).toEqual(guides);
  expect(createHash('sha256').update(encodeRaster(back)).digest('hex')).toBe(fixtures.strip.raster_sha256);
});

test('only dark, opaque pixels of a 32-pixel-tall image are ink', () => {
  const pixels = (rgba) => ({ width: 2, height: 32, data: new Uint8ClampedArray(Array.from({ length: 64 }, () => rgba).flat()) });
  expect(stripFromImageData(pixels([20, 20, 20, 255])).bits.every(Boolean)).toBe(true);
  expect(stripFromImageData(pixels([0, 0, 0, 0])).bits.some(Boolean)).toBe(false);
  expect(stripFromImageData(pixels([200, 200, 200, 255])).bits.some(Boolean)).toBe(false);
  expect(() => stripFromImageData({ width: 10, height: 43, data: new Uint8ClampedArray(10 * 43 * 4) }))
    .toThrow('This image is 10 × 43 pixels. A strip saved from this page is 32 pixels tall');
});
