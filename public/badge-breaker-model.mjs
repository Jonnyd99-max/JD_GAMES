export const WIDTH=576,HEIGHT=720,PADDLE_Y=670,SAVE_KEY='jd-badge-breaker-v1';
export const POWERS=Object.freeze([
 ['wide','W','Wide paddle','A wider paddle for 20 seconds.','#54d9a1'],
 ['life','+','Extra life','Adds one life, up to nine.','#fc7baa'],
 ['catch','C','Catch','Catch balls on the paddle; launch again to release. Lasts 20 seconds.','#ffd278'],
 ['laser','L','Lasers','Hold Space or FIRE to shoot for 20 seconds.','#f47763'],
 ['triple','3','Triple ball','Split into three balls.','#8da9ff'],
 ['eight','8','Eight ball','Split into eight balls.','#b994ff'],
 ['shrink','S','Small paddle ×3','Smaller paddle, triple brick points for 20 seconds.','#ff9b57'],
 ['mega','M','Mega Ball','Larger, harder-hitting balls for 18 seconds.','#ffe15c'],
 ['blue','B','Blue Ball','Smash through breakable bricks without bouncing for 14 seconds.','#57d5ff'],
 ['two','2','Regenerating Two Ball','A lost ball regenerates while another survives. Ends if all balls are lost.','#77f2d5'],
].map(([id,code,name,description,color])=>Object.freeze({id,code,name,description,color})));
const chars='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
export const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function normaliseSave(v){return {version:1,unlocked:clamp(Number.isInteger(v?.unlocked)?v.unlocked:1,1,50),best:clamp(Number.isFinite(v?.best)?Math.floor(v.best):0,0,999999999),completed:!!v?.completed}}
export function recordResult(save,g){const s=normaliseSave(save);s.best=Math.max(s.best,g.score);if(g.phase==='won'){s.unlocked=Math.max(s.unlocked,Math.min(50,g.level.id+1));if(g.level.id===50)s.completed=true}return s}
export function bricksFor(level){
 const bricks=[];
 level.rows.forEach((row,y)=>[...row].forEach((c,x)=>{if(c!=='.')bricks.push({x:48+x*15,y:70+y*15,w:14,h:14,color:level.palette[chars.indexOf(c)],hp:level.id>=6&&(x*7+y*11)%Math.max(5,15-Math.floor(level.id/5))===0?3:1,solid:false})}));
 // Side bumpers never enclose the artwork or count towards completion.
 if(level.id>=10)for(const x of [20,542])for(let y=160;y<460;y+=75)bricks.push({x,y,w:14,h:30,color:'#8694a9',hp:Infinity,solid:true});
 return bricks;
}
export function createGame(level,carry={}){
 const g={level,phase:'ready',score:Math.max(0,carry.score||0),lives:clamp(carry.lives??3,1,9),time:0,
  paddle:WIDTH/2,target:WIDTH/2,width:104-Math.min(28,Math.floor((level.id-1)/2)),baseWidth:104-Math.min(28,Math.floor((level.id-1)/2)),
  speed:260+(level.id-1)*5,bricks:bricksFor(level),balls:[],drops:[],lasers:[],effects:{},two:false,shot:0,hits:0,seed:level.id*1009,events:[]};
 g.remaining=g.bricks.filter(b=>!b.solid).length;g.balls=[newBall(g,true)];return g;
}
function random(g){g.seed=(Math.imul(g.seed,1664525)+1013904223)>>>0;return g.seed/4294967296}
function newBall(g,attached=false,x=g.paddle,y=PADDLE_Y-8,angle=-Math.PI/2+.18){return {x,y,vx:Math.cos(angle)*g.speed,vy:Math.sin(angle)*g.speed,attached,offset:0,inside:new Set()}}
export function move(g,x){g.target=clamp(x,12+g.width/2,WIDTH-12-g.width/2)}
export function launch(g){if(g.phase==='ready')g.phase='playing';if(g.phase!=='playing')return;for(const b of g.balls)if(b.attached){b.attached=false;b.vx=g.speed*.2;b.vy=-Math.sqrt(g.speed*g.speed-b.vx*b.vx)}fire(g)}
export function fire(g){if(g.phase!=='playing'||!g.effects.laser||g.shot>0)return;for(const x of [g.paddle-g.width/2+6,g.paddle+g.width/2-6])g.lasers.push({x,y:PADDLE_Y-5});g.shot=.22;g.events.push('laser')}
function split(g,count){
 const source=g.balls.find(b=>!b.attached)||g.balls[0]||newBall(g);
 while(g.balls.length<count){const angle=-Math.PI*.87+random(g)*Math.PI*.74;g.balls.push(newBall(g,false,source.x,source.y,angle))}
}
export function applyPower(g,id){
 if(!POWERS.some(p=>p.id===id))return;
 if(id==='life')g.lives=Math.min(9,g.lives+1);
 else if(id==='triple'||id==='eight')split(g,id==='triple'?3:8);
 else if(id==='two'){g.two=true;split(g,2)}
 else{g.effects[id]=id==='blue'?14:id==='mega'?18:20;if(id==='wide')delete g.effects.shrink;if(id==='shrink')delete g.effects.wide}
 g.width=g.effects.wide?g.baseWidth*1.5:g.effects.shrink?g.baseWidth*.62:g.baseWidth;
 move(g,g.target);g.events.push('power:'+id);
}
function hit(g,brick,damage=1){
 if(brick.solid||brick.hp<=0)return;
 brick.hp-=damage;g.events.push('brick');
 if(brick.hp<=0){g.remaining--;g.hits++;g.score+=50*(g.effects.shrink?3:1);
  // Regular, seeded drops; every ability is available from the first level.
  if(g.hits%5===0||random(g)<.035){const power=POWERS[(Math.floor(g.hits/5)+g.level.id-1)%POWERS.length];g.drops.push({x:brick.x+7,y:brick.y+7,id:power.id})}
 }
}
function circleRect(b,r,rect){const dx=b.x-clamp(b.x,rect.x,rect.x+rect.w),dy=b.y-clamp(b.y,rect.y,rect.y+rect.h);return dx*dx+dy*dy<r*r}
export function tick(g,seconds,{direction=0,shoot=false}={}){
 if(!['playing','ready'].includes(g.phase)||!Number.isFinite(seconds)||seconds<=0)return;
 let left=Math.min(seconds,.1);
 while(left>0&&['playing','ready'].includes(g.phase)){
  const dt=Math.min(left,1/240);left-=dt;
  if(direction)move(g,g.target+direction*550*dt);
  g.paddle+=clamp(g.target-g.paddle,-950*dt,950*dt);
  if(g.phase==='ready'){for(const b of g.balls){b.x=g.paddle;b.y=PADDLE_Y-8}continue}
  g.time+=dt;g.shot=Math.max(0,g.shot-dt);
  for(const key of Object.keys(g.effects)){g.effects[key]-=dt;if(g.effects[key]<=0)delete g.effects[key]}
  g.width=g.effects.wide?g.baseWidth*1.5:g.effects.shrink?g.baseWidth*.62:g.baseWidth;
  move(g,g.target);if(shoot)fire(g);
  const radius=g.effects.mega?12:5;
  for(const b of g.balls){
   if(b.attached){b.x=g.paddle+b.offset;b.y=PADDLE_Y-radius-1;continue}
   const prevX=b.x,prevY=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;
   if(b.x<12+radius){b.x=12+radius;b.vx=Math.abs(b.vx)}
   if(b.x>WIDTH-12-radius){b.x=WIDTH-12-radius;b.vx=-Math.abs(b.vx)}
   if(b.y<12+radius){b.y=12+radius;b.vy=Math.abs(b.vy)}
   if(b.vy>0&&prevY+radius<=PADDLE_Y&&b.y+radius>=PADDLE_Y&&Math.abs(b.x-g.paddle)<g.width/2+radius){
    b.y=PADDLE_Y-radius-1;const offset=clamp((b.x-g.paddle)/(g.width/2),-.95,.95);
    b.vx=g.speed*offset*.86;b.vy=-Math.sqrt(g.speed*g.speed-b.vx*b.vx);g.events.push('paddle');
    if(g.effects.catch){b.attached=true;b.offset=clamp(b.x-g.paddle,-g.width/2+radius,g.width/2-radius)}
   }
   const touching=new Set();let bounced=false;
   for(let i=0;i<g.bricks.length;i++){
    const brick=g.bricks[i];if(brick.hp<=0||!circleRect(b,radius,brick))continue;
    touching.add(i);if(b.inside.has(i))continue;
    hit(g,brick,g.effects.mega||g.effects.blue?3:1);
    if((brick.solid||!g.effects.blue)&&!bounced){
     if(prevY+radius<=brick.y||prevY-radius>=brick.y+brick.h){b.vy=-b.vy;b.y=prevY}
     else{b.vx=-b.vx;b.x=prevX}
     bounced=true;
    }
   }
   b.inside=touching;
  }
  g.balls=g.balls.filter(b=>b.y<HEIGHT+20);
  if(g.two&&g.balls.length===1)split(g,2);
  for(const laser of g.lasers){laser.y-=650*dt;for(const brick of g.bricks)if(brick.hp>0&&laser.x>=brick.x&&laser.x<=brick.x+brick.w&&laser.y>=brick.y&&laser.y<=brick.y+brick.h){hit(g,brick);laser.y=-99;break}}
  g.lasers=g.lasers.filter(l=>l.y>0);
  g.drops=g.drops.filter(drop=>{drop.y+=125*dt;if(drop.y>=PADDLE_Y-8&&drop.y<=PADDLE_Y+18&&Math.abs(drop.x-g.paddle)<g.width/2+10){applyPower(g,drop.id);return false}return drop.y<HEIGHT+20});
  if(g.remaining===0){g.phase='won';g.score+=1000+g.level.id*100;g.events.push('win');return}
  if(!g.balls.length){
   g.lives--;g.effects={};g.two=false;g.drops=[];g.lasers=[];g.width=g.baseWidth;g.events.push('lost');
   if(g.lives<=0){g.phase='over';return}
   g.phase='ready';g.balls=[newBall(g,true)];return;
  }
 }
}
