import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { parameters, render } from 'openrscad-engine/node';
import { configuredSource, defaults, parseParameters } from '../src/components/cad/parameters';
import { binaryStl } from '../src/components/cad/stl';

const source = readFileSync(new URL('../public/misc/magnetic-saw-guide/magnetic-saw-guide.scad', import.meta.url), 'utf8');
const schema = parseParameters(parameters(source));
const initial = defaults(schema);
function compile(changes = {}) {
  const text = configuredSource(source, schema, { ...initial, ...changes });
  const result = render(text);
  try {
    return { text, ok: result.ok, error: result.error, degraded: result.geom_errors,
      volume: result.volume, positions: result.positions, normals: result.normals };
  } finally { result.free(); }
}
function meshStats(buffer) {
  const view = new DataView(buffer);
  const count = view.getUint32(80, true);
  expect(buffer.byteLength).toBe(84 + count * 50);
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  let volume = 0;
  const edgeCounts = new Map();
  for (let i = 0; i < count; i++) {
    const vertices = [0, 1, 2].map(vertex => [0, 1, 2].map(axis => view.getFloat32(84 + 50 * i + 12 + 12 * vertex + axis * 4, true)));
    for (const point of vertices) for (let axis = 0; axis < 3; axis++) { min[axis] = Math.min(min[axis], point[axis]); max[axis] = Math.max(max[axis], point[axis]); }
    const [a,b,c] = vertices;
    volume += (a[0]*(b[1]*c[2]-b[2]*c[1]) + a[1]*(b[2]*c[0]-b[0]*c[2]) + a[2]*(b[0]*c[1]-b[1]*c[0])) / 6;
    const keys = vertices.map(point => point.map(n => n.toFixed(4)).join(','));
    for (let edge = 0; edge < 3; edge++) {
      const key = [keys[edge], keys[(edge+1)%3]].sort().join('|');
      edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
    }
  }
  return { min, max, volume, closed: [...edgeCounts.values()].every(count => count === 2) };
}

describe('saw guide customization', () => {
  test('preserves all public groups, help, steps and exact fractional defaults', () => {
    expect(schema).toHaveLength(15);
    expect([...new Set(schema.map(p => p.group))]).toEqual(['Guide slope', 'Magnet layout', 'Magnet size and fit', 'Guide body']);
    expect(initial.magnet_diameter).toBe(7.9375);
    expect(initial.magnet_depth).toBe(1.984375);
    expect(schema.find(p => p.name === 'additional_horizontal_holes')?.control.step).toBe(1);
    expect(schema.find(p => p.name === 'slope_input')?.control.options?.map(o => o.value)).toEqual(['Ratio', 'Angle', 'Square']);
    expect(schema.every(p => p.description.length > 0)).toBe(true);
    expect(schema.some(p => ['a', 'radius', 'eps'].includes(p.name))).toBe(false);
    expect(configuredSource(source, schema, initial)).toBe(source);
  });
  test('accepts boolean controls, optional help, and ranges without a step', () => {
    const text = '/* [Example] */\non = true;\nsize = 12; // [1:20]\n/* [Hidden] */\nsecret = 8;\ncube(size);';
    const fields = parseParameters(parameters(text));
    expect(fields).toHaveLength(2);
    expect(fields[0].type).toBe('boolean');
    expect(fields[0].description).toBe('');
    expect(fields[1].control.step).toBeUndefined();
    expect(configuredSource(text, fields, {on:false,size:14})).toContain('on = false;');
  });
  test('compiled defaults match the original exported solid and remain closed', () => {
    const result = compile();
    expect(result.ok).toBe(true);
    expect(result.degraded).toBe('');
    const actual = meshStats(binaryStl(result.positions, result.normals));
    const file = readFileSync(new URL('../public/misc/magnetic-saw-guide/magnetic-saw-guide.stl', import.meta.url));
    const expected = meshStats(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
    expect(actual.closed).toBe(true);
    expect(Math.abs(actual.volume - expected.volume) / expected.volume).toBeLessThan(0.00001);
    for (let axis = 0; axis < 3; axis++) {
      expect(actual.min[axis]).toBeCloseTo(expected.min[axis], 4);
      expect(actual.max[axis]).toBeCloseTo(expected.max[axis], 4);
    }
  });
  test.each([
    {dovetail_ratio:8}, {slope_input:'Square'}, {slope_input:'Angle',angle_from_square:5},
    {magnet_side:'Left'}, {magnet_side:'Right'},
    {additional_horizontal_holes:0,additional_vertical_holes:0,magnet_gap:0.1},
    {magnet_diameter:8,magnet_depth:2,diameter_clearance:0.1,depth_allowance:0},
    {minimum_wall:3,base_width:40,horizontal_reach:45,upright_rise:40},
  ])('recompiles geometry for %j', changes => {
    const result = compile(changes);
    expect(result.ok).toBe(true);
    expect(result.degraded).toBe('');
    expect(Math.abs(result.volume - 28173.60057)).toBeGreaterThan(1);
    expect(meshStats(binaryStl(result.positions, result.normals)).closed).toBe(true);
    expect(result.text).toContain('Retain this attribution when sharing the file.');
    expect(defaults(parseParameters(parameters(result.text)))).toEqual({...initial, ...changes});
  });
  test.each([
    [{additional_horizontal_holes:50}, 'Horizontal pockets do not fit'],
    [{magnet_diameter:1}, 'Magnet diameter must be between'],
    [{additional_vertical_holes:1.5}, 'whole number'],
    [{base_width:10}, 'Too little material at the top'],
  ])('retains source assertions for %j', (changes, message) => {
    const result = compile(changes);
    expect(result.ok).toBe(false);
    expect(result.error.toLowerCase()).toContain(message.toLowerCase());
    expect(result.positions.length).toBe(0);
  });
  test('rejects unsupported or invalid data and quotes string values safely', () => {
    expect(() => parseParameters('{"params":[{"type":"vector"}]}')).toThrow();
    expect(() => configuredSource(source,schema,{...initial,base_width:NaN})).toThrow();
    expect(() => configuredSource(source,schema,{...initial,base_width:''})).toThrow();
    const text = configuredSource(source,schema,{...initial,slope_input:'"; cube(100); //'});
    expect(compile({slope_input:'"; cube(100); //'}).ok).toBe(false);
    expect(text).toContain('slope_input = "\\\"; cube(100); //";');
    expect(() => binaryStl(new Float32Array([NaN]),new Float32Array([0]))).toThrow();
  });
});

describe('tool tote customization', () => {
  const toteSource = readFileSync(new URL('../public/misc/tool-tote/tool-tote.scad', import.meta.url), 'utf8');
  const toteSchema = parseParameters(parameters(toteSource));
  const toteDefaults = defaults(toteSchema);
  function tote(changes = {}) {
    const result = render(configuredSource(toteSource, toteSchema, { ...toteDefaults, ...changes }));
    try {
      return { ok: result.ok, error: result.error, degraded: result.geom_errors, warnings: result.warnings, positions: result.positions,
        stats: result.ok ? meshStats(binaryStl(result.positions, result.normals)) : null };
    } finally { result.free(); }
  }
  test('keeps inch defaults and matches the committed initial mesh in millimetres', () => {
    expect(toteSchema).toHaveLength(31);
    expect(toteDefaults).toMatchObject({ Riser_length: 10.75, Handle_width: 1.125, Handle_notch_depth: 0.5, Handle_end_cutaway_depth: 1.5, Riser_dado_depth: 0.25 });
    expect(configuredSource(toteSource, toteSchema, toteDefaults)).toBe(toteSource);
    const actual = tote();
    expect(actual.ok).toBe(true);
    expect(actual.degraded).toBe('');
    expect(actual.warnings).toBe('');
    const file = readFileSync(new URL('../public/misc/tool-tote/tool-tote.stl', import.meta.url));
    const expected = meshStats(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
    expect(actual.stats.volume).toBeCloseTo(expected.volume, 4);
    for (const [axis, size] of [508, 228.6, 292.1].entries()) {
      expect(actual.stats.max[axis] - actual.stats.min[axis]).toBeCloseTo(size, 3);
    }
  });
  test('regenerates inch dimensions, exploded geometry and individual parts', () => {
    const wider = tote({ Body_width: 10 });
    expect(wider.stats.max[1] - wider.stats.min[1]).toBeCloseTo(254, 3);
    const exploded = tote({ Part: 'exploded', Explode: 2 });
    expect(exploded.ok).toBe(true);
    expect(exploded.stats.max[0] - exploded.stats.min[0]).toBeGreaterThan(508);
    const bottom = tote({ Part: 'bottom' });
    expect(bottom.stats.closed).toBe(true);
    expect(bottom.stats.max[1]).toBeCloseTo(7.875 * 25.4, 3);
    expect(tote({ Part: 'side' }).stats.closed).toBe(true);
  });
  test('preserves the source joinery assertions', () => {
    const invalid = tote({ Riser_length: 8 });
    expect(invalid.ok).toBe(false);
    expect(invalid.error).toContain('Handle must clear sides');
  });
  test('raises both handle tips on both laminations while retaining full blank height and the bridle notches', () => {
    const inch3 = 25.4 ** 3;
    for (const fraction of [0.5, 0.4]) for (const Part of ['handle_laminate_1', 'handle_laminate_2']) {
      const thickness = 1.125 * (Part === 'handle_laminate_1' ? fraction : 1 - fraction);
      for (const depth of [0, 0.75, 1.5]) {
        const handle = tote({ Part, Handle_lamination_fraction: fraction, Handle_end_cutaway_depth: depth });
        expect(handle.ok).toBe(true);
        expect(handle.stats.closed).toBe(true);
        expect(handle.stats.max[2]).toBeCloseTo(3 * 25.4, 3);
        expect(handle.stats.min[2]).toBe(0);
        // Two 3/4 × 1/2 notches and two 1-1/4-inch-long end cutaways.
        expect(handle.stats.volume / inch3).toBeCloseTo((60 - 0.75 - 2.5 * depth) * thickness, 4);
        for (const tipX of [0, 20 * 25.4]) {
          const tipHeights = [];
          for (let i = 0; i < handle.positions.length; i += 3) {
            if (Math.abs(handle.positions[i] - tipX) < 0.001) tipHeights.push(handle.positions[i + 2]);
          }
          expect(Math.min(...tipHeights)).toBeCloseTo(depth * 25.4, 3);
        }
      }
    }
    for (const depth of [-0.1, 3, 4]) {
      const invalid = tote({ Handle_end_cutaway_depth: depth });
      expect(invalid.ok).toBe(false);
      expect(invalid.error).toContain('Handle end cutaway depth');
    }
  });
});
