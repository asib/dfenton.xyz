// Loaded only on download: the sheet layout on US Letter pages, two sheets to a page, for
// printing. Each page keys the parts on it; rip-first sheets also list their cuts. Like the
// drawings PDF, it embeds the font it measures with and sets every colour explicitly.
import { renderToStaticMarkup } from 'react-dom/server';
import { jsPDF } from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';
import { inches } from './cutList';
import { fontFamily, loadFonts } from './drawingPdf';
import { ripSteps } from './sheetLayout';
import { SheetLayoutPage } from './SheetLayoutPages';
import { CONTENT, FOOTER, HEADER, LINE, MARGIN, PAGE_HEIGHT, PAGE_WIDTH, SMALL, type SheetLayoutPrint } from './sheetLayoutPrint';

const legend = 'Sizes read along × across the sheet; face grain runs along its length. Dashed outline: part turned 90°, grain across it. ' +
  'Shaded: trimmed off after crosscutting. Dashed lines across the sheet: rip cuts.';
const percent = (value: number) => `${String(Math.round(value * 100))}%`;

// Greedy word wrap, measured with the font the PDF embeds.
function wrap(context: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && context.measureText(next).width > width) { lines.push(line); line = word; } else line = next;
  }
  return line ? [...lines, line] : lines;
}

export async function createSheetLayoutPdf(print: SheetLayoutPrint, signal: AbortSignal): Promise<Blob> {
  signal.throwIfAborted();
  const fonts = await loadFonts(signal);
  try {
    for (const font of fonts) document.fonts.add(font.face);
    const context = document.createElement('canvas').getContext('2d');
    if (!context) throw new Error('Could not measure the layout text.');
    context.font = `${String(SMALL)}px "${fontFamily}"`;
    const sheets = print.materials.flatMap(material => material.sheets.map((sheet, index) => ({
      caption: `${material.material} · sheet ${String(index + 1)} of ${String(material.sheets.length)} · ` +
        `${percent(sheet.placements.reduce((sum, p) => sum + p.along * p.across, 0) / (print.sheetLength * print.sheetWidth))} of sheet area used`,
      sheet, steps: print.method === 'rip' ? ripSteps(sheet).flatMap(step => wrap(context, step, CONTENT)) : [],
    })));
    if (!sheets.length) throw new Error('No sheets to print.');
    const pairs = Array.from({ length: Math.ceil(sheets.length / 2) }, (_, i) => sheets.slice(2 * i, 2 * i + 2));
    const legendLines = wrap(context, legend, CONTENT);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter', compress: true, putOnlyUsedFonts: true });
    pdf.setProperties({ title: `${print.title} — sheet layout`, subject: 'Plywood sheet layouts, two sheets to a page.', creator: 'dfenton.xyz CAD worksheets' });
    for (const font of fonts) {
      pdf.addFileToVFS(font.file, font.data);
      pdf.addFont(font.file, fontFamily, font.style);
    }
    for (const [index, pair] of pairs.entries()) {
      await new Promise<void>(resolve => { window.setTimeout(resolve, 0); });
      signal.throwIfAborted();
      // The parts on this page, in two columns, then the legend; the sheets share what's left.
      const entries = [...new Set(pair.flatMap(slot => slot.sheet.placements.map(p => p.key)))].sort((a, b) => a.length - b.length || a.localeCompare(b))
        .flatMap(key => {
          const part = print.parts[print.keys.indexOf(key)];
          return wrap(context, `${key}  ${part.name} · ${inches(part.width)} × ${inches(part.length)}″`, CONTENT / 2 - 6);
        });
      const half = Math.ceil(entries.length / 2), keyLines = [entries.slice(0, half), entries.slice(half)];
      const keyHeight = 12 + half * LINE + legendLines.length * LINE + 10;
      const height = (PAGE_HEIGHT - MARGIN - FOOTER - HEADER - keyHeight) / 2;
      const slots = pair.map(slot => ({ ...slot, height }));
      const container = document.createElement('div');
      // Only React-generated markup from the computed layout.
      container.innerHTML = renderToStaticMarkup(<SheetLayoutPage print={print} slots={slots} keyLines={keyLines} legendLines={legendLines} page={index + 1} pages={pairs.length} />);
      const svg = container.querySelector('svg');
      if (!svg) throw new Error('Could not build the layout page.');
      if (index > 0) pdf.addPage('letter', 'portrait');
      await svg2pdf(svg, pdf, { x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, loadExternalStyleSheets: false, loadImages: false });
      signal.throwIfAborted();
    }
    return pdf.output('blob');
  } finally {
    for (const font of fonts) document.fonts.delete(font.face);
  }
}
