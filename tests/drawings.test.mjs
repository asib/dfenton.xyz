import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { render, parameters } from 'openrscad-engine/node';
import { compileDrawings } from '../src/components/cad/drawingCompiler';
import { dimensionValue, parseDrawingDefinition, parsePartDrawingDefinitions } from '../src/components/cad/drawings';
import { projectDrawing } from '../src/components/cad/drawingGeometry';
import { displayMesh } from '../src/components/cad/displayMesh';
import { configuredSource, defaults, parseParameters } from '../src/components/cad/parameters';

const source = readFileSync(new URL('../public/misc/tool-tote/tool-tote.scad', import.meta.url), 'utf8');
const schema = parseParameters(parameters(source));
const initial = defaults(schema);
const front = { id: 'front', title: 'Front', axes: [[1,0,0], [0,0,1], [0,-1,0]], dimensions: [] };
function projection(text) {
  const result = render(text);
  try {
    expect(result.ok).toBe(true);
    const mesh = displayMesh(result.preview_positions, result.preview_normals, result.groups) ?? {
      positions: result.positions, normals: result.normals, groups: [{start:0, count:result.positions.length/3}],
    };
    return projectDrawing(mesh, front);
  } finally { result.free(); }
}
function covers(lines, x, y) {
  return lines.some(([a,b,c,d]) => Math.abs((c-a)*(y-b)-(d-b)*(x-a)) < 0.001 &&
    x >= Math.min(a,c)-0.001 && x <= Math.max(a,c)+0.001 && y >= Math.min(b,d)-0.001 && y <= Math.max(b,d)+0.001);
}
const drawing = (changes = {}) => compileDrawings(configuredSource(source, schema, {...initial,...changes}), render);

describe('orthographic visible edges', () => {
  test('removes triangulation diagonals and collapses overlapping front/back edges', () => {
    const view = projection('cube([10,10,10]);');
    expect(view.bounds).toEqual([0,0,10,10]);
    expect(view.lines).toHaveLength(4);
    expect(covers(view.lines, 5, 5)).toBe(false);
  });
  test('clips only the occluded interval of an edge', () => {
    const view = projection('color("red") translate([0,1,0]) cube([10,1,1]); color("blue") translate([4,-1,-1]) cube([2,1,3]);');
    expect(covers(view.lines,3,0)).toBe(true);
    expect(covers(view.lines,5,0)).toBe(false);
    expect(covers(view.lines,7,0)).toBe(true);
  });
  test('retains seams between touching physical pieces', () => {
    const view = projection('color("red") cube([5,1,5]); color("blue") translate([5,0,0]) cube([5,1,5]);');
    expect(covers(view.lines,5,2.5)).toBe(true);
  });
});

const partView = (sheet, part, view) => sheet.parts.find(p=>p.id===part).views.find(v=>v.id===`part-${part}-${view}`);
const partDimensions = (sheet, part) => Object.fromEntries(sheet.parts.find(p=>p.id===part).views.flatMap(v=>
  v.dimensions.map(d=>[d.label,dimensionValue(d,v,sheet.units)])));

describe('dimensioned part sheets', () => {
  test('covers all ten pieces with five grouped sheets and finished sizes', () => {
    const sheet=drawing();
    expect(sheet.parts.map(p=>[p.id,p.quantity])).toEqual([['side',2],['end',2],['riser',2],['handle-a',2],['bottom',2]]);
    const expected={side:{Length:18,Height:6,'Side thickness':.75},end:{Length:8,Height:6,'Blank thickness':.75},
      riser:{Length:10.75,Width:2.5,Thickness:.75},'handle-a':{Length:20,'Blank height':3,'Lamination thickness':.5625},
      bottom:{Length:15.375,'Half width':3.9375,Thickness:.25}};
    for (const [id,dimensions] of Object.entries(expected)) for (const [label,value] of Object.entries(dimensions)) {
      expect(partDimensions(sheet,id)[label]).toBeCloseTo(value,6);
    }
    const side=partView(sheet,'side','face'), end=partView(sheet,'end','inside'), bottom=partView(sheet,'bottom','face');
    expect((side.bounds[2]-side.bounds[0])/25.4).toBeCloseTo(18,5);
    expect((end.bounds[2]-end.bounds[0])/25.4).toBeCloseTo(8,5);
    expect((bottom.bounds[3]-bottom.bounds[1])/25.4).toBeCloseTo(3.9375,5);
  });
  test('defines stopped-groove runs inside both ends and measures the actual side dado and groove cuts', () => {
    const sheet=drawing(), dimensions=partDimensions(sheet,'side');
    expect(dimensions['Stopped groove run']).toBeCloseTo(15.5,6);
    expect(dimensions['Stop from each end']).toBeCloseTo(1.25,6);
    expect(dimensions['Inset from end']).toBeCloseTo(.75,6);
    expect(dimensions['Dado width']).toBeCloseTo(.75,6);
    expect(dimensions['Dado depth']).toBeCloseTo(.25,6);
    expect(dimensions['Groove depth']).toBeCloseTo(.25,6);
    expect(dimensions['From bottom']).toBeCloseTo(.5,6);
    expect(dimensions['Groove width']).toBeCloseTo(.25,6);
    const dado=partView(sheet,'side','dado'), groove=partView(sheet,'side','groove');
    expect(contains(dado.profiles[0],7.875*25.4,3.85*25.4)).toBe(false);
    expect(contains(dado.profiles[0],7.875*25.4,4.1*25.4)).toBe(true);
    expect(contains(groove.profiles[0],3.85*25.4,.625*25.4)).toBe(false);
    expect(contains(groove.profiles[0],4.1*25.4,.625*25.4)).toBe(true);
    const guide=partView(sheet,'side','face').guides[0];
    expect(guide[0][0]/25.4).toBeCloseTo(-7.75,6);
    expect(guide[1][0]/25.4).toBeCloseTo(7.75,6);
  });
  test('shows the end housing and bottom groove on opposite faces with a solid web between them', () => {
    const sheet=drawing(), dimensions=partDimensions(sheet,'end');
    expect(dimensions['Housing width']).toBeCloseTo(2.5,6);
    expect(dimensions['Each margin']).toBeCloseTo(2.75,6);
    expect(dimensions['Housing depth']).toBeCloseTo(.25,6);
    expect(dimensions['Groove depth']).toBeCloseTo(.25,6);
    const loops=partView(sheet,'end','section').profiles[0];
    expect(contains(loops,7.625*25.4,.625*25.4)).toBe(false);
    expect(contains(loops,7.875*25.4,.625*25.4)).toBe(true);
    expect(contains(loops,8.125*25.4,.625*25.4)).toBe(false);
  });
  test('tracks fractional fit, groove, panel and end-placement edits without rounding construction dimensions', () => {
    const sheet=drawing({Side_thickness:.875,End_thickness:1,End_setback:1.125,End_dado_depth:.3125,
      Riser_dado_depth:.3125,Bottom_groove_depth:.375,Bottom_groove_height:.625,Bottom_groove_fit:.03125,Joint_fit:.04});
    const side=partDimensions(sheet,'side'),end=partDimensions(sheet,'end'),bottom=partDimensions(sheet,'bottom');
    expect(side['Dado width']).toBeCloseTo(1.04,6);
    expect(side['Inset from end']).toBeCloseTo(1.105,6);
    expect(side['Stopped groove run']).toBeCloseTo(14.5,6);
    expect(side['Stop from each end']).toBeCloseTo(1.75,6);
    expect(side['Groove width']).toBeCloseTo(.28125,6);
    expect(side['Groove depth']).toBeCloseTo(.375,6);
    expect(side['From bottom']).toBeCloseTo(.625,6);
    expect(end['Housing width']).toBeCloseTo(2.54,6);
    expect(end['Housing depth']).toBeCloseTo(.3125,6);
    expect(end.Length).toBeCloseTo(7.875,6);
    expect(bottom.Length).toBeCloseTo(14.375,6);
    expect(bottom['Half width']).toBeCloseTo(3.9375,6);
  });
  test('splits unequal laminations while retaining one resawn bottom pair', () => {
    const sheet=drawing({Handle_lamination_fraction:.4});
    expect(sheet.parts.reduce((sum,p)=>sum+p.quantity,0)).toBe(10);
    expect(sheet.parts.filter(p=>p.id.startsWith('handle')).map(p=>p.quantity)).toEqual([1,1]);
    expect(partDimensions(sheet,'handle-a')['Lamination thickness']).toBeCloseTo(.45,6);
    expect(partDimensions(sheet,'handle-b')['Lamination thickness']).toBeCloseTo(.675,6);
    expect(sheet.parts.filter(p=>p.id==='bottom').map(p=>p.quantity)).toEqual([2]);
  });
  test('locates longitudinal pilot bores below the slot and stops them inside the handle end grain', () => {
    const sheet=drawing({End_grain_screw_bores:true}),handle=partDimensions(sheet,'handle-a'),riser=partDimensions(sheet,'riser');
    expect(handle['Full bore diameter']).toBeCloseTo(.15625,6);
    expect(handle.Embedment).toBeCloseTo(1,6);
    expect(handle['Axis above bottom']).toBeCloseTo(.375,6);
    expect(handle['Axis from outside face']).toBeCloseTo(.5625,6);
    expect(riser['Axis below slot']).toBeCloseTo(.375,6);
    expect(riser['Bore diameter']).toBeCloseTo(.15625,6);
    const pilot=partView(sheet,'handle-a','bores').profiles[0];
    expect(contains(pilot,7.5*25.4,-.02*25.4)).toBe(false);
    expect(contains(pilot,6.95*25.4,-.02*25.4)).toBe(true);
    expect(contains(pilot,7.5*25.4,-.2*25.4)).toBe(true);
    const entry=partView(sheet,'riser','bores').profiles[0];
    expect(contains(entry,0,8.625*25.4)).toBe(false);
    expect(contains(entry,.2*25.4,8.625*25.4)).toBe(true);
  });
  test('updates pilot embedment and draws relief only in laminations the screw actually intersects', () => {
    const sheet=drawing({End_grain_screw_bores:true,Handle_lamination_fraction:.4,Screw_embedment:.75,Screw_height_fraction:.6});
    expect(partView(sheet,'handle-a','bores')).toBeUndefined();
    const handle=partDimensions(sheet,'handle-b');
    expect(handle.Embedment).toBeCloseTo(.75,6);
    expect(handle['Axis above bottom']).toBeCloseTo(.45,6);
    const pilot=partView(sheet,'handle-b','bores').profiles[0];
    expect(contains(pilot,7.5*25.4,0)).toBe(false);
    expect(contains(pilot,7.2*25.4,0)).toBe(true);
    expect(()=>drawing({End_grain_screw_bores:true,Screw_embedment:8})).toThrow('stop before the handle midpoint');
    expect(()=>drawing({End_grain_screw_bores:true,Screw_bore_diameter:.8})).toThrow('inside the notch shoulder');
  });
  test('dimensions a flush end dado by its clipped cut width and omits the zero inset', () => {
    const dimensions=partDimensions(drawing({End_setback:0,Joint_fit:.04}),'side');
    expect(dimensions['Inset from end']).toBeUndefined();
    expect(dimensions['Dado width']).toBeCloseTo(.77,6);
  });
  test('rejects ambiguous physical-part mapping and malformed sheets; keeps older assembly-only sources compatible', () => {
    expect(()=>compileDrawings(source.replace('], side_b_color, [','], [0,0,0], ['),render)).toThrow('Expected one physical mesh');
    expect(parsePartDrawingDefinitions('')).toEqual([]);
    const result=render(`$misc_drawing=true;\n${source}`),output=result.echo;result.free();
    expect(()=>parsePartDrawingDefinitions(output+'\n'+output)).toThrow('one part drawing');
    const row=JSON.parse(output.split('\n').find(l=>l.startsWith('ECHO: "PART_DRAWINGS_V1",')).replace('ECHO: "PART_DRAWINGS_V1", ',''));
    row[0][2]=0;
    expect(()=>parsePartDrawingDefinitions('ECHO: "PART_DRAWINGS_V1", '+JSON.stringify(row))).toThrow('Invalid part drawing');
    const older=compileDrawings(source.replace('echo("PART_DRAWINGS_V1", drawing_part_sheets());',''),render);
    expect(older.parts).toEqual([]);
    expect(older.views).toHaveLength(5);
  });
});

describe('tote drawing contract', () => {
  test('draws the assembly and hides bottom grooves and covered bridle edges', () => {
    const sheet = drawing();
    expect(sheet.units).toBe('inches');
    expect(sheet.views.map(v=>v.id)).toEqual(['front','top','right','joint-longitudinal','joint-transverse']);
    const view = sheet.views[0];
    expect(view.bounds[2]-view.bounds[0]).toBeCloseTo(20*25.4,4);
    expect(view.bounds[3]).toBeCloseTo(11.25*25.4,4);
    expect(covers(view.lines,0,0.5*25.4)).toBe(false);
    expect(covers(view.lines,8.3*25.4,9*25.4)).toBe(false);
    expect(covers(view.lines,9.5*25.4,9*25.4)).toBe(true);
    view.dimensions.forEach((d,i)=>expect(dimensionValue(d,view,sheet.units)).toBeCloseTo([20,18,11.25,6][i],8));
  });
  test('uses source coordinates after fractional parameter changes', () => {
    const sheet = drawing({Handle_length:21.25,Body_length:18.5,Body_width:10.25,Side_height:6.25,Handle_notch_depth:0.375,Handle_lamination_fraction:0.4});
    const front = sheet.views[0], top = sheet.views[1];
    front.dimensions.forEach((d,i)=>expect(dimensionValue(d,front,sheet.units)).toBeCloseTo([21.25,18.5,11.875,6.25][i],8));
    expect(dimensionValue(top.dimensions[0],top,sheet.units)).toBeCloseTo(10.25,8);
    expect(front.bounds[3]).toBeCloseTo(11.875*25.4,4);
  });
  test('ignores exploded/part selection and console cut-list visibility', () => {
    const expected = drawing();
    for (const Part of ['exploded','handle_laminate_1','joint_detail']) {
      expect(drawing({Part,Explode:3,Show_cut_list:false})).toEqual(expected);
    }
  });
  test('assertion failures never generate misleading drawing data', () => {
    expect(()=>drawing({Handle_notch_depth:3})).toThrow();
    expect(()=>compileDrawings('cube(10);',render)).toThrow('drawing definition');
  });
  test('requires complete, unique views and finite, nonzero dimension references', () => {
    const result = render(`$misc_drawing=true;\n${source}`);
    const output = result.echo;
    result.free();
    const parsed = parseDrawingDefinition(output);
    expect(parsed.views).toHaveLength(5);
    expect(()=>parseDrawingDefinition(output+'\n'+output)).toThrow();
    const record = JSON.parse(output.split('\n').find(l=>l.startsWith('ECHO: "DRAWING_V1",')).replace('ECHO: "DRAWING_V1", ',''));
    record[1][0][2][0] = [2,0,0];
    expect(()=>parseDrawingDefinition('ECHO: "DRAWING_V1", '+JSON.stringify(record))).toThrow('orthonormal');
    record[1][0][2][0] = [1,0,0];
    record[1][0][3][0][2] = record[1][0][3][0][1];
    expect(()=>parseDrawingDefinition('ECHO: "DRAWING_V1", '+JSON.stringify(record))).toThrow('positive length');
  });
});

// Even/odd containment preserves holes and disconnected section islands.
function contains(loops, x, y) {
  let inside = false;
  for (const loop of loops) for (let i=0,j=loop.length-1;i<loop.length;j=i++) {
    const [a,b]=loop[i], [c,d]=loop[j];
    if ((b>y)!==(d>y) && x < (c-a)*(y-b)/(d-b)+a) inside=!inside;
  }
  return inside;
}
const measured = (sheet, id) => Object.fromEntries(sheet.views.find(v=>v.id===id).dimensions.map(d=>
  [d.label, dimensionValue(d,sheet.views.find(v=>v.id===id),sheet.units)]));

describe('handle/riser sections', () => {
  test.each([0.25, 0.5, 0.75])('seats the notch roof on the slot floor at depth %p', depth => {
    const sheet=drawing({Handle_notch_depth:depth});
    const side=sheet.views.find(v=>v.id==='joint-longitudinal');
    const end=sheet.views.find(v=>v.id==='joint-transverse');
    expect(side.profiles).toHaveLength(2);
    expect(end.profiles).toHaveLength(3);
    const x=8.375*25.4,z=9*25.4;
    expect(contains(side.profiles[0],x,z-.001)).toBe(true);
    expect(contains(side.profiles[0],x,z+.001)).toBe(false);
    expect(contains(side.profiles[1],x,z-.001)).toBe(false);
    expect(contains(side.profiles[1],x,z+.001)).toBe(true);
    expect(side.profiles.some(p=>contains(p,9.5*25.4,z-.001))).toBe(false);
    expect(side.breaks).toHaveLength(2);
    expect(end.breaks).toHaveLength(1);
    expect(side.section.contacts[0][0][2]).toBeCloseTo(z,6);
    expect(side.section.contacts[0][1][2]).toBeCloseTo(z,6);
    expect(measured(sheet,'joint-longitudinal').Notch).toBeCloseTo(depth,6);
    expect(measured(sheet,'joint-longitudinal')['Blank height']).toBeCloseTo(3,6);
    expect(measured(sheet,'joint-transverse')['Slot depth']).toBeCloseTo(1.75,6);
    expect(measured(sheet,'joint-transverse')['Above riser']).toBeCloseTo(1.25-depth,6);
  });
  test('dimensions changed fit, unequal laminations and the continuous notch from source geometry',()=>{
    const sheet=drawing({Joint_fit:0.04,Handle_lamination_fraction:0.4});
    const side=measured(sheet,'joint-longitudinal'), end=measured(sheet,'joint-transverse');
    expect(side['Notch length']).toBeCloseTo(2.02,6);
    expect(side['Riser thickness']).toBeCloseTo(.75,6);
    expect(side.Overhang).toBeCloseTo(1.25,6);
    expect(end['Lam. A']).toBeCloseTo(.45,6);
    expect(end['Lam. B']).toBeCloseTo(.675,6);
    expect(end['Slot width']).toBeCloseTo(1.165,6);
    expect(end['Riser width']).toBeCloseTo(2.5,6);
    const section=sheet.views.find(v=>v.id==='joint-transverse');
    expect(section.profiles.some(p=>contains(p,.5725*25.4,9.5*25.4))).toBe(false);
    expect(contains(section.profiles[1],-.3*25.4,10*25.4)).toBe(true);
    expect(contains(section.profiles[2],.3*25.4,10*25.4)).toBe(true);
  });
  test('shows the longitudinal screw entry below the slot floor in the transverse joint section',()=>{
    const sheet=drawing({End_grain_screw_bores:true});
    const side=sheet.views.find(v=>v.id==='joint-longitudinal');
    const end=sheet.views.find(v=>v.id==='joint-transverse');
    expect(end.profiles[0]).toHaveLength(2);
    expect(end.profiles.some(p=>contains(p,0,8.625*25.4))).toBe(false);
    expect(end.profiles.some(p=>contains(p,.2*25.4,8.625*25.4))).toBe(true);
    // A-A cuts away from the centered screw axis, leaving the riser solid.
    expect(side.profiles.some(p=>contains(p,8.375*25.4,8.625*25.4))).toBe(true);
  });
  test('omits a zero-length projection dimension when the handle and riser tops are flush',()=>{
    const sheet=drawing({Handle_notch_depth:1.25});
    expect(measured(sheet,'joint-transverse')['Above riser']).toBeUndefined();
    expect(sheet.views.find(v=>v.id==='joint-transverse').profiles).toHaveLength(3);
  });
});
