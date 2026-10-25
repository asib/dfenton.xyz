import { useEffect, useRef, useState } from 'react';
import type { DrawingOutput } from './drawings';
import { openTab, showPdf } from './openFile';

export default function DrawingPdfDownload({ output, title }: { output: DrawingOutput; title: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const active = useRef<AbortController>();
  const latest = useRef(output);
  latest.current = output;
  useEffect(() => () => { active.current?.abort(); }, [output.sheet, output.stale]);

  const download = async () => {
    const sheet = output.sheet;
    if (!sheet || output.stale || active.current) return;
    // Opened now, from the click, so pop-up blockers allow it; the PDF follows when ready.
    const tab = openTab(`${title} drawings PDF`);
    const job = new AbortController();
    active.current = job;
    setBusy(true);
    setMessage('Preparing all drawing sheets…');
    try {
      const { createDrawingPdf } = await import('./drawingPdf');
      const blob = await createDrawingPdf(sheet, title, job.signal);
      // An edit can arrive while fonts load or a page is being converted.
      if (latest.current.stale || latest.current.sheet !== sheet) job.abort();
      job.signal.throwIfAborted();
      const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cad'}-drawings.pdf`;
      setMessage(showPdf(tab, blob, filename) === 'opened'
        ? 'PDF opened in a new tab, to print or download. Use the written dimensions; drawings are not to scale.'
        : 'Pop-ups are blocked, so the PDF was downloaded instead. Use the written dimensions; drawings are not to scale.');
    } catch {
      tab?.close();
      setMessage(job.signal.aborted
        ? 'Model changed. Open the PDF again when the drawings are up to date.'
        : 'Could not create the PDF. Please try again.');
    } finally {
      active.current = undefined;
      setBusy(false);
    }
  };

  return <div className="cad-drawing-export">
    <button type="button" disabled={!output.sheet || output.stale || busy} onClick={() => { void download(); }}
      title="All assembly, joint, and part sheets, opened in a new tab to print or download. US Letter pages with white backgrounds." aria-describedby="cad-pdf-status">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />
      </svg>
      {busy ? 'Preparing PDF…' : 'Open drawings PDF'}
    </button>
    <span id="cad-pdf-status" role="status" className="cad-pdf-status">{message}</span>
  </div>;
}
