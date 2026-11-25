import { createEngine, type Engine } from 'featurescript-engine';
import wasmUrl from 'featurescript-engine/fs_wasm.wasm?url';
import dataUrl from 'featurescript-engine/fs_wasm.data?url';
import { siteSchema } from './featurescript';
import type { CompileResponse } from './compiler.worker';

// The fonts sketch text can use, fetched only for designs whose text uses them.
const fonts = import.meta.glob<string>('/node_modules/featurescript-engine/fonts/*.ttf', { query: '?url', import: 'default', eager: true });

// A parameters job reads a feature's parameters; a compile job builds it with `values`
// (others take their defaults). With `preview`, the model comes first as a coarse mesh for
// the page to show, and the files to download follow as `exports`. `volumes` adds each
// part's volume to the exports' output, which takes about as long as the coarse mesh's
// model does.
export interface FeatureScriptRequest { kind: 'parameters' | 'compile'; language: 'featurescript'; source: string;
  values?: Record<string, string | number | boolean>; preview?: boolean; volumes?: boolean }
export interface ModelExports { kind: 'exports'; stl: ArrayBuffer; step: ArrayBuffer; output: string }
// The page numbers its jobs, says when one's results aren't wanted any more, and asks a new
// worker to start loading the engine. The worker answers a job with its results and then
// `idle`, with the engine's memory in bytes.
export type FeatureScriptMessage = { id: number; request: FeatureScriptRequest } | { cancel: number } | { warm: true };
export type FeatureScriptReply = { id: number } & (CompileResponse | ModelExports | { kind: 'idle'; memory: number });

// How closely the mesh shown first follows the model, in mm: a quarter of the triangles of
// the 0.01 mm mesh that is downloaded, in a quarter of the time.
const PREVIEW_TOLERANCE = 0.05;

// One engine serves every job. It keeps Onshape's standard library and the design loaded,
// and its builds after the first are quicker, so the page keeps this worker between jobs
// (compiler.ts) rather than starting one for each as it does for OpenSCAD.
let engine: Promise<Engine> | undefined;
const load = () => engine ??= createEngine({
  locateFile: (name) => name.endsWith('.wasm') ? wasmUrl : name.endsWith('.data') ? dataUrl : name,
  loadFont: async (name) => {
    const url = fonts[`/node_modules/featurescript-engine/fonts/${name}`];
    if (!url) throw new Error(`The font ${name} isn’t available.`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`The font ${name} could not load.`);
    return response.arrayBuffer();
  },
}).catch((error: unknown) => { engine = undefined; throw error; });

// Jobs run one after another. A build can't be interrupted, so a cancelled job is dropped
// before it starts or between the pieces of its exports.
const waiting = new Set<number>();
const cancelled = new Set<number>();
let queue = Promise.resolve();
// Lets a cancellation that arrived during a build be read before the next piece of work.
const breathe = () => new Promise<void>((resolve) => { setTimeout(resolve); });
const bytes = (file: Uint8Array) => file.slice().buffer;

async function run(id: number, request: FeatureScriptRequest) {
  const reply = (message: CompileResponse | ModelExports, transfer: Transferable[] = []) => {
    self.postMessage({ id, ...message } satisfies FeatureScriptReply, { transfer });
  };
  let memory = 0;
  try {
    if (cancelled.has(id)) return;
    const loaded = await load();
    memory = loaded.memory();
    if (cancelled.has(id)) return;
    reply({ kind: 'ready' });
    if (request.kind === 'parameters') {
      const schema = await loaded.parameters(request.source);
      reply({ kind: 'parameters', json: JSON.stringify(siteSchema(schema)) });
      return;
    }
    const model = await loaded.model(request.source, request.values ?? {});
    memory = loaded.memory();
    if (!request.preview) {
      const stl = bytes(model.mesh()), step = bytes(model.step());
      reply({ kind: 'model', stl, step, output: model.output + model.volumes() }, [stl, step]);
      return;
    }
    const preview = bytes(model.mesh(PREVIEW_TOLERANCE));
    reply({ kind: 'model', stl: preview, output: model.output }, [preview]);
    await breathe();
    if (cancelled.has(id)) return;
    const stl = bytes(model.mesh());
    await breathe();
    if (cancelled.has(id)) return;
    const step = bytes(model.step());
    let output = model.output;
    if (request.volumes) {
      await breathe();
      if (cancelled.has(id)) return;
      output += model.volumes();
    }
    memory = loaded.memory();
    reply({ kind: 'exports', stl, step, output }, [stl, step]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The model could not be generated.';
    reply({ kind: 'error', message });
  } finally {
    waiting.delete(id);
    cancelled.delete(id);
    self.postMessage({ id, kind: 'idle', memory } satisfies FeatureScriptReply);
  }
}

self.onmessage = ({ data }: MessageEvent<FeatureScriptMessage>) => {
  if ('warm' in data) { load().catch(() => undefined); return; }
  if ('cancel' in data) { if (waiting.has(data.cancel)) cancelled.add(data.cancel); return; }
  waiting.add(data.id);
  queue = queue.then(() => run(data.id, data.request));
};
