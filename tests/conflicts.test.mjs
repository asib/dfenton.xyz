import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { parameters, render } from 'openrscad-engine/node';
import { analyzeConflicts, conflictInputs, conjuncts, statements, stripComments } from '../src/components/cad/conflicts';
import { configuredSource, defaults, parseParameters } from '../src/components/cad/parameters';

const analyze = (text, changes = {}, precision = 1 / 16) => {
  const schema = parseParameters(parameters(text), text);
  const values = { ...defaults(schema), ...changes };
  return analyzeConflicts(configuredSource(text, schema, values), conflictInputs(schema, values), render, { precision });
};
const model = slug => readFileSync(`public/misc/${slug}/${slug}.scad`, 'utf8');

test('statements split at top-level semicolons and closing braces, keeping else chains', () => {
  const code = stripComments(`a = "x; } y"; // c; }
module m() { cube(1); }
if (a) { b = 1; } else if (c) { d(); } else e();
f = [for (i = [0:2]) i]; /* g; } */ h();`);
  expect(statements(code)).toEqual(['a = "x; } y";', 'module m() { cube(1); }',
    'if (a) { b = 1; } else if (c) { d(); } else e();', 'f = [for (i = [0:2]) i];', 'h();']);
});

test('conditions split at top-level && only where that keeps their meaning', () => {
  expect(conjuncts('(a > 0 && f(b, c && d) && s == "x && y")')).toEqual(['a > 0', 'f(b, c && d)', 's == "x && y"']);
  for (const whole of ['a && b || c', 'a ? b && c : d', 'let(x = 1) x > 0 && a', '(a && b) || c']) expect(conjuncts(whole)).toEqual([whole]);
  expect(conjuncts('!x || (a && b)')).toEqual(['!x || (a && b)']);
});

test('no model reports conflicts at its defaults; asserts inside modules are out of reach', () => {
  for (const slug of ['tool-tote', 'drawer-cabinet', 'half-lap-art-frame']) expect(analyze(model(slug))).toEqual([]);
  expect(analyze(model('magnetic-saw-guide'))).toBeNull();
});

test('a shortened tote handle names the riser and every input that can fix it', () => {
  const [conflict, ...rest] = analyze(model('tool-tote'), { Handle_blank_height: 2 });
  expect(rest).toEqual([]);
  expect(conflict.message).toBe('The handle top must reach the riser tops.');
  expect(conflict.checks).toEqual(['handle_top_z >= Riser_length']);
  expect(conflict.values).toEqual([['Riser_length', '10.75'], ['handle_top_z', '10.25']]);
  expect(conflict.inputs).toEqual(['Side_height', 'Riser_length', 'Handle_blank_height', 'Notch_clearance_above_sides', 'Handle_notch_depth']);
  expect(conflict.fixes).toEqual([
    { input: 'Side_height', value: 6.5, change: 'raise' },
    { input: 'Riser_length', value: 10.25, change: 'lower' },
    { input: 'Handle_blank_height', value: 2.5, change: 'raise' },
    { input: 'Notch_clearance_above_sides', value: 3.5, change: 'raise' },
    { input: 'Handle_notch_depth', value: 0.25, change: 'lower' },
  ]);
});

test('a per-drawer check in a loop is traced to the list cell that fixes it', () => {
  const drawers = [[5, 30], [6, 0], [0, 0], [0, 0]];
  const [conflict] = analyze(model('drawer-cabinet'), { Drawers: drawers });
  expect(conflict.message).toBe('Drawer 1 depth exceeds the 17 3/4″ available behind the front.');
  expect(conflict.inputs).toEqual(['Depth', 'Back_thickness', 'Drawers', 'Back_clearance']);
  expect(conflict.fixes).toEqual([
    { input: 'Depth', value: 30.25, change: 'raise' },
    { input: 'Drawers', value: [[5, 17.75], [6, 0], [0, 0], [0, 0]], change: 'lower', cell: [0, 1] },
  ]);
});

test('strict limits, ranges and messages built with str() are respected', () => {
  const source = `/* [Size] */
Width = 10; // [1:100]
Gap = 3;
Round = false;
/* [Hidden] */
inner = Width - 2 * Gap;
assert(inner > 5 && Gap > 0, str("Inner width ", inner, ", too small; widen it"));
assert(!Round || Width > 50, "Round frames need width.");
module m() { assert(Width < 0, "unreachable"); }
cube(Width);`;
  const [conflict, ...rest] = analyze(source, {}, 0.1);
  expect(rest).toEqual([]);
  expect(conflict).toEqual({ message: 'Inner width 4, too small; widen it', checks: ['inner > 5'], values: [['inner', '4']],
    inputs: ['Width', 'Gap'], fixes: [{ input: 'Width', value: 11.1, change: 'raise' }, { input: 'Gap', value: 2.4, change: 'lower' }] });
  // The range caps the search, and a fix may not break a check that passed: Round needs Width over 50.
  expect(analyze(source, { Width: 1.5 }, 0.1)[0].fixes).toEqual([{ input: 'Width', value: 11.1, change: 'raise' }]);
  expect(analyze(source, { Round: true, Width: 40 }, 0.1)[0].fixes).toEqual([{ input: 'Width', value: 50.1, change: 'raise' }, { input: 'Round', value: false, change: 'set' }]);
});
