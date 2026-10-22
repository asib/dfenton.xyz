// Onshape-style measurements of selected edges and vertices, in model
// millimetres. Edges are polylines; straight edges are their two endpoints.
export type Point = number[];
export type Measurable =
  | { kind: 'edge'; points: Point[]; closed: boolean; length: number }
  | { kind: 'vertex'; position: Point };
export interface MeasureRow { label: string; value: number; unit: 'length' | 'angle' }
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
const segments = (item: Measurable): [Point, Point][] => item.kind === 'vertex' ? [[item.position, item.position]]
  : item.points.slice(1).map((p, i): [Point, Point] => [item.points[i], p]);
function closest(a: Measurable, b: Measurable): [Point, Point] {
  let best: [Point, Point] = [[0, 0, 0], [0, 0, 0]], distance = Infinity;
  for (const [p1, q1] of segments(a)) for (const [p2, q2] of segments(b)) {
    const pair = segmentPair(p1, q1, p2, q2), d = norm(sub(pair[0], pair[1]));
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
  for (const [a, b] of segments(edge)) {
    const length = norm(sub(b, a));
    if (remaining <= length) return add(a, scale(sub(b, a), length ? remaining / length : 0));
    remaining -= length;
  }
  return edge.points[0];
};

export function measure(items: Measurable[]): Measurement | null {
  const edges = items.filter((item): item is Extract<Measurable, { kind: 'edge' }> => item.kind === 'edge');
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
    if (a.kind === 'vertex' && b.kind === 'vertex') {
      const delta = sub(b.position, a.position);
      rows.push(...['X', 'Y', 'Z'].map((axis, i): MeasureRow => ({ label: `Δ${axis}`, value: Math.abs(delta[i]), unit: 'length' })));
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
  if (items.length > 2 && edges.length === items.length) {
    return { rows: [{ label: 'Total length', value: edges.reduce((sum, edge) => sum + edge.length, 0), unit: 'length' }], anchor: middle(edges[0]) };
  }
  return null;
}
