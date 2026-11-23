import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { createEngine } from 'featurescript-engine';
import { featureScriptDownload, isFeatureScript, siteSchema } from '../src/components/cad/featurescript';
import { parseParameters } from '../src/components/cad/parameters';

const engineFiles = new URL('.', import.meta.resolve('featurescript-engine'));
const source = readFileSync(new URL('../public/misc/featurescript-desk-tidy/desk-tidy.fs', import.meta.url), 'utf8');
const engine = await createEngine({
  locateFile: (name) => new URL(name, engineFiles).pathname,
  loadFont: async (name) => readFileSync(new URL(`fonts/${name}`, engineFiles)),
});
const volume = (log) => Number(/Desk tidy: ([\d.]+) mm³/.exec(log)?.[1]);
// A binary STL is an 80-byte header, a triangle count and 50 bytes per triangle.
const triangles = (stl) => {
  const count = new DataView(stl.buffer, stl.byteOffset, stl.byteLength).getUint32(80, true);
  expect(stl.byteLength).toBe(84 + count * 50);
  return count;
};

describe('FeatureScript designs', () => {
  test('are told by their file names, and download under them', () => {
    expect(isFeatureScript('desk-tidy.fs')).toBe(true);
    expect(isFeatureScript('desk-tidy.scad')).toBe(false);
    expect(featureScriptDownload('desk-tidy.fs', 'step')).toBe('desk-tidy.step');
  });

  test('map the engine’s parameters to the panel’s, labels and conditions alongside', () => {
    const { params, conditions } = siteSchema({ feature: 'f', features: ['f'], params: [
      { name: 'turn', caption: 'Turn', description: '', group: 'Parameters', type: 'number', value: 30, units: '°', control: { kind: 'spinbox', step: 1, min: 0, max: 90 } },
      { name: 'handle', caption: 'Handle', description: '', group: 'Parameters', type: 'bool', value: true, units: '', control: { kind: 'checkbox' } },
      { name: 'grip', caption: 'Grip', description: '', group: 'Parameters', type: 'number', value: 3, units: 'mm', control: { kind: 'spinbox', step: 0.1 }, condition: { parameter: 'handle', value: true } },
    ] });
    const parameters = parseParameters(JSON.stringify({ params }));
    expect(parameters.map(parameter => parameter.label)).toEqual(['Turn (°)', 'Handle', 'Grip']);
    expect(parameters[1].type).toBe('boolean');
    expect(conditions).toEqual({ grip: { parameter: 'handle', value: true } });
  });

  test('read the desk tidy’s parameters from its precondition', async () => {
    const schema = await engine.parameters(source);
    expect(schema.feature).toBe('showcase');
    const { params, conditions } = siteSchema(schema);
    const parameters = parseParameters(JSON.stringify({ params }));
    expect(parameters.map(parameter => parameter.name)).toEqual(['length', 'width', 'thickness', 'cornerRadius', 'edgeFinish',
      'vaseHeight', 'pins', 'holes', 'handle', 'handleRadius', 'label']);
    expect(parameters.find(parameter => parameter.name === 'length')).toMatchObject({ label: 'Plate length', value: 120, control: { min: 110, max: 200 } });
    expect(parameters.find(parameter => parameter.name === 'edgeFinish')?.control.options).toEqual([
      { value: 'ROUND', label: 'Rounded' }, { value: 'CHAMFER', label: 'Chamfered' }]);
    expect(conditions).toEqual({ handleRadius: { parameter: 'handle', value: true } });
  }, 120_000);

  test('build the committed default model, and edited values', async () => {
    const defaults = await engine.build(source);
    expect(volume(defaults.log)).toBeCloseTo(108876.153, 2);
    const committed = new Uint8Array(readFileSync(new URL('../public/misc/featurescript-desk-tidy/desk-tidy.stl', import.meta.url)));
    expect(triangles(defaults.stl)).toBe(triangles(committed));
    expect(new TextDecoder().decode(defaults.step.slice(0, 13))).toBe('ISO-10303-21;');
    const edited = await engine.build(source, { length: 160, pins: 5, handle: false, label: 'HI' });
    expect(volume(edited.log)).toBeGreaterThan(volume(defaults.log) + 10_000);
  }, 120_000);

  test('refuse values outside a choice with the engine’s message', async () => {
    await expect(engine.build(source, { edgeFinish: 'WAVY' })).rejects.toThrow('edgeFinish must be one of its choices');
  }, 120_000);
});

describe('The inbox zero toggle', () => {
  const toggle = readFileSync(new URL('../public/misc/inbox-zero-toggle/inbox-zero-toggle.fs', import.meta.url), 'utf8');
  // Each part's volume, by name, from the engine's log.
  const parts = (log) => Object.fromEntries([...log.matchAll(/^(\w+): ([\d.]+) mm³$/gm)].map(([, name, volume]) => [name, Number(volume)]));

  test('reads its parameters, the magnets’ sizes only with magnets', async () => {
    const { params, conditions } = siteSchema(await engine.parameters(toggle));
    expect(parseParameters(JSON.stringify({ params })).map(parameter => parameter.label)).toEqual(['Inbox zero', 'Length', 'Height',
      'Thickness', 'Clearance', 'Magnets', 'Magnet diameter', 'Magnet thickness', 'Label']);
    expect(conditions).toEqual({ magnetDiameter: { parameter: 'magnets', value: true }, magnetThickness: { parameter: 'magnets', value: true } });
  }, 120_000);

  test('builds its three parts as committed, and flips to OFF', async () => {
    const on = await engine.build(toggle);
    expect(Object.keys(parts(on.log))).toEqual(['Retainer', 'Knob', 'Base']);
    const committed = new Uint8Array(readFileSync(new URL('../public/misc/inbox-zero-toggle/inbox-zero-toggle.stl', import.meta.url)));
    expect(triangles(on.stl)).toBe(triangles(committed));
    // At OFF the knob and retainer move to the other end: the same parts, elsewhere.
    const off = await engine.build(toggle, { on: false });
    for (const [name, volume] of Object.entries(parts(on.log))) expect(parts(off.log)[name]).toBeCloseTo(volume, 2);
    expect(Buffer.from(off.stl).equals(Buffer.from(on.stl))).toBe(false);
  }, 120_000);
});
