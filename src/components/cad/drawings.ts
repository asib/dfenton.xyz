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
  guides?: [Point, Point][];
}
export interface ProjectedView extends DrawingView {
  lines: Segment[]; bounds: [number, number, number, number];
  profiles?: Point2[][][];
  breaks?: Segment[];
}
export interface PartDrawingDefinition {
  id: string; title: string; quantity: number; notes: string[]; color: Point; views: DrawingView[];
}
export interface PartDrawing extends Omit<PartDrawingDefinition, 'views'> { views: ProjectedView[] }
export interface DrawingJoint { title: string; description: string; bearingLabel: string }
export interface DrawingSheet { units: 'inches' | 'mm'; views: ProjectedView[]; parts?: PartDrawing[]; joint?: DrawingJoint }
export interface DrawingOutput { sheet?: DrawingSheet; stale: boolean }

// Older tote sources omit the optional source-authored joint captions.
export const jointLabels = (sheet: Pick<DrawingSheet, 'joint'>): DrawingJoint => sheet.joint ?? {
  title: 'Handle/riser joint detail',
  description: 'Enlarged longitudinal and transverse sections through the assembled handle/riser bridle joint. Hatching distinguishes the wooden pieces.',
  bearingLabel: 'Handle notch roof rests on riser-slot floor. Both ends use the same joint.',
};

export const dot = (a: Point, b: Point) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const project = (p: Point, axes: DrawingView['axes']): Point => [dot(p, axes[0]), dot(p, axes[1]), dot(p, axes[2])];
const point = (p: unknown): p is Point => Array.isArray(p) && p.length === 3 &&
  p.every((n: unknown) => typeof n === 'number' && Number.isFinite(n));

// SCAD echo rounds floating-point values to six significant digits. Sources
// can preserve fractional dimensions as [whole mm, millionths].
function witness(value: unknown): Point | undefined {
  if (!Array.isArray(value) || value.length !== 3) return;
  const coordinates = (value as unknown[]).map(n => {
    if (typeof n === 'number' && Number.isFinite(n)) return n;
    if (Array.isArray(n) && n.length === 2 && Number.isSafeInteger(n[0]) && Number.isInteger(n[1]) && n[1] >= 0 && n[1] <= 1000000) {
      return (n[0] as number) + (n[1] as number) / 1000000;
    }
    return NaN;
  });
  return point(coordinates) ? coordinates : undefined;
}

function referenceLines(value: unknown): [Point, Point][] {
  if (!Array.isArray(value)) throw new Error('Invalid drawing reference lines.');
  return (value as unknown[]).map(line => {
    if (!Array.isArray(line) || line.length !== 2) throw new Error('Invalid drawing reference lines.');
    const a = witness(line[0]), b = witness(line[1]);
    if (!a || !b) throw new Error('Invalid drawing reference lines.');
    return [a, b];
  });
}

function parseView(row: unknown): DrawingView {
  if (!Array.isArray(row) || ![4, 5, 6].includes(row.length) || typeof row[0] !== 'string' || !/^[a-z0-9-]+$/.test(row[0]) ||
      typeof row[1] !== 'string' || !row[1].trim() || !Array.isArray(row[2]) || row[2].length !== 3 ||
      !row[2].every(point) || !Array.isArray(row[3])) throw new Error('Invalid drawing view.');
  const [id, title, axes, rows] = row as [string, string, DrawingView['axes'], unknown[]];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    if (Math.abs(dot(axes[i], axes[j]) - (i === j ? 1 : 0)) > 1e-6) throw new Error('Drawing axes must be orthonormal.');
  }
  const dimensions = rows.map((dimension): DrawingDimension => {
    const a = Array.isArray(dimension) ? witness(dimension[1]) : undefined;
    const b = Array.isArray(dimension) ? witness(dimension[2]) : undefined;
    if (!Array.isArray(dimension) || dimension.length !== 6 || typeof dimension[0] !== 'string' ||
        !a || !b || !['horizontal', 'vertical'].includes(dimension[3] as string) ||
        ![-1, 1].includes(dimension[4] as number) || !Number.isInteger(dimension[5]) || dimension[5] < 1 || dimension[5] > 4) {
      throw new Error('Invalid drawing dimension.');
    }
    const [label, , , direction, side, tier] = dimension as [string, unknown, unknown, DrawingDimension['direction'], -1 | 1, number];
    if (Math.abs(project(a, axes)[direction === 'horizontal' ? 0 : 1] - project(b, axes)[direction === 'horizontal' ? 0 : 1]) < 1e-6) {
      throw new Error('Drawing dimensions must have positive length.');
    }
    return { label, a, b, direction, side, tier };
  });
  let section: DrawingSection | undefined;
  if (row.length >= 5 && !(Array.isArray(row[4]) && row[4].length === 0)) {
    const value: unknown = row[4];
    if (!Array.isArray(value) || value.length !== 5 || typeof value[0] !== 'number' || !Number.isFinite(value[0]) ||
        !Array.isArray(value[1]) || value[1].length !== 4 || !value[1].every((n: unknown) => typeof n === 'number' && Number.isFinite(n)) ||
        value[1][2] <= value[1][0] || value[1][3] <= value[1][1] ||
        !Array.isArray(value[2]) || !value[2].every((edge: unknown) => typeof edge === 'string' && ['left', 'right', 'top', 'bottom'].includes(edge)) ||
        !Array.isArray(value[3]) || !value[3].every((note: unknown) => typeof note === 'string') ||
        !Array.isArray(value[4])) {
      throw new Error('Invalid drawing section.');
    }
    const [depth, crop, breaks, notes] = value as [number, DrawingSection['crop'], DrawingSection['breaks'], string[], unknown];
    section = { depth, crop, breaks, notes, contacts: referenceLines(value[4]) };
  }
  let guides: [Point, Point][] | undefined;
  if (row.length === 6) {
    guides = referenceLines(row[5]);
  }
  return { id, title, axes, dimensions, ...(section ? { section } : {}), ...(guides ? { guides } : {}) };
}

export function parseDrawingDefinition(output: string): { units: DrawingSheet['units']; views: DrawingView[]; joint?: DrawingJoint } {
  const lines = output.split('\n').filter(line => /^ECHO:\s*"DRAWING_V1",/.test(line));
  if (lines.length !== 1) throw new Error('Expected one drawing definition from the model.');
  const data: unknown = JSON.parse(lines[0].replace(/^ECHO:\s*"DRAWING_V1",\s*/, ''));
  if (!Array.isArray(data) || ![2, 3].includes(data.length) || !['mm', 'inches'].includes(data[0] as string) ||
      !Array.isArray(data[1]) || ![3, 5].includes(data[1].length)) throw new Error('Invalid drawing definition.');
  const views = (data[1] as unknown[]).map(parseView);
  const ids = new Set(views.map(view => view.id));
  if (ids.size !== views.length) throw new Error('Duplicate drawing view.');
  for (const view of views) {
    if (!['front', 'top', 'right', 'joint-longitudinal', 'joint-transverse'].includes(view.id)) throw new Error('Invalid assembly view.');
    if (view.id.startsWith('joint-') !== !!view.section) throw new Error('Joint views require section definitions.');
  }
  if (!['front', 'top', 'right'].every(id => ids.has(id)) ||
      ids.has('joint-longitudinal') !== ids.has('joint-transverse')) throw new Error('Incomplete drawing views.');
  let joint: DrawingJoint | undefined;
  if (data.length === 3) {
    if (!ids.has('joint-longitudinal') || !Array.isArray(data[2]) || data[2].length !== 3 ||
        !data[2].every((value: unknown) => typeof value === 'string' && value.trim())) throw new Error('Invalid joint captions.');
    const [title, description, bearingLabel] = data[2] as string[];
    joint = { title, description, bearingLabel };
  }
  return { units: data[0] as DrawingSheet['units'], views, ...(joint ? { joint } : {}) };
}

export function parsePartDrawingDefinitions(output: string): PartDrawingDefinition[] {
  const lines = output.split('\n').filter(line => /^ECHO:\s*"PART_DRAWINGS_V1",/.test(line));
  if (!lines.length) return [];
  if (lines.length !== 1) throw new Error('Expected one part drawing definition.');
  const rows: unknown = JSON.parse(lines[0].replace(/^ECHO:\s*"PART_DRAWINGS_V1",\s*/, ''));
  if (!Array.isArray(rows) || !rows.length) throw new Error('Invalid part drawing definition.');
  const ids = new Set<string>();
  return rows.map((row: unknown): PartDrawingDefinition => {
    if (!Array.isArray(row) || row.length !== 6 || typeof row[0] !== 'string' || !/^[a-z0-9-]+$/.test(row[0]) ||
        typeof row[1] !== 'string' || !row[1].trim() || !Number.isInteger(row[2]) || row[2] < 1 ||
        !Array.isArray(row[3]) || !row[3].every((note: unknown) => typeof note === 'string') ||
        !point(row[4]) || row[4].some(n => n < 0 || n > 1) || !Array.isArray(row[5]) || row[5].length < 1 || row[5].length > 3) {
      throw new Error('Invalid part drawing.');
    }
    const [id, title, quantity, notes, color, definitions] = row as [string, string, number, string[], Point, unknown[]];
    if (ids.has(id)) throw new Error('Duplicate part drawing.');
    ids.add(id);
    const views = definitions.map(parseView).map(view => ({ ...view, id: `part-${id}-${view.id}` }));
    if (new Set(views.map(view => view.id)).size !== views.length) throw new Error('Duplicate part view.');
    return { id, title, quantity, notes, color, views };
  });
}

export function dimensionValue(dimension: DrawingDimension, view: DrawingView, units: DrawingSheet['units']) {
  const axis = view.axes[dimension.direction === 'horizontal' ? 0 : 1];
  return Math.abs(dot(dimension.b, axis) - dot(dimension.a, axis)) / (units === 'inches' ? 25.4 : 1);
}
