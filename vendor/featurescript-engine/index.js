// The FeatureScript engine in the browser (or Node): a Feature Studio's feature parameters, and the feature built
// with edited values into STL and STEP, by the engine compiled to WebAssembly (fs_wasm.js, .wasm and .data, std).
//
//   const engine = await createEngine({ locateFile: (name) => urls[name], loadFont: (name) => fetchBytes(name) });
//   const schema = await engine.parameters(source);        // { feature, features, params: [...] }
//   const { stl, step, log } = await engine.build(source, { length: 160 });
//
// Parameters come in the shape OpenSCAD's Customizer gives them: name, caption, description, group, type ('number',
// 'bool' or 'string'), value (the default), units ('mm', '°' or ''), control ({ kind: 'spinbox' | 'checkbox' |
// 'text' | 'dropdown', min, max, step, options }) and condition ({ parameter, value }: shown only then). Lengths are
// millimetres and angles degrees. A failed build rejects with the engine's message.

import createModule from './fs_wasm.js';

/** The fonts sketch text can use, as files the page serves (fonts/). */
export const FONTS = [
  'AllertaStencil-Regular.ttf', 'Arimo-Bold.ttf', 'Arimo-BoldItalic.ttf', 'Arimo-Italic.ttf', 'Arimo-Regular.ttf',
  'DroidSansMono.ttf', 'NotoSans-Bold.ttf', 'NotoSans-BoldItalic.ttf', 'NotoSans-Italic.ttf', 'NotoSans-Regular.ttf',
  'NotoSerif-Bold.ttf', 'NotoSerif-BoldItalic.ttf', 'NotoSerif-Italic.ttf', 'NotoSerif-Regular.ttf',
  'OpenSans-Bold.ttf', 'OpenSans-BoldItalic.ttf', 'OpenSans-Italic.ttf', 'OpenSans-Regular.ttf',
  'RobotoSlab-Bold.ttf', 'RobotoSlab-Regular.ttf', 'Tinos-Bold.ttf', 'Tinos-BoldItalic.ttf', 'Tinos-Italic.ttf',
  'Tinos-Regular.ttf',
];

/** The fonts a Feature Studio's sketch text may need: those it names, and Open Sans, the default. */
export function fontsUsed(source) {
  if (!/\bskText\s*\(/.test(source)) return [];
  const named = [...source.matchAll(/"fontName"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
  return [...new Set(['OpenSans-Regular.ttf', ...named])].filter((font) => FONTS.includes(font));
}

const PATH = '/work/studio.fs';

/**
 * Starts the engine. `locateFile(name)` gives the URL of `fs_wasm.wasm` or `fs_wasm.data`; `loadFont(name)` resolves
 * to a font file's bytes (an ArrayBuffer or Uint8Array), called only for the fonts a design's text uses.
 */
export async function createEngine({ locateFile, loadFont, print } = {}) {
  const output = [];
  const module = await createModule({
    locateFile: locateFile ?? ((name) => name),
    print: print ?? ((line) => output.push(line)),
    printErr: print ?? ((line) => output.push(line)),
  });
  module.FS.mkdirTree('/work');
  module.FS.mkdirTree('/fonts');
  const loaded = new Set();
  const read = (path) => module.FS.readFile(path, { encoding: 'utf8' });
  const call = (name, args) => module.ccall(name, 'number', args.map(() => 'string'), args);

  return {
    /** The features a Feature Studio defines and the parameters of `feature` (or its first). */
    async parameters(source, feature = '') {
      module.FS.writeFile(PATH, source);
      const code = call('fs_parameters', [PATH, feature, '/work/parameters.json']);
      const text = read('/work/parameters.json');
      if (code !== 0) throw new Error(text);
      return JSON.parse(text);
    },

    /**
     * Builds `feature` (or the first) with `values` (parameter values by name; others take their defaults) into an
     * STL (binary, millimetres) and a STEP, with the log: what the feature printed and each part's volume.
     */
    async build(source, values = {}, feature = '') {
      for (const font of fontsUsed(source)) {
        if (loaded.has(font) || !loadFont) continue;
        module.FS.writeFile(`/fonts/${font}`, new Uint8Array(await loadFont(font)));
        loaded.add(font);
      }
      module.FS.writeFile(PATH, source);
      const code = call('fs_build', [PATH, feature, JSON.stringify(values), '/work/out']);
      const log = read('/work/out.log');
      if (code !== 0) throw new Error(log.trim() || 'The feature could not be built.');
      return { stl: module.FS.readFile('/work/out.stl'), step: module.FS.readFile('/work/out.step'), log };
    },
  };
}
