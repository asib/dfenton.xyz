import type { Conflict, Fix } from './conflicts';
import { parameterLabel, type ListValue, type Parameter, type Values } from './parameters';

// Plain-language pieces of a conflict explanation (conflicts.ts) for the parameter form.
const decimal = (value: number) => String(Number(value.toFixed(4)));
export const readableCheck = (check: string) => check.replace(/>=/g, '≥').replace(/<=/g, '≤').replace(/!=/g, '≠')
  .replace(/==/g, '=').replace(/&&/g, 'and').replace(/\|\|/g, 'or');
export const listOf = (items: string[]) => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

// The current values a failing check uses: inputs by their label, derived values as written.
export function checkValues(conflict: Conflict, parameters: Parameter[]) {
  return conflict.values.map(([name, text]) => {
    const value = /^-?\d+(\.\d+)?(e[-+]?\d+)?$/.test(text) ? decimal(Number(text)) : text.length > 40 ? `${text.slice(0, 39)}…` : text;
    return `${parameters.some(parameter => parameter.name === name) ? parameterLabel(name) : name} = ${value}`;
  }).join(', ');
}

// "Raise to 2.5 (+0.5)"; named, "Handle blank height: raise to 2.5 (+0.5)". A list fix
// names its cell: "Drawer 1 depth: lower to 17.75 (−12.25)".
export function fixText(fix: Fix, parameters: Parameter[], values: Values, named: boolean): string {
  const parameter = parameters.find(candidate => candidate.name === fix.input);
  let name = parameterLabel(fix.input), value = fix.value, current = values[fix.input];
  if (fix.cell) {
    const [r, c] = fix.cell, { rowLabel = 'Row', columns = [] } = parameter?.control ?? {};
    name = `${rowLabel} ${String(r + 1)} ${columns[c]?.label.toLowerCase() ?? ''}`.trim();
    value = (fix.value as ListValue)[r][c];
    current = (current as ListValue | undefined)?.[r]?.[c] ?? '';
  }
  let action: string;
  if (fix.change === 'set') {
    const option = parameter?.control.options?.find(candidate => candidate.value === value);
    action = typeof value === 'boolean' ? `turn ${value ? 'on' : 'off'}` : `set to ${option?.label ?? String(value)}`;
  } else {
    const delta = typeof value === 'number' && typeof current === 'number' ? ` (${value > current ? '+' : '−'}${decimal(Math.abs(value - current))})` : '';
    action = `${fix.change} to ${typeof value === 'number' ? decimal(value) : String(value)}${delta}`;
  }
  return named ? `${name}: ${action}` : `${action.charAt(0).toUpperCase()}${action.slice(1)}`;
}
