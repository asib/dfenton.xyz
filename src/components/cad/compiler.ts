import type { CompileRequest, CompileResponse } from './compiler.worker';
import type { FeatureScriptMessage, FeatureScriptReply, FeatureScriptRequest, ModelExports } from './featurescript.worker';

type Result = Exclude<CompileResponse, { kind: 'ready' } | { kind: 'error' }>;
const cancelledError = () => new DOMException('Cancelled', 'AbortError');

// OpenSCAD sources compile in compiler.worker.ts; FeatureScript sources, marked by their
// language, in featurescript.worker.ts, whose engine is larger and takes longer to load.
// A FeatureScript compile asked for a `preview` resolves with a coarse mesh to show, and
// gives the files to download to `onExports` when they're made.
export function compileJob(request: CompileRequest | FeatureScriptRequest, signal: AbortSignal, onReady?: () => void,
  onExports?: (exports: ModelExports) => void) {
  return 'language' in request ? featureScriptJob(request, signal, onReady, onExports) : scadJob(request, signal, onReady);
}

// A fresh worker for each OpenSCAD job bounds its WebAssembly memory.
function scadJob(request: CompileRequest, signal: AbortSignal, onReady?: () => void) {
  return new Promise<Result>((resolve, reject) => {
    if (signal.aborted) { reject(cancelledError()); return; }
    const worker = new Worker(new URL('./compiler.worker.ts', import.meta.url), { type: 'module' });
    const cleanup = () => {
      worker.terminate();
      clearTimeout(timeout);
      signal.removeEventListener('abort', cancel);
    };
    const fail = (error: Error) => { cleanup(); reject(error); };
    const cancel = () => { fail(cancelledError()); };
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

// FeatureScript's engine stays in one worker between jobs. A build on an engine that has
// built before takes two thirds of the time of one on a new engine, which has its code to
// warm up and the standard library to load, and a design is rebuilt once for each change
// of its parameters.
//
// The worker can't be interrupted in the middle of a build. A cancelled job it hasn't
// reached is skipped, and one it is building is left to finish for GRACE: the next job
// usually comes a second after the change that cancelled this one, and finds the engine
// free and warm, where a new engine would take a second or two longer over its first
// build. A build that should take longer than that to finish, going by the quickest build
// of the same design, or that is still running after it, is stopped with its worker, and a
// new worker starts loading the engine.
interface Job {
  request: FeatureScriptRequest;
  signal: AbortSignal;
  onReady?: () => void;
  onExports?: (exports: ModelExports) => void;
  resolve: (result: Result) => void;
  reject: (error: Error) => void;
  cancel: () => void;
  timeout: number;
  // The worker has started on it, and when; its promise has an answer.
  started: boolean;
  startedAt: number;
  settled: boolean;
}
interface Host { worker: Worker; jobs: Map<number, Job>; idle?: number }
let host: Host | undefined;
let nextJob = 1;
const GRACE = 2500;
// The quickest build so far of the design last built, in ms.
let quickest: { source: string; ms: number } | undefined;
// An engine's memory grows as designs need and is never given back: past this, its worker
// is replaced when it's next idle.
const MEMORY_LIMIT = 1.5 * 2 ** 30;
// A worker with nothing to do for this long is stopped, and its engine's memory (some
// 200 MB for the desk tidy) freed: the next job starts another.
const IDLE = 5 * 60_000;

const settle = (job: Job, answer: () => void) => {
  if (job.settled) return;
  job.settled = true;
  answer();
};
const send = (to: Host, message: FeatureScriptMessage) => { to.worker.postMessage(message); };

function startHost(): Host {
  const worker = new Worker(new URL('./featurescript.worker.ts', import.meta.url), { type: 'module' });
  const started: Host = { worker, jobs: new Map() };
  worker.onerror = () => {
    // The worker or the engine could not load: every job waiting on it fails.
    stop(started);
    for (const job of started.jobs.values()) {
      release(job);
      settle(job, () => { job.reject(new Error('The geometry engine could not load. Check your connection and try again.')); });
    }
  };
  worker.onmessage = ({ data }: MessageEvent<FeatureScriptReply>) => {
    const job = started.jobs.get(data.id);
    if (!job) return;
    if (data.kind === 'idle') {
      started.jobs.delete(data.id);
      release(job);
      settle(job, () => { job.reject(job.signal.aborted ? cancelledError() : new Error('The model could not be generated.')); });
      if (started.jobs.size) return;
      if (data.memory > MEMORY_LIMIT) stop(started);
      else {
        clearTimeout(started.idle);
        started.idle = window.setTimeout(() => { if (!started.jobs.size) stop(started); }, IDLE);
      }
      return;
    }
    if (data.kind === 'ready') {
      job.started = true;
      job.startedAt = performance.now();
    }
    if (data.kind === 'model') {
      const ms = performance.now() - job.startedAt, source = job.request.source;
      quickest = { source, ms: quickest?.source === source ? Math.min(quickest.ms, ms) : ms };
    }
    if (job.signal.aborted) return;
    if (data.kind === 'ready') job.onReady?.();
    else if (data.kind === 'exports') job.onExports?.(data);
    else if (data.kind === 'error') settle(job, () => { job.reject(new Error(data.message)); });
    else settle(job, () => { job.resolve(data); });
  };
  return started;
}

const release = (job: Job) => {
  clearTimeout(job.timeout);
  job.signal.removeEventListener('abort', job.cancel);
};
const stop = (stopped: Host) => {
  clearTimeout(stopped.idle);
  stopped.worker.terminate();
  if (host === stopped) host = undefined;
};
// Stops a worker in the middle of a build that isn't wanted, and starts another with the
// jobs that still are.
function replace(stopped: Host) {
  stop(stopped);
  const next = (host = startHost());
  for (const [id, job] of stopped.jobs) {
    if (job.signal.aborted) { release(job); continue; }
    job.started = false;
    next.jobs.set(id, job);
    send(next, { id, request: job.request });
  }
  if (!next.jobs.size) send(next, { warm: true });
}

function featureScriptJob(request: FeatureScriptRequest, signal: AbortSignal, onReady?: () => void,
  onExports?: (exports: ModelExports) => void) {
  return new Promise<Result>((resolve, reject) => {
    if (signal.aborted) { reject(cancelledError()); return; }
    const id = nextJob++;
    // The worker the job is with: a replaced worker's jobs go to the next.
    const holder = () => (host?.jobs.has(id) ? host : undefined);
    const job: Job = {
      request, signal, onReady, onExports, resolve, reject, started: false, startedAt: 0, settled: false,
      cancel: () => {
        settle(job, () => { reject(cancelledError()); });
        const held = holder();
        if (!held) return;
        send(held, { cancel: id });
        const left = job.started && quickest?.source === request.source ? quickest.ms - (performance.now() - job.startedAt) : 0;
        if (left > GRACE) replace(held);
        else window.setTimeout(() => { if (holder() === held && job.started) replace(held); }, GRACE);
      },
      timeout: window.setTimeout(() => {
        settle(job, () => { reject(new Error('Building the design took over two minutes, so it was stopped.')); });
        const held = holder();
        if (!held) return;
        held.jobs.delete(id);
        release(job);
        if (job.started) replace(held);
        else send(held, { cancel: id });
      }, 120_000),
    };
    signal.addEventListener('abort', job.cancel, { once: true });
    const to = (host ??= startHost());
    clearTimeout(to.idle);
    to.jobs.set(id, job);
    send(to, { id, request });
  });
}
