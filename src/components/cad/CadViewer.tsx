import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import type { CadEntry } from '../../misc';
import { createScene, type RenderMode, type SectionAxis } from './scene';
import ParametricControls from './ParametricControls';
import { coloredGeometry, parseDisplayMesh } from './displayMesh';
import type { CompiledModel } from './compiler.worker';
import CutListTable from './CutListTable';
import type { CutListOutput } from './cutList';
import { useFullscreen } from './useFullscreen';
import DrawingSheets from './DrawingSheets';
import type { DrawingOutput } from './drawings';
import './cad.css';

type Viewer = ReturnType<typeof createScene>;

export default function CadViewer({ entry }: { entry: CadEntry & { href: string } }) {
  const host = useRef<HTMLDivElement>(null);
  const { workspace, toggleButton, fullscreen, enter, leave } = useFullscreen();
  const [legendOpen, setLegendOpen] = useState(true);
  const [parametersOpen, setParametersOpen] = useState(true);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [status, setStatus] = useState('Loading model…');
  const [mode, setMode] = useState<RenderMode>('edges');
  const [axis, setAxis] = useState<SectionAxis>('off');
  const [position, setPosition] = useState(50);
  const [flipped, setFlipped] = useState(false);
  const [, setRevision] = useState(0);
  const [cutList, setCutList] = useState<CutListOutput>({ text: '', stale: true });
  const [drawings, setDrawings] = useState<DrawingOutput>({ stale: true });
  const modelUrl = `${entry.href}${entry.model}`;
  const displayUrl = entry.displayModel ? `${entry.href}${entry.displayModel}` : undefined;
  const palette = entry.customizer?.parts;
  const hasParameters = !!(entry.customizer && entry.source);
  const hasLegend = !!palette?.length;
  const hasPanels = hasLegend || hasParameters;
  const viewCutList = () => {
    void leave().then(() => {
      requestAnimationFrame(() => {
        const heading = document.getElementById('cut-list-title');
        heading?.scrollIntoView({ block: 'start' });
        if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
      });
    });
  };

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const controller = new AbortController();
    let active: Viewer | null = null;
    const lost = () => { setStatus('The 3D view was interrupted. Reload the page to restore it, or download the model below.'); };
    const load = async () => {
      try {
        // Start with saved colored triangles when provided, so cold loads don't
        // show a monochrome STL while the parametric engine initializes.
        const response = await fetch(displayUrl ?? modelUrl, { signal: controller.signal });
        if (!response.ok) throw new Error('Model request failed.');
        const geometry = displayUrl
          ? coloredGeometry(parseDisplayMesh(await response.json()), palette)
          : new STLLoader().parse(await response.arrayBuffer());
        if (controller.signal.aborted) { geometry.dispose(); return; }
        try {
          active = createScene(element, geometry);
        } catch (error) {
          geometry.dispose();
          throw error;
        }
        element.querySelector('canvas')?.addEventListener('webglcontextlost', lost);
        setViewer(active);
        setStatus('');
      } catch {
        if (!controller.signal.aborted) {
          setStatus('The 3D view could not load. You can still download the model below.');
        }
      }
    };
    void load();
    return () => {
      controller.abort();
      element.querySelector('canvas')?.removeEventListener('webglcontextlost', lost);
      active?.dispose();
    };
  }, [modelUrl, displayUrl, palette]);

  useEffect(() => {
    viewer?.setSettings({ mode, axis, position, flipped });
  }, [viewer, mode, axis, position, flipped]);

  const coordinate = viewer && axis !== 'off'
    ? viewer.sourceMin[axis] + viewer.size[axis] * position / 100
    : 0;
  const reset = () => {
    setMode('edges');
    setAxis('off');
    setPosition(50);
    setFlipped(false);
    viewer?.reset();
  };
  const onCompiled = useCallback((model: CompiledModel) => {
    if (!viewer) throw new Error('The 3D view is unavailable.');
    const geometry = model.display ? coloredGeometry(model.display, entry.customizer?.parts) : new STLLoader().parse(model.stl);
    try { viewer.replaceGeometry(geometry); }
    catch (error) { geometry.dispose(); throw error; }
    setRevision((revision) => revision + 1);
  }, [viewer, entry.customizer?.parts]);

  return (
    <section className="cad" aria-label="CAD model">
      <p className="cad-description">{entry.description}</p>
      {entry.customizer?.drawings && <p className="cad-drawing-jump"><a href="#cad-drawings-title">View drawings ↓</a></p>}
      <div ref={workspace} className="cad-workspace" data-fullscreen={fullscreen || undefined}
        role={fullscreen ? 'dialog' : undefined} aria-modal={fullscreen || undefined} aria-label={fullscreen ? `${entry.title} fullscreen viewer` : undefined}>
        <div className="cad-workspace-toolbar">
          <span className="cad-workspace-title">{entry.title}</span>
          <button ref={toggleButton} type="button" aria-pressed={fullscreen} onClick={() => { if (fullscreen) void leave(); else void enter(); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              <path d={fullscreen ? 'M4 9h5V4m6 0v5h5M4 15h5v5m6 0v-5h5' : 'M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5'} />
            </svg>
            {fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          </button>
        </div>
        <div className="cad-workbench" data-has-panels={hasPanels || undefined}>
        <div className="cad-viewer">
          <div className="cad-stage">
            <div ref={host} className="cad-canvas" aria-hidden={!!status} />
            {status && <div className="cad-fallback">
              <img className={entry.previewDark ? 'cad-preview-light' : ''} src={`${entry.href}${entry.preview}`} alt={entry.title} />
              {entry.previewDark && <img className="cad-preview-dark" src={`${entry.href}${entry.previewDark}`} alt={entry.title} />}
              <p role="status">{status}</p>
            </div>}
            {!status && <span className="cad-stage-label" aria-hidden="true">{axis === 'off' ? 'Z up · mm' : `${axis.toUpperCase()} section · ${coordinate.toFixed(1)} mm`}</span>}
          </div>
          <p id="cad-help" className="cad-help">Drag to rotate · right-drag to pan · scroll or pinch to zoom. Focus the model and use arrow keys to rotate, +/− to zoom.</p>
          <fieldset className="cad-controls" disabled={!viewer || !!status}>
            <legend className="sr-only">Model display controls</legend>
            <label>Display
              <select value={mode} onChange={(event) => { setMode(event.target.value as RenderMode); }}>
                <option value="edges">Solid + edges</option>
                <option value="solid">Solid</option>
                <option value="wireframe">Wireframe</option>
              </select>
            </label>
            <label>Section
              <select value={axis} onChange={(event) => { setAxis(event.target.value as SectionAxis); }}>
                <option value="off">Off</option>
                <option value="x">X axis</option>
                <option value="y">Y axis</option>
                <option value="z">Z axis</option>
              </select>
            </label>
            <button type="button" onClick={reset}>Reset view</button>
            {axis !== 'off' && <div className="cad-section-controls">
              <label className="cad-slider">Cut position <output>{coordinate.toFixed(1)} mm</output>
                <input type="range" min="0" max="100" step="0.1" value={position}
                  aria-valuetext={`${coordinate.toFixed(1)} millimeters on ${axis.toUpperCase()}`}
                  onChange={(event) => { setPosition(Number(event.target.value)); }} />
              </label>
              <label className="cad-checkbox"><input type="checkbox" checked={flipped} onChange={(event) => { setFlipped(event.target.checked); }} />Flip cut</label>
              {mode !== 'wireframe' && <span className="cad-section-key"><i aria-hidden="true" />Cut surface</span>}
            </div>}
          </fieldset>
          {viewer && <p className="cad-dimensions">Bounds: {viewer.size.x.toFixed(1)} × {viewer.size.y.toFixed(1)} × {viewer.size.z.toFixed(1)} mm (X × Y × Z)</p>}
          {!entry.customizer && <div className="cad-downloads">
            <a href={modelUrl} download>Download STL ↓</a>
            {entry.source && <a href={`${entry.href}${entry.source}`} download>OpenSCAD source ↓</a>}
            {entry.sourceUrl && <a href={entry.sourceUrl}>CAD source ↗</a>}
          </div>}
        </div>
        <div className="cad-sidebar" hidden={!hasPanels}>
          {hasLegend && <details id="cad-legend" className="cad-panel" open={legendOpen} onToggle={(event) => { setLegendOpen(event.currentTarget.open); }}>
            <summary>Part legend</summary>
            <ul className="cad-part-key" aria-label="Part colors">
              {palette.map((part) => <li key={part.id}>
                <i className="cad-part-swatch" aria-hidden="true" style={{ '--part-color': part.color, '--part-dark-color': part.darkColor } as CSSProperties} />{part.label}
              </li>)}
            </ul>
          </details>}
          {entry.customizer && entry.source && <details id="cad-parameter-panel" className="cad-panel" open={parametersOpen} onToggle={(event) => { setParametersOpen(event.currentTarget.open); }}>
            <summary>Model parameters</summary>
            <ParametricControls entry={{ ...entry, source: entry.source }} available={!!viewer && !status} onCompiled={onCompiled} onOutput={setCutList} onDrawings={setDrawings} onViewCutList={fullscreen ? viewCutList : undefined} />
          </details>}
        </div>
        </div>
      </div>
      {entry.customizer?.drawings && <DrawingSheets output={drawings} title={entry.title} />}
      {entry.customizer?.cutList && <CutListTable output={cutList} palette={entry.customizer.parts} />}
      {entry.notes && <p className="cad-notes">{entry.notes}</p>}
      {entry.attribution && <p className="cad-attribution">{entry.attribution.text} <a href={entry.attribution.url}>Original design ↗</a></p>}
    </section>
  );
}
