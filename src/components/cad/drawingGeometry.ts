import { dot, project, type Point, type DrawingView, type ProjectedView, type Segment } from './drawings';

export interface DrawingMesh {
  positions: Float32Array; normals: Float32Array; groups: { start: number; count: number }[];
}
interface Edge { a: Point; b: Point; normals: Point[] }
type Triangle = [Point, Point, Point];
const key = (p: Point) => p.map(n => n.toFixed(4)).join(',');
const cross2 = (a: Point, b: Point, c: Point) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const at = (values: Float32Array, offset: number): Point => [values[offset], values[offset + 1], values[offset + 2]];

function meshEdges(mesh: DrawingMesh): { edges: Edge[]; triangles: Triangle[] } {
  const edges: Edge[] = [], triangles: Triangle[] = [];
  // Extract per physical part, retaining real assembly seams. A unioned STL
  // would erase touching part boundaries; triangle diagonals are not edges.
  for (const group of mesh.groups) {
    const map = new Map<string, Edge>();
    for (let offset = group.start * 3; offset < (group.start + group.count) * 3; offset += 9) {
      const vertices: Triangle = [at(mesh.positions, offset), at(mesh.positions, offset + 3), at(mesh.positions, offset + 6)];
      triangles.push(vertices);
      const normal = at(mesh.normals, offset);
      for (let i = 0; i < 3; i++) {
        const a = vertices[i], b = vertices[(i + 1) % 3];
        const edgeKey = [key(a), key(b)].sort().join('|');
        const existing = map.get(edgeKey);
        if (existing) existing.normals.push(normal);
        else map.set(edgeKey, { a, b, normals: [normal] });
      }
    }
    for (const edge of map.values()) {
      if (edge.normals.length === 1 || edge.normals.some(normal => dot(normal, edge.normals[0]) < 0.99985)) edges.push(edge);
    }
  }
  return { edges, triangles };
}

// Clip an edge's t interval to a linear inequality f(t) >= limit.
function clip(range: [number, number], start: number, end: number, limit: number) {
  const delta = end - start;
  if (Math.abs(delta) < 1e-12) return start >= limit;
  const t = (limit - start) / delta;
  if (delta > 0) range[0] = Math.max(range[0], t);
  else range[1] = Math.min(range[1], t);
  return range[1] - range[0] > 1e-8;
}

// Orthographic occlusion is linear along an edge: clip to the projected
// triangle, then to the portion behind its plane. No pixel/depth-buffer reads.
function hiddenInterval(a: Point, b: Point, triangle: Triangle): [number, number] | null {
  const [p, q, r] = triangle, area = cross2(p, q, r);
  if (Math.abs(area) < 1e-9) return null;
  if (Math.max(a[0], b[0]) < Math.min(p[0], q[0], r[0]) || Math.min(a[0], b[0]) > Math.max(p[0], q[0], r[0]) ||
      Math.max(a[1], b[1]) < Math.min(p[1], q[1], r[1]) || Math.min(a[1], b[1]) > Math.max(p[1], q[1], r[1])) return null;
  const weights = (v: Point): Point => [cross2(q, r, v) / area, cross2(r, p, v) / area, cross2(p, q, v) / area];
  const wa = weights(a), wb = weights(b), range: [number, number] = [0, 1];
  for (let i = 0; i < 3; i++) if (!clip(range, wa[i], wb[i], -1e-9)) return null;
  const depths: Point = [p[2], q[2], r[2]];
  // Coincident surfaces and an edge's own faces must not hide that edge.
  if (!clip(range, dot(wa, depths) - a[2], dot(wb, depths) - b[2], 0.0001)) return null;
  return range;
}

export function projectDrawing(mesh: DrawingMesh, view: DrawingView): ProjectedView {
  const { edges, triangles } = meshEdges(mesh);
  const projected = triangles.map(triangle => triangle.map(p => project(p, view.axes)) as Triangle);
  const bounds: ProjectedView['bounds'] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const triangle of projected) for (const p of triangle) {
    bounds[0] = Math.min(bounds[0], p[0]); bounds[1] = Math.min(bounds[1], p[1]);
    bounds[2] = Math.max(bounds[2], p[0]); bounds[3] = Math.max(bounds[3], p[1]);
  }
  if (!bounds.every(Number.isFinite)) throw new Error('Drawing geometry is empty.');
  const unique = new Map<string, Segment>();
  for (const edge of edges) {
    const a = project(edge.a, view.axes), b = project(edge.b, view.axes);
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.0001) continue;
    const hidden = projected.map(triangle => hiddenInterval(a, b, triangle))
      .filter((range): range is [number, number] => range !== null).sort((x, y) => x[0] - y[0]);
    const add = (start: number, end: number) => {
      if (end - start < 1e-7) return;
      const xy = (t: number): [number, number] => [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
      const p = xy(start), q = xy(end);
      const segmentKey = [p.map(n => n.toFixed(4)).join(','), q.map(n => n.toFixed(4)).join(',')].sort().join('|');
      unique.set(segmentKey, [...p, ...q]);
    };
    let cursor = 0;
    for (const [start, end] of hidden) { add(cursor, start); cursor = Math.max(cursor, end); }
    add(cursor, 1);
  }
  return { ...view, bounds, lines: [...unique.values()] };
}
