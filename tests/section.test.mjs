import { expect, test } from 'bun:test';
import { defaultPlanes, depthRange, facePlane, sectionPlane, startSection } from '../src/components/cad/section';

// A 40 × 30 × 20 mm box from the origin, as OpenSCAD's cube([40, 30, 20]) places it.
const min = [0, 0, 0], size = [40, 30, 20];
// Whether a model point is removed by a section plane.
const removed = (plane, point) => plane.normal.reduce((sum, n, i) => sum + n * point[i], 0) > plane.constant;

test('default planes are Onshape’s, opening through the middle and removing the normal’s side', () => {
  expect(depthRange(defaultPlanes.right, min, size)).toEqual([0, 40]);
  // The front plane faces −Y, so depths run negative into a model behind it.
  expect(depthRange(defaultPlanes.front, min, size).map(n => n + 0)).toEqual([-30, 0]);
  const front = startSection(defaultPlanes.front, min, size);
  expect(front.depth).toBe(-15);
  const plane = sectionPlane(front);
  // The front half (toward −Y, nearer the viewer from the front) is removed.
  expect(removed(plane, [20, 5, 10])).toBe(true);
  expect(removed(plane, [20, 25, 10])).toBe(false);
  const top = sectionPlane(startSection(defaultPlanes.top, min, size));
  expect(removed(top, [20, 15, 15])).toBe(true);
  expect(removed(top, [20, 15, 5])).toBe(false);
});

test('flipping keeps the plane and removes the other side', () => {
  const right = { ...startSection(defaultPlanes.right, min, size), depth: 10 };
  expect(removed(sectionPlane(right), [15, 0, 0])).toBe(true);
  const flipped = sectionPlane({ ...right, flipped: true });
  expect(removed(flipped, [15, 0, 0])).toBe(false);
  expect(removed(flipped, [5, 0, 0])).toBe(true);
});

test('a face’s plane passes through it, square faces stay square, and depth moves along its normal', () => {
  // The box's top face, with float error in its normal.
  const top = facePlane([12, 7, 20], [1e-9, -2e-9, 0.9999999]);
  expect(top).toEqual({ plane: 'face', normal: [0, 0, 1], offset: 20 });
  const section = startSection(top, min, size);
  expect(section.depth).toBe(0);
  expect(depthRange(top, min, size)).toEqual([-20, 0]);
  // Moving 5 mm down into the box removes its top 5 mm.
  const plane = sectionPlane({ ...section, depth: -5 });
  expect(removed(plane, [12, 7, 17])).toBe(true);
  expect(removed(plane, [12, 7, 13])).toBe(false);
  // A slanted face keeps its slant.
  const slant = facePlane([0, 0, 0], [1, 0, 1]);
  expect(slant.normal[0]).toBeCloseTo(Math.SQRT1_2);
  expect(slant.normal[2]).toBeCloseTo(Math.SQRT1_2);
  expect(depthRange(slant, min, size)[1]).toBeCloseTo(60 * Math.SQRT1_2);
});
