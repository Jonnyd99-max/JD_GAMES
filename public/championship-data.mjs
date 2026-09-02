const dataUrl=new URL('./dealership-data.mjs',import.meta.url);dataUrl.search=new URL(import.meta.url).search;
const {CLASSES,CARS,getCar,normaliseSave}=await import(dataUrl.href);
export function championshipStatus(save){
 const wins=normaliseSave(save).championship.wins;let unlocked=true;
 return CLASSES.map(cls=>{const opponents=CARS.filter(c=>c.classId===cls.id),beaten=opponents.filter(c=>wins.includes(c.id)).length,complete=beaten===5;const status={...cls,opponents,beaten,complete,unlocked};unlocked=unlocked&&complete;return status});
}
export function canEnterRace(save,opponentId){
 const current=normaliseSave(save),opponent=getCar(opponentId);if(!opponent)return {ok:false,error:'Choose a valid opponent.'};
 const cls=championshipStatus(current).find(c=>c.id===opponent.classId);
 if(!cls.unlocked)return {ok:false,error:'Beat all five opponents in the previous class to earn your licence.'};
 if(getCar(current.selected).classId!==opponent.classId)return {ok:false,error:'Select an owned '+cls.name+' car to enter this championship.'};
 return {ok:true,opponent,playerId:current.selected};
}
export function recordChampionshipWin(save,{opponentId,playerId,win}){
 const current=normaliseSave(save);if(!win||!current.owned.includes(playerId))return {save:current,newWin:false,licence:null};
 const eligible=canEnterRace({...current,selected:playerId},opponentId);
 if(!eligible.ok||current.championship.wins.includes(opponentId))return {save:current,newWin:false,licence:null};
 const next={...current,championship:{wins:[...current.championship.wins,opponentId]}};
 const status=championshipStatus(next).find(c=>c.id===eligible.opponent.classId);
 const index=CLASSES.findIndex(c=>c.id===status.id);
 return {save:next,newWin:true,licence:status.complete?(CLASSES[index+1]?.name||'Champion'):null};
}
export function opponentProfile(id){
 const car=getCar(id)||CARS[0],level=CLASSES.findIndex(c=>c.id===car.classId);
 // Fixed opponents: no rubber-banding against the player's purchased upgrades.
 return {id:car.id,reaction:.65-car.variant*.07,launch:7+level*2,acceleration:(4.8+car.variant*.55)*car.acceleration,topSpeed:car.topSpeed*.8};
}
export function advanceRace(state,dt,previousDistance,profile){
 const beforeCpu=state.cpu||0,previousTime=state.time||0;
 const speed=t=>t<profile.reaction?0:Math.min(profile.topSpeed,profile.launch+Math.max(0,t-profile.reaction)*profile.acceleration);
 state.cpu=beforeCpu+(speed(previousTime)+speed(previousTime+dt))*.5*.44704*dt;
 state.time=previousTime+dt;
 const end=402.336;if(state.dist<end&&state.cpu<end)return null;
 const playerFraction=state.dist>=end?(end-previousDistance)/Math.max(1e-9,state.dist-previousDistance):Infinity;
 const cpuFraction=state.cpu>=end?(end-beforeCpu)/Math.max(1e-9,state.cpu-beforeCpu):Infinity;
 const won=playerFraction<cpuFraction,part=Math.max(0,Math.min(1,won?playerFraction:cpuFraction));
 state.dist=previousDistance+(state.dist-previousDistance)*part;state.cpu=beforeCpu+(state.cpu-beforeCpu)*part;state.time=previousTime+dt*part;
 if(won)state.dist=end;else state.cpu=Math.max(end,state.dist+1e-7);
 return won;
}
