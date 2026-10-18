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
