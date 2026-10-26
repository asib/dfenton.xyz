import { inches } from './cutList';
import { fontFamily } from './drawingPdf';
import type { LaidSheet } from './sheetLayout';
import { CONTENT, FOOTER, HEADER, LINE, MARGIN, PAGE_HEIGHT, PAGE_WIDTH, SMALL, type SheetLayoutPrint, type Slot } from './sheetLayoutPrint';

// Printed sheet layout pages: two sheet diagrams with their captions and cuts, then the
// parts on the page and a legend. Every colour and stroke is explicit for svg2pdf.
function SheetFigure({ print, sheet, x, y, width }: { print: SheetLayoutPrint; sheet: LaidSheet; x: number; y: number; width: number }) {
  const { sheetLength: length, sheetWidth: across, trim } = print;
  // Points per inch; strokes and dashes are given in points.
  const scale = width / length, pt = (points: number) => points / scale;
  const dash = `${String(pt(3))} ${String(pt(2))}`;
  const color = (ids: string[]) => print.palette.find(part => ids.includes(part.id))?.color ?? '#bbbbbb';
  const stripOf = (y0: number) => sheet.strips?.find(strip => Math.abs(strip.y - y0) < 1e-6);
  return <g transform={`translate(${String(x)} ${String(y)}) scale(${String(scale)})`}>
    <rect x="0" y="0" width={length} height={across} fill="#ffffff" stroke="#111111" strokeWidth={pt(1)} />
    {trim > 0 && <rect x={trim} y={trim} width={length - 2 * trim} height={across - 2 * trim} fill="none" stroke="#888888" strokeWidth={pt(0.6)} strokeDasharray={dash} />}
    {sheet.strips?.map((strip, i) => <line key={i} x1="0" x2={length} y1={strip.y + strip.width} y2={strip.y + strip.width}
      stroke="#555555" strokeWidth={pt(0.6)} strokeDasharray={dash} />)}
    {sheet.placements.map((p, i) => {
      const strip = stripOf(p.y);
      const size = Math.min(3.2, p.across * 0.42, p.along * 0.28), detail = Math.min(1.6, p.across * 0.16, p.along / 12);
      // Sizes are left off parts too small to label legibly.
      const sized = detail * scale >= 5;
      return <g key={i}>
        <rect x={p.x} y={p.y} width={p.along} height={p.across} fill={color(p.part.swatches)} fillOpacity="0.3"
          stroke="#222222" strokeWidth={pt(0.7)} strokeDasharray={p.turned ? dash : undefined} />
        {strip && strip.width - p.across > 1e-6 && <rect x={p.x} y={p.y + p.across} width={p.along} height={strip.width - p.across} fill="#8a8a8a" fillOpacity="0.45" />}
        <text x={p.x + p.along / 2} y={p.y + p.across / 2 + (sized ? -size * 0.15 : size * 0.35)} fontSize={size} fontWeight="bold" textAnchor="middle" fill="#111111">{p.key}</text>
        {sized && <text x={p.x + p.along / 2} y={p.y + p.across / 2 + size * 0.45 + detail * 0.6} fontSize={detail} textAnchor="middle" fill="#333333">
          {inches(p.along)} × {inches(p.across)}
        </text>}
      </g>;
    })}
  </g>;
}

export function SheetLayoutPage({ print, slots, keyLines, legendLines, page, pages }: {
  print: SheetLayoutPrint; slots: Slot[]; keyLines: string[][]; legendLines: string[]; page: number; pages: number;
}) {
  let y = HEADER;
  const keyTop = PAGE_HEIGHT - MARGIN - FOOTER - (12 + Math.max(...keyLines.map(column => column.length)) * LINE + legendLines.length * LINE);
  return <svg xmlns="http://www.w3.org/2000/svg" width={PAGE_WIDTH} height={PAGE_HEIGHT} viewBox={`0 0 ${String(PAGE_WIDTH)} ${String(PAGE_HEIGHT)}`}
    fontFamily={fontFamily} fill="#111111">
    <rect width={PAGE_WIDTH} height={PAGE_HEIGHT} fill="#ffffff" />
    <text x={MARGIN} y="48" fontSize="14" fontWeight="bold">{print.title} — sheet layout</text>
    <text x={MARGIN} y="63" fontSize="9" fill="#444444">{print.settings}</text>
    {slots.map((slot, i) => {
      const top = y;
      y += slot.height;
      const figureHeight = Math.max(40, slot.height - 16 - slot.steps.length * LINE - 14);
      const width = Math.min(CONTENT, figureHeight * print.sheetLength / print.sheetWidth);
      const height = width * print.sheetWidth / print.sheetLength;
      return <g key={i}>
        <text x={MARGIN} y={top + 10} fontSize="10.5" fontWeight="bold">{slot.caption}</text>
        <SheetFigure print={print} sheet={slot.sheet} x={MARGIN} y={top + 16} width={width} />
        {slot.steps.map((step, j) => <text key={j} x={MARGIN} y={top + 16 + height + 12 + j * LINE} fontSize={SMALL}>{step}</text>)}
      </g>;
    })}
    <text x={MARGIN} y={keyTop + 9} fontSize="9" fontWeight="bold">Parts on this page</text>
    {keyLines.map((column, c) => column.map((line, j) => <text key={`${String(c)}-${String(j)}`} x={MARGIN + c * (CONTENT / 2 + 6)} y={keyTop + 12 + (j + 1) * LINE} fontSize={SMALL}>{line}</text>))}
    {legendLines.map((line, j) => <text key={j} x={MARGIN} y={keyTop + 12 + (Math.max(...keyLines.map(column => column.length)) + j + 1) * LINE} fontSize={SMALL} fill="#444444">{line}</text>)}
    <text x={PAGE_WIDTH / 2} y={PAGE_HEIGHT - 20} fontSize="8" textAnchor="middle" fill="#444444">
      Page {page} of {pages} · Not to scale · Use written dimensions
    </text>
  </svg>;
}

