import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as MODEL from '../public/flappy-king-model.mjs';

test('UI mounts, loads art, starts, pauses, retries and returns home without race input',async()=>{
  const images=[],created=[],listeners={},frames=new Map(),shows=[],draws=[];
  let nextFrame=0,document;
  const context=new Proxy({}, {get:(o,k)=>o[k]??((...args)=>{if(k==='drawImage')draws.push(args)}),set:(o,k,v)=>(o[k]=v,true)});
  function element(tag='div'){
    const children=new Map(),events={},classes=new Set();
    const e={tag,events,dataset:{},hidden:false,disabled:false,width:432,height:600,
      classList:{add:n=>classes.add(n),remove:n=>classes.delete(n),contains:n=>classes.has(n)},
      addEventListener:(name,fn)=>events[name]=fn,appendChild(){},replaceWith(){},
      getContext:()=>context,focus(){document.activeElement=e},closest:()=>e,
      querySelector(selector){if(!children.has(selector))children.set(selector,element(selector));return children.get(selector)},
      querySelectorAll:()=>[],
    };return e;
  }
  document={head:element(),body:element(),hidden:false,activeElement:null,
    createElement(tag){const e=element(tag);created.push(e);return e},
    querySelector:()=>element(),dispatchEvent(){},addEventListener(name,fn){listeners[`doc:${name}`]=fn},
  };
  const window={showMenu:()=>shows.push('race-menu'),show:id=>shows.push(id),addEventListener:(name,fn,capture)=>{listeners[name]={fn,capture}}};
  const storage=new Map();
  const source=readFileSync(new URL('../public/flappy-king.js',import.meta.url),'utf8')
    .replaceAll('import.meta.url',JSON.stringify(new URL('../public/flappy-king.js',import.meta.url).href))
    .replace("await import(asset('flappy-king-model.mjs'))",'MODEL');
  await vm.runInNewContext(`(async()=>{${source}\n})()`,{MODEL,document,window,URL,console,
    Image:class{constructor(){images.push(this)}},CustomEvent:class{},
    localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)},
    requestAnimationFrame:fn=>{frames.set(++nextFrame,fn);return nextFrame},cancelAnimationFrame:id=>frames.delete(id),
  });
  const panel=created.find(e=>e.id==='flappy-king'),card=created.find(e=>e.id==='flappy-king-card');
  assert.ok(panel&&card);images.forEach(img=>img.onload());assert.ok(draws.length>=5);
  card.events.click();assert.deepEqual(shows,['race-menu','flappy-king']);
  function click(action){panel.events.click({target:{closest:()=>({dataset:{fk:action}})}})}
  click('continue');assert.equal(panel.querySelector('.fk-play').hidden,false);
  click('start');assert.equal(panel.querySelector('.fk-overlay').hidden,true);assert.equal(frames.size,1);
  assert.equal(listeners.keydown.capture,true);let stopped=false,prevented=false;
  listeners.keydown.fn({code:'Space',repeat:false,target:panel.querySelector('#fk-canvas'),stopImmediatePropagation(){stopped=true},preventDefault(){prevented=true}});
  assert.ok(stopped&&prevented);
  click('pause');assert.equal(frames.size,0);assert.equal(panel.querySelector('.fk-overlay').hidden,false);
  click('resume');assert.equal(frames.size,1);assert.equal(panel.querySelector('.fk-overlay').hidden,true);
  listeners.blur.fn();assert.equal(frames.size,0);
  click('restart');click('start');assert.equal(frames.size,1);
  click('home');assert.equal(frames.size,0);assert.equal(shows.at(-1),'home');
  assert.equal(storage.size,0,'No progress or racing save should be written before rescue');
  // Resume an advanced run, then let the king fall. Reset is immediate and saved.
  listeners.storage.fn({key:MODEL.SAVE_KEY,newValue:JSON.stringify({completed:[1,2,3]})});
  card.events.click();click('continue');click('start');
  assert.match(panel.querySelector('#fk-level-name').textContent,/04/);
  for(let time=16;time<4000&&frames.size;time+=16){
    const [id,fn]=frames.entries().next().value;frames.delete(id);fn(time);
  }
  assert.equal(frames.size,0);assert.match(panel.querySelector('#fk-level-name').textContent,/01/);
  assert.match(panel.querySelector('#fk-dialog-tag').textContent,/BACK TO LEVEL 1/);
  assert.deepEqual(JSON.parse(storage.get(MODEL.SAVE_KEY)),MODEL.normaliseProgress({highestLevel:4}));
  click('levels');assert.match(panel.querySelector('.fk-levels').innerHTML,/02 \/ LOCKED/);
  assert.match(panel.querySelector('#fk-highest').textContent,/HIGHEST LEVEL REACHED: 4 \/ 10/);
  assert.equal(storage.size,1,'Reset only changes the Flappy King save');
});
