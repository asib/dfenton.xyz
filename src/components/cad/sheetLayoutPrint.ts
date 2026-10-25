import type { PartColor } from '../../misc';
import type { LaidSheet, LayoutMethod, MaterialLayout, SheetPart } from './sheetLayout';

// The sheet layout PDF's inputs and page geometry (points, US Letter portrait), shared by
// the generator (sheetLayoutPdf.tsx) and its pages (SheetLayoutPages.tsx).
export interface SheetLayoutPrint {
  title: string; materials: MaterialLayout[]; parts: SheetPart[]; keys: string[]; palette: PartColor[];
  sheetLength: number; sheetWidth: number; trim: number; method: LayoutMethod;
  // Method, grain, sheet size, kerf and trim, as one line.
  settings: string;
}
export interface Slot { caption: string; sheet: LaidSheet; steps: string[]; height: number }

export const PAGE_WIDTH = 612, PAGE_HEIGHT = 792, MARGIN = 36, CONTENT = PAGE_WIDTH - 2 * MARGIN;
export const LINE = 11, SMALL = 8.5, HEADER = 74, FOOTER = 20;
