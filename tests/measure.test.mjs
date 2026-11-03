import { expect, test } from 'bun:test';
import { circle, measure, straight } from '../src/components/cad/measure';

const edge = (points, closed = false) => {
  let length = 0;
  for (let i = 1; i < points.length; i++) length += Math.hypot(...points[i].map((n, j) => n - points[i - 1][j]));
  return { kind: 'edge', points, closed, length };
};
const vertex = position => ({ kind: 'vertex', position });
const rows = m => Object.fromEntries(m.rows.map(r => [r.label, Number(r.value.toFixed(6))]));

test('a single edge measures its length, and a circle its diameter', () => {
  const run = edge([[0, 0, 0], [3, 0, 0], [10, 0, 0]]);
  expect(straight(run)).toBe(true);
  expect(rows(measure([run]))).toEqual({ Length: 10 });
  expect(measure([run]).anchor).toEqual([5, 0, 0]);
  const points = Array.from({ length: 65 }, (_, i) => [5 * Math.cos(i * Math.PI / 32), 5 * Math.sin(i * Math.PI / 32), 2]);
  const ring = edge(points, true);
  expect(circle(ring).radius).toBeCloseTo(5, 9);
  expect(rows(measure([ring]))).toEqual({ Diameter: 10, Circumference: Number(ring.length.toFixed(6)) });
  expect(straight(edge([[0, 0, 0], [5, 0, 0], [5, 5, 0]]))).toBe(false);
});

test('two vertices give the distance and its axis components', () => {
  const m = measure([vertex([0, 0, 0]), vertex([3, -4, 12])]);
  expect(rows(m)).toEqual({ Distance: 13, ΔX: 3, ΔY: 4, ΔZ: 12 });
  expect(m.line).toEqual([[0, 0, 0], [3, -4, 12]]);
  expect(m.anchor).toEqual([1.5, -2, 6]);
});

test('a vertex and an edge give the minimum and perpendicular distances', () => {
  const run = edge([[0, 0, 0], [10, 0, 0]]);
  // Beside the segment, both are the same perpendicular distance.
  expect(rows(measure([vertex([4, 3, 0]), run]))).toEqual({ Distance: 3 });
  // Past its end, the minimum distance is to the endpoint.
  const beyond = measure([run, vertex([13, 4, 0])]);
  expect(rows(beyond)).toEqual({ Distance: 5, 'To the edge line': 4 });
  expect(beyond.line).toEqual([[10, 0, 0], [13, 4, 0]]);
});

test('two straight edges give the angle, or parallel spacing', () => {
  const a = edge([[0, 0, 0], [10, 0, 0]]);
  expect(rows(measure([a, edge([[0, 5, 0], [10, 5, 0]])]))).toEqual({ Distance: 5 });
  expect(rows(measure([a, edge([[20, 5, 0], [30, 5, 0]])]))).toEqual({ Distance: Number(Math.hypot(10, 5).toFixed(6)), 'Parallel spacing': 5 });
  const skew = measure([a, edge([[5, -5, 3], [5, 5, 3]])]);
  expect(rows(skew)).toEqual({ Distance: 3, Angle: 90 });
  expect(skew.line).toEqual([[5, 0, 0], [5, 0, 3]]);
  expect(rows(measure([a, edge([[0, 0, 0], [10, 10, 0]])]))).toEqual({ Distance: 0, Angle: 45 });
  expect(measure([a, edge([[0, 0, 0], [10, 10, 0]])]).line).toBeUndefined();
});

test('several edges total their lengths; other mixes have no measurement', () => {
  const edges = [edge([[0, 0, 0], [1, 0, 0]]), edge([[0, 0, 0], [0, 2, 0]]), edge([[0, 0, 0], [0, 0, 3]])];
  expect(rows(measure(edges))).toEqual({ 'Total length': 6 });
  expect(measure([...edges, vertex([0, 0, 0])])).toBeNull();
  expect(measure([vertex([0, 0, 0])])).toBeNull();
  expect(measure([])).toBeNull();
});

// A flat rectangle as the viewer measures a face: two triangles, its area, centre and normal.
const square = (corner, u, v) => {
  const at = (s, t) => corner.map((n, i) => n + u[i] * s + v[i] * t);
  const [a, b, c, d] = [at(0, 0), at(1, 0), at(1, 1), at(0, 1)];
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], area = Math.hypot(...n);
  return { kind: 'face', triangles: [[a, b, c], [a, c, d]], area, center: at(0.5, 0.5), normal: n.map(x => x / area) };
};
const floor = square([0, 0, 0], [10, 0, 0], [0, 10, 0]);

test('a face measures its area, and several their total', () => {
  expect(rows(measure([floor]))).toEqual({ Area: 100 });
  expect(measure([floor]).anchor).toEqual([5, 5, 0]);
  expect(rows(measure([floor, square([0, 0, 5], [10, 0, 0], [0, 5, 0]), square([0, 0, 9], [2, 0, 0], [0, 5, 0])]))).toEqual({ 'Total area': 160 });
});

test('flat faces measure their distance, and their spacing if parallel or else their angle', () => {
  // A board's two sides: the distance is the spacing.
  expect(rows(measure([floor, square([0, 0, 5], [10, 0, 0], [0, 10, 0])]))).toEqual({ Distance: 5 });
  // Offset sideways, the spacing between the planes differs from the distance.
  const offset = measure([floor, square([20, 0, 5], [10, 0, 0], [0, 10, 0])]);
  expect(rows(offset)).toEqual({ Distance: Number(Math.hypot(10, 5).toFixed(6)), 'Parallel spacing': 5 });
  // Nearest along the facing edges: any matching pair of points on them.
  const [near, far] = offset.line;
  expect([near[0], near[2], far[0], far[2]]).toEqual([10, 0, 20, 5]);
  expect(near[1]).toBeCloseTo(far[1], 9);
  // A wall standing on the floor meets it at 90°.
  const wall = measure([floor, square([0, 3, 0], [10, 0, 0], [0, 0, 10])]);
  expect(rows(wall)).toEqual({ Distance: 0, Angle: 90 });
  expect(wall.line).toBeUndefined();
});

test('a flat face and a vertex measure the distance and, off to the side, to the face’s plane', () => {
  expect(rows(measure([floor, vertex([5, 5, 7])]))).toEqual({ Distance: 7 });
  expect(rows(measure([vertex([15, 5, 7]), floor]))).toEqual({ Distance: Number(Math.hypot(5, 7).toFixed(6)), 'To the face plane': 7 });
});

test('a flat face and a straight edge measure their spacing if parallel, or else their angle', () => {
  expect(rows(measure([floor, edge([[20, 5, 3], [30, 5, 3]])]))).toEqual({ Distance: Number(Math.hypot(10, 3).toFixed(6)), 'Parallel spacing': 3 });
  // An edge rising at 45° from above the floor.
  expect(rows(measure([floor, edge([[5, 5, 2], [8, 5, 5]])]))).toEqual({ Distance: 2, Angle: 45 });
  // An edge through the floor touches it.
  expect(rows(measure([floor, edge([[5, 5, -2], [5, 5, 2]])]))).toEqual({ Distance: 0, Angle: 90 });
});
