// Original flap-to-fly rules. Independent of the Drag Racer economy and save.
export const WIDTH=432, HEIGHT=600, FLOOR=564, KING_X=108, RADIUS=13;
export const SAVE_KEY='jd-flappy-king-v1';
export const LEVELS=Object.freeze([
  ['The Castle Gardens',6,112,216], ['The Outer Wall',7,126,202],
  ['The Royal Aqueduct',8,140,188], ['The Watchtowers',9,154,174],
  ['The Crimson Keep',10,168,160], ['The Moonlit Ramparts',11,182,146],
  ['The Crown Citadel',12,196,132], ['The Last Fortress',13,210,118],
  ['The Royal Gauntlet',15,232,112], ['The Nightmare Keep',18,260,106],
].map(([name,towers,speed,gap],i)=>Object.freeze({id:i+1,name,towers,speed,gap,
  spacing:i===9?184:i===8?196:260-i*6,climb:i>=8?68+(i-8)*2:24+i*6})));
export function normaliseProgress(value){
  const completed=Array.isArray(value?.completed)?[...new Set(value.completed.filter(n=>Number.isInteger(n)&&n>=1&&n<=LEVELS.length))].sort((a,b)=>a-b):[];
  // Progress must form a continuous campaign, never unlock via a stray last-level ID.
  let through=0;while(completed.includes(through+1))through++;
  const unlocked=Math.min(LEVELS.length,through+1);
  const savedBest=Number.isInteger(value?.highestLevel)?Math.max(1,Math.min(LEVELS.length,value.highestLevel)):1;
  return {version:1,completed:completed.filter(n=>n<=through),unlocked,highestLevel:Math.max(unlocked,savedBest)};
}
export function recordRescue(progress,game){
  const current=normaliseProgress(progress);
  if(game?.phase!=='rescued'||game.level>current.unlocked)return current;
  return normaliseProgress({...current,completed:[...current.completed,game.level]});
}
export function recordFailure(progress,game){
  const current=normaliseProgress(progress);
  return game?.phase==='crashed'?normaliseProgress({...current,completed:[]}):current;
}
export function createGame(level=1){
  const config=LEVELS[level-1];if(!config)throw new RangeError('Unknown level');
  let seed=level*919+41,previous=285;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
  const towers=Array.from({length:config.towers},(_,i)=>{
    // Gradually steeper alternating climbs: the early garden is nearly level,
    // whereas later kingdoms demand deliberate rises and drops between towers.
    const direction=i%2===0?-1:1;
    const centre=i===0?285:Math.max(166,Math.min(400,previous+direction*config.climb*(.8+random()*.2)));
    previous=centre;return {x:510+i*config.spacing,centre,width:68,passed:false};
  });
  return {level,config,phase:'ready',y:285,vy:0,distance:0,time:0,passed:0,towers,
    goalX:towers.at(-1).x+config.spacing+75,goalY:previous,reason:''};
}
export function flap(game){
  if(game.phase==='ready')game.phase='playing';
  if(game.phase==='playing')game.vy=-285;
}
export function pause(game){if(game.phase==='playing'){game.phase='paused';return true}return false}
export function resume(game){if(game.phase==='paused'){game.phase='playing';return true}return false}
export function tick(game,seconds){
  if(game.phase!=='playing'||!Number.isFinite(seconds)||seconds<=0)return;
  // Small substeps prevent tunnelling through towers on slow frames.
  let remaining=Math.min(seconds,.25);
  while(remaining>0&&game.phase==='playing'){
    const dt=Math.min(remaining,1/240);remaining-=dt;
    game.time+=dt;game.distance+=game.config.speed*dt;
    game.vy=Math.min(430,game.vy+850*dt);game.y+=game.vy*dt;
    if(game.y-RADIUS<0||game.y+RADIUS>FLOOR){game.phase='crashed';game.reason='Watch the sky and the ground.';break}
    for(const tower of game.towers){
      const left=tower.x-game.distance,right=left+tower.width;
      const top=tower.centre-game.config.gap/2,bottom=tower.centre+game.config.gap/2;
      if(KING_X+RADIUS>left&&KING_X-RADIUS<right&&(game.y-RADIUS<top||game.y+RADIUS>bottom)){
        game.phase='crashed';game.reason='A little more room around the towers.';break;
      }
      if(!tower.passed&&right<KING_X-RADIUS){tower.passed=true;game.passed++}
    }
    // Rescue requires actual contact with the princess, not merely her banner.
    if(game.phase==='playing'&&game.passed===game.config.towers){
      const dx=game.goalX-game.distance-KING_X;
      const nearX=Math.max(Math.abs(dx)-20,0),nearY=Math.max(Math.abs(game.y-game.goalY)-27,0);
      if(nearX*nearX+nearY*nearY<RADIUS*RADIUS)game.phase='rescued';
      else if(dx< -40){game.phase='crashed';game.reason='You missed the princess. Fly into her to make the rescue.'}
    }
  }
}
