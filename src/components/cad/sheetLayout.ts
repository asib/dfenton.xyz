// Sheet-goods layouts: finished parts packed onto stock sheets. Dimensions are
// inches. X runs along the sheet length, Y across its width; plywood face grain
// runs along the sheet length.
export interface SheetPart {
  id: string; name: string; material: string; quantity: number;
  thickness: number; width: number; length: number;
  // "length": face grain must run along the part length; "any": the part may turn.
  grain: 'length' | 'any'; swatches: string[];
}
export interface SheetStock { sheetLength: number; sheetWidth: number; kerf: number; trim: number }
export type GrainMode = 'visible' | 'any' | 'aligned';
export type LayoutMethod = 'densest' | 'rip';
export interface SheetSettings extends SheetStock { grain: GrainMode; method: LayoutMethod }
export interface Placement { part: SheetPart; key: string; x: number; y: number; along: number; across: number; turned: boolean }
// Rip-first strips: Y offset and width of each full-length rip. Parts narrower
// than their strip are trimmed to width after crosscutting.
export interface LaidSheet { placements: Placement[]; strips?: { y: number; width: number }[] }
export interface MaterialLayout { material: string; thickness: number; sheets: LaidSheet[]; partArea: number }
export type SheetLayoutResult = { ok: true; materials: MaterialLayout[] } | { ok: false; error: string };

const eps = 1e-6;

export function parseSheetParts(output: string): SheetPart[] {
  const lines = output.split('\n').filter(line => /^ECHO:\s*"SHEET_PARTS_V1",/.test(line));
  if (!lines.length) return [];
  if (lines.length !== 1) throw new Error('Expected one sheet-goods part list from the model.');
  const rows: unknown = JSON.parse(lines[0].replace(/^ECHO:\s*"SHEET_PARTS_V1",\s*/, ''));
  if (!Array.isArray(rows) || !rows.length) throw new Error('The model returned an invalid sheet-goods part list.');
  const ids = new Set<string>();
  return rows.map((row: unknown): SheetPart => {
    if (!Array.isArray(row) || row.length !== 9 ||
        !row.slice(0, 3).every((value: unknown) => typeof value === 'string' && value.trim()) ||
        !row.slice(3, 7).every((value: unknown) => typeof value === 'number' && Number.isFinite(value) && value > 0) ||
        !Number.isInteger(row[3]) || !['length', 'any'].includes(row[7] as string) ||
        !Array.isArray(row[8]) || !row[8].every((id: unknown) => typeof id === 'string')) {
      throw new Error('The model returned an invalid sheet-goods part.');
    }
    const [id, name, material, quantity, thickness, width, length, grain, swatches] =
      row as [string, string, string, number, number, number, number, SheetPart['grain'], string[]];
    if (ids.has(id)) throw new Error('The model returned duplicate sheet-goods parts.');
    ids.add(id);
    return { id, name, material, quantity, thickness, width, length, grain, swatches };
  });
}

export function parseSheetStock(output: string): SheetStock | null {
  const lines = output.split('\n').filter(line => /^ECHO:\s*"SHEET_STOCK_V1",/.test(line));
  if (!lines.length) return null;
  if (lines.length !== 1) throw new Error('Expected one set of sheet-stock defaults.');
  const values: unknown = JSON.parse(lines[0].replace(/^ECHO:\s*"SHEET_STOCK_V1",\s*/, ''));
  if (!Array.isArray(values) || values.length !== 4 || !values.every((value: unknown) => typeof value === 'number' && Number.isFinite(value)) ||
      values[0] <= 0 || values[1] <= 0 || values[2] < 0 || values[3] < 0) throw new Error('Invalid sheet-stock defaults.');
  const [sheetLength, sheetWidth, kerf, trim] = values as number[];
  return { sheetLength, sheetWidth, kerf, trim };
}

// A, B, ... Z, AA, AB ... in part-list order.
export function partKey(index: number): string {
  let key = '', n = index + 1;
  while (n > 0) { key = String.fromCharCode(65 + (n - 1) % 26) + key; n = Math.floor((n - 1) / 26); }
  return key;
}

export const canTurn = (part: SheetPart, mode: GrainMode) => mode === 'any' || (mode === 'visible' && part.grain === 'any');

interface Orientation { along: number; across: number; turned: boolean }
interface Item { part: SheetPart; key: string; options: Orientation[] }
interface Packed { sheets: LaidSheet[] }

// Lexicographic comparison of scores.
const better = (a: number[], b: number[]) => {
  for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > eps) return a[i] < b[i];
  return false;
};
const partArea = (sheet: LaidSheet) => sheet.placements.reduce((sum, p) => sum + p.along * p.across, 0);
// Area cut away when parts are trimmed to width from wider rip strips.
const trimmedArea = (packed: Packed) => packed.sheets.reduce((sum, sheet) => sum + sheet.placements.reduce((total, p) =>
  total + ((sheet.strips?.find(strip => Math.abs(strip.y - p.y) < eps)?.width ?? p.across) - p.across) * p.along, 0), 0);
// Fewest sheets, then the least trimming waste, then the emptiest final sheet
// (more of the work on earlier sheets).
const score = (packed: Packed) => [packed.sheets.length, trimmedArea(packed),
  partArea(packed.sheets[packed.sheets.length - 1] ?? { placements: [] })];

type Split = 'shorter' | 'longer' | 'across' | 'along';
interface Free { x: number; y: number; w: number; h: number }

// Guillotine packing: every free region is split by a straight through-cut, so
// the layout can be cut with a table or track saw without plunge cuts. Kerf is
// added to each part and to the usable area, so parts may touch the far edges.
function guillotine(items: Item[], length: number, width: number, kerf: number, split: Split, fit: 'area' | 'side'): Packed {
  const sheets: { free: Free[]; laid: LaidSheet }[] = [];
  for (const item of items) {
    let best: { sheet: number; free: number; option: Orientation; score: number[] } | null = null;
    for (const [s, sheet] of sheets.entries()) for (const [f, r] of sheet.free.entries()) for (const option of item.options) {
      const w = option.along + kerf, h = option.across + kerf;
      if (w > r.w + eps || h > r.h + eps) continue;
      const short = Math.min(r.w - w, r.h - h), long = Math.max(r.w - w, r.h - h);
      const candidate = fit === 'area' ? [s, r.w * r.h - w * h, short] : [s, short, long];
      if (!best || better(candidate, best.score)) best = { sheet: s, free: f, option, score: candidate };
    }
    if (!best) {
      sheets.push({ free: [{ x: 0, y: 0, w: length + kerf, h: width + kerf }], laid: { placements: [] } });
      best = { sheet: sheets.length - 1, free: 0, option: item.options[0], score: [] };
    }
    const { sheet, free, option } = best;
    const target = sheets[sheet], r = target.free[free];
    const w = option.along + kerf, h = option.across + kerf;
    target.laid.placements.push({ part: item.part, key: item.key, x: r.x, y: r.y, along: option.along, across: option.across, turned: option.turned });
    const leftoverW = r.w - w, leftoverH = r.h - h;
    // Splitting "across" gives the strip beyond the part the full region height.
    const across = split === 'across' || (split === 'shorter' && leftoverW >= leftoverH) || (split === 'longer' && leftoverW < leftoverH);
    const pieces: Free[] = across
      ? [{ x: r.x + w, y: r.y, w: leftoverW, h: r.h }, { x: r.x, y: r.y + h, w, h: leftoverH }]
      : [{ x: r.x + w, y: r.y, w: leftoverW, h }, { x: r.x, y: r.y + h, w: r.w, h: leftoverH }];
    target.free.splice(free, 1, ...pieces.filter(p => p.w > eps && p.h > eps));
  }
  return { sheets: sheets.map(sheet => sheet.laid) };
}

// Strip cutting: rip the sheet along its length into strips, then crosscut each
// strip. A part narrower than its strip is trimmed to width after crosscutting;
// exact-width strips are preferred so most parts need no third cut. With
// "open", a new exact-width strip is ripped before trimming from a wider one.
interface Strip { y: number; width: number; used: number }
function ripFirst(items: Item[], length: number, width: number, kerf: number, prefer: 'grain' | 'narrow' | 'wide', policy: 'trim' | 'open'): Packed {
  const sheets: { used: number; laid: LaidSheet; strips: Strip[] }[] = [];
  const ordered = (options: Orientation[]) => prefer === 'grain' ? options :
    [...options].sort((a, b) => prefer === 'narrow' ? a.across - b.across : b.across - a.across);
  const place = (laid: LaidSheet, strip: Strip, item: Item, option: Orientation) => {
    laid.placements.push({ part: item.part, key: item.key, x: strip.used, y: strip.y, along: option.along, across: option.across, turned: option.turned });
    strip.used += option.along + kerf;
  };
  const open = (item: Item, options: Orientation[]) => {
    for (const option of options) {
      const sheet = sheets.find(s => s.used + option.across + kerf <= width + kerf + eps);
      if (!sheet) continue;
      const strip = { y: sheet.used, width: option.across, used: 0 };
      sheet.strips.push(strip);
      sheet.used += option.across + kerf;
      place(sheet.laid, strip, item, option);
      return true;
    }
    return false;
  };
  for (const item of items) {
    const options = ordered(item.options);
    let best: { sheet: number; strip: Strip; option: Orientation; waste: number } | null = null;
    for (const option of options) for (const [s, sheet] of sheets.entries()) for (const strip of sheet.strips) {
      const waste = strip.width - option.across;
      if (waste < -eps || strip.used + option.along + kerf > length + kerf + eps) continue;
      if (!best || waste < best.waste - eps) best = { sheet: s, strip, option, waste };
    }
    if (best && (best.waste < eps || policy === 'trim')) {
      place(sheets[best.sheet].laid, best.strip, item, best.option);
      continue;
    }
    if (open(item, options)) continue;
    if (best) {
      place(sheets[best.sheet].laid, best.strip, item, best.option);
      continue;
    }
    const option = options[0], strip = { y: 0, width: option.across, used: 0 };
    const sheet = { used: option.across + kerf, laid: { placements: [] }, strips: [strip] };
    sheets.push(sheet);
    place(sheet.laid, strip, item, option);
  }
  return { sheets: sheets.map(sheet => ({ ...sheet.laid, strips: sheet.strips.map(s => ({ y: s.y, width: s.width })) })) };
}

const orders: ((a: Item, b: Item) => number)[] = [
  (a, b) => b.part.width * b.part.length - a.part.width * a.part.length,
  (a, b) => Math.max(b.part.width, b.part.length) - Math.max(a.part.width, a.part.length),
  (a, b) => Math.min(b.part.width, b.part.length) - Math.min(a.part.width, a.part.length),
  (a, b) => b.options[0].across - a.options[0].across || b.options[0].along - a.options[0].along,
];

export function layoutSheets(parts: SheetPart[], settings: SheetSettings): SheetLayoutResult {
  const { sheetLength, sheetWidth, kerf, trim, grain, method } = settings;
  if (![sheetLength, sheetWidth, kerf, trim].every(Number.isFinite) || sheetLength <= 0 || sheetWidth <= 0 || kerf < 0 || trim < 0) {
    return { ok: false, error: 'Enter a positive sheet size and a kerf and edge trim of 0 or more.' };
  }
  const length = sheetLength - 2 * trim, width = sheetWidth - 2 * trim;
  if (length <= 0 || width <= 0) return { ok: false, error: 'The edge trim leaves no usable sheet.' };
  const materials = new Map<string, { material: string; thickness: number; items: Item[] }>();
  for (const [index, part] of parts.entries()) {
    const options: Orientation[] = [{ along: part.length, across: part.width, turned: false }];
    if (canTurn(part, grain) && Math.abs(part.length - part.width) > eps) options.push({ along: part.width, across: part.length, turned: true });
    const fitting = options.filter(o => o.along <= length + eps && o.across <= width + eps);
    if (!fitting.length) return { ok: false, error: `${part.name} does not fit on the usable ${String(width)} × ${String(length)} in sheet${canTurn(part, grain) ? '' : ' with its grain along the sheet'}.` };
    const groupKey = JSON.stringify([part.material, part.thickness]);
    const group = materials.get(groupKey) ?? { material: part.material, thickness: part.thickness, items: [] };
    for (let i = 0; i < part.quantity; i++) group.items.push({ part, key: partKey(index), options: fitting });
    materials.set(groupKey, group);
  }
  const result: MaterialLayout[] = [];
  for (const { material, thickness, items } of materials.values()) {
    let best: Packed | null = null;
    for (const order of orders) {
      const sorted = [...items].sort(order);
      const attempts = method === 'rip'
        ? (['grain', 'narrow', 'wide'] as const).flatMap(prefer =>
          (['open', 'trim'] as const).map(policy => ripFirst(sorted, length, width, kerf, prefer, policy)))
        : (['shorter', 'longer', 'across', 'along'] as const).flatMap(split =>
          (['area', 'side'] as const).map(fit => guillotine(sorted, length, width, kerf, split, fit)));
      for (const packed of attempts) if (!best || better(score(packed), score(best))) best = packed;
    }
    const sheets = (best?.sheets ?? []).map(sheet => ({
      placements: sheet.placements.map(p => ({ ...p, x: p.x + trim, y: p.y + trim })),
      ...(sheet.strips ? { strips: sheet.strips.map(s => ({ y: s.y + trim, width: s.width })) } : {}),
    }));
    result.push({ material, thickness, sheets, partArea: items.reduce((sum, item) => sum + item.part.width * item.part.length, 0) });
  }
  return { ok: true, materials: result.sort((a, b) => b.thickness - a.thickness || a.material.localeCompare(b.material)) };
}
