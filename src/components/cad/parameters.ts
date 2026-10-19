export type ParameterValue = string | number | boolean;
export type Values = Record<string, ParameterValue>;
export interface Parameter {
  name: string;
  group: string;
  description: string;
  type: 'number' | 'string' | 'boolean';
  value: ParameterValue;
  control: {
    kind: string;
    min?: number;
    max?: number;
    step?: number;
    options?: { value: ParameterValue; label: string }[];
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
function isValue(value: unknown): value is ParameterValue {
  return typeof value === 'string' || typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value));
}

// The engine supplies the Customizer schema. Reject unsupported types instead of
// silently dropping an author's fields (this UI currently supports scalar values).
export function parseParameters(json: string): Parameter[] {
  const schema: unknown = JSON.parse(json);
  if (!isRecord(schema) || !Array.isArray(schema.params) || !schema.params.length) {
    throw new Error('This source has no editable parameters.');
  }
  const names = new Set<string>();
  return schema.params.map((item: unknown): Parameter => {
    if (!isRecord(item) || typeof item.name !== 'string' || !/^[a-zA-Z_]\w*$/.test(item.name) ||
        names.has(item.name) || (item.group != null && typeof item.group !== 'string') ||
        (item.description != null && typeof item.description !== 'string') ||
        !isValue(item.value) || (item.type === 'bool' ? 'boolean' : item.type) !== typeof item.value || !isRecord(item.control) ||
        typeof item.control.kind !== 'string') {
      throw new Error('This source contains an unsupported parameter.');
    }
    names.add(item.name);
    const control = { ...item.control };
    for (const key of ['min', 'max', 'step']) {
      if (control[key] === null) control[key] = undefined;
      if (control[key] !== undefined && (typeof control[key] !== 'number' || !Number.isFinite(control[key]))) {
        throw new Error(`Invalid range for ${item.name}.`);
      }
    }
    if (control.options !== undefined && (!Array.isArray(control.options) ||
        !control.options.every((option: unknown) => isRecord(option) &&
          isValue(option.value) && typeof option.value === item.type && typeof option.label === 'string'))) {
      throw new Error(`Invalid choices for ${item.name}.`);
    }
    const group = item.group === '' ? 'Parameters' : item.group ?? 'Parameters';
    return { ...item, type: typeof item.value, group, description: item.description ?? '', control } as Parameter;
  });
}

export function defaults(parameters: Parameter[]): Values {
  return Object.fromEntries(parameters.map((parameter) => [parameter.name, parameter.value]));
}

export function parameterLabel(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' ');
}

// Replace the public literal assignments, preserving original comments, model
// logic and attribution. The exact resulting source is compiled AND downloaded.
export function configuredSource(source: string, parameters: Parameter[], values: Values): string {
  let result = source;
  for (const parameter of parameters) {
    const value = values[parameter.name];
    if (!isValue(value) || typeof value !== parameter.type) throw new Error(`Enter a valid ${parameterLabel(parameter.name).toLowerCase()}.`);
    const assignment = new RegExp(`^([\\t ]*${parameter.name}[\\t ]*=[\\t ]*)("(?:\\\\.|[^"\\\\])*"|[^;\\r\\n]+)(;)`, 'm');
    const match = assignment.exec(result);
    if (!match) throw new Error(`Cannot configure ${parameter.name} in this source.`);
    // Do not edit a derived expression or an identically named local variable.
    let original: unknown;
    try { original = JSON.parse(match[2]); } catch { throw new Error(`Expected a literal default for ${parameter.name}.`); }
    if (original !== parameter.value) throw new Error(`The default for ${parameter.name} does not match the source.`);
    result = result.replace(assignment, (_match, prefix: string, _literal: string, suffix: string) => `${prefix}${JSON.stringify(value)}${suffix}`);
  }
  return result;
}
