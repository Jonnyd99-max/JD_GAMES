// Search only legal flap/no-flap inputs, then replay the winning route in tests.
import {createGame,flap,tick,KING_X,RADIUS} from '../public/flappy-king-model.mjs';
export function findRoute(level){
  const first=createGame(level);flap(first);
  let beam=[{game:first,path:'',lastFlap:-12}];
  for(let frame=0;frame<60*45;frame++){
    const buckets=new Map();
    for(const node of beam)for(const pressed of [false,true]){
      if(pressed&&frame-node.lastFlap<12)continue;
      const game={...node.game,towers:node.game.towers.map(t=>({...t}))};
      if(pressed)flap(game);tick(game,1/60);
      if(game.phase==='crashed')continue;
      const path=node.path+(pressed?'1':'0');
      if(game.phase==='rescued')return path;
      const lastFlap=pressed?frame:node.lastFlap;
      const key=`${Math.round(game.y/2)}:${Math.round(game.vy/12)}:${Math.min(12,frame-lastFlap)}`;
      if(buckets.has(key))continue;
      const next=game.towers.find(t=>t.x+t.width-game.distance>=KING_X-RADIUS);
      const target=next?.centre??game.goalY;
      buckets.set(key,{game,path,lastFlap,score:Math.abs(game.y-target)+Math.abs(game.vy)*.035});
    }
    beam=[...buckets.values()].sort((a,b)=>a.score-b.score).slice(0,350);
    if(!beam.length)return null;
  }
  return null;
}
