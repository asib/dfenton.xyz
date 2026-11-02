import type { StepResponse } from './step.worker';
import type { StepModel } from './stepMesh';

// Read a visitor's STEP file in a worker. `onReady` follows the reader's loading; the file is
// given up after two minutes, or when `signal` aborts.
export function readStep(file: File, signal: AbortSignal, onReady?: () => void) {
  return new Promise<StepModel>((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('Cancelled', 'AbortError')); return; }
    const worker = new Worker(new URL('./step.worker.ts', import.meta.url), { type: 'module' });
    const cleanup = () => {
      worker.terminate();
      clearTimeout(timeout);
      signal.removeEventListener('abort', cancel);
    };
    const fail = (error: Error) => { cleanup(); reject(error); };
    const cancel = () => { fail(new DOMException('Cancelled', 'AbortError')); };
    const timeout = window.setTimeout(() => { fail(new Error('Reading it took over two minutes, so it was stopped.')); }, 120_000);
    signal.addEventListener('abort', cancel, { once: true });
    worker.onerror = () => { fail(new Error('The STEP reader could not load. Check your connection and try again.')); };
    worker.onmessage = ({ data }: MessageEvent<StepResponse>) => {
      if (data.kind === 'ready') { onReady?.(); return; }
      if (data.kind === 'error') { fail(new Error(data.message)); return; }
      cleanup();
      resolve({ mesh: data.mesh, units: data.units });
    };
    void file.arrayBuffer().then((buffer) => { worker.postMessage(buffer, [buffer]); }, () => { fail(new Error('The file could not be read.')); });
  });
}
