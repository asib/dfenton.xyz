import {expect,test} from 'bun:test';
import {render} from 'openrscad-engine/node';
import {displayMesh} from '../src/components/cad/displayMesh';
import {sectionDrawing} from '../src/components/cad/drawingSections';
import {parseDrawingDefinition} from '../src/components/cad/drawings';
const loopArea=loop=>Math.abs(loop.reduce((s,p,i)=>{const q=loop[(i+1)%loop.length];return s+p[0]*q[1]-q[0]*p[1];},0)/2);

test('sections just inside an end face preserve rabbet corners beside tiny triangle segments',()=>{
 const r=render('difference(){cube([800,63.5,19.05]);translate([-1,-1,-1])cube([802,8.14375,7.35]);}');
 try {
  const mesh=displayMesh(r.preview_positions,r.preview_normals,r.groups) ?? {positions:r.positions,groups:[{start:0,count:r.positions.length/3}]};
  const view={id:'end',title:'End',axes:[[0,1,0],[0,0,1],[1,0,0]],dimensions:[],
   section:{depth:.02,crop:[0,0,63.5,19.05],breaks:[],notes:[],contacts:[]}};
  const section=sectionDrawing(mesh,view);
  expect(section.profiles).toHaveLength(1);expect(section.profiles[0]).toHaveLength(1);
  expect(loopArea(section.profiles[0][0])).toBeCloseTo(63.5*19.05-7.14375*6.35,3);
 }finally{r.free();}
});

test('a cut exactly on a stepped floor takes the cross-section immediately behind the plane',()=>{
 const r=render('difference(){cube([50,30,10]);translate([-1,-1,-1])cube([52,9,6]);}');
 try{
  const mesh=displayMesh(r.preview_positions,r.preview_normals,r.groups) ?? {positions:r.positions,groups:[{start:0,count:r.positions.length/3}]};
  const view={id:'floor',title:'Floor',axes:[[1,0,0],[0,1,0],[0,0,1]],dimensions:[],
   section:{depth:5,crop:[0,0,50,30],breaks:[],notes:[],contacts:[]}};
  const section=sectionDrawing(mesh,view);
  expect(loopArea(section.profiles[0][0])).toBeCloseTo(50*22,6);
 }finally{r.free();}
});

test('precise section depths and crop coordinates retain negative fractions and reject malformed encodings',()=>{
 const axes=[[1,0,0],[0,1,0],[0,0,1]];
 const section=[[-291,751833],[[-443,87500],0,[-315,87500],[19,50000]],[],[],[]];
 const data=['inches',[['front','Front',axes,[]],['top','Top',axes,[]],['right','Right',axes,[]],
  ['joint-longitudinal','A',axes,[],section],['joint-transverse','B',axes,[],section]]];
 const parse=()=>parseDrawingDefinition('ECHO: "DRAWING_V1", '+JSON.stringify(data));
 expect(parse().views[3].section.depth).toBe(-290.248167);
 expect(parse().views[3].section.crop).toEqual([-442.9125,0,-314.9125,19.05]);
 section[0]=[-291,-1];expect(parse).toThrow('Invalid drawing section');
 section[0]=[-291,751833];section[1][0]=[-443,1000001];expect(parse).toThrow('Invalid drawing section');
});
