import { useMemo, useState, type CSSProperties } from 'react';
import type { PartColor } from '../../misc';
import { csvCell, groupCutList, inches, parseCutList, roughDimensions, type CutListOutput } from './cutList';

const number = (text: string) => text.trim() === '' ? NaN : Number(text);

export default function CutListTable({ output, palette = [] }: { output: CutListOutput; palette?: PartColor[] }) {
  const parsed = useMemo(() => {
    try { return { parts: parseCutList(output.text), error: '' }; }
    catch { return { parts: [], error: 'The model’s cut list could not be read. Update the model to try again.' }; }
  }, [output.text]);
  const [thicknesses, setThicknesses] = useState<Partial<Record<string, string>>>({});
  const [widthExtra, setWidthExtra] = useState('0.5');
  const [lengthExtra, setLengthExtra] = useState('1');
  if (parsed.error) return <p className="cad-error" role="alert">{parsed.error}</p>;
  if (!parsed.parts.length) return null;

  const stockThickness = (part: { id: string; thickness: number }) => {
    const value = thicknesses[part.id];
    return value === undefined ? part.thickness : number(value);
  };
  const blanks = groupCutList(parsed.parts, stockThickness);
  const rows = blanks.map((part) => {
    return { part, rough: roughDimensions(part, stockThickness(part), number(widthExtra), number(lengthExtra)) };
  });
  const valid = rows.every((row) => row.rough);
  const editThickness = (ids: string[], value: string) => {
    setThicknesses((previous) => ({ ...previous, ...Object.fromEntries(ids.map((id) => [id, value])) }));
  };
  const download = () => {
    const csv: (string | number)[][] = [
      ['Tool tote cut list — dimensions in inches'],
      ['Part name', 'Qty', 'Finish thickness', 'Finish width', 'Finish length', 'Rough thickness', 'Rough width', 'Rough length'],
      ...rows.map(({ part, rough }) => [part.name, part.quantity, part.thickness, part.width, part.length,
        rough?.thickness ?? '', rough?.width ?? '', rough?.length ?? '']),
    ];
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
    <p className="cad-worksheet-help">Finished sizes are rectangular blanks before cutting the joinery. Matching blanks share a row and quantity; swatches identify their pieces in the model. Unequal handle laminations get separate rows.</p>
    <fieldset className="cad-stock-allowances">
      <legend>Rough-stock allowances</legend>
      <label>Extra width (in)<input type="number" min="0" step="any" required value={widthExtra} onChange={(event) => { setWidthExtra(event.target.value); }} /></label>
      <label>Extra length (in)<input type="number" min="0" step="any" required value={lengthExtra} onChange={(event) => { setLengthExtra(event.target.value); }} /></label>
    </fieldset>
    <p className="cad-worksheet-help" id="stock-help">Rough thickness starts at the finished size; increase it in the table for planing or resawing. The bottom quantity is two resawn halves. Allow for the parent board and saw kerf when preparing them. Rough-dimension settings stay while you adjust the model, until you leave or reload this page.</p>
    <div className="cad-table-scroll" tabIndex={0} role="region" aria-label="Cut list table, scroll horizontally for all columns">
      <table className="cad-cut-table" aria-describedby="stock-help">
        <caption className="sr-only">Part quantities and finished and rough dimensions in inches</caption>
        <thead>
          <tr><th rowSpan={2} scope="col">Part name</th><th rowSpan={2} scope="col">Qty</th><th colSpan={3} scope="colgroup">Finish size · in</th><th colSpan={3} scope="colgroup">Rough size · in</th></tr>
          <tr>{['Finish', 'Rough'].flatMap((group) => ['Thickness', 'Width', 'Length'].map((dimension) => <th key={`${group}-${dimension}`} scope="col">{dimension}</th>))}</tr>
        </thead>
        <tbody>{rows.map(({ part, rough }) => {
          const colors = palette.filter((candidate) => part.ids.includes(candidate.id));
          return <tr key={part.id} data-part={part.id}>
            <th scope="row"><span className="cad-blank-swatches">{colors.map((color) => <i key={color.id} className="cad-part-swatch" aria-hidden="true" title={color.label} style={{ '--part-color': color.color, '--part-dark-color': color.darkColor } as CSSProperties} />)}</span><span>{part.name}</span></th>
            <td>{part.quantity}</td>
            <td className="cad-size-cell">{inches(part.thickness)}</td><td className="cad-size-cell">{inches(part.width)}</td><td className="cad-size-cell">{inches(part.length)}</td>
            <td className="cad-size-cell"><input type="number" min={part.thickness} step="any" required aria-label={`${part.name} rough thickness`} value={thicknesses[part.id] ?? part.thickness} onChange={(event) => { editThickness(part.ids, event.target.value); }} /></td>
            <td className="cad-size-cell">{rough ? inches(rough.width) : '—'}</td><td className="cad-size-cell">{rough ? inches(rough.length) : '—'}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>
    {!valid && <p className="cad-error" role="alert">Rough thickness must cover the finished blank, and width/length allowances cannot be negative. CSV export is unavailable until corrected.</p>}
  </section>;
}
