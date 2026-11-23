import { createEngine } from 'featurescript-engine';
import wasmUrl from 'featurescript-engine/fs_wasm.wasm?url';
import dataUrl from 'featurescript-engine/fs_wasm.data?url';
import { siteSchema } from './featurescript';
import type { CompileResponse } from './compiler.worker';

// The fonts sketch text can use, fetched only for designs whose text uses them.
const fonts = import.meta.glob<string>('/node_modules/featurescript-engine/fonts/*.ttf', { query: '?url', import: 'default', eager: true });

// A parameters job reads a feature's parameters; a compile job builds it with `values`
// (others take their defaults). A fresh worker bounds each job's WebAssembly memory, as
// for OpenSCAD.
export interface FeatureScriptRequest { kind: 'parameters' | 'compile'; language: 'featurescript'; source: string; values?: Record<string, string | number | boolean> }

self.onmessage = async ({ data }: MessageEvent<FeatureScriptRequest>) => {
  try {
    const engine = await createEngine({
      locateFile: (name) => name.endsWith('.wasm') ? wasmUrl : name.endsWith('.data') ? dataUrl : name,
      loadFont: async (name) => {
        const url = fonts[`/node_modules/featurescript-engine/fonts/${name}`];
        if (!url) throw new Error(`The font ${name} isn’t available.`);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`The font ${name} could not load.`);
        return response.arrayBuffer();
      },
    });
    self.postMessage({ kind: 'ready' } satisfies CompileResponse);
    if (data.kind === 'parameters') {
      const schema = await engine.parameters(data.source);
      self.postMessage({ kind: 'parameters', json: JSON.stringify(siteSchema(schema)) } satisfies CompileResponse);
      return;
    }
    const built = await engine.build(data.source, data.values ?? {});
    const stl = built.stl.slice().buffer, step = built.step.slice().buffer;
    self.postMessage({ kind: 'model', stl, step, output: built.log } satisfies CompileResponse, { transfer: [stl, step] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The model could not be generated.';
    self.postMessage({ kind: 'error', message } satisfies CompileResponse);
  }
};
