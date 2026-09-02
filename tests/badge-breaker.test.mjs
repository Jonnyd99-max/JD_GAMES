import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createGame,bricksFor,tick,launch,move,fire,applyPower,POWERS,normaliseSave,recordResult,WIDTH,HEIGHT,PADDLE_Y} from '../public/badge-breaker-model.mjs';
const levels=JSON.parse(readFileSync(new URL('../public/ballistic-levels.json',import.meta.url),'utf8'));
const simple=()=>{const g=createGame(levels[0]);g.bricks=[{x:250,y:250,w:40,h:15,color:'#f00',hp:1,solid:false},{x:400,y:100,w:20,h:15,color:'#fff',hp:1,solid:false}];g.remaining=2;launch(g);return g};
test('50 distinct sourced layouts, Manchester United first, 20 crests and 30 flags',()=>{
 assert.equal(levels.length,50);assert.equal(levels[0].name,'Manchester United');
 assert.equal(levels.filter(l=>l.kind==='Club crest').length,20);assert.equal(levels.filter(l=>l.kind==='National flag').length,30);
 assert.equal(new Set(levels.map(l=>l.name)).size,50);assert.equal(new Set(levels.map(l=>JSON.stringify([l.rows,l.palette]))).size,50);
 for(const [i,l] of levels.entries()){
  assert.equal(l.id,i+1);assert.ok(existsSync(new URL('../public/ballistic-art/'+l.file,import.meta.url)));
  const bricks=bricksFor(l);assert.ok(bricks.length>100);assert.ok(bricks.every(b=>b.color&&b.x>=12&&b.x+b.w<=WIDTH-12&&b.y+b.h<PADDLE_Y-100));
  assert.equal(createGame(l).remaining,bricks.filter(b=>!b.solid).length);
 }
 assert.ok(createGame(levels[49]).speed>createGame(levels[0]).speed);
 assert.ok(createGame(levels[49]).width<createGame(levels[0]).width);
});
test('ready waits for launch; paddle tracks input and stays inside the court',()=>{
 const g=createGame(levels[0]);move(g,-999);tick(g,.1);assert.equal(g.phase,'ready');assert.ok(g.balls[0].attached);
 assert.ok(g.target>=g.width/2+12);assert.equal(g.balls[0].x,g.paddle);
 launch(g);const y=g.balls[0].y;tick(g,.05);assert.ok(g.balls[0].y<y);
});
test('paddle reflects downward balls upwards and catch releases on launch',()=>{
 const g=simple();g.balls[0].x=g.paddle;g.balls[0].y=PADDLE_Y-6;g.balls[0].vy=250;g.balls[0].vx=0;
 tick(g,.02);assert.ok(g.balls[0].vy<0);
 applyPower(g,'catch');g.balls[0].y=PADDLE_Y-6;g.balls[0].vy=250;tick(g,.02);assert.ok(g.balls[0].attached);
 launch(g);assert.equal(g.balls[0].attached,false);
});
test('normal hits, armour, blue penetration, mega damage and shrink scoring',()=>{
 for(const [power,hp,expectedHp,bounce] of [[null,1,0,true],[null,3,2,true],['blue',3,0,false],['mega',3,0,true],['shrink',1,0,true]]){
  const g=simple();if(power)applyPower(g,power);g.bricks[0].hp=hp;
  const b=g.balls[0];b.x=270;b.y=285;b.vx=0;b.vy=-260;
  tick(g,.1);assert.equal(g.bricks[0].hp<=0?0:g.bricks[0].hp,expectedHp);
  assert.equal(b.vy>0,bounce);if(expectedHp===0)assert.equal(g.score,power==='shrink'?150:50);
 }
});
test('all ten powers exist, resize effects expire and extra lives cap at nine',()=>{
 assert.equal(POWERS.length,10);const g=simple(),width=g.width;
 applyPower(g,'wide');assert.ok(g.width>width);applyPower(g,'shrink');assert.ok(g.width<width);assert.equal(g.effects.wide,undefined);
 g.effects.shrink=.01;tick(g,.02);assert.equal(g.width,width);
 g.lives=9;applyPower(g,'life');assert.equal(g.lives,9);g.lives=3;applyPower(g,'life');assert.equal(g.lives,4);
});
test('3 and 8 ball splits and regenerating two-ball behave correctly',()=>{
 const g=simple();applyPower(g,'triple');assert.equal(g.balls.length,3);applyPower(g,'eight');assert.equal(g.balls.length,8);applyPower(g,'eight');assert.equal(g.balls.length,8);
 const two=simple();applyPower(two,'two');assert.equal(two.balls.length,2);two.balls[0].y=HEIGHT+100;tick(two,.01);assert.equal(two.balls.length,2);assert.equal(two.lives,3);
 two.balls.forEach(b=>b.y=HEIGHT+100);tick(two,.01);assert.equal(two.lives,2);assert.equal(two.two,false);assert.equal(two.phase,'ready');
});
test('lasers shoot in pairs, respect cooldown and damage bricks',()=>{
 const g=simple();fire(g);assert.equal(g.lasers.length,0);applyPower(g,'laser');fire(g);assert.equal(g.lasers.length,2);fire(g);assert.equal(g.lasers.length,2);
 g.lasers=[{x:270,y:275}];tick(g,.03);assert.equal(g.bricks[0].hp,0);
});
test('catching a falling capsule applies its power',()=>{
 const g=simple();g.drops=[{id:'life',x:g.paddle,y:PADDLE_Y-9}];tick(g,.02);assert.equal(g.lives,4);assert.equal(g.drops.length,0);
});
test('last-ball loss consumes one life, clears power-ups, and ends at zero lives',()=>{
 const g=simple();g.lives=1;applyPower(g,'wide');g.balls[0].y=HEIGHT+100;tick(g,.01);
 assert.equal(g.phase,'over');assert.equal(g.lives,0);assert.deepEqual(g.effects,{});
 const snapshot=JSON.stringify(g);tick(g,.1);assert.equal(JSON.stringify(g),snapshot);
});
test('clear ignores steel bumpers, awards bonus once, unlocks next level and caps at 50',()=>{
 const g=simple();g.bricks=[{x:100,y:100,w:14,h:14,hp:Infinity,solid:true,color:'#888'}];g.remaining=0;
 tick(g,.01);assert.equal(g.phase,'won');assert.equal(g.score,1100);tick(g,.1);assert.equal(g.score,1100);
 assert.deepEqual(recordResult(null,g),{version:1,unlocked:2,best:1100,completed:false});
 assert.equal(recordResult(null,{...g,level:{id:50}}).completed,true);assert.equal(recordResult(null,{...g,level:{id:50}}).unlocked,50);
 assert.equal(recordResult(null,{...g,phase:'over',level:{id:20}}).unlocked,1);
 assert.equal(normaliseSave({unlocked:999,best:NaN}).unlocked,50);
});
test('every level runs all-ball power-ups without nonfinite physics or runaway ball counts',()=>{
 for(const level of levels){const g=createGame(level);launch(g);applyPower(g,'eight');applyPower(g,'mega');applyPower(g,'blue');
  for(let i=0;i<120;i++){move(g,g.balls[0]?.x||WIDTH/2);tick(g,1/60);if(g.phase==='ready')launch(g)}
  assert.ok(g.balls.length<=8);assert.ok(g.balls.every(b=>Number.isFinite(b.x)&&Number.isFinite(b.y)&&Number.isFinite(b.vx)&&Number.isFinite(b.vy)));
 }
});
