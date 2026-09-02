const asset=name=>{const url=new URL(name,import.meta.url);url.search=new URL(import.meta.url).search;return url.href};
const {WIDTH,HEIGHT,FLOOR,KING_X,LEVELS,SAVE_KEY,normaliseProgress,recordRescue,recordFailure,createGame,flap,tick,pause,resume}=await import(asset('flappy-king-model.mjs'));
const css=document.createElement('link');css.rel='stylesheet';css.href=asset('flappy-king.css');document.head.appendChild(css);
const atlas=new Image();atlas.src=asset('flappy-king/atlas.webp');
const princess=new Image();princess.src=asset('flappy-king/princess.webp');
const crops={king:[80,105,470,335],tower:[190,550,245,704],landscape:[628,630,626,624]};
let artworkReady=false,artworkError=false,progress=normaliseProgress(),storageNote='Progress saved on this browser. Racing credits are kept separate.';
try{progress=normaliseProgress(JSON.parse(localStorage.getItem(SAVE_KEY)||'null'))}
catch{storageNote='Saved progress could not be read. You can still play this session.'}
let game=createGame(),active=false,view='menu',frame=0,lastTime=0,accumulator=0,selected=1;
const panel=document.createElement('section');panel.id='flappy-king';panel.className='screen hide';
panel.innerHTML=`<header><button class="fk-button" data-fk="home">‹ JD GAMES</button><b>FLAPPY KING</b><span class="fk-eyebrow">02 / ROYAL RESCUE</span></header>
  <div class="fk-menu"><div class="fk-hero"><div><p class="fk-eyebrow">A CROWN. A CAPE. A ROYAL RESCUE.</p><h1>FLAPPY<br><span>KING</span></h1><p class="fk-description">The princess is waiting beyond the castle walls. Keep your king airborne, thread the towers, and bring her home. One tap at a time.</p><button class="fk-button primary" data-fk="continue">LOADING ARTWORK…</button></div><div class="fk-hero-art"><canvas width="480" height="270" aria-label="Pixel-art king and princess in a castle landscape" role="img"></canvas></div></div>
  <div class="fk-level-heading"><h2>THE TEN KINGDOMS</h2><span id="fk-completed"></span><span id="fk-highest"></span></div><div class="fk-levels" aria-label="Choose a level"></div>
  <p class="fk-controls"><kbd>SPACE</kbd> / <kbd>↑</kbd> / <b>TAP</b> to flap · <kbd>P</kbd> / <kbd>ESC</kbd> to pause.<br>Fly into the princess to unlock the next kingdom. Each level is faster, tighter and steeper.<br><b>ONE RUN: crash or miss the princess and you return to level 1. Later levels lock again. Your highest-level record stays.</b></p><p class="fk-save-note" role="status"></p></div>
  <div class="fk-play" hidden><div class="fk-race-head"><button class="fk-button" data-fk="levels">‹ LEVELS</button><span id="fk-level-name"></span><span id="fk-flight-highest"></span><button class="fk-button" data-fk="pause">PAUSE</button></div>
  <div class="fk-stage"><canvas id="fk-canvas" width="432" height="600" tabindex="0" role="application" aria-label="Flappy King. Press Space or Up Arrow to flap, P to pause." aria-describedby="fk-flight-help"></canvas><div class="fk-overlay"><div class="fk-modal" role="dialog" aria-modal="true" aria-labelledby="fk-dialog-title"><p class="fk-eyebrow" id="fk-dialog-tag"></p><h2 id="fk-dialog-title"></h2><p id="fk-dialog-copy"></p><div id="fk-dialog-actions"></div></div></div></div>
  <div class="fk-flight-controls" id="fk-flight-help">SPACE / ↑ / TAP <button class="fk-button primary" data-fk="flap">FLAP ↑</button><span class="fk-status" role="status" aria-live="polite"></span></div></div>`;
document.body.appendChild(panel);
const find=s=>panel.querySelector(s),canvas=find('#fk-canvas'),ctx=canvas.getContext('2d');
const overlay=find('.fk-overlay'),menuView=find('.fk-menu'),playView=find('.fk-play');
const card=document.createElement('button');card.className='card play flappy-card';card.id='flappy-king-card';
card.innerHTML='<div class="fk-card-art"><canvas width="432" height="170" role="img" aria-label="A flying pixel-art king"></canvas></div><small>02 / ROYAL RESCUE</small><h2>FLAPPY KING</h2><p>FLAP • DODGE • RESCUE</p><strong>PLAY NOW →</strong>';
document.querySelector('#home .games .soon')?.replaceWith(card);
card.addEventListener('click',enter);

function sprite(context,name,x,y,w,h){
  if(name==='princess')context.drawImage(princess,0,0,princess.naturalWidth,princess.naturalHeight,Math.round(x),Math.round(y),Math.round(w),Math.round(h));
  else context.drawImage(atlas,...crops[name],Math.round(x),Math.round(y),Math.round(w),Math.round(h));
}
function paintArtwork(){
  for(const [target,isCard] of [[card.querySelector('canvas'),true],[find('.fk-hero-art canvas'),false]]){
    const c=target.getContext('2d');c.imageSmoothingEnabled=false;
    sprite(c,'landscape',0,0,target.width,target.height);
    if(isCard)sprite(c,'king',target.width/2-65,20,130,93);
    else{sprite(c,'king',58,96,155,110);sprite(c,'princess',335,105,79,118)}
  }
}
const loadedImages=new Set();
for(const img of [atlas,princess]){
  img.onload=()=>{
    loadedImages.add(img);artworkReady=loadedImages.size===2;
    if(artworkReady){artworkError=false;paintArtwork();if(active&&view==='play')draw()}
    renderMenu();
  };
  img.onerror=()=>{artworkError=true;renderMenu()};
  if(img.complete&&img.naturalWidth)img.onload();
}

function enter(){
  // Cancel drag-race timing through its existing menu function, then leave it.
  window.showMenu();document.dispatchEvent(new CustomEvent('jd:race-audio-stop'));
  active=true;window.show('flappy-king');showLevels();
}
function stop(){cancelAnimationFrame(frame);frame=0;lastTime=0;accumulator=0}
function renderMenu(){
  find('#fk-completed').textContent=`${progress.completed.length} / ${LEVELS.length} RESCUED`;
  find('.fk-save-note').textContent=storageNote;
  find('#fk-highest').textContent=`HIGHEST LEVEL REACHED: ${progress.highestLevel} / ${LEVELS.length}`;
  const start=find('[data-fk="continue"]');start.disabled=!artworkReady&&!artworkError;
  start.textContent=artworkError?'RETRY LOADING ARTWORK':!artworkReady?'LOADING ARTWORK…':progress.completed.length===LEVELS.length?'REPLAY THE KINGDOMS →':`PLAY LEVEL ${progress.unlocked} →`;
  find('.fk-levels').innerHTML=LEVELS.map(level=>{
    const done=progress.completed.includes(level.id),locked=level.id>progress.unlocked;
    return `<button class="fk-level" data-level="${level.id}" ${locked||!artworkReady?'disabled':''}><em>${String(level.id).padStart(2,'0')} / ${done?'RESCUED':locked?'LOCKED':'READY'}</em><b>${level.name}</b><small>${level.towers} GAPS · SPEED ${Math.round(level.speed/LEVELS[0].speed*100)}%<br>${Math.round((1-level.gap/LEVELS[0].gap)*100)}% TIGHTER · ${locked?'LOCKED':'PLAY →'}</small></button>`;
  }).join('');
}
function showLevels(){
  stop();view='menu';menuView.hidden=false;playView.hidden=true;overlay.hidden=true;
  renderMenu();find('[data-fk="continue"]').focus({preventScroll:true});
}
function begin(level){
  if(!artworkReady||level>progress.unlocked||!LEVELS[level-1])return;
  stop();selected=level;game=createGame(level);
  find('#fk-flight-highest').textContent=`BEST: LEVEL ${progress.highestLevel}`;view='play';menuView.hidden=true;playView.hidden=false;
  find('#fk-level-name').textContent=`${String(level).padStart(2,'0')} / ${game.config.name}`;
  find('.fk-status').textContent='';find('[data-fk="pause"]').disabled=true;
  draw();showDialog('GET READY',game.config.name,`Fly through ${game.config.towers} gaps, then fly into the princess. Speed ${Math.round(game.config.speed/LEVELS[0].speed*100)}%. Any failure returns you to level 1.`,[['start','TAKE FLIGHT →']]);
}
function showDialog(tag,title,copy,actions){
  find('#fk-dialog-tag').textContent=tag;find('#fk-dialog-title').textContent=title;find('#fk-dialog-copy').textContent=copy;
  find('#fk-dialog-actions').innerHTML=actions.map(([action,label],i)=>`<button class="fk-button ${i===0?'primary':''}" data-fk="${action}">${label}</button>`).join('');
  overlay.hidden=false;find('#fk-dialog-actions button').focus({preventScroll:true});
}
function startFlight(){overlay.hidden=true;flap(game);find('[data-fk="pause"]').disabled=false;canvas.focus({preventScroll:true});run()}
function run(){stop();frame=requestAnimationFrame(loop)}
function doPause(){
  if(view!=='play'||!pause(game))return;
  stop();find('[data-fk="pause"]').disabled=true;
  showDialog('TAKE A BREATHER','Flight paused','Your king will wait right here.',[['resume','RESUME FLIGHT'],['restart','RESTART LEVEL'],['levels','CHOOSE LEVEL']]);
}
function endFlight(){
  stop();find('[data-fk="pause"]').disabled=true;
  if(game.phase==='rescued'){
    progress=recordRescue(progress,game);
    saveProgress();
    find('.fk-status').textContent='Princess rescued!';
    showDialog(`LEVEL ${game.level} COMPLETE`,game.level===LEVELS.length?'A royal reunion!':'Princess rescued!',game.level===LEVELS.length?'You conquered all ten kingdoms. Every princess is home!':`The princess is safe! Level ${game.level+1} is now unlocked.`,game.level===LEVELS.length?[['levels','BACK TO THE KINGDOMS'],['restart','PLAY AGAIN']]:[['next','NEXT KINGDOM →'],['levels','CHOOSE LEVEL']]);
  }else{
    const failedLevel=game.level,reason=game.reason;
    progress=recordFailure(progress,game);saveProgress();
    begin(1);
    find('.fk-status').textContent=`Level ${failedLevel} failed. Back to level 1.`;
    showDialog('RUN FAILED · BACK TO LEVEL 1','A fresh start',`${reason} Your run has reset and later kingdoms are locked again.`,[['start','START LEVEL 1 →']]);
  }
}
function saveProgress(){
  try{
    // Merge only the all-time record, never revive a failed run's unlocks.
    const saved=normaliseProgress(JSON.parse(localStorage.getItem(SAVE_KEY)||'null'));
    progress=normaliseProgress({...progress,highestLevel:Math.max(progress.highestLevel,saved.highestLevel)});
    localStorage.setItem(SAVE_KEY,JSON.stringify(progress));
  }
  catch{storageNote='Your current run is kept for this session only; browser storage is unavailable.'}
}
// A failed run in another tab must not be revived by an older unlocked-level save.
window.addEventListener('storage',event=>{
  if(event.key!==SAVE_KEY)return;
  try{progress=normaliseProgress({...JSON.parse(event.newValue||'null'),highestLevel:Math.max(progress.highestLevel,normaliseProgress(JSON.parse(event.newValue||'null')).highestLevel)})}catch{return}
  if(active&&view==='play'&&game.level>progress.unlocked)begin(1);
  if(view==='menu')renderMenu();
});
function loop(time){
  if(!active||view!=='play'||panel.classList.contains('hide')){stop();return}
  if(!lastTime)lastTime=time;
  const elapsed=(time-lastTime)/1000;lastTime=time;
  if(elapsed>.25){doPause();return}
  accumulator+=elapsed;
  while(accumulator>=1/120&&game.phase==='playing'){tick(game,1/120);accumulator-=1/120}
  draw();
  if(game.phase==='rescued'||game.phase==='crashed'){endFlight();return}
  frame=requestAnimationFrame(loop);
}
function drawTower(x,edge,bottom){
  // Keep the stonework at a stable scale; tile the shaft, don't stretch it.
  const width=68,capHeight=45;
  ctx.save();ctx.beginPath();ctx.rect(x,bottom?edge:0,width,bottom?FLOOR-edge:edge);ctx.clip();
  if(!bottom){ctx.translate(0,edge);ctx.scale(1,-1);edge=0}
  for(let y=edge+capHeight;y<(bottom?FLOOR:HEIGHT);y+=65)ctx.drawImage(atlas,220,925,190,180,Math.round(x+7),Math.round(y),54,65);
  ctx.drawImage(atlas,190,550,245,155,Math.round(x),Math.round(edge),width,capHeight);
  ctx.restore();
}
function draw(){
  if(!artworkReady||!ctx)return;
  ctx.imageSmoothingEnabled=false;
  sprite(ctx,'landscape',0,0,WIDTH,HEIGHT);
  // A subtle tint gives the later kingdoms their own mood without hiding obstacles.
  ctx.fillStyle=`rgba(25,15,65,${(game.level-1)*.037})`;ctx.fillRect(0,0,WIDTH,HEIGHT);
  for(const tower of game.towers){
    const x=tower.x-game.distance;if(x< -75||x>WIDTH+75)continue;
    drawTower(x,tower.centre-game.config.gap/2,false);
    drawTower(x,tower.centre+game.config.gap/2,true);
  }
  const goalX=game.goalX-game.distance;
  if(goalX<WIDTH+100){
    ctx.fillStyle='#ffe79b33';ctx.fillRect(Math.round(goalX-36),game.goalY-54,72,108);
    ctx.strokeStyle='#ffe6a0';ctx.lineWidth=3;ctx.setLineDash([8,6]);ctx.strokeRect(Math.round(goalX-36),game.goalY-54,72,108);ctx.setLineDash([]);
    sprite(ctx,'princess',goalX-20,game.goalY-30,40,60);
    ctx.fillStyle='#e3c58d';ctx.fillRect(Math.round(goalX-40),game.goalY+32,80,8);
    ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.fillStyle='#1b1c32';ctx.fillRect(Math.round(goalX-45),game.goalY-78,90,19);ctx.fillStyle='#ffe7a8';ctx.fillText('RESCUE ME',goalX,game.goalY-64);
  }
  ctx.fillStyle='#28283f';ctx.fillRect(0,FLOOR,WIDTH,HEIGHT-FLOOR);
  ctx.fillStyle='#b59a74';ctx.fillRect(0,FLOOR,WIDTH,5);
  ctx.fillStyle='#454157';for(let x=-(game.distance%36);x<WIDTH;x+=36)ctx.fillRect(Math.round(x),FLOOR+8,28,9);
  ctx.save();ctx.translate(KING_X,game.y);ctx.rotate(Math.max(-.18,Math.min(.62,game.vy/680)));
  // Cape is deliberately outside the forgiving collision circle.
  sprite(ctx,'king',-31,-21,57,41);ctx.restore();
  ctx.fillStyle='#101b35dc';ctx.fillRect(12,12,WIDTH-24,46);
  ctx.textAlign='left';ctx.font='bold 13px monospace';ctx.fillStyle='#ffe6a0';ctx.fillText(`KINGDOM ${game.level} / ${LEVELS.length}`,24,32);
  ctx.textAlign='right';ctx.fillStyle='#fff7e3';ctx.fillText(`${game.passed} / ${game.config.towers} GAPS`,WIDTH-24,32);
  ctx.fillStyle='#414563';ctx.fillRect(24,42,WIDTH-48,5);ctx.fillStyle='#efd27e';ctx.fillRect(24,42,(WIDTH-48)*Math.min(1,game.distance/(game.goalX-KING_X)),5);
  if(game.passed===game.config.towers&&game.phase==='playing'){
    ctx.textAlign='center';ctx.font='bold 13px monospace';ctx.fillStyle='#18243b';ctx.fillRect(89,68,254,23);ctx.fillStyle='#ffe3a0';ctx.fillText('REACH THE PRINCESS →',WIDTH/2,84);
  }
}
function action(name){
  if(name==='home'){stop();active=false;window.show('home');card.focus({preventScroll:true})}
  else if(name==='continue'){
    if(artworkError){
      artworkError=false;
      for(const [img,path] of [[atlas,'atlas.webp'],[princess,'princess.webp']])if(!loadedImages.has(img)){
        const retry=new URL(asset(`flappy-king/${path}`));retry.searchParams.set('retry',Date.now());img.src=retry.href;
      }
      renderMenu();
    }
    else begin(progress.unlocked);
  }
  else if(name==='levels')showLevels();
  else if(name==='start')startFlight();
  else if(name==='restart')begin(selected);
  else if(name==='next')begin(selected+1);
  else if(name==='pause')doPause();
  else if(name==='resume'){if(resume(game)){overlay.hidden=true;find('[data-fk="pause"]').disabled=false;canvas.focus({preventScroll:true});run()}}
  else if(name==='flap'&&view==='play'&&overlay.hidden)flap(game);
}
panel.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button||button.disabled)return;
  if(button.dataset.level)begin(Number(button.dataset.level));else action(button.dataset.fk);
});
canvas.addEventListener('pointerdown',event=>{
  if(event.button!==0||!overlay.hidden)return;
  event.preventDefault();canvas.focus({preventScroll:true});flap(game);
});
// Capture before the old game's global keyboard handlers. No revs or shifts here.
window.addEventListener('keydown',event=>{
  if(!active||panel.classList.contains('hide'))return;
  event.stopImmediatePropagation();
  if(event.code==='Tab'&&!overlay.hidden&&view==='play'){
    const buttons=[...overlay.querySelectorAll('button')],first=buttons[0],last=buttons.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    return;
  }
  const onButton=event.target.closest?.('button');
  if(event.code==='Escape'||event.code==='KeyP'){
    event.preventDefault();if(event.repeat)return;
    if(game.phase==='paused')action('resume');else doPause();return;
  }
  if(event.code==='Space'||event.code==='ArrowUp'){
    // Native button activation must remain usable in menus and result dialogs.
    if(view!=='play'||(!overlay.hidden&&game.phase!=='ready'))return;
    if(onButton&&!overlay.hidden&&event.code==='Space')return;
    event.preventDefault();if(event.repeat)return;
    if(game.phase==='ready')startFlight();else if(game.phase==='playing')flap(game);
  }
},true);
window.addEventListener('keyup',event=>{if(active&&!panel.classList.contains('hide'))event.stopImmediatePropagation()},true);
window.addEventListener('blur',()=>{if(active)doPause()});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&active)doPause()});
renderMenu();
