import { expect, test } from 'bun:test';
import { parameters, render } from 'openrscad-engine/node';
import { configuredSource, defaults, editableParameters } from '../src/components/cad/parameters';

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
