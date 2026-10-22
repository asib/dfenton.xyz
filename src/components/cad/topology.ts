// Whole edges and vertices from a part's crease segments (EdgesGeometry pairs).
// A mesh splits one model edge into several segments wherever the triangulation
// of a neighbouring face places a vertex. Segments are joined through points
// where exactly two meet and continue straight on, or along a tessellated curve
// (equal-length segments turning gently, as OpenSCAD circles do). Corners and
// T-junctions end an edge, as in a B-rep model; edge endpoints are vertices.
export interface TopoEdge { points: number[]; closed: boolean; length: number }
export interface Topology { edges: TopoEdge[]; vertices: number[][] }

const collinear = Math.cos(0.5 * Math.PI / 180);
const curved = Math.cos(20 * Math.PI / 180);

export function edgeTopology(segments: ArrayLike<number>, tolerance = 1e-4): Topology {
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
