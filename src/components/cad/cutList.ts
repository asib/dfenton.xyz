export interface CutPart {
  id: string; name: string; material: string; quantity: number;
  thickness: number; width: number; length: number; blank: string;
}
export interface CutBlank extends CutPart { ids: string[] }
export interface CutListOutput { text: string; stale: boolean }

// Dimensions are evaluated by SCAD, never reimplemented from UI parameters.
export function parseCutList(output: string): CutPart[] {
  const lines = output.split('\n').filter((line) => /^ECHO:\s*"CUTLIST_V1",/.test(line));
  if (!lines.length) return [];
  if (lines.length !== 1) throw new Error('Expected one cut list from the model.');
  const rows: unknown = JSON.parse(lines[0].replace(/^ECHO:\s*"CUTLIST_V1",\s*/, ''));
  if (!Array.isArray(rows) || !rows.length) throw new Error('The model returned an invalid cut list.');
  const ids = new Set<string>();
  return rows.map((row: unknown) => {
    if (!Array.isArray(row) || row.length !== 8 ||
        !row.slice(0, 3).every((value: unknown) => typeof value === 'string' && value.trim()) ||
        !row.slice(3, 7).every((value: unknown) => typeof value === 'number' && Number.isFinite(value) && value > 0) ||
        !Number.isInteger(row[3]) || typeof row[7] !== 'string' || !row[7].trim()) throw new Error('The model returned an invalid cut-list row.');
    const [id, name, material, quantity, thickness, width, length, blank] = row as [string, string, string, number, number, number, number, string];
    if (ids.has(id)) throw new Error('The model returned duplicate cut-list parts.');
    ids.add(id);
    return { id, name, material, quantity, thickness, width, length, blank };
  });
}

// Group matching blanks while retaining the IDs of every colored physical part.
// Different rough thicknesses can also keep otherwise identical blanks apart.
export function groupCutList(parts: CutPart[], stockKey: (part: CutPart) => unknown = () => null): CutBlank[] {
  const groups = new Map<string, CutBlank>();
  for (const part of parts) {
    const key = JSON.stringify([part.blank, part.material, part.thickness, part.width, part.length, stockKey(part)]);
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

export function roughDimensions(part: CutPart, thickness: number, widthExtra: number, lengthExtra: number) {
  if (![thickness, widthExtra, lengthExtra].every(Number.isFinite) ||
      thickness < part.thickness || widthExtra < 0 || lengthExtra < 0) return null;
  return { thickness, width: part.width + widthExtra, length: part.length + lengthExtra };
}

// Quote cell text and neutralize spreadsheet formulas.
export function csvCell(value: string | number): string {
  const text = String(value);
  return `"${(/^[\s]*[=+@-]/.test(text) ? `'${text}` : text).replace(/"/g, '""')}"`;
}
