import { expect, test } from 'bun:test';
import { BufferAttribute, BufferGeometry, EdgesGeometry } from 'three';
import { render } from 'openrscad-engine/node';
import { edgeTopology } from '../src/components/cad/topology';

// Crease segments of an actual compiled OpenSCAD solid, as the viewer sees them.
function creases(scad) {
  const result = render(scad);
  try {
    expect(result.ok).toBe(true);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(result.positions, 3));
    return new EdgesGeometry(geometry, 25).getAttribute('position').array;
  } finally { result.free(); }
}
const lengths = topology => topology.edges.map(edge => Number(edge.length.toFixed(3))).sort((a, b) => a - b);

test('a box has twelve whole edges and eight vertices', () => {
  const topology = edgeTopology(creases('cube([40, 20, 10]);'));
  expect(topology.vertices).toHaveLength(8);
  expect(lengths(topology)).toEqual([10, 10, 10, 10, 20, 20, 20, 20, 40, 40, 40, 40]);
  expect(topology.edges.every(edge => !edge.closed)).toBe(true);
});

test('collinear fragments merge, while corners and T-junctions end edges', () => {
  // Synthetic: a 10-long edge in three collinear pieces, then a corner, then a T.
  const segments = [0, 0, 0, 3, 0, 0, 3, 0, 0, 7, 0, 0, 7, 0, 0, 10, 0, 0, // straight run
    10, 0, 0, 10, 5, 0, // corner
    5, 0, 0, 5, -4, 0]; // T-junction stem at x=5 is not on a vertex of the run, so the run still merges
  const topology = edgeTopology(segments);
  expect(lengths(topology)).toEqual([4, 5, 10]);
  const t = edgeTopology([0, 0, 0, 5, 0, 0, 5, 0, 0, 10, 0, 0, 5, 0, 0, 5, 4, 0]);
  // With the stem sharing the x=5 point, three edges meet there and the run splits.
  expect(lengths(t)).toEqual([4, 5, 5]);
  expect(t.vertices).toHaveLength(4);
});

test('a dado through a block splits only the edges it actually meets', () => {
  // 30 x 10 x 10 block with a 4-wide, 2-deep slot across the top.
  const topology = edgeTopology(creases('difference() { cube([30, 10, 10]); translate([13, -1, 8]) cube([4, 12, 3]); }'));
  // Top long edges become two 13-long pieces each; the slot adds its own edges.
  const all = lengths(topology);
  expect(all.filter(n => n === 13)).toHaveLength(4);
  expect(all.filter(n => n === 30)).toHaveLength(2);
  expect(all.filter(n => n === 2)).toHaveLength(4);
  // Bottom 80, uprights 40, split top runs 4 x 13, top ends 2 x 10, slot walls 4 x 2,
  // slot rims and floor edges across 4 x 10, floor edges along 2 x 4.
  expect(topology.edges.reduce((sum, edge) => sum + edge.length, 0)).toBeCloseTo(80 + 40 + 52 + 20 + 8 + 40 + 8, 3);
});

test('tessellated circles become single closed edges, while kinks stay corners', () => {
  const topology = edgeTopology(creases('cylinder(r = 10, h = 5, $fn = 64);'));
  expect(topology.edges).toHaveLength(2);
  expect(topology.edges.every(edge => edge.closed)).toBe(true);
  expect(topology.vertices).toHaveLength(0);
  // 64-gon perimeter, within the facet approximation of 2 pi r.
  for (const edge of topology.edges) expect(edge.length).toBeCloseTo(64 * 2 * 10 * Math.sin(Math.PI / 64), 3);
  // A hexagonal prism keeps its six corners per face.
  expect(edgeTopology(creases('cylinder(r = 10, h = 5, $fn = 6);')).edges).toHaveLength(18);
  // An 8 degree kink between unequal segments is a corner, not a curve.
  const kink = edgeTopology([0, 0, 0, 10, 0, 0, 10, 0, 0, 10 + 3 * Math.cos(0.14), 3 * Math.sin(0.14), 0]);
  expect(kink.edges).toHaveLength(2);
});
