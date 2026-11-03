// Onshape-style measurements of selected faces, edges and vertices, in model
// millimetres. Edges are polylines; straight edges are their two endpoints. Faces are
// triangles, with their area and centre, and their normal when they're flat.
export type Point = number[];
export type Measurable =
  | { kind: 'face'; triangles: Point[][]; area: number; center: Point; normal?: Point }
  | { kind: 'edge'; points: Point[]; closed: boolean; length: number }
  | { kind: 'vertex'; position: Point };
type Face = Extract<Measurable, { kind: 'face' }>;
export interface MeasureRow { label: string; value: number; unit: 'length' | 'angle' | 'area' }
// The dimension line runs between the measured points; the label sits at the anchor.
export interface Measurement { rows: MeasureRow[]; line?: [Point, Point]; anchor: Point }

const sub = (a: Point, b: Point) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Point, b: Point) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Point, s: number) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Point, b: Point) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: Point) => Math.sqrt(dot(a, a));
const mid = (a: Point, b: Point) => scale(add(a, b), 0.5);
const clamp = (n: number) => Math.min(1, Math.max(0, n));

// An open polyline whose points all lie on the line through its ends.
export function straight(edge: Extract<Measurable, { kind: 'edge' }>) {
  if (edge.closed || edge.points.length < 2) return false;
  const a = edge.points[0], d = sub(edge.points[edge.points.length - 1], a), length = norm(d);
  return length > 0 && edge.points.every(p => {
    const v = sub(p, a), t = dot(v, d) / (length * length);
    return norm(sub(v, scale(d, t))) <= 1e-4 * length + 1e-6;
  });
}

// A closed edge whose points are equidistant from their centroid, as OpenSCAD circles are.
export function circle(edge: Extract<Measurable, { kind: 'edge' }>) {
  if (!edge.closed || edge.points.length < 8) return null;
  const points = edge.points.slice(0, -1);
  const center = scale(points.reduce(add, [0, 0, 0]), 1 / points.length);
  const radii = points.map(p => norm(sub(p, center)));
  const radius = radii.reduce((s, r) => s + r, 0) / radii.length;
  return Math.max(...radii) - Math.min(...radii) <= 1e-3 * radius ? { center, radius } : null;
}

// Closest points between segments [p1, q1] and [p2, q2] (Ericson, Real-Time Collision Detection).
function segmentPair(p1: Point, q1: Point, p2: Point, q2: Point): [Point, Point] {
  const d1 = sub(q1, p1), d2 = sub(q2, p2), r = sub(p1, p2);
  const a = dot(d1, d1), e = dot(d2, d2), f = dot(d2, r);
  let s = 0, t = 0;
  if (a <= 1e-12 && e <= 1e-12) return [p1, p2];
  if (a <= 1e-12) t = clamp(f / e);
  else {
    const c = dot(d1, r);
    if (e <= 1e-12) s = clamp(-c / a);
    else {
      const b = dot(d1, d2), denominator = a * e - b * b;
      s = denominator > 1e-12 ? clamp((b * f - c * e) / denominator) : 0;
      t = (b * s + f) / e;
      if (t < 0) { t = 0; s = clamp(-c / a); } else if (t > 1) { t = 1; s = clamp((b - c) / a); }
    }
  }
  return [add(p1, scale(d1, s)), add(p2, scale(d2, t))];
}
const cross = (a: Point, b: Point) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// The point of triangle [a, b, c] closest to p (Ericson, Real-Time Collision Detection).
function onTriangle(p: Point, [a, b, c]: Point[]): Point {
  const ab = sub(b, a), ac = sub(c, a), ap = sub(p, a);
  const d1 = dot(ab, ap), d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return a;
  const bp = sub(p, b), d3 = dot(ab, bp), d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return b;
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return add(a, scale(ab, d1 / (d1 - d3)));
  const cp = sub(p, c), d5 = dot(ab, cp), d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return c;
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return add(a, scale(ac, d2 / (d2 - d6)));
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) return add(b, scale(sub(c, b), (d4 - d3) / (d4 - d3 + (d5 - d6))));
  const denominator = 1 / (va + vb + vc);
  return add(a, add(scale(ab, vb * denominator), scale(ac, vc * denominator)));
}
// Where segment [p, q] passes through triangle [a, b, c], if it does (Möller–Trumbore).
function crossing(p: Point, q: Point, [a, b, c]: Point[]): Point | null {
  const d = sub(q, p), e1 = sub(b, a), e2 = sub(c, a), h = cross(d, e2), det = dot(e1, h);
  if (Math.abs(det) < 1e-12) return null;
  const s = sub(p, a), u = dot(s, h) / det;
  if (u < 0 || u > 1) return null;
  const k = cross(s, e1), v = dot(d, k) / det;
  if (v < 0 || u + v > 1) return null;
  const t = dot(e2, k) / det;
  return t >= 0 && t <= 1 ? add(p, scale(d, t)) : null;
}
const nearer = (pairs: [Point, Point][]) => pairs.reduce((best, pair) => norm(sub(pair[0], pair[1])) < norm(sub(best[0], best[1])) ? pair : best);
// Closest points between a segment and a triangle, on each in turn.
function segmentTriangle([p, q]: Point[], triangle: Point[]): [Point, Point] {
  const hit = crossing(p, q, triangle);
  if (hit) return [hit, hit];
  return nearer([[p, onTriangle(p, triangle)], [q, onTriangle(q, triangle)],
    ...[0, 1, 2].map(i => segmentPair(p, q, triangle[i], triangle[(i + 1) % 3]))]);
}
// Closest points between two shapes: a point, a segment or a triangle. Triangles that meet
// do so where an edge of one passes through the other.
function shapePair(a: Point[], b: Point[]): [Point, Point] {
  if (a.length < 3 && b.length < 3) return segmentPair(a[0], a[a.length - 1], b[0], b[b.length - 1]);
  if (a.length < 3) { const [q, p] = shapePair(b, a); return [p, q]; }
  if (b.length === 1) return [onTriangle(b[0], a), b[0]];
  if (b.length === 2) { const [q, p] = segmentTriangle(b, a); return [p, q]; }
  const edges = (t: Point[]) => [0, 1, 2].map(i => [t[i], t[(i + 1) % 3]]);
  return nearer([...edges(a).map(edge => segmentTriangle(edge, b)), ...edges(b).map((edge): [Point, Point] => { const [q, p] = segmentTriangle(edge, a); return [p, q]; })]);
}
const shapes = (item: Measurable): Point[][] => item.kind === 'vertex' ? [[item.position]]
  : item.kind === 'face' ? item.triangles : item.points.slice(1).map((p, i) => [item.points[i], p]);
// A shape's bounding sphere, which rules out shapes too far apart to matter.
const bound = (shape: Point[]) => {
  const center = scale(shape.reduce(add, [0, 0, 0]), 1 / shape.length);
  return { shape, center, radius: Math.max(...shape.map(p => norm(sub(p, center)))) };
};
function closest(a: Measurable, b: Measurable): [Point, Point] {
  let best: [Point, Point] = [[0, 0, 0], [0, 0, 0]], distance = Infinity;
  const bs = shapes(b).map(bound);
  for (const x of shapes(a).map(bound)) for (const y of bs) {
    if (norm(sub(x.center, y.center)) - x.radius - y.radius >= distance) continue;
    const pair = shapePair(x.shape, y.shape), d = norm(sub(pair[0], pair[1]));
    if (d < distance) { distance = d; best = pair; }
  }
  return best;
}
const direction = (edge: Extract<Measurable, { kind: 'edge' }>) => {
  const d = sub(edge.points[edge.points.length - 1], edge.points[0]);
  return scale(d, 1 / norm(d));
};
// Distance from p to the infinite line through a straight edge.
const toLine = (p: Point, edge: Extract<Measurable, { kind: 'edge' }>) => {
  const v = sub(p, edge.points[0]), d = direction(edge);
  return norm(sub(v, scale(d, dot(v, d))));
};
const middle = (edge: Extract<Measurable, { kind: 'edge' }>) => {
  let remaining = edge.length / 2;
  for (const [a, b] of edge.points.slice(1).map((p, i) => [edge.points[i], p])) {
    const length = norm(sub(b, a));
    if (remaining <= length) return add(a, scale(sub(b, a), length ? remaining / length : 0));
    remaining -= length;
  }
  return edge.points[0];
};

// The distance from a point to a flat face's plane.
const toPlane = (p: Point, face: Face & { normal: Point }) => Math.abs(dot(sub(p, face.center), face.normal));
const flat = (face: Face): face is Face & { normal: Point } => !!face.normal;

export function measure(items: Measurable[]): Measurement | null {
  const edges = items.filter((item): item is Extract<Measurable, { kind: 'edge' }> => item.kind === 'edge');
  const faces = items.filter((item): item is Face => item.kind === 'face');
  if (items.length === 1 && faces.length === 1) return { rows: [{ label: 'Area', value: faces[0].area, unit: 'area' }], anchor: faces[0].center };
  if (items.length === 1 && edges.length === 1) {
    const edge = edges[0], round = circle(edge);
    return { rows: round
      ? [{ label: 'Diameter', value: 2 * round.radius, unit: 'length' }, { label: 'Circumference', value: edge.length, unit: 'length' }]
      : [{ label: 'Length', value: edge.length, unit: 'length' }], anchor: middle(edge) };
  }
  if (items.length === 2) {
    const [a, b] = items;
    const pair = closest(a, b), distance = norm(sub(pair[0], pair[1]));
    const rows: MeasureRow[] = [{ label: 'Distance', value: distance, unit: 'length' }];
    // A row unless it repeats the distance.
    const extra = (label: string, value: number) => { if (Math.abs(value - distance) > 1e-6) rows.push({ label, value, unit: 'length' }); };
    if (a.kind === 'vertex' && b.kind === 'vertex') {
      const delta = sub(b.position, a.position);
      rows.push(...['X', 'Y', 'Z'].map((axis, i): MeasureRow => ({ label: `Δ${axis}`, value: Math.abs(delta[i]), unit: 'length' })));
    } else if (faces.length === 2) {
      // Flat faces: their spacing if parallel, else the angle between them.
      const [f, g] = faces;
      if (flat(f) && flat(g)) {
        const angle = Math.acos(Math.min(1, Math.abs(dot(f.normal, g.normal)))) * 180 / Math.PI;
        if (angle < 0.01) extra('Parallel spacing', toPlane(g.center, f));
        else rows.push({ label: 'Angle', value: angle, unit: 'angle' });
      }
    } else if (faces.length === 1) {
      // A flat face and a vertex: the vertex's distance from its plane. A flat face and a
      // straight edge: their spacing if parallel, else the angle between them.
      const face = faces[0], other = a === face ? b : a;
      if (flat(face) && other.kind === 'vertex') extra('To the face plane', toPlane(other.position, face));
      else if (flat(face) && other.kind === 'edge' && straight(other)) {
        const angle = Math.asin(Math.min(1, Math.abs(dot(direction(other), face.normal)))) * 180 / Math.PI;
        if (angle < 0.01) extra('Parallel spacing', toPlane(other.points[0], face));
        else rows.push({ label: 'Angle', value: angle, unit: 'angle' });
      }
    } else if (edges.length === 1) {
      const vertex = items.find((item): item is Extract<Measurable, { kind: 'vertex' }> => item.kind === 'vertex');
      if (vertex && straight(edges[0])) {
        const perpendicular = toLine(vertex.position, edges[0]);
        if (Math.abs(perpendicular - distance) > 1e-6) rows.push({ label: 'To the edge line', value: perpendicular, unit: 'length' });
      }
    } else if (straight(edges[0]) && straight(edges[1])) {
      const cos = Math.min(1, Math.abs(dot(direction(edges[0]), direction(edges[1]))));
      const angle = Math.acos(cos) * 180 / Math.PI;
      if (angle < 0.01) {
        const spacing = toLine(edges[1].points[0], edges[0]);
        if (Math.abs(spacing - distance) > 1e-6) rows.push({ label: 'Parallel spacing', value: spacing, unit: 'length' });
      } else rows.push({ label: 'Angle', value: angle, unit: 'angle' });
    }
    return { rows, line: distance > 1e-9 ? pair : undefined, anchor: mid(pair[0], pair[1]) };
  }
  if (items.length > 2 && faces.length === items.length) {
    return { rows: [{ label: 'Total area', value: faces.reduce((sum, face) => sum + face.area, 0), unit: 'area' }], anchor: faces[0].center };
  }
  if (items.length > 2 && edges.length === items.length) {
    return { rows: [{ label: 'Total length', value: edges.reduce((sum, edge) => sum + edge.length, 0), unit: 'length' }], anchor: middle(edges[0]) };
  }
  return null;
}
