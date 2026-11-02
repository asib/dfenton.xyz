// Section view, as in Onshape: the model is cut by a plane, either one of the default planes
// through the model's origin or a plane through a face picked in the 3D view, moved along its
// normal by a depth. Material on the normal's side is removed, so the cut is seen looking back
// along the normal; flipping removes the other side. Model coordinates, millimetres.
export type Vec3 = [number, number, number];
export type DefaultPlane = 'front' | 'top' | 'right';
// A reference plane: the points p with normal · p = offset.
export interface SectionReference { plane: DefaultPlane | 'face'; normal: Vec3; offset: number }
export interface SectionState { reference: SectionReference; depth: number; flipped: boolean }
// The plane the scene cuts by: points with normal · p > constant are removed.
export interface SectionPlane { normal: Vec3; constant: number }

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

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
  const unit = normal.map(n => Math.abs(n / length) < 1e-6 ? 0 : n / length) as Vec3;
  const rescale = Math.hypot(...unit);
  const exact = unit.map(n => n / rescale) as Vec3;
  return { plane: 'face', normal: exact, offset: dot(exact, point) };
}

// The depths that cut through the model's bounds: the reference plane moved from where it
// meets the bounds' nearest corner to their farthest.
export function depthRange(reference: SectionReference, min: Vec3, size: Vec3): [number, number] {
  const depths = [0, 1, 2, 3, 4, 5, 6, 7].map(corner => dot(reference.normal, [
    min[0] + (corner & 1 ? size[0] : 0), min[1] + (corner & 2 ? size[1] : 0), min[2] + (corner & 4 ? size[2] : 0),
  ]) - reference.offset);
  return [Math.min(...depths), Math.max(...depths)];
}

// A default plane opens through the middle of the model; a face opens at the face.
export function startSection(reference: SectionReference, min: Vec3, size: Vec3): SectionState {
  const [low, high] = depthRange(reference, min, size);
  return { reference, depth: reference.plane === 'face' ? 0 : (low + high) / 2, flipped: false };
}

export function sectionPlane({ reference, depth, flipped }: SectionState): SectionPlane {
  const constant = reference.offset + depth;
  return flipped
    ? { normal: reference.normal.map(n => n === 0 ? 0 : -n) as Vec3, constant: -constant }
    : { normal: reference.normal, constant };
}
