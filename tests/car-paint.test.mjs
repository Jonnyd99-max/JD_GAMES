import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {paintBody,drawNumber,drawStripe} from '../public/car-paint.mjs';
export function sprite(id){
 const png=readFileSync(new URL(`../public/cars/pixel/${id}.png`,import.meta.url)),parts=[];let offset=8;
 while(offset<png.length){const n=png.readUInt32BE(offset),kind=png.toString('ascii',offset+4,offset+8);if(kind==='IDAT')parts.push(png.subarray(offset+8,offset+8+n));offset+=n+12}
 const raw=inflateSync(Buffer.concat(parts)),data=new Uint8ClampedArray(256*92*4),stride=1024;
 const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c};
 for(let y=0;y<92;y++){const filter=raw[y*(stride+1)];for(let x=0;x<stride;x++){const i=y*stride+x,a=x>=4?data[i-4]:0,b=y?data[i-stride]:0,c=y&&x>=4?data[i-stride-4]:0;data[i]=(raw[y*(stride+1)+1+x]+(filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):filter===4?paeth(a,b,c):0))&255}}
 return data;
}
test('starter repaint covers roof, spoiler, front and rear as well as doors',()=>{
 const original=sprite('starter-0'),painted=paintBody(original.slice(),'#ef4545','starter-0');
 for(const [name,x1,x2,y1,y2] of [['roof',70,151,10,20],['spoiler',10,47,20,37],['rear',10,35,57,78],['front',225,249,63,79],['doors',85,165,44,73]]){
  let source=0,changed=0;for(let y=y1;y<y2;y++)for(let x=x1;x<x2;x++){const i=(y*256+x)*4;if(original[i+3]>128&&original[i+1]>40&&original[i+1]>original[i]*1.25&&original[i+1]>original[i+2]*1.6){source++;if(painted[i]>painted[i+1])changed++}}
  assert.ok(source>0,name+' has body pixels');assert.ok(changed/source>.9,name+' repaints at least 90% of green body pixels: '+changed+'/'+source);
 }
});
test('repaint preserves alpha, blue glazing and dark tyre pixels',()=>{const a=sprite('starter-0'),b=paintBody(a.slice(),'#ef4545','starter-0');let glass=0;for(let i=0;i<a.length;i+=4){assert.equal(a[i+3],b[i+3]);if(a[i+2]>a[i]*2&&a[i+2]>a[i+1]*1.3){assert.deepEqual(b.slice(i,i+4),a.slice(i,i+4));glass++}if(Math.max(a[i],a[i+1],a[i+2])<25)assert.deepEqual(b.slice(i,i+4),a.slice(i,i+4))}assert.ok(glass>10)});
test('all 25 sprites recolour without losing transparency',()=>{for(const group of ['starter','roadster','muscle','race','super'])for(let n=0;n<5;n++){const id=group+'-'+n,a=sprite(id),b=paintBody(a.slice(),'#a968dd',id);let changed=0;for(let i=0;i<a.length;i+=4){assert.equal(a[i+3],b[i+3]);if(a[i]!==b[i])changed++}assert.ok(changed>100,id+' has repaintable bodywork')}});
test('number and stripe use integer pixel shapes, never blurry text',()=>{for(const draw of [drawNumber,drawStripe]){const calls=[],ctx={fillStyle:'',fillRect(...args){assert.ok(args.every(Number.isInteger));calls.push({color:this.fillStyle,args})}};draw(ctx);assert.ok(calls.length>20);assert.ok(new Set(calls.map(c=>c.color)).size>=3)}});
