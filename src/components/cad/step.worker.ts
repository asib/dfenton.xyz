import occtimportjs from 'occt-import-js';
import wasmUrl from 'occt-import-js/dist/occt-import-js.wasm?url';
import { readOptions, referencedFiles, stepMesh, stepUnits, type StepModel } from './stepMesh';

// OpenCascade, as occt-import-js compiles it, reads a STEP file into triangles: several
// megabytes of WASM, so it loads only for a STEP file, and in a fresh worker each time, which
// bounds its memory, as the OpenSCAD engine's does.
export type StepResponse = { kind: 'ready' } | ({ kind: 'model' } & StepModel) | { kind: 'error'; message: string };

self.onmessage = async ({ data }: MessageEvent<ArrayBuffer>) => {
  try {
    const occt = await occtimportjs({ locateFile: () => wasmUrl });
    self.postMessage({ kind: 'ready' } satisfies StepResponse);
    const text = new TextDecoder('latin1').decode(data), units = stepUnits(text);
    const result = occt.ReadStepFile(new Uint8Array(data), readOptions(units));
    if (!result.success) throw new Error('It isn’t a STEP file OpenCascade can read.');
    const mesh = stepMesh(result);
    if (!mesh.positions.length) {
      const others = referencedFiles(text);
      const listed = others.length > 3 ? `${others.slice(0, 3).join(', ')} and ${String(others.length - 3)} more` : others.join(', ');
      throw new Error(others.length ? `Its parts are in other files (${listed}), and only single STEP files open here.` : 'It has no solid geometry to show.');
    }
    self.postMessage({ kind: 'model', mesh, units } satisfies StepResponse, { transfer: [mesh.positions.buffer, mesh.normals.buffer] });
  } catch (error) {
    self.postMessage({ kind: 'error', message: error instanceof Error ? error.message : '' } satisfies StepResponse);
  }
};
