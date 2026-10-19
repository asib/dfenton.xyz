import { useState } from 'react';
import { inches } from './cutList';
import { dimensionValue, project, type DrawingDimension, type DrawingOutput, type DrawingSheet, type ProjectedView } from './drawings';

interface Placement { view: ProjectedView; x: number; y: number; scale: number }
const width = (view: ProjectedView) => view.bounds[2] - view.bounds[0];
const height = (view: ProjectedView) => view.bounds[3] - view.bounds[1];

function Dimension({ dimension, placement, units }: { dimension: DrawingDimension; placement: Placement; units: DrawingSheet['units'] }) {
  const { view, x, y, scale } = placement;
  const convert = (p: DrawingDimension['a']) => {
    const projected = project(p, view.axes);
    return [x + (projected[0] - view.bounds[0]) * scale, y + (view.bounds[3] - projected[1]) * scale];
  };
  const a = convert(dimension.a), b = convert(dimension.b);
  const horizontal = dimension.direction === 'horizontal';
  const gap = dimension.tier * 32;
  const outside = horizontal
    ? (dimension.side === 1 ? y - gap : y + height(view) * scale + gap)
    : (dimension.side === 1 ? x + width(view) * scale + gap : x - gap);
  const p = horizontal ? [a[0], outside] : [outside, a[1]];
  const q = horizontal ? [b[0], outside] : [outside, b[1]];
  const tx = (p[0] + q[0]) / 2 - (horizontal ? 0 : 8), ty = (p[1] + q[1]) / 2 - (horizontal ? 8 : 0);
  const value = dimensionValue(dimension, view, units);
  const text = `${units === 'inches' ? `${inches(value)}″` : `${String(Number(value.toFixed(3)))} mm`} · ${dimension.label}`;
  const extension = (start: number[], end: number[]) => {
    const direction = [Math.sign(end[0] - start[0]), Math.sign(end[1] - start[1])];
    return <line x1={start[0] + direction[0] * 4} y1={start[1] + direction[1] * 4} x2={end[0] + direction[0] * 5} y2={end[1] + direction[1] * 5} />;
  };
  return <g className="cad-drawing-dimension" aria-label={text}>
    {extension(a, p)}{extension(b, q)}
    <line x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} />
    {[p, q].map((point, i) => <line key={i} className="cad-drawing-tick" x1={point[0] - 4} y1={point[1] + 4} x2={point[0] + 4} y2={point[1] - 4} />)}
    <text x={tx} y={ty} textAnchor="middle" transform={horizontal ? undefined : `rotate(-90 ${String(tx)} ${String(ty)})`}>{text}</text>
  </g>;
}

function ViewGeometry({ placement, units }: { placement: Placement; units: DrawingSheet['units'] }) {
  const { view, x, y, scale } = placement;
  const px = (n: number) => x + (n - view.bounds[0]) * scale;
  const py = (n: number) => y + (view.bounds[3] - n) * scale;
  const path = view.lines.map(([a, b, c, d]) => `M${String(px(a))},${String(py(b))}L${String(px(c))},${String(py(d))}`).join('');
  return <g data-drawing-view={view.id}>
    {view.profiles?.map((loops, i) => <path key={i} data-section-part={i} fill={`url(#joint-hatch-${String(i % 3)})`} fillRule="evenodd"
      d={loops.map(loop => `${loop.map((p, j) => `${j ? 'L' : 'M'}${String(px(p[0]))},${String(py(p[1]))}`).join('')}Z`).join('')} />)}
    <path className="cad-drawing-edges" d={path} />
    {view.breaks?.map(([a, b, c, d], i) => {
      const ax = px(a), ay = py(b), bx = px(c), by = py(d), length = Math.hypot(bx - ax, by - ay);
      const nx = -(by - ay) / length * 4, ny = (bx - ax) / length * 4;
      const points = [[ax, ay], [ax + (bx - ax) * .42, ay + (by - ay) * .42],
        [ax + (bx - ax) * .47 + nx, ay + (by - ay) * .47 + ny], [ax + (bx - ax) * .53 - nx, ay + (by - ay) * .53 - ny],
        [ax + (bx - ax) * .58, ay + (by - ay) * .58], [bx, by]];
      return <polyline key={i} className="cad-drawing-edges cad-drawing-break" points={points.map(p => p.join(',')).join(' ')} />;
    })}
    {view.section?.contacts.map(([a, b], i) => {
      const p = project(a, view.axes), q = project(b, view.axes);
      return <line key={i} className="cad-drawing-bearing" x1={px(p[0])} y1={py(p[1])} x2={px(q[0])} y2={py(q[1])}>
        <title>Handle notch roof bears on the riser-slot floor</title>
      </line>;
    })}
    {view.dimensions.map((dimension, i) => <Dimension key={i} dimension={dimension} placement={placement} units={units} />)}
  </g>;
}

function AssemblySheet({ sheet, title }: { sheet: DrawingSheet; title: string }) {
  const front = sheet.views.find(view => view.id === 'front');
  const top = sheet.views.find(view => view.id === 'top');
  const right = sheet.views.find(view => view.id === 'right');
  if (!front || !top || !right) return null;
  const scale = Math.min(880 / (width(front) + width(right)), 1.5);
  const frontY = 90 + height(top) * scale + 150;
  const placements: Placement[] = [
    { view: top, x: 90, y: 90, scale },
    { view: front, x: 90, y: frontY, scale },
    { view: right, x: 90 + width(front) * scale + 140, y: frontY, scale },
  ];
  const sheetHeight = frontY + Math.max(height(front), height(right)) * scale + 110;
  return <svg className="cad-drawing-sheet" viewBox={`0 0 1200 ${String(sheetHeight)}`} role="img" aria-labelledby="assembly-sheet-title assembly-sheet-description">
    <title id="assembly-sheet-title">{title} — assembly drawing</title>
    <desc id="assembly-sheet-description">Front, top, and right-end orthographic views in third-angle arrangement. Visible edges only. Dimensions in {sheet.units}, evaluated from the SCAD model. Screen scale varies; use the written dimensions.</desc>
    <text className="cad-drawing-sheet-title" x="30" y="32">{title.toUpperCase()} / ASSEMBLY</text>
    <text className="cad-drawing-sheet-meta" x="1170" y="32" textAnchor="end">{sheet.units === 'inches' ? 'INCHES' : 'MILLIMETRES'} · THIRD ANGLE · VISIBLE EDGES</text>
    {placements.map(placement => {
      const { view, x, y } = placement;
      return <g key={view.id}>
        <ViewGeometry placement={placement} units={sheet.units} />
        <text className="cad-drawing-view-title" x={x} y={y + height(view) * scale + 66}>{view.title.toUpperCase()}</text>
      </g>;
    })}
    <text className="cad-drawing-sheet-meta" x="30" y={sheetHeight - 20}>ASSEMBLED CONFIGURATION · USE WRITTEN DIMENSIONS; SCREEN SCALE VARIES</text>
    <text className="cad-drawing-sheet-meta" x="1170" y={sheetHeight - 20} textAnchor="end">ASSEMBLY / 01</text>
  </svg>;
}

function JointSheet({ sheet, title }: { sheet: DrawingSheet; title: string }) {
  const longitudinal = sheet.views.find(view => view.id === 'joint-longitudinal');
  const transverse = sheet.views.find(view => view.id === 'joint-transverse');
  if (!longitudinal || !transverse) return null;
  const scale = Math.min(400 / width(longitudinal), 330 / width(transverse), 380 / Math.max(height(longitudinal), height(transverse)));
  const placements: Placement[] = [{ view: longitudinal, x: 140, y: 180, scale }, { view: transverse, x: 770, y: 180, scale }];
  const bottom = 180 + Math.max(height(longitudinal), height(transverse)) * scale;
  const sheetHeight = bottom + 270;
  return <svg className="cad-drawing-sheet" viewBox={`0 0 1200 ${String(sheetHeight)}`} role="img" aria-labelledby="joint-sheet-title joint-sheet-description">
    <title id="joint-sheet-title">{title} — handle/riser joint detail</title>
    <desc id="joint-sheet-description">Enlarged longitudinal and transverse sections through the assembled handle/riser bridle joint. Hatching distinguishes the wooden pieces. The highlighted bearing surface joins the handle notch roof to the riser-slot floor.</desc>
    <defs>{[45, -45, 45].map((angle, i) => <pattern key={i} id={`joint-hatch-${String(i)}`} patternUnits="userSpaceOnUse" width={i === 2 ? 12 : 8} height={i === 2 ? 12 : 8} patternTransform={`rotate(${String(angle)})`}>
      <line className="cad-drawing-hatch" x1="0" y1="0" x2="0" y2="12" />
      {i === 2 && <line className="cad-drawing-hatch" x1="3" y1="0" x2="3" y2="12" />}
    </pattern>)}</defs>
    <text className="cad-drawing-sheet-title" x="30" y="32">{title.toUpperCase()} / HANDLE–RISER JOINT</text>
    <text className="cad-drawing-sheet-meta" x="1170" y="32" textAnchor="end">{sheet.units === 'inches' ? 'INCHES' : 'MILLIMETRES'} · ENLARGED SECTIONS</text>
    {placements.map(placement => <g key={placement.view.id}>
      <ViewGeometry placement={placement} units={sheet.units} />
      <text className="cad-drawing-view-title" x={placement.x - 35} y={bottom + 110}>{placement.view.title.toUpperCase()}</text>
      {placement.view.section?.notes.map((note, i) => <text key={i} className="cad-drawing-note" x={placement.x - 35} y={bottom + 140 + i * 22}>{note}</text>)}
    </g>)}
    <line className="cad-drawing-bearing" x1="30" y1={sheetHeight - 48} x2="65" y2={sheetHeight - 48} />
    <text className="cad-drawing-note" x="78" y={sheetHeight - 44}>Bearing surface: handle notch roof rests on riser-slot floor. Both ends use the same joint.</text>
    <text className="cad-drawing-sheet-meta" x="30" y={sheetHeight - 20}>HATCHES DISTINGUISH PARTS · BREAK MARKS INDICATE CONTINUING MATERIAL · USE WRITTEN DIMENSIONS</text>
    <text className="cad-drawing-sheet-meta" x="1170" y={sheetHeight - 20} textAnchor="end">JOINT DETAIL / 02</text>
  </svg>;
}

export default function DrawingSheets({ output, title }: { output: DrawingOutput; title: string }) {
  const [zoom, setZoom] = useState(1);
  return <section className="cad-drawings" aria-labelledby="cad-drawings-title">
    <div className="cad-drawings-heading">
      <h2 id="cad-drawings-title">Drawings</h2>
      <label>Sheet zoom <select value={zoom} onChange={event => { setZoom(Number(event.target.value)); }}>
        <option value="1">Default</option><option value="1.5">150%</option><option value="2">200%</option>
      </select></label>
    </div>
    <p className="cad-drawing-help">Drawings follow the model dimensions and stay assembled when you change the 3D part view. On small screens or when enlarged, scroll within the sheet to pan.</p>
    <p role="status" className={`cad-drawing-status${output.stale && output.sheet ? ' cad-error' : ''}`}>
      {!output.sheet ? 'Drawings will appear after the model compiles.' : output.stale ? 'Previous valid drawings — model edits are pending or invalid.' : 'Drawings match the current model dimensions.'}
    </p>
    {output.sheet && <>
      <h3 className="cad-drawing-sheet-heading">Assembly views</h3>
      <div className="cad-drawing-scroll" tabIndex={0} role="region" aria-label="Assembly drawing sheet, scroll to pan">
        <div style={{ width: `${String(zoom * 100)}%`, minWidth: 760 * zoom }}><AssemblySheet sheet={output.sheet} title={title} /></div>
      </div>
      {output.sheet.views.some(view => view.section) && <>
        <h3 id="cad-joint-detail-title" className="cad-drawing-sheet-heading">Handle/riser joint detail</h3>
        <div className="cad-drawing-scroll" tabIndex={0} role="region" aria-label="Handle/riser joint drawing sheet, scroll to pan">
          <div style={{ width: `${String(zoom * 100)}%`, minWidth: 760 * zoom }}><JointSheet sheet={output.sheet} title={title} /></div>
        </div>
      </>}
    </>}
  </section>;
}
