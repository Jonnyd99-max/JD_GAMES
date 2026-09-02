const asset=name=>{const u=new URL(name,import.meta.url);u.search=new URL(import.meta.url).search;return u.href};
const {WIDTH,HEIGHT,PADDLE_Y,SAVE_KEY,POWERS,createGame,tick,launch,fire,move,normaliseSave,recordResult}=await import(asset('badge-breaker-model.mjs'));
const css=document.createElement('link');css.rel='stylesheet';css.href=asset('badge-breaker.css');document.head.appendChild(css);
let levels=[],save=normaliseSave(),storageNote='',active=false,mode='menu',game=null,page=0,frame=0,last=0,shoot=false,left=false,right=false,pausedFrom='playing';
try{save=normaliseSave(JSON.parse(localStorage.getItem(SAVE_KEY)||'null'))}catch{storageNote='Browser save unavailable; you can still play this session.'}
const panel=document.createElement('section');panel.id='badge-breaker';panel.className='screen hide';
panel.innerHTML=`<header><button class="bb-btn" data-bb="home">‹ JD GAMES</button><b>BADGE BREAKER</b><span class="bb-eyebrow">03 / BRICKS OF THE WORLD</span></header>
 <div class="bb-menu"><div class="bb-intro"><div><p class="bb-eyebrow">CLASSIC PADDLE ACTION. FIFTY NEW PATTERNS.</p><h1>BADGE<br>BREAKER</h1><p class="bb-copy">From Old Trafford to the world. Smash through 20 club crests and 30 national flags. Catch falling power-ups, keep the balls in play, and clear every coloured brick.</p><div class="bb-menu-actions"><button class="bb-btn primary" data-bb="start" disabled>LOADING LEVELS…</button><button class="bb-btn" data-bb="help">HOW TO PLAY</button></div><p class="bb-record"></p></div><div class="bb-intro-art"><canvas width="576" height="570" role="img" aria-label="Manchester United badge built from breakable bricks"></canvas></div></div>
 <div class="bb-level-head"><h2>50 LEVELS / <span class="bb-range"></span></h2><div><button class="bb-btn" data-bb="prev" aria-label="Previous ten levels">←</button><button class="bb-btn" data-bb="page" aria-label="Next ten levels">→</button></div></div><div class="bb-levels"></div>
 <details class="bb-help"><summary>CONTROLS & ALL TEN POWER-UPS</summary><p class="bb-copy">Move with your mouse, drag on the court, or use ← / → (A / D). Click, tap or press Space to launch. With lasers, hold Space or FIRE. Press P or Esc to pause. You start with 3 lives; losing the last ball costs one life. Clear all coloured bricks to advance. Steel side bumpers cannot be destroyed and do not count. Marked armoured bricks need 3 hits. Levels grow faster and your paddle gets narrower.</p><div class="bb-powers">${POWERS.map(p=>`<div class="bb-power"><i style="--power:${p.color}">${p.code}</i><div><b>${p.name}</b>${p.description}</div></div>`).join('')}</div></details>
 <p class="bb-note">An independently made Ballistic-inspired game. Club crests belong to their respective clubs; this game is not affiliated with or endorsed by the clubs or Premier League. Progress and best score are stored on this browser, separately from the other JD games.</p><p class="bb-storage" role="status"></p></div>
 <div class="bb-play" hidden><div class="bb-top"><button class="bb-btn" data-bb="menu">‹ LEVELS</button><span class="bb-level-title"></span><button class="bb-btn" data-bb="pause">PAUSE</button></div><div class="bb-game-layout"><div class="bb-board"><canvas width="576" height="720" tabindex="0" aria-label="Badge Breaker court. Move with arrows, launch with Space, pause with P." role="application"></canvas><div class="bb-overlay" hidden><div class="bb-modal" role="dialog" aria-modal="true" aria-labelledby="bb-dialog-title"><h2 id="bb-dialog-title"></h2><p class="bb-dialog-copy"></p><div class="bb-dialog-actions"></div></div></div></div>
 <aside class="bb-hud"><h2>PLAYER ONE</h2><dl><dt>SCORE</dt><dd class="bb-score">0</dd><dt>LIVES</dt><dd class="bb-lives">3</dd><dt>BRICKS</dt><dd class="bb-remaining">0</dd></dl><p class="bb-toast" role="status" aria-live="polite"></p><div class="bb-active"></div><div class="bb-controls-row"><button class="bb-btn primary" data-bb="launch">LAUNCH / FIRE</button><div class="bb-touch"><button class="bb-btn" data-hold="left" aria-label="Move paddle left">←</button><button class="bb-btn" data-hold="right" aria-label="Move paddle right">→</button></div></div><p class="bb-copy">Mouse / drag / ← → to move<br>Space / click to launch<br>P / Esc to pause</p><p class="bb-note bb-best"></p></aside></div></div>`;
document.body.appendChild(panel);
const $=s=>panel.querySelector(s),canvas=$('.bb-board canvas'),ctx=canvas.getContext('2d'),overlay=$('.bb-overlay');
const card=document.createElement('button');card.className='card play bb-card';card.id='badge-breaker-card';
card.innerHTML=`<div class="bb-card-art"><img src="${asset('ballistic-art/club-360.png')}" alt="Manchester United crest"></div><small>03 / BRICK BREAKER</small><h2>BADGE BREAKER</h2><p>50 LEVELS • 10 POWER-UPS</p><strong>PLAY NOW →</strong>`;
document.querySelector('#home .games > :nth-child(3)')?.replaceWith(card);
card.onclick=()=>{window.showMenu();active=true;window.show('badge-breaker');showMenu()};
async function loadLevels(){
 try{const response=await fetch(asset('ballistic-levels.json'));if(!response.ok)throw Error('levels');levels=await response.json();if(levels.length!==50)throw Error('count');renderMenu();const sample=createGame(levels[0]);paint($('.bb-intro-art canvas').getContext('2d'),sample,false)}
 catch{$('[data-bb="start"]').disabled=false;$('[data-bb="start"]').textContent='RETRY LOADING LEVELS';$('.bb-storage').textContent='The level pack could not load. Please try again.'}
}
function renderMenu(){
 $('[data-bb="start"]').disabled=!levels.length;$('[data-bb="start"]').textContent=`PLAY LEVEL ${save.unlocked} →`;
 $('.bb-record').textContent=`BEST SCORE ${save.best.toLocaleString()} · ${save.unlocked} / 50 LEVELS UNLOCKED${save.completed?' · TOUR COMPLETE':''}`;
 $('.bb-range').textContent=`${page*10+1}–${page*10+10}`;
 $('[data-bb="prev"]').disabled=page===0;$('[data-bb="page"]').disabled=page===4;
 $('.bb-levels').innerHTML=levels.slice(page*10,page*10+10).map(l=>`<button class="bb-level" data-level="${l.id}" ${l.id>save.unlocked?'disabled':''}><img loading="lazy" src="${asset('ballistic-art/'+l.file)}" alt=""><b>${String(l.id).padStart(2,'0')} / ${l.name}</b><small>${l.id>save.unlocked?'LOCKED':l.kind.toUpperCase()+' · PLAY →'}</small></button>`).join('');
 $('.bb-storage').textContent=storageNote;
}
function stop(){cancelAnimationFrame(frame);frame=0;last=0;shoot=left=right=false}
function showMenu(){stop();mode='menu';$('.bb-menu').hidden=false;$('.bb-play').hidden=true;overlay.hidden=true;page=Math.floor((save.unlocked-1)/10);renderMenu()}
function begin(id,carry){if(!levels[id-1]||id>save.unlocked)return;stop();game=createGame(levels[id-1],carry);mode='play';$('.bb-menu').hidden=true;$('.bb-play').hidden=false;overlay.hidden=true;$('.bb-level-title').textContent=`${String(id).padStart(2,'0')} / ${game.level.name}`;$('.bb-toast').textContent='Launch when ready';canvas.focus({preventScroll:true});draw();frame=requestAnimationFrame(loop)}
function persist(){save=recordResult(save,game);try{const previous=normaliseSave(JSON.parse(localStorage.getItem(SAVE_KEY)||'null'));save.best=Math.max(save.best,previous.best);save.unlocked=Math.max(save.unlocked,previous.unlocked);save.completed||=previous.completed;localStorage.setItem(SAVE_KEY,JSON.stringify(save))}catch{storageNote='Save unavailable. Progress is kept for this session only.'}}
function dialog(title,copy,buttons){stop();$('#bb-dialog-title').textContent=title;$('.bb-dialog-copy').textContent=copy;$('.bb-dialog-actions').innerHTML=buttons.map(([id,label])=>`<button class="bb-btn primary" data-bb="${id}">${label}</button>`).join('');overlay.hidden=false;$('.bb-dialog-actions button').focus({preventScroll:true})}
function pause(){if(mode!=='play'||!['ready','playing'].includes(game.phase))return;pausedFrom=game.phase;game.phase='paused';dialog('PAUSED','Your court will wait right here.',[['resume','RESUME'],['menu','LEVEL SELECT']])}
function loop(t){
 if(!active||panel.classList.contains('hide')||mode!=='play')return stop();
 const dt=last?(t-last)/1000:0;last=t;if(dt>.25){pause();return}
 tick(game,dt,{direction:Number(right)-Number(left),shoot});
 for(const event of game.events.splice(0)){
  if(event.startsWith('power:'))$('.bb-toast').textContent=POWERS.find(p=>p.id===event.slice(6)).name+'!';
  if(event==='lost'){$('.bb-toast').textContent='Ball lost — launch again';persist()}
 }
 draw();
 if(game.phase==='won'){persist();dialog(game.level.id===50?'WORLD TOUR COMPLETE!':'LEVEL CLEARED!',`${game.level.name} cleared. Score: ${game.score.toLocaleString()}.`,game.level.id===50?[['menu','BACK TO LEVELS']]:[['next','NEXT LEVEL →'],['menu','LEVEL SELECT']]);return}
 if(game.phase==='over'){persist();dialog('GAME OVER',`Final score: ${game.score.toLocaleString()}. Your unlocked levels and best score are saved.`,[['retry','TRY THIS LEVEL AGAIN'],['menu','LEVEL SELECT']]);return}
 frame=requestAnimationFrame(loop);
}
function brick(c,b){c.fillStyle=b.color;c.fillRect(b.x,b.y,b.w,b.h);c.fillStyle='#ffffff65';c.fillRect(b.x,b.y,b.w,1);c.fillRect(b.x,b.y,1,b.h);c.fillStyle='#00000050';c.fillRect(b.x,b.y+b.h-2,b.w,2);c.fillRect(b.x+b.w-2,b.y,2,b.h);if(b.hp>1&&!b.solid){c.fillStyle='#fff';for(let i=0;i<b.hp;i++)c.fillRect(b.x+3+i*3,b.y+5,1,3)}}
function paint(c,g,full=true){
 c.fillStyle='#89949e';c.fillRect(0,0,WIDTH,HEIGHT);
 c.fillStyle='#ffffff38';for(let y=0;y<HEIGHT;y+=16)for(let x=0;x<WIDTH;x+=16){c.fillRect(x,y,15,1);c.fillRect(x,y,1,15)}
 c.fillStyle='#142336';c.fillRect(0,0,12,HEIGHT);c.fillRect(WIDTH-12,0,12,HEIGHT);c.fillRect(0,0,WIDTH,12);
 for(const b of g.bricks)if(b.hp>0)brick(c,b);
 if(!full)return;
 c.fillStyle='#0e2341';c.fillRect(12,16,WIDTH-24,35);c.font='bold 15px monospace';c.textAlign='left';c.fillStyle='#b7ffee';c.fillText('ROUND '+g.level.id+' / 50',24,39);c.textAlign='right';c.fillStyle='#ffe485';c.fillText(g.score.toLocaleString()+' PTS',WIDTH-24,39);
 c.fillStyle='#182944';c.fillRect(g.paddle-g.width/2-3,PADDLE_Y-3,g.width+6,18);c.fillStyle='#d3d7d5';c.fillRect(g.paddle-g.width/2,PADDLE_Y,g.width,12);c.fillStyle=g.effects.laser?'#ff574f':'#45e2c3';c.fillRect(g.paddle-g.width/2,PADDLE_Y,10,12);c.fillRect(g.paddle+g.width/2-10,PADDLE_Y,10,12);c.fillStyle='#fff';c.fillRect(g.paddle-g.width/2+10,PADDLE_Y,g.width-20,2);
 for(const ball of g.balls){c.beginPath();c.arc(ball.x,ball.y,g.effects.mega?12:5,0,Math.PI*2);c.fillStyle=g.effects.blue?'#1987ff':g.effects.mega?'#ffe355':'#fa66ef';c.fill();c.strokeStyle='#fff';c.lineWidth=1;c.stroke()}
 for(const l of g.lasers){c.fillStyle='#ffdf6a';c.fillRect(l.x-1,l.y-8,3,10)}
 for(const d of g.drops){const p=POWERS.find(p=>p.id===d.id);c.fillStyle='#15243a';c.fillRect(d.x-13,d.y-10,26,20);c.fillStyle=p.color;c.fillRect(d.x-11,d.y-8,22,16);c.fillStyle='#0a1927';c.font='bold 13px monospace';c.textAlign='center';c.fillText(p.code,d.x,d.y+5)}
 if(g.phase==='ready'){c.fillStyle='#132237e8';c.fillRect(98,585,380,43);c.textAlign='center';c.fillStyle='#fff';c.font='bold 15px monospace';c.fillText('CLICK / TAP / SPACE TO LAUNCH',WIDTH/2,612)}
}
function draw(){paint(ctx,game);$('.bb-score').textContent=game.score.toLocaleString();$('.bb-lives').textContent=game.lives;$('.bb-remaining').textContent=game.remaining;$('.bb-best').textContent='BEST SCORE: '+Math.max(save.best,game.score).toLocaleString();$('.bb-active').textContent=Object.entries(game.effects).map(([id,t])=>POWERS.find(p=>p.id===id).name+' '+Math.ceil(t)+'s').concat(game.two?['Two Ball: active']:[]).join(' · ')}
function act(id){
 if(id==='home'){if(game&&mode==='play')persist();stop();active=false;window.show('home');card.focus()}
 else if(id==='start'){if(!levels.length)loadLevels();else begin(save.unlocked)}
 else if(id==='menu'){if(game)persist();showMenu()}
 else if(id==='prev'||id==='page'){page=Math.max(0,Math.min(4,page+(id==='prev'?-1:1)));renderMenu()}
 else if(id==='help'){$('.bb-help').open=true;$('.bb-help').scrollIntoView({behavior:'smooth'})}
 else if(id==='pause')pause();
 else if(id==='resume'){game.phase=pausedFrom;overlay.hidden=true;canvas.focus();frame=requestAnimationFrame(loop)}
 else if(id==='retry')begin(game.level.id);
 else if(id==='next')begin(game.level.id+1,{lives:game.lives,score:game.score});
 else if(id==='launch'&&game&&overlay.hidden)launch(game);
}
panel.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;if(b.dataset.level)begin(Number(b.dataset.level));else act(b.dataset.bb)});
const pointer=e=>{const rect=canvas.getBoundingClientRect();move(game,(e.clientX-rect.left)*WIDTH/rect.width)};
canvas.addEventListener('pointermove',e=>{if(mode==='play'&&overlay.hidden)pointer(e)});
canvas.addEventListener('pointerdown',e=>{if(mode!=='play'||!overlay.hidden||e.button!==0)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);pointer(e);launch(game);shoot=true;canvas.focus()});
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>shoot=false);
panel.addEventListener('pointerdown',e=>{const b=e.target.closest('button');if(!b||mode!=='play'||!overlay.hidden)return;if(b.dataset.hold||b.dataset.bb==='launch'){b.setPointerCapture(e.pointerId);if(b.dataset.hold==='left')left=true;else if(b.dataset.hold==='right')right=true;else{launch(game);shoot=true}}});
for(const event of ['pointerup','pointercancel','lostpointercapture'])panel.addEventListener(event,()=>{left=right=shoot=false});
window.addEventListener('keydown',e=>{
 if(!active||panel.classList.contains('hide'))return;e.stopImmediatePropagation();
 if(e.code==='Tab'&&!overlay.hidden){const buttons=[...overlay.querySelectorAll('button')];if(e.shiftKey&&document.activeElement===buttons[0]){e.preventDefault();buttons.at(-1).focus()}else if(!e.shiftKey&&document.activeElement===buttons.at(-1)){e.preventDefault();buttons[0].focus()}return}
 if(mode!=='play')return;
 if(e.code==='Escape'||e.code==='KeyP'){e.preventDefault();if(!e.repeat){if(game.phase==='paused')act('resume');else pause()}return}
 if(!overlay.hidden)return;
 if(['ArrowLeft','KeyA','ArrowRight','KeyD','Space'].includes(e.code))e.preventDefault();
 if(['ArrowLeft','KeyA'].includes(e.code))left=true;if(['ArrowRight','KeyD'].includes(e.code))right=true;
 if(e.code==='Space'){if(!e.repeat)launch(game);shoot=true}
},true);
window.addEventListener('keyup',e=>{if(!active||panel.classList.contains('hide'))return;e.stopImmediatePropagation();if(['ArrowLeft','KeyA'].includes(e.code))left=false;if(['ArrowRight','KeyD'].includes(e.code))right=false;if(e.code==='Space')shoot=false},true);
window.addEventListener('blur',()=>{left=right=shoot=false;if(active)pause()});
document.addEventListener('visibilitychange',()=>{if(active&&document.hidden)pause()});
loadLevels();
