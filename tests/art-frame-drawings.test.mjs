import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { render, parameters } from 'openrscad-engine/node';
import { compileDrawings } from '../src/components/cad/drawingCompiler';
import { dimensionValue, jointLabels, parseDrawingDefinition } from '../src/components/cad/drawings';
import { configuredSource, defaults, parseParameters } from '../src/components/cad/parameters';
import { parseCutList, parseStockPreparation, groupCutList, roughDimensions, standardThickness, boardFeet } from '../src/components/cad/cutList';

const source = readFileSync(new URL('../public/misc/half-lap-art-frame/half-lap-art-frame.scad', import.meta.url), 'utf8');
const schema = parseParameters(parameters(source)), initial = defaults(schema);
const configured = changes => configuredSource(source, schema, { ...initial, ...changes });
const drawing = (changes = {}) => compileDrawings(configured(changes), render);
const dimensions = (views, units = 'inches') => Object.fromEntries(views.flatMap(view => view.dimensions.map(d => [d.label, dimensionValue(d, view, units)])));
function output(changes = {}) {
  const result = render(configured(changes));
  try { expect(result.ok).toBe(true); return result.echo; } finally { result.free(); }
}
// Point containment in the actual section contours, including holes.
function contains(loops, x, y) {
  let inside = false;
  for (const loop of loops) for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
    const a = loop[i], b = loop[j];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

test('assembly, corner and two grouped part sheets define all finished cuts', () => {
  const sheet = drawing();
  expect(sheet.views.map(v => v.id)).toEqual(['front', 'top', 'right', 'joint-longitudinal', 'joint-transverse']);
  expect(sheet.parts.map(p => [p.id, p.quantity])).toEqual([['rail', 2], ['stile', 2]]);
  expect(sheet.joint.title).toBe('Half-lap corner detail');
  const assembly = dimensions(sheet.views);
  for (const [name, value] of Object.entries({ 'Outside width': 34.875, 'Outside height': 25.8125,
    'Artwork width': 30.375, 'Artwork height': 21.3125, 'Opening width': 29.875, 'Opening height': 20.8125, Stock: .75 }))
    expect(assembly[name]).toBeCloseTo(value, 6);
  for (const [i, part] of sheet.parts.entries()) {
    const dims = dimensions(part.views);
    for (const [name, value] of Object.entries({ 'Blank length': i ? 25.8125 : 34.875, 'Blank width': 2.5,
      'Each lap': 2.5, 'Lap length': 2.5, 'Lap depth': .375, Thickness: .75,
      'Pocket cut run': i ? 21.375 : 30.4375, 'Pocket end inset': 2.21875, 'Rabbet width': .28125, 'Rabbet depth': .25 })) expect(dims[name]).toBeCloseTo(value, 6);
    expect(part.views).toHaveLength(3);
    expect(part.views[1].profiles).toHaveLength(1);
    expect(part.views[1].breaks.length).toBeGreaterThan(0);
  }
});

test.each([{ Thickness: .75, Rabbet_depth: .25 }, { Thickness: 1, Rabbet_depth: .625 }])('sections show actual complementary laps, bearing and rear rabbet for %j', changes => {
  const sheet = drawing(changes), t = changes.Thickness, d = changes.Rabbet_depth, mm = 25.4;
  const rail = sheet.parts[0], stile = sheet.parts[1];
  const railLap = rail.views[1].profiles[0], stileLap = stile.views[1].profiles[0];
  expect(contains(railLap, -16 * mm, t * .25 * mm)).toBe(false);
  expect(contains(railLap, -16 * mm, t * .75 * mm)).toBe(true);
  expect(contains(stileLap, -12 * mm, t * .25 * mm)).toBe(true);
  expect(contains(stileLap, -12 * mm, t * .75 * mm)).toBe(false);
  for (const [part, inner] of [[rail, 20.8125 / 2], [stile, 29.875 / 2]]) {
    const profile = part.views[2].profiles[0];
    expect(contains(profile, (inner + .1) * mm, d / 2 * mm)).toBe(false);
    expect(contains(profile, (inner + .1) * mm, (d + t) / 2 * mm)).toBe(true);
    expect(contains(profile, (inner + 1) * mm, .1 * mm)).toBe(true);
  }
  for (const view of sheet.views.filter(v => v.section)) {
    expect(view.profiles).toHaveLength(2);
    for (const [a, b] of view.section.contacts) {
      expect(a[2]).toBeCloseTo(t / 2 * mm, 6); expect(b[2]).toBeCloseTo(a[2], 6);
      expect(Math.hypot(...a.map((v, i) => v - b[i])) / mm).toBeCloseTo(2.5, 6);
    }
  }
});

test('changed dimensions, zero rabbet and inspection controls remain coherent', () => {
  const sheet = drawing({ Art_width: 32.1875, Art_height: 24.125, Reveal: .375, Clearance: .0625, Member_width: 3, Thickness: 1, Rabbet_depth: .375 });
  expect(dimensions(sheet.views)['Outside width']).toBeCloseTo(37.4375, 6);
  expect(dimensions(sheet.parts[0].views)['Rabbet width']).toBeCloseTo(.4375, 6);
  expect(dimensions(sheet.parts[1].views)['Lap depth']).toBeCloseTo(.5, 6);
  const omitted = drawing({ Rabbet_depth: 0 });
  for (const part of omitted.parts) {
    expect(dimensions(part.views)['Rabbet depth']).toBeUndefined();
    expect(dimensions(part.views)['Pocket cut run']).toBeUndefined();
    expect(dimensions(part.views)['Pocket end inset']).toBeUndefined();
    expect(part.views[0].guides).toEqual([]);
    expect(part.notes.join(' ')).toContain('Rabbet omitted');
  }
  for (const Part of ['left', 'top', 'all']) expect(drawing({ Part, Exploded: true })).toEqual(drawing());
  expect(() => drawing({ Rabbet_depth: .75 })).toThrow('Rabbet depth must be less');
});

test('cut list groups identical blanks, uses standard stock and the tote allowances', () => {
  const echo = output(), rows = groupCutList(parseCutList(echo)), prep = parseStockPreparation(echo);
  expect(rows.map(p => [p.name, p.quantity, p.thickness, p.width, p.length])).toEqual([
    ['Rail', 2, .75, 2.5, 34.875], ['Stile', 2, .75, 2.5, 25.8125],
  ]);
  expect(prep.millingMinLength).toBe(14); expect(prep.sawMinLength).toBe(10);
  const rough = rows.map(part => roughDimensions(part, standardThickness(part.thickness + .25), .5, 1, prep));
  expect(rough.map(p => [p.quantity, p.thickness, p.width, p.length])).toEqual([[2, 1, 3, 35.875], [2, 1, 3, 26.8125]]);
  const base = rough.reduce((sum, p) => sum + boardFeet(p), 0);
  expect(base).toBeCloseTo(2.6119791667, 8); expect(base * 1.2).toBeCloseTo(3.134375, 8);
  expect(groupCutList(parseCutList(output({ Part: 'left', Exploded: true })))).toEqual(rows);
  const square = groupCutList(parseCutList(output({ Art_height: 30.375 })));
  expect(square).toHaveLength(1); expect(square[0].quantity).toBe(4);
  const short = groupCutList(parseCutList(output({ Art_width: 5, Art_height: 6 })));
  for (const part of short) {
    const stock = roughDimensions(part, 1, .5, 1, prep);
    expect(stock.quantity).toBe(1); expect(stock.method).toBe('crosscut');
    expect(stock.length).toBeCloseTo(2 * (part.length + 1) + .125, 6);
  }
});

test('joint captions are validated while legacy tote sheets keep their labels', () => {
  const result = render(`$misc_drawing=true;\n${source}`);
  let definition;
  try { definition = JSON.parse(result.echo.split('\n').find(l => l.startsWith('ECHO: "DRAWING_V1",')).replace('ECHO: "DRAWING_V1", ', '')); }
  finally { result.free(); }
  expect(parseDrawingDefinition('ECHO: "DRAWING_V1", ' + JSON.stringify(definition)).joint.title).toBe('Half-lap corner detail');
  definition[2] = ['Bad captions'];
  expect(() => parseDrawingDefinition('ECHO: "DRAWING_V1", ' + JSON.stringify(definition))).toThrow('Invalid joint captions');
  definition.pop();
  expect(jointLabels(parseDrawingDefinition('ECHO: "DRAWING_V1", ' + JSON.stringify(definition))).title).toBe('Handle/riser joint detail');
});
