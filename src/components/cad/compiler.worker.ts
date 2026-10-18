import init, { parameters, render } from 'openrscad-engine/web';
import wasmUrl from 'openrscad-engine/openrscad_bg.wasm?url';
import { binaryStl } from './stl';

export interface CompileRequest { kind: 'parameters' | 'compile'; source: string }
export type CompileResponse = { kind: 'ready' } | { kind: 'parameters'; json: string } |
  { kind: 'model'; stl: ArrayBuffer } | { kind: 'error'; message: string };

// Use the published raw API: 0.14.0's convenience wrapper has a mismatched
// render_with_files signature. A fresh worker bounds each job's WASM memory.
self.onmessage = async ({ data }: MessageEvent<CompileRequest>) => {
  try {
    await init({ module_or_path: wasmUrl });
    self.postMessage({ kind: 'ready' } satisfies CompileResponse);
    if (data.kind === 'parameters') {
      self.postMessage({ kind: 'parameters', json: parameters(data.source) } satisfies CompileResponse);
      return;
    }
    const result = render(data.source);
    try {
      if (!result.ok) throw new Error(result.error);
      if (result.geom_errors) throw new Error(result.geom_errors);
      if (result.warnings) throw new Error(result.warnings);
      if (result.is_2d) throw new Error('This viewer requires a solid 3D model.');
      const stl = binaryStl(result.positions, result.normals);
      self.postMessage({ kind: 'model', stl } satisfies CompileResponse, { transfer: [stl] });
    } finally {
      result.free();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The model could not be generated.';
    self.postMessage({ kind: 'error', message } satisfies CompileResponse);
  }
};
