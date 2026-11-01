import { useEffect, useRef, useState } from 'react';
import type { ViewerEntry } from '../../misc';
import CadViewer from './CadViewer';
import './cad.css';

// The 3D viewer for visitors' own STL files: drop one anywhere on the page or choose one,
// and it opens with the usual tools (measuring, sections, the orientation cube). Files stay
// in the browser as object URLs; nothing is uploaded.
interface OpenFile { name: string; size: number; url: string }

const sizeText = (bytes: number) => bytes < 1024 * 1024 ? `${String(Math.max(1, Math.round(bytes / 1024)))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

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

export default function ModelViewer({ entry }: { entry: ViewerEntry & { href: string } }) {
  const [file, setFile] = useState<OpenFile | null>(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const latest = useRef<OpenFile | null>(null);
  latest.current = file;

  const open = async (picked: File | undefined) => {
    if (!picked) return;
    if (!/\.stl$/i.test(picked.name)) { setError(`${picked.name} isn’t an STL file. Choose a file ending in .stl.`); return; }
    if (!await looksLikeStl(picked)) { setError(`${picked.name} doesn’t look like an STL file, so it wasn’t opened.`); return; }
    if (latest.current) URL.revokeObjectURL(latest.current.url);
    setError('');
    setFile({ name: picked.name, size: picked.size, url: URL.createObjectURL(picked) });
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
  useEffect(() => () => { if (latest.current) URL.revokeObjectURL(latest.current.url); }, []);

  const choose = <button type="button" className="cad-file-choose" onClick={() => { picker.current?.click(); }}>{file ? 'Open another file' : 'Choose an STL file'}</button>;

  return <section className="cad cad-model-viewer" aria-label="Model viewer">
    <p className="cad-description">{entry.description}</p>
    <input ref={picker} type="file" accept=".stl,model/stl" hidden onChange={event => { void open(event.target.files?.[0]); event.target.value = ''; }} />
    {file && <div className="cad-file-bar">{choose}<span className="cad-file-name">{file.name} · {sizeText(file.size)}</span></div>}
    {error && <p className="cad-error" role="alert">{error}</p>}
    {file
      ? <CadViewer key={file.url} downloads={false} entry={{
        type: 'cad', title: file.name, date: entry.date, href: '', model: file.url,
        // STL files carry no units; measurements read as millimetres, with inches alongside.
        description: 'Opened in this browser; nothing is uploaded. Measurements assume the file is in millimetres.',
        preview: `${entry.href}${entry.preview}`, previewDark: entry.previewDark && `${entry.href}${entry.previewDark}`,
        // Front, right and top, as the other models open.
        camera: [1.35, -1.8, 1.1],
      }} />
      : <div className="cad-dropzone">
        <p><strong>Drop an STL file anywhere on this page</strong> to view it, or choose one.</p>
        <p>Binary and ASCII STL files open in this browser; nothing is uploaded.</p>
        {choose}
      </div>}
    {dragging && <div className="cad-drop-overlay" aria-hidden="true"><span>Drop to open</span></div>}
    {entry.notes && <p className="cad-notes">{entry.notes}</p>}
  </section>;
}
