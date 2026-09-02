import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {COUNTDOWN,engineSettings,createSoundEngine} from '../public/game-audio.mjs';
function fixture(){
 const nodes=[],contexts=[];
 const param=()=>({value:0,calls:[],setValueAtTime(...v){this.calls.push(['set',...v])},linearRampToValueAtTime(...v){this.calls.push(['linear',...v])},exponentialRampToValueAtTime(...v){this.calls.push(['exp',...v])},setTargetAtTime(...v){this.calls.push(['target',...v])},cancelScheduledValues(){}});
 const node=kind=>{const n={kind,frequency:param(),gain:param(),Q:param(),detune:param(),starts:[],stops:[],connect(){},disconnect(){},start(t){this.starts.push(t)},stop(t){this.stops.push(t)}};nodes.push(n);return n};
 class Context{constructor(){this.state='suspended';this.currentTime=10;this.sampleRate=1000;this.destination={};contexts.push(this)}resume(){this.state='running';return Promise.resolve()}createGain(){return node('gain')}createDynamicsCompressor(){return node('compressor')}createBuffer(){return {getChannelData:()=>new Float32Array(1000)}}createOscillator(){return node('oscillator')}createBufferSource(){return node('noise')}createBiquadFilter(){return node('filter')}}
 return {sound:createSoundEngine(Context),nodes,contexts};
}
test('audio is silent until unlocked by a user gesture, and unsupported browsers are safe',()=>{const f=fixture();f.sound.play('go');f.sound.update(6000,true);assert.equal(f.contexts.length,0);f.sound.unlock();assert.equal(f.contexts.length,1);f.sound.unlock();assert.equal(f.contexts.length,1);const unavailable=createSoundEngine();unavailable.unlock();unavailable.update(7000,true);unavailable.play('purchase');unavailable.stop()});
test('countdown has two short matching beeps and a longer higher start tone',()=>{assert.deepEqual(COUNTDOWN.ready,COUNTDOWN.amber);assert.ok(COUNTDOWN.go.duration>COUNTDOWN.ready.duration*4);assert.ok(COUNTDOWN.go.frequency>COUNTDOWN.ready.frequency);const f=fixture();f.sound.unlock();for(const phase of ['ready','amber','go'])f.sound.play(phase);const tones=f.nodes.filter(n=>n.kind==='oscillator');assert.equal(tones.length,3);assert.ok(tones[2].stops[0]-tones[2].starts[0]>.6)});
test('engine pitch tracks RPM, drops after shifts and reuses nodes frame to frame',()=>{const f=fixture();f.sound.unlock();f.sound.update(900,false);const count=f.nodes.length;f.sound.update(6500,true);f.sound.update(4000,true);assert.equal(f.nodes.length,count);const osc=f.nodes.find(n=>n.kind==='oscillator'),frequencies=osc.frequency.calls.map(c=>c[1]);assert.ok(frequencies[1]>frequencies[0]);assert.ok(frequencies[2]<frequencies[1]);assert.equal(engineSettings(6000,true).frequency,120);assert.ok(Number.isFinite(engineSettings(NaN,false).frequency))});
test('shop effects are distinct and scheduled sources always stop',()=>{for(const kind of ['purchase','wheels','spray']){const f=fixture();f.sound.unlock();f.sound.play(kind);const sources=f.nodes.filter(n=>['oscillator','noise'].includes(n.kind));assert.ok(sources.length>=2);assert.ok(sources.every(n=>n.stops.length===1));if(kind==='wheels')assert.ok(sources.length>10);if(kind==='spray')assert.ok(sources.every(n=>n.kind==='noise'))}});
test('mute stops engine and effects, prevents new sounds, and unmute restores audio',()=>{const f=fixture();f.sound.unlock();f.sound.update(5000,true);f.sound.play('spray');const osc=f.nodes.filter(n=>n.kind==='oscillator');f.sound.setMuted(true);assert.ok(osc.every(n=>n.stops.length));const count=f.nodes.length;f.sound.play('purchase');f.sound.update(7000,true);assert.equal(f.nodes.length,count);f.sound.setMuted(false);f.sound.update(2000,false);assert.ok(f.nodes.length>count);f.sound.stop();f.sound.stop()});
test('engine has lower pitch and fewer harsh high harmonics',()=>{
 for(const rpm of [900,3000,6000,7000]){const s=engineSettings(rpm,true);assert.equal(s.frequency,rpm/50);assert.ok(s.cutoff<350+rpm*.32)}
});
test('nitro hisses only while boost is active and reuses one looping source',()=>{
 const f=fixture();f.sound.unlock();f.sound.update(3000,true,false);
 assert.equal(f.nodes.filter(n=>n.kind==='noise').length,0);
 f.sound.update(3000,true,true);const hiss=f.nodes.find(n=>n.kind==='noise');assert.equal(hiss.loop,true);assert.equal(hiss.starts.length,1);
 for(let i=0;i<20;i++)f.sound.update(4000,true,true);
 assert.equal(f.nodes.filter(n=>n.kind==='noise').length,1);assert.equal(hiss.stops.length,0);
 f.sound.update(4000,true,false);assert.equal(hiss.stops.length,1);
 f.sound.update(4000,true,true);const sources=f.nodes.filter(n=>n.kind==='noise');assert.equal(sources.length,2);
 f.sound.setMuted(true);assert.equal(sources[1].stops.length,1);
 f.sound.update(4000,true,true);assert.equal(f.nodes.filter(n=>n.kind==='noise').length,2);
 f.sound.stop();assert.equal(sources[1].stops.length,1);
});
test('leaving a race stops the nitro source as well as the engine',()=>{
 const f=fixture();f.sound.unlock();f.sound.update(6000,true,true);f.sound.stop();assert.ok(f.nodes.filter(n=>n.kind==='noise'||n.kind==='oscillator').every(n=>n.stops.length===1));
});
test('sound hooks cover actual race transitions and only successful paid purchases',()=>{
 const read=p=>readFileSync(new URL('../public/'+p,import.meta.url),'utf8');
 const physics=read('physics-v2.js');for(const hook of ['jd:countdown','jd:engine','jd:race-audio-stop'])assert.ok(physics.includes(hook));
 assert.ok(physics.includes('state.nitroBoosting=boost.multiplier>1'));assert.ok(physics.includes('nitro:!!state.nitroBoosting'));
 assert.ok(read('dealership.js').includes("if(succeeded&&task.type==='buy')document.dispatchEvent(new CustomEvent('jd:purchase'))"));
 const shop=read('tune-shop.js');assert.ok(shop.includes("if(ok){selection=null;if(PARTS[task.cat]"));assert.ok(shop.includes("jd:shop-selection"));
});
