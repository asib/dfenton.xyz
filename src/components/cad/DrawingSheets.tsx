import { useState } from 'react';
import { jointLabels, type DrawingOutput } from './drawings';
import { AssemblySheet, JointSheet, PartSheet } from './DrawingSheetPages';
import DrawingPdfDownload from './DrawingPdfDownload';

export default function DrawingSheets({ output, title }: { output: DrawingOutput; title: string }) {
  const [zoom, setZoom] = useState(1);
  const [partId, setPartId] = useState('');
  const hasJoint = output.sheet?.views.some(view => view.id === 'joint-longitudinal');
  const parts = output.sheet?.parts ?? [];
  const partIndex = Math.max(0, parts.findIndex(part => part.id === partId));
  const part = parts.length > 0 ? parts[partIndex] : undefined;
  return <section className="cad-drawings" aria-labelledby="cad-drawings-title">
    <div className="cad-drawings-heading">
      <h2 id="cad-drawings-title">Drawings</h2>
      <div className="cad-drawing-actions">
        <DrawingPdfDownload output={output} title={title} />
        <label>Sheet zoom <select value={zoom} onChange={event => { setZoom(Number(event.target.value)); }}>
          <option value="1">Default</option><option value="1.5">150%</option><option value="2">200%</option>
        </select></label>
      </div>
    </div>
    <p className="cad-drawing-help">Drawings follow the model dimensions and stay assembled when you change the 3D part view. On small screens or when enlarged, scroll within the sheet to pan. The PDF includes every sheet on US Letter paper.</p>
    <p role="status" className={`cad-drawing-status${output.stale && output.sheet ? ' cad-error' : ''}`}>
      {!output.sheet ? 'Drawings will appear after the model compiles.' : output.stale ? 'Previous valid drawings — model edits are pending or invalid.' : 'Drawings match the current model dimensions.'}
    </p>
    {output.sheet && <>
      <h3 className="cad-drawing-sheet-heading">Assembly views</h3>
      <div className="cad-drawing-scroll" tabIndex={0} role="region" aria-label="Assembly drawing sheet, scroll to pan">
        <div style={{ width: `${String(zoom * 100)}%`, minWidth: 760 * zoom }}><AssemblySheet sheet={output.sheet} title={title} /></div>
      </div>
      {hasJoint && <>
        <h3 id="cad-joint-detail-title" className="cad-drawing-sheet-heading">{jointLabels(output.sheet).title}</h3>
        <div className="cad-drawing-scroll" tabIndex={0} role="region" aria-label={`${jointLabels(output.sheet).title} drawing sheet, scroll to pan`}>
          <div style={{ width: `${String(zoom * 100)}%`, minWidth: 760 * zoom }}><JointSheet sheet={output.sheet} title={title} /></div>
        </div>
      </>}
      {part && <>
        <div className="cad-drawings-heading cad-part-heading">
          <h3 id="cad-part-sheets-title" className="cad-drawing-sheet-heading">Dimensioned part sheets</h3>
          <label>Part sheet <select aria-label="Part sheet" value={part.id} onChange={event => { setPartId(event.target.value); }}>
            {parts.map(p => <option key={p.id} value={p.id}>{p.title} · Qty {p.quantity}</option>)}
          </select></label>
        </div>
        <p className="cad-drawing-help">Choose a part to see its finished dimensions and joinery. Pieces with matching dimensions and machining share a sheet. Rough stock and machining allowances are in the cut list.</p>
        <div className="cad-drawing-scroll" tabIndex={0} role="region" aria-label="Dimensioned part drawing sheet, scroll to pan">
          <div style={{ width: `${String(zoom * 100)}%`, minWidth: 760 * zoom }}>
            <PartSheet part={part} units={output.sheet.units} number={partIndex + (hasJoint ? 3 : 2)} title={title} />
          </div>
        </div>
      </>}
    </>}
  </section>;
}
