import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { parameters, render } from 'openrscad-engine/node';
import { availableOptions, configuredSource, defaults, parseParameters } from '../src/components/cad/parameters';
import { compileDrawings } from '../src/components/cad/drawingCompiler';
import { dimensionValue } from '../src/components/cad/drawings';
import { groupCutList, parseCutList } from '../src/components/cad/cutList';
import { displayMesh, visiblePartColors } from '../src/components/cad/displayMesh';

const source=readFileSync(new URL('../public/misc/half-lap-art-frame/half-lap-art-frame.scad',import.meta.url),'utf8');
const metadata=JSON.parse(readFileSync(new URL('../public/misc/half-lap-art-frame/meta.json',import.meta.url),'utf8'));
const schema=parseParameters(parameters(source)), initial=defaults(schema);
const joints=['splined_miter','loose_tenon_miter','dowelled_butt','dovetail_key_miter','blind_mortise_tenon','through_mortise_tenon'];
const configured=changes=>configuredSource(source,schema,{...initial,...changes});
function compile(changes) {
  const r=render(configured(changes));
  try {
    expect(r.ok).toBe(true); expect(r.warnings).toBe(''); expect(r.geom_errors).toBe('');
    const mesh=displayMesh(r.preview_positions,r.preview_normals,r.groups);
    return {volume:r.volume,echo:r.echo,mesh,parts:mesh.groups.map(g=>mesh.positions.slice(g.start*3,(g.start+g.count)*3))};
  } finally {r.free();}
}
function volume(mesh) {
  let v=0;
  for(let i=0;i<mesh.length;i+=9) {
    const [a,b,c]=[0,3,6].map(d=>[...mesh.slice(i+d,i+d+3)]);
    v+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
  }
  return v;
}
function inside(mesh,p) {
  const hits=[];
  for(let i=0;i<mesh.length;i+=9) {
    const [a,b,c]=[0,3,6].map(d=>[...mesh.slice(i+d,i+d+3)].map(n=>n/25.4));
    const det=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
    if(Math.abs(det)<1e-9)continue;
    const u=((b[1]-c[1])*(p[0]-c[0])+(c[0]-b[0])*(p[1]-c[1]))/det;
    const v=((c[1]-a[1])*(p[0]-c[0])+(a[0]-c[0])*(p[1]-c[1]))/det;
    if(Math.min(u,v,1-u-v)>-1e-7)hits.push(u*a[2]+v*b[2]+(1-u-v)*c[2]);
  }
  return [...new Set(hits.map(n=>n.toFixed(5)))].filter(n=>Number(n)<p[2]).length%2===1;
}
const dims=sheet=>Object.fromEntries(sheet.views.flatMap(v=>v.dimensions.map(d=>[d.label,dimensionValue(d,v,'inches')])));
const piece=(r,color)=>r.parts[r.mesh.groups.findIndex(g=>color.every((n,i)=>Math.abs(n-g.color[i])<1e-5))];
const insertColor=[135/255,84/255,173/255];

// Assembly volume checks the envelope and sum-of-parts checks that machining
// removes exactly the inserted wood, including curved holes and tapered keys.
test.each(joints)('%s fills the frame without overlapping parts and produces all machining sheets', Joinery=>{
  for(const changes of [{},{Rabbet_depth:0},{Thickness:1,Rabbet_depth:.625},
    {Art_width:1,Art_height:1,Reveal:.01,Member_width:.25,Thickness:.125,Rabbet_depth:.0625,Clearance:0},
    {Art_width:200,Art_height:200,Reveal:4,Member_width:12,Thickness:4,Rabbet_depth:3,Clearance:.25}]) {
    const p={...initial,...changes},r=compile({Joinery,...changes});
    const iw=p.Art_width-2*p.Reveal,ih=p.Art_height-2*p.Reveal;
    const expected=(((iw+2*p.Member_width)*(ih+2*p.Member_width)-iw*ih)*p.Thickness-
      ((p.Art_width+2*p.Clearance)*(p.Art_height+2*p.Clearance)-iw*ih)*p.Rabbet_depth)*25.4**3;
    expect(r.parts.length).toBe(Joinery==='dowelled_butt'?12:Joinery.includes('mortise')?4:8);
    expect(Math.abs(r.volume/expected-1)).toBeLessThan(1e-6);
    expect(r.parts.every(part=>volume(part)>0)).toBe(true);
    expect(Math.abs(r.parts.reduce((n,p)=>n+volume(p),0)/r.volume-1)).toBeLessThan(2e-6);
    const drawing=compileDrawings(configured({Joinery,...changes}),render);
    expect(drawing.parts.length).toBe(Joinery==='dowelled_butt'?5:4);
    expect(drawing.views.filter(v=>v.section).every(v=>v.profiles.length>=2)).toBe(true);
    expect(drawing.parts.flatMap(p=>p.views).filter(v=>v.section).every(v=>v.profiles.length===1)).toBe(true);
    expect(dims({views:drawing.views})['Outside width']).toBeCloseTo(iw+2*p.Member_width,5);
    expect(visiblePartColors(r.mesh,metadata.customizer.parts)).toHaveLength(r.parts.length);
  }
});

test('reinforced miters remove pockets at all corners and give each insert the correct grain-oriented blank',()=>{
  for(const Joinery of joints.filter(j=>j.endsWith('miter'))) {
    const r=compile({Joinery}),cut=groupCutList(parseCutList(r.echo));
    expect(cut).toHaveLength(3);expect(cut[2].quantity).toBe(4);
    const mesh=piece(r,insertColor), drawing=compileDrawings(configured({Joinery}),render);
    const d=dims(drawing.parts.find(p=>p.id==='insert'));
    expect(d['Blank length']).toBeCloseTo(cut[2].length,5);
    expect(d['Blank width']).toBeCloseTo(cut[2].width,5);
    // Both sides of the miter are occupied by the insert at its center, and
    // the owning rail/stile has a corresponding void at each of four corners.
    const t=Joinery==='loose_tenon_miter'?2.5/Math.sqrt(2):2.5/6;
    for(const sx of [-1,1])for(const sy of [-1,1])for(const s of [-.1,.1]) {
      const p=[sx*(34.875/2-(t+s)/Math.sqrt(2)),sy*(25.8125/2-(t-s)/Math.sqrt(2)),.375];
      expect(r.parts.slice(0,4).some(m=>inside(m,p))).toBe(false);
      expect(r.parts.slice(4).filter(m=>inside(m,p))).toHaveLength(1);
    }
    if(Joinery==='dovetail_key_miter') {
      const point=(s,t,z)=>[-34.875/2+(t+s)/Math.sqrt(2),25.8125/2-(t-s)/Math.sqrt(2),z];
      // A tapered dovetail, not a rectangular spline with a decorative name.
      expect(inside(mesh,point(0,.1,.53))).toBe(false);
      expect(inside(mesh,point(0,.8,.53))).toBe(true);
      expect(d['Buried thickness']).toBeCloseTo(.375,6);
      expect(d['Tip thickness']).toBeCloseTo(.375-2*(2.5/3)*Math.tan(8*Math.PI/180),5);
    }
  }
});

test('square joints preserve the opening and use correct short, integral-tenon and through-tenon blanks',()=>{
  for(const Joinery of joints.filter(j=>!j.endsWith('miter'))) {
    const r=compile({Joinery}),cut=groupCutList(parseCutList(r.echo));
    const length=Joinery==='dowelled_butt'?29.875:Joinery==='blind_mortise_tenon'?32.375:34.875;
    expect(cut[0].length).toBe(length);expect(cut[0].quantity).toBe(2);
    const sheet=compileDrawings(configured({Joinery}),render);
    expect(dims(sheet.parts.find(p=>p.id==='rail'))['Blank length']).toBeCloseTo(length,6);
    const sd=dims(sheet.parts.find(p=>p.id==='stile-machining'));
    if(Joinery==='dowelled_butt') {
      expect(cut[2].quantity).toBe(8);expect(cut[2].length).toBe(2.5);
      expect(cut[2].width).toBe(.25);expect(cut[2].thickness).toBe(.25);
      expect(sd['Hole diameter']).toBeCloseTo(.25,6);expect(sd['Hole depth']).toBeCloseTo(1.25,6);
    } else {
      const v=(.28125+2.5)/2,center=[-14.9375-.5,10.40625+v,.375];
      expect(inside(r.parts[0],center)).toBe(true);expect(inside(r.parts[2],center)).toBe(false);
      const nearOutside=[-17.4375+.01,center[1],center[2]];
      expect(inside(r.parts[0],nearOutside)).toBe(Joinery.startsWith('through'));
      expect(inside(r.parts[2],nearOutside)).toBe(Joinery.startsWith('blind'));
      expect(sd['Mortise depth']).toBeCloseTo(Joinery.startsWith('through')?2.5:1.25,6);
      expect(sd['Mortise width']).toBeCloseTo(1.25,6);
    }
  }
});

test('custom insert counts, offsets and mortises update geometry, drilling, quantities and machining dimensions together',()=>{
  const cases=[
    {Joinery:'splined_miter',Spline_count:3,Spline_thickness:.0625,Spline_depth:.625},
    {Joinery:'loose_tenon_miter',Loose_tenon_depth:.5,Loose_tenon_width:.75,Tenon_thickness:.1875,Tenon_offset:.0625},
    {Joinery:'dovetail_key_miter',Key_depth:.625,Key_thickness:.375,Key_angle:10},
    {Joinery:'dowelled_butt',Dowel_count:3,Dowel_diameter:.1875,Dowel_depth:.75,Dowel_spacing:.5},
    {Joinery:'blind_mortise_tenon',Mortise_depth:1,Tenon_width:1,Tenon_inset:.5,Tenon_thickness:.25,Tenon_offset:.0625},
    {Joinery:'through_mortise_tenon',Tenon_width:1,Tenon_inset:.5,Tenon_thickness:.25,Tenon_offset:.0625}
  ];
  for(const p of cases) {
    const r=compile(p),sheet=compileDrawings(configured(p),render);
    const part=sheet.parts.find(p=>p.id==='insert');
    if(part)expect(part.quantity).toBe(4*(p.Spline_count||p.Dowel_count||1));
    expect(compileDrawings(configured({...p,Part:'left',Exploded:true}),render)).toEqual(sheet);
    if(part) {
      const one=compile({...p,Part:'insert'});expect(one.parts).toHaveLength(1);
      expect(one.parts[0]).toEqual(piece(r,insertColor));
      expect(compileDrawings(configured({...p,Part:'insert'}),render)).toEqual(sheet);
    }
    if(p.Joinery==='dowelled_butt') {
      const dd=dims(sheet.parts.find(p=>p.id==='rail-machining'));
      expect(dd['Hole spacing']).toBeCloseTo(.5,6);expect(dd['Hole diameter']).toBeCloseTo(.1875,6);
      expect(dd['Hole depth']).toBeCloseTo(.75,6);
    }
    if(p.Joinery.includes('mortise')) {
      const dd=dims(sheet.parts.find(p=>p.id==='rail-machining'));
      expect(dd['Tongue / mortise']).toBeCloseTo(.25,6);expect(dd['Back cheek']).toBeCloseTo(.3125,6);
      expect(dd['Opening edge inset']).toBeCloseTo(.5,6);
    }
  }
});

test('invalid active joints reject collisions, breakout, non-blind bores and vanishing dovetail tips',()=>{
  for(const [p,message]of[
    [{Joinery:'splined_miter',Spline_count:3,Spline_thickness:.25},'Splines must leave'],
    [{Joinery:'splined_miter',Spline_depth:2},'Splines must leave'],
    [{Joinery:'loose_tenon_miter',Loose_tenon_depth:2},'remain concealed'],
    [{Joinery:'loose_tenon_miter',Loose_tenon_width:3},'remain concealed'],
    [{Joinery:'dovetail_key_miter',Key_depth:1.5,Key_thickness:.25,Key_angle:15},'positive tip'],
    [{Joinery:'dowelled_butt',Dowel_spacing:.125},'Dowel holes must'],
    [{Joinery:'dowelled_butt',Dowel_depth:3},'Dowel holes must'],
    [{Joinery:'dowelled_butt',Dowel_count:1.5},'Dowel holes must'],
    [{Joinery:'blind_mortise_tenon',Mortise_depth:2.5},'positive blind end wall'],
    [{Joinery:'through_mortise_tenon',Tenon_inset:.125},'face shoulders'],
    [{Joinery:'half_lap',Part:'insert'},'no separate inserts']
  ]) {
    const r=render(configured(p));try{expect(r.ok).toBe(false);expect(r.error).toContain(message);}finally{r.free();}
  }
  // Unused values cannot block another construction.
  compile({Joinery:'miter',Key_depth:8,Dowel_depth:8,Tenon_width:8,Spline_thickness:2});
  compile({Joinery:'through_mortise_tenon',Mortise_depth:-1});
  const field=schema.find(p=>p.name==='Part'),conditions=metadata.customizer.optionConditions.Part;
  expect(availableOptions(field,conditions,{Joinery:'splined_miter'}).some(o=>o.value==='insert')).toBe(true);
  expect(availableOptions(field,conditions,{Joinery:'half_lap'}).some(o=>o.value==='insert')).toBe(false);
});

test('near-face machining sections preserve real corners and hole areas',()=>{
  const area=loop=>Math.abs(loop.reduce((s,p,i)=>{const q=loop[(i+1)%loop.length];return s+p[0]*q[1]-q[0]*p[1];},0)/2)/25.4**2;
  for(const Joinery of joints) {
    const sheet=compileDrawings(configured({Joinery}),render);
    const view=sheet.parts[2].views[0];
    const areas=view.profiles[0].map(area).sort((a,b)=>b-a);
    const actual=areas[0]-areas.slice(1).reduce((a,b)=>a+b,0);
    let expected;
    if(Joinery==='dowelled_butt')expected=2.5*.75-.28125*.25-2*16*(.25/2)**2*Math.sin(2*Math.PI/32);
    else if(Joinery.includes('mortise'))expected=1.25*.25;
    else {
      expected=Math.sqrt(2)*(2.5*.75-.28125*.25);
      if(Joinery==='splined_miter')expected-=(2.5/3)*.125;
      if(Joinery==='loose_tenon_miter')expected-=(2.5/3)*.25;
      if(Joinery==='dovetail_key_miter')expected-=(2.5/3)*(.375-(2.5/3)*Math.tan(8*Math.PI/180));
    }
    expect(Math.abs(actual-expected)).toBeLessThan(.003);
  }
});
