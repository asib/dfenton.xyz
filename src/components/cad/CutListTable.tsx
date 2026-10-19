import { useMemo, useState, type CSSProperties } from 'react';
import type { PartColor } from '../../misc';
import { csvCell, groupCutList, inches, parseCutList, stockEstimate, type CutListOutput } from './cutList';

interface Stock { material?: string; thickness?: string; price?: string }
interface Supply { id: number; name: string; quantity: string; price: string }
const number = (text: string) => text.trim() === '' ? NaN : Number(text);
const money = (value: number | null) => value === null ? '—' : `$${value.toFixed(2)}`;
const decimal = (value: number | undefined) => value === undefined ? '—' : value.toFixed(3);

export default function CutListTable({ output, palette = [] }: { output: CutListOutput; palette?: PartColor[] }) {
  const parsed = useMemo(() => {
    try { return { parts: parseCutList(output.text), error: '' }; }
    catch { return { parts: [], error: 'The model’s cut list could not be read. Update the model to try again.' }; }
  }, [output.text]);
  const [stock, setStock] = useState<Partial<Record<string, Stock>>>({});
  const [widthExtra, setWidthExtra] = useState('0.5');
  const [lengthExtra, setLengthExtra] = useState('1');
  const [waste, setWaste] = useState('20');
  const [supplies, setSupplies] = useState<Supply[]>([{ id: 1, name: '', quantity: '1', price: '' }]);
  if (parsed.error) return <p className="cad-error" role="alert">{parsed.error}</p>;
  if (!parsed.parts.length) return null;

  const blanks = groupCutList(parsed.parts.map((part) => ({ ...part, material: stock[part.id]?.material ?? part.material })), (part) => {
    const entry = stock[part.id] ?? {};
    return [entry.thickness === undefined ? part.thickness : number(entry.thickness), entry.price?.trim() ? number(entry.price) : null];
  });
  const rows = blanks.map((part) => {
    const entry = stock[part.id] ?? {};
    return { part, entry, estimate: stockEstimate(part,
      entry.thickness === undefined ? part.thickness : number(entry.thickness),
      number(widthExtra), number(lengthExtra), number(waste),
      !entry.price?.trim() ? null : number(entry.price)) };
  });
  const supplyRows = supplies.map((supply) => {
    const active = !!supply.name.trim() || !!supply.price.trim();
    const quantity = number(supply.quantity), price = number(supply.price);
    const valid = !active || (!!supply.name.trim() && Number.isFinite(quantity) && quantity > 0 &&
      (!supply.price.trim() || (Number.isFinite(price) && price >= 0)));
    return { ...supply, active, valid, total: active && valid && supply.price.trim() ? quantity * price : null };
  });
  const valid = rows.every((row) => row.estimate) && supplyRows.every((row) => row.valid);
  const boardFeet = rows.reduce((sum, row) => sum + (row.estimate?.boardFeet ?? 0), 0);
  const extraFeet = rows.reduce((sum, row) => sum + (row.estimate?.extra ?? 0), 0);
  const priced = rows.filter((row) => row.estimate?.totalCost !== null && row.estimate?.totalCost !== undefined).length + supplyRows.filter((row) => row.total !== null).length;
  const unpriced = rows.length + supplyRows.filter((row) => row.active).length - priced;
  const total = rows.reduce((sum, row) => sum + (row.estimate?.totalCost ?? 0), 0) + supplyRows.reduce((sum, row) => sum + (row.total ?? 0), 0);
  const editStock = (ids: string[], patch: Stock) => {
    setStock((previous) => ({ ...previous, ...Object.fromEntries(ids.map((id) => [id, { ...previous[id], ...patch }])) }));
  };
  const editSupply = (id: number, patch: Partial<Supply>) => { setSupplies((previous) => previous.map((row) => row.id === id ? { ...row, ...patch } : row)); };
  const download = () => {
    const csv: (string | number)[][] = [
      ['Tool tote cut list — dimensions in inches'],
      ['Part name', 'Kind of material', 'Qty', 'Finish thickness', 'Finish width', 'Finish length', 'Rough thickness', 'Rough width', 'Rough length', 'Board feet', `Extra (${waste}%) bd ft`, 'Unit cost ($/bd ft)', 'Total cost ($)'],
      ...rows.map(({ part, entry, estimate }) => [part.name, entry.material ?? part.material, part.quantity, part.thickness, part.width, part.length,
        estimate?.thickness ?? '', estimate?.width ?? '', estimate?.length ?? '', estimate?.boardFeet ?? '', estimate?.extra ?? '', entry.price ?? '', estimate?.totalCost ?? '']),
      [], ['Supplies', 'Qty', 'Unit cost ($)', 'Total cost ($)'],
      ...supplyRows.filter((row) => row.active).map((row) => [row.name, row.quantity, row.price, row.total ?? '']),
      [], ['Total stock (bd ft, including extra)', boardFeet + extraFeet],
      [unpriced ? 'Priced subtotal ($)' : 'Total cost ($)', priced ? total : ''],
      ['Unpriced items', unpriced],
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
      <label>Extra stock (%)<input type="number" min="0" step="any" required value={waste} onChange={(event) => { setWaste(event.target.value); }} /></label>
    </fieldset>
    <p className="cad-worksheet-help" id="stock-help">Set material, rough thickness, and price in the table. Rough thickness starts at the finished size; increase it for planing or resawing. The bottom quantity is two resawn halves. Allow for the parent board and saw kerf when buying stock. Worksheet entries stay while you adjust the model, until you leave or reload this page.</p>
    <div className="cad-table-scroll" tabIndex={0} role="region" aria-label="Cut list table, scroll horizontally for all columns">
      <table className="cad-cut-table" aria-describedby="stock-help">
        <caption className="sr-only">Wooden parts and stock estimates in inches and board feet</caption>
        <thead>
          <tr><th rowSpan={2} scope="col">Part name</th><th rowSpan={2} scope="col">Kind of material</th><th rowSpan={2} scope="col">Qty</th><th colSpan={3} scope="colgroup">Finish size · in</th><th colSpan={3} scope="colgroup">Rough size · in</th><th rowSpan={2} scope="col">Board<br />feet</th><th rowSpan={2} scope="col">Extra<br />{waste || '—'}%<br /><small>bd ft</small></th><th rowSpan={2} scope="col">Unit cost<br /><small>$/bd ft</small></th><th rowSpan={2} scope="col">Total<br />cost</th></tr>
          <tr>{['Finish', 'Rough'].flatMap((group) => ['Thickness', 'Width', 'Length'].map((dimension) => <th key={`${group}-${dimension}`} scope="col">{dimension}</th>))}</tr>
        </thead>
        <tbody>{rows.map(({ part, entry, estimate }) => {
          const colors = palette.filter((candidate) => part.ids.includes(candidate.id));
          return <tr key={part.id} data-part={part.id}>
            <th scope="row"><span className="cad-blank-swatches">{colors.map((color) => <i key={color.id} className="cad-part-swatch" aria-hidden="true" title={color.label} style={{ '--part-color': color.color, '--part-dark-color': color.darkColor } as CSSProperties} />)}</span><span>{part.name}</span></th>
            <td><input className="cad-material-input" aria-label={`${part.name} material`} value={entry.material ?? part.material} onChange={(event) => { editStock(part.ids, { material: event.target.value }); }} /></td>
            <td>{part.quantity}</td>
            <td className="cad-size-cell">{inches(part.thickness)}</td><td className="cad-size-cell">{inches(part.width)}</td><td className="cad-size-cell">{inches(part.length)}</td>
            <td className="cad-size-cell"><input type="number" min={part.thickness} step="any" required aria-label={`${part.name} rough thickness`} value={entry.thickness ?? part.thickness} onChange={(event) => { editStock(part.ids, { thickness: event.target.value }); }} /></td>
            <td className="cad-size-cell">{estimate ? inches(estimate.width) : '—'}</td><td className="cad-size-cell">{estimate ? inches(estimate.length) : '—'}</td>
            <td>{decimal(estimate?.boardFeet)}</td><td>{decimal(estimate?.extra)}</td>
            <td><input type="number" min="0" step="any" placeholder="—" aria-label={`${part.name} unit cost per board foot`} value={entry.price ?? ''} onChange={(event) => { editStock(part.ids, { price: event.target.value }); }} /></td>
            <td>{money(estimate?.totalCost ?? null)}</td>
          </tr>;
        })}</tbody>
        <tfoot><tr><th colSpan={9} scope="row">Stock subtotal</th><td>{valid ? decimal(boardFeet) : '—'}</td><td>{valid ? decimal(extraFeet) : '—'}</td><td colSpan={2}>{valid ? `${decimal(boardFeet + extraFeet)} bd ft incl. extra` : '—'}</td></tr></tfoot>
      </table>
    </div>
    <p className="cad-worksheet-help">Board feet = quantity × rough thickness × rough width × rough length ÷ 144. Extra stock is added once; total cost includes it. Prices are optional.</p>
    <div className="cad-table-scroll" tabIndex={0} role="region" aria-label="Supplies table">
      <table className="cad-supplies-table">
        <caption>Supplies</caption>
        <thead><tr><th scope="col">Qty</th><th scope="col">Supply</th><th scope="col">Unit cost · $</th><th scope="col">Total cost</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>{supplyRows.map((row, index) => <tr key={row.id}>
          <td><input type="number" min="0.001" step="any" aria-label={`Supply ${String(index + 1)} quantity`} value={row.quantity} onChange={(event) => { editSupply(row.id, { quantity: event.target.value }); }} /></td>
          <td><input aria-label={`Supply ${String(index + 1)} name`} placeholder="Glue, screws, finish…" value={row.name} onChange={(event) => { editSupply(row.id, { name: event.target.value }); }} /></td>
          <td><input type="number" min="0" step="any" placeholder="—" aria-label={`Supply ${String(index + 1)} unit cost`} value={row.price} onChange={(event) => { editSupply(row.id, { price: event.target.value }); }} /></td>
          <td>{money(row.total)}</td><td><button type="button" aria-label={`Remove supply ${String(index + 1)}`} onClick={() => { setSupplies((previous) => previous.filter((supply) => supply.id !== row.id)); }}>×</button></td>
        </tr>)}</tbody>
      </table>
    </div>
    <div className="cad-cut-list-footer">
      <button type="button" onClick={() => { setSupplies((previous) => [...previous, { id: Math.max(0, ...previous.map((row) => row.id)) + 1, name: '', quantity: '1', price: '' }]); }}>+ Add supply</button>
      <p><strong>{unpriced ? 'Priced subtotal' : 'Total cost'}: {valid && priced ? money(total) : '—'}</strong>{unpriced > 0 && <span> · {unpriced} unpriced {unpriced === 1 ? 'item' : 'items'}</span>}</p>
    </div>
    {!valid && <p className="cad-error" role="alert">Check the worksheet values: rough thickness must cover the finished blank, allowances and prices cannot be negative, and supplies need a name and positive quantity. Totals and CSV export are unavailable until corrected.</p>}
  </section>;
}
