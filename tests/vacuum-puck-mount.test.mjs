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

test.each(['assembly', 'mount', 'template'])('every source color in the %s view belongs to a legend part', View => {
  const legend = metadata.customizer.parts.map(part => part.color.match(/\w\w/g).map(h => parseInt(h, 16)));
  compile({ View }, result => {
    expect(result.ok).toBe(true);
    for (const group of JSON.parse(result.groups)) {
      const rgb = group.color.slice(0, 3).map(c => Math.round(c * 255));
      expect(legend.some(part => part.every((c, i) => Math.abs(c - rgb[i]) <= 3))).toBe(true);
    }
  });
});

test('the printable mount sits on the table with its wing slots on the dog holes', () => {
  // Dogs two pitches along and one across, at (±96, ±48); each pad is 18 mm in radius,
  // and the default 8 mm slots reach 4 mm further out along the line through both dogs.
  const out = 4 / Math.sqrt(5);
  for (const [Slot_length, x, y] of [[8, 114 + 2 * out, 66 + out], [0, 114, 66]]) compile({ View: 'mount', Slot_length }, result => {
    expect(result.ok).toBe(true);
    const [min, max] = bounds(result.positions);
    expect(min.map(v => +v.toFixed(3))).toEqual([-x, -y, 0].map(v => +v.toFixed(3)));
    expect(max.map(v => +v.toFixed(3))).toEqual([x, y, 8].map(v => +v.toFixed(3)));
  });
});

test('the drill template is a flat plate with its holes at the screw spacing', () => {
  for (const Screw_spacing of [48, 30]) compile({ View: 'template', Screw_spacing }, result => {
    expect(result.ok).toBe(true);
    // 6 mm of plate beyond each hole centre, 24 mm wide and 6 mm thick.
    const [min, max] = bounds(result.positions);
    expect(min.map(v => +v.toFixed(3) + 0)).toEqual([-Screw_spacing / 2 - 6, -12, 0]);
    expect(max.map(v => +v.toFixed(3))).toEqual([Screw_spacing / 2 + 6, 12, 6]);
    // Each hole's rim on the bed face is the 4.5 mm screw hole plus 0.2 mm clearance, centred at ±spacing/2.
    for (const side of [-1, 1]) {
      const rim = [];
      for (let i = 0; i < result.positions.length; i += 3) {
        const [x, y, z] = [result.positions[i], result.positions[i + 1], result.positions[i + 2]];
        const r = Math.hypot(x - side * Screw_spacing / 2, y);
        if (Math.abs(z) < 1e-3 && r < 3) rim.push(r);
      }
      expect(Math.max(...rim)).toBeCloseTo(2.35, 3);
    }
    // The top face covers the whole plate less its rounded corners and chamfered holes. An
    // offset()-rounded plate lost half this face in openrscad-engine 0.14 while staying closed.
    let top = 0;
    const p = result.positions;
    for (let t = 0; t < p.length; t += 9) if ([2, 5, 8].every(o => Math.abs(p[t + o] - 6) < 1e-4))
      top += ((p[t + 3] - p[t]) * (p[t + 7] - p[t + 1]) - (p[t + 6] - p[t]) * (p[t + 4] - p[t + 1])) / 2;
    const expected = (Screw_spacing + 12) * 24 - (4 - Math.PI) * 9 - 2 * Math.PI * 2.93 ** 2;
    expect(Math.abs(top - expected) / expected).toBeLessThan(0.01);
  });
});

test('the build notes give the counterbore depth for the chosen screw', () => {
  compile({}, result => {
    expect(result.echo).toContain('8 mm diameter x 9.225 mm deep');
    expect(result.echo).toContain('holes along the length, its middle 4 mm from centre away from the fitting end, and drill both 4.5 mm holes through, 48 mm apart. Then counterbore each hole 8 mm across and 9.2 mm deep.');
    expect(result.echo).toContain('214.7 mm apart; the slots take 206.7 to 222.7 mm.');
  });
  compile({ Puck_thickness: 38, Screw_length: 35 }, result => expect(result.echo).toContain('8 mm diameter x 10 mm deep'));
});

test.each([
  [{ Pitches_across: 0 }, "Dog 1's knob would hit the fitting."],
  [{ Pitches_along: 1, Pitches_across: 0 }, "Dog 1's knob would hit the puck or plate at the inner end of its slot."],
  [{ Screw_length: 25 }, 'The screw is too long'],
  [{ Screw_length: 12, Plate_thickness: 10 }, 'The screw is too short'],
  [{ Screw_axis: 'along', Screw_shift: 20 }, 'would cut into the air channel or port'],
  [{ Screw_shift: 10 }, 'Screw 1 would cut into the air channel or port'],
  [{ Screw_axis: 'across', Screw_spacing: 40 }, "Screw 1's counterbore must stay 1 mm inside the foam gasket."],
  [{ Screw_shift: -20 }, "Screw 2's counterbore must stay 1 mm inside the foam gasket."],
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
  expect(conflict.fixes).toContainEqual({ input: 'Fitting_offset', value: 23.7, change: 'raise' });
});
