import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { parameters, render } from 'openrscad-engine/node';
import { conditionMatches, configuredSource, defaults, parseParameters } from '../src/components/cad/parameters';
import { compileDrawings } from '../src/components/cad/drawingCompiler';
import { dimensionValue } from '../src/components/cad/drawings';
import { groupCutList, parseCutList } from '../src/components/cad/cutList';

const source = readFileSync(new URL('../public/misc/half-lap-art-frame/half-lap-art-frame.scad', import.meta.url), 'utf8');
const schema = parseParameters(parameters(source)), initial = defaults(schema);
const joints = ['half_lap', 'miter', 'mitered_half_lap', 'bridle', 'mitered_bridle'];
const configured = changes => configuredSource(source, schema, { ...initial, ...changes });
function compile(changes = {}) {
  const r = render(configured(changes));
  try {
    expect(r.ok).toBe(true); expect(r.warnings).toBe(''); expect(r.geom_errors).toBe('');
    const groups = JSON.parse(r.groups);
    return { volume: r.volume, echo: r.echo,
      parts: groups.map(g => r.preview_positions.slice(g.start * 3, (g.start + g.count) * 3)) };
  } finally { r.free(); }
}
function meshStats(positions) {
  let volume = 0; const edges = new Map();
  for (let i = 0; i < positions.length; i += 9) {
    const [a, b, c] = [0, 3, 6].map(d => [...positions.slice(i + d, i + d + 3)]);
    volume += (a[0]*(b[1]*c[2]-b[2]*c[1]) + a[1]*(b[2]*c[0]-b[0]*c[2]) + a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
    const keys = [a,b,c].map(p => p.map(n => n.toFixed(4)).join(','));
    for (let j = 0; j < 3; j++) { const k = [keys[j],keys[(j+1)%3]].sort().join('|'); edges.set(k,(edges.get(k) ?? 0)+1); }
  }
  return { volume, closed: [...edges.values()].every(n => n === 2) };
}
// Actual triangle intersections along Z, with point probes away from vertices.
function inside(positions, p) {
  const hits = [];
  for (let i = 0; i < positions.length; i += 9) {
    const [a,b,c] = [0,3,6].map(d => [...positions.slice(i+d,i+d+3)].map(n => n/25.4));
    const det = (b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
    if (Math.abs(det) < 1e-8) continue;
    const u = ((b[1]-c[1])*(p[0]-c[0])+(c[0]-b[0])*(p[1]-c[1]))/det;
    const v = ((c[1]-a[1])*(p[0]-c[0])+(a[0]-c[0])*(p[1]-c[1]))/det;
    if (Math.min(u,v,1-u-v) > -1e-7) hits.push(u*a[2]+v*b[2]+(1-u-v)*c[2]);
  }
  const z = [...new Set(hits.map(n => Number(n.toFixed(5))))].sort((a,b) => a-b);
  return z.filter(n => n < p[2]).length % 2 === 1;
}

test.each(joints)('%s preserves the envelope with four closed, nonoverlapping pieces', Joinery => {
  for (const changes of [{}, { Thickness: 1, Rabbet_depth: .625 }, { Rabbet_depth: 0 },
    { Lap_depth: .25, Tenon_thickness: .375, Tenon_offset: .0625 },
    { Art_width: 1, Art_height: 1, Reveal: .01, Member_width: .25, Thickness: .125, Rabbet_depth: .0625, Clearance: 0 },
    { Art_width: 200, Art_height: 200, Reveal: 4, Member_width: 12, Thickness: 4, Rabbet_depth: 3, Clearance: .25 }]) {
    const p = { ...initial, ...changes }, r = compile({ ...changes, Joinery });
    const iw=p.Art_width-2*p.Reveal, ih=p.Art_height-2*p.Reveal, ow=iw+2*p.Member_width, oh=ih+2*p.Member_width;
    const expected=((ow*oh-iw*ih)*p.Thickness-((p.Art_width+2*p.Clearance)*(p.Art_height+2*p.Clearance)-iw*ih)*p.Rabbet_depth)*25.4**3;
    expect(r.parts).toHaveLength(4);
    const stats = r.parts.map(meshStats);
    expect(stats.every(p => p.closed && p.volume > 0)).toBe(true);
    expect(Math.abs(r.volume/expected-1)).toBeLessThan(1e-6);
    expect(Math.abs(stats.reduce((sum,p)=>sum+p.volume,0)/r.volume-1)).toBeLessThan(1e-6);
    const sheet = compileDrawings(configured({ ...changes, Joinery }),render);
    expect(sheet.parts).toHaveLength(2); expect(sheet.views.filter(v=>v.section).every(v=>v.profiles.length===2)).toBe(true);
    for (const part of sheet.parts) expect(part.views.filter(v=>v.section).every(v=>v.profiles.length===1)).toBe(true);
  }
});

test.each(joints)('%s has the intended bearing faces and front/back construction at all four corners', Joinery => {
  for (const changes of [{}, { Lap_depth: .25, Tenon_thickness: .25, Tenon_offset: .0625 }]) {
    const p={...initial,...changes}, r=compile({...changes,Joinery});
    const lap=p.Lap_depth || p.Thickness/2, tongue=p.Tenon_thickness || p.Thickness/3;
    const back=(p.Thickness-tongue)/2+p.Tenon_offset, front=back+tongue;
    for (const sx of [-1,1]) for (const sy of [-1,1]) for (const s of [.55,1.3,2.2]) for (const v of [.85,1.65]) for (const z of [.1,.28,.44,.68]) {
      const xyz=[sx*(34.875/2-s),sy*(20.8125/2+v),z], diagonal=s+v>2.5;
      const rail=Joinery==='half_lap' ? z>lap : Joinery==='miter' ? diagonal :
        Joinery==='mitered_half_lap' ? z>lap && diagonal : z>back && z<front || Joinery==='mitered_bridle' && z>front && diagonal;
      expect(inside(r.parts[sy>0?0:1],xyz)).toBe(rail);
      expect(inside(r.parts[sx<0?2:3],xyz)).toBe(!rail);
    }
    const sheet=compileDrawings(configured({...changes,Joinery}),render);
    for (const view of sheet.views.filter(v=>v.section)) for (const [a,b] of view.section.contacts) {
      const middle=a.map((n,i)=>(n+b[i])/2/25.4);
      const axis=Math.abs(a[2]-b[2])<1e-6 ? 2 : view.id==='joint-longitudinal' ? 0 : 1;
      const sides=[-.001,.001].map(d=>{const probe=[...middle];probe[axis]+=d;return r.parts.map(part=>inside(part,probe));});
      expect(sides.every(side=>side.filter(Boolean).length===1)).toBe(true);
      expect(sides[0]).not.toEqual(sides[1]);
    }
  }
});

test('custom lap and bridle dimensions are reported by the manufacturing sheets', () => {
  for (const Joinery of joints) {
    const sheet=compileDrawings(configured({Joinery,Lap_depth:.25,Tenon_thickness:.25,Tenon_offset:.0625}),render);
    for (const part of sheet.parts) {
      const dims=Object.fromEntries(part.views.flatMap(v=>v.dimensions.map(d=>[d.label,dimensionValue(d,v,sheet.units)])));
      expect(dims['Blank width']).toBeCloseTo(2.5,6);
      expect(dims['Rabbet depth']).toBeCloseTo(.25,6);
      if (Joinery.includes('bridle')) {
        expect(dims[part.id==='rail'?'Tongue':'Slot']).toBeCloseTo(.25,6);
        expect(dims['Back cheek']).toBeCloseTo(.3125,6); expect(dims['Front cheek']).toBeCloseTo(.1875,6);
      }
      if (Joinery==='mitered_half_lap') expect(dims[part.id==='rail'?'Back lap':'Front lap']).toBeCloseTo(part.id==='rail'?.25:.5,6);
      if (Joinery==='miter' || Joinery.startsWith('mitered')) expect(part.notes.join(' ')).toContain('45');
    }
    const blanks=groupCutList(parseCutList(compile({Joinery}).echo));
    expect(blanks.map(p=>[p.quantity,p.length,p.width,p.thickness])).toEqual([[2,34.875,2.5,.75],[2,25.8125,2.5,.75]]);
    expect(compileDrawings(configured({Joinery,Part:'left',Explosion_percent:200}),render)).toEqual(compileDrawings(configured({Joinery}),render));
  }
});

test('active-joint constraints reject missing cheeks and ignore inactive dimensions', () => {
  for (const [changes,message] of [
    [{Joinery:'half_lap',Lap_depth:.75},'Lap depth must leave'],
    [{Joinery:'mitered_half_lap',Lap_depth:-.25},'Lap depth must leave'],
    [{Joinery:'bridle',Tenon_thickness:.75},'positive cheek'],
    [{Joinery:'mitered_bridle',Tenon_offset:.5},'positive cheek'],
    [{Joinery:'unknown'},'supported corner joint'],
  ]) { const r=render(configured(changes)); try {expect(r.ok).toBe(false);expect(r.error).toContain(message);}finally{r.free();} }
  compile({Joinery:'miter',Lap_depth:.75,Tenon_thickness:.75,Tenon_offset:1});
  const both={parameter:'Joinery',values:['bridle','mitered_bridle'],hide:true};
  expect(conditionMatches(both,{Joinery:'bridle'})).toBe(true);
  expect(conditionMatches(both,{Joinery:'mitered_bridle'})).toBe(true);
  expect(conditionMatches(both,{Joinery:'half_lap'})).toBe(false);
  expect(conditionMatches({parameter:'Part',value:'all'},{Part:'all'})).toBe(true);
});
