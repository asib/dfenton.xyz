// Run with Bun; builds a FeatureScript design's first feature with its default parameters, by
// the same WebAssembly engine as the browser (the featurescript-engine package), and writes its
// default binary STL and STEP.
import { readFileSync, writeFileSync } from 'node:fs';
import { createEngine } from 'featurescript-engine';

const [sourcePath, stlPath, stepPath] = process.argv.slice(2);
if (!sourcePath || !stlPath || !stepPath) throw new Error('Usage: bun scripts/export-featurescript.mjs source.fs model.stl model.step');
const engineFiles = new URL('.', import.meta.resolve('featurescript-engine'));
const engine = await createEngine({
  locateFile: (name) => new URL(name, engineFiles).pathname,
  loadFont: async (name) => readFileSync(new URL(`fonts/${name}`, engineFiles)),
});
const built = await engine.build(readFileSync(sourcePath, 'utf8'));
writeFileSync(stlPath, built.stl);
writeFileSync(stepPath, built.step);
console.log(`${built.log.trim()}\nSaved ${(built.stl.length - 84) / 50} triangles to ${stlPath} and the STEP to ${stepPath}`);
