import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function scene(){
  const source=readFileSync(new URL('../public/physics-v2.js',import.meta.url),'utf8');
  const block=source.slice(source.indexOf('  // The scenery uses'),source.lastIndexOf('})();'));
  const road={style:{setProperty(name,value){this[name]=value}}};
  const line={style:{},hidden:false};
  const track={clientWidth:1280,appendChild(){}};
  const events=[],timers=[];
  const context=vm.createContext({
    document:{querySelector:s=>s==='.track'?track:road,createElement:()=>line,dispatchEvent:e=>events.push(e)},
    CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail}},
    state:{dist:0,cpu:0},style:{textContent:''},
    playerCar:{offsetLeft:90,offsetWidth:300},cpuCar:{offsetLeft:120,offsetWidth:260,style:{}},
    startRace(){},finish(){},showMenu(){},loop(){},raf:0,
    clearTimeout(){},cancelAnimationFrame(){},setTimeout:fn=>timers.push(fn),feedback(){},addEventListener(){},
  });
  vm.runInContext(block,context);
  return {context,road,line,events,timers,render:(d,cpu=d)=>{context.state.dist=d;context.state.cpu=cpu;vm.runInContext('renderRoad()',context)}};
}

test('road is stationary at zero distance, even when revving',()=>{
  const s=scene();s.context.state.rpm=6500;s.render(0);
  assert.equal(s.road.style['--road-offset'],'0px');
});
test('road scroll is proportional to distance, not a fixed animation',()=>{
  const s=scene();s.render(1);assert.equal(s.road.style['--road-offset'],'-28px');
  s.render(2);assert.equal(s.road.style['--road-offset'],'-56px');
  s.render(2);assert.equal(s.road.style['--road-offset'],'-56px');
});
test('finish stays offscreen at start and meets the car nose at quarter mile',()=>{
  const s=scene();assert.equal(s.line.hidden,true);
  s.render(400);assert.equal(s.line.hidden,false);
  const before=parseFloat(s.line.style.left);
  s.render(402.336);
  assert.equal(parseFloat(s.line.style.left),90+300*.962);
  assert.ok(Math.abs(before-parseFloat(s.line.style.left)-2.336*28)<1e-8);
});
test('opponent position follows relative race distance',()=>{
  const s=scene();s.render(100,100);const equal=s.context.cpuCar.style.transform;
  s.render(200,200);assert.equal(s.context.cpuCar.style.transform,equal);
  s.render(200,210);assert.notEqual(s.context.cpuCar.style.transform,equal);
});
test('race completion emits a single dealership reward event',()=>{
  const s=scene();Object.assign(s.context.state,{phase:'GO',dist:402.336,cpu:399,perfect:2,launch:'PERFECT'});
  vm.runInContext('finish();finish()',s.context);
  assert.equal(s.events.length,1);assert.equal(s.events[0].type,'jd:race-finished');
  assert.equal(s.events[0].detail.win,true);assert.equal(s.events[0].detail.perfect,2);
  assert.equal(s.timers.length,1);
});
test('a new race requests the selected garage car',()=>{
  const s=scene();vm.runInContext('startRace()',s.context);
  assert.equal(s.events[0].type,'jd:race-start');
});
test('opponent victory preserves the actual player position and records a loss',()=>{
 const s=scene();Object.assign(s.context.state,{phase:'GO',dist:250,cpu:402.336,raceWin:false});
 vm.runInContext('finish()',s.context);assert.equal(s.context.state.dist,250);assert.equal(s.events[0].detail.win,false);
});
