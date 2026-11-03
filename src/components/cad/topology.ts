// Whole edges and vertices from a part's crease segments (EdgesGeometry pairs).
// A mesh splits one model edge into several segments wherever the triangulation
// of a neighbouring face places a vertex. Segments are joined through points
// where exactly two meet and continue straight on, or along a tessellated curve
// (equal-length segments turning gently, as OpenSCAD circles do). Corners and
// T-junctions end an edge, as in a B-rep model; edge endpoints are vertices. A B-rep model's
// own edges (`whole`) are already whole, so they join through every point where two meet.
export interface TopoEdge { points: number[]; closed: boolean; length: number }
export interface Topology { edges: TopoEdge[]; vertices: number[][] }

const collinear = Math.cos(0.5 * Math.PI / 180);
const curved = Math.cos(20 * Math.PI / 180);

export function edgeTopology(segments: ArrayLike<number>, tolerance = 1e-4, whole = false): Topology {
  // Weld endpoints to shared points.
  const points: number[][] = [];
  const index = new Map<string, number>();
  const pointOf = (offset: number) => {
    const p = [segments[offset], segments[offset + 1], segments[offset + 2]];
    const key = p.map(n => Math.round(n / tolerance)).join(',');
    let id = index.get(key);
    if (id === undefined) { id = points.length; points.push(p); index.set(key, id); }
    return id;
  };
  const pairs: [number, number][] = [];
  for (let offset = 0; offset + 5 < segments.length; offset += 6) {
    const a = pointOf(offset), b = pointOf(offset + 3);
    if (a !== b) pairs.push([a, b]);
  }
  const incident = points.map((): number[] => []);
  pairs.forEach(([a, b], s) => { incident[a].push(s); incident[b].push(s); });
  const other = (s: number, p: number) => pairs[s][0] === p ? pairs[s][1] : pairs[s][0];
  const vector = (from: number, to: number) => points[to].map((n, i) => n - points[from][i]);
  const norm = (v: number[]) => Math.hypot(v[0], v[1], v[2]);
  // A point an edge passes through rather than ends at.
  const through = incident.map((segmentsAt, p) => {
    if (segmentsAt.length !== 2) return false;
    if (whole) return true;
    const u = vector(other(segmentsAt[0], p), p), v = vector(p, other(segmentsAt[1], p));
    const lu = norm(u), lv = norm(v), cos = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (lu * lv);
    return cos >= collinear || (cos >= curved && Math.abs(lu - lv) <= 0.01 * Math.max(lu, lv));
  });
  const used = new Array<boolean>(pairs.length).fill(false);
  const edges: TopoEdge[] = [];
  const walk = (start: number, first: number) => {
    const chain = [start];
    let at = start, segment = first;
    for (;;) {
      used[segment] = true;
      at = other(segment, at);
      chain.push(at);
      if (at === start || !through[at]) break;
      const next = incident[at].find(s => !used[s]);
      if (next === undefined) break;
      segment = next;
    }
    const closed = chain[chain.length - 1] === start && chain.length > 2;
    let length = 0;
    for (let i = 1; i < chain.length; i++) length += norm(vector(chain[i - 1], chain[i]));
    edges.push({ points: chain.flatMap(p => points[p]), closed, length });
  };
  // Open edges start at their ends; what remains are closed loops.
  incident.forEach((segmentsAt, p) => {
    if (through[p]) return;
    for (const s of segmentsAt) if (!used[s]) walk(p, s);
  });
  pairs.forEach(([a], s) => { if (!used[s]) walk(a, s); });
  const vertices = points.filter((_, p) => incident[p].length > 0 && !through[p]);
  return { edges, vertices };
}

// A B-rep model's edges, from its triangles: the sides of triangles that lie in different faces,
// or that only one triangle has, as at a hole in the surface. Sides within a face, including
// a periodic face's seam, are only tessellation. `faces` gives each triangle's face; corners at
// the same position are the same point. Returns line segment pairs, as EdgesGeometry does.
export function faceEdges(positions: ArrayLike<number>, faces: ArrayLike<number>): Float32Array {
  const keys = Array.from({ length: faces.length * 3 }, (_, corner) =>
    `${String(positions[corner * 3])},${String(positions[corner * 3 + 1])},${String(positions[corner * 3 + 2])}`);
  const sides = new Map<string, { face: number; count: number; between: boolean; from: number; to: number }>();
  for (let triangle = 0; triangle < faces.length; triangle++) {
    for (let i = 0; i < 3; i++) {
      const from = triangle * 3 + i, to = triangle * 3 + (i + 1) % 3;
      if (keys[from] === keys[to]) continue;
      const key = keys[from] < keys[to] ? `${keys[from]}|${keys[to]}` : `${keys[to]}|${keys[from]}`;
      const side = sides.get(key);
      if (!side) sides.set(key, { face: faces[triangle], count: 1, between: false, from, to });
      else { side.count++; if (side.face !== faces[triangle]) side.between = true; }
    }
  }
  const segments: number[] = [];
  for (const { between, count, from, to } of sides.values()) {
    if (!between && count > 1) continue;
    for (const corner of [from, to]) segments.push(positions[corner * 3], positions[corner * 3 + 1], positions[corner * 3 + 2]);
  }
  return new Float32Array(segments);
}

// A model's faces, as regions of its triangles: a STEP file's own faces (`faces`, renumbered
// from 0), or else regions bounded by the creases the viewer draws as edges, so a face is
// what its drawn edges enclose. Triangles join across a side exactly two share, where they
// meet at under `crease` degrees; corners at the same position (to 1e-4) are the same point.
// Returns each triangle's face and the number of faces.
export function faceRegions(positions: ArrayLike<number>, crease = 25, faces?: ArrayLike<number>): { faceOf: Int32Array; count: number } {
  const triangles = Math.floor(positions.length / 9), faceOf = new Int32Array(triangles);
  if (faces) {
    const numbers = new Map<number, number>();
    for (let triangle = 0; triangle < triangles; triangle++) {
      let face = numbers.get(faces[triangle]);
      if (face === undefined) { face = numbers.size; numbers.set(faces[triangle], face); }
      faceOf[triangle] = face;
    }
    return { faceOf, count: numbers.size };
  }
  const key = (corner: number) => `${String(Math.round(positions[corner * 3] * 1e4))},${String(Math.round(positions[corner * 3 + 1] * 1e4))},${String(Math.round(positions[corner * 3 + 2] * 1e4))}`;
  const normals = new Float64Array(triangles * 3);
  for (let triangle = 0; triangle < triangles; triangle++) {
    const o = triangle * 9;
    const ux = positions[o + 3] - positions[o], uy = positions[o + 4] - positions[o + 1], uz = positions[o + 5] - positions[o + 2];
    const vx = positions[o + 6] - positions[o], vy = positions[o + 7] - positions[o + 1], vz = positions[o + 8] - positions[o + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, length = Math.hypot(nx, ny, nz) || 1;
    normals.set([nx / length, ny / length, nz / length], triangle * 3);
  }
  const sides = new Map<string, number[]>();
  for (let triangle = 0; triangle < triangles; triangle++) {
    const corners = [0, 1, 2].map(i => key(triangle * 3 + i));
    for (let i = 0; i < 3; i++) {
      const a = corners[i], b = corners[(i + 1) % 3];
      if (a === b) continue;
      const side = a < b ? `${a}|${b}` : `${b}|${a}`;
      const list = sides.get(side);
      if (list) list.push(triangle);
      else sides.set(side, [triangle]);
    }
  }
  const parent = Int32Array.from({ length: triangles }, (_, triangle) => triangle);
  const find = (triangle: number) => {
    while (parent[triangle] !== triangle) { parent[triangle] = parent[parent[triangle]]; triangle = parent[triangle]; }
    return triangle;
  };
  const smooth = Math.cos(crease * Math.PI / 180);
  for (const list of sides.values()) {
    if (list.length !== 2) continue;
    const [a, b] = list;
    if (normals[a * 3] * normals[b * 3] + normals[a * 3 + 1] * normals[b * 3 + 1] + normals[a * 3 + 2] * normals[b * 3 + 2] > smooth) parent[find(a)] = find(b);
  }
  const numbers = new Map<number, number>();
  for (let triangle = 0; triangle < triangles; triangle++) {
    const root = find(triangle);
    let face = numbers.get(root);
    if (face === undefined) { face = numbers.size; numbers.set(root, face); }
    faceOf[triangle] = face;
  }
  return { faceOf, count: numbers.size };
}
