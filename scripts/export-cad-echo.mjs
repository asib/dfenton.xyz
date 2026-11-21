// Run with Bun; prints a SCAD source's echo output from the same engine as the browser
// compiler, for scripts that rebuild a model from its machine-readable echoes. Customizer
// overrides go in an optional JSON object, as the page would set them.
import { readFileSync } from 'node:fs';
import { parameters, render } from 'openrscad-engine/node';
import { configuredSource, defaults, parseParameters } from '../src/components/cad/parameters.ts';

const [sourcePath, overrides = '{}'] = process.argv.slice(2);
if (!sourcePath) throw new Error('Usage: bun scripts/export-cad-echo.mjs source.scad [\'{"Name": value, ...}\']');
const source = readFileSync(sourcePath, 'utf8');
const schema = parseParameters(parameters(source), source);
const values = JSON.parse(overrides);
const unknown = Object.keys(values).filter(name => !schema.some(parameter => parameter.name === name));
if (unknown.length) throw new Error(`Unknown parameters: ${unknown.join(', ')}.`);
const result = render(configuredSource(source, schema, { ...defaults(schema), ...values }));
try {
  if (!result.ok) throw new Error(result.error || 'The source failed to compile.');
  process.stdout.write(result.echo.endsWith('\n') ? result.echo : `${result.echo}\n`);
} finally { result.free(); }
