// Loaded only on download. The document uses the same SVG geometry and labels
// as the on-screen sheets, without depending on their current DOM or selection.
import { renderToStaticMarkup } from 'react-dom/server';
import { jsPDF } from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';
import { DrawingDocument } from './DrawingSheetPages';
import type { DrawingSheet } from './drawings';

const fontFamily = 'Liberation Sans';
const fontStyles = ['normal', 'bold'] as const;

async function loadFonts(signal: AbortSignal) {
  return Promise.all(fontStyles.map(async style => {
    const file = `liberation-sans-${style === 'normal' ? 'regular' : 'bold'}.ttf`;
    const response = await fetch(`/fonts/${file}`, { signal });
    if (!response.ok) throw new Error('Could not load drawing font.');
    const data = await response.arrayBuffer();
    // Browser text measurement and embedded PDF text must use the same font.
    const face = new FontFace(fontFamily, data, { weight: style === 'bold' ? '700' : '400' });
    await face.load();
    let binary = '';
    for (const byte of new Uint8Array(data)) binary += String.fromCharCode(byte);
    return { file, style, data: btoa(binary), face };
  }));
}

function printStyle(svg: SVGSVGElement) {
  const set = (selector: string, attributes: Record<string, string>) => {
    for (const element of svg.querySelectorAll(selector)) {
      for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
    }
  };
  // Explicit print palette and font sizes; no site CSS, theme, or raster images.
  svg.setAttribute('font-family', fontFamily);
  svg.setAttribute('fill', '#111111');
  svg.setAttribute('stroke', 'none');
  set('text', { fill: '#111111', stroke: 'none', 'font-size': '14' });
  set('.cad-drawing-edges', { fill: 'none', stroke: '#111111', 'stroke-width': '1.4', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
  set('.cad-drawing-dimension line', { stroke: '#404040', 'stroke-width': '0.7' });
  set('.cad-drawing-tick', { 'stroke-width': '1.4' });
  set('.cad-drawing-dimension text', { fill: '#333333', 'font-size': '14' });
  set('.cad-drawing-sheet-title', { 'font-size': '18', 'font-weight': 'bold' });
  set('.cad-drawing-sheet-meta', { 'font-size': '12' });
  set('.cad-drawing-view-title', { 'font-size': '14', 'font-weight': 'bold' });
  set('.cad-drawing-hatch', { stroke: '#aaaaaa', 'stroke-width': '0.8' });
  set('.cad-drawing-bearing', { stroke: '#116e66', 'stroke-width': '3', 'stroke-linecap': 'round' });
  set('.cad-drawing-guide', { stroke: '#116e66', 'stroke-width': '1.4', 'stroke-dasharray': '7 4' });
  for (const text of svg.querySelectorAll('.cad-drawing-sheet-meta')) {
    text.textContent = text.textContent.replace('SCREEN SCALE VARIES', 'DO NOT SCALE DRAWING');
  }
  // SVG paint-order isn't supported by the PDF converter. Opaque label boxes
  // replace the screen's white text halo without duplicating searchable text.
  const measure = document.createElement('canvas').getContext('2d');
  if (!measure) throw new Error('Could not measure drawing labels.');
  measure.font = `14px "${fontFamily}"`;
  for (const text of svg.querySelectorAll('.cad-drawing-dimension text')) {
    const metrics = measure.measureText(text.textContent);
    const box = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    box.setAttribute('x', String(Number(text.getAttribute('x')) - metrics.width / 2 - 3));
    box.setAttribute('y', String(Number(text.getAttribute('y')) - metrics.actualBoundingBoxAscent - 2));
    box.setAttribute('width', String(metrics.width + 6));
    box.setAttribute('height', String(metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent + 4));
    box.setAttribute('fill', '#ffffff');
    box.setAttribute('stroke', 'none');
    const transform = text.getAttribute('transform');
    if (transform) box.setAttribute('transform', transform);
    text.before(box);
  }
}

export async function createDrawingPdf(sheet: DrawingSheet, title: string, signal: AbortSignal): Promise<Blob> {
  signal.throwIfAborted();
  const container = document.createElement('div');
  // Only React-generated markup from validated drawing data, never raw source SVG.
  container.innerHTML = renderToStaticMarkup(<DrawingDocument sheet={sheet} title={title} />);
  const pages = [...container.querySelectorAll('svg')];
  if (!pages.length) throw new Error('No drawing sheets available.');
  const fonts = await loadFonts(signal);
  try {
    for (const font of fonts) document.fonts.add(font.face);
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter', compress: true, putOnlyUsedFonts: true });
    pdf.setProperties({ title: `${title} — dimensioned drawings`, subject: 'Current model dimensions; use written dimensions, not drawing scale.', creator: 'dfenton.xyz CAD drawings' });
    for (const font of fonts) {
      pdf.addFileToVFS(font.file, font.data);
      pdf.addFont(font.file, fontFamily, font.style);
    }
    for (const [index, svg] of pages.entries()) {
      // Let parameter edits/navigation run between pages, including cancellation.
      await new Promise<void>(resolve => { window.setTimeout(resolve, 0); });
      signal.throwIfAborted();
      printStyle(svg);
      const { width, height } = svg.viewBox.baseVal;
      const margin = 24, footer = 16;
      const landscape = Math.min((792 - 2 * margin) / width, (612 - 2 * margin - footer) / height);
      const portrait = Math.min((612 - 2 * margin) / width, (792 - 2 * margin - footer) / height);
      const orientation = landscape >= portrait ? 'landscape' : 'portrait';
      const pageWidth = orientation === 'landscape' ? 792 : 612, pageHeight = orientation === 'landscape' ? 612 : 792;
      if (index > 0) pdf.addPage('letter', orientation);
      else if (orientation === 'portrait') { pdf.deletePage(1); pdf.addPage('letter', orientation); }
      const scale = Math.max(landscape, portrait);
      await svg2pdf(svg, pdf, { x: (pageWidth - width * scale) / 2, y: margin,
        width: width * scale, height: height * scale, loadExternalStyleSheets: false, loadImages: false });
      signal.throwIfAborted();
      pdf.setFont(fontFamily, 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor('#444444');
      pdf.text(`Page ${String(index + 1)} of ${String(pages.length)} · Not to scale · Use written dimensions`, pageWidth / 2, pageHeight - 20, { align: 'center' });
    }
    return pdf.output('blob');
  } finally {
    for (const font of fonts) document.fonts.delete(font.face);
  }
}
