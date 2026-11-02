// Section view, as in Onshape: the model is cut by a plane, either one of the default planes
// through the model's origin or a plane through a face picked in the 3D view. The section's
// point (where its manipulator sits) moves along the reference normal by a depth, and the plane
// through it can tilt about the reference plane's two in-plane axes. Material on the normal's
// side is removed, so the cut is seen looking back along the normal; flipping removes the other
// side. Model coordinates, millimetres; tilts in degrees.
export type Vec3 = [number, number, number];
export type DefaultPlane = 'front' | 'top' | 'right';
// A reference plane: the points p with normal · p = offset. A face's keeps the point clicked.
export interface SectionReference { plane: DefaultPlane | 'face'; normal: Vec3; offset: number; anchor?: Vec3 }
export interface SectionState { reference: SectionReference; point: Vec3; tilt: [number, number]; flipped: boolean }
// The plane the scene cuts by: points with normal · p > constant are removed.
export interface SectionPlane { normal: Vec3; constant: number }

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const plus = (a: Vec3, b: Vec3, scale = 1): Vec3 => [a[0] + b[0] * scale, a[1] + b[1] * scale, a[2] + b[2] * scale];
const unit = (a: Vec3): Vec3 => { const length = Math.hypot(...a); return [a[0] / length, a[1] / length, a[2] / length]; };
const negate = (a: Vec3): Vec3 => [-a[0] || 0, -a[1] || 0, -a[2] || 0];
// Rotating a vector about a unit axis (Rodrigues), by degrees.
export function rotate(vector: Vec3, axis: Vec3, degrees: number): Vec3 {
  const angle = degrees * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle);
  return plus(plus(plus([0, 0, 0], vector, cos), cross(axis, vector), sin), axis, dot(axis, vector) * (1 - cos));
}

// Onshape's default planes: Front is XZ facing −Y, Top is XY facing +Z, Right is YZ facing +X.
export const defaultPlanes: Record<DefaultPlane, SectionReference> = {
  front: { plane: 'front', normal: [0, -1, 0], offset: 0 },
  top: { plane: 'top', normal: [0, 0, 1], offset: 0 },
  right: { plane: 'right', normal: [1, 0, 0], offset: 0 },
};
export const planeNames: Record<SectionReference['plane'], string> = { front: 'Front plane', top: 'Top plane', right: 'Right plane', face: 'Face' };

// The plane through a picked face. Mesh normals carry float error, so components within
// rounding of zero are dropped, keeping faces square to the axes exactly square.
export function facePlane(point: Vec3, normal: Vec3): SectionReference {
  const length = Math.hypot(...normal);
  const exact = unit(normal.map(n => Math.abs(n / length) < 1e-6 ? 0 : n / length) as Vec3);
  return { plane: 'face', normal: exact, offset: dot(exact, point), anchor: point };
}

// The reference plane's in-plane axes, which the section tilts about: the second is as near
// to up (+Z) as the plane allows, or +Y for a plane facing up or down; the first completes a
// right-handed set with the normal. Front tilts about X and Z, Top about X and Y, Right about Y and Z.
export function planeAxes({ normal }: SectionReference): [Vec3, Vec3] {
  const up: Vec3 = Math.abs(normal[2]) > 0.999999 ? [0, 1, 0] : [0, 0, 1];
  const second = unit(plus(up, normal, -dot(up, normal)));
  return [cross(second, normal).map(n => n || 0) as Vec3, second];
}
// An axis's name, if it lies along one.
export function axisName(axis: Vec3) {
  const index = axis.findIndex(n => Math.abs(Math.abs(n) - 1) < 1e-9);
  return index < 0 ? null : 'XYZ'[index];
}

// The depths that cut through the model's bounds: the reference plane moved from where it
// meets the bounds' nearest corner to their farthest.
export function depthRange(reference: SectionReference, min: Vec3, size: Vec3): [number, number] {
  const depths = [0, 1, 2, 3, 4, 5, 6, 7].map(corner => dot(reference.normal, [
    min[0] + (corner & 1 ? size[0] : 0), min[1] + (corner & 2 ? size[1] : 0), min[2] + (corner & 4 ? size[2] : 0),
  ]) - reference.offset);
  return [Math.min(...depths), Math.max(...depths)];
}

// A default plane opens through the middle of the model, its point at the model's centre; a
// face opens at the face, its point where it was clicked. Neither is tilted.
export function startSection(reference: SectionReference, min: Vec3, size: Vec3): SectionState {
  const point = reference.anchor ?? [min[0] + size[0] / 2, min[1] + size[1] / 2, min[2] + size[2] / 2];
  return { reference, point, tilt: [0, 0], flipped: false };
}

// The point's depth from the reference plane, along its normal; setting it moves the point
// that way, keeping the tilt.
export const sectionDepth = ({ reference, point }: SectionState) => dot(reference.normal, point) - reference.offset;
export const withDepth = (section: SectionState, depth: number): SectionState =>
  ({ ...section, point: plus(section.point, section.reference.normal, depth - sectionDepth(section)) });

// The section's frame: its point, the normal of the tilted plane (before flipping), and the
// axes its two tilts turn about. The first tilt turns the plane about the first in-plane axis,
// then the second turns it about the second; so the first tilt's axis turns with the second
// and stays in the plane, and the second's stays put.
export function sectionFrame({ reference, point, tilt }: SectionState) {
  const [first, second] = planeAxes(reference);
  const normal = rotate(rotate(reference.normal, first, tilt[0]), second, tilt[1]);
  return { point, normal, axes: [rotate(first, second, tilt[1]), second] as [Vec3, Vec3] };
}

export function sectionPlane(section: SectionState): SectionPlane {
  const { point, normal } = sectionFrame(section);
  const facing = section.flipped ? negate(normal) : normal;
  return { normal: facing, constant: dot(facing, point) };
}
