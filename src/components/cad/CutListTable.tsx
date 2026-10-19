import { useMemo, useState, type CSSProperties } from 'react';
import type { PartColor } from '../../misc';
import { csvCell, groupCutList, inches, milledThickness, parseCutList, parseStockPreparation, roughDimensions, type CutListOutput, type CutPart, type StockPreparation } from './cutList';

const number = (text: string) => text.trim() === '' ? NaN : Number(text);

export default function CutListTable({ output, palette = [] }: { output: CutListOutput; palette?: PartColor[] }) {
  const parsed = useMemo(() => {
    try { return { parts: parseCutList(output.text), preparation: parseStockPreparation(output.text), error: '' }; }
    catch { return { parts: [], preparation: null, error: 'The model’s cut list could not be read. Update the model to try again.' }; }
  }, [output.text]);
  const [thicknesses, setThicknesses] = useState<Partial<Record<string, string>>>({});
  const [widthExtra, setWidthExtra] = useState('0.5');
  const [lengthExtra, setLengthExtra] = useState('1');
  const [preparationEdits, setPreparationEdits] = useState<Partial<Record<keyof StockPreparation, string>>>({});
  if (parsed.error) return <p className="cad-error" role="alert">{parsed.error}</p>;
  if (!parsed.parts.length) return null;

  const preparation = parsed.preparation && {
    millingMinLength: number(preparationEdits.millingMinLength ?? String(parsed.preparation.millingMinLength)),
    sawMinLength: number(preparationEdits.sawMinLength ?? String(parsed.preparation.sawMinLength)),
    resawKerf: number(preparationEdits.resawKerf ?? String(parsed.preparation.resawKerf)),
    resawCleanup: number(preparationEdits.resawCleanup ?? String(parsed.preparation.resawCleanup)),
  };
  const preparationValid = !preparation || Object.values(preparation).every((value) => Number.isFinite(value) && value > 0);
  const stockThickness = (part: CutPart) => {
    const value = thicknesses[part.id];
    return value === undefined ? milledThickness(part, preparation) : number(value);
  };
  const blanks = groupCutList(parsed.parts, stockThickness);
  const rows = blanks.map((part) => {
    return { part, rough: roughDimensions(part, stockThickness(part), number(widthExtra), number(lengthExtra), preparation) };
  });
  const valid = rows.every((row) => row.rough);
  const editThickness = (ids: string[], value: string) => {
    setThicknesses((previous) => ({ ...previous, ...Object.fromEntries(ids.map((id) => [id, value])) }));
  };
  const download = () => {
    const csv: (string | number)[][] = [
      ['Tool tote cut list — dimensions in inches'],
      ['Part name', 'Finish qty', 'Finish thickness', 'Finish width', 'Finish length', 'Rough qty', 'Rough thickness', 'Rough width', 'Rough length'],
      ...rows.map(({ part, rough }) => [part.name, part.quantity, part.thickness, part.width, part.length,
        rough?.quantity ?? '', rough?.thickness ?? '', rough?.width ?? '', rough?.length ?? '']),
    ];
    if (preparation) {
      csv.push([], ['Stock-preparation notes — inches'],
        ['Minimum stock length through jointer/planer', preparation.millingMinLength],
        ['Minimum stock length through table saw', preparation.sawMinLength],
        ['Bandsaw resaw kerf', preparation.resawKerf],
        ['Thickness cleanup per resawn half', preparation.resawCleanup]);
      for (const { part } of rows.filter((row) => row.part.resawGroup)) {
        csv.push([`${part.name}: one parent board yields two finished halves; minimum milled parent thickness before resaw`, milledThickness(part, preparation)]);
      }
    }
    const url = URL.createObjectURL(new Blob([csv.map((row) => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'tool-tote-cut-list.csv'; link.click();
    window.setTimeout(() => { URL.revokeObjectURL(url); }, 1000);
  };

  return <section className="cad-cut-list" aria-labelledby="cut-list-title">
    <div className="cad-cut-list-heading">
      <h2 id="cut-list-title">Cut list <span>· inches</span></h2>
      <button type="button" onClick={download} disabled={output.stale || !valid}>Download CSV ↓</button>
    </div>
    {output.stale && <p className="cad-error" role="status">Previous settings — this table will update after the model regenerates successfully.</p>}
    <p className="cad-worksheet-help">Finished sizes are rectangular blanks before cutting the joinery. Matching blanks share a row; swatches identify their pieces. Finished and rough quantities are separate: the two bookmatched bottom halves come from one parent board.</p>
    <fieldset className="cad-stock-allowances">
      <legend>Rough-stock allowances</legend>
      <label>Extra width (in)<input type="number" min="0" step="any" required value={widthExtra} onChange={(event) => { setWidthExtra(event.target.value); }} /></label>
      <label>Extra length (in)<input type="number" min="0" step="any" required value={lengthExtra} onChange={(event) => { setLengthExtra(event.target.value); }} /></label>
    </fieldset>
    {parsed.preparation && <fieldset className="cad-stock-allowances">
      <legend>Machine limits &amp; resaw allowances</legend>
      {([
        ['millingMinLength', 'Jointer/planer minimum length (in)'],
        ['sawMinLength', 'Table saw minimum length (in)'],
        ['resawKerf', 'Bandsaw kerf (in)'],
        ['resawCleanup', 'Cleanup thickness per half (in)'],
      ] as const).map(([key, label]) => <label key={key}>{label}<input type="number" min="0" step="any" required
        value={preparationEdits[key] ?? parsed.preparation?.[key]}
        onChange={(event) => { setPreparationEdits((previous) => ({ ...previous, [key]: event.target.value })); }} /></label>)}
    </fieldset>}
    <p className="cad-worksheet-help" id="stock-help">Rough lengths include the end allowance and satisfy both machine minimums. Keep the stock at those lengths through the corresponding operations, then cut shorter parts to final length. Rough thickness defaults to the minimum milled thickness; increase it for initial surfacing. These stock settings stay while you adjust the model, until you leave or reload this page.</p>
    {preparation && preparationValid && rows.filter((row) => row.part.resawGroup).map(({ part }) => <p className="cad-resaw-note" key={part.id}>
      <strong>Bottom parent: at least {inches(milledThickness(part, preparation))}″ thick after milling, before resawing.</strong>{' '}
      2 × {inches(part.thickness)}″ finished thickness + {inches(preparation.resawKerf)}″ kerf + 2 × {inches(preparation.resawCleanup)}″ cleanup.
      One parent board yields the two bookmatched halves; its width is the width of one half plus the width allowance.
    </p>)}
    <div className="cad-table-scroll" tabIndex={0} role="region" aria-label="Cut list table, scroll horizontally for all columns">
      <table className="cad-cut-table" aria-describedby="stock-help">
        <caption className="sr-only">Part quantities and finished and rough dimensions in inches</caption>
        <thead>
          <tr><th rowSpan={2} scope="col">Part name</th><th colSpan={4} scope="colgroup">Finished parts · in</th><th colSpan={4} scope="colgroup">Rough stock · in</th></tr>
          <tr>{['Finish', 'Rough'].flatMap((group) => ['Qty', 'Thickness', 'Width', 'Length'].map((dimension) => <th key={`${group}-${dimension}`} scope="col">{dimension}</th>))}</tr>
        </thead>
        <tbody>{rows.map(({ part, rough }) => {
          const colors = palette.filter((candidate) => part.ids.includes(candidate.id));
          return <tr key={part.id} data-part={part.id}>
            <th scope="row"><span className="cad-blank-swatches">{colors.map((color) => <i key={color.id} className="cad-part-swatch" aria-hidden="true" title={color.label} style={{ '--part-color': color.color, '--part-dark-color': color.darkColor } as CSSProperties} />)}</span><span>{part.name}</span></th>
            <td>{part.quantity}</td>
            <td className="cad-size-cell">{inches(part.thickness)}</td><td className="cad-size-cell">{inches(part.width)}</td><td className="cad-size-cell">{inches(part.length)}</td>
            <td>{rough?.quantity ?? '—'}</td>
            <td className="cad-size-cell"><input type="number" min={preparationValid ? milledThickness(part, preparation) : undefined} step="any" required aria-label={`${part.name} rough thickness`} value={thicknesses[part.id] ?? (preparationValid ? milledThickness(part, preparation) : '')} onChange={(event) => { editThickness(part.ids, event.target.value); }} /></td>
            <td className="cad-size-cell">{rough ? inches(rough.width) : '—'}</td><td className="cad-size-cell">{rough ? inches(rough.length) : '—'}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>
    {!valid && <p className="cad-error" role="alert">Rough thickness must cover the required milled blank, including both halves, kerf and cleanup for a resaw parent. Machine minimums, kerf and cleanup must be positive; width/length allowances cannot be negative. CSV export is unavailable until corrected.</p>}
  </section>;
}
