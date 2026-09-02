export function engineSettings(rpm,throttle){
 const revs=Math.max(700,Math.min(8000,Number(rpm)||900));
 return {frequency:revs/50,gain:throttle?.075:.035,cutoff:240+revs*(throttle?.14:.08)};
}
export const COUNTDOWN={ready:{frequency:660,duration:.13},amber:{frequency:660,duration:.13},go:{frequency:990,duration:.65}};

// Procedural audio: no downloads, external samples, or autoplay on page load.
export function createSoundEngine(Context){
 let ctx=null,master=null,engine=null,nitro=null,muted=false,noise=null;
 const effects=new Set();
 const usable=()=>ctx&&ctx.state==='running'&&!muted;
 function unlock(){
  if(!Context)return;
  try{
   if(!ctx){ctx=new Context();master=ctx.createGain();master.gain.value=muted?0:.65;const compressor=ctx.createDynamicsCompressor();master.connect(compressor);compressor.connect(ctx.destination);
    noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
   }
   if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  }catch{/* Unsupported or blocked audio must never prevent playing. */}
 }
 function track(source,nodes,end){effects.add(source);source.onended=()=>{effects.delete(source);for(const node of [source,...nodes])node.disconnect()};source.stop(end)}
 function tone(frequency,duration,type='sine',volume=.12,delay=0){
  if(!usable())return;const start=ctx.currentTime+delay,osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(frequency,start);
  gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.006);gain.gain.setValueAtTime(volume,start+duration*.6);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
  osc.connect(gain);gain.connect(master);osc.start(start);track(osc,[gain],start+duration+.02);
 }
 function hiss(duration,frequency,volume,delay=0){
  if(!usable())return;const start=ctx.currentTime+delay,source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=noise;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.7;
  gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.012);gain.gain.setValueAtTime(volume,start+duration*.6);gain.gain.linearRampToValueAtTime(0,start+duration);
  source.connect(filter);filter.connect(gain);gain.connect(master);source.start(start);track(source,[filter,gain],start+duration+.02);
 }
 function stopEngine(){if(!engine)return;const old=engine;engine=null;old.gain.gain.cancelScheduledValues(ctx.currentTime);old.gain.gain.setTargetAtTime(0,ctx.currentTime,.025);for(const osc of old.oscillators){osc.onended=()=>osc.disconnect();osc.stop(ctx.currentTime+.12)}old.oscillators[0].onended=()=>{old.oscillators[0].disconnect();old.gain.disconnect();old.filter.disconnect()}}
 function stopNitro(){
  if(!nitro)return;const old=nitro;nitro=null;
  old.gain.gain.cancelScheduledValues(ctx.currentTime);old.gain.gain.setTargetAtTime(0,ctx.currentTime,.015);
  old.source.stop(ctx.currentTime+.075);
 }
 function updateNitro(active){
  if(!active){stopNitro();return}if(nitro||!usable())return;
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
  source.buffer=noise;source.loop=true;filter.type='bandpass';filter.frequency.value=2200;filter.Q.value=.5;
  gain.gain.value=0;gain.gain.setTargetAtTime(.14,ctx.currentTime,.025);
  source.connect(filter);filter.connect(gain);gain.connect(master);
  source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect()};source.start();
  nitro={source,filter,gain};
 }
 function stop(){stopEngine();stopNitro();for(const source of effects){try{source.stop()}catch{}}effects.clear()}
 function setMuted(value){muted=!!value;if(master)master.gain.setTargetAtTime(muted?0:.65,ctx.currentTime,.02);if(muted)stop()}
 function update(rpm,throttle,nitroActive=false){
  if(!usable())return;
  updateNitro(nitroActive);
  if(!engine){const gain=ctx.createGain(),filter=ctx.createBiquadFilter(),a=ctx.createOscillator(),b=ctx.createOscillator();gain.gain.value=0;filter.type='lowpass';filter.Q.value=.6;a.type='sawtooth';b.type='triangle';b.detune.value=-8;a.connect(filter);b.connect(filter);filter.connect(gain);gain.connect(master);a.start();b.start();engine={gain,filter,oscillators:[a,b]}}
  const s=engineSettings(rpm,throttle),now=ctx.currentTime;
  engine.oscillators[0].frequency.setTargetAtTime(s.frequency,now,.045);engine.oscillators[1].frequency.setTargetAtTime(s.frequency*.5,now,.045);engine.filter.frequency.setTargetAtTime(s.cutoff,now,.06);engine.gain.gain.setTargetAtTime(s.gain,now,.06);
 }
 function play(name){
  if(!usable())return;
  if(COUNTDOWN[name]){const sound=COUNTDOWN[name];tone(sound.frequency,sound.duration,'sine',.22);return}
  if(name==='purchase'){hiss(.045,2500,.12);tone(1350,.1,'triangle',.15,.02);tone(2100,.5,'sine',.16,.11);tone(2800,.4,'sine',.065,.14)}
  if(name==='wheels'){hiss(.43,700,.065);for(let i=0;i<7;i++){hiss(.038,1300,.22,i*.058);tone(110+i*4,.035,'square',.045,i*.058)}}
  if(name==='spray'){hiss(.055,1600,.12);hiss(.55,4800,.2,.055)}
 }
 return {unlock,update,play,stop,setMuted};
}

export function installGameAudio(){
 const Context=window.AudioContext||window.webkitAudioContext,sound=createSoundEngine(Context),storageKey='jd-sound-muted';
 let muted=false,active=false,blurred=false,lastSelection=-Infinity;
 try{muted=localStorage.getItem(storageKey)==='true'}catch{}
 sound.setMuted(muted);
 const controls=[];
 for(const host of [document.querySelector('#menu .menu'),document.querySelector('#race .bar')]){
  const button=document.createElement('button');button.type='button';button.className='sound-toggle';host.append(button);controls.push(button);
  button.onclick=()=>{muted=!muted;sound.setMuted(muted);if(!muted)sound.unlock();try{localStorage.setItem(storageKey,String(muted))}catch{}render()};
 }
 function render(){for(const b of controls){b.textContent=Context?(muted?'SOUND: OFF':'SOUND: ON'):'SOUND UNAVAILABLE';b.disabled=!Context;b.setAttribute('aria-label',muted?'Enable game sounds':'Mute game sounds');b.setAttribute('aria-pressed',String(!muted))}}
 render();
 const style=document.createElement('style');style.textContent='.bar .sound-toggle{font-size:10px;white-space:nowrap;padding:6px 8px}';document.head.append(style);
 const unlock=()=>{if(!muted&&!document.hidden)sound.unlock()};
 document.addEventListener('pointerdown',unlock,true);document.addEventListener('keydown',unlock,true);
 document.addEventListener('jd:race-start',()=>{active=true;sound.stop();sound.play('ready')});
 document.addEventListener('jd:countdown',e=>{if(active&&!document.hidden&&!blurred)sound.play(e.detail)});
 document.addEventListener('jd:engine',e=>{if(active&&!document.hidden&&!blurred)sound.update(e.detail.rpm,e.detail.throttle,e.detail.nitro)});
 const stop=()=>{active=false;sound.stop()};
 document.addEventListener('jd:race-finished',stop);document.addEventListener('jd:race-audio-stop',stop);
 window.addEventListener('blur',()=>{blurred=true;sound.stop()});window.addEventListener('focus',()=>{blurred=false});document.addEventListener('visibilitychange',()=>{if(document.hidden)sound.stop()});
 document.addEventListener('jd:purchase',()=>{if(!document.hidden&&!blurred)sound.play('purchase')});
 document.addEventListener('jd:shop-selection',e=>{if(document.hidden||blurred)return;const now=performance.now();if(now-lastSelection<120)return;lastSelection=now;sound.play(e.detail==='wheels'?'wheels':'spray')});
 return sound;
}
