import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as MODEL from '../public/badge-breaker-model.mjs';
const levels=JSON.parse(readFileSync(new URL('../public/ballistic-levels.json',import.meta.url),'utf8'));
test('UI loads all levels, opens slot 03, isolates input, pauses, resumes and saves separately',async()=>{
 const created=[],listeners={},frames=new Map(),shows=[],storage=new Map();let document,nextFrame=0;
 const ctx=new Proxy({}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 function element(tag='div'){
  const children=new Map(),events={},classes=new Set();
  const e={tag,events,dataset:{},hidden:false,disabled:false,width:576,height:720,
   classList:{add:n=>classes.add(n),remove:n=>classes.delete(n),contains:n=>classes.has(n)},
   addEventListener:(n,f)=>events[n]=f,appendChild(){},replaceWith(){},getContext:()=>ctx,focus(){document.activeElement=e},closest:()=>e,
   setPointerCapture(){},getBoundingClientRect:()=>({left:0,width:576}),scrollIntoView(){},
   querySelector(s){if(!children.has(s))children.set(s,element(s));return children.get(s)},querySelectorAll:()=>[],
  };return e;
 }
 document={head:element(),body:element(),hidden:false,activeElement:null,createElement(tag){const e=element(tag);created.push(e);return e},querySelector:()=>element(),addEventListener:(n,f)=>listeners['doc:'+n]=f};
 const window={showMenu:()=>shows.push('race-menu'),show:id=>shows.push(id),addEventListener:(n,fn,capture)=>listeners[n]={fn,capture}};
 const source=readFileSync(new URL('../public/badge-breaker.js',import.meta.url),'utf8').trimEnd()
  .replaceAll('import.meta.url',JSON.stringify(new URL('../public/badge-breaker.js',import.meta.url).href))
  .replace("await import(asset('badge-breaker-model.mjs'))",'MODEL').replace(/\nloadLevels\(\);$/,'\nawait loadLevels();');
 await vm.runInNewContext(`(async()=>{${source}\n})()`,{MODEL,document,window,URL,console,fetch:async()=>({ok:true,json:async()=>levels}),
  localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},requestAnimationFrame:f=>{frames.set(++nextFrame,f);return nextFrame},cancelAnimationFrame:id=>frames.delete(id)});
 const panel=created.find(e=>e.id==='badge-breaker'),card=created.find(e=>e.id==='badge-breaker-card');
 assert.ok(panel&&card);assert.match(panel.querySelector('.bb-levels').innerHTML,/Manchester United/);
 assert.match(panel.querySelector('.bb-levels').innerHTML,/data-level="2" disabled/);
 card.onclick();assert.deepEqual(shows,['race-menu','badge-breaker']);
 const click=bb=>panel.events.click({target:{closest:()=>({dataset:{bb}})}});
 click('page');assert.match(panel.querySelector('.bb-range').textContent,/11–20/);click('prev');click('start');
 assert.match(panel.querySelector('.bb-level-title').textContent,/Manchester United/);assert.equal(frames.size,1);
 let stopped=false,prevented=false;listeners.keydown.fn({code:'Space',repeat:false,stopImmediatePropagation(){stopped=true},preventDefault(){prevented=true}});
 assert.ok(stopped&&prevented);assert.equal(listeners.keydown.capture,true);
 click('pause');assert.equal(frames.size,0);assert.equal(panel.querySelector('.bb-overlay').hidden,false);
 click('resume');assert.equal(frames.size,1);listeners.blur.fn();assert.equal(frames.size,0);
 click('resume');click('home');assert.equal(frames.size,0);assert.equal(shows.at(-1),'home');
 assert.deepEqual([...storage.keys()],[MODEL.SAVE_KEY]);
});
