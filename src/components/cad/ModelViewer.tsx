import { useEffect, useMemo, useRef, useState } from 'react';
import type { CadEntry, ViewerEntry } from '../../misc';
import CadViewer from './CadViewer';
import { compileJob } from './compiler';
import { editableParameters, type Parameter } from './parameters';
import type { LocalModel } from './ParametricControls';
import './cad.css';

// The 3D viewer for visitors' own files: drop one anywhere on the page or choose one, and it
// opens with the usual tools (measuring, sections, the orientation cube). An STL opens as it
// is; an OpenSCAD file compiles here, its Customizer parameters becoming controls as for the
// site's own models. Files stay in the browser as object URLs; nothing is uploaded.
interface OpenFile { name: string; size: number; url: string; scad?: { sourceUrl: string; local: LocalModel; skipped: string[] } }

const sizeText = (bytes: number) => bytes < 1024 * 1024 ? `${String(Math.max(1, Math.round(bytes / 1024)))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const release = (file: OpenFile) => {
  URL.revokeObjectURL(file.url);
  if (file.scad) URL.revokeObjectURL(file.scad.sourceUrl);
};

// A binary STL is an 80-byte header, a triangle count and 50 bytes per triangle; an ASCII
// STL starts "solid" and lists facets. Anything else is refused before the viewer sees it.
async function looksLikeStl(file: File) {
  if (file.size >= 84) {
    const count = new DataView(await file.slice(80, 84).arrayBuffer()).getUint32(0, true);
    if (count > 0 && 84 + count * 50 === file.size) return true;
  }
  const text = await file.slice(0, 4096).text();
  return /^\s*solid\b/i.test(text) && /\bfacet\b/i.test(text);
}

// Compile once for the default model, then read the parameters the panel can edit; a file
// whose parameters can't be read still opens, without controls.
async function compileScad(file: File, signal: AbortSignal, onReady: () => void): Promise<OpenFile> {
  const text = await file.text();
  const model = await compileJob({ kind: 'compile', source: text, lenient: true }, signal, onReady);
  if (model.kind !== 'model') throw new Error('The model could not be generated.');
  let editable: { parameters: Parameter[]; skipped: string[] } = { parameters: [], skipped: [] };
  try {
    const schema = await compileJob({ kind: 'parameters', source: text }, signal);
    if (schema.kind === 'parameters') editable = editableParameters(schema.json, text);
  } catch (failure) {
    if (signal.aborted) throw failure;
  }
  return {
    name: file.name, size: file.size, url: URL.createObjectURL(new Blob([model.stl], { type: 'model/stl' })),
    scad: { sourceUrl: URL.createObjectURL(new Blob([text], { type: 'text/plain' })), local: { name: file.name, text, parameters: editable.parameters, model }, skipped: editable.skipped },
  };
}

// The engine's messages, as a sentence after the file's name.
function compileFailure(name: string, failure: unknown) {
  const message = failure instanceof Error ? failure.message : '';
  if (/timed out/i.test(message)) return `${name} took over a minute to compile, so it was stopped.`;
  const reason = message.replace(/^evaluation error:\s*/i, '').trim();
  return reason ? `${name} couldn’t be opened. ${reason.charAt(0).toUpperCase()}${reason.slice(1)}` : `${name} couldn’t be opened.`;
}

export default function ModelViewer({ entry }: { entry: ViewerEntry & { href: string } }) {
  const [file, setFile] = useState<OpenFile | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [dragging, setDragging] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const job = useRef<AbortController | null>(null);
  const latest = useRef<OpenFile | null>(null);
  latest.current = file;

  // A newer file, or Cancel, abandons one still being checked or compiled.
  const open = async (picked: File | undefined) => {
    if (!picked) return;
    const scad = /\.scad$/i.test(picked.name);
    if (!scad && !/\.stl$/i.test(picked.name)) { setError(`${picked.name} isn’t an STL or OpenSCAD file. Choose a file ending in .stl or .scad.`); return; }
    job.current?.abort();
    const controller = new AbortController();
    job.current = controller;
    setError('');
    let next: OpenFile;
    if (scad) {
      setBusy(`Loading the geometry engine for ${picked.name}…`);
      try {
        next = await compileScad(picked, controller.signal, () => { if (!controller.signal.aborted) setBusy(`Compiling ${picked.name}…`); });
      } catch (failure) {
        if (controller.signal.aborted) return;
        setBusy('');
        setError(compileFailure(picked.name, failure));
        return;
      }
    } else {
      if (!await looksLikeStl(picked)) {
        if (!controller.signal.aborted) { setBusy(''); setError(`${picked.name} doesn’t look like an STL file, so it wasn’t opened.`); }
        return;
      }
      next = { name: picked.name, size: picked.size, url: URL.createObjectURL(picked) };
    }
    if (controller.signal.aborted) { release(next); return; }
    if (latest.current) release(latest.current);
    setBusy('');
    setFile(next);
  };
  const openRef = useRef(open);
  openRef.current = open;

  // Files dropped anywhere on the page open here rather than the browser navigating to them.
  useEffect(() => {
    let depth = 0;
    const carriesFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false;
    const enter = (event: DragEvent) => { if (carriesFiles(event)) { depth++; setDragging(true); } };
    const leave = (event: DragEvent) => { if (carriesFiles(event) && --depth <= 0) { depth = 0; setDragging(false); } };
    const over = (event: DragEvent) => { if (carriesFiles(event)) { event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'; } };
    const drop = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      depth = 0;
      setDragging(false);
      void openRef.current(event.dataTransfer?.files[0]);
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('dragover', over);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('dragover', over);
      window.removeEventListener('drop', drop);
    };
  }, []);
  useEffect(() => () => {
    job.current?.abort();
    if (latest.current) release(latest.current);
  }, []);

  // One entry per file: a new one, or a new camera array, rebuilds the 3D scene.
  const viewed = useMemo<(CadEntry & { href: string }) | null>(() => file && {
    type: 'cad', title: file.name, date: entry.date, href: '', model: file.url,
    ...(file.scad?.local.parameters.length ? { source: file.scad.sourceUrl, customizer: { outputLabel: 'Console output' } } : {}),
    // STL files carry no units, and OpenSCAD's are conventionally millimetres; measurements
    // read as millimetres, with inches alongside.
    description: `${file.scad ? 'Compiled' : 'Opened'} in this browser; nothing is uploaded. Measurements assume the ${file.scad ? 'design' : 'file'} is in millimetres.`,
    preview: `${entry.href}${entry.preview}`, previewDark: entry.previewDark && `${entry.href}${entry.previewDark}`,
    // Front, right and top, as the other models open.
    camera: [1.35, -1.8, 1.1],
  }, [file, entry]);
  const choose = <button type="button" className="cad-file-choose" onClick={() => { picker.current?.click(); }}>{file ? 'Open another file' : 'Choose a file'}</button>;
  const scad = file?.scad;
  // Without a parameter panel, a SCAD file's download, console output and warnings show here.
  const plain = scad && !scad.local.parameters.length ? scad.local.model : undefined;
  const output = plain?.output.replace(/^ECHO:\s*/gm, '').trim();

  return <section className="cad cad-model-viewer" aria-label="Model viewer">
    <p className="cad-description">{entry.description}</p>
    <input ref={picker} type="file" accept=".stl,.scad,model/stl" hidden onChange={event => { void open(event.target.files?.[0]); event.target.value = ''; }} />
    {file && <div className="cad-file-bar">
      {choose}
      <span className="cad-file-name">{file.name} · {sizeText(file.size)}</span>
      {plain && <a href={file.url} download={file.name.replace(/\.scad$/i, '.stl')}>Download STL ↓</a>}
    </div>}
    {busy && <p className="cad-file-status" role="status">{busy}{' '}
      <button type="button" className="cad-file-cancel" onClick={() => { job.current?.abort(); setBusy(''); }}>Cancel</button></p>}
    {error && <p className="cad-error" role="alert">{error}</p>}
    {scad && scad.skipped.length > 0 && <p className="cad-file-status">
      Not editable here, so {scad.skipped.length === 1 ? 'it keeps its value' : 'they keep their values'} from the file: {scad.skipped.join(', ')}. The controls
      cover numbers, text, true or false, and choices.</p>}
    {file && viewed
      ? <CadViewer key={file.url} downloads={false} local={scad?.local} entry={viewed} />
      : <div className="cad-dropzone">
        <p><strong>Drop an STL or OpenSCAD file anywhere on this page</strong> to view it, or choose one.</p>
        <p>STL files open as they are. OpenSCAD files compile in this browser, with their Customizer parameters as controls. Nothing is uploaded.</p>
        {choose}
      </div>}
    {output && <details className="cad-model-output cad-file-output"><summary>Console output</summary><pre>{output}</pre></details>}
    {plain?.warnings && <details className="cad-model-output cad-file-output"><summary>OpenSCAD warnings</summary><pre>{plain.warnings}</pre></details>}
    {dragging && <div className="cad-drop-overlay" aria-hidden="true"><span>Drop to open</span></div>}
    {entry.notes && <p className="cad-notes">{entry.notes}</p>}
  </section>;
}
