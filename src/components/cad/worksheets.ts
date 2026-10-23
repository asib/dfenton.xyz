import { stockThicknesses, type StockLayoutMode, type StockPreparation } from './cutList';
import type { GrainMode, LayoutMethod } from './sheetLayout';

// Worksheet settings that travel with saved configurations and share links. While
// editing, each table keeps only the fields changed from its defaults, as typed.
// Saved settings keep the valid ones, numbers as numbers, without fixed defaults.
type SheetField = 'sheetLength' | 'sheetWidth' | 'kerf' | 'trim';
type AllowanceField = 'thicknessExtra' | 'widthExtra' | 'lengthExtra' | 'crosscutKerf' | 'extraPercent';
export interface SheetLayoutDraft extends Partial<Record<SheetField, string>> { method?: LayoutMethod; grain?: GrainMode }
export interface CutListDraft extends Partial<Record<AllowanceField, string>> {
  // Rough thickness and stock layout, by cut-list part ID.
  thicknesses?: Partial<Record<string, string>>;
  layouts?: Partial<Record<string, StockLayoutMode>>;
  preparation?: Partial<Record<keyof StockPreparation, string>>;
}
export interface WorksheetDrafts { sheetLayout: SheetLayoutDraft; cutList: CutListDraft }
export type SavedWorksheets = Record<string, unknown>;
export type DraftUpdate<T> = (update: (previous: T) => T) => void;

export const emptyWorksheets: WorksheetDrafts = { sheetLayout: {}, cutList: {} };
export const sheetLayoutDefaults = { method: 'densest', grain: 'visible' } as const;
export const cutListDefaults: Record<AllowanceField, string> = { thicknessExtra: '0.25', widthExtra: '0.5', lengthExtra: '1', crosscutKerf: '0.125', extraPercent: '20' };

// A number above zero, a number of zero or more, or one of a list of choices. Fields
// with a fixed default leave it out when saving; the model supplies the other defaults.
interface Field { label: string; kind: 'positive' | 'nonNegative' | readonly string[]; fixedDefault?: string }
const sheetLayoutFields: Record<string, Field> = {
  method: { label: 'Method', kind: ['densest', 'rip'], fixedDefault: sheetLayoutDefaults.method },
  grain: { label: 'Grain', kind: ['visible', 'any', 'aligned'], fixedDefault: sheetLayoutDefaults.grain },
  sheetLength: { label: 'Sheet length', kind: 'positive' },
  sheetWidth: { label: 'Sheet width', kind: 'positive' },
  kerf: { label: 'Saw kerf', kind: 'nonNegative' },
  trim: { label: 'Edge trim', kind: 'nonNegative' },
};
const cutListFields: Record<string, Field> = {
  thicknessExtra: { label: 'Jointing/planing thickness', kind: 'nonNegative', fixedDefault: cutListDefaults.thicknessExtra },
  widthExtra: { label: 'Extra width', kind: 'nonNegative', fixedDefault: cutListDefaults.widthExtra },
  lengthExtra: { label: 'Extra length per blank', kind: 'nonNegative', fixedDefault: cutListDefaults.lengthExtra },
  crosscutKerf: { label: 'Crosscut kerf', kind: 'nonNegative', fixedDefault: cutListDefaults.crosscutKerf },
  extraPercent: { label: 'Extra board feet', kind: 'nonNegative', fixedDefault: cutListDefaults.extraPercent },
};
const preparationFields: Record<string, Field> = {
  millingMinLength: { label: 'Jointer/planer minimum length', kind: 'positive' },
  sawMinLength: { label: 'Table saw minimum length', kind: 'positive' },
  resawKerf: { label: 'Bandsaw kerf', kind: 'positive' },
  resawCleanup: { label: 'Cleanup thickness per half', kind: 'positive' },
};
const thicknessField: Field = { label: 'rough thickness', kind: ['auto', ...stockThicknesses.map(String)], fixedDefault: 'auto' };
const layoutField: Field = { label: 'stock preparation', kind: ['auto', 'separate', 'together'], fixedDefault: 'auto' };
// Per-part choices take their keys from the record itself, in a stable order.
const perPart = (record: object, field: Field): Record<string, Field> =>
  Object.fromEntries(Object.keys(record).sort().map(id => [id, { ...field, label: `${id} ${field.label}` }]));

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const own = (object: object, key: string) => Object.prototype.hasOwnProperty.call(object, key);
const parse = (text: string) => text.trim() === '' ? NaN : Number(text);
const numeric = (field: Field) => typeof field.kind === 'string';
const valid = (field: Field, value: unknown) => typeof field.kind === 'string'
  ? typeof value === 'number' && Number.isFinite(value) && (field.kind === 'positive' ? value > 0 : value >= 0)
  : typeof value === 'string' && field.kind.includes(value);
// Drop empty sections so unchanged worksheets save nothing.
const compact = (record: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(record).filter(([, value]) => !isRecord(value) || Object.keys(value).length > 0));

function saveSection(draft: object, fields: Record<string, Field>, section: string, invalid: string[]) {
  const saved: Record<string, string | number> = {};
  for (const [key, field] of Object.entries(fields)) {
    const text = (draft as Partial<Record<string, string>>)[key];
    if (text === undefined) continue;
    const value = numeric(field) ? parse(text) : text;
    if (!valid(field, value)) invalid.push(`${section}: ${field.label}`);
    else if (field.fixedDefault === undefined || value !== (numeric(field) ? Number(field.fixedDefault) : field.fixedDefault)) saved[key] = value;
  }
  return saved;
}

function loadSection(saved: Record<string, unknown>, fields: Record<string, Field>, section: string, dropped: string[]) {
  return Object.fromEntries(Object.entries(saved).flatMap(([key, value]) => {
    const field = own(fields, key) ? fields[key] : undefined;
    if (field && valid(field, value)) return [[key, String(value)]];
    dropped.push(`${section}: ${field?.label ?? key}`);
    return [];
  }));
}

// The settings to save, and the labels of fields whose typed value isn't valid.
export function saveWorksheets({ sheetLayout, cutList }: WorksheetDrafts): { saved: SavedWorksheets; invalid: string[] } {
  const invalid: string[] = [];
  const { thicknesses = {}, layouts = {}, preparation = {}, ...allowances } = cutList;
  const saved = compact({
    sheetLayout: saveSection(sheetLayout, sheetLayoutFields, 'Sheet layout', invalid),
    cutList: compact({
      ...saveSection(allowances, cutListFields, 'Cut list', invalid),
      thicknesses: saveSection(thicknesses, perPart(thicknesses, thicknessField), 'Cut list', invalid),
      layouts: saveSection(layouts, perPart(layouts, layoutField), 'Cut list', invalid),
      preparation: saveSection(preparation, preparationFields, 'Cut list', invalid),
    }),
  });
  return { saved, invalid };
}

// Saved settings as table drafts. Anything unknown or invalid is left at its default
// and named in `dropped`; missing settings (older saves and links) are defaults too.
export function loadWorksheets(saved: unknown): { drafts: WorksheetDrafts; dropped: string[] } {
  const dropped: string[] = [];
  const drafts: WorksheetDrafts = { sheetLayout: {}, cutList: {} };
  if (saved === undefined) return { drafts, dropped };
  if (!isRecord(saved)) return { drafts, dropped: ['Worksheet settings'] };
  for (const [section, value] of Object.entries(saved)) {
    if (section === 'sheetLayout' && isRecord(value)) {
      drafts.sheetLayout = loadSection(value, sheetLayoutFields, 'Sheet layout', dropped);
    } else if (section === 'cutList' && isRecord(value)) {
      const { thicknesses, layouts, preparation, ...allowances } = value;
      const cutList: CutListDraft = loadSection(allowances, cutListFields, 'Cut list', dropped);
      const nested = (record: unknown, label: string, fields: (record: Record<string, unknown>) => Record<string, Field>) => {
        if (record === undefined) return undefined;
        if (isRecord(record)) return loadSection(record, fields(record), 'Cut list', dropped);
        dropped.push(`Cut list: ${label}`);
        return undefined;
      };
      cutList.thicknesses = nested(thicknesses, 'rough thicknesses', record => perPart(record, thicknessField));
      cutList.layouts = nested(layouts, 'stock preparation', record => perPart(record, layoutField)) as CutListDraft['layouts'];
      cutList.preparation = nested(preparation, 'machine limits', () => preparationFields);
      drafts.cutList = Object.fromEntries(Object.entries(cutList).filter(([, item]) => item !== undefined));
    } else dropped.push(`Worksheet settings: ${section}`);
  }
  return { drafts, dropped };
}
