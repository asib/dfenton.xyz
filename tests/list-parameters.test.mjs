import { expect, test } from 'bun:test';
import { parameters, render } from 'openrscad-engine/node';
import { configuredSource, defaults, parseListParameters, parseParameters, validRows } from '../src/components/cad/parameters';

const source = `// Sample with a list parameter.
/* [Size] */
// Overall width.
Width = 24; // [8:96]

/* [Rows] */
// One row per drawer, top first.
// Zero height shares the remaining space.
Drawers = [[5, 0], [6, 0.5], [0, 0]]; // [list:1:] Drawer | Front height:0:60, Depth:0:36:0.25
// Gap between drawers.
Gap = 0.0625; // [0:1]
Limited = [[1]]; // [list:1:2] Item | Size:1:

/* [Hidden] */
Secret = [[1, 2]]; // [list:1:] Row | A, B
echo(len(Drawers), Drawers[len(Drawers) - 1][1], Width, Gap, Limited[0][0]);
cube([Width, 1, 1]);
`;
const schema = parseParameters(parameters(source), source);

test('lists are read from the source in order, with group, description and columns', () => {
  expect(schema.map(p => [p.name, p.type, p.group])).toEqual([
    ['Width', 'number', 'Size'], ['Drawers', 'list', 'Rows'], ['Gap', 'number', 'Rows'], ['Limited', 'list', 'Rows']]);
  const drawers = schema[1];
  expect(drawers.value).toEqual([[5, 0], [6, 0.5], [0, 0]]);
  expect(drawers.description).toBe('One row per drawer, top first. Zero height shares the remaining space.');
  expect(drawers.control).toEqual({ kind: 'list', minRows: 1, maxRows: undefined, rowLabel: 'Drawer',
    columns: [{ label: 'Front height', min: 0, max: 60, step: undefined }, { label: 'Depth', min: 0, max: 36, step: 0.25 }] });
  expect(schema[3].control).toMatchObject({ minRows: 1, maxRows: 2, columns: [{ label: 'Size', min: 1, max: undefined }] });
  // Hidden lists are not editable; the engine schema alone has no lists.
  expect(schema.some(p => p.name === 'Secret')).toBe(false);
  expect(parseParameters(parameters(source)).some(p => p.type === 'list')).toBe(false);
});

test('configured sources replace only the list literal and compile', () => {
  const values = { ...defaults(schema), Drawers: [[5, 0], [6, 0.5], [0, 0], [0, 0], [3, 12]] };
  const text = configuredSource(source, schema, values);
  expect(text).toContain('Drawers = [[5,0],[6,0.5],[0,0],[0,0],[3,12]]; // [list:1:] Drawer | Front height:0:60, Depth:0:36:0.25');
  expect(text).toContain('Secret = [[1, 2]];');
  expect(configuredSource(source, schema, defaults(schema))).toBe(source);
  const result = render(text);
  try { expect(result.ok).toBe(true); expect(result.echo).toBe('ECHO: 5, 12, 24, 0.0625, 1'); } finally { result.free(); }
});

test('rows and cells are validated against the annotation', () => {
  const drawers = schema[1], limited = schema[3];
  expect(validRows(drawers, [[1, 2]])).toBe(true);
  expect(validRows(drawers, [])).toBe(false);
  expect(validRows(drawers, [[61, 0]])).toBe(false);
  expect(validRows(drawers, [[1, -1]])).toBe(false);
  expect(validRows(drawers, [[1, '']])).toBe(false);
  expect(validRows(drawers, [[1]])).toBe(false);
  expect(validRows(limited, [[1], [2]])).toBe(true);
  expect(validRows(limited, [[1], [2], [3]])).toBe(false);
  expect(() => configuredSource(source, schema, { ...defaults(schema), Drawers: [] })).toThrow('Enter a valid drawers.');
});

test.each([
  ['A = [[1, 2]]; // [list:1:] Row | One', 'Invalid default rows for A.'],
  ['A = [[1]]; // [list:2:] Row | One', 'Invalid default rows for A.'],
  ['A = [[1], [2]]; // [list:1:1] Row | One', 'Invalid default rows for A.'],
  ['A = [["x"]]; // [list:1:] Row | One', 'Invalid default rows for A.'],
  ['A = [[1]]; // [list:1:] Row | One:x', 'Invalid column for A.'],
  ['A = [[1 + 1]]; // [list:1:] Row | One', 'Expected a literal default for A.'],
])('rejects malformed lists: %s', (line, message) => {
  expect(() => parseListParameters(`${line}\ncube(1);`)).toThrow(message);
});
