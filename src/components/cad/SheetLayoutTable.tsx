import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { PartColor } from '../../misc';
import { csvCell, inches, type CutListOutput } from './cutList';
import { layoutSheets, parseSheetParts, parseSheetStock, partKey, ripSteps, type GrainMode, type LaidSheet, type LayoutMethod, type MaterialLayout } from './sheetLayout';
import { sheetLayoutDefaults, type DraftUpdate, type SheetLayoutDraft } from './worksheets';

const number = (text: string) => text.trim() === '' ? NaN : Number(text);
const methods: Record<LayoutMethod, string> = { densest: 'Densest nesting', rip: 'Rip first, then crosscut' };
const grains: Record<GrainMode, string> = { visible: 'Visible parts keep grain', any: 'Any part may turn', aligned: 'All grain along the sheet' };
const percent = (value: number) => `${String(Math.round(value * 100))}%`;

function SheetDiagram({ sheet, material, index, total, length, width, trim, palette }: {
  sheet: LaidSheet; material: string; index: number; total: number; length: number; width: number; trim: number; palette: PartColor[];
}) {
  const color = (ids: string[]) => palette.find(p => ids.includes(p.id));
  const stripOf = (y: number) => sheet.strips?.find(s => Math.abs(s.y - y) < 1e-6);
  const label = `${material}, sheet ${String(index + 1)} of ${String(total)}: ${sheet.placements.map(p => p.key).join(', ')}`;
  return <svg className="cad-sheet-diagram" viewBox={`-1 -1 ${String(length + 2)} ${String(width + 2)}`} role="img" aria-label={label}>
    <rect className="cad-sheet-stock" x="0" y="0" width={length} height={width} />
    {trim > 0 && <rect className="cad-sheet-trim" x={trim} y={trim} width={length - 2 * trim} height={width - 2 * trim} />}
    {sheet.strips?.map((strip, i) => <line key={i} className="cad-sheet-rip" x1="0" x2={length} y1={strip.y + strip.width} y2={strip.y + strip.width} />)}
    {sheet.placements.map((p, i) => {
      const swatch = color(p.part.swatches);
      const strip = stripOf(p.y);
      const size = Math.min(3.2, p.across * 0.42, p.along * 0.28);
      const detail = Math.min(1.6, p.across * 0.16, p.along / 12);
      return <g key={i} className={`cad-sheet-part${p.turned ? ' cad-sheet-turned' : ''}`}
        style={swatch ? { '--part-color': swatch.color, '--part-dark-color': swatch.darkColor } as CSSProperties : undefined}>
        <rect x={p.x} y={p.y} width={p.along} height={p.across} />
        {strip && strip.width - p.across > 1e-6 && <rect className="cad-sheet-trim-off" x={p.x} y={p.y + p.across} width={p.along} height={strip.width - p.across} />}
        <text x={p.x + p.along / 2} y={p.y + p.across / 2 + (detail >= 0.8 ? -size * 0.15 : size * 0.35)} fontSize={size} textAnchor="middle">{p.key}</text>
        {detail >= 0.8 && <text x={p.x + p.along / 2} y={p.y + p.across / 2 + size * 0.45 + detail * 0.6} fontSize={detail} textAnchor="middle">
          {inches(p.along)} × {inches(p.across)}{p.turned ? ' ↻' : ''}
        </text>}
      </g>;
    })}
  </svg>;
}

export default function SheetLayoutTable({ output, title, filename, palette = [], draft, onDraft }: {
  output: CutListOutput; title: string; filename: string; palette?: PartColor[];
  draft: SheetLayoutDraft; onDraft: DraftUpdate<SheetLayoutDraft>;
}) {
  const parsed = useMemo(() => {
    try { return { parts: parseSheetParts(output.text), stock: parseSheetStock(output.text), error: '' }; }
    catch { return { parts: [], stock: null, error: 'The model’s sheet-goods parts could not be read. Update the model to try again.' }; }
  }, [output.text]);
  // The viewer keeps the settings, as edits from the defaults.
  const method = draft.method ?? sheetLayoutDefaults.method;
  const grain = draft.grain ?? sheetLayoutDefaults.grain;
  const defaults = parsed.stock ?? { sheetLength: 96, sheetWidth: 48, kerf: 0.125, trim: 0 };
  const field = (key: keyof typeof defaults) => draft[key] ?? String(defaults[key]);
  const settings = { sheetLength: number(field('sheetLength')), sheetWidth: number(field('sheetWidth')),
    kerf: number(field('kerf')), trim: number(field('trim')), grain, method };
  const layout = useMemo(() => layoutSheets(parsed.parts, settings),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- settings is rebuilt from these values.
    [parsed.parts, settings.sheetLength, settings.sheetWidth, settings.kerf, settings.trim, grain, method]);
  // A printable PDF, two sheets to a US Letter page; a changed layout cancels one in progress.
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfStatus, setPdfStatus] = useState('');
  const pdfJob = useRef<AbortController>();
  useEffect(() => () => { pdfJob.current?.abort(); }, [layout, output.stale]);
  if (parsed.error) return <p className="cad-error" role="alert">{parsed.error}</p>;
  if (!parsed.parts.length) return null;
  const keys = parsed.parts.map((_, i) => partKey(i));
  const sheetArea = settings.sheetLength * settings.sheetWidth;
  const used = (m: MaterialLayout) => m.partArea / (m.sheets.length * sheetArea);

  const download = () => {
    if (!layout.ok) return;
    const csv: (string | number)[][] = [
      [`${title} sheet layout — dimensions in inches`],
      ['Method', methods[method]], ['Grain', grains[grain]], ['Sheet length', settings.sheetLength], ['Sheet width', settings.sheetWidth],
      ['Saw kerf', settings.kerf], ['Edge trim', settings.trim], [],
      ['Material', 'Sheets', 'Sheet area used'],
      ...layout.materials.map(m => [m.material, m.sheets.length, percent(used(m))]), [],
      ['Key', 'Part', 'Material', 'Qty', 'Width', 'Length', 'Face grain'],
      ...parsed.parts.map((p, i) => [keys[i], p.name, p.material, p.quantity, p.width, p.length, p.grain === 'length' ? 'Along length' : 'Either way']), [],
      ['Material', 'Sheet', 'Key', 'Part', 'X along sheet length', 'Y across sheet width', 'Size along length', 'Size across width', 'Turned 90°', 'Strip width'],
      ...layout.materials.flatMap(m => m.sheets.flatMap((sheet, s) => sheet.placements.map(p => [m.material, s + 1, p.key, p.part.name,
        p.x, p.y, p.along, p.across, p.turned ? 'Yes' : 'No', sheet.strips?.find(strip => Math.abs(strip.y - p.y) < 1e-6)?.width ?? '']))),
      [], ['X runs along the sheet length from its left end; Y runs across from the top edge. Positions include the edge trim. Face grain runs along the sheet length.'],
    ];
    const url = URL.createObjectURL(new Blob([csv.map(row => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = filename; link.click();
    window.setTimeout(() => { URL.revokeObjectURL(url); }, 1000);
  };
  const downloadPdf = async () => {
    if (!layout.ok || output.stale || pdfJob.current) return;
    const job = new AbortController();
    pdfJob.current = job;
    setPdfBusy(true);
    setPdfStatus('Preparing the printable layout…');
    try {
      const { createSheetLayoutPdf } = await import('./sheetLayoutPdf');
      const blob = await createSheetLayoutPdf({
        title, materials: layout.materials, parts: parsed.parts, keys, palette, method, trim: settings.trim,
        sheetLength: settings.sheetLength, sheetWidth: settings.sheetWidth,
        settings: `${methods[method]} · ${grains[grain]} · ${inches(settings.sheetWidth)} × ${inches(settings.sheetLength)}″ sheets · ` +
          `${inches(settings.kerf)}″ kerf · ${inches(settings.trim)}″ edge trim · inches`,
      }, job.signal);
      job.signal.throwIfAborted();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = filename.replace(/\.csv$/, '.pdf'); link.click();
      window.setTimeout(() => { URL.revokeObjectURL(url); }, 1000);
      setPdfStatus('PDF downloaded: two sheets to a US Letter page, ready to print.');
    } catch {
      setPdfStatus(job.signal.aborted ? 'The layout changed. Download again when it is up to date.' : 'Could not create the PDF. Please try again.');
    } finally {
      pdfJob.current = undefined;
      setPdfBusy(false);
    }
  };
  const edit = (key: keyof typeof defaults) => (event: { target: { value: string } }) => { onDraft(previous => ({ ...previous, [key]: event.target.value })); };

  return <section className="cad-cut-list cad-sheet-layout" aria-labelledby="sheet-layout-title">
    <div className="cad-cut-list-heading">
      <h2 id="sheet-layout-title">Sheet layout <span>· inches</span></h2>
      <div className="cad-worksheet-downloads">
        <button type="button" onClick={() => { void downloadPdf(); }} disabled={output.stale || !layout.ok || pdfBusy}
          title="Two sheets to a US Letter page, with each page's parts and, ripping first, the cuts">{pdfBusy ? 'Preparing PDF…' : 'Download PDF ↓'}</button>
        <button type="button" onClick={download} disabled={output.stale || !layout.ok}>Download CSV ↓</button>
      </div>
    </div>
    {pdfStatus && <p className="cad-worksheet-help" role="status">{pdfStatus}</p>}
    {output.stale && <p className="cad-error" role="status">Previous settings — these layouts will update after the model regenerates successfully.</p>}
    <p className="cad-worksheet-help">Plywood parts are laid out on full sheets at finished size, grouped by thickness. Densest nesting uses straight through-cuts in any order. Rip first cuts full-length strips along the sheet, then crosscuts each strip; a part narrower than its strip is trimmed to width last. Face grain runs along the sheet length. Layout settings last until you leave or reload this page; saved configurations and copied links keep them.</p>
    <fieldset className="cad-stock-allowances cad-sheet-options">
      <legend>Layout</legend>
      <label>Method<select value={method} onChange={event => { onDraft(previous => ({ ...previous, method: event.target.value as LayoutMethod })); }}>
        {Object.entries(methods).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select></label>
      <label>Grain<select value={grain} onChange={event => { onDraft(previous => ({ ...previous, grain: event.target.value as GrainMode })); }}>
        {Object.entries(grains).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select></label>
    </fieldset>
    <fieldset className="cad-stock-allowances">
      <legend>Sheet stock</legend>
      <label>Sheet length (in)<input type="number" min="0" step="any" required value={field('sheetLength')} onChange={edit('sheetLength')} /></label>
      <label>Sheet width (in)<input type="number" min="0" step="any" required value={field('sheetWidth')} onChange={edit('sheetWidth')} /></label>
      <label>Saw kerf (in)<input type="number" min="0" step="any" required value={field('kerf')} onChange={edit('kerf')} /></label>
      <label>Edge trim (in)<input type="number" min="0" step="any" required value={field('trim')} onChange={edit('trim')} /></label>
    </fieldset>
    <div className="cad-table-scroll" tabIndex={0} role="region" aria-label="Sheet-goods parts, scroll horizontally for all columns">
      <table className="cad-sheet-parts">
        <caption className="sr-only">Plywood parts with their layout keys, finished sizes in inches and grain requirement</caption>
        <thead><tr>{['Key', 'Part', 'Material', 'Qty', 'Width', 'Length', 'Face grain'].map(h => <th key={h} scope="col">{h}</th>)}</tr></thead>
        <tbody>{parsed.parts.map((part, i) => <tr key={part.id} data-part={part.id}>
          <td>{keys[i]}</td>
          <th scope="row"><span className="cad-blank-swatches">{palette.filter(p => part.swatches.includes(p.id)).map(p => <i key={p.id} className="cad-part-swatch" aria-hidden="true" title={p.label}
            style={{ '--part-color': p.color, '--part-dark-color': p.darkColor } as CSSProperties} />)}</span>{part.name}</th>
          <td>{part.material}</td><td>{part.quantity}</td>
          <td className="cad-size-cell">{inches(part.width)}</td><td className="cad-size-cell">{inches(part.length)}</td>
          <td>{part.grain === 'length' ? 'Along length' : 'Either way'}</td>
        </tr>)}</tbody>
      </table>
    </div>
    {!layout.ok ? <p className="cad-error" role="alert">{layout.error} CSV export is unavailable until corrected.</p> : <>
      <ul className="cad-sheet-summary">{layout.materials.map(m => <li key={m.material}>
        <strong>{m.material}:</strong> {m.sheets.length} {m.sheets.length === 1 ? 'sheet' : 'sheets'} of {inches(settings.sheetWidth)} × {inches(settings.sheetLength)}″ · {percent(used(m))} of sheet area used
      </li>)}</ul>
      <p className="cad-worksheet-help">Letters match the part table. Sizes read along × across the sheet; ↻ and a dashed outline mark parts turned 90°, with their face grain across the part. {method === 'rip' ? 'Dashed lines are rip cuts; shaded strips beside a part are trimmed off after crosscutting.' : ''}</p>
      {layout.materials.map(m => m.sheets.map((sheet, s) => <figure key={`${m.material}-${String(s)}`} className="cad-sheet-figure">
        <figcaption><strong>{m.material}</strong> · sheet {s + 1} of {m.sheets.length}</figcaption>
        <div className="cad-table-scroll cad-sheet-scroll" tabIndex={0} role="region" aria-label={`${m.material} sheet ${String(s + 1)} layout, scroll horizontally on small screens`}>
          <SheetDiagram sheet={sheet} material={m.material} index={s} total={m.sheets.length} length={settings.sheetLength} width={settings.sheetWidth} trim={settings.trim} palette={palette} />
        </div>
        {method === 'rip' && <ol className="cad-sheet-steps">{ripSteps(sheet).map((step, i) => <li key={i}>{step}</li>)}</ol>}
      </figure>))}
    </>}
  </section>;
}
