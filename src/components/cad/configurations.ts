import { defaults, validRows, type Parameter, type Values } from './parameters';

// Named parameter sets a viewer saves in their own browser, one list per Misc item.
export interface Configuration { name: string; values: Record<string, unknown>; fingerprint: string; savedAt: string }
export interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }

export const storageKey = (href: string) => `cad-configurations:${href}`;

// Identifies the parameter set, so a configuration saved against an earlier
// version of the model can be flagged.
export function fingerprint(parameters: Parameter[]): string {
  const text = JSON.stringify(parameters.map(p => [p.name, p.type, p.control.min, p.control.max, p.control.options?.map(o => o.value),
    p.control.columns?.map(c => [c.min, c.max]), p.control.minRows, p.control.maxRows]));
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = (hash * 33 + text.charCodeAt(i)) >>> 0;
  return hash.toString(36);
}

// Unreadable or foreign data yields an empty list; invalid entries are skipped.
export function readConfigurations(storage: StorageLike | null, key: string): Configuration[] {
  let data: unknown;
  try { data = JSON.parse(storage?.getItem(key) ?? 'null'); } catch { return []; }
  if (typeof data !== 'object' || data === null || !('version' in data) || data.version !== 1 ||
      !('configurations' in data) || !Array.isArray(data.configurations)) return [];
  return data.configurations.filter((item: unknown): item is Configuration => typeof item === 'object' && item !== null &&
    'name' in item && typeof item.name === 'string' && !!item.name.trim() &&
    'values' in item && typeof item.values === 'object' && item.values !== null && !Array.isArray(item.values) &&
    'fingerprint' in item && typeof item.fingerprint === 'string' && 'savedAt' in item && typeof item.savedAt === 'string');
}

// Returns false when the browser refuses to store (private mode, quota, blocked).
export function writeConfigurations(storage: StorageLike | null, key: string, configurations: Configuration[]): boolean {
  try {
    if (!storage) return false;
    storage.setItem(key, JSON.stringify({ version: 1, configurations }));
    return true;
  } catch { return false; }
}

const inRange = (value: number, min?: number, max?: number) => (min === undefined || value >= min) && (max === undefined || value <= max);
// Whether a saved value still fits the current parameter: type, range, choice or list rows.
export function fits(parameter: Parameter, value: unknown): boolean {
  if (parameter.type === 'list') return validRows(parameter, value);
  if (typeof value !== parameter.type || (typeof value === 'number' && !Number.isFinite(value))) return false;
  if (parameter.control.options) return parameter.control.options.some(option => option.value === value);
  return typeof value !== 'number' || inRange(value, parameter.control.min, parameter.control.max);
}

// Apply saved values onto the current source defaults. Values that no longer fit,
// and settings the model no longer has, are reported and left at their defaults.
export function reconcile(parameters: Parameter[], saved: Record<string, unknown>): { values: Values; dropped: string[] } {
  const values = defaults(parameters), dropped: string[] = [];
  for (const [name, value] of Object.entries(saved)) {
    const parameter = parameters.find(p => p.name === name);
    if (parameter && fits(parameter, value)) values[name] = value as Values[string];
    else dropped.push(name);
  }
  return { values, dropped };
}

// Only the values that differ from the source defaults.
export function changedValues(parameters: Parameter[], values: Values): Values {
  return Object.fromEntries(parameters.filter(p => JSON.stringify(values[p.name]) !== JSON.stringify(p.value)).map(p => [p.name, values[p.name]]));
}
