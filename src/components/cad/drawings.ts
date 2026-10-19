// Geometry-independent sheet data. SCAD supplies the dimension witnesses;
// another CAD importer can supply the same views and line segments later.
export type Point = [number, number, number];
export type Segment = [number, number, number, number];
export type Point2 = [number, number];
export interface DrawingSection {
  depth: number; crop: [number, number, number, number];
  breaks: ('left' | 'right' | 'top' | 'bottom')[]; notes: string[]; contacts: [Point, Point][];
}
export interface DrawingDimension {
  label: string; a: Point; b: Point; direction: 'horizontal' | 'vertical'; side: -1 | 1; tier: number;
}
export interface DrawingView {
  id: string; title: string; axes: [Point, Point, Point]; dimensions: DrawingDimension[];
  section?: DrawingSection;
}
export interface ProjectedView extends DrawingView {
  lines: Segment[]; bounds: [number, number, number, number];
  profiles?: Point2[][][];
  breaks?: Segment[];
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
      !Array.isArray(data[1]) || ![3, 5].includes(data[1].length)) throw new Error('Invalid drawing definition.');
  const ids = new Set<string>();
  const views = (data[1] as unknown[]).map(row => {
    if (!Array.isArray(row) || ![4, 5].includes(row.length) || !['front', 'top', 'right', 'joint-longitudinal', 'joint-transverse'].includes(row[0] as string) ||
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
    let section: DrawingSection | undefined;
    if (row.length === 5) {
      const value: unknown = row[4];
      if (!Array.isArray(value) || value.length !== 5 || typeof value[0] !== 'number' || !Number.isFinite(value[0]) ||
          !Array.isArray(value[1]) || value[1].length !== 4 || !value[1].every((n: unknown) => typeof n === 'number' && Number.isFinite(n)) ||
          value[1][2] <= value[1][0] || value[1][3] <= value[1][1] ||
          !Array.isArray(value[2]) || !value[2].every((edge: unknown) => typeof edge === 'string' && ['left', 'right', 'top', 'bottom'].includes(edge)) ||
          !Array.isArray(value[3]) || !value[3].every((note: unknown) => typeof note === 'string') ||
          !Array.isArray(value[4]) || !value[4].every((contact: unknown) => Array.isArray(contact) && contact.length === 2 && contact.every(point))) {
        throw new Error('Invalid drawing section.');
      }
      const [depth, crop, breaks, notes, contacts] = value as [number, DrawingSection['crop'], DrawingSection['breaks'], string[], [Point, Point][]];
      section = { depth, crop, breaks, notes, contacts };
    }
    if (id.startsWith('joint-') !== !!section) throw new Error('Joint views require section definitions.');
    return { id, title, axes, dimensions, ...(section ? { section } : {}) };
  });
  if (!['front', 'top', 'right'].every(id => ids.has(id)) ||
      ids.has('joint-longitudinal') !== ids.has('joint-transverse')) throw new Error('Incomplete drawing views.');
  return { units: data[0] as DrawingSheet['units'], views };
}

export function dimensionValue(dimension: DrawingDimension, view: DrawingView, units: DrawingSheet['units']) {
  const axis = view.axes[dimension.direction === 'horizontal' ? 0 : 1];
  return Math.abs(dot(dimension.b, axis) - dot(dimension.a, axis)) / (units === 'inches' ? 25.4 : 1);
}
