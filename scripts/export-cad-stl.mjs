// Run with Bun; writes the default binary STL from the same engine as the browser compiler.
import { readFileSync, writeFileSync } from 'node:fs';
import { render } from 'openrscad-engine/node';
import { binaryStl } from '../src/components/cad/stl.ts';

const [sourcePath, outputPath] = process.argv.slice(2);
if (!sourcePath || !outputPath) throw new Error('Usage: bun scripts/export-cad-stl.mjs source.scad model.stl');
const result = render(readFileSync(sourcePath, 'utf8'));
try {
  if (!result.ok || result.geom_errors || result.warnings || result.is_2d) {
    throw new Error(result.error || result.geom_errors || result.warnings || 'Expected a 3D model.');
  }
  writeFileSync(outputPath, Buffer.from(binaryStl(result.positions, result.normals)));
  console.log(`Saved ${result.positions.length / 9} triangles to ${outputPath}`);
} finally { result.free(); }
