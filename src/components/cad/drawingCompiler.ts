import { displayMesh } from './displayMesh';
import { parseDrawingDefinition, parsePartDrawingDefinitions, type DrawingSheet, type DrawingView } from './drawings';
import { projectDrawing } from './drawingGeometry';
import { sectionDrawing } from './drawingSections';

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
    const display = displayMesh(result.preview_positions, result.preview_normals, result.groups);
    const mesh = display ?? {
      positions: result.positions, normals: result.normals, groups: [{ start: 0, count: result.positions.length / 3 }],
    };
    const draw = (view: DrawingView, geometry = mesh) => view.section ? sectionDrawing(geometry, view) : projectDrawing(geometry, view);
    const parts = parsePartDrawingDefinitions(result.echo).map(part => {
      const groups = display?.groups.filter(group => part.color.every((n, i) => Math.abs(n - group.color[i]) < 0.00001));
      if (groups?.length !== 1) throw new Error(`Expected one physical mesh for the ${part.title} drawing.`);
      const geometry = { ...mesh, groups };
      return { ...part, views: part.views.map(view => draw(view, geometry)) };
    });
    return { units: definition.units, views: definition.views.map(view => draw(view)), parts };
  } finally { result.free(); }
}
