import init, { parameters, render } from 'openrscad-engine/web';
import wasmUrl from 'openrscad-engine/openrscad_bg.wasm?url';
import { binaryStl } from './stl';
import { displayMesh, type DisplayMesh } from './displayMesh';
import { compileDrawings } from './drawingCompiler';
import type { DrawingSheet } from './drawings';
import { analyzeConflicts, type Conflict, type ConflictInput } from './conflicts';

// A conflicts job explains a failed assertion in `source` (see conflicts.ts). A lenient
// compile, for visitors' own files, returns warnings with the model instead of failing,
// except for include and use files that can't be opened, which leave the model incomplete.
export interface CompileRequest { kind: 'parameters' | 'compile' | 'conflicts'; source: string; drawings?: boolean; inputs?: ConflictInput[]; precision?: number; lenient?: boolean }
export interface CompiledModel { kind: 'model'; stl: ArrayBuffer; output: string; display?: DisplayMesh; drawings?: DrawingSheet; warnings?: string }
export type CompileResponse = { kind: 'ready' } | { kind: 'parameters'; json: string } |
  CompiledModel | { kind: 'conflicts'; conflicts: Conflict[] | null } | { kind: 'error'; message: string };

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
    if (data.kind === 'conflicts') {
      const conflicts = analyzeConflicts(data.source, data.inputs ?? [], render, { precision: data.precision });
      self.postMessage({ kind: 'conflicts', conflicts } satisfies CompileResponse);
      return;
    }
    const result = render(data.source);
    try {
      if (!result.ok) throw new Error(result.error);
      if (result.geom_errors) throw new Error(result.geom_errors);
      const missing = [...result.warnings.matchAll(/Can't open (?:include|'use') file '([^']+)'/g)].map(match => match[1]);
      if (missing.length) throw new Error(`This design needs ${[...new Set(missing)].join(', ')}, which can’t be opened here; only single-file designs compile in this viewer.`);
      if (result.warnings && !data.lenient) throw new Error(result.warnings);
      if (result.is_2d) throw new Error('This viewer requires a solid 3D model.');
      if (!result.positions.length) throw new Error('The model is empty: it has no 3D geometry.');
      const stl = binaryStl(result.positions, result.normals);
      const display = displayMesh(result.preview_positions, result.preview_normals, result.groups);
      const drawings = data.drawings ? compileDrawings(data.source, render) : undefined;
      self.postMessage({ kind: 'model', stl, output: result.echo, display, drawings, warnings: result.warnings || undefined } satisfies CompileResponse, { transfer: [stl] });
    } finally {
      result.free();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The model could not be generated.';
    self.postMessage({ kind: 'error', message } satisfies CompileResponse);
  }
};
