import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {findRoute} from './flappy-route.mjs';
import {WIDTH,FLOOR,KING_X,RADIUS,LEVELS,SAVE_KEY,createGame,flap,tick,pause,resume,normaliseProgress,recordRescue,recordFailure} from '../public/flappy-king-model.mjs';

test('ten kingdoms get progressively faster, longer, and tighter',()=>{
  assert.equal(LEVELS.length,10);
  for(let i=1;i<LEVELS.length;i++){
    assert.ok(LEVELS[i].speed>LEVELS[i-1].speed);
    assert.ok(LEVELS[i].gap<LEVELS[i-1].gap);
    assert.ok(LEVELS[i].towers>LEVELS[i-1].towers);
    assert.ok(LEVELS[i].spacing<LEVELS[i-1].spacing);
    assert.ok(LEVELS[i].climb>LEVELS[i-1].climb);
  }
});
test('ready state waits for input; a flap provides lift; pause freezes the simulation',()=>{
  const game=createGame();tick(game,.2);assert.equal(game.distance,0);
  flap(game);assert.equal(game.phase,'playing');assert.equal(game.vy,-285);
  tick(game,.05);assert.ok(game.y<285);assert.ok(game.distance>0);
  assert.equal(pause(game),true);const snapshot=JSON.stringify(game);
  tick(game,.2);flap(game);assert.equal(JSON.stringify(game),snapshot);
  assert.equal(resume(game),true);tick(game,.02);assert.notEqual(JSON.stringify(game),snapshot);
});
test('ground, ceiling, and tower collisions end a flight',()=>{
  for(const y of [RADIUS-1,FLOOR-RADIUS+1]){
    const game=createGame();game.phase='playing';game.y=y;tick(game,.001);assert.equal(game.phase,'crashed');
  }
  const game=createGame();game.phase='playing';game.distance=game.towers[0].x-KING_X-15;game.y=100;
  tick(game,.25);assert.equal(game.phase,'crashed');
});
test('clearing the last gap alone does not finish: the princess must be touched',()=>{
  const game=createGame();game.phase='playing';game.passed=game.config.towers;
  game.towers.forEach(t=>t.passed=true);game.distance=game.goalX-KING_X-100;game.y=game.goalY;
  tick(game,.01);assert.equal(game.phase,'playing');
  game.distance=game.goalX-KING_X;game.y=game.goalY;game.vy=0;tick(game,.01);
  assert.equal(game.phase,'rescued');const snapshot=JSON.stringify(game);tick(game,.1);flap(game);assert.equal(JSON.stringify(game),snapshot);
});
test('missing the princess requires a retry and awards no progression',()=>{
  const game=createGame();game.phase='playing';game.passed=game.config.towers;
  game.towers.forEach(t=>t.passed=true);game.distance=game.goalX-KING_X+57;game.y=100;tick(game,.01);
  assert.equal(game.phase,'crashed');assert.equal(recordRescue(null,game).unlocked,1);
});
test('saves unlock only sequential rescues and replays do not skip kingdoms',()=>{
  assert.equal(SAVE_KEY,'jd-flappy-king-v1');
  assert.deepEqual(normaliseProgress({completed:[8,'1',0,-1,Infinity]}),{version:1,completed:[],unlocked:1,highestLevel:1});
  let p=normaliseProgress();
  assert.equal(recordRescue(p,{phase:'rescued',level:2}).unlocked,1);
  for(let level=1;level<=10;level++)p=recordRescue(p,{phase:'rescued',level});
  assert.equal(p.unlocked,10);assert.equal(p.completed.length,10);
  assert.deepEqual(recordRescue(p,{phase:'rescued',level:1}),p);
  assert.deepEqual(normaliseProgress(JSON.parse(JSON.stringify(p))),p);
});
test('the original eight levels remain achievable using only flap controls',()=>{
  for(const config of LEVELS.slice(0,8)){
    assert.deepEqual(createGame(config.id),createGame(config.id));
    const game=createGame(config.id);flap(game);
    for(let frame=0;frame<120*65&&game.phase==='playing';frame++){
      const next=game.towers.find(t=>t.x+t.width-game.distance>=KING_X-RADIUS);
      const target=next?.centre??game.goalY;
      if(game.y>target+25&&game.vy>0)flap(game);
      tick(game,1/120);
    }
    assert.equal(game.phase,'rescued',`Level ${config.id}: ${game.reason} at ${game.distance.toFixed(0)}, y ${game.y.toFixed(0)}`);
    assert.equal(game.passed,config.towers);
  }
});
test('every crash or missed rescue resets all level unlocks',()=>{
  const progress=normaliseProgress({completed:[1,2,3,4,5,6,7]});
  for(const level of [1,4,8]){
    const game=createGame(level);game.phase='playing';game.y=FLOOR;tick(game,.01);
    assert.equal(game.phase,'crashed');
    assert.deepEqual(recordFailure(progress,game),normaliseProgress({highestLevel:8}));
  }
  const missed=createGame(8);missed.phase='playing';missed.passed=missed.config.towers;
  missed.towers.forEach(t=>t.passed=true);missed.distance=missed.goalX-KING_X+45;missed.y=100;
  tick(missed,.01);assert.equal(missed.phase,'crashed');
  assert.deepEqual(recordFailure(progress,missed),normaliseProgress({highestLevel:8}));
  assert.deepEqual(recordFailure(progress,{phase:'paused'}),progress);
});
test('passing through the outer banner without touching the princess is not a rescue',()=>{
  const game=createGame();game.phase='playing';game.passed=game.config.towers;
  game.towers.forEach(t=>t.passed=true);game.distance=game.goalX-KING_X;
  game.y=game.goalY+49;game.vy=0;tick(game,.001);
  assert.equal(game.phase,'playing');
  game.y=game.goalY;tick(game,.001);assert.equal(game.phase,'rescued');
});
test('entry point mounts slot 02 separately and assets are present',()=>{
  const ui=readFileSync(new URL('../public/flappy-king.js',import.meta.url),'utf8');
  const loader=readFileSync(new URL('../public/physics-v2.js',import.meta.url),'utf8');
  assert.match(ui,/02 \/ ROYAL RESCUE/);assert.match(loader,/new URL\('flappy-king.js',document.currentScript.src\)/);
  assert.match(ui,/stopImmediatePropagation/);assert.match(ui,/visibilitychange/);
  assert.doesNotMatch(ui,/jd-garage-v1|purchaseCar|awardRace/);
  const atlas=readFileSync(new URL('../public/flappy-king/atlas.webp',import.meta.url));
  assert.equal(atlas.toString('ascii',0,4),'RIFF');assert.equal(atlas.toString('ascii',8,12),'WEBP');
  assert.ok(WIDTH>KING_X+RADIUS);
});
test('levels 9 and 10 have playable routes with at least 200ms between taps',()=>{
  for(const level of [9,10]){
    const path=findRoute(level);assert.ok(path,`Level ${level} needs a playable route`);
    const game=createGame(level);flap(game);let lastFlap=-12;
    for(let frame=0;frame<path.length;frame++){
      if(path[frame]==='1'){assert.ok(frame-lastFlap>=12);lastFlap=frame;flap(game)}
      tick(game,1/60);
    }
    assert.equal(game.phase,'rescued');assert.equal(game.passed,game.config.towers);
  }
});
test('highest level survives resets, reloads and older-save migration without unlocking levels',()=>{
  let progress=normaliseProgress({completed:[1,2,3,4,5,6,7,8]});
  assert.equal(progress.highestLevel,9);
  progress=recordRescue(progress,{phase:'rescued',level:9});
  assert.equal(progress.highestLevel,10);assert.equal(progress.unlocked,10);
  progress=recordFailure(progress,{phase:'crashed'});
  assert.equal(progress.highestLevel,10);assert.equal(progress.unlocked,1);
  progress=normaliseProgress(JSON.parse(JSON.stringify(progress)));
  assert.equal(progress.highestLevel,10);assert.equal(progress.unlocked,1);
  progress=recordRescue(progress,{phase:'rescued',level:1});
  assert.equal(progress.highestLevel,10);assert.equal(progress.unlocked,2);
  assert.equal(normaliseProgress({highestLevel:Infinity}).highestLevel,1);
  assert.equal(normaliseProgress({highestLevel:999}).highestLevel,10);
});
