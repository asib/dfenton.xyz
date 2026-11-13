import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { parameters, render } from 'openrscad-engine/node';
import { analyzeConflicts, conflictInputs } from '../src/components/cad/conflicts';
import { parseDisplayMesh } from '../src/components/cad/displayMesh';
import { configuredSource, defaults, parseParameters } from '../src/components/cad/parameters';
import { binaryStl } from '../src/components/cad/stl';

const folder = new URL('../public/misc/bench-cookie-mft-knob/', import.meta.url);
const source = readFileSync(new URL('bench-cookie-mft-knob.scad', folder), 'utf8');
const metadata = JSON.parse(readFileSync(new URL('meta.json', folder), 'utf8'));
const schema = parseParameters(parameters(source), source);
const configured = changes => configuredSource(source, schema, { ...defaults(schema), ...changes });

const compile = (changes, check) => {
  const result = render(configured(changes));
  try { return check(result); } finally { result.free(); }
};
const vertices = positions => Array.from({ length: positions.length / 3 }, (_, i) => positions.slice(3 * i, 3 * i + 3));
const radius = ([x, y]) => Math.hypot(x, y);
const legend = metadata.customizer.parts.map(part => ({ id: part.id, rgb: part.color.match(/\w\w/g).map(h => parseInt(h, 16)) }));
// The preview vertices of the legend part `id`, from the engine's colored groups.
const partVertices = (result, id) => {
  const { rgb } = legend.find(part => part.id === id);
  return JSON.parse(result.groups)
    .filter(group => group.color.slice(0, 3).every((c, i) => Math.abs(Math.round(c * 255) - rgb[i]) <= 3))
    .flatMap(group => vertices(result.preview_positions.slice(3 * group.start, 3 * (group.start + group.count))));
};

// Defaults: a 13.5 mm knob, 3 mm ring and 19 mm table, with the head seated
// 5.6 + 2 mm up its pocket, leave 27.9 mm of a bolt's length below the table top.
const seatToTable = 13.5 + 3 + 19 - 7.6;

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

test.each(['assembly', 'knob'])('every source color in the %s view belongs to a legend part', View => {
  compile({ View }, result => {
    expect(result.ok).toBe(true);
    for (const group of JSON.parse(result.groups)) {
      const rgb = group.color.slice(0, 3).map(c => Math.round(c * 255));
      expect(legend.some(part => part.rgb.every((c, i) => Math.abs(c - rgb[i]) <= 3))).toBe(true);
    }
  });
});

test('the printable knob stands on its head pocket, 30 mm across and 20.5 mm tall', () => {
  compile({ View: 'knob' }, result => {
    expect(result.ok).toBe(true);
    const points = vertices(result.positions);
    for (const c of [0, 1]) {
      expect(Math.min(...points.map(p => p[c]))).toBeCloseTo(-15, 3);
      expect(Math.max(...points.map(p => p[c]))).toBeCloseTo(15, 3);
    }
    expect(Math.min(...points.map(p => p[2]))).toBeCloseTo(0, 6);
    // 13.5 mm body, 3 mm ring and 4 mm boss.
    expect(Math.max(...points.map(p => p[2]))).toBeCloseTo(20.5, 6);
  });
});

test('the head pocket is 1/2 inch plus clearance across flats, with its roof 7.6 mm up', () => {
  const corner = 12.75 / Math.sqrt(3);
  compile({ View: 'knob' }, result => {
    const points = vertices(result.positions);
    const rim = points.filter(p => Math.abs(p[2]) < 1e-4 && radius(p) < 10).map(radius);
    expect(Math.max(...rim)).toBeCloseTo(corner, 3);
    expect(points.some(p => Math.abs(p[2] - 7.6) < 1e-4 && Math.abs(radius(p) - corner) < 1e-3)).toBe(true);
    // The 8.1 mm bolt hole leaves the boss through a 0.5 mm lead-in, about 9.1 mm across at the top.
    const top = points.filter(p => Math.abs(p[2] - 20.5) < 1e-4 && radius(p) < 8).map(radius);
    expect(Math.max(...top)).toBeCloseTo(4.55, 1);
  });
});

test('the knurl cuts half a pitch deep, and turning it off leaves a plain body', () => {
  // 30 teeth on 30 mm: a pi mm pitch, so the roots are pi / 2 below the surface.
  const band = points => points.filter(p => p[2] > 2 && p[2] < 11.5 && radius(p) > 9).map(radius);
  compile({ View: 'knob' }, result => {
    const radii = band(vertices(result.positions));
    // Both extremes fall between the twisted extrusions' slices, so they're a little inside.
    expect(Math.min(...radii)).toBeCloseTo(15 - Math.PI / 2, 1);
    expect(Math.max(...radii)).toBeCloseTo(15, 2);
  });
  compile({ View: 'knob', Knurl: false }, result => {
    expect(result.ok).toBe(true);
    expect(band(vertices(result.positions)).every(r => Math.abs(r - 15) < 1e-3)).toBe(true);
  });
});

test('the bolt seats on the pocket roof and reaches into the insert by its length less the stack', () => {
  for (const [Bolt_length, Table_thickness] of [[1.5, 19], [1.25, 14]]) {
    compile({ Bolt_length, Table_thickness }, result => {
      expect(result.ok).toBe(true);
      const bolt = partVertices(result, 'bolt');
      const knobBase = -Table_thickness - 13.5 - 3;
      expect(Math.min(...bolt.map(p => p[2]))).toBeCloseTo(knobBase + 2, 4);
      expect(Math.max(...bolt.map(p => p[2]))).toBeCloseTo(Bolt_length * 25.4 - (seatToTable - 19 + Table_thickness), 4);
      // The knob's ring meets the table's underside.
      expect(Math.max(...partVertices(result, 'knob').map(p => p[2]))).toBeCloseTo(-Table_thickness + 4, 4);
    });
  }
});

test('the build notes give the bolt reach and the lengths that fit', () => {
  compile({}, result => {
    expect(result.echo).toContain("Bolt: 5/16-18 hex bolt, 1 1/2 in (38.1 mm) under the head. It reaches 10.2 mm into the cookie's insert, which takes 12 mm.");
    expect(result.echo).toContain('Lengths that fit: 35.9 to 39.4 mm under the head, which is 1 1/2 in.');
    expect(result.echo).toContain('Head pocket: 12.75 mm across flats and 7.6 mm deep.');
  });
  compile({ Insert_depth: 20 }, result => expect(result.echo).toContain('which is 1 1/2 in or 1 3/4 in.'));
  compile({ Insert_depth: 25 }, result => expect(result.echo).toContain('which is 1 1/2 in, 1 3/4 in or 2 in.'));
  compile({ Table_thickness: 12, Bolt_length: 1.25 }, result => {
    expect(result.ok).toBe(true);
    expect(result.echo).toContain('Lengths that fit: 28.9 to 32.4 mm under the head, which is 1 1/4 in.');
  });
});

test.each([
  [{ Bolt_length: 1.25 }, "The bolt is too short to reach far enough into the cookie's insert."],
  [{ Bolt_length: 1.75 }, 'The bolt is too long: it would bottom out'],
  [{ Insert_depth: 8 }, 'The insert is too shallow for the least engagement.'],
  [{ Boss_diameter: 20.5 }, 'The boss must fit in the table hole.'],
  [{ Ring_diameter: 20 }, 'The ring must be wider than the table hole'],
  [{ Boss_height: 18.5 }, 'The boss must stay inside the table hole.'],
  [{ Bolt_hole: 7.9 }, 'The bolt hole must be wider than the 5/16 inch bolt.'],
  [{ Knob_diameter: 24, Knurl_teeth: 12 }, 'The knob is too narrow round the head pocket.'],
  [{ Knob_height: 8, Head_recess: 3, Bolt_length: 1.25 }, 'The knob is too short over the head pocket.'],
])('rejects %j', (changes, message) => {
  compile(changes, result => {
    expect(result.ok).toBe(false);
    expect(result.error).toContain(message);
  });
});

test('a bolt that would bottom out names the shorter bolt and a deeper insert as fixes', async () => {
  const values = { ...defaults(schema), Bolt_length: 1.75 };
  const [conflict, ...rest] = await analyzeConflicts(configured({ Bolt_length: 1.75 }), conflictInputs(schema, values), render, { precision: 0.1 });
  expect(rest).toEqual([]);
  expect(conflict.fixes).toContainEqual({ input: 'Bolt_length', value: 1.5, change: 'set' });
  expect(conflict.fixes).toContainEqual({ input: 'Insert_depth', value: 17.5, change: 'raise' });
});
