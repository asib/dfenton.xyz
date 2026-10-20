import { inches } from './cutList';
import { dimensionValue, jointLabels, project, type DrawingDimension, type DrawingSheet, type PartDrawing, type ProjectedView } from './drawings';

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

function ViewGeometry({ placement, units, hatchPrefix = 'joint', bearingLabel = 'Bearing surface' }: { placement: Placement; units: DrawingSheet['units']; hatchPrefix?: string; bearingLabel?: string }) {
  const { view, x, y, scale } = placement;
  const px = (n: number) => x + (n - view.bounds[0]) * scale;
  const py = (n: number) => y + (view.bounds[3] - n) * scale;
  const path = view.lines.map(([a, b, c, d]) => `M${String(px(a))},${String(py(b))}L${String(px(c))},${String(py(d))}`).join('');
  return <g data-drawing-view={view.id}>
    {view.profiles?.map((loops, i) => <path key={i} data-section-part={i} fill={`url(#${hatchPrefix}-hatch-${String(i % 3)})`} fillRule="evenodd"
      d={loops.map(loop => `${loop.map((p, j) => `${j ? 'L' : 'M'}${String(px(p[0]))},${String(py(p[1]))}`).join('')}Z`).join('')} />)}
    <path className="cad-drawing-edges" d={path} />
    {view.guides?.map(([a, b], i) => {
      const p = project(a, view.axes), q = project(b, view.axes);
      return <line key={i} className="cad-drawing-guide" x1={px(p[0])} y1={py(p[1])} x2={px(q[0])} y2={py(q[1])} />;
    })}
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
        <title>{bearingLabel}</title>
      </line>;
    })}
    {view.dimensions.map((dimension, i) => <Dimension key={i} dimension={dimension} placement={placement} units={units} />)}
  </g>;
}

function Hatches({ prefix }: { prefix: string }) {
  return <defs>{[45, -45, 45].map((angle, i) => <pattern key={i} id={`${prefix}-hatch-${String(i)}`} patternUnits="userSpaceOnUse" width={i === 2 ? 12 : 8} height={i === 2 ? 12 : 8} patternTransform={`rotate(${String(angle)})`}>
    <line className="cad-drawing-hatch" x1="0" y1="0" x2="0" y2="12" />
    {i === 2 && <line className="cad-drawing-hatch" x1="3" y1="0" x2="3" y2="12" />}
  </pattern>)}</defs>;
}

export function AssemblySheet({ sheet, title, id }: { sheet: DrawingSheet; title: string; id?: string }) {
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
  return <svg id={id} className="cad-drawing-sheet" viewBox={`0 0 1200 ${String(sheetHeight)}`} role="img" aria-labelledby="assembly-sheet-title assembly-sheet-description">
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

export function JointSheet({ sheet, title, id }: { sheet: DrawingSheet; title: string; id?: string }) {
  const labels = jointLabels(sheet);
  const longitudinal = sheet.views.find(view => view.id === 'joint-longitudinal');
  const transverse = sheet.views.find(view => view.id === 'joint-transverse');
  if (!longitudinal || !transverse) return null;
  const scale = Math.min(400 / width(longitudinal), 330 / width(transverse), 380 / Math.max(height(longitudinal), height(transverse)));
  const placements: Placement[] = [{ view: longitudinal, x: 140, y: 180, scale }, { view: transverse, x: 770, y: 180, scale }];
  const bottom = 180 + Math.max(height(longitudinal), height(transverse)) * scale;
  const sheetHeight = bottom + 270;
  return <svg id={id} className="cad-drawing-sheet" viewBox={`0 0 1200 ${String(sheetHeight)}`} role="img" aria-labelledby="joint-sheet-title joint-sheet-description">
    <title id="joint-sheet-title">{title} — {labels.title}</title>
    <desc id="joint-sheet-description">{labels.description} {labels.bearingLabel}</desc>
    <Hatches prefix="joint" />
    <text className="cad-drawing-sheet-title" x="30" y="32">{title.toUpperCase()} / {sheet.joint ? labels.title.toUpperCase() : 'HANDLE–RISER JOINT'}</text>
    <text className="cad-drawing-sheet-meta" x="1170" y="32" textAnchor="end">{sheet.units === 'inches' ? 'INCHES' : 'MILLIMETRES'} · ENLARGED SECTIONS</text>
    {placements.map(placement => <g key={placement.view.id}>
      <ViewGeometry placement={placement} units={sheet.units} bearingLabel={labels.bearingLabel} />
      <text className="cad-drawing-view-title" x={placement.x - 35} y={bottom + 110}>{placement.view.title.toUpperCase()}</text>
      {placement.view.section?.notes.map((note, i) => <text key={i} className="cad-drawing-note" x={placement.x - 35} y={bottom + 140 + i * 22}>{note}</text>)}
    </g>)}
    <line className="cad-drawing-bearing" x1="30" y1={sheetHeight - 48} x2="65" y2={sheetHeight - 48} />
    <text className="cad-drawing-note" x="78" y={sheetHeight - 44}>{labels.bearingLabel}</text>
    <text className="cad-drawing-sheet-meta" x="30" y={sheetHeight - 20}>HATCHES DISTINGUISH PARTS · BREAK MARKS INDICATE CONTINUING MATERIAL · USE WRITTEN DIMENSIONS</text>
    <text className="cad-drawing-sheet-meta" x="1170" y={sheetHeight - 20} textAnchor="end">JOINT DETAIL / 02</text>
  </svg>;
}

export function PartSheet({ part, units, number, title, id }: { part: PartDrawing; units: DrawingSheet['units']; number: number; title: string; id?: string }) {
  const [main, ...details] = part.views;
  const bottomMargin = (view: ProjectedView) => 32 * Math.max(0, ...view.dimensions
    .filter(d => d.direction === 'horizontal' && d.side === -1).map(d => d.tier));
  const mainScale = Math.min(880 / width(main), 360 / height(main));
  const mainPlacement = { view: main, x: (1200 - width(main) * mainScale) / 2, y: 110, scale: mainScale };
  const mainCaption = mainPlacement.y + height(main) * mainScale + bottomMargin(main) + 35;
  const detailY = mainCaption + 130;
  const detailPlacements = details.map((view, i) => {
    const scale = Math.min(340 / width(view), 270 / height(view));
    const center = details.length === 1 ? 600 : 310 + i * 580;
    return { view, x: center - width(view) * scale / 2, y: detailY, scale };
  });
  const detailCaption = Math.max(mainCaption, ...detailPlacements.map(p => p.y + height(p.view) * p.scale + bottomMargin(p.view) + 35));
  const notesY = detailCaption + 50, sheetHeight = notesY + part.notes.length * 23 + 45;
  const prefix = `part-${part.id}`;
  return <svg id={id} className="cad-drawing-sheet" data-part-sheet={part.id} viewBox={`0 0 1200 ${String(sheetHeight)}`} role="img" aria-labelledby={`${prefix}-title ${prefix}-description`}>
    <title id={`${prefix}-title`}>{part.title} — dimensioned part sheet, quantity {part.quantity}</title>
    <desc id={`${prefix}-description`}>Finished part dimensions and joinery. Detail views use independent scales. Dashed lines identify machining references; hatching identifies sectioned material. Use written dimensions.</desc>
    <Hatches prefix={prefix} />
    <text className="cad-drawing-sheet-title" x="30" y="32">{title.toUpperCase()} / {part.title.toUpperCase()}</text>
    <text className="cad-drawing-sheet-meta" x="1170" y="32" textAnchor="end">QTY {part.quantity} · {units === 'inches' ? 'INCHES' : 'MILLIMETRES'} · FINISHED DIMENSIONS</text>
    <ViewGeometry placement={mainPlacement} units={units} hatchPrefix={prefix} />
    <text className="cad-drawing-view-title" x="600" y={mainCaption} textAnchor="middle">{main.title.toUpperCase()}</text>
    {detailPlacements.map(p => <g key={p.view.id}>
      <ViewGeometry placement={p} units={units} hatchPrefix={prefix} />
      <text className="cad-drawing-view-title" x={p.x + width(p.view) * p.scale / 2} y={detailCaption} textAnchor="middle">{p.view.title.toUpperCase()}</text>
    </g>)}
    {part.notes.map((note, i) => <text key={i} className="cad-drawing-note" x="30" y={notesY + i * 23}>{note}</text>)}
    <text className="cad-drawing-sheet-meta" x="30" y={sheetHeight - 20}>DETAIL SCALES VARY · BREAK MARKS INDICATE CONTINUING MATERIAL · USE WRITTEN DIMENSIONS</text>
    <text className="cad-drawing-sheet-meta" x="1170" y={sheetHeight - 20} textAnchor="end">PART / {String(number).padStart(2, '0')}</text>
  </svg>;
}

// Export every part, independently of the on-screen selector and zoom.
export function DrawingDocument({ sheet, title }: { sheet: DrawingSheet; title: string }) {
  const hasJoint = sheet.views.some(view => view.id === 'joint-longitudinal');
  return <>
    <AssemblySheet sheet={sheet} title={title} />
    {hasJoint && <JointSheet sheet={sheet} title={title} />}
    {sheet.parts?.map((part, i) => <PartSheet key={part.id} part={part} units={sheet.units} number={i + (hasJoint ? 3 : 2)} title={title} />)}
  </>;
}
