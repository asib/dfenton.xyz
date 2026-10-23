import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { parameters, render } from 'openrscad-engine/node';
import { compileDrawings } from '../src/components/cad/drawingCompiler';
import { dimensionValue } from '../src/components/cad/drawings';
import { configuredSource, defaults, parseParameters } from '../src/components/cad/parameters';

const source = readFileSync(new URL('../public/misc/drawer-cabinet/drawer-cabinet.scad', import.meta.url), 'utf8');
const schema = parseParameters(parameters(source), source), initial = defaults(schema);
const drawing = (changes = {}) => compileDrawings(configuredSource(source, schema, { ...initial, ...changes }), render);
const mm = 25.4;
// Label -> inches; repeated labels keep every value.
const dimensions = views => {
  const out = {};
  for (const view of views) for (const d of view.dimensions) (out[d.label] ??= []).push(dimensionValue(d, view, 'inches'));
  return out;
};
const close = (values, expected) => {
  expect(values).toHaveLength(expected.length);
  values.forEach((value, i) => expect(value).toBeCloseTo(expected[i], 6));
};
const part = (sheet, id) => sheet.parts.find(p => p.id === id);
// Point containment in the actual section contours (inches), including holes.
function solid(view, u, v) {
  const x = u * mm, y = v * mm;
  return (view.profiles ?? []).some(loops => {
    let inside = false;
    for (const loop of loops) for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
      const a = loop[i], b = loop[j];
      if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return inside;
  });
}

test('assembly, runner detail and grouped part sheets cover the default cabinet', () => {
  const sheet = drawing();
  expect(sheet.views.map(v => v.id)).toEqual(['front', 'top', 'right', 'joint-longitudinal', 'joint-transverse']);
  expect(sheet.joint).toEqual({ title: 'Runner detail', bearingLabel: 'Drawer underside bears on the runner top.',
    description: 'Enlarged sections through the left runner between drawers 1 and 2. Hatching distinguishes parts; the right side is mirrored.' });
  expect(sheet.parts.map(p => [p.id, p.quantity])).toEqual([['case-side', 2], ['case-panels', 2], ['back-panel', 1], ['runner', 6],
    ['front-1', 1], ['front-2', 1], ['front-3', 2], ['side-1', 2], ['side-2', 2], ['side-3', 4],
    ['back-1', 1], ['back-2', 1], ['back-3', 2], ['bottom-1', 4]]);
  expect(part(sheet, 'front-3').title).toBe('Drawer front · drawers 3, 4');
  expect(part(sheet, 'bottom-1').title).toBe('Drawer bottom · drawers 1–4');
  const assembly = dimensions(sheet.views.slice(0, 3));
  for (const [label, value] of Object.entries({ 'Overall width': [24], 'Opening width': [22.5], 'Overall height': [30],
    'Opening height': [28.5], 'Overall depth': [18, 18], D1: [5], D2: [6], D3: [8.625], D4: [8.625] })) close(assembly[label], value);
  const joint = dimensions(sheet.views.slice(3));
  for (const [label, value] of Object.entries({ 'Runner start': [0.75], 'Case side': [0.75], Reveal: [0.0625],
    'Runner projection': [0.75], 'Runner height': [0.75], Clearance: [0.03125] })) close(joint[label], value);
});

test('part sheets carry finished sizes, rabbets and runner positions from the model', () => {
  const sheet = drawing({ Runner_style: 'dado' });
  const side = dimensions(part(sheet, 'case-side').views);
  for (const [label, value] of Object.entries({ Height: [30], Depth: [18], 'Back rabbet': [0.25, 0.25], Rabbet: [0.75, 0.75],
    'Runner start': [0.75], 'To R3': [9.4375], 'R3–R2': [8.6875], 'R2–R1': [6.0625], Thickness: [0.75, 0.75],
    'Back rabbet width': [0.375], 'End rabbet depth': [0.375], 'Rabbet height': [0.75], 'Dado depth': [0.25], 'Dado width': [0.75] }))
    close(side[label], value);
  expect(part(sheet, 'case-side').notes).toContain('Runner tops above the bottom edge: R1 24 3/16″, R2 18 1/8″, R3 9 7/16″. Rk carries drawer k.');
  close(dimensions(part(sheet, 'case-panels').views).Width, [23.25]);
  close(dimensions(part(sheet, 'back-panel').views).Width, [23.25]);
  close(dimensions(part(sheet, 'runner').views).Width, [1]);
  // Front/back-overlap boxes: fronts sit on the 1/4 bottom; sides fit between front and back.
  for (const [id, sizes] of Object.entries({ 'front-1': { Width: [22.375], Height: [4.75], Thickness: [0.75] },
    'side-2': { Length: [16.5], Height: [5.03125], Thickness: [0.5] }, 'back-3': { Width: [22.375], Height: [7.65625] },
    'bottom-1': { Width: [22.375], Depth: [17.75], Thickness: [0.25] } }))
    for (const [label, value] of Object.entries(sizes)) close(dimensions(part(sheet, id).views)[label], value);
  // Section D-D: the dado and end rabbet are removed from the actual side.
  const end = part(sheet, 'case-side').views[2];
  expect(solid(end, 0.1, 24.1875 - 0.375)).toBe(true);
  expect(solid(end, 0.7, 24.1875 - 0.375)).toBe(false);
  expect(solid(end, 0.7, 29.6)).toBe(false);
  expect(solid(end, 0.2, 29.6)).toBe(true);
});

test('runner sections show bearing and clearance in the actual geometry', () => {
  // Supported: drawer 1's bottom rests on the strip; drawer 2's box stops 1/32 below it.
  let [longitudinal, transverse] = drawing().views.slice(3);
  expect(solid(transverse, 1.2, 24.1875 + 0.1)).toBe(true);
  expect(solid(transverse, 1.2, 24.1875 - 0.1)).toBe(true);
  expect(solid(transverse, 1.0, 23.4375 - 0.015)).toBe(false);
  expect(solid(transverse, 1.0, 23.4375 - 0.05)).toBe(true);
  expect(solid(longitudinal, 0.5, 24.0)).toBe(true);
  expect(transverse.section.contacts[0].map(p => p[2] / mm)).toEqual([24.1875, 24.1875]);
  // Side-hung: the groove ceiling rests on the strip; clearance stays below it and at the groove floor.
  [longitudinal, transverse] = drawing({ Runner_style: 'side_hung' }).views.slice(3);
  const ceiling = transverse.section.contacts[0][0][2] / mm;
  expect(solid(transverse, 0.9, ceiling - 0.05)).toBe(true);
  expect(solid(transverse, 0.9, ceiling - 0.75 - 0.015)).toBe(false);
  expect(solid(transverse, 1.03125 + 0.015, ceiling - 0.3)).toBe(false);
  expect(longitudinal.section.contacts[0][0][2] / mm).toBeCloseTo(ceiling, 6);
  // A lone supported drawer runs on the case bottom.
  const lone = drawing({ Drawers: [[0, 0]] });
  expect(lone.joint.title).toBe('Drawer support detail');
  expect(lone.parts.map(p => p.id)).toEqual(['case-side', 'case-panels', 'back-panel', 'front-1', 'side-1', 'back-1', 'bottom-1']);
});

test.each([
  [{ Height: 48, Drawers: [[0, 0], [6, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]] }, { front: [7, 1], side: [2, 2, 12], back: [1, 1, 6], bottom: [8], runner: 14 }],
  [{ Height: 48, Drawers: [[0, 0], [6, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], Runner_style: 'side_hung' }, { front: [7, 1], side: [14, 2], back: [7, 1], bottom: [8], runner: 16 }],
  [{ Drawers: [[5, 0], [6, 12], [0, 0], [0, 0]], Back_clearance: 1 }, { front: [1, 1, 2], side: [2, 2, 4], back: [1, 1, 2], bottom: [3, 1], runner: 6 }],
])('groups identical drawer members and totals every piece for %j', (changes, expected) => {
  const sheet = drawing(changes);
  if (changes.Drawers?.length === 8) expect(sheet.parts.find(p => p.id === 'side-3')?.title ?? sheet.parts.find(p => p.id === 'side-1').title).toMatch(/drawers 3–8|drawers 1, 3–8/);
  for (const kind of ['front', 'side', 'back', 'bottom'])
    expect(sheet.parts.filter(p => new RegExp(`^${kind}-\\d`).test(p.id)).map(p => p.quantity)).toEqual(expected[kind]);
  expect(part(sheet, 'runner').quantity).toBe(expected.runner);
});

test.each(['strip', 'dado', 'side_hung'].flatMap(Runner_style =>
  ['sides_overlap', 'front_back_overlap', 'sides_overlap_groove', 'front_back_overlap_groove'].map(Box_construction => ({ Runner_style, Box_construction }))))(
  'drawings compile and ignore inspection controls for %j', changes => {
    const sheet = drawing(changes);
    expect(sheet.parts.every(p => p.views.every(v => v.lines.length > 0))).toBe(true);
    const inspected = drawing({ ...changes, Part: 'drawer', Inspect_drawer: 2, Explosion_percent: 150 });
    expect(JSON.stringify(inspected)).toBe(JSON.stringify(sheet));
  });

test('grooved boxes dimension both grooves on the faces where they show', () => {
  const sheet = drawing({ Runner_style: 'side_hung', Box_construction: 'sides_overlap_groove' });
  const side = part(sheet, 'side-2');
  expect(side.views.map(v => v.id)).toEqual(['part-side-2-outside', 'part-side-2-inside', 'part-side-2-section']);
  close(dimensions([side.views[1]])['Groove stop'], [0.5]);
  close(dimensions([side.views[0]])['Runner groove stop'], [0.75]);
  // Drawer 2's underside is 18 1/8 up; its runner groove is centred 3 above that, the bottom groove 1/4 up.
  const section = side.views[2], z0 = 18.125, y = z0 + 3;
  expect(solid(section, 0.8125 + 0.1, y)).toBe(false);
  expect(solid(section, 0.8125 + 0.4, y)).toBe(true);
  expect(solid(section, 0.8125 + 0.4, z0 + 0.375)).toBe(false);
  expect(solid(section, 0.8125 + 0.1, z0 + 0.375)).toBe(true);
  expect(side.notes[0]).toBe('Make mirrored left/right pairs; the left side is shown.');
  const front = dimensions(part(sheet, 'front-2').views);
  for (const [label, value] of Object.entries({ Height: [6], 'Groove offset': [0.25], Groove: [0.25], 'Groove depth': [0.25] }))
    close(front[label], value);
});

test('a full-width front stops its bottom groove; sides between the front and back carry it through', () => {
  const sheet = drawing({ Box_construction: 'front_back_overlap_groove' });
  const front = part(sheet, 'front-2');
  expect(front.views.map(v => v.id)).toEqual(['part-front-2-face', 'part-front-2-edge', 'part-front-2-groove']);
  // The groove ends under each side's inside face: 1/2 side less the 1/4 groove depth.
  close(dimensions([front.views[2]])['Groove stop'], [0.25]);
  close(dimensions([front.views[2]])['Groove depth'], [0.25]);
  expect(front.notes).toContain('Stopped bottom groove 1/4″ wide x 1/4″ deep, 1/4″ up, ending 1/4″ short of each end.');
  const side = part(sheet, 'side-2');
  expect(dimensions(side.views)['Groove stop']).toBeUndefined();
  expect(side.notes[0]).toBe('Left and right sides are identical.');
  expect(side.notes).toContain('Bottom groove 1/4″ wide x 1/4″ deep, 1/4″ up, through the length.');
  expect(part(sheet, 'back-2').notes).toContain('Sits on the bottom, which slides in beneath it; nail the bottom up into it.');
});

test('invalid configurations produce no drawings', () => {
  expect(() => drawing({ Drawers: [[5, 0], [6, 0], [20, 0], [0, 0]] })).toThrow('drawer set to 0');
});
