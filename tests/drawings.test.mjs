import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { render, parameters } from 'openrscad-engine/node';
import { compileDrawings } from '../src/components/cad/drawingCompiler';
import { dimensionValue, parseDrawingDefinition } from '../src/components/cad/drawings';
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

describe('tote drawing contract', () => {
  test('draws the assembly and hides bottom grooves and covered bridle edges', () => {
    const sheet = drawing();
    expect(sheet.units).toBe('inches');
    expect(sheet.views.map(v=>v.id)).toEqual(['front','top','right','joint-longitudinal','joint-transverse']);
    const view = sheet.views[0];
    expect(view.bounds[2]-view.bounds[0]).toBeCloseTo(20*25.4,4);
    expect(view.bounds[3]).toBeCloseTo(11.5*25.4,4);
    expect(covers(view.lines,0,0.5*25.4)).toBe(false);
    expect(covers(view.lines,8.3*25.4,9*25.4)).toBe(false);
    expect(covers(view.lines,9.5*25.4,9*25.4)).toBe(true);
    view.dimensions.forEach((d,i)=>expect(dimensionValue(d,view,sheet.units)).toBeCloseTo([20,18,11.5,6][i],8));
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
  test('keeps bore voids and section islands open when optional bores are enabled',()=>{
    const sheet=drawing({Cheek_screw_bores:true});
    const side=sheet.views.find(v=>v.id==='joint-longitudinal');
    const end=sheet.views.find(v=>v.id==='joint-transverse');
    expect(side.profiles[1]).toHaveLength(2);
    expect(side.profiles.some(p=>contains(p,8.375*25.4,9.875*25.4))).toBe(false);
    expect(end.profiles.some(p=>contains(p,0.2*25.4,9.875*25.4))).toBe(false);
    expect(end.profiles.some(p=>contains(p,1*25.4,9.875*25.4))).toBe(false);
    expect(end.profiles.some(p=>contains(p,1*25.4,10.5*25.4))).toBe(true);
  });
  test('omits a zero-length projection dimension when the handle and riser tops are flush',()=>{
    const sheet=drawing({Handle_notch_depth:1.25});
    expect(measured(sheet,'joint-transverse')['Above riser']).toBeUndefined();
    expect(sheet.views.find(v=>v.id==='joint-transverse').profiles).toHaveLength(3);
  });
});
