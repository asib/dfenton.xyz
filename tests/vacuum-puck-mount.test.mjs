import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { parameters, render } from 'openrscad-engine/node';
import { analyzeConflicts, conflictInputs } from '../src/components/cad/conflicts';
import { parseDisplayMesh } from '../src/components/cad/displayMesh';
import { configuredSource, defaults, parseParameters } from '../src/components/cad/parameters';
import { binaryStl } from '../src/components/cad/stl';

const folder = new URL('../public/misc/vacuum-puck-mount/', import.meta.url);
const source = readFileSync(new URL('vacuum-puck-mount.scad', folder), 'utf8');
const metadata = JSON.parse(readFileSync(new URL('meta.json', folder), 'utf8'));
const schema = parseParameters(parameters(source), source);
const configured = changes => configuredSource(source, schema, { ...defaults(schema), ...changes });

const compile = (changes, check) => {
  const result = render(configured(changes));
  try { return check(result); } finally { result.free(); }
};
const bounds = positions => {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) for (let c = 0; c < 3; c++) {
    min[c] = Math.min(min[c], positions[i + c]); max[c] = Math.max(max[c], positions[i + c]);
  }
  return [min, max];
};

test('saved STL and colored display match a fresh default compilation', () => {
  const saved = parseDisplayMesh(JSON.parse(readFileSync(new URL(metadata.displayModel, folder), 'utf8')));
  const result = render(source);
  try {
    expect(result.ok && !result.warnings && !result.geom_errors).toBe(true);
    expect(Buffer.from(binaryStl(result.positions, result.normals)).equals(readFileSync(new URL(metadata.model, folder)))).toBe(true);
    expect(saved.positions).toEqual(result.preview_positions);
    expect(saved.normals).toEqual(result.preview_normals.map(value => value === 0 ? 0 : value));
    expect(saved.groups).toEqual(JSON.parse(result.groups));
  } finally { result.free(); }
});

test('every source color belongs to a legend part', () => {
  const legend = metadata.customizer.parts.map(part => part.color.match(/\w\w/g).map(h => parseInt(h, 16)));
  compile({}, result => {
    for (const group of JSON.parse(result.groups)) {
      const rgb = group.color.slice(0, 3).map(c => Math.round(c * 255));
      expect(legend.some(part => part.every((c, i) => Math.abs(c - rgb[i]) <= 3))).toBe(true);
    }
  });
});

test('the printable mount sits on the table with its wings on the dog holes', () => {
  compile({ View: 'mount' }, result => {
    expect(result.ok).toBe(true);
    // Dogs two pitches along and one across, at (±96, ±48); each pad is 18 mm in radius.
    const [min, max] = bounds(result.positions);
    expect(min.map(v => +v.toFixed(3))).toEqual([-114, -66, 0]);
    expect(max.map(v => +v.toFixed(3))).toEqual([114, 66, 8]);
  });
});

test('the build notes give the counterbore depth for the chosen screw', () => {
  compile({}, result => expect(result.echo).toContain('8 mm diameter x 7 mm deep'));
  compile({ Puck_thickness: 38, Screw_length: 35 }, result => expect(result.echo).toContain('8 mm diameter x 10 mm deep'));
});

test.each([
  [{ Pitches_across: 0 }, "Dog 1's knob would hit the fitting."],
  [{ Pitches_along: 1, Pitches_across: 0 }, "Dog 1's knob would hit the puck or plate."],
  [{ Screw_length: 30 }, 'The screw is too long'],
  [{ Screw_length: 12, Plate_thickness: 10 }, 'The screw is too short'],
  [{ Screw_axis: 'along', Screw_shift: 30 }, 'would cut into the air channel or port'],
  [{ Puck_thickness: 15 }, 'The dog knobs must sit below'],
])('rejects %j', (changes, message) => {
  compile(changes, result => {
    expect(result.ok).toBe(false);
    expect(result.error).toContain(message);
  });
});

test('a fitting clash names the dog layout fixes', async () => {
  const values = { ...defaults(schema), Pitches_across: 0 };
  const [conflict, ...rest] = await analyzeConflicts(configured({ Pitches_across: 0 }), conflictInputs(schema, values), render, { precision: 0.1 });
  expect(rest).toEqual([]);
  expect(conflict.fixes).toContainEqual({ input: 'Pitches_across', value: 1, change: 'raise' });
  expect(conflict.fixes).toContainEqual({ input: 'Fitting_offset', value: 25, change: 'raise' });
});
