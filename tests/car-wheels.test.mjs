import test from 'node:test';
import assert from 'node:assert/strict';
import {sprite} from './car-paint.test.mjs';
import {findWheels,drawWheels} from '../public/car-wheels.mjs';
test('starter alloys align with the actual hubs and cover the full rims',()=>{
 const wheels=findWheels(sprite('starter-0'),'starter-0');
 for(const [i,x] of [58,192].entries()){assert.ok(Math.abs(wheels[i].x-x)<=2,JSON.stringify(wheels));assert.ok(Math.abs(wheels[i].y-68)<=2,JSON.stringify(wheels));assert.ok(wheels[i].radius>=13,JSON.stringify(wheels))}
});
test('all 25 cars have separately fitted front and rear rims',()=>{
 const geometries=new Set();for(const group of ['starter','roadster','muscle','race','super'])for(let i=0;i<5;i++){
  const id=group+'-'+i,wheels=findWheels(sprite(id),id);assert.equal(wheels.length,2);
  for(const w of wheels){assert.ok(w.radius>=11&&w.radius<=18);assert.ok(w.y-w.radius>40);assert.ok(w.y+w.radius<=90,id+JSON.stringify(wheels))}
  assert.ok(wheels[0].x<90&&wheels[1].x>160);geometries.add(JSON.stringify(wheels));
 }assert.ok(geometries.size>15);
});
test('each alloy fully replaces every rim pixel without drawing over surrounding tyres',()=>{
 const wheels=[{x:58,y:68,radius:15},{x:192,y:68,radius:14}],styles=new Set();
 for(const stage of [1,2,3]){const pixels=new Map(),ctx={fillStyle:'',fillRect(x,y,w,h){assert.equal(w,1);assert.equal(h,1);assert.ok(Number.isInteger(x)&&Number.isInteger(y));pixels.set(x+','+y,this.fillStyle)}};drawWheels(ctx,wheels,stage);
  for(let y=0;y<92;y++)for(let x=0;x<256;x++)assert.equal(pixels.has(x+','+y),wheels.some(w=>Math.hypot(x-w.x,y-w.y)<=w.radius));
  styles.add(JSON.stringify([...pixels]));
 }assert.equal(styles.size,3);
});
