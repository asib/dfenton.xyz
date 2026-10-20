import { project, type DrawingView, type Point, type Point2, type ProjectedView, type Segment } from './drawings';
import type { DrawingMesh } from './drawingGeometry';

const key = (p: Point2) => p.map(n => n.toFixed(4)).join(',');
const distance = (a: Point2, b: Point2) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const cross = (a: Point2, b: Point2, c: Point2) => (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);

function simplify(points: Point2[]) {
  let loop = points;
  for (;;) {
    const next = loop.filter((p, i) => {
      const a = loop[(i + loop.length - 1) % loop.length], b = loop[(i + 1) % loop.length];
      // Compare angle, not triangle area: a genuine corner may have very
      // short adjacent segments when the plane cuts close to a mesh face.
      return Math.abs(cross(a, p, b)) > 1e-6 * distance(a, p) * distance(p, b);
    });
    if (next.length === loop.length || next.length < 3) return loop;
    loop = next;
  }
}

function joinSegments(segments: [Point2, Point2][], tolerance = 0.0001): Point2[][] {
  const vertices = new Map<string, Point2>(), neighbors = new Map<string, Set<string>>();
  // Intersections of Float32 triangles can land on opposite sides of a
  // decimal rounding boundary. Weld by distance, not by a rounded string.
  const vertexKey = (p: Point2) => {
    const existing = [...vertices].find(([, q]) => distance(p, q) < tolerance);
    if (existing) return existing[0];
    const id = String(vertices.size);
    vertices.set(id, p);
    return id;
  };
  for (const [a, b] of segments) {
    const ak = vertexKey(a), bk = vertexKey(b);
    if (ak === bk) continue;
    if (!neighbors.has(ak)) neighbors.set(ak, new Set());
    if (!neighbors.has(bk)) neighbors.set(bk, new Set());
    neighbors.get(ak)?.add(bk); neighbors.get(bk)?.add(ak);
  }
  if ([...neighbors.values()].some(edges => edges.size !== 2)) throw new Error('A drawing section did not form closed contours.');
  const remaining = new Set(vertices.keys()), loops: Point2[][] = [];
  while (remaining.size) {
    const start = remaining.values().next().value;
    if (start === undefined) break;
    const loop: Point2[] = [];
    let current = start, previous = '';
    do {
      if (!remaining.delete(current)) throw new Error('A drawing section contour intersects itself.');
      const vertex = vertices.get(current);
      if (!vertex) throw new Error('Missing drawing section vertex.');
      loop.push(vertex);
      const next = [...(neighbors.get(current) ?? [])].find(vertex => vertex !== previous);
      if (!next) throw new Error('A drawing section contour is open.');
      previous = current; current = next;
    } while (current !== start);
    if (loop.length >= 3) loops.push(simplify(loop));
  }
  return loops;
}

function cropLoop(loop: Point2[], bounds: ProjectedView['bounds']) {
  let points = loop;
  for (const [axis, edge, sign] of [[0, bounds[0], 1], [0, bounds[2], -1], [1, bounds[1], 1], [1, bounds[3], -1]]) {
    const clipped: Point2[] = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      const da = sign * (a[axis] - edge), db = sign * (b[axis] - edge);
      if (da >= 0) clipped.push(a);
      if ((da >= 0) !== (db >= 0)) {
        const t = da / (da - db);
        clipped.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
      }
    }
    points = clipped.filter((p, i) => distance(p, clipped[(i + clipped.length - 1) % clipped.length]) > 1e-5);
  }
  return points.length >= 3 ? simplify(points) : [];
}

// Intersect the real per-part mesh with a plane, retaining separate closed
// contours (including holes) for section hatching and the mating seam.
export function sectionDrawing(mesh: DrawingMesh, view: DrawingView): ProjectedView {
  const section = view.section;
  if (!section) throw new Error('Missing drawing section.');
  const profiles: Point2[][][] = [];
  // Float32 coordinates lose precision on large models. Account for that
  // representation error when classifying and welding section intersections.
  let magnitude = 1;
  for (const group of mesh.groups) for (let i = group.start * 3; i < (group.start + group.count) * 3; i++) {
    magnitude = Math.max(magnitude, Math.abs(mesh.positions[i]));
  }
  const epsilon = Math.max(0.00001, magnitude * 2 ** -23);
  const weldTolerance = Math.max(0.0001, epsilon * 2);
  for (const group of mesh.groups) {
    const segments: [Point2, Point2][] = [];
    for (let offset = group.start * 3; offset < (group.start + group.count) * 3; offset += 9) {
      const triangle = [0, 3, 6].map(i => project(Array.from(mesh.positions.slice(offset + i, offset + i + 3)) as Point, view.axes));
      const depths = triangle.map(p => Math.abs(p[2] - section.depth) < epsilon ? 0 : p[2] - section.depth);
      // Half-open classification takes the material just behind the plane.
      // Counting every on-plane vertex would include both sides of a stepped
      // face (for example a section exactly on the rabbet floor), causing forks.
      if (depths.every(d => d >= 0) || depths.every(d => d < 0)) continue;
      const intersections: Point2[] = [];
      for (let i = 0; i < 3; i++) {
        const j = (i + 1) % 3, a = triangle[i], b = triangle[j], da = depths[i], db = depths[j];
        if ((da < 0) !== (db < 0)) {
          const t = da / (da - db);
          intersections.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
        }
      }
      const unique = [...new Map(intersections.map(p => [key(p), p])).values()];
      if (unique.length === 2) segments.push([unique[0], unique[1]]);
    }
    const loops = joinSegments(segments, weldTolerance).map(loop => cropLoop(loop, section.crop)).filter(loop => loop.length >= 3);
    if (loops.length) profiles.push(loops);
  }
  if (!profiles.length) throw new Error('The drawing section does not intersect any parts.');
  const lines: Segment[] = [], breaks: Segment[] = [];
  const edges = { left: [0, section.crop[0]], right: [0, section.crop[2]], bottom: [1, section.crop[1]], top: [1, section.crop[3]] };
  for (const loops of profiles) for (const loop of loops) for (let i = 0; i < loop.length; i++) {
    const a = loop[i], b = loop[(i + 1) % loop.length];
    const broken = section.breaks.some(edge => {
      const [axis, value] = edges[edge];
      return Math.abs(a[axis] - value) < 0.0001 && Math.abs(b[axis] - value) < 0.0001;
    });
    (broken ? breaks : lines).push([...a, ...b]);
  }
  return { ...view, lines, profiles, breaks, bounds: section.crop };
}
