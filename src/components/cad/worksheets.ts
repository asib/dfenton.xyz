import type { StockLayoutMode, StockPreparation } from './cutList';
import type { GrainMode, LayoutMethod } from './sheetLayout';

// Worksheet settings, kept by the viewer. While editing, each table keeps only the
// fields changed from its defaults, as typed.
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
export type DraftUpdate<T> = (update: (previous: T) => T) => void;

export const emptyWorksheets: WorksheetDrafts = { sheetLayout: {}, cutList: {} };
export const sheetLayoutDefaults = { method: 'densest', grain: 'visible' } as const;
export const cutListDefaults: Record<AllowanceField, string> = { thicknessExtra: '0.25', widthExtra: '0.5', lengthExtra: '1', crosscutKerf: '0.125', extraPercent: '20' };
