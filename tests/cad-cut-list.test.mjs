import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { render, parameters } from 'openrscad-engine/node';
import { parseCutList, groupCutList, stockEstimate, inches, csvCell } from '../src/components/cad/cutList';
import { configuredSource, defaults, parseParameters } from '../src/components/cad/parameters';
const source = readFileSync(new URL('../public/misc/tool-tote/tool-tote.scad', import.meta.url), 'utf8');
const schema = parseParameters(parameters(source));
function list(changes = {}) {
  const result = render(configuredSource(source, schema, {...defaults(schema),...changes}));
  try { expect(result.ok).toBe(true); return parseCutList(result.echo); }
  finally { result.free(); }
}

test('lists all ten physical blanks without double-counting glued assemblies', () => {
  const parts = list();
  expect(parts).toHaveLength(10);
  expect(parts.reduce((sum, part) => sum + part.quantity,0)).toBe(10);
  expect(parts.map(p => [p.thickness, p.width, p.length])).toEqual([
    [.75,6,18],[.75,6,18],[.75,6,8],[.75,6,8],[.75,2.5,10.75],[.75,2.5,10.75],
    [.5625,3,20],[.5625,3,20],[.25,3.9375,15.375],[.25,3.9375,15.375],
  ]);
  expect(list({Part:'handle'})).toEqual(parts); // Worksheet is always the entire tote.
  expect(list({Show_cut_list:false})).toEqual([]);
});

test('cut-list dimensions follow SCAD joinery and lamination edits', () => {
  const parts = list({Body_width:10, Handle_lamination_fraction:.6, Bottom_length_allowance:.25});
  expect(parts.find(p=>p.id==='end-a').length).toBe(9);
  expect(parts.find(p=>p.id==='handle-a').thickness).toBe(.675);
  expect(parts.find(p=>p.id==='handle-b').thickness).toBe(.45);
  expect(parts.find(p=>p.id==='bottom-b')).toMatchObject({width:4.4375,length:15.25});
});

test('calculates rough stock, extra and cost once, and distinguishes missing prices from zero', () => {
  const side = list()[0];
  const estimate = stockEstimate(side,1,.5,1,20,12);
  expect(estimate).toMatchObject({thickness:1,width:6.5,length:19});
  expect(estimate.boardFeet).toBeCloseTo(123.5/144,10);
  expect(estimate.extra).toBeCloseTo(123.5/144*.2,10);
  expect(estimate.totalCost).toBeCloseTo(12.35,10);
  expect(stockEstimate({...side,quantity:2},1,.5,1,20,12).totalCost).toBeCloseTo(24.7,10);
  expect(stockEstimate(side,1,.5,1,20,null).totalCost).toBeNull();
  expect(stockEstimate(side,1,.5,1,20,0).totalCost).toBe(0);
  for (const args of [[.5,.5,1,20,12],[1,-1,1,20,12],[1,.5,NaN,20,12],[1,.5,1,20,-1]]) {
    expect(stockEstimate(side,...args)).toBeNull();
  }
});

test('formats exact woodworking fractions without rounding arbitrary dimensions to a fraction', () => {
  expect([.5625,3.9375,15.375,10.75,18].map(inches)).toEqual(['9/16','3 15/16','15 3/8','10 3/4','18']);
  expect(inches(.675)).toBe('0.675');
});

test('fails visibly on malformed/duplicate rows and exports spreadsheet-safe cells', () => {
  expect(parseCutList('ECHO: "ordinary output"')).toEqual([]);
  for (const rows of [[],[['a','A','Wood',1,0,1,1,'A']],[['a','A','Wood',1,1,1,1,'A'],['a','A','Wood',1,1,1,1,'A']]]) {
    expect(()=>parseCutList(`ECHO: "CUTLIST_V1", ${JSON.stringify(rows)}`)).toThrow();
  }
  expect(csvCell('A, "special" board')).toBe('"A, ""special"" board"');
  expect(csvCell('=1+1')).toBe('"\'=1+1"');
});


test('groups identical blanks by kind, material and dimensions, but splits unequal laminations', () => {
  const parts = list();
  const blanks = groupCutList(parts);
  expect(blanks).toHaveLength(5);
  expect(blanks.map(p=>p.quantity)).toEqual([2,2,2,2,2]);
  expect(blanks[0]).toMatchObject({name:'Side',ids:['side-a','side-b'],quantity:2});
  const split = groupCutList(list({Handle_lamination_fraction:.6}));
  expect(split).toHaveLength(6);
  expect(split.filter(p=>p.blank==='Handle lamination').map(p=>[p.name,p.quantity,p.thickness])).toEqual([
    ['Handle lamination A',1,.675],['Handle lamination B',1,.45],
  ]);
  // Stock choices stay with their physical parts and keep unlike purchases apart.
  expect(groupCutList(parts, p=>p.id==='handle-a' ? 10 : 20)).toHaveLength(6);
  const individualFeet = parts.reduce((sum,p)=>sum+stockEstimate(p,p.thickness,.5,1,20,null).boardFeet,0);
  const groupedFeet = blanks.reduce((sum,p)=>sum+stockEstimate(p,p.thickness,.5,1,20,null).boardFeet,0);
  expect(groupedFeet).toBeCloseTo(individualFeet,10);
});
