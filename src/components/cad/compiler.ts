import type { CompileRequest, CompileResponse } from './compiler.worker';

export function compileJob(request: CompileRequest, signal: AbortSignal, onReady?: () => void) {
  return new Promise<Exclude<CompileResponse, { kind: 'ready' } | { kind: 'error' }>>((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('Cancelled', 'AbortError')); return; }
    const worker = new Worker(new URL('./compiler.worker.ts', import.meta.url), { type: 'module' });
    const cleanup = () => {
      worker.terminate();
      clearTimeout(timeout);
      signal.removeEventListener('abort', cancel);
    };
    const fail = (error: Error) => { cleanup(); reject(error); };
    const cancel = () => { fail(new DOMException('Cancelled', 'AbortError')); };
    const timeout = window.setTimeout(() => { fail(new Error('Model generation timed out. Try fewer holes or try again.')); }, 60_000);
    signal.addEventListener('abort', cancel, { once: true });
    worker.onerror = () => { fail(new Error('The geometry engine could not load. Check your connection and try again.')); };
    worker.onmessage = ({ data }: MessageEvent<CompileResponse>) => {
      if (data.kind === 'ready') { onReady?.(); return; }
      if (data.kind === 'error') { fail(new Error(data.message)); return; }
      cleanup();
      resolve(data);
    };
    worker.postMessage(request);
  });
}
