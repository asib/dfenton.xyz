import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { parameters, render } from 'openrscad-engine/node';
import { configuredSource, defaults, parseParameters } from '../src/components/cad/parameters';
import { parseDisplayMesh } from '../src/components/cad/displayMesh';

const folder = new URL('../public/misc/half-lap-art-frame/', import.meta.url);
const source = readFileSync(new URL('half-lap-art-frame.scad', folder), 'utf8');
const metadata = JSON.parse(readFileSync(new URL('meta.json', folder), 'utf8'));
const schema = parseParameters(parameters(source));
const initial = defaults(schema);
const inch = 25.4;

function compile(changes = {}) {
  const result = render(configuredSource(source, schema, { ...initial, ...changes }));
  try {
    return { ok: result.ok, error: result.error, warnings: result.warnings, degraded: result.geom_errors,
      volume: result.volume, positions: result.positions, preview: result.preview_positions,
      normals: result.preview_normals, groups: JSON.parse(result.groups || '[]'), echo: result.echo };
  } finally { result.free(); }
}

function bounds(positions) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i++) {
    min[i % 3] = Math.min(min[i % 3], positions[i]);
    max[i % 3] = Math.max(max[i % 3], positions[i]);
  }
  return { min, max, size: max.map((n, i) => n - min[i]) };
}

// Signed triangle volume and paired edges independently verify the exported mesh.
function meshStats(positions) {
  let volume = 0;
  const edges = new Map();
  for (let i = 0; i < positions.length; i += 9) {
    const v = [0, 3, 6].map(offset => Array.from(positions.slice(i + offset, i + offset + 3)));
    const [a, b, c] = v;
    volume += (a[0] * (b[1] * c[2] - b[2] * c[1]) + a[1] * (b[2] * c[0] - b[0] * c[2]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    const keys = v.map(point => point.map(n => n.toFixed(4)).join(','));
    for (let j = 0; j < 3; j++) {
      const key = [keys[j], keys[(j + 1) % 3]].sort().join('|');
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  return { volume, closed: [...edges.values()].every(count => count === 2) };
}

// Intersect an axis-aligned ray with actual triangles; measurements are inches.
function rayHits(positions, axis, u, v) {
  const uAxis = (axis + 1) % 3, vAxis = (axis + 2) % 3;
  const hits = [];
  for (let i = 0; i < positions.length; i += 9) {
    const [a, b, c] = [0, 3, 6].map(offset => Array.from(positions.slice(i + offset, i + offset + 3), n => n / inch));
    const det = (b[vAxis] - c[vAxis]) * (a[uAxis] - c[uAxis]) + (c[uAxis] - b[uAxis]) * (a[vAxis] - c[vAxis]);
    if (Math.abs(det) < 1e-8) continue;
    const wa = ((b[vAxis] - c[vAxis]) * (u - c[uAxis]) + (c[uAxis] - b[uAxis]) * (v - c[vAxis])) / det;
    const wb = ((c[vAxis] - a[vAxis]) * (u - c[uAxis]) + (a[uAxis] - c[uAxis]) * (v - c[vAxis])) / det;
    if (Math.min(wa, wb, 1 - wa - wb) >= -1e-6) hits.push(wa * a[axis] + wb * b[axis] + (1 - wa - wb) * c[axis]);
  }
  return [...new Set(hits.map(n => Number(n.toFixed(5))))].sort((a, b) => a - b);
}

test('retains original defaults, bounds, overlap semantics and derived blank lengths', () => {
  expect(initial).toEqual({ Art_width: 30.375, Art_height: 21.3125, Reveal: 0.25,
    Member_width: 2.5, Thickness: 0.75, Rabbet_depth: 0.25, Clearance: 0.03125,
    Exploded: false, Part: 'all' });
  expect(schema.every(field => field.description.length > 0)).toBe(true);
  expect(schema.find(field => field.name === 'Art_height').control).toMatchObject({ min: 1, max: 200 });
  expect(configuredSource(source, schema, initial)).toBe(source);
  const result = compile();
  expect(result.echo).toContain('Visible opening: 29.875 x 20.8125');
  expect(result.echo).toContain('Rail blanks (2): 34.875 long x 2.5 wide x 0.75 thick');
  expect(result.echo).toContain('Stile blanks (2): 25.8125 long x 2.5 wide x 0.75 thick');
});

test.each([
  {}, { Art_width: 32, Art_height: 24 }, { Reveal: 0.5 }, { Member_width: 3 },
  { Thickness: 1, Rabbet_depth: 0.625 }, { Rabbet_depth: 0 }, { Clearance: 0.125 },
  { Art_width: 1, Art_height: 1, Reveal: 0.01, Member_width: 0.25, Thickness: 0.125, Rabbet_depth: 0.0625, Clearance: 0 },
  { Art_width: 200, Art_height: 200, Reveal: 4, Member_width: 12, Thickness: 4, Rabbet_depth: 3, Clearance: 0.25 },
])('matches the original FeatureScript volume formula and four closed parts for %j', changes => {
  const p = { ...initial, ...changes };
  const iw = p.Art_width - 2 * p.Reveal, ih = p.Art_height - 2 * p.Reveal;
  const ow = iw + 2 * p.Member_width, oh = ih + 2 * p.Member_width;
  const expected = ((ow * oh - iw * ih) * p.Thickness -
    ((p.Art_width + 2 * p.Clearance) * (p.Art_height + 2 * p.Clearance) - iw * ih) * p.Rabbet_depth) * inch ** 3;
  const result = compile(changes);
  expect(result.ok).toBe(true);
  expect(result.warnings).toBe('');
  expect(result.degraded).toBe('');
  expect(Math.abs(result.volume / expected - 1)).toBeLessThan(1e-6);
  expect(result.groups).toHaveLength(4);
  const partStats = result.groups.map(group => meshStats(result.preview.slice(group.start * 3, (group.start + group.count) * 3)));
  expect(partStats.every(part => part.closed && part.volume > 0)).toBe(true);
  // Summed physical-piece volume equals the union: no overlapping material.
  expect(Math.abs(partStats.reduce((sum, part) => sum + part.volume, 0) / result.volume - 1)).toBeLessThan(1e-6);
  for (const [axis, size] of [ow, oh, p.Thickness].entries())
    expect(bounds(result.positions).size[axis] / inch).toBeCloseTo(size, 4);
});

test('mates all four half-laps at half thickness and cuts the rabbet from the back', () => {
  for (const Thickness of [0.75, 1]) {
    const parts = Object.fromEntries(['top', 'bottom', 'left', 'right'].map(Part => [Part, compile({ Part, Thickness }).positions]));
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const x = sx * (34.875 / 2 - 1.25), y = sy * (25.8125 / 2 - 1.25);
      expect(rayHits(parts[sy > 0 ? 'top' : 'bottom'], 2, x, y)).toEqual([Thickness / 2, Thickness]);
      expect(rayHits(parts[sx > 0 ? 'right' : 'left'], 2, x, y)).toEqual([0, Thickness / 2]);
    }
    expect(rayHits(parts.top, 2, 0, 20.8125 / 2 + 0.1)).toEqual([0.25, Thickness]);
    expect(rayHits(parts.top, 2, 0, 25.8125 / 2 - 0.1)).toEqual([0, Thickness]);
  }
});

test('clearance enlarges only the rear pocket, and zero depth removes the rabbet', () => {
  for (const Clearance of [0, 0.03125, 0.125]) {
    const result = compile({ Clearance });
    expect(rayHits(result.positions, 0, 0, 0.6)).toEqual([-17.4375, -14.9375, 14.9375, 17.4375]);
    expect(rayHits(result.positions, 0, 0, 0.1)).toEqual([-17.4375, -(15.1875 + Clearance), 15.1875 + Clearance, 17.4375]);
    expect(rayHits(result.positions, 2, 0, 0)).toEqual([]);
  }
  const noRabbet = compile({ Rabbet_depth: 0 });
  expect(rayHits(noRabbet.positions, 0, 0, 0.1)).toEqual([-17.4375, -14.9375, 14.9375, 17.4375]);
});

test('explosion matches the original offsets; individual exports keep their assembly coordinates', () => {
  const assembled = compile(), exploded = compile({ Exploded: true });
  expect(exploded.volume).toBeCloseTo(assembled.volume, 4);
  const offsets = [[0, 5, 0.75], [0, -5, 0.75], [-5, 0, 0], [5, 0, 0]];
  for (const [i, Part] of ['top', 'bottom', 'left', 'right'].entries()) {
    const part = compile({ Part });
    expect(part.groups).toHaveLength(1);
    expect(compile({ Part, Exploded: true }).positions).toEqual(part.positions);
    const group = exploded.groups[i];
    const b = bounds(exploded.preview.slice(group.start * 3, (group.start + group.count) * 3));
    const a = bounds(part.positions);
    for (let axis = 0; axis < 3; axis++) {
      expect((b.min[axis] - a.min[axis]) / inch).toBeCloseTo(offsets[i][axis], 4);
      expect(b.size[axis]).toBeCloseTo(a.size[axis], 3);
    }
  }
});

test.each([
  [{ Reveal: 1, Art_width: 1 }, 'Overlap leaves no opening'],
  [{ Reveal: 0.25, Clearance: 0.25, Member_width: 0.5 }, 'Overlap plus clearance'],
  [{ Rabbet_depth: 0.75 }, 'Rabbet depth must be less'],
  [{ Art_height: 0.5 }, 'Artwork dimensions'],
  [{ Rabbet_depth: -0.1 }, 'Rabbet depth must be between'],
])('rejects invalid source dimensions for %j', (changes, message) => {
  const result = compile(changes);
  expect(result.ok).toBe(false);
  expect(result.error).toContain(message);
  expect(result.positions.length).toBe(0);
});

test('saved colored first load and STL agree with live defaults', () => {
  const result = compile();
  const saved = parseDisplayMesh(JSON.parse(readFileSync(new URL(metadata.displayModel, folder), 'utf8')));
  expect(saved.positions).toEqual(result.preview);
  expect(saved.normals).toEqual(result.normals.map(value => value === 0 ? 0 : value));
  expect(saved.groups).toEqual(result.groups);
  for (const [i, group] of saved.groups.entries()) {
    const color = metadata.customizer.parts[i].color.match(/\w\w/g).map(n => parseInt(n, 16) / 255);
    for (let axis = 0; axis < 3; axis++) expect(group.color[axis]).toBeCloseTo(color[axis], 6);
  }
  const stl = readFileSync(new URL(metadata.model, folder));
  const triangles = stl.readUInt32LE(80);
  expect(stl.length).toBe(84 + triangles * 50);
  const positions = new Float32Array(triangles * 9);
  for (let i = 0; i < triangles; i++) for (let j = 0; j < 9; j++) positions[i * 9 + j] = stl.readFloatLE(84 + i * 50 + 12 + j * 4);
  const stats = meshStats(positions);
  expect(stats.closed).toBe(true);
  expect(Math.abs(stats.volume / result.volume - 1)).toBeLessThan(1e-6);
  for (let axis = 0; axis < 3; axis++) expect(bounds(positions).size[axis]).toBeCloseTo(bounds(result.positions).size[axis], 3);
});
