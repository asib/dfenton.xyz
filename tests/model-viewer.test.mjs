import { expect, test } from 'bun:test';
import { parameters, render } from 'openrscad-engine/node';
import { configuredSource, defaults, editableParameters } from '../src/components/cad/parameters';
import { coloredGeometry, displayMesh, geometryPieces } from '../src/components/cad/displayMesh';
import { fileParts, maxParts, solidColor } from '../src/components/cad/fileParts';

// A visitor's file, as the model viewer opens it: OpenSCAD literals JSON lacks, a vector
// the panel can't edit, a dropdown, a hidden group and a reassigned name.
const source = `/* [Size] */
// Box width
width = .5; // [0.1:0.1:5]
height = 5.;
big = 1e1;
size = [10, 20, 30];
shape = "round"; // [round, square]
on = true;
/* [Hidden] */
secret = 4;
cube([width, height, big]);
`;

test('visitors’ files keep the parameters the panel can edit and name the rest', () => {
  const { parameters: editable, skipped } = editableParameters(parameters(source), source);
  expect(editable.map(parameter => parameter.name)).toEqual(['width', 'height', 'big', 'shape', 'on']);
  expect(skipped).toEqual(['size']);
  expect(defaults(editable)).toEqual({ width: 0.5, height: 5, big: 10, shape: 'round', on: true });
  expect(editable[0]).toMatchObject({ group: 'Size', description: 'Box width', control: { min: 0.1, max: 5, step: 0.1 } });
});

test('OpenSCAD number literals configure, leaving the rest of the file alone', () => {
  const { parameters: editable } = editableParameters(parameters(source), source);
  expect(configuredSource(source, editable, defaults(editable))).toBe(source);
  const text = configuredSource(source, editable, { ...defaults(editable), width: 2.5, height: 7, shape: 'square' });
  expect(text).toContain('width = 2.5; // [0.1:0.1:5]');
  expect(text).toContain('height = 7;');
  expect(text).toContain('size = [10, 20, 30];');
  const result = render(text);
  try { expect(result.ok).toBe(true); } finally { result.free(); }
});

test('a file without Customizer parameters has nothing to edit', () => {
  expect(editableParameters(parameters('cube(10);'), 'cube(10);')).toEqual({ parameters: [], skipped: [] });
});

test('a reassigned name is skipped, since OpenSCAD uses its last value', () => {
  const twice = 'width = 4;\ndepth = 2;\nwidth = 6;\ncube([width, depth, 1]);\n';
  const { parameters: editable, skipped } = editableParameters(parameters(twice), twice);
  expect(editable.map(parameter => parameter.name)).toEqual(['depth']);
  expect(skipped).toEqual(['width']);
});

// A design as the viewer gets it: the colored display mesh, if any, and the STL's triangles.
function compiled(source) {
  const result = render(source);
  try {
    return {
      display: displayMesh(result.preview_positions, result.preview_normals, result.groups),
      mesh: { positions: result.positions.slice(), normals: result.normals.slice() },
    };
  } finally { result.free(); }
}
const triangles = (positions) => [...Array(positions.length / 9).keys()].map(i => [...positions.subarray(i * 9, i * 9 + 9)].join(',')).sort();

test('a colored design’s parts are its colors, numbered in file order, each its own piece', () => {
  const { display, mesh } = compiled(`color("red") cube(5); translate([10, 0, 0]) color("blue") cube(5);
    translate([20, 0, 0]) color("red") sphere(3); translate([30, 0, 0]) cube(4);`);
  const found = fileParts(display, mesh);
  expect(found.from).toBe('color');
  expect(found.parts.map(part => [part.id, part.label, part.color, part.darkColor])).toEqual([
    ['color-ff0000', 'Part 1', '#ff0000', '#ff0000'], ['color-0000ff', 'Part 2', '#0000ff', '#0000ff'], ['color-f5a523', 'Part 3', '#f5a523', '#f5a523'],
  ]);
  // The same triangles, regrouped one group per part.
  expect(triangles(found.display.positions)).toEqual(triangles(display.positions));
  expect(found.display.groups.map(group => group.count)).toEqual(display.groups.map(group => group.count));
  const geometry = coloredGeometry(found.display, found.parts);
  expect(geometryPieces(geometry).map(piece => piece.part)).toEqual(found.parts.map(part => part.id));
});

test('otherwise each separate solid of the STL is a part, in a color of its own', () => {
  // Overlapping cubes union into one solid; the third cube stands apart. One color throughout.
  const { display, mesh } = compiled('color("green") { cube(5); translate([2, 2, 2]) cube(5); translate([20, 0, 0]) cube(5); }');
  const found = fileParts(display, mesh);
  expect(found.from).toBe('solid');
  expect(found.parts.map(part => [part.id, part.label])).toEqual([['solid-1', 'Part 1'], ['solid-2', 'Part 2']]);
  expect(found.parts.map(({ color, darkColor }) => ({ color, darkColor }))).toEqual([solidColor(0), solidColor(1)]);
  expect(triangles(found.display.positions)).toEqual(triangles(mesh.positions));
  const geometry = coloredGeometry(found.display, found.parts);
  expect(geometryPieces(geometry).map(piece => piece.part)).toEqual(['solid-1', 'solid-2']);
  // Each part's triangles are one cube's: the second part lies entirely beyond x = 20.
  const [, second] = found.display.groups;
  const xs = [...found.display.positions.subarray(second.start * 3, (second.start + second.count) * 3)].filter((_, i) => i % 3 === 0);
  expect(Math.min(...xs)).toBe(20);
});

test('an uncolored STL with separate solids has parts; one solid, or too many, has none', () => {
  const two = compiled('cube(5); translate([10, 0, 0]) cube(5);');
  expect(two.display).toBeUndefined();
  expect(fileParts(undefined, two.mesh).parts.map(part => part.label)).toEqual(['Part 1', 'Part 2']);
  expect(fileParts(undefined, compiled('cube(5); translate([2, 2, 2]) cube(5);').mesh)).toBeUndefined();
  expect(fileParts(undefined, compiled(`for (i = [0:${maxParts}]) translate([i * 10, 0, 0]) cube(5);`).mesh)).toBeUndefined();
  expect(fileParts(undefined, compiled(`for (i = [1:${maxParts}]) translate([i * 10, 0, 0]) cube(5);`).mesh).parts).toHaveLength(maxParts);
});

test('solid colors differ from one another, and are lighter on dark pages', () => {
  const colors = Array.from({ length: maxParts }, (_, i) => solidColor(i));
  expect(new Set(colors.map(({ color }) => color)).size).toBe(maxParts);
  const lightness = (hex) => Math.max(...hex.slice(1).match(/../g).map(n => parseInt(n, 16)));
  for (const { color, darkColor } of colors) expect(lightness(darkColor)).toBeGreaterThan(lightness(color));
});
