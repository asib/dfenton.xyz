import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import occtimportjs from 'occt-import-js';
import { coloredGeometry, geometryPieces } from '../src/components/cad/displayMesh';
import { bodyParts, solidColor } from '../src/components/cad/fileParts';
import { binaryStl, faceNormals } from '../src/components/cad/stl';
import { Color } from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
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

test('a STEP file’s bodies are its parts, copies of one body a part with a piece each', () => {
  const { mesh } = read('cax-if/as1-oc-214.stp');
  const found = bodyParts(mesh);
  expect(found.from).toBe('body');
  // 18 bodies: 8 nuts, 6 bolts, 2 L-brackets, a rod and a plate.
  expect(found.parts.map(part => [part.label, part.color])).toEqual([
    ['nut', '#ff0000'], ['rod', '#ff8000'], ['bolt', '#0000ff'], ['l-bracket', '#00ff00'], ['plate', '#ccff00'],
  ]);
  expect(found.parts.every(part => part.darkColor === part.color)).toBe(true);
  // Every body is a piece, in file order, naming its part; the pieces' colors only differ.
  const geometry = coloredGeometry(found.display, found.parts);
  const pieces = geometryPieces(geometry);
  expect(pieces.length).toBe(18);
  const count = (id) => pieces.filter(piece => piece.part === id).length;
  expect(found.parts.map(part => count(part.id))).toEqual([8, 1, 6, 2, 1]);
  expect(new Set(pieces.map(piece => piece.key)).size).toBe(18);
  expect(found.display.groups.map(group => [group.start, group.count])).toEqual(mesh.groups.map(group => [group.start, group.count]));
  // Every piece shows in its part's color.
  const colors = geometry.getAttribute('colorLight');
  for (const [index, group] of found.display.groups.entries()) {
    const part = found.parts.find(candidate => candidate.id === group.part);
    // Three keeps colors linear; its hex is sRGB.
    const shown = `#${new Color(colors.getX(group.start), colors.getY(group.start), colors.getZ(group.start)).getHexString()}`;
    expect([index, shown]).toEqual([index, part.color]);
  }
});

test('bodies alike in name but not color are separate parts, numbered; nameless bodies are never copies', () => {
  // as1_pe_203's bodies are all "SOLID", so they take their products' names, and each
  // L-bracket assembly holds a bracket, nuts and bolts of different colors.
  const { mesh } = read('cax-if/as1_pe_203.stp');
  const found = bodyParts(mesh);
  expect(found.parts.map(part => part.label)).toEqual(['PLATE', 'L_BRACKET_ASSEMBLY_ASM · 1', 'L_BRACKET_ASSEMBLY_ASM · 2', 'L_BRACKET_ASSEMBLY_ASM · 3', 'ROD_ASM · 1', 'ROD_ASM · 2']);
  const triangle = [0, 0, 0, 1, 0, 0, 0, 1, 0];
  const positions = new Float32Array([0, 2, 4].flatMap(offset => triangle.map(n => n + offset)));
  const body = (index, name, color) => ({ start: index * 3, count: 3, name, ...(color ? { color } : {}) });
  const nameless = bodyParts({ positions, normals: new Float32Array(positions.length), groups: [body(0, ''), body(1, ''), body(2, 'Lid', '#336699')] });
  expect(nameless.parts.map(part => [part.label, part.color, part.darkColor])).toEqual([
    ['Part 1', solidColor(0).color, solidColor(0).darkColor], ['Part 2', solidColor(1).color, solidColor(1).darkColor], ['Lid', '#336699', '#336699'],
  ]);
});

test('one body, or copies of only one, have no parts', () => {
  const cube = read('cube-units/cube-mm.step').mesh;
  expect(cube.groups.map(group => group.name)).toEqual(['Cube']);
  expect(bodyParts(cube)).toBeUndefined();
  const twice = { ...cube, groups: [cube.groups[0], { ...cube.groups[0] }] };
  expect(bodyParts(twice)).toBeUndefined();
});

test('the STL to download has the triangles in the file’s units, each facet with its own normal', () => {
  const { mesh } = read('rounded-cube/rounded-cube.step');
  const normals = faceNormals(mesh.positions);
  const stl = new STLLoader().parse(binaryStl(mesh.positions, normals));
  expect(stl.getAttribute('position').array).toEqual(mesh.positions);
  const n = stl.getAttribute('normal').array;
  // On the fillet, the file's normals are smooth, varying across a facet; the STL's aren't.
  let smooth = 0;
  for (let offset = 0; offset < n.length; offset += 9) {
    const [ax, ay, az] = [0, 1, 2].map(axis => mesh.positions[offset + 3 + axis] - mesh.positions[offset + axis]);
    expect(Math.hypot(n[offset], n[offset + 1], n[offset + 2])).toBeCloseTo(1, 5);
    expect(n[offset] * ax + n[offset + 1] * ay + n[offset + 2] * az).toBeCloseTo(0, 4);
    if (Math.abs(mesh.normals[offset] - mesh.normals[offset + 3]) + Math.abs(mesh.normals[offset + 2] - mesh.normals[offset + 5]) > 1e-3) smooth++;
  }
  expect(smooth).toBeGreaterThan(0);
});

test('an assembly that keeps its parts in other files has no geometry, and names them', () => {
  const name = 'cax-if/s1-tu-203/s1-tu-203.stp';
  const { mesh } = read(name);
  expect(mesh.positions.length).toBe(0);
  expect(referencedFiles(file(name).toString('latin1'))).toEqual(['headback.stp', 'headfront.stp', 'tailmiddlepart.stp', 'tailturbine.stp', 'footback.stp', 'footfront.stp', 'mainbodyback.stp', 'mainbodyfront.stp']);
  expect(referencedFiles(file('cax-if/as1-oc-214.stp').toString('latin1'))).toEqual([]);
});
