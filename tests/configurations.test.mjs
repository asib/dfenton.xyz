import { expect, test } from 'bun:test';
import { parameters } from 'openrscad-engine/node';
import { changedValues, fingerprint, readConfigurations, reconcile, storageKey, writeConfigurations } from '../src/components/cad/configurations';
import { defaults, parseParameters } from '../src/components/cad/parameters';

const source = `/* [Size] */
// Width.
Width = 24; // [8:96]
// Style.
Style = "strip"; // [strip:Strip, dado:Dado]
// Flag.
Show = true;
// Rows.
Rows = [[5, 0], [0, 0]]; // [list:1:] Row | Height:0:60, Depth:0:36
cube(1);`;
const schema = parseParameters(parameters(source), source);
const memory = () => { const data = new Map(); return { getItem: k => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v); }, data }; };

test('saved values that still fit apply over the source defaults', () => {
  const { values, dropped } = reconcile(schema, { Width: 30, Style: 'dado', Show: false, Rows: [[4, 0], [0, 12], [0, 0]] });
  expect(values).toEqual({ Width: 30, Style: 'dado', Show: false, Rows: [[4, 0], [0, 12], [0, 0]] });
  expect(dropped).toEqual([]);
});

test('values that no longer fit, and removed settings, fall back and are reported', () => {
  const { values, dropped } = reconcile(schema, {
    Width: 200, // above the range
    Style: 'side_hung', // option removed
    Show: 'yes', // wrong type
    Rows: [[70, 0]], // cell out of range
    Old_parameter: 3, // no longer in the model
  });
  expect(values).toEqual(defaults(schema));
  expect(dropped).toEqual(['Width', 'Style', 'Show', 'Rows', 'Old_parameter']);
  expect(reconcile(schema, { Width: Number.NaN, Rows: [] }).dropped).toEqual(['Width', 'Rows']);
});

test('fingerprints change with the parameter set, not with values', () => {
  const again = parseParameters(parameters(source), source);
  expect(fingerprint(again)).toBe(fingerprint(schema));
  const tighter = parseParameters(parameters(source.replace('[8:96]', '[8:48]')), source.replace('[8:96]', '[8:48]'));
  expect(fingerprint(tighter)).not.toBe(fingerprint(schema));
  const renamed = source.replace('Show = true;', 'Visible = true;');
  expect(fingerprint(parseParameters(parameters(renamed), renamed))).not.toBe(fingerprint(schema));
});

test('storage round-trips and ignores corrupt or foreign data', () => {
  const storage = memory(), key = storageKey('/misc/sample/');
  expect(key).toBe('cad-configurations:/misc/sample/');
  expect(readConfigurations(storage, key)).toEqual([]);
  const saved = [{ name: 'Wide', values: { Width: 30 }, fingerprint: fingerprint(schema), savedAt: '2026-10-22T10:00:00.000Z' }];
  expect(writeConfigurations(storage, key, saved)).toBe(true);
  expect(readConfigurations(storage, key)).toEqual(saved);
  for (const raw of ['not json', '{"version":2,"configurations":[]}', '[1,2]', '{"version":1,"configurations":[{"name":"","values":{}}]}']) {
    storage.setItem(key, raw);
    expect(readConfigurations(storage, key)).toEqual([]);
  }
  // A mixed list keeps only the valid entries.
  storage.setItem(key, JSON.stringify({ version: 1, configurations: [...saved, { name: 'Bad', values: [] }] }));
  expect(readConfigurations(storage, key).map(c => c.name)).toEqual(['Wide']);
  // Blocked storage reads as empty and refuses writes.
  const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('quota'); } };
  expect(readConfigurations(blocked, key)).toEqual([]);
  expect(writeConfigurations(blocked, key, saved)).toBe(false);
  expect(writeConfigurations(null, key, saved)).toBe(false);
});

test('changed values list only differences from the defaults', () => {
  expect(changedValues(schema, { ...defaults(schema), Width: 30, Rows: [[5, 0], [0, 0], [0, 0]] })).toEqual({ Width: 30, Rows: [[5, 0], [0, 0], [0, 0]] });
  expect(changedValues(schema, defaults(schema))).toEqual({});
});
