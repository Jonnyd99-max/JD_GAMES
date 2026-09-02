import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const physics=readFileSync(new URL('../public/physics-v2.js',import.meta.url),'utf8');
test('neither startup layer contains or renders a legacy car graphic',()=>{
 assert.ok(!html.includes('<svg'));assert.ok(!html.includes('innerHTML=car('));
 assert.ok(!physics.includes('detailedCar'));assert.ok(!physics.includes('<svg'));
});
test('home car reserves its final height before styles and sprites arrive',()=>{
 assert.ok(html.includes('#heroCar{height:145px}'));assert.ok(html.includes('LOADING CAR…'));
 assert.ok(html.includes('#heroCar .pixel-car{display:block;width:100%;height:145px'));
});
test('initial script leaves car containers and saved progress untouched',()=>{
 const cars={heroCar:{innerHTML:''},playerCar:{innerHTML:''},cpuCar:{innerHTML:''}};
 const context=vm.createContext({...cars,pedal:{},onkeydown:null,onkeyup:null,localStorage:{getItem(){throw Error('Unexpected startup read')},setItem(){throw Error('Unexpected save write')}}});
 vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1],context);
 for(const car of Object.values(cars))assert.equal(car.innerHTML,'');assert.equal(typeof context.startRace,'function');
});
