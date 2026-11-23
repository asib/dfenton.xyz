import type { ParameterCondition } from '../../misc';

// FeatureScript designs compile in the browser with the FeatureScript engine compiled to
// WebAssembly (the featurescript-engine package). The engine reads a feature's parameters from
// its precondition in the shape OpenSCAD's Customizer gives; this turns them into the
// panel's schema: each parameter's annotation name as its label (angles marked in degrees),
// and the conditions under which a parameter applies, which the panel takes from the
// design rather than the item's metadata.

export const isFeatureScript = (name: string) => /\.fs$/i.test(name);

interface EngineParameter {
  name: string;
  caption: string;
  description: string;
  group: string;
  type: 'number' | 'bool' | 'string';
  value: number | boolean | string;
  units: string;
  control: { kind: string; min?: number; max?: number; step?: number; options?: { value: string; label: string }[] };
  condition?: { parameter: string; value: number | boolean | string };
}
export interface EngineSchema { feature: string; features: string[]; params: EngineParameter[] }

// The panel's schema (as parseParameters reads it), with the conditions alongside.
export function siteSchema(schema: EngineSchema): { params: unknown[]; conditions: Record<string, ParameterCondition> } {
  const conditions: Record<string, ParameterCondition> = {};
  const params = schema.params.map(({ caption, units, condition, ...parameter }) => {
    if (condition) conditions[parameter.name] = { parameter: condition.parameter, value: condition.value };
    return { ...parameter, label: units === '°' ? `${caption} (°)` : caption };
  });
  return { params, conditions };
}

// A design's file name for downloads, from its source's name.
export const featureScriptDownload = (name: string, extension: 'stl' | 'step') => name.replace(/\.fs$/i, `.${extension}`);
