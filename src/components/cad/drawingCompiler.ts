import { displayMesh } from './displayMesh';
import { parseDrawingDefinition, type DrawingSheet } from './drawings';
import { projectDrawing } from './drawingGeometry';

interface RenderResult {
  ok: boolean; error: string; geom_errors: string; warnings: string; is_2d: boolean;
  echo: string; positions: Float32Array; normals: Float32Array;
  preview_positions: Float32Array; preview_normals: Float32Array; groups: string; free: () => void;
}

export function compileDrawings(source: string, render: (source: string) => RenderResult): DrawingSheet {
  const result = render(`$misc_drawing = true;\n${source}`);
  try {
    if (!result.ok || result.geom_errors || result.warnings || result.is_2d) {
      throw new Error(result.error || result.geom_errors || result.warnings || 'Expected solid drawing geometry.');
    }
    const definition = parseDrawingDefinition(result.echo);
    const mesh = displayMesh(result.preview_positions, result.preview_normals, result.groups) ?? {
      positions: result.positions, normals: result.normals, groups: [{ start: 0, count: result.positions.length / 3 }],
    };
    return { units: definition.units, views: definition.views.map(view => projectDrawing(mesh, view)) };
  } finally { result.free(); }
}
