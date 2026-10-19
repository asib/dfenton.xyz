// Run with Bun; uses the same engine and validation as the browser compiler.
import { readFileSync, writeFileSync } from 'node:fs';
import { render } from 'openrscad-engine/node';
import { displayMesh } from '../src/components/cad/displayMesh.ts';

const [sourcePath, outputPath] = process.argv.slice(2);
if (!sourcePath || !outputPath) throw new Error('Usage: bun scripts/export-cad-display.mjs source.scad display.json');
const result = render(readFileSync(sourcePath, 'utf8'));
try {
  if (!result.ok || result.geom_errors || result.warnings || result.is_2d) {
    throw new Error(result.error || result.geom_errors || result.warnings || 'Expected a 3D model.');
  }
  const mesh = displayMesh(result.preview_positions, result.preview_normals, result.groups);
  if (!mesh) throw new Error('The source has no colored display geometry.');
  writeFileSync(outputPath, JSON.stringify({ version: 1, positions: Array.from(mesh.positions), normals: Array.from(mesh.normals), groups: mesh.groups }) + '\n');
  console.log(`Saved ${mesh.groups.length} colored groups to ${outputPath}`);
} finally { result.free(); }
