import type { ParameterCondition } from '../../misc';

// Lists are rows of numbers; a draft cell may be empty ('') while it is being edited.
export type ListValue = (number | '')[][];
export type ParameterValue = string | number | boolean | ListValue;
export type Values = Record<string, ParameterValue>;
export const conditionMatches = (condition: ParameterCondition, values: Values) =>
  // Conditions compare scalar parameters; a list never equals a condition value.
  condition.values ? condition.values.includes(values[condition.parameter] as string | number | boolean) : values[condition.parameter] === condition.value;
export interface Parameter {
  name: string;
  group: string;
  description: string;
  type: 'number' | 'string' | 'boolean' | 'list';
  value: ParameterValue;
  control: {
    kind: string;
    min?: number;
    max?: number;
    step?: number;
    options?: { value: ParameterValue; label: string }[];
    // List parameters: allowed row count, a label for each row, and the columns.
    minRows?: number;
    maxRows?: number;
    rowLabel?: string;
    columns?: ListColumn[];
  };
}
export interface ListColumn { label: string; min?: number; max?: number; step?: number }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
function isValue(value: unknown): value is string | number | boolean {
  return typeof value === 'string' || typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value));
}
const isList = (value: unknown, columns: number): value is number[][] => Array.isArray(value) &&
  value.every(row => Array.isArray(row) && row.length === columns && row.every(cell => typeof cell === 'number' && Number.isFinite(cell)));

const number = (text: string) => text.trim() === '' ? undefined : Number(text);
// List parameters, which the engine's Customizer schema omits, are read from the source:
//   // Description lines
//   Name = [[5, 0], [6, 0]]; // [list:MIN:MAX] Row label | Column:min:max[:step], Column:min:max[:step]
// MAX may be blank for no limit. Rows are numbers only; the group is the preceding /* [Group] */.
export function parseListParameters(source: string): (Parameter & { position: number })[] {
  const lines = source.split('\n');
  const found: (Parameter & { position: number })[] = [];
  let group = 'Parameters', offset = 0;
  for (const [index, line] of lines.entries()) {
    const position = offset;
    offset += line.length + 1;
    const heading = /^\s*\/\*\s*\[([^\]]+)\]\s*\*\/\s*$/.exec(line);
    if (heading) { group = heading[1].trim(); continue; }
    const match = /^[\t ]*([A-Za-z_]\w*)[\t ]*=[\t ]*(\[[^;]*\]);[\t ]*\/\/[\t ]*\[list:(\d+):(\d*)\][\t ]*([^|]+)\|(.+)$/.exec(line);
    if (!match) continue;
    const [, name, literal, minText, maxText, rowLabel, columnText] = match;
    if (group === 'Hidden') continue;
    const columns = columnText.split(',').map((text): ListColumn => {
      const [label, min = '', max = '', step = ''] = text.split(':').map(part => part.trim());
      const column = { label, min: number(min), max: number(max), step: number(step) };
      if (!label || [column.min, column.max, column.step].some(n => n !== undefined && !Number.isFinite(n))) {
        throw new Error(`Invalid column for ${name}.`);
      }
      return column;
    });
    const minRows = Number(minText), maxRows = maxText ? Number(maxText) : undefined;
    let value: unknown;
    try { value = JSON.parse(literal); } catch { throw new Error(`Expected a literal default for ${name}.`); }
    if (!isList(value, columns.length) || value.length < minRows || (maxRows !== undefined && (maxRows < minRows || value.length > maxRows))) {
      throw new Error(`Invalid default rows for ${name}.`);
    }
    const description: string[] = [];
    for (let previous = index - 1; previous >= 0 && /^\s*\/\/(?!\s*\[)/.test(lines[previous]); previous--) {
      description.unshift(lines[previous].replace(/^\s*\/\/\s?/, '').trim());
    }
    found.push({ name, group, description: description.join(' '), type: 'list', value, position,
      control: { kind: 'list', minRows, maxRows, rowLabel: rowLabel.trim(), columns } });
  }
  return found;
}

// The engine supplies the Customizer schema for scalars; list parameters come from
// the source. Reject unsupported types instead of silently dropping an author's fields.
export function parseParameters(json: string, source = ''): Parameter[] {
  const schema: unknown = JSON.parse(json);
  const lists = parseListParameters(source);
  if (!isRecord(schema) || !Array.isArray(schema.params) || (!schema.params.length && !lists.length)) {
    throw new Error('This source has no editable parameters.');
  }
  const names = new Set<string>(lists.map(list => list.name));
  const scalars = schema.params.filter((item: unknown) => !(isRecord(item) && lists.some(list => list.name === item.name))).map((item: unknown): Parameter => {
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
  // Keep source order, so a list appears among its group's scalar parameters.
  const position = (name: string) => source.search(new RegExp(`^[\\t ]*${name}[\\t ]*=`, 'm'));
  return [...scalars.map(parameter => ({ parameter, position: position(parameter.name) })),
    ...lists.map(({ position: at, ...parameter }) => ({ parameter, position: at }))]
    .sort((a, b) => a.position - b.position).map(item => item.parameter);
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
    const list = parameter.type === 'list';
    if (list ? !validRows(parameter, value) : !isValue(value) || typeof value !== parameter.type) {
      throw new Error(`Enter a valid ${parameterLabel(parameter.name).toLowerCase()}.`);
    }
    const assignment = new RegExp(`^([\\t ]*${parameter.name}[\\t ]*=[\\t ]*)("(?:\\\\.|[^"\\\\])*"|[^;\\r\\n]+)(;)`, 'm');
    const match = assignment.exec(result);
    if (!match) throw new Error(`Cannot configure ${parameter.name} in this source.`);
    // Do not edit a derived expression or an identically named local variable.
    let original: unknown;
    try { original = JSON.parse(match[2]); } catch { throw new Error(`Expected a literal default for ${parameter.name}.`); }
    if (list ? JSON.stringify(original) !== JSON.stringify(parameter.value) : original !== parameter.value) {
      throw new Error(`The default for ${parameter.name} does not match the source.`);
    }
    // An unchanged list keeps its original formatting.
    if (list && JSON.stringify(value) === JSON.stringify(parameter.value)) continue;
    result = result.replace(assignment, (_match, prefix: string, _literal: string, suffix: string) => `${prefix}${JSON.stringify(value)}${suffix}`);
  }
  return result;
}

// Row count within bounds and every cell a number within its column's range.
export function validRows(parameter: Parameter, value: unknown): value is number[][] {
  const { columns = [], minRows = 1, maxRows } = parameter.control;
  return isList(value, columns.length) && value.length >= minRows && (maxRows === undefined || value.length <= maxRows) &&
    value.every(row => row.every((cell, i) => (columns[i].min === undefined || cell >= columns[i].min) &&
      (columns[i].max === undefined || cell <= columns[i].max)));
}

// A mode change can remove an enum choice (for example an insert-only export).
// Reset that selection to the first available source option before compiling.
export function availableOptions(parameter: Parameter, conditions: Record<string, ParameterCondition> | undefined, values: Values) {
  return parameter.control.options?.filter(option => {
    const condition = conditions?.[String(option.value)];
    return !condition || conditionMatches(condition, values);
  });
}
