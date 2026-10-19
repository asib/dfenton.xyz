import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { render, parameters } from 'openrscad-engine/node';
import { parseCutList, parseStockPreparation, groupCutList, milledThickness, roughDimensions, standardThickness, stockLabel, boardFeet, inches, csvCell } from '../src/components/cad/cutList';
import { configuredSource, defaults, parseParameters } from '../src/components/cad/parameters';
const source = readFileSync(new URL('../public/misc/tool-tote/tool-tote.scad', import.meta.url), 'utf8');
const schema = parseParameters(parameters(source));
function list(changes = {}) {
  const result = render(configuredSource(source, schema, {...defaults(schema),...changes}));
  try { expect(result.ok).toBe(true); return parseCutList(result.echo); }
  finally { result.free(); }
}
function preparation() {
  const result = render(source);
  try { return parseStockPreparation(result.echo); }
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

test('adds machining allowances per blank and rejects undersized rough stock', () => {
  const side = list()[0];
  const rough = roughDimensions(side,1,.5,1);
  expect(rough).toEqual({quantity:1,thickness:1,width:6.5,length:19});
  expect(roughDimensions({...side,quantity:2},1,.5,1)).toEqual({...rough,quantity:2});
  expect(roughDimensions(side,1,0,0)).toEqual({quantity:1,thickness:1,width:6,length:18});
  for (const args of [[.5,.5,1],[1,-1,1],[1,.5,NaN],[1,.5,-1]]) {
    expect(roughDimensions(side,...args)).toBeNull();
  }
});

test('keeps short blanks at the longer machine minimum without changing finished lengths', () => {
  const prep = preparation();
  expect(prep).toEqual({millingMinLength:14,sawMinLength:10,resawKerf:1/16,resawCleanup:1/16});
  const parts = groupCutList(list());
  const end = parts.find(p=>p.id==='end-a'), riser = parts.find(p=>p.id==='riser-a');
  expect(end.length).toBe(8);
  expect(riser.length).toBe(10.75);
  expect(roughDimensions(end,1,.5,1,prep).length).toBe(14);
  expect(roughDimensions(riser,1,.5,1,prep).length).toBe(14);
  expect(roughDimensions(end,1,.5,1,{...prep,millingMinLength:8}).length).toBe(10);
  expect(roughDimensions(end,1,.5,1,{...prep,sawMinLength:16}).length).toBe(16);
  expect(roughDimensions(end,1,.5,10,prep).length).toBe(18);
});

test('makes both bottom halves from one parent board with one kerf and cleanup on each half', () => {
  const prep = preparation(), bottom = groupCutList(list()).find(p=>p.id==='bottom-a');
  expect(bottom).toMatchObject({quantity:2,resawGroup:'bottom-parent',thickness:.25,width:3.9375,length:15.375});
  expect(milledThickness(bottom,prep)).toBe(11/16);
  expect(roughDimensions(bottom,1,.5,1,prep)).toEqual({quantity:1,thickness:1,width:4.4375,length:16.375});
  expect(roughDimensions(bottom,.5,.5,1,prep)).toBeNull();
  expect(roughDimensions(bottom,.75,.5,1,prep)).toBeNull();
  const thicker = groupCutList(list({Bottom_thickness:.375})).find(p=>p.id==='bottom-a');
  expect(milledThickness(thicker,prep)).toBe(15/16);
  expect(milledThickness(bottom,{...prep,resawKerf:1/8,resawCleanup:3/32})).toBe(13/16);
  expect(roughDimensions({...bottom,quantity:1},1,.5,1,prep)).toBeNull();
  expect(roughDimensions(bottom,1,.5,1)).toBeNull();
  for(const key of Object.keys(prep)) expect(roughDimensions(bottom,1,.5,1,{...prep,[key]:NaN})).toBeNull();
  // The handle still uses two separate pieces of solid wood, not one resaw parent.
  const handle = groupCutList(list()).find(p=>p.id==='handle-a');
  expect(roughDimensions(handle,1,.5,1,prep).quantity).toBe(2);
});

test('rounds milled thickness plus surfacing allowance up to buying sizes, including skipped quarters', () => {
  const prep = preparation(), parts = groupCutList(list());
  expect(parts.map(part=>standardThickness(milledThickness(part,prep)+.25))).toEqual([1,1,1,1,1]);
  expect([1,1.00001,1.25,1.25001,1.5,1.75,2,2.25,2.75,3.25,4,4.00001,NaN,Infinity,0,-1].map(standardThickness))
    .toEqual([1,1.25,1.25,1.5,1.5,2,2,2.5,3,4,4,null,null,null,null,null]);
  expect([1,1.25,1.5,2,2.5,3,4].map(stockLabel)).toEqual(['4/4','5/4','6/4','8/4','10/4','12/4','16/4']);
  const side = parts[0];
  expect(roughDimensions(side,1,.5,1,prep,.25)).not.toBeNull();
  expect(roughDimensions(side,1,.5,1,prep,.25001)).toBeNull();
  expect(roughDimensions(side,1.25,.5,1,prep,.25001)).not.toBeNull();
  expect(roughDimensions(side,1,.5,1,prep,0)).not.toBeNull();
  expect(roughDimensions(side,1.125,.5,1,prep)).toBeNull(); // Not a buying size.
  for (const allowance of [-.1,NaN,Infinity]) expect(roughDimensions(side,1,.5,1,prep,allowance)).toBeNull();
  const thickerBottom = groupCutList(list({Bottom_thickness:.375})).find(p=>p.id==='bottom-a');
  expect(milledThickness(thickerBottom,prep)).toBe(15/16);
  expect(standardThickness(milledThickness(thickerBottom,prep)+.25)).toBe(1.25);
  expect(roughDimensions(thickerBottom,1,.5,1,prep)).toBeNull();
});

test('tallies rough board feet with machine lengths, standard thickness and one bottom parent', () => {
  const prep = preparation(), parts = groupCutList(list());
  const rough = parts.map(part=>roughDimensions(part,standardThickness(milledThickness(part,prep)+.25),.5,1,prep));
  const expectedVolumes = [247,182,84,147,72.6640625]; // Cubic inches of rough stock.
  rough.forEach((row,i)=>expect(boardFeet(row)).toBeCloseTo(expectedVolumes[i]/144,10));
  expect(rough.reduce((total,row)=>total+boardFeet(row),0)).toBeCloseTo(732.6640625/144,10);
  expect(boardFeet({...rough[0],thickness:1.25})).toBeCloseTo(247*1.25/144,10);
  expect(rough[4].quantity).toBe(1);
  // Unequal laminations split rows without changing volume when using the same stock.
  const split = groupCutList(list({Handle_lamination_fraction:.6}));
  expect(split.reduce((total,part)=>total+boardFeet(roughDimensions(part,1,.5,1,prep)),0))
    .toBeCloseTo(732.6640625/144,10);
});

test('validates stock-preparation defaults and optional resaw-group records', () => {
  expect(parseStockPreparation('')).toBeNull();
  for (const values of [[],[14,10,0,.0625],[14,10,'kerf',.0625]]) {
    expect(()=>parseStockPreparation(`ECHO: "CUTLIST_STOCK_V1", ${JSON.stringify(values)}`)).toThrow();
  }
  expect(()=>parseCutList('ECHO: "CUTLIST_V1", [["a","A","Wood",1,1,1,1,"A",0]]')).toThrow();
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
  // Rough-thickness choices stay with the pieces when laminations regroup.
  expect(groupCutList(parts, p=>p.id==='handle-a' ? .75 : 1)).toHaveLength(6);
  expect(blanks.reduce((sum,p)=>sum+p.quantity,0)).toBe(10);
});
