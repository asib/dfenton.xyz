export interface CutPart {
  id: string; name: string; material: string; quantity: number;
  thickness: number; width: number; length: number; blank: string;
  resawGroup?: string;
}
export interface CutBlank extends CutPart { ids: string[] }
export interface CutListOutput { text: string; stale: boolean }
export interface StockPreparation { millingMinLength: number; sawMinLength: number; resawKerf: number; resawCleanup: number }
export type StockLayoutMode = 'auto' | 'separate' | 'together';
export interface StockLayout { mode: StockLayoutMode; crosscutKerf: number }

export function parseStockPreparation(output: string): StockPreparation | null {
  const lines = output.split('\n').filter((line) => /^ECHO:\s*"CUTLIST_STOCK_V1",/.test(line));
  if (!lines.length) return null;
  if (lines.length !== 1) throw new Error('Expected one set of stock-preparation defaults.');
  const values: unknown = JSON.parse(lines[0].replace(/^ECHO:\s*"CUTLIST_STOCK_V1",\s*/, ''));
  if (!Array.isArray(values) || values.length !== 4 || !values.every((value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) && value > 0)) throw new Error('Invalid stock-preparation defaults.');
  const [millingMinLength, sawMinLength, resawKerf, resawCleanup] = values as number[];
  return { millingMinLength, sawMinLength, resawKerf, resawCleanup };
}

// Dimensions are evaluated by SCAD, never reimplemented from UI parameters.
export function parseCutList(output: string): CutPart[] {
  const lines = output.split('\n').filter((line) => /^ECHO:\s*"CUTLIST_V1",/.test(line));
  if (!lines.length) return [];
  if (lines.length !== 1) throw new Error('Expected one cut list from the model.');
  const rows: unknown = JSON.parse(lines[0].replace(/^ECHO:\s*"CUTLIST_V1",\s*/, ''));
  if (!Array.isArray(rows) || !rows.length) throw new Error('The model returned an invalid cut list.');
  const ids = new Set<string>();
  return rows.map((row: unknown) => {
    if (!Array.isArray(row) || (row.length !== 8 && row.length !== 9) ||
        !row.slice(0, 3).every((value: unknown) => typeof value === 'string' && value.trim()) ||
        !row.slice(3, 7).every((value: unknown) => typeof value === 'number' && Number.isFinite(value) && value > 0) ||
        !Number.isInteger(row[3]) || typeof row[7] !== 'string' || !row[7].trim() ||
        (row.length === 9 && (typeof row[8] !== 'string' || !row[8].trim()))) throw new Error('The model returned an invalid cut-list row.');
    const [id, name, material, quantity, thickness, width, length, blank, resawGroup] = row as [string, string, string, number, number, number, number, string, string?];
    if (ids.has(id)) throw new Error('The model returned duplicate cut-list parts.');
    ids.add(id);
    return { id, name, material, quantity, thickness, width, length, blank, resawGroup };
  });
}

// Group matching blanks while retaining the IDs of every colored physical part.
// Different rough thicknesses can also keep otherwise identical blanks apart.
export function groupCutList(parts: CutPart[], stockKey: (part: CutPart) => unknown = () => null): CutBlank[] {
  const groups = new Map<string, CutBlank>();
  for (const part of parts) {
    const key = JSON.stringify([part.blank, part.material, part.thickness, part.width, part.length, part.resawGroup, stockKey(part)]);
    const existing = groups.get(key);
    if (existing) {
      existing.ids.push(part.id);
      existing.quantity += part.quantity;
      existing.name = part.blank;
    } else groups.set(key, { ...part, ids: [part.id] });
  }
  return [...groups.values()];
}

export function inches(value: number): string {
  const sixtyFourths = Math.round(value * 64);
  if (Math.abs(value - sixtyFourths / 64) > 0.000001) return String(Number(value.toFixed(4)));
  const whole = Math.floor(sixtyFourths / 64);
  let numerator = sixtyFourths % 64, denominator = 64;
  if (!numerator) return String(whole);
  while (numerator % 2 === 0) { numerator /= 2; denominator /= 2; }
  return `${whole ? `${String(whole)} ` : ''}${String(numerator)}/${String(denominator)}`;
}

export function milledThickness(part: CutPart, preparation?: StockPreparation | null) {
  return part.resawGroup && preparation
    ? 2 * (part.thickness + preparation.resawCleanup) + preparation.resawKerf
    : part.thickness;
}

// Common rough-lumber buying sizes, in inches; do not round to unavailable 7/4, 9/4, etc.
export const stockThicknesses = [1, 1.25, 1.5, 2, 2.5, 3, 4];
export const stockLabel = (thickness: number) => `${String(thickness * 4)}/4`;

export function standardThickness(required: number): number | null {
  if (!Number.isFinite(required) || required <= 0) return null;
  return stockThicknesses.find((thickness) => thickness >= required) ?? null;
}

export function roughDimensions(part: CutPart, thickness: number, widthExtra: number, lengthExtra: number, preparation?: StockPreparation | null, thicknessExtra = 0.25, layout: StockLayout = { mode: 'auto', crosscutKerf: 0.125 }) {
  if (preparation && !Object.values(preparation).every((value) => Number.isFinite(value) && value > 0)) return null;
  if (part.resawGroup && (!preparation || part.quantity !== 2)) return null;
  if (!Number.isInteger(part.quantity) || part.quantity < 1 ||
      !['auto', 'separate', 'together'].includes(layout.mode) || !Number.isFinite(layout.crosscutKerf) || layout.crosscutKerf < 0) return null;
  const milled = milledThickness(part, preparation);
  if (![thickness, widthExtra, lengthExtra, thicknessExtra].every(Number.isFinite) ||
      !stockThicknesses.includes(thickness) || thickness < milled + thicknessExtra || thicknessExtra < 0 || widthExtra < 0 || lengthExtra < 0) return null;
  const blankLength = part.length + lengthExtra;
  const minimumLength = Math.max(preparation?.millingMinLength ?? 0, preparation?.sawMinLength ?? 0);
  const separateLength = Math.max(blankLength, minimumLength);
  const sharedLength = Math.max(part.quantity * blankLength + (part.quantity - 1) * layout.crosscutKerf, minimumLength);
  // Compare separate blanks with one parent for this matching group, not a full board-layout optimization.
  // Machine minimums apply before subdivision; the retained allowance still applies to each blank.
  const crosscut = !part.resawGroup && part.quantity > 1 &&
    (layout.mode === 'together' || (layout.mode === 'auto' && sharedLength < part.quantity * separateLength));
  return { quantity: part.resawGroup || crosscut ? 1 : part.quantity, thickness, width: part.width + widthExtra,
    length: crosscut ? sharedLength : separateLength, blankLength,
    piecesPerBoard: part.resawGroup ? 2 : crosscut ? part.quantity : 1,
    method: part.resawGroup ? 'resaw' as const : crosscut ? 'crosscut' as const : 'separate' as const };
}

export function stockPlan(rough: NonNullable<ReturnType<typeof roughDimensions>>): string {
  if (rough.method === 'resaw') return 'Resaw 1 parent → 2 bookmatched halves';
  if (rough.method === 'crosscut') return `S3S, then crosscut 1 parent → ${String(rough.piecesPerBoard)} × ${inches(rough.blankLength)}″ blanks`;
  return '1 blank per parent board';
}

export function boardFeet(rough: { quantity: number; thickness: number; width: number; length: number }): number {
  return rough.quantity * rough.thickness * rough.width * rough.length / 144;
}

// Quote cell text and neutralize spreadsheet formulas.
export function csvCell(value: string | number): string {
  const text = String(value);
  return `"${(/^[\s]*[=+@-]/.test(text) ? `'${text}` : text).replace(/"/g, '""')}"`;
}
