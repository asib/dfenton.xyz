// Run with Bun; builds a FeatureScript design's first feature with its default parameters, by
// the same WebAssembly engine as the browser (vendor/featurescript-engine), and writes its
// default binary STL and STEP.
import { readFileSync, writeFileSync } from 'node:fs';
import { createEngine } from '../vendor/featurescript-engine/index.js';

const [sourcePath, stlPath, stepPath] = process.argv.slice(2);
if (!sourcePath || !stlPath || !stepPath) throw new Error('Usage: bun scripts/export-featurescript.mjs source.fs model.stl model.step');
const vendor = new URL('../vendor/featurescript-engine/', import.meta.url);
const engine = await createEngine({
  locateFile: (name) => new URL(name, vendor).pathname,
  loadFont: async (name) => readFileSync(new URL(`fonts/${name}`, vendor)),
});
const built = await engine.build(readFileSync(sourcePath, 'utf8'));
writeFileSync(stlPath, built.stl);
writeFileSync(stepPath, built.step);
console.log(`${built.log.trim()}\nSaved ${(built.stl.length - 84) / 50} triangles to ${stlPath} and the STEP to ${stepPath}`);
