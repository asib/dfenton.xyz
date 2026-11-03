// Encode the exact rendered triangle soup. View-only centering/clipping never
// touches these bytes, so the downloaded solid keeps its original coordinates.
export function binaryStl(positions: Float32Array, normals: Float32Array): ArrayBuffer {
  if (!positions.length || positions.length % 9 !== 0 || positions.length !== normals.length ||
      !positions.every(Number.isFinite) || !normals.every(Number.isFinite)) {
    throw new Error('The compiler returned invalid or empty geometry.');
  }
  const count = positions.length / 9;
  const buffer = new ArrayBuffer(84 + count * 50);
  const view = new DataView(buffer);
  view.setUint32(80, count, true);
  for (let triangle = 0; triangle < count; triangle++) {
    const offset = 84 + triangle * 50;
    for (let axis = 0; axis < 3; axis++) view.setFloat32(offset + axis * 4, normals[triangle * 9 + axis], true);
    for (let coordinate = 0; coordinate < 9; coordinate++) view.setFloat32(offset + 12 + coordinate * 4, positions[triangle * 9 + coordinate], true);
  }
  return buffer;
}

// Each triangle's own normal, at its three corners, for a mesh whose normals are smoothed
// across curved faces: an STL facet's normal is the facet's.
export function faceNormals(positions: Float32Array): Float32Array {
  const normals = new Float32Array(positions.length);
  for (let offset = 0; offset < positions.length; offset += 9) {
    const ux = positions[offset + 3] - positions[offset], uy = positions[offset + 4] - positions[offset + 1], uz = positions[offset + 5] - positions[offset + 2];
    const vx = positions[offset + 6] - positions[offset], vy = positions[offset + 7] - positions[offset + 1], vz = positions[offset + 8] - positions[offset + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, length = Math.hypot(nx, ny, nz) || 1;
    for (let corner = 0; corner < 3; corner++) normals.set([nx / length, ny / length, nz / length], offset + corner * 3);
  }
  return normals;
}
