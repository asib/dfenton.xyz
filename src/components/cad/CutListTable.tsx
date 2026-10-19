import { useMemo, useState, type CSSProperties } from 'react';
import type { PartColor } from '../../misc';
import { boardFeet, csvCell, groupCutList, inches, milledThickness, parseCutList, parseStockPreparation, roughDimensions, standardThickness, stockLabel, stockPlan, stockThicknesses, type CutListOutput, type CutPart, type StockLayoutMode, type StockPreparation } from './cutList';

const number = (text: string) => text.trim() === '' ? NaN : Number(text);
const feetFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// Remove floating-point residue at rounding boundaries for display only.
const feetText = (feet: number | null) => feet === null ? '—' : feetFormat.format(Number(feet.toPrecision(15)));

export default function CutListTable({ output, palette = [] }: { output: CutListOutput; palette?: PartColor[] }) {
  const parsed = useMemo(() => {
    try { return { parts: parseCutList(output.text), preparation: parseStockPreparation(output.text), error: '' }; }
    catch { return { parts: [], preparation: null, error: 'The model’s cut list could not be read. Update the model to try again.' }; }
  }, [output.text]);
  const [thicknesses, setThicknesses] = useState<Partial<Record<string, string>>>({});
  const [layouts, setLayouts] = useState<Partial<Record<string, StockLayoutMode>>>({});
  const [thicknessExtra, setThicknessExtra] = useState('0.25');
  const [widthExtra, setWidthExtra] = useState('0.5');
  const [lengthExtra, setLengthExtra] = useState('1');
  const [extraPercent, setExtraPercent] = useState('20');
  const [crosscutKerf, setCrosscutKerf] = useState('0.125');
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
  const allowance = number(thicknessExtra);
  const minimumStock = (part: CutPart) => milledThickness(part, preparation) + allowance;
  const automaticStock = (part: CutPart) => preparationValid && allowance >= 0 ? standardThickness(minimumStock(part)) : null;
  const stockThickness = (part: CutPart) => {
    const value = thicknesses[part.id];
    return value === undefined || value === 'auto' ? automaticStock(part) ?? NaN : number(value);
  };
  // Keep an explicit choice apart from an automatic choice, even if they currently match.
  // Resaw halves must remain together as one physical parent board.
  const blanks = groupCutList(parsed.parts, (part) => [thicknesses[part.id] ?? 'auto', layouts[part.id] ?? 'auto']);
  const rows = blanks.map((part) => {
    return { part, rough: roughDimensions(part, stockThickness(part), number(widthExtra), number(lengthExtra), preparation, allowance,
      { mode: layouts[part.id] ?? 'auto', crosscutKerf: number(crosscutKerf) }) };
  });
  const stockValid = rows.every((row) => row.rough);
  const totalBoardFeet = stockValid ? rows.reduce((total, { rough }) => total + (rough ? boardFeet(rough) : 0), 0) : null;
  const percentage = number(extraPercent);
  const percentageValid = Number.isFinite(percentage) && percentage >= 0;
  const withExtra = (feet: number | null) => {
    if (feet === null || !percentageValid) return null;
    const total = feet * (1 + percentage / 100);
    return Number.isFinite(total) ? total : null;
  };
  const totalWithExtra = withExtra(totalBoardFeet);
  const valid = stockValid && totalWithExtra !== null;
  const extraHeading = percentageValid ? `With ${String(percentage)}% extra` : 'With extra';
  const editThickness = (ids: string[], value: string) => {
    setThicknesses((previous) => ({ ...previous, ...Object.fromEntries(ids.map((id) => [id, value])) }));
  };
  const download = () => {
    const csv: (string | number)[][] = [
      ['Tool tote cut list — dimensions in inches'],
      ['Part name', 'Finish qty', 'Finish thickness', 'Finish width', 'Finish length', 'Parent qty', 'Parent thickness', 'Parent width', 'Parent length', 'Board feet', `Board feet ${extraHeading.toLowerCase()}`, 'Stock size', 'Stock preparation', 'Finished pieces per parent'],
      ...rows.map(({ part, rough }) => [part.name, part.quantity, part.thickness, part.width, part.length,
        rough?.quantity ?? '', rough?.thickness ?? '', rough?.width ?? '', rough?.length ?? '', rough ? boardFeet(rough) : '', rough ? withExtra(boardFeet(rough)) ?? '' : '', rough ? stockLabel(rough.thickness) : '', rough ? stockPlan(rough) : '', rough?.piecesPerBoard ?? '']),
      ['Total', '', '', '', '', '', '', '', '', totalBoardFeet ?? '', totalWithExtra ?? '', '', '', ''],
      [], ['Extra board feet allowance (%)', percentage],
      [], ['Rough-stock allowances — inches'], ['Total thickness for jointing/planing', allowance],
      ['Extra width', number(widthExtra)], ['Extra length per blank', number(lengthExtra)], ['Crosscut kerf between blanks', number(crosscutKerf)],
      ['Joint, plane and rip parent stock before subdividing it. Machine minimums apply to the parent, not each finished piece. Shared parents retain the length allowance per blank plus a kerf between blanks.'],
      ['Board feet = parent quantity × nominal stock thickness × parent width × parent length / 144. Includes listed machining allowances. The extra percentage is added for board layout and defects.'],
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
    <p className="cad-worksheet-help">Finished sizes are rectangular blanks before cutting the joinery. Matching blanks share a row; swatches identify their pieces. Rough quantities count parent boards: matching short pieces can share a longer board, and the two bookmatched bottom halves share one resaw parent.</p>
    <fieldset className="cad-stock-allowances">
      <legend>Rough-stock allowances</legend>
      <label>Jointing/planing thickness (in, total)<input type="number" min="0" step="any" required value={thicknessExtra} onChange={(event) => { setThicknessExtra(event.target.value); }} /></label>
      <label>Extra width (in)<input type="number" min="0" step="any" required value={widthExtra} onChange={(event) => { setWidthExtra(event.target.value); }} /></label>
      <label>Extra length per blank (in)<input type="number" min="0" step="any" required value={lengthExtra} onChange={(event) => { setLengthExtra(event.target.value); }} /></label>
      <label>Crosscut kerf (in)<input type="number" min="0" step="any" required value={crosscutKerf} onChange={(event) => { setCrosscutKerf(event.target.value); }} /></label>
      <label>Extra board feet (%)<input type="number" min="0" step="any" required value={extraPercent} onChange={(event) => { setExtraPercent(event.target.value); }} /></label>
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
    <p className="cad-worksheet-help" id="stock-help">Machine minimum lengths apply to parent boards during jointing, planing and ripping. Auto compares separate blanks with one shared parent for each matching row and chooses the shorter total stock length. S3S the parent first, then crosscut it into shorter blanks. Parent length includes the allowance for each blank and a kerf between blanks. Each row also lets you choose separate blanks or one shared board.</p>
    <p className="cad-worksheet-help">Auto thickness adds the total jointing/planing allowance to the required milled thickness, then rounds up to 4/4, 5/4, 6/4, 8/4, 10/4, 12/4 or 16/4 rough lumber. The allowance covers both faces together and is applied once to a resaw parent. Stock settings stay until you leave or reload this page.</p>
    {preparation && preparationValid && rows.filter((row) => row.part.resawGroup).map(({ part }) => <p className="cad-resaw-note" key={part.id}>
      <strong>Bottom parent: at least {inches(milledThickness(part, preparation))}″ thick after milling, before resawing.</strong>{' '}
      2 × {inches(part.thickness)}″ finished thickness + {inches(preparation.resawKerf)}″ kerf + 2 × {inches(preparation.resawCleanup)}″ cleanup.
      {Number.isFinite(allowance) && allowance >= 0 && <> Add {inches(allowance)}″ for initial jointing/planing: {inches(minimumStock(part))}″ minimum rough thickness.</>}
      {' '}One parent board yields both halves; its width is one half’s width plus the width allowance.
    </p>)}
    <div className="cad-table-scroll" tabIndex={0} role="region" aria-label="Cut list table, scroll horizontally for all columns">
      <table className="cad-cut-table" aria-describedby="stock-help">
        <caption className="sr-only">Part quantities, finished and rough dimensions in inches, and board feet before and after the extra allowance</caption>
        <thead>
          <tr><th rowSpan={2} scope="col">Part / stock preparation</th><th colSpan={4} scope="colgroup">Finished parts · in</th><th colSpan={4} scope="colgroup">Rough parent stock · in</th><th rowSpan={2} scope="col">Board feet</th><th rowSpan={2} scope="col">{extraHeading}</th></tr>
          <tr>{['Finish', 'Rough'].flatMap((group) => ['Qty', 'Thickness', 'Width', 'Length'].map((dimension) => <th key={`${group}-${dimension}`} scope="col">{dimension}</th>))}</tr>
        </thead>
        <tbody>{rows.map(({ part, rough }) => {
          const colors = palette.filter((candidate) => part.ids.includes(candidate.id));
          const automatic = automaticStock(part);
          return <tr key={part.id} data-part={part.id}>
            <th scope="row"><span className="cad-blank-swatches">{colors.map((color) => <i key={color.id} className="cad-part-swatch" aria-hidden="true" title={color.label} style={{ '--part-color': color.color, '--part-dark-color': color.darkColor } as CSSProperties} />)}</span><span>{part.name}</span>
              {!part.resawGroup && part.quantity > 1 && <select className="cad-stock-layout" aria-label={`${part.name} stock preparation`} value={layouts[part.id] ?? 'auto'} onChange={(event) => {
                const value = event.target.value as StockLayoutMode;
                setLayouts((previous) => ({ ...previous, ...Object.fromEntries(part.ids.map((id) => [id, value])) }));
              }}><option value="auto">Auto</option><option value="separate">Separate blanks</option><option value="together">One shared board</option></select>}
              {rough && <span className="cad-stock-plan">{stockPlan(rough)}</span>}
            </th>
            <td>{part.quantity}</td>
            <td className="cad-size-cell">{inches(part.thickness)}</td><td className="cad-size-cell">{inches(part.width)}</td><td className="cad-size-cell">{inches(part.length)}</td>
            <td>{rough?.quantity ?? '—'}</td>
            <td className="cad-size-cell"><select aria-label={`${part.name} rough thickness`} aria-invalid={!rough} value={thicknesses[part.id] ?? 'auto'} onChange={(event) => { editThickness(part.ids, event.target.value); }}>
              <option value="auto">Auto{automatic ? ` · ${stockLabel(automatic)}` : ' · unavailable'}</option>
              {stockThicknesses.map((thickness) => <option key={thickness} value={thickness} disabled={!preparationValid || !Number.isFinite(allowance) || allowance < 0 || thickness < minimumStock(part)}>{stockLabel(thickness)} · {inches(thickness)}″</option>)}
            </select></td>
            <td className="cad-size-cell">{rough ? inches(rough.width) : '—'}</td><td className="cad-size-cell">{rough ? inches(rough.length) : '—'}</td>
            <td>{feetText(rough ? boardFeet(rough) : null)}</td>
            <td>{feetText(rough ? withExtra(boardFeet(rough)) : null)}</td>
          </tr>;
        })}</tbody>
        <tfoot><tr><th colSpan={9} scope="row">Total board feet</th><td>{feetText(totalBoardFeet)}</td><td>{feetText(totalWithExtra)}</td></tr></tfoot>
      </table>
    </div>
    <p className="cad-worksheet-help">Board feet = parent quantity × nominal stock thickness × parent width × parent length ÷ 144. Each shared or resawn parent is counted once. “With extra” includes the additional percentage for board layout and defects, on top of the listed machining allowances.</p>
    {!stockValid && <p className="cad-error" role="alert">Choose stock thick enough for the milled blank plus the jointing/planing allowance, or return its thickness to Auto. Requirements above 16/4 exceed the listed stock sizes. Machine minimums, resaw kerf and cleanup must be positive; machining allowances and crosscut kerf cannot be negative or blank. CSV export is unavailable until corrected.</p>}
    {(!percentageValid || (stockValid && totalWithExtra === null)) && <p className="cad-error" role="alert">Enter a valid extra-board-feet percentage of 0 or greater. CSV export is unavailable until corrected.</p>}
  </section>;
}
