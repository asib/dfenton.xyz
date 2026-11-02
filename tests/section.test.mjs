import { expect, test } from 'bun:test';
import { axisName, defaultPlanes, depthRange, facePlane, planeAxes, sectionDepth, sectionFrame, sectionPlane, startSection, withDepth } from '../src/components/cad/section';

// A 40 × 30 × 20 mm box from the origin, as OpenSCAD's cube([40, 30, 20]) places it.
const min = [0, 0, 0], size = [40, 30, 20];
// Whether a model point is removed by a section plane.
const removed = (plane, point) => plane.normal.reduce((sum, n, i) => sum + n * point[i], 0) > plane.constant;
const close = (actual, expected) => actual.forEach((n, i) => { expect(n).toBeCloseTo(expected[i], 9); });

test('default planes are Onshape’s, opening through the middle and removing the normal’s side', () => {
  expect(depthRange(defaultPlanes.right, min, size)).toEqual([0, 40]);
  // The front plane faces −Y, so depths run negative into a model behind it.
  expect(depthRange(defaultPlanes.front, min, size).map(n => n + 0)).toEqual([-30, 0]);
  const front = startSection(defaultPlanes.front, min, size);
  expect(front.point).toEqual([20, 15, 10]);
  expect(sectionDepth(front)).toBe(-15);
  const plane = sectionPlane(front);
  // The front half (toward −Y, nearer the viewer from the front) is removed.
  expect(removed(plane, [20, 5, 10])).toBe(true);
  expect(removed(plane, [20, 25, 10])).toBe(false);
  const top = sectionPlane(startSection(defaultPlanes.top, min, size));
  expect(removed(top, [20, 15, 15])).toBe(true);
  expect(removed(top, [20, 15, 5])).toBe(false);
});

test('depth moves the point along the reference normal, and flipping removes the other side', () => {
  const right = withDepth(startSection(defaultPlanes.right, min, size), 10);
  expect(right.point).toEqual([10, 15, 10]);
  expect(sectionDepth(right)).toBe(10);
  expect(removed(sectionPlane(right), [15, 0, 0])).toBe(true);
  const flipped = sectionPlane({ ...right, flipped: true });
  expect(removed(flipped, [15, 0, 0])).toBe(false);
  expect(removed(flipped, [5, 0, 0])).toBe(true);
});

test('a face’s plane passes through it, square faces stay square, and depth moves along its normal', () => {
  // The box's top face, with float error in its normal.
  const top = facePlane([12, 7, 20], [1e-9, -2e-9, 0.9999999]);
  expect(top).toEqual({ plane: 'face', normal: [0, 0, 1], offset: 20, anchor: [12, 7, 20] });
  const section = startSection(top, min, size);
  expect(section.point).toEqual([12, 7, 20]);
  expect(sectionDepth(section)).toBe(0);
  expect(depthRange(top, min, size)).toEqual([-20, 0]);
  // Moving 5 mm down into the box removes its top 5 mm.
  const plane = sectionPlane(withDepth(section, -5));
  expect(removed(plane, [12, 7, 17])).toBe(true);
  expect(removed(plane, [12, 7, 13])).toBe(false);
  // A slanted face keeps its slant.
  const slant = facePlane([0, 0, 0], [1, 0, 1]);
  expect(slant.normal[0]).toBeCloseTo(Math.SQRT1_2);
  expect(slant.normal[2]).toBeCloseTo(Math.SQRT1_2);
  expect(depthRange(slant, min, size)[1]).toBeCloseTo(60 * Math.SQRT1_2);
});

test('each plane tilts about two in-plane axes, the second as near to up as it can be', () => {
  expect(planeAxes(defaultPlanes.front).map(axis => axisName(axis))).toEqual(['X', 'Z']);
  expect(planeAxes(defaultPlanes.top).map(axis => axisName(axis))).toEqual(['X', 'Y']);
  expect(planeAxes(defaultPlanes.right).map(axis => axisName(axis))).toEqual(['Y', 'Z']);
  // A slanted face's axes lie in it, at right angles; the second leans up, and neither is an axis.
  const slant = facePlane([0, 0, 0], [1, 0, 1]);
  const [first, second] = planeAxes(slant);
  const dot = (a, b) => a.reduce((sum, n, i) => sum + n * b[i], 0);
  for (const value of [dot(first, slant.normal), dot(second, slant.normal), dot(first, second)]) expect(value).toBeCloseTo(0, 12);
  expect(second[2]).toBeGreaterThan(0);
  expect([axisName(first), axisName(second)]).toEqual(['Y', null]);
});

test('tilting turns the plane about its point, keeping that point on it', () => {
  // The top plane through the middle, tilted 45° about X: its normal leans from +Z toward −Y.
  const section = { ...startSection(defaultPlanes.top, min, size), tilt: [45, 0] };
  const frame = sectionFrame(section);
  close(frame.normal, [0, -Math.SQRT1_2, Math.SQRT1_2]);
  const plane = sectionPlane(section);
  expect(plane.normal.reduce((sum, n, i) => sum + n * section.point[i], 0)).toBeCloseTo(plane.constant, 9);
  // Above the middle toward −Y is removed; above it toward +Y, behind the slope, is kept.
  expect(removed(plane, [20, 5, 12])).toBe(true);
  expect(removed(plane, [20, 25, 12])).toBe(false);
  // The second tilt turns about Y, and the first tilt's axis turns with it, staying in the plane.
  const both = sectionFrame({ ...section, tilt: [30, 60] });
  const dot = (a, b) => a.reduce((sum, n, i) => sum + n * b[i], 0);
  expect(dot(both.axes[0], both.normal)).toBeCloseTo(0, 12);
  close(both.axes[1], [0, 1, 0]);
  // Depth still moves the point along the reference normal, keeping the tilt.
  const deeper = withDepth({ ...section, tilt: [30, 60] }, 15);
  expect(sectionDepth(deeper)).toBeCloseTo(15, 12);
  close(sectionFrame(deeper).normal, both.normal);
});
