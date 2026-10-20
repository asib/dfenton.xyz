import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { render, parameters } from 'openrscad-engine/node';
import { displayMesh, coloredGeometry, parseDisplayMesh } from '../src/components/cad/displayMesh';
import { configuredSource, defaults, parseParameters } from '../src/components/cad/parameters';
const source = readFileSync(new URL('../public/misc/tool-tote/tool-tote.scad', import.meta.url), 'utf8');
const palette = JSON.parse(readFileSync(new URL('../public/misc/tool-tote/meta.json', import.meta.url), 'utf8')).customizer.parts;
const schema = parseParameters(parameters(source));

test('saved colored initial model matches freshly compiled default geometry and all ten piece colors', () => {
  const metadata = JSON.parse(readFileSync(new URL('../public/misc/tool-tote/meta.json', import.meta.url), 'utf8'));
  const saved = parseDisplayMesh(JSON.parse(readFileSync(new URL(`../public/misc/tool-tote/${metadata.displayModel}`, import.meta.url), 'utf8')));
  const result = render(source);
  try {
    expect(saved.positions).toEqual(result.preview_positions);
    // JSON serializes -0 as 0. Bun 1.1.26 compares typed-array sign bits;
    // canonicalize only zero while retaining exact equality for every normal.
    expect(saved.normals).toEqual(result.preview_normals.map(value => value === 0 ? 0 : value));
    expect(saved.groups).toEqual(JSON.parse(result.groups));
    expect(saved.groups).toHaveLength(10);
  } finally { result.free(); }
});

test('saved display rejects missing, empty and invalid geometry instead of falling back to blue', () => {
  for (const data of [null, {}, {version:2}, {version:1,positions:[],normals:[],groups:[]},
    {version:1,positions:['1'],normals:[0],groups:[]},
    {version:1,positions:[Infinity],normals:[0],groups:[]}]) {
    expect(() => parseDisplayMesh(data)).toThrow();
  }
});

test.each([['assembly',10], ['exploded',10], ['handle',2], ['bottom',2], ['joint_detail',3], ['handle_laminate_2',1]])('preserves separate piece colors in %s', (Part, count) => {
  const result = render(configuredSource(source, schema, {...defaults(schema),Part}));
  try {
    expect(result.ok).toBe(true);
    const display = displayMesh(result.preview_positions, result.preview_normals, result.groups);
    expect(display.groups).toHaveLength(count);
    expect(new Set(display.groups.map(g => JSON.stringify(g.color))).size).toBe(count);
    const geometry = coloredGeometry(display, palette);
    const light = geometry.getAttribute('colorLight'), dark = geometry.getAttribute('colorDark');
    expect(light.count).toBe(display.positions.length / 3);
    // Every source color must resolve to its distinct dark-theme token.
    for (const group of display.groups) expect(dark.getX(group.start)).not.toBe(light.getX(group.start));
    geometry.computeBoundingBox();
    for (let axis = 0; axis < 3; axis++) {
      const values = result.positions.filter((_, i) => i % 3 === axis);
      expect(geometry.boundingBox.min.getComponent(axis)).toBeCloseTo(Math.min(...values), 3);
      expect(geometry.boundingBox.max.getComponent(axis)).toBeCloseTo(Math.max(...values), 3);
    }
    geometry.dispose();
  } finally { result.free(); }
});

test('rejects incomplete or non-solid preview ranges instead of coloring the wrong triangles', () => {
  const positions = new Float32Array(9), normals = new Float32Array(9);
  expect(displayMesh(new Float32Array(),new Float32Array(),'[]')).toBeUndefined();
  for (const groups of [[],[{start:0,count:6,color:[1,0,0,1],mode:'solid'}],[{start:0,count:3,color:[1,0,0,1],mode:'background'}]]) {
    expect(() => displayMesh(positions,normals,JSON.stringify(groups))).toThrow();
  }
});
