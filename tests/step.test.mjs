import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import occtimportjs from 'occt-import-js';
import { coloredGeometry, geometryPieces } from '../src/components/cad/displayMesh';
import { bodyParts, solidColor } from '../src/components/cad/fileParts';
import { readOptions, referencedFiles, stepMesh, stepUnits } from '../src/components/cad/stepMesh';

// OpenCascade's own test files, shipped with occt-import-js: CAx-IF's assembly of a plate, two
// L-bracket assemblies and a rod, and a 1 m cube saved in each of three units.
const testfiles = new URL('../node_modules/occt-import-js/test/testfiles/', import.meta.url);
const file = (name) => readFileSync(new URL(name, testfiles));
const occt = await occtimportjs();
// A STEP file as the viewer's worker reads it.
const read = (name) => {
  const content = file(name), units = stepUnits(content.toString('latin1'));
  const result = occt.ReadStepFile(content, readOptions(units));
  expect(result.success).toBe(true);
  return { mesh: stepMesh(result), units };
};
const bounds = (positions) => [0, 1, 2].map(axis => {
  let min = Infinity, max = -Infinity;
  for (let i = axis; i < positions.length; i += 3) { min = Math.min(min, positions[i]); max = Math.max(max, positions[i]); }
  return [min, max];
});

test('a STEP file reads in the units its geometry uses: inches and feet as inches, the rest as millimetres', () => {
  const cube = (units) => read(`cube-units/cube-${units}.step`);
  const inch = cube('in'), mm = cube('mm'), metre = cube('m');
  expect([inch.units, mm.units, metre.units]).toEqual(['inches', 'mm', 'mm']);
  // The same 1 m cube, 39.37 inches or 1000 mm across.
  expect(bounds(inch.mesh.positions)[0][1]).toBeCloseTo(1000 / 25.4, 3);
  expect(bounds(mm.mesh.positions)[0][1]).toBeCloseTo(1000, 3);
  expect(bounds(metre.mesh.positions)[0][1]).toBeCloseTo(1000, 3);
  // A file may define other units, as this one defines the inch it uses from the millimetre.
  expect(stepUnits(file('cax-if/as1_pe_203.stp').toString('latin1'))).toBe('inches');
  expect(stepUnits('#1 = ( LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.MILLI.,.METRE.) );')).toBe('mm');
});

test('each body becomes a group of whole triangles, named by itself or the product holding it, in sRGB', () => {
  const { mesh } = read('cax-if/as1-oc-214.stp');
  expect(mesh.positions.length).toBe(mesh.normals.length);
  expect(mesh.positions.length % 9).toBe(0);
  expect(mesh.groups.length).toBe(18);
  expect(mesh.groups.reduce((sum, group) => sum + group.count, 0) * 3).toBe(mesh.positions.length);
  expect(mesh.groups.every((group, i) => group.count % 3 === 0 && group.start === (i ? mesh.groups[i - 1].start + mesh.groups[i - 1].count : 0))).toBe(true);
  expect([...new Set(mesh.groups.map(group => group.name))].sort()).toEqual(['bolt', 'l-bracket', 'nut', 'plate', 'rod']);
  // OpenCascade's linear (1, 0.214, 0) is the file's sRGB orange.
  expect(mesh.groups.find(group => group.name === 'rod').color).toBe('#ff8000');
  expect(mesh.groups.find(group => group.name === 'nut').color).toBe('#ff0000');
  // These bodies are all called "SOLID", so they take their products' names.
  const plate = read('cax-if/as1_pe_203.stp').mesh;
  expect([...new Set(plate.groups.map(group => group.name))]).toEqual(['PLATE', 'L_BRACKET_ASSEMBLY_ASM', 'ROD_ASM']);
});

test('a STEP file’s bodies are its parts, numbered where names repeat, each in a color of its own', () => {
  const { mesh } = read('cax-if/as1-oc-214.stp');
  const found = bodyParts(mesh);
  expect(found.from).toBe('body');
  expect(found.parts.length).toBe(18);
  expect(found.parts.slice(0, 4).map(part => part.label)).toEqual(['nut · 1', 'nut · 2', 'rod', 'bolt · 1']);
  // The nuts keep the file's red, shifted a step of 1/255 or two so the legend tells them apart.
  const nuts = found.parts.filter(part => part.label.startsWith('nut'));
  expect(nuts[0].color).toBe('#ff0000');
  expect(new Set(found.parts.map(part => part.color)).size).toBe(18);
  for (const nut of nuts) {
    const [r, g, b] = nut.color.slice(1).match(/../g).map(n => parseInt(n, 16));
    expect(255 - r + g + b).toBeLessThanOrEqual(4);
    expect(nut.darkColor).toBe(nut.color);
  }
  // Each part is one piece of the display geometry.
  const geometry = coloredGeometry(found.display, found.parts);
  expect(geometryPieces(geometry).map(piece => piece.part)).toEqual(found.parts.map(part => part.id));
});

test('bodies without names are numbered, without colors are colored as solids, and one body has no parts', () => {
  const triangle = [0, 0, 0, 1, 0, 0, 0, 1, 0];
  const positions = new Float32Array([...triangle, ...triangle.map(n => n + 2)]);
  const mesh = { positions, normals: new Float32Array(positions.length), groups: [{ start: 0, count: 3, name: '' }, { start: 3, count: 3, name: 'Lid', color: '#336699' }] };
  const found = bodyParts(mesh);
  expect(found.parts.map(part => [part.label, part.color, part.darkColor])).toEqual([
    ['Part 1', solidColor(0).color, solidColor(0).darkColor], ['Lid', '#336699', '#336699'],
  ]);
  expect(bodyParts({ ...mesh, groups: mesh.groups.slice(0, 1) })).toBeUndefined();
  const cube = read('cube-units/cube-mm.step').mesh;
  expect(cube.groups.map(group => group.name)).toEqual(['Cube']);
  expect(bodyParts(cube)).toBeUndefined();
});

test('an assembly that keeps its parts in other files has no geometry, and names them', () => {
  const name = 'cax-if/s1-tu-203/s1-tu-203.stp';
  const { mesh } = read(name);
  expect(mesh.positions.length).toBe(0);
  expect(referencedFiles(file(name).toString('latin1'))).toEqual(['headback.stp', 'headfront.stp', 'tailmiddlepart.stp', 'tailturbine.stp', 'footback.stp', 'footfront.stp', 'mainbodyback.stp', 'mainbodyfront.stp']);
  expect(referencedFiles(file('cax-if/as1-oc-214.stp').toString('latin1'))).toEqual([]);
});
