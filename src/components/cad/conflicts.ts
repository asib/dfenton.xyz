import type { Parameter, ParameterValue, Values } from './parameters';

// Explains failed assertions: which inputs each involves, and the nearest value of each
// input that satisfies it. The engine reports only an assertion's message and drops a
// failed run's echoes, so the analysis renders a geometry-free copy of the model instead:
// its assignments and functions, with every assert (top-level, or in top-level for and
// if blocks) turned into an echo of its sub-conditions. Such a run takes well under a
// millisecond, so a search can afford hundreds. Asserts inside modules or functions
// stay out of reach; a model whose failure is there gets no analysis.
export type Render = (source: string) => { ok: boolean; echo: string; free(): void };
export interface ConflictInput {
  name: string; type: 'number' | 'string' | 'boolean' | 'list'; value: ParameterValue;
  min?: number; max?: number; step?: number; options?: ParameterValue[];
  // List inputs search each numeric cell within its column's range.
  columns?: { min?: number; max?: number; step?: number }[];
}
// Changing one input (or one list cell, by row and column) to this value satisfies the
// conflict without breaking another check.
export interface Fix { input: string; value: ParameterValue; change: 'raise' | 'lower' | 'set'; cell?: [number, number] }
export interface Conflict {
  message: string;
  // The failing sub-conditions as written, and the current values of the names they use.
  checks: string[];
  values: [string, string][];
  // Every input the failing checks depend on, in source order.
  inputs: string[];
  fixes: Fix[];
}
export interface ConflictOptions { precision?: number; budgetMs?: number }
export const conflictInputs = (parameters: Parameter[], values: Values): ConflictInput[] => parameters.map(({ name, type, control }) => ({
  name, type, value: values[name], min: control.min, max: control.max, step: control.step,
  options: control.options?.map(option => option.value), columns: control.columns }));

const CHECK = '__MISC_CHECK', VALUES = '__MISC_VALUES';

const stringEnd = (text: string, start: number) => {
  let i = start + 1;
  while (i < text.length && text[i] !== '"') i += text[i] === '\\' ? 2 : 1;
  return Math.min(i + 1, text.length);
};
// Comments become spaces; strings and offsets stay.
export function stripComments(source: string) {
  let out = '';
  for (let i = 0; i < source.length; i++) {
    const rest = source.slice(i, i + 2);
    let end = i + 1;
    if (source[i] === '"') end = stringEnd(source, i);
    else if (rest === '//') { const newline = source.indexOf('\n', i); end = newline < 0 ? source.length : newline; }
    else if (rest === '/*') { const close = source.indexOf('*/', i + 2); end = close < 0 ? source.length : close + 2; }
    out += rest === '//' || rest === '/*' ? source.slice(i, end).replace(/[^\n]/g, ' ') : source.slice(i, end);
    i = end - 1;
  }
  return out;
}
// String contents blanked, so structure and names can be read without them.
const blank = (code: string) => code.replace(/"(?:\\.|[^"\\])*"/g, text => `"${' '.repeat(text.length - 2)}"`);
const closing = (plain: string, open: number) => {
  let depth = 0;
  for (let i = open; i < plain.length; i++) {
    if ('([{'.includes(plain[i])) depth++;
    else if (')]}'.includes(plain[i]) && --depth === 0) return i;
  }
  return plain.length - 1;
};
// Positions at bracket depth 0 where `match` matches.
const topLevel = (plain: string, match: (i: number) => number) => {
  const found: [number, number][] = [];
  for (let i = 0, depth = 0; i < plain.length; i++) {
    if ('([{'.includes(plain[i])) depth++;
    else if (')]}'.includes(plain[i])) depth--;
    else if (depth === 0) { const length = match(i); if (length) { found.push([i, length]); i += length - 1; } }
  }
  return found;
};
const split = (code: string, at: [number, number][]) => {
  const parts: string[] = [];
  let start = 0;
  for (const [i, length] of at) { parts.push(code.slice(start, i).trim()); start = i + length; }
  return [...parts, code.slice(start).trim()];
};

// Top-level statements: up to a ';' at depth 0, or a closing '}' back at depth 0 that
// no 'else' follows.
export function statements(code: string): string[] {
  const plain = blank(code), out: string[] = [];
  let depth = 0, start = 0;
  for (let i = 0; i < plain.length; i++) {
    const c = plain[i];
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth = Math.max(0, depth - 1);
    if ((c === ';' && depth === 0) || (c === '}' && depth === 0 && !/^\s*else\b/.test(plain.slice(i + 1, i + 40)))) {
      out.push(code.slice(start, i + 1).trim());
      start = i + 1;
    }
  }
  out.push(code.slice(start).trim());
  return out.filter(statement => statement && statement !== ';');
}

// A condition's &&-joined parts. Anything with a top-level ||, ?: or let stays whole,
// as splitting it would change its meaning.
export function conjuncts(condition: string): string[] {
  let code = condition.trim();
  while (code.startsWith('(') && closing(blank(code), 0) === code.length - 1) code = code.slice(1, -1).trim();
  const plain = blank(code);
  const word = (i: number, text: string) => plain.startsWith(text, i) && !/\w/.test(plain[i - 1] ?? '') ? text.length : 0;
  if (topLevel(plain, i => plain.startsWith('||', i) || plain[i] === '?' ? 1 : word(i, 'let') || word(i, 'assert') || word(i, 'echo') || word(i, 'function')).length) return [code];
  return split(code, topLevel(plain, i => plain.startsWith('&&', i) ? 2 : 0));
}

interface Check { key: number; parts: string[]; scope: string[] }
interface Model {
  parts: string[];
  // Index in `parts` of each top-level assignment, by name (the first, as configuredSource edits).
  assignmentAt: Map<string, number>;
  assignments: Map<string, string[]>;
  functions: Map<string, { params: string[]; body: string }>;
  checks: Check[];
}

// The geometry-free copy of a (comment-free) source, and what it is made of.
function checkModel(source: string): Model {
  const model: Model = { parts: [], assignmentAt: new Map(), assignments: new Map(), functions: new Map(), checks: [] };
  // Asserts become echoes of their parts; for and if blocks keep their asserts and local assignments.
  const block = (statement: string, scope: string[]): string | null => {
    const plain = blank(statement);
    const head = /^(assert|for|if)\s*\(/.exec(plain);
    if (!head) return /^\$?[A-Za-z_]\w*\s*=(?!=)/.test(plain) && scope.length ? statement : null;
    const open = head[0].length - 1, close = closing(plain, open);
    const inner = statement.slice(open + 1, close);
    if (head[1] === 'assert') {
      const innerPlain = blank(inner);
      const [condition, message] = split(inner, topLevel(innerPlain, i => innerPlain[i] === ',' ? 1 : 0));
      const check: Check = { key: model.checks.length, parts: conjuncts(condition), scope };
      model.checks.push(check);
      return `echo("${CHECK}", [${String(check.key)}, [${check.parts.map(part => `((${part}) ? 1 : 0)`).join(', ')}], ${message ? `str(${message})` : '""'}]);`;
    }
    const header = statement.slice(open, close + 1);
    // The body, a braced block or one statement; an if may continue with else.
    const body = (from: number): [string[], number] => {
      const rest = plain.slice(from), start = from + rest.length - rest.trimStart().length;
      if (plain[start] === '{') { const end = closing(plain, start); return [statements(statement.slice(start + 1, end)), end + 1]; }
      const first = statements(statement.slice(start))[0] ?? '';
      return [[first], start + first.length];
    };
    const kept = (list: string[]) => list.map(item => block(item, [...scope, header])).filter((item): item is string => item !== null);
    const [then, end] = body(close + 1);
    const thenKept = kept(then);
    let elseKept: string[] = [];
    const elseMatch = head[1] === 'if' ? /^\s*else\b/.exec(plain.slice(end)) : null;
    if (elseMatch) elseKept = kept(body(end + elseMatch[0].length)[0]);
    if (![...thenKept, ...elseKept].some(item => item.includes(CHECK))) return null;
    return `${head[1]} ${header} { ${thenKept.join(' ')} }${elseMatch ? ` else { ${elseKept.join(' ')} }` : ''}`;
  };
  for (const statement of statements(source)) {
    const plain = blank(statement);
    const fn = /^function\s+([A-Za-z_]\w*)\s*\(/.exec(plain);
    const assignment = /^(\$?[A-Za-z_]\w*)\s*=(?!=)/.exec(plain);
    if (/^module\b/.test(plain)) continue;
    if (fn) {
      const open = fn[0].length - 1, close = closing(plain, open);
      const params = split(statement.slice(open + 1, close), topLevel(plain.slice(open + 1, close), i => plain[open + 1 + i] === ',' ? 1 : 0))
        .map(param => param.split('=')[0].trim()).filter(Boolean);
      model.functions.set(fn[1], { params, body: statement.slice(close + 1) });
      model.parts.push(statement);
    } else if (assignment) {
      if (!model.assignmentAt.has(assignment[1])) model.assignmentAt.set(assignment[1], model.parts.length);
      model.assignments.set(assignment[1], [...(model.assignments.get(assignment[1]) ?? []), statement.slice(assignment[0].length, -1)]);
      model.parts.push(statement);
    } else if (/^(include|use)\s*</.test(plain)) model.parts.push(statement);
    else { const kept = block(statement, []); if (kept) model.parts.push(kept); }
  }
  return model;
}

// Names used in an expression; called names are marked.
const names = (expression: string) => [...blank(expression).matchAll(/(?<![\w.$])(\$?[A-Za-z_]\w*)(\s*\()?/g)]
  .map(match => ({ name: match[1], called: !!match[2] }));

// The inputs an expression depends on, through assignments and function bodies.
function dependencies(model: Model, inputs: Set<string>, expression: string, seen = new Set<string>()): Set<string> {
  const found = new Set<string>();
  const visit = (text: string, locals: string[]) => {
    for (const { name, called } of names(text)) {
      const key = `${called ? 'f' : 'v'}:${name}`;
      if (seen.has(key) || (!called && locals.includes(name))) continue;
      seen.add(key);
      if (called) { const fn = model.functions.get(name); if (fn) visit(fn.body, fn.params); }
      else if (inputs.has(name)) found.add(name);
      else for (const value of model.assignments.get(name) ?? []) visit(value, []);
    }
  };
  visit(expression, []);
  return found;
}

type Results = Map<string, { passes: number[]; message: string }>;
function parseResults(echo: string): { results: Results; values: Map<string, string> } {
  const results: Results = new Map(), values = new Map<string, string>(), occurrences = new Map<number, number>();
  for (const line of echo.split('\n')) {
    const check = new RegExp(`^ECHO:\\s*"${CHECK}",\\s*(.*)$`).exec(line);
    const value = new RegExp(`^ECHO:\\s*"${VALUES}",\\s*(.*)$`).exec(line);
    try {
      if (check) {
        const [key, passes, message] = JSON.parse(check[1]) as [number, number[], string];
        const occurrence = occurrences.get(key) ?? 0;
        occurrences.set(key, occurrence + 1);
        // A check in a loop reports once per pass, told apart by its order.
        results.set(`${String(key)}.${String(occurrence)}`, { passes, message });
      } else if (value) for (const [name, text] of JSON.parse(value[1]) as [string, string][]) values.set(name, text);
    } catch { /* A malformed line counts as a missing result. */ }
  }
  return { results, values };
}

export function analyzeConflicts(source: string, inputs: ConflictInput[], render: Render, options: ConflictOptions = {}): Conflict[] | null {
  const { precision = 0.1, budgetMs = 4000 } = options;
  const started = performance.now();
  const model = checkModel(stripComments(source));
  if (!model.checks.length) return null;
  const inputNames = new Set(inputs.map(input => input.name));
  const literal = (value: ParameterValue) => JSON.stringify(value);
  // Every global name a check uses, echoed so the explanation can show its value.
  const globals = [...new Set(model.checks.flatMap(check => check.parts.flatMap(part => names(part)
    .filter(({ name, called }) => !called && model.assignmentAt.has(name)).map(({ name }) => name))))];
  const valuesEcho = `echo("${VALUES}", [${globals.map(name => `["${name}", str(${name})]`).join(', ')}]);`;
  const run = (changes: Record<string, ParameterValue> = {}) => {
    const parts = [...model.parts];
    for (const [name, value] of Object.entries(changes)) {
      const at = model.assignmentAt.get(name);
      if (at !== undefined) parts[at] = `${name} = ${literal(value)};`;
    }
    const result = render(`${parts.join('\n')}\n${valuesEcho}\n`);
    try { return result.ok ? parseResults(result.echo) : null; } finally { result.free(); }
  };
  const baseline = run();
  if (!baseline) return null;
  const failing = [...baseline.results].filter(([, { passes }]) => passes.some(pass => !pass));
  // A change is a fix when the conflict's checks all pass and nothing that passed now fails.
  const fixes = (key: string, results: Results | undefined) => {
    if (!results) return false;
    for (const [other, { passes }] of results) {
      const before = baseline.results.get(other)?.passes;
      if (passes.some((pass, i) => !pass && (other === key || !before || before[i]))) return false;
    }
    return results.has(key);
  };
  const outOfTime = () => performance.now() - started > budgetMs;

  return failing.map(([key, { passes, message }]) => {
    const check = model.checks[Number(key.split('.')[0])];
    const failed = check.parts.filter((_, i) => !passes[i]);
    const depends = dependencies(model, inputNames, [...failed, ...check.scope].join(' '));
    const involved = inputs.filter(input => depends.has(input.name));
    const used = new Set(failed.flatMap(part => names(part).map(({ name }) => name)));
    const conflict: Conflict = {
      message, checks: failed.map(part => part.replace(/\s+/g, ' ')),
      values: [...baseline.values].filter(([name]) => used.has(name)),
      inputs: involved.map(input => input.name), fixes: [],
    };
    const valid = (input: ConflictInput, value: ParameterValue) => !outOfTime() && fixes(key, run({ [input.name]: value })?.results);
    for (const input of involved) {
      if (input.options) {
        for (const option of input.options) if (option !== input.value && valid(input, option)) conflict.fixes.push({ input: input.name, value: option, change: 'set' });
      } else if (input.type === 'boolean') {
        if (valid(input, !input.value)) conflict.fixes.push({ input: input.name, value: !input.value, change: 'set' });
      } else if (input.type === 'number' && typeof input.value === 'number') {
        for (const direction of [1, -1] as const) {
          const value = nearest(input, direction, input.step ?? precision, candidate => valid(input, candidate));
          if (value !== null) conflict.fixes.push({ input: input.name, value, change: direction > 0 ? 'raise' : 'lower' });
        }
      } else if (input.type === 'list' && Array.isArray(input.value)) {
        const rows = input.value;
        rows.forEach((row, r) => { row.forEach((cell, c) => {
          if (typeof cell !== 'number') return;
          const column = input.columns?.[c] ?? {};
          const edited = (value: number) => rows.map((other, i) => i === r ? other.map((item, j) => j === c ? value : item) : other);
          for (const direction of [1, -1] as const) {
            const value = nearest({ ...input, ...column, value: cell }, direction, column.step ?? precision, candidate => valid(input, edited(candidate)));
            if (value !== null) conflict.fixes.push({ input: input.name, value: edited(value), change: direction > 0 ? 'raise' : 'lower', cell: [r, c] });
          }
        }); });
      }
    }
    return conflict;
  });
}

// The nearest valid value on the precision grid above (direction 1) or below the current
// one, within the input's range: an expanding search, then bisection back to the edge.
function nearest(input: ConflictInput, direction: 1 | -1, step: number, valid: (value: number) => boolean): number | null {
  const current = input.value as number;
  const at = (n: number) => Number((n * step).toFixed(10));
  const first = direction > 0 ? Math.floor(current / step + 1e-9) + 1 : Math.ceil(current / step - 1e-9) - 1;
  const bound = direction > 0 ? input.max : input.min;
  const last = bound === undefined ? first + direction * 2 ** 20 : direction > 0 ? Math.floor(bound / step + 1e-9) : Math.ceil(bound / step - 1e-9);
  if ((last - first) * direction < 0) return null;
  let invalid = first - direction;
  for (let k = 0; ; k++) {
    const n = (Math.min(Math.abs(last - first), 2 ** k - 1) * direction) + first;
    if (valid(at(n))) {
      let found = n;
      while (Math.abs(found - invalid) > 1) {
        const middle = invalid + Math.trunc((found - invalid) / 2);
        if (valid(at(middle))) found = middle; else invalid = middle;
      }
      return at(found);
    }
    if (n === last) return null;
    invalid = n;
  }
}
