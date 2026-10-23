import { expect, test } from 'bun:test';
import { emptyWorksheets, loadWorksheets, saveWorksheets } from '../src/components/cad/worksheets';

const drafts = {
  sheetLayout: { method: 'rip', grain: 'visible', sheetLength: '60', kerf: '0.1' },
  cutList: { thicknessExtra: '0.25', extraPercent: '30', thicknesses: { b: '2', a: 'auto' }, layouts: { a: 'together', b: 'auto' }, preparation: { resawKerf: '0.1' } },
};
const saved = {
  sheetLayout: { method: 'rip', sheetLength: 60, kerf: 0.1 },
  cutList: { extraPercent: 30, thicknesses: { b: '2' }, layouts: { a: 'together' }, preparation: { resawKerf: 0.1 } },
};

test('saving keeps edited settings as numbers, without fixed defaults or Auto', () => {
  expect(saveWorksheets(drafts)).toEqual({ saved, invalid: [] });
  // Unchanged worksheets save nothing.
  expect(saveWorksheets(emptyWorksheets)).toEqual({ saved: {}, invalid: [] });
  expect(saveWorksheets({ sheetLayout: { method: 'densest' }, cutList: { thicknesses: { a: 'auto' } } }).saved).toEqual({});
  // Settings the model supplies keep an edit even when it matches today's default.
  expect(saveWorksheets({ sheetLayout: { kerf: '0.125' }, cutList: {} }).saved).toEqual({ sheetLayout: { kerf: 0.125 } });
});

test('saving reports typed values the inputs would reject', () => {
  const { invalid } = saveWorksheets({
    sheetLayout: { sheetLength: '', sheetWidth: '0', kerf: '-1', trim: '0' },
    cutList: { widthExtra: 'abc', preparation: { sawMinLength: '0' } },
  });
  expect(invalid).toEqual(['Sheet layout: Sheet length', 'Sheet layout: Sheet width', 'Sheet layout: Saw kerf', 'Cut list: Extra width', 'Cut list: Table saw minimum length']);
});

test('saved settings load back as the same drafts', () => {
  const { drafts: loaded, dropped } = loadWorksheets(saved);
  expect(dropped).toEqual([]);
  expect(loaded).toEqual({
    sheetLayout: { method: 'rip', sheetLength: '60', kerf: '0.1' },
    cutList: { extraPercent: '30', thicknesses: { b: '2' }, layouts: { a: 'together' }, preparation: { resawKerf: '0.1' } },
  });
  expect(saveWorksheets(loaded).saved).toEqual(saved);
  // Older saves and links have none.
  expect(loadWorksheets(undefined)).toEqual({ drafts: emptyWorksheets, dropped: [] });
});

test('invalid or unknown saved settings fall back to defaults and are named', () => {
  const { drafts: loaded, dropped } = loadWorksheets({
    sheetLayout: { method: 'spiral', sheetLength: -5, sheetWidth: '48', trim: 0.5, colour: 'red' },
    cutList: { extraPercent: Number.NaN, thicknesses: { a: '7', b: 2, c: '1.5' }, layouts: ['together'], preparation: { resawKerf: 0, sawMinLength: 12 } },
    drawings: {},
  });
  expect(loaded).toEqual({ sheetLayout: { trim: '0.5' }, cutList: { thicknesses: { c: '1.5' }, preparation: { sawMinLength: '12' } } });
  expect(dropped).toEqual(['Sheet layout: Method', 'Sheet layout: Sheet length', 'Sheet layout: Sheet width', 'Sheet layout: colour',
    'Cut list: Extra board feet', 'Cut list: a rough thickness', 'Cut list: b rough thickness', 'Cut list: stock preparation',
    'Cut list: Bandsaw kerf', 'Worksheet settings: drawings']);
  expect(loadWorksheets('rip')).toEqual({ drafts: emptyWorksheets, dropped: ['Worksheet settings'] });
});

test('keys from untrusted links never reach prototypes', () => {
  expect(loadWorksheets({ sheetLayout: { toString: 1, constructor: 'x' } }).dropped).toEqual(['Sheet layout: toString', 'Sheet layout: constructor']);
  const { drafts: loaded } = loadWorksheets(JSON.parse('{"cutList":{"thicknesses":{"__proto__":"2"},"__proto__":{"polluted":1}}}'));
  expect(Object.getPrototypeOf(loaded.cutList.thicknesses)).toBe(Object.prototype);
  expect({}.polluted).toBeUndefined();
});
