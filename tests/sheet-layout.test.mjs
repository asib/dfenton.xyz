import { expect, test } from 'bun:test';
import { canTurn, layoutSheets, parseSheetParts, parseSheetStock, partKey } from '../src/components/cad/sheetLayout';

const part = (id, width, length, quantity = 1, grain = 'any', material = '3/4″ plywood', thickness = 0.75) =>
  ({ id, name: id, material, quantity, thickness, width, length, grain, swatches: [] });
const stock = { sheetLength: 96, sheetWidth: 48, kerf: 0.125, trim: 0 };

// Independently check a layout: bounds, kerf gaps, counts, grain and strip structure.
function check(parts, settings, result) {
  expect(result.ok).toBe(true);
  const { sheetLength: L, sheetWidth: W, kerf: k, trim } = settings;
  const counts = new Map();
  for (const material of result.materials) for (const sheet of material.sheets) {
    const placed = sheet.placements;
    for (const p of placed) {
      counts.set(p.part.id, (counts.get(p.part.id) ?? 0) + 1);
      expect(p.x).toBeGreaterThanOrEqual(trim - 1e-9);
      expect(p.y).toBeGreaterThanOrEqual(trim - 1e-9);
      expect(p.x + p.along).toBeLessThanOrEqual(L - trim + 1e-9);
      expect(p.y + p.across).toBeLessThanOrEqual(W - trim + 1e-9);
      expect([p.along, p.across]).toEqual(p.turned ? [p.part.width, p.part.length] : [p.part.length, p.part.width]);
      if (p.turned) expect(canTurn(p.part, settings.grain)).toBe(true);
      expect(p.part.material).toBe(material.material);
    }
    for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i], b = placed[j];
      const apart = a.x + a.along + k <= b.x + 1e-9 || b.x + b.along + k <= a.x + 1e-9 ||
        a.y + a.across + k <= b.y + 1e-9 || b.y + b.across + k <= a.y + 1e-9;
      expect(apart).toBe(true);
    }
    if (settings.method === 'rip') {
      expect(sheet.strips.length).toBeGreaterThan(0);
      for (const p of placed) expect(sheet.strips.some(s => Math.abs(s.y - p.y) < 1e-9 && p.across <= s.width + 1e-9)).toBe(true);
    }
  }
  for (const p of parts) expect(counts.get(p.id)).toBe(p.quantity);
}

const cabinet = [part('side', 18, 30, 2, 'length'), part('panel', 17.75, 23.25, 2, 'length'),
  part('front-a', 4.75, 22.375, 1, 'length'), part('front-b', 5.75, 22.375, 1, 'length'), part('front-c', 8.375, 22.375, 2, 'length')];

test.each(['densest', 'rip'].flatMap(method => ['visible', 'any', 'aligned'].map(grain => ({ method, grain }))))(
  'valid layouts for %j', mode => {
    const settings = { ...stock, ...mode };
    const result = layoutSheets(cabinet, settings);
    check(cabinet, settings, result);
    expect(result.materials[0].sheets).toHaveLength(1);
    // Trim and kerf are respected too.
    const trimmed = { ...settings, trim: 0.5, kerf: 0.25 };
    check(cabinet, trimmed, layoutSheets(cabinet, trimmed));
  });

test('densest packing fills sheets that a naive area estimate would overrun', () => {
  // Twelve 15 x 31 parts: 3 x 3 fit per 48 x 96 sheet only with 1/8 kerf considered.
  const parts = [part('p', 15, 31, 12)];
  for (const method of ['densest', 'rip']) {
    const settings = { ...stock, grain: 'aligned', method };
    const result = layoutSheets(parts, settings);
    check(parts, settings, result);
    expect(result.materials[0].sheets.map(s => s.placements.length)).toEqual([9, 3]);
  }
  // 16-inch-wide parts do not fit three across with kerf (3 x 16 + 2 x 1/8 > 48).
  const wide = [part('w', 16, 31, 6)];
  const result = layoutSheets(wide, { ...stock, grain: 'aligned', method: 'densest' });
  expect(result.materials[0].sheets.map(s => s.placements.length)).toEqual([6]);
  expect(Math.max(...result.materials[0].sheets[0].placements.map(p => p.y))).toBeCloseTo(16.125, 9);
});

test('grain mode decides whether parts may turn', () => {
  // A 40 x 20 part with grain along its length cannot use a 30-inch-long sheet; turned, it can.
  const short = { sheetLength: 30, sheetWidth: 48, kerf: 0, trim: 0, method: 'densest' };
  const graned = [part('g', 20, 40, 1, 'length')], loose = [part('g', 20, 40, 1, 'any')];
  expect(layoutSheets(graned, { ...short, grain: 'visible' })).toEqual({ ok: false,
    error: 'g does not fit on the usable 48 × 30 in sheet with its grain along the sheet.' });
  check(graned, { ...short, grain: 'any' }, layoutSheets(graned, { ...short, grain: 'any' }));
  check(loose, { ...short, grain: 'visible' }, layoutSheets(loose, { ...short, grain: 'visible' }));
  expect(layoutSheets(loose, { ...short, grain: 'aligned' }).ok).toBe(false);
  // Turning hidden parts packs tighter than keeping every grain aligned.
  const mixed = [part('long', 10, 90, 3, 'length'), part('hidden', 40, 6, 4, 'any')];
  const visible = layoutSheets(mixed, { ...stock, grain: 'visible', method: 'densest' });
  const aligned = layoutSheets(mixed, { ...stock, grain: 'aligned', method: 'densest' });
  check(mixed, { ...stock, grain: 'visible', method: 'densest' }, visible);
  expect(visible.materials[0].sheets.length).toBeLessThan(aligned.materials[0].sheets.length);
  expect(visible.materials[0].sheets[0].placements.some(p => p.turned)).toBe(true);
});

test('rip-first fills partly used strips, trimming parts to width, before ripping new ones', () => {
  const parts = [part('a', 20, 40, 2), part('b', 10, 40, 2), part('c', 10, 15, 2)];
  for (const method of ['rip', 'densest']) {
    const settings = { ...stock, grain: 'aligned', method };
    check(parts, settings, layoutSheets(parts, settings));
  }
  const ripped = sheet => Math.max(...sheet.strips.map(st => st.y + st.width));
  const trimmed = sheet => sheet.placements.filter(p => sheet.strips.find(st => st.y === p.y).width > p.across);
  // Even with room for a third strip, one 10-inch part shares the 20-inch strip and is trimmed,
  // so the strips take 30 1/8 inches of the sheet's width rather than 40 1/4.
  for (const sheetWidth of [48, 30.25]) {
    const settings = { ...stock, sheetWidth, grain: 'aligned', method: 'rip' };
    const layout = layoutSheets(parts, settings);
    check(parts, settings, layout);
    const [sheet] = layout.materials[0].sheets;
    expect(layout.materials[0].sheets).toHaveLength(1);
    expect(sheet.strips.map(st => st.width).sort((a, b) => a - b)).toEqual([10, 20]);
    expect(ripped(sheet)).toBeCloseTo(30.125, 6);
    expect(trimmed(sheet)).toHaveLength(1);
  }
  // A drawer cabinet's 1/2-inch sides and backs: one strip per width took 25 3/8 inches; filling
  // partly used strips takes four strips, 17.1354 inches.
  const half = [part('side-1', 4.8542, 16.5, 2), part('side-2', 4.1354, 16.5, 10), part('back-1', 4.3542, 22.375, 1), part('back-2', 3.6354, 22.375, 5)]
    .map(p => ({ ...p, material: '1/2″ plywood', thickness: 0.5 }));
  const settings = { ...stock, grain: 'visible', method: 'rip' };
  const layout = layoutSheets(half, settings);
  check(half, settings, layout);
  const [sheet] = layout.materials[0].sheets;
  expect(sheet.strips).toHaveLength(4);
  expect(ripped(sheet)).toBeCloseTo(4.8542 + 2 * 4.1354 + 3.6354 + 3 * 0.125, 6);
});

test('materials lay out separately, thickest first', () => {
  const parts = [part('ply', 10, 10, 1, 'any', '1/4″ plywood', 0.25), part('case', 10, 10, 1)];
  const result = layoutSheets(parts, { ...stock, grain: 'visible', method: 'densest' });
  expect(result.materials.map(m => [m.material, m.sheets.length])).toEqual([['3/4″ plywood', 1], ['1/4″ plywood', 1]]);
});

test.each([[{ sheetLength: 0 }, 'positive sheet size'], [{ kerf: -1 }, 'kerf'], [{ trim: 24 }, 'no usable sheet']])(
  'rejects invalid settings %j', (change, message) => {
    const result = layoutSheets(cabinet, { ...stock, grain: 'visible', method: 'densest', ...change });
    expect(result.ok).toBe(false);
    expect(result.error).toContain(message);
  });

test('parses the source contract', () => {
  const echo = 'ECHO: "SHEET_PARTS_V1", [["case-side", "Case sides", "3/4″ plywood", 2, 0.75, 18, 30, "length", ["case-left", "case-right"]]]\n' +
    'ECHO: "SHEET_STOCK_V1", [96, 48, 0.125, 0]';
  expect(parseSheetParts(echo)).toEqual([{ id: 'case-side', name: 'Case sides', material: '3/4″ plywood', quantity: 2,
    thickness: 0.75, width: 18, length: 30, grain: 'length', swatches: ['case-left', 'case-right'] }]);
  expect(parseSheetStock(echo)).toEqual({ sheetLength: 96, sheetWidth: 48, kerf: 0.125, trim: 0 });
  expect(parseSheetParts('ECHO: "OTHER"')).toEqual([]);
  expect(() => parseSheetParts('ECHO: "SHEET_PARTS_V1", [["a", "A", "ply", 1, 1, 1, 1, "sideways", []]]')).toThrow();
  expect(() => parseSheetStock('ECHO: "SHEET_STOCK_V1", [96, 48, -1, 0]')).toThrow();
  expect([0, 25, 26, 27, 701].map(partKey)).toEqual(['A', 'Z', 'AA', 'AB', 'ZZ']);
});
