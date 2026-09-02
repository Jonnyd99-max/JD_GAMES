/* JD Games V0.1 drivetrain and tachometer correction. */
(()=>{
  const style=document.createElement('style');
  style.textContent=`.dial{height:150px!important;width:150px!important;border:0!important;position:relative;background:conic-gradient(from 225deg,#39424d 0 96deg,#2787d8 96deg 130deg,#39424d 130deg 192deg,#e0a318 192deg 209deg,#25d56f 209deg 226deg,#e54125 226deg 236deg,#67140d 236deg 270deg,transparent 270deg)!important;box-shadow:inset 0 0 0 11px #0c1117,0 0 22px #000}.dial:after{content:'';position:absolute;inset:15px;border:1px solid #596573;border-radius:50%;background:#090d12}.needle{position:absolute;z-index:3;width:4px;height:55px;background:#fff;left:calc(50% - 2px);bottom:50%;transform-origin:50% 100%;box-shadow:0 0 7px #fff}.dialread{position:absolute;z-index:4;inset:0;display:grid;place-content:center;text-align:center;padding-top:43px}.dialread b{font-size:18px!important}.ticks{position:absolute;z-index:4;inset:0}.ticks span{position:absolute;font-size:9px;font-weight:bold}.ticks span:nth-child(1){left:18%;bottom:20%}.ticks span:nth-child(2){left:5%;bottom:43%}.ticks span:nth-child(3){left:13%;top:21%}.ticks span:nth-child(4){left:37%;top:7%}.ticks span:nth-child(5){right:34%;top:7%}.ticks span:nth-child(6){right:12%;top:22%}.ticks span:nth-child(7){right:5%;bottom:42%;color:#65ef9b}.ticks span:nth-child(8){right:18%;bottom:19%;color:#ff7860}.ticks span:nth-child(9){left:48%;bottom:5%;color:#ff7860}.debug{position:absolute;right:10px;top:58px;z-index:20;background:#05080bea;border:1px solid #43505e;color:#8ef0b0;padding:10px;font:11px monospace;white-space:pre;display:none}.debug.on{display:block}.message-pop{animation:pop .35s ease}@keyframes pop{50%{transform:translateX(-50%) scale(1.18);text-shadow:0 0 18px #36ed83}}`;
  document.head.appendChild(style);
  const dial=document.querySelector('.dial');
  dial.innerHTML='<div class="ticks"><span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span></div><i id="needle" class="needle"></i><div class="dialread"><b id="rpm">900</b><small>RPM</small></div>';
  const dbg=document.createElement('div');dbg.id='debug';dbg.className='debug';document.getElementById('race').appendChild(dbg);
  const maxMph=[0,32,52,73,95,120],ratios=[0,3.2,2.1,1.5,1.15,.92],finalDrive=4.1,redline=7000;
  const vehicleTune={acceleration:1,topSpeed:120,nitroSeconds:0};
  let opponentProfile=null,advanceRaceStep=null;
  document.addEventListener('jd:opponent',e=>{opponentProfile=e.detail.profile;advanceRaceStep=e.detail.advance});
  document.addEventListener('jd:vehicle',e=>{
    const acceleration=Number(e.detail?.acceleration),topSpeed=Number(e.detail?.topSpeed);
    if(!Number.isFinite(acceleration)||!Number.isFinite(topSpeed))return;
    vehicleTune.acceleration=Math.max(1,Math.min(6,acceleration));
    vehicleTune.topSpeed=Math.max(120,Math.min(350,topSpeed));
    vehicleTune.nitroSeconds=[2,4].includes(e.detail?.nitroSeconds)?e.detail.nitroSeconds:0;
    [0,32,52,73,95,120].forEach((mph,i)=>maxMph[i]=mph*vehicleTune.topSpeed/120);
  });
  let shiftUntil=0,limiterHits=0,debugOn=false,launchRpm=900,displayRpm=900;
  const torqueCurve=r=>{const pts=[[900,.22],[2000,.48],[3000,.72],[4000,.9],[5000,1],[6000,1.08],[6500,.94],[6900,.55],[7000,.05]];for(let i=1;i<pts.length;i++)if(r<=pts[i][0]){const a=pts[i-1],b=pts[i],t=(r-a[0])/(b[0]-a[0]);return a[1]+(b[1]-a[1])*t}return 0};
  const coupledRpm=(mph,g)=>g?Math.max(900,mph/maxMph[g]*redline):900;
  const feedback=text=>{msg.textContent=text;msg.classList.remove('message-pop');void msg.offsetWidth;msg.classList.add('message-pop')};
  startRace=()=>{show('race');state={phase:'READY',gear:0,rpm:900,speed:0,dist:0,cpu:0,time:0,gas:false,last:0,launch:'',perfect:0,torque:0,accel:0,wheelRpm:0,calcRpm:900};const raceState=state;displayRpm=launchRpm=900;limiterHits=0;shiftUntil=0;gear.textContent='N';feedback('REV IN N • SHIFT TO 1 ON GREEN');amber.className='';green.className='';setTimeout(()=>{if(state!==raceState||state.phase==='CANCELLED')return;state.phase='AMBER';amber.className='on';document.dispatchEvent(new CustomEvent('jd:countdown',{detail:'amber'}))},1200+Math.random()*700);setTimeout(()=>{if(state!==raceState||state.phase==='CANCELLED')return;state.phase='GO';amber.className='';green.className='green';feedback('GO! • ENGAGE 1ST');document.dispatchEvent(new CustomEvent('jd:countdown',{detail:'go'}))},3200);raf=requestAnimationFrame(loop)};
  shift=n=>{if(n<0||n>5||n===state.gear)return;const before=state.rpm,from=state.gear;if(from===0&&n===1&&state.speed<2){if(state.phase==='GO'){const staged=Math.max(launchRpm,state.peakLaunchRpm||900);const rating=staged>=3000&&staged<=4000?'PERFECT':staged>4800?'WHEELSPIN':staged>=2200?'GOOD':'SLOW';state.launch=rating;state.speed=rating==='PERFECT'?12:rating==='GOOD'?8:rating==='WHEELSPIN'?5:3;feedback(rating+' LAUNCH!');shiftUntil=performance.now()+(rating==='PERFECT'?.04:.10)*1000}else{launchRpm=900;state.peakLaunchRpm=900;feedback('TOO EARLY • REVS DROPPED')}}else if(state.phase==='GO'&&n>from){let q,delay;if(before>=6200&&before<=6700){q='PERFECT SHIFT!';delay=.10;state.perfect++}else if(before>=5700){q=before>7000||limiterHits>3?'LIMITER SHIFT':before>6700?'LATE SHIFT':'GOOD SHIFT';delay=q==='GOOD SHIFT'?.16:.25}else{q='EARLY SHIFT';delay=.22}if(state.gas)delay+=.07;shiftUntil=performance.now()+delay*1000;feedback(q)}state.gear=n;state.rpm=from===0&&n===1&&state.phase==='GO'?Math.max(2200,coupledRpm(state.speed,n)):coupledRpm(state.speed,n);displayRpm=state.rpm;gear.textContent=n||'N'};
  loop=t=>{const dt=Math.min(.035,(t-(state.last||t))/1000);state.last=t;const previousDistance=state.dist;const throttle=state.gas||keys.has('KeyW')||keys.has('ArrowUp')||keys.has('Space');if(state.phase!=='GO'){launchRpm=Math.max(900,Math.min(7000,launchRpm+((throttle?7000:900)-launchRpm)*dt*2.1));state.rpm=launchRpm}else if(state.gear){if(!state.launch){state.launch=launchRpm>=3000&&launchRpm<=4000?'PERFECT':launchRpm>4800?'WHEELSPIN':launchRpm>2200?'GOOD':'SLOW';feedback(state.launch+' LAUNCH')}state.calcRpm=coupledRpm(state.speed,state.gear);const clutch=Math.max(0,1-state.time/.65);state.rpm=Math.max(state.calcRpm,launchRpm*clutch);state.wheelRpm=state.speed/maxMph[state.gear]*(redline/(ratios[state.gear]*finalDrive));state.torque=torqueCurve(state.rpm)*(throttle?1:0);const atLimiter=state.rpm>=6900;if(atLimiter){limiterHits++;state.rpm=6900+(Math.floor(t/75)%2)*110;state.torque=.015}else limiterHits=Math.max(0,limiterHits-dt*2);const shifting=t<shiftUntil;const traction=state.launch==='WHEELSPIN'&&state.time<1?.55:1;state.accel=shifting?0:state.torque*(15.8*vehicleTune.acceleration/state.gear)*traction;state.speed=Math.max(0,state.speed+(state.accel-(throttle?0.35:3.2))*dt);const softMax=maxMph[state.gear]*1.015;if(state.speed>softMax)state.speed=softMax+(state.speed-softMax)*.2;state.dist+=state.speed*.44704*dt;}else{state.rpm=Math.max(900,state.rpm-(state.rpm-900)*dt*3)}if(state.phase==='GO'){let outcome=null;if(advanceRaceStep){const cpuWasFinished=state.cpuFinishTime!==undefined;outcome=advanceRaceStep(state,dt,previousDistance,opponentProfile);if(!cpuWasFinished&&state.cpuFinishTime!==undefined&&outcome===null)feedback('CPU FINISHED • KEEP GOING!')}else{state.cpu+=Math.min(98,state.time*9+12)*.44704*dt;state.time+=dt;if(state.dist>=402.336)outcome=state.dist>=state.cpu}if(outcome!==null){state.raceWin=outcome;return finish()}}displayRpm+=(state.rpm-displayRpm)*Math.min(1,dt*14);document.dispatchEvent(new CustomEvent('jd:engine',{detail:{rpm:state.rpm,throttle,nitro:!!state.nitroBoosting}}));rpm.textContent=Math.round(displayRpm);needle.style.transform=`rotate(${-135+Math.min(8000,displayRpm)/8000*270}deg)`;speed.textContent=Math.round(state.speed);time.textContent=state.time.toFixed(2)+' S';pp.style.width=Math.min(100,state.dist/4.023)+'%';cp.style.width=Math.min(100,state.cpu/4.023)+'%';cpuCar.style.transform=`translateX(${state.cpu/30}vw)`;dbg.textContent=`D: DEBUG\nRPM ${Math.round(state.rpm)}\nSpeed ${state.speed.toFixed(2)} mph\nGear ${state.gear||'N'}\nRatio ${ratios[state.gear]||0}\nFinal drive ${finalDrive}\nWheel RPM ${Math.round(state.wheelRpm||0)}\nCalculated RPM ${Math.round(state.calcRpm||900)}\nThrottle ${throttle?100:0}%\nTorque ${(state.torque||0).toFixed(3)}\nAcceleration ${(state.accel||0).toFixed(2)} mph/s`;raf=requestAnimationFrame(loop)};
  const drivetrainLoop=loop;
  loop=t=>{const beforeSpeed=state.speed,baseAcceleration=vehicleTune.acceleration,dt=Math.min(.035,(t-(state.last||t))/1000);const active=state.phase==='GO'&&state.gear>0&&t>=shiftUntil&&(state.gas||keys.has('Space')||keys.has('KeyW')||keys.has('ArrowUp'))&&(nitroHeld||keys.has('KeyN'));const boost=nitroTick(state.nitroRemaining||0,dt,active);state.nitroRemaining=boost.remaining;state.nitroBoosting=boost.multiplier>1;vehicleTune.acceleration*=boost.multiplier;try{drivetrainLoop(t)}finally{vehicleTune.acceleration=baseAcceleration}renderNitro(boost.multiplier>1);if(state.gear===0)state.peakLaunchRpm=Math.max(state.peakLaunchRpm||900,launchRpm);if(state.phase!=='GO'&&state.gear!==0){launchRpm=900;state.rpm=900;displayRpm=900;rpm.textContent='900'}if(state.phase==='GO'&&state.speed>beforeSpeed){state.speed+=Math.min(0.35,(state.speed-beforeSpeed)*0.46)}};
  const hints=document.createElement('div');hints.className='key-hints';hints.innerHTML='<span><kbd>←</kbd><kbd>→</kbd><b>CHANGE GEARS</b></span><span><kbd>SPACE</kbd><b>HOLD THROTTLE</b></span>';
  const touch=document.querySelector('.touch');touch.insertBefore(hints,pedal);
  let nitroHeld=false,nitroTick=(remaining)=>({remaining,multiplier:1});
  document.addEventListener('jd:nitro-model',e=>{nitroTick=e.detail.tick});
  const nitroButton=document.createElement('button');nitroButton.className='nitro-control';nitroButton.type='button';nitroButton.setAttribute('aria-label','Hold to use nitro');touch.querySelector('.shift').after(nitroButton);
  const renderNitro=active=>{const remaining=state.nitroRemaining||0;nitroButton.innerHTML=`<span class="nitro-bottles">${Array.from({length:vehicleTune.nitroSeconds/2},(_,i)=>`<i style="--fill:${Math.min(1,Math.max(0,(remaining-i*2)/2))*100}%"></i>`).join('')||'<i style="--fill:0%"></i>'}</span><b>${vehicleTune.nitroSeconds?remaining.toFixed(1)+'s':'NO NITRO'}</b><small>HOLD N</small>`;nitroButton.disabled=!remaining||state.phase!=='GO';nitroButton.classList.toggle('boosting',active)};
  nitroButton.onpointerdown=e=>{e.preventDefault();nitroButton.setPointerCapture(e.pointerId);nitroHeld=true};nitroButton.onpointerup=nitroButton.onpointercancel=()=>{nitroHeld=false};
  addEventListener('keydown',e=>{if(e.code==='KeyN'&&!document.getElementById('race').classList.contains('hide')){e.preventDefault();keys.add('KeyN')}});addEventListener('keyup',e=>{if(e.code==='KeyN')keys.delete('KeyN')});addEventListener('blur',()=>{nitroHeld=false;keys.delete('KeyN')});
  document.addEventListener('jd:race-start',()=>{nitroHeld=false;keys.delete('KeyN');state.nitroRemaining=vehicleTune.nitroSeconds;renderNitro(false)});
  // Garage listeners refresh the selected car after the race-start event begins.
  document.addEventListener('jd:vehicle',()=>{if(state.phase==='READY')state.nitroRemaining=vehicleTune.nitroSeconds;renderNitro(false)});
  style.textContent+=`.nitro-control{align-self:center;width:78px;margin-left:14px;border:2px solid #7394a5;background:#142631;color:#e3f8ff;border-radius:8px;padding:9px 5px;touch-action:none}.nitro-control:disabled{opacity:.5}.nitro-control b,.nitro-control small{display:block;font:11px monospace;margin-top:5px}.nitro-control small{font-size:9px}.nitro-bottles{display:flex;justify-content:center;gap:6px}.nitro-bottles i{position:relative;width:19px;height:43px;border:2px solid #c1dde8;border-radius:6px;background:linear-gradient(to top,#38bfe4 var(--fill),#173442 var(--fill));box-shadow:inset -4px 0 #0003}.nitro-bottles i:before{content:'';position:absolute;left:4px;top:-6px;width:7px;height:5px;background:#a8c9d9}.nitro-control.boosting{box-shadow:0 0 23px #42d5ff;border-color:#73eaff}@media(max-width:720px){.nitro-control{width:55px;margin-left:5px;padding:7px 2px}.nitro-bottles i{width:14px;height:31px}.touch .key-hints{display:none!important}}`;
  style.textContent+=`.key-hints{margin-left:auto;margin-right:14px;align-self:center;display:grid;gap:8px}.key-hints span{display:flex;align-items:center;justify-content:flex-end;gap:5px}.key-hints kbd{min-width:34px;padding:7px 9px;text-align:center;background:#18212b;border:1px solid #596675;border-bottom-width:3px;border-radius:6px;font-weight:900}.key-hints b{width:78px;color:#a8b2bf;font-size:9px;letter-spacing:1px}.pedal.throttling{filter:brightness(.78);transform:translateY(4px);box-shadow:0 0 24px #ff531777}@media(max-width:720px){.key-hints{display:none}}`;
  style.textContent+='@media(max-width:720px){.key-hints{display:grid!important;margin-right:4px;transform:scale(.72);transform-origin:right center}.key-hints b{width:62px}.key-hints kbd{min-width:28px;padding:5px}}';
  const setThrottle=active=>{state.gas=active;pedal.classList.toggle('throttling',active)};
  pedal.onpointerdown=e=>{e.preventDefault();pedal.setPointerCapture(e.pointerId);setThrottle(true)};
  pedal.onpointerup=pedal.onpointercancel=e=>{e.preventDefault();setThrottle(false)};
  addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();keys.add('Space');setThrottle(true)}if(e.code==='KeyD'){debugOn=!debugOn;dbg.classList.toggle('on',debugOn)}});
  addEventListener('keyup',e=>{if(e.code==='Space'){e.preventDefault();keys.delete('Space');setThrottle(false)}});
  addEventListener('blur',()=>setThrottle(false));

  /* V0.2 visual direction: industrial street scene and analogue metal cockpit. */
  style.textContent+=`
  :root{--race-red:#d82e26}
  #race{background:#11151a}.bar{position:relative;z-index:20;height:46px;background:linear-gradient(#222831,#0d1116);border-bottom:1px solid #596169;box-shadow:0 3px 12px #0008}.bar:after{content:'JD // STREET SERIES';position:absolute;left:50%;bottom:4px;transform:translateX(-50%);font-size:8px;letter-spacing:3px;color:#78828d}
  .track{height:49vh;background:linear-gradient(#96a3ac 0 7%,#d8dde0 7% 9%,#bdc4c8 9% 33%,#eff1f1 33% 37%,#9ca3a7 37% 42%,#292d31 42% 100%);border-bottom:4px solid #06080a}.track:before{content:'';position:absolute;inset:0 0 58%;background:linear-gradient(90deg,transparent 0 3%,#25282b 3% 8%,transparent 8% 11%,#151719 11% 15%,transparent 15% 19%,#313438 19% 27%,transparent 27% 31%,#17191b 31% 38%,transparent 38% 45%,#2d3033 45% 54%,transparent 54% 61%,#17191b 61% 68%,transparent 68% 73%,#2b2e32 73% 82%,transparent 82% 88%,#151719 88% 94%,transparent 94%),linear-gradient(#090b0d,#33373a);clip-path:polygon(0 100%,0 44%,5% 12%,9% 12%,9% 0,13% 0,13% 52%,18% 52%,18% 0,23% 0,23% 34%,27% 63%,27% 0,36% 0,36% 100%,42% 100%,42% 0,53% 0,53% 100%,59% 100%,59% 23%,64% 23%,64% 0,71% 0,71% 56%,76% 56%,76% 0,85% 0,85% 100%,91% 100%,91% 45%,96% 15%,100% 15%,100% 100%);opacity:.96}.track:after{content:'';position:absolute;left:0;right:0;top:37%;height:16%;background:repeating-linear-gradient(135deg,transparent 0 15px,#53595d 16px 18px,transparent 19px 34px),linear-gradient(#ebeeee,#aeb5b9);border-top:3px solid #fafafa;border-bottom:3px solid #6e7478;box-shadow:0 5px #f3f4f4,0 7px #6a7074}.road{bottom:7%;height:4px;z-index:1;filter:drop-shadow(0 1px #333)}
  .car{z-index:4;filter:drop-shadow(0 10px 5px #0008)}.cpu{z-index:3;filter:saturate(.65) drop-shadow(0 8px 4px #0007)}.tree{left:auto;right:4%;top:8%;border:3px solid #555;border-radius:18px;background:linear-gradient(90deg,#131619,#3c4247 45%,#101214);box-shadow:0 8px 18px #0009}.tree i{box-shadow:inset 0 0 10px #000,0 0 0 2px #111}.tree .on{box-shadow:0 0 16px #ffb000}.tree .green{box-shadow:0 0 18px #20dd70}.msg{top:10%;padding:8px 22px;background:#080a0cbd;border:1px solid #757d83;border-radius:3px;font-size:clamp(18px,2.3vw,30px);letter-spacing:1px}
  .hud{position:relative;height:25vh;grid-template-columns:170px 125px 90px 1fr;padding:12px 4vw;background:linear-gradient(145deg,#d8dcde,#7e858a 36%,#cdd1d3 58%,#646b70);color:#161a1e;border-top:3px solid #eff1f2;border-bottom:3px solid #42494e;box-shadow:inset 0 7px 18px #fff5,inset 0 -8px 20px #0005}.hud:before{content:'';position:absolute;inset:8px 2.8vw;border:1px solid #555c61;border-radius:18px;box-shadow:inset 0 0 0 2px #dfe3e5;pointer-events:none}.hud>div{position:relative;z-index:1}.hud small{color:#30363b;font-weight:900;letter-spacing:1px}.dial{outline:7px solid #eef1f2!important;border-radius:50%;box-shadow:0 0 0 11px var(--race-red),0 0 0 14px #5d1512,inset 0 0 0 11px #111,4px 8px 18px #202428aa!important}.dial:after{background:radial-gradient(circle at 42% 35%,#fff 0 55%,#d7dcdf 73%,#91989d)!important;border-color:#777!important}.dialread b,.dialread small,.ticks span{color:#111!important;text-shadow:none}.needle{background:#c92020!important;box-shadow:0 0 0 1px #fff,0 0 5px #c00!important}.needle:after{content:'';position:absolute;width:14px;height:14px;border-radius:50%;background:#272b2e;bottom:-7px;left:-5px;border:2px solid #aab0b4}
  #speed{display:grid;place-content:center;width:104px;height:104px;border-radius:50%;background:radial-gradient(circle,#fff 0 57%,#d6dbde 58% 70%,#be201b 71% 78%,#f1f3f4 79% 87%,#555 88%);box-shadow:3px 7px 13px #2228;font-size:34px}.hud>div:nth-child(2) small{display:block;text-align:center;margin-top:-25px;position:relative}#gear{display:grid;place-content:center;width:68px;height:68px;background:#090b0d;color:#fff;border:5px solid #d5d9db;border-radius:10px;box-shadow:0 0 0 2px #545b60,inset 0 0 14px #000;font-family:monospace}.hud>div:nth-child(3) small{display:block;text-align:center;margin-top:5px}.progress{padding:16px 22px;background:#5f666b;border:1px solid #383e42;border-radius:8px;box-shadow:inset 0 0 0 2px #aeb4b8}.progress i{height:13px;border:2px solid #212529;background:#090b0d;border-radius:8px;overflow:hidden}.progress em{background:linear-gradient(90deg,#219743,#8aff9a);box-shadow:0 0 8px #67ff7d}.progress small{color:#eef1f2;text-shadow:0 1px #111}
  .touch{bottom:1.8vh;z-index:15}.shift{height:112px}.shift button{background:linear-gradient(#3b4248,#15191d);border:1px solid #777f85;box-shadow:inset 0 1px #ffffff55,0 3px 5px #0007}.shift button:active{background:var(--race-red)}.pedal{height:120px;background:linear-gradient(100deg,#383d41 0 22%,#111 23% 28%,#555b60 29% 46%,#111 47% 53%,#555b60 54% 72%,#111 73% 78%,#33383c 79%);border:5px solid #d6dadc;outline:3px solid #474e53;color:white;text-shadow:0 2px #000;box-shadow:6px 8px 12px #0008,inset 0 0 18px #000}@media(max-width:750px){.hud{grid-template-columns:112px 84px 58px 1fr}.dial{transform:scale(.72)}#speed{width:72px;height:72px;font-size:27px}.hud>div:nth-child(2) small{margin-top:-20px}.progress{padding:9px}.msg{top:7%}}
  `;

  // The garage module renders the selected pixel sprite; no interim legacy car.
  style.textContent+=`@media(max-height:520px) and (orientation:landscape){.bar{height:40px;font-size:11px}.bar:after{display:none}.track{height:40vh}.car{width:32vw}.cpu{width:27vw}.hud{height:25vh;padding:3px 4vw;grid-template-columns:95px 75px 55px 1fr;gap:12px}.dial{transform:scale(.55);transform-origin:left center}.hud>div:nth-child(2) small{font-size:9px}.progress{padding:7px 12px}.progress i{height:9px;margin:3px}.progress small{font-size:9px}.touch{bottom:8px}.shift{height:88px;width:154px}.pedal{height:91px;width:110px;font-size:12px}.key-hints{transform:scale(.8);transform-origin:right center}.msg{top:48px;font-size:14px;white-space:nowrap;padding:6px 12px}.tree{transform:scale(.65);transform-origin:top right}.hud b{font-size:30px}}`;
  style.textContent+=`.bar button{background:#222930;border:1px solid #707980;border-radius:4px;padding:6px 12px;color:#f3f5f6;font-weight:700}.cpu{opacity:1}.hud>div:nth-child(2){width:104px}.hud>div:nth-child(3){width:68px}@media(max-width:750px){.hud>div:nth-child(2){width:72px}.hud>div:nth-child(3){width:58px}#gear{width:58px}}`;
  // Anchor each car to its lane surface, independent of viewport width.
  style.textContent+=`.track{background:linear-gradient(#aebac2 0 25%,#929a9f 25% 34%,#353b40 34% 66%,#292e33 66% 100%)}.track:before{inset:0 0 75%}.track:after{top:25%;height:7%}.track .car{top:auto;bottom:3%;height:32%;width:auto;aspect-ratio:25/9;left:7%;filter:drop-shadow(0 4px 3px #0007)}.track .cpu{bottom:36%;height:28%;left:10%}.car svg{display:block;width:100%;height:100%}.road{bottom:33%;height:3px;opacity:.65}`;
  // Keep dealership assets on the same base path and deployment version as this game.
  const dealershipScript=document.createElement('script');
  const dealershipUrl=new URL('./dealership.js',document.currentScript.src);
  dealershipUrl.search=new URL(document.currentScript.src).search;
  dealershipScript.type='module';dealershipScript.src=dealershipUrl.href;
  document.head.appendChild(dealershipScript);
  // Separate game module: no garage or drivetrain state is shared.
  const flappyScript=document.createElement('script');
  const flappyUrl=new URL('flappy-king.js',document.currentScript.src);
  flappyUrl.search=new URL(document.currentScript.src).search;
  flappyScript.type='module';flappyScript.src=flappyUrl.href;
  document.head.appendChild(flappyScript);
  const badgeScript=document.createElement('script');
  const badgeUrl=new URL('badge-breaker.js',document.currentScript.src);
  badgeUrl.search=new URL(document.currentScript.src).search;
  badgeScript.type='module';badgeScript.src=badgeUrl.href;
  document.head.appendChild(badgeScript);

  // The scenery uses the same travelled metres as the race simulation.
  const track=document.querySelector('.track');
  const road=document.querySelector('.road');
  const finishLine=document.createElement('div');
  finishLine.className='finish-line';
  finishLine.innerHTML='<span>FINISH</span>';
  track.appendChild(finishLine);
  // Four times the visual travel, with one shared scale for all road objects.
  const finishDistance=402.336,metresToPixels=28;
  style.textContent+=`.road{animation:none!important;transform:none!important;left:0;width:100%;background-position-x:var(--road-offset,0px)}.finish-line{position:absolute;top:34%;bottom:0;width:24px;z-index:2;pointer-events:none;background:conic-gradient(#f4f4ee 25%,#151a1e 0 50%,#f4f4ee 0 75%,#151a1e 0) 0 0/24px 24px;border-left:2px solid #fff;border-right:2px solid #fff;box-shadow:0 0 8px #0006}.finish-line span{position:absolute;bottom:100%;left:50%;transform:translateX(-50%);padding:5px 10px;background:#111a20;color:#fff;font-size:12px;font-weight:900;letter-spacing:2px;border:1px solid #fff}.finish-line[hidden]{display:none}`;
  const renderRoad=()=>{
    const distance=state.dist||0;
    road.style.setProperty('--road-offset',`${-((distance*metresToPixels)%130)}px`);
    const playerNose=playerCar.offsetLeft+playerCar.offsetWidth*.962;
    const x=playerNose+(finishDistance-distance)*metresToPixels;
    finishLine.style.left=`${x}px`;
    finishLine.hidden=x>track.clientWidth+50||x< -50;
    // Keep the opponent in the same moving world as the player and finish.
    const cpuNose=cpuCar.offsetLeft+cpuCar.offsetWidth*.962;
    cpuCar.style.transform=`translateX(${playerNose-cpuNose+((state.cpu||0)-distance)*metresToPixels}px)`;
  };
  let finishTimer;
  const startWithPhysics=startRace,finishWithResults=finish,menuWithPhysics=showMenu;
  startRace=()=>{clearTimeout(finishTimer);cancelAnimationFrame(raf);startWithPhysics();document.dispatchEvent(new CustomEvent('jd:race-start'));renderRoad()};
  showMenu=()=>{clearTimeout(finishTimer);state.phase='CANCELLED';document.dispatchEvent(new CustomEvent('jd:race-audio-stop'));menuWithPhysics()};
  finish=()=>{
    if(state.phase==='FINISHED'||state.dist<finishDistance)return;
    state.phase='FINISHED';
    if(state.raceWin!==false)state.dist=finishDistance;
    document.dispatchEvent(new CustomEvent('jd:race-finished',{detail:{win:state.raceWin??state.dist>=state.cpu,perfect:state.perfect,launch:state.launch}}));
    renderRoad();
    feedback('FINISH!');
    // Hold the crossing briefly so it is visible before showing the results.
    const completedRace=state;
    finishTimer=setTimeout(()=>{if(state===completedRace&&state.phase==='FINISHED')finishWithResults()},850);
  };
  const loopWithPhysics=loop;
  loop=t=>{loopWithPhysics(t);renderRoad()};
  addEventListener('resize',renderRoad);
  renderRoad();
})();
