import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import type { CadEntry } from '../../misc';
import { createScene, type RenderMode, type SectionAxis } from './scene';
import ParametricControls from './ParametricControls';
import { coloredGeometry } from './displayMesh';
import type { CompiledModel } from './compiler.worker';
import CutListTable from './CutListTable';
import type { CutListOutput } from './cutList';
import './cad.css';

type Viewer = ReturnType<typeof createScene>;

export default function CadViewer({ entry }: { entry: CadEntry & { href: string } }) {
  const host = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [status, setStatus] = useState('Loading model…');
  const [mode, setMode] = useState<RenderMode>('edges');
  const [axis, setAxis] = useState<SectionAxis>('off');
  const [position, setPosition] = useState(50);
  const [flipped, setFlipped] = useState(false);
  const [, setRevision] = useState(0);
  const [cutList, setCutList] = useState<CutListOutput>({ text: '', stale: true });
  const modelUrl = `${entry.href}${entry.model}`;

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const controller = new AbortController();
    let active: Viewer | null = null;
    const lost = () => { setStatus('The 3D view was interrupted. Reload the page to restore it, or download the model below.'); };
    const load = async () => {
      try {
        const response = await fetch(modelUrl, { signal: controller.signal });
        if (!response.ok) throw new Error('Model request failed.');
        const data = await response.arrayBuffer();
        if (controller.signal.aborted) return;
        const geometry = new STLLoader().parse(data);
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
  }, [modelUrl]);

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
      <div className={entry.customizer ? 'cad-workbench' : undefined}>
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
          {entry.customizer?.parts && <ul className="cad-part-key" aria-label="Part colors">
            {entry.customizer.parts.map((part) => <li key={part.id}>
              <i className="cad-part-swatch" aria-hidden="true" style={{ '--part-color': part.color, '--part-dark-color': part.darkColor } as CSSProperties} />{part.label}
            </li>)}
          </ul>}
          {!entry.customizer && <div className="cad-downloads">
            <a href={modelUrl} download>Download STL ↓</a>
            {entry.source && <a href={`${entry.href}${entry.source}`} download>OpenSCAD source ↓</a>}
            {entry.sourceUrl && <a href={entry.sourceUrl}>CAD source ↗</a>}
          </div>}
        </div>
        {entry.customizer && entry.source && <ParametricControls entry={{ ...entry, source: entry.source }} available={!!viewer && !status} onCompiled={onCompiled} onOutput={setCutList} />}
      </div>
      {entry.customizer?.cutList && <CutListTable output={cutList} palette={entry.customizer.parts} />}
      {entry.notes && <p className="cad-notes">{entry.notes}</p>}
      {entry.attribution && <p className="cad-attribution">{entry.attribution.text} <a href={entry.attribution.url}>Original design ↗</a></p>}
    </section>
  );
}
