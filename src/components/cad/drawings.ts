// Geometry-independent sheet data. SCAD supplies the dimension witnesses;
// another CAD importer can supply the same views and line segments later.
export type Point = [number, number, number];
export type Segment = [number, number, number, number];
export interface DrawingDimension {
  label: string; a: Point; b: Point; direction: 'horizontal' | 'vertical'; side: -1 | 1; tier: number;
}
export interface DrawingView {
  id: string; title: string; axes: [Point, Point, Point]; dimensions: DrawingDimension[];
}
export interface ProjectedView extends DrawingView {
  lines: Segment[]; bounds: [number, number, number, number];
}
export interface DrawingSheet { units: 'inches' | 'mm'; views: ProjectedView[] }
export interface DrawingOutput { sheet?: DrawingSheet; stale: boolean }

export const dot = (a: Point, b: Point) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const project = (p: Point, axes: DrawingView['axes']): Point => [dot(p, axes[0]), dot(p, axes[1]), dot(p, axes[2])];
const point = (p: unknown): p is Point => Array.isArray(p) && p.length === 3 &&
  p.every((n: unknown) => typeof n === 'number' && Number.isFinite(n));

export function parseDrawingDefinition(output: string): { units: DrawingSheet['units']; views: DrawingView[] } {
  const lines = output.split('\n').filter(line => /^ECHO:\s*"DRAWING_V1",/.test(line));
  if (lines.length !== 1) throw new Error('Expected one drawing definition from the model.');
  const data: unknown = JSON.parse(lines[0].replace(/^ECHO:\s*"DRAWING_V1",\s*/, ''));
  if (!Array.isArray(data) || data.length !== 2 || !['mm', 'inches'].includes(data[0] as string) ||
      !Array.isArray(data[1]) || data[1].length !== 3) throw new Error('Invalid drawing definition.');
  const ids = new Set<string>();
  const views = (data[1] as unknown[]).map(row => {
    if (!Array.isArray(row) || row.length !== 4 || !['front', 'top', 'right'].includes(row[0] as string) ||
        typeof row[1] !== 'string' || !row[1].trim() || !Array.isArray(row[2]) || row[2].length !== 3 ||
        !row[2].every(point) || !Array.isArray(row[3])) throw new Error('Invalid drawing view.');
    const [id, title, axes, rows] = row as [string, string, DrawingView['axes'], unknown[]];
    if (ids.has(id)) throw new Error('Duplicate drawing view.');
    ids.add(id);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      if (Math.abs(dot(axes[i], axes[j]) - (i === j ? 1 : 0)) > 1e-6) throw new Error('Drawing axes must be orthonormal.');
    }
    const dimensions = rows.map((dimension): DrawingDimension => {
      if (!Array.isArray(dimension) || dimension.length !== 6 || typeof dimension[0] !== 'string' ||
          !point(dimension[1]) || !point(dimension[2]) || !['horizontal', 'vertical'].includes(dimension[3] as string) ||
          ![-1, 1].includes(dimension[4] as number) || !Number.isInteger(dimension[5]) || dimension[5] < 1 || dimension[5] > 4) {
        throw new Error('Invalid drawing dimension.');
      }
      const [label, a, b, direction, side, tier] = dimension as [string, Point, Point, DrawingDimension['direction'], -1 | 1, number];
      if (Math.abs(project(a, axes)[direction === 'horizontal' ? 0 : 1] - project(b, axes)[direction === 'horizontal' ? 0 : 1]) < 1e-6) {
        throw new Error('Drawing dimensions must have positive length.');
      }
      return { label, a, b, direction, side, tier };
    });
    return { id, title, axes, dimensions };
  });
  return { units: data[0] as DrawingSheet['units'], views };
}

export function dimensionValue(dimension: DrawingDimension, view: DrawingView, units: DrawingSheet['units']) {
  const axis = view.axes[dimension.direction === 'horizontal' ? 0 : 1];
  return Math.abs(dot(dimension.b, axis) - dot(dimension.a, axis)) / (units === 'inches' ? 25.4 : 1);
}
