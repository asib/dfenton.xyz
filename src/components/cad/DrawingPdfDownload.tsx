import { useEffect, useRef, useState } from 'react';
import type { DrawingOutput } from './drawings';

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
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cad'}-drawings.pdf`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => { URL.revokeObjectURL(url); }, 1000);
      setMessage('PDF downloaded. Use the written dimensions; drawings are not to scale.');
    } catch {
      setMessage(job.signal.aborted
        ? 'Model changed. Download again when the drawings are up to date.'
        : 'Could not create the PDF. Please try again.');
    } finally {
      active.current = undefined;
      setBusy(false);
    }
  };

  return <div className="cad-drawing-export">
    <button type="button" disabled={!output.sheet || output.stale || busy} onClick={() => { void download(); }}
      title="All assembly, joint, and part sheets. US Letter pages with white backgrounds." aria-describedby="cad-pdf-status">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
      </svg>
      {busy ? 'Preparing PDF…' : 'Download drawings PDF'}
    </button>
    <span id="cad-pdf-status" role="status" className="cad-pdf-status">{message}</span>
  </div>;
}
