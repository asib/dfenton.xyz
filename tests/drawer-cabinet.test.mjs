import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { parameters, render } from 'openrscad-engine/node';
import { configuredSource, defaults, parseParameters } from '../src/components/cad/parameters';
import { Color } from 'three';
import { coloredGeometry, geometryPieces, legendPart, parseDisplayMesh, parsePieceLabels, pieceKey, visiblePartColors } from '../src/components/cad/displayMesh';
import { parseCutList } from '../src/components/cad/cutList';
import { layoutSheets, parseSheetParts, parseSheetStock } from '../src/components/cad/sheetLayout';

const folder = new URL('../public/misc/drawer-cabinet/', import.meta.url);
const source = readFileSync(new URL('drawer-cabinet.scad', folder), 'utf8');
const metadata = JSON.parse(readFileSync(new URL('meta.json', folder), 'utf8'));
const schema = parseParameters(parameters(source), source);
const initial = defaults(schema);
const inch = 25.4;
const colors = Object.fromEntries(metadata.customizer.parts.map(part => [part.id, part.color]));

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

// Preview triangles of every physical piece shown in one legend color; pieces
// carry their own source colors within 3/255 of it.
function piece(result, id) {
  const groups = result.groups.filter(g => legendPart(g.color, metadata.customizer.parts)?.id === id);
  const out = new Float32Array(groups.reduce((n, g) => n + g.count * 3, 0));
  let offset = 0;
  for (const g of groups) { out.set(result.preview.slice(g.start * 3, (g.start + g.count) * 3), offset); offset += g.count * 3; }
  return out;
}
const near = (values, expected) => {
  expect(values).toHaveLength(expected.length);
  values.forEach((value, i) => expect(value).toBeCloseTo(expected[i], 4));
};

test('exposes carcass, layout, box, runner and a drawer list with no fixed maximum', () => {
  expect(initial).toMatchObject({ Width: 24, Height: 30, Depth: 18, Case_thickness: 0.75, Case_joinery: 'rabbet',
    Drawers: [[5, 0], [6, 0], [0, 0], [0, 0]], Reveal: 0.0625, Box_construction: 'front_back_overlap', Runner_style: 'strip', Part: 'all' });
  expect(schema.every(field => field.description.length > 0)).toBe(true);
  expect(schema.find(field => field.name === 'Drawers')).toMatchObject({ type: 'list', group: 'Drawer layout',
    control: { minRows: 1, maxRows: undefined, rowLabel: 'Drawer', columns: [{ label: 'Front height', min: 0, max: 96 }, { label: 'Depth', min: 0, max: 36 }] } });
  // Inspect_drawer has no fixed range; the source assertion limits it to the drawers present.
  const inspect = schema.find(field => field.name === 'Inspect_drawer').control;
  expect([inspect.min, inspect.max]).toEqual([undefined, undefined]);
  expect(configuredSource(source, schema, initial)).toBe(source);
  expect(Object.keys(metadata.customizer.conditions).some(name => name.startsWith('Drawer_'))).toBe(false);
});

test('defaults share the remaining opening between drawers left at zero', () => {
  const result = compile();
  expect(result.ok).toBe(true);
  expect(result.echo).toContain('Opening: 22 1/2″ x 28 1/2″; 17 3/4″ to the back panel');
  // 28 1/2 opening less four reveals, 5 and 6 inch fronts set: 17 1/4 shared by drawers 3 and 4.
  for (const [k, height, sides] of [[1, '5', '4 3/4'], [2, '6', '5 1/32'], [3, '8 5/8', '7 21/32'], [4, '8 5/8', '7 21/32']])
    expect(result.echo).toContain(`Drawer ${k}: front 22 3/8″ x ${height}″; box 22 3/8″ wide x 17 3/4″ deep, sides ${sides}″ tall`);
  for (const [axis, size] of [24, 18, 30].entries()) expect(bounds(result.positions).size[axis] / inch).toBeCloseTo(size, 4);
});

const matrix = [];
for (const Runner_style of ['strip', 'dado', 'side_hung'])
  for (const Box_construction of ['sides_overlap', 'front_back_overlap', 'sides_overlap_groove', 'front_back_overlap_groove'])
    for (const Case_joinery of ['butt', 'rabbet']) matrix.push({ Runner_style, Box_construction, Case_joinery });

test.each([...matrix, { Drawers: [[0, 0]] }, { Height: 48, Drawers: [[0, 0], [6, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]] },
  { Drawers: [[5, 0], [6, 12], [0, 0], [0, 0]], Back_clearance: 1 }, { Runner_height: 2, Reveal: 0 }])(
  'closed, non-overlapping pieces for %j', changes => {
    const result = compile(changes);
    expect(result.ok).toBe(true);
    expect(result.warnings).toBe('');
    expect(result.degraded).toBe('');
    const stats = result.groups.map(group => meshStats(result.preview.slice(group.start * 3, (group.start + group.count) * 3)));
    expect(stats.every(part => part.closed && part.volume > 0)).toBe(true);
    // Summed piece volume equals the union: no member overlaps another.
    expect(Math.abs(stats.reduce((sum, part) => sum + part.volume, 0) / result.volume - 1)).toBeLessThan(1e-6);
    // Intermediate and full explosions translate pieces without any passing through another.
    for (const Explosion_percent of [10, 50, 100, 150, 200]) {
      const exploded = compile({ ...changes, Explosion_percent });
      expect(Math.abs(exploded.volume / result.volume - 1)).toBeLessThan(1e-6);
    }
  });

test('supported drawers bear on their runners or the case bottom and clear the strip above', () => {
  for (const Runner_style of ['strip', 'dado']) for (const Box_construction of ['front_back_overlap', 'sides_overlap_groove', 'front_back_overlap_groove']) {
    const result = compile({ Runner_style, Box_construction });
    // Under a drawer side: case bottom top at 3/4; runner tops at the front bottoms.
    const x = 0.95, y = 10; // Drawer side outside any bottom groove.
    near(rayHits(piece(result, 'runners'), 2, x, y), [8.6875, 9.4375, 17.375, 18.125, 23.4375, 24.1875]);
    near(rayHits(piece(result, 'case-bottom'), 2, x, y), [0, 0.75]);
    const grooved = Box_construction.endsWith('_groove');
    const sides = [...rayHits(piece(result, 'side-odd'), 2, x, y), ...rayHits(piece(result, 'side-even'), 2, x, y)].sort((a, b) => a - b);
    const lift = grooved ? 0 : 0.25;
    // Sides stop 1/32 below the runner carrying the drawer above; the top drawer's sides match its front.
    near(sides, [0.75 + lift, 8.65625, 9.4375 + lift, 17.34375, 18.125 + lift, 23.40625, 24.1875 + lift, 29.1875]);
    if (!grooved) near([...rayHits(piece(result, 'bottom-odd'), 2, x, y), ...rayHits(piece(result, 'bottom-even'), 2, x, y)]
      .sort((a, b) => a - b), [0.75, 1, 9.4375, 9.6875, 18.125, 18.375, 24.1875, 24.4375]);
    if (Runner_style === 'dado') near(rayHits(piece(result, 'case-left'), 0, y, 23.8), [0, 0.5]);
    else near(rayHits(piece(result, 'case-left'), 0, y, 23.8), [0, 0.75]);
  }
});

test('side-hung grooves bear on their runners with clearance below and at the floor', () => {
  const result = compile({ Runner_style: 'side_hung' });
  expect(result.ok).toBe(true);
  // Five reveals: 28 1/2 - 5/16 - 11 leaves 8 19/32 for each auto drawer.
  expect(result.echo).toContain('Drawer 4: front 22 3/8″ x 8 19/32″');
  // Bottom drawer: front from 1/16 above the case bottom; groove centred on its side above the 1/4 bottom.
  const zc = 0.75 + 0.0625 + (0.25 + 8.59375) / 2;
  near(rayHits(piece(result, 'runners'), 0, 10, zc), [0.75, 1.03125, 22.96875, 23.25]);
  near(rayHits(piece(result, 'side-even'), 0, 10, zc), [1.0625, 1.3125, 22.6875, 22.9375]);
  // The drawer hangs: the groove ceiling rests on the strip top, leaving the clearance below.
  near(rayHits(piece(result, 'runners'), 2, 0.9, 10).slice(0, 2), [zc + 0.390625 - 0.75, zc + 0.390625]);
  near(rayHits(piece(result, 'side-even'), 2, 0.9, 10).slice(0, 4), [1.0625, zc - 0.390625, zc + 0.390625, 0.8125 + 8.59375]);
});

test('per-drawer heights and depths change only that drawer', () => {
  const layout = { Drawers: [[5, 0], [6, 0], [4, 0], [0, 0], [3, 0], [0, 10]] };
  const result = compile(layout);
  expect(result.ok).toBe(true);
  // 28 1/8 after six reveals, less 18 set: 10 1/8 shared by drawers 4 and 6.
  expect(result.echo).toContain('Drawer 4: front 22 3/8″ x 5 1/16″');
  expect(result.echo).toContain('Drawer 5: front 22 3/8″ x 3″');
  expect(result.echo).toContain('Drawer 6: front 22 3/8″ x 5 1/16″; box 22 3/8″ wide x 10″ deep');
  expect(compile({ Drawers: [[5, 0], [6, 0], [0, 0], [0, 0], [3, 0], [0, 10]] }).echo).toContain('Drawer 3: front 22 3/8″ x ≈4 45/64″');
  const drawer = k => bounds(compile({ ...layout, Part: 'drawer', Inspect_drawer: k }).positions).size.map(n => n / inch);
  near(drawer(5), [22.375, 17.75, 3]);
  near(drawer(6), [22.375, 10, 5.0625]);
  near(drawer(1), [22.375, 17.75, 5]);
});

test('explosion moves parts without changing them', () => {
  const assembled = compile({ Part: 'drawer', Inspect_drawer: 2 });
  for (const Explosion_percent of [0, 50, 200]) {
    const result = compile({ Part: 'drawer', Inspect_drawer: 2, Explosion_percent });
    expect(Math.abs(result.volume / assembled.volume - 1)).toBeLessThan(1e-6);
    expect(result.groups.map(group => group.color)).toEqual(assembled.groups.map(group => group.color));
    if (Explosion_percent === 0) expect(result.preview).toEqual(assembled.preview);
    else expect(bounds(result.positions).size[1]).toBeGreaterThan(bounds(assembled.positions).size[1]);
  }
  const carcass = compile({ Part: 'carcass' });
  expect(carcass.groups).toHaveLength(11); // Five case panels and six runner strips.
});

test.each([
  [{ Drawers: [[10, 0], [18, 0]] }, 'the fronts must total 28 3/8″ (they total 28″)'],
  [{ Drawers: [[5, 0], [6, 0], [20, 0], [0, 0]] }, 'leave -2 3/4″ for 1 drawer set to 0'],
  [{ Drawers: [[5, 0], [6, 30], [0, 0], [0, 0]] }, 'Drawer 2 depth exceeds the 17 3/4″ available'],
  [{ Runner_height: 7 }, 'Drawer 2 leaves its sides only'],
  [{ Part: 'drawer', Inspect_drawer: 6 }, 'Choose a drawer from 1 to 4.'],
  [{ Back_rabbet_width: 0.75 }, 'Back rabbet width must be less than the case thickness.'],
  [{ Runner_style: 'side_hung', Hang_groove_depth: 0.5 }, 'shallower than the drawer sides'],
  [{ Runner_width: 0.05 }, 'project past the reveal'],
])('rejects %j', (changes, message) => {
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
  const stl = readFileSync(new URL(metadata.model, folder));
  const triangles = stl.readUInt32LE(80);
  expect(stl.length).toBe(84 + triangles * 50);
  const positions = new Float32Array(triangles * 9);
  for (let i = 0; i < triangles; i++) for (let j = 0; j < 9; j++) positions[i * 9 + j] = stl.readFloatLE(84 + i * 50 + 12 + j * 4);
  const stats = meshStats(positions);
  expect(stats.closed).toBe(true);
  expect(Math.abs(stats.volume / result.volume - 1)).toBeLessThan(1e-6);
  expect(positions).toEqual(result.positions);
});

test('plywood parts feed sheet layouts and hardwood runners feed the cut list', () => {
  const sheetParts = changes => parseSheetParts(compile(changes).echo);
  const parts = sheetParts();
  expect(parts.map(p => [p.id, p.material, p.quantity, p.width, p.length, p.grain])).toEqual([
    ['case-sides', '3/4″ plywood', 2, 18, 30, 'length'], ['case-panels', '3/4″ plywood', 2, 17.75, 23.25, 'length'],
    ['back-panel', '1/4″ plywood', 1, 23.25, 30, 'any'],
    ['front-1', '3/4″ plywood', 1, 4.75, 22.375, 'length'], ['front-2', '3/4″ plywood', 1, 5.75, 22.375, 'length'],
    ['front-3', '3/4″ plywood', 2, 8.375, 22.375, 'length'],
    ['side-1', '1/2″ plywood', 2, 4.75, 16.5, 'any'], ['side-2', '1/2″ plywood', 2, 5.03125, 16.5, 'any'],
    ['side-3', '1/2″ plywood', 4, 7.65625, 16.5, 'any'],
    ['back-1', '1/2″ plywood', 1, 4.75, 22.375, 'any'], ['back-2', '1/2″ plywood', 1, 5.03125, 22.375, 'any'],
    ['back-3', '1/2″ plywood', 2, 7.65625, 22.375, 'any'], ['bottom-1', '1/4″ plywood', 4, 17.75, 22.375, 'any']]);
  expect(parts.find(p => p.id === 'front-3').swatches).toEqual(['front-odd', 'front-even']);
  for (const swatch of parts.flatMap(p => p.swatches)) expect(colors[swatch]).toBeDefined();
  expect(parseSheetStock(compile().echo)).toEqual({ sheetLength: 96, sheetWidth: 48, kerf: 0.125, trim: 0 });
  // Every physical piece is counted once.
  for (const changes of [{}, { Height: 48, Drawers: [[0, 0], [6, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]] }, { Runner_style: 'side_hung', Box_construction: 'sides_overlap_groove' },
    { Runner_style: 'side_hung', Box_construction: 'front_back_overlap_groove' }]) {
    const n = changes.Drawers?.length ?? 4, count = prefix => sheetParts(changes).filter(p => new RegExp(`^${prefix}\\d`).test(p.id)).reduce((s, p) => s + p.quantity, 0);
    expect([count('front-'), count('side-'), count('back-'), count('bottom-')]).toEqual([n, 2 * n, n, n]);
  }
  // Each thickness fits one 4 x 8 sheet by either method and grain setting.
  for (const method of ['densest', 'rip']) for (const grain of ['visible', 'any', 'aligned']) {
    const layout = layoutSheets(parts, { sheetLength: 96, sheetWidth: 48, kerf: 0.125, trim: 0, method, grain });
    expect(layout.materials.map(m => [m.material, m.sheets.length])).toEqual([['3/4″ plywood', 1], ['1/2″ plywood', 1], ['1/4″ plywood', 1]]);
  }
  expect(parseCutList(compile().echo)).toEqual([{ id: 'runners', name: 'Runner strip', material: 'Hardwood', quantity: 6,
    thickness: 0.75, width: 0.75, length: 17, blank: 'Runner strip', resawGroup: undefined }]);
  expect(parseCutList(compile({ Runner_style: 'dado' }).echo)[0]).toMatchObject({ thickness: 0.75, width: 1 });
  expect(parseCutList(compile({ Drawers: [[0, 0]] }).echo)).toEqual([]);
  // A part that cannot fit is reported rather than silently dropped.
  const tall = sheetParts({ Height: 96, Drawers: [[0, 0]] });
  expect(layoutSheets(tall, { sheetLength: 96, sheetWidth: 48, kerf: 0.125, trim: 0.5, method: 'densest', grain: 'visible' }))
    .toEqual({ ok: false, error: 'Case sides does not fit on the usable 47 × 95 in sheet with its grain along the sheet.' });
});

test('every physical piece is individually selectable and labeled in its legend color', () => {
  for (const changes of [{}, { Height: 48, Drawers: [[0, 0], [6, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]] }, { Runner_style: 'side_hung' }]) {
    const result = compile(changes);
    const n = changes.Drawers?.length ?? 4, runners = changes.Runner_style === 'side_hung' ? 2 * n : 2 * (n - 1);
    expect(result.groups).toHaveLength(5 + runners + 5 * n);
    const keys = result.groups.map(g => pieceKey(g.color));
    expect(new Set(keys).size).toBe(keys.length);
    const display = { positions: result.preview, normals: result.normals, groups: result.groups };
    const geometry = coloredGeometry(display, metadata.customizer.parts);
    const pieces = geometryPieces(geometry);
    expect(pieces).toHaveLength(result.groups.length);
    expect(visiblePartColors(display, metadata.customizer.parts).map(p => p.id).sort())
      .toEqual(metadata.customizer.parts.map(p => p.id).filter(id => n > 1 || !id.endsWith('-even')).sort());
    // Pieces display exactly in their legend color in both themes.
    const light = geometry.getAttribute('colorLight'), dark = geometry.getAttribute('colorDark');
    for (const [i, group] of result.groups.entries()) {
      const part = metadata.customizer.parts.find(p => p.id === pieces[i].part);
      for (const [attribute, hex] of [[light, part.color], [dark, part.darkColor]]) {
        const expected = new Color(hex);
        expect(attribute.getX(group.start)).toBeCloseTo(expected.r, 6);
        expect(attribute.getZ(group.start)).toBeCloseTo(expected.b, 6);
      }
    }
    geometry.dispose();
    // Shared-color pieces are named; the five case panels have their own legend entries.
    const labels = parsePieceLabels(result.echo);
    expect(labels.size).toBe(runners + 5 * n);
    for (const key of keys.slice(5)) expect(labels.has(key)).toBe(true);
  }
  const labels = parsePieceLabels(compile().echo);
  expect([...labels.values()].slice(0, 2)).toEqual(['Runner R1 · left', 'Runner R1 · right']);
  expect([...labels.values()]).toContain('Drawer 3 front');
});

test('drawer count is limited only by the opening, not a fixed maximum', () => {
  // Twenty 1 1/4 inch drawers in a 30 inch case leave a 2 3/16 inch auto drawer at the bottom.
  const rows = [...Array.from({ length: 20 }, () => [1.25, 0]), [0, 0]];
  const result = compile({ Drawers: rows, Runner_height: 0.25, Runner_clearance: 0 });
  expect(result.ok).toBe(true);
  expect(result.echo).toContain('Drawer 21: front 22 3/8″ x 2 3/16″');
  expect(result.groups).toHaveLength(5 + 2 * 20 + 5 * 21);
  expect(new Set(result.groups.map(g => pieceKey(g.color))).size).toBe(result.groups.length);
  const labels = parsePieceLabels(result.echo);
  expect(labels.size).toBe(2 * 20 + 5 * 21);
  expect([...labels.values()]).toContain('Drawer 21 bottom');
  for (const group of result.groups) if (!labels.has(pieceKey(group.color))) expect(legendPart(group.color, metadata.customizer.parts).id).toMatch(/^case-/);
  // The opening, not the list length, is the real limit.
  expect(compile({ Drawers: Array.from({ length: 30 }, () => [1, 0]), Runner_height: 0.25, Runner_clearance: 0 }).error)
    .toContain('the fronts must total');
});
