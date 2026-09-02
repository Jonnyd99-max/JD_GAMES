const dataUrl=new URL('./dealership-data.mjs',import.meta.url);dataUrl.search=new URL(import.meta.url).search;
const {CLASSES,CARS,getCar,normaliseSave}=await import(dataUrl.href);
const tuningUrl=new URL('./tuning-data.mjs',import.meta.url);tuningUrl.search=new URL(import.meta.url).search;
const {tunedCar}=await import(tuningUrl.href);
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
export const RIVAL_BUILDS=[
 {name:'Club entrant',engine:0,wheels:0,turbo:0,nitro:0},
 {name:'Street tuned',engine:1,wheels:1,turbo:0,nitro:0},
 {name:'Sport prepared',engine:2,wheels:1,turbo:1,nitro:1},
 {name:'Competition build',engine:2,wheels:2,turbo:2,nitro:1},
 {name:'Class champion',engine:3,wheels:3,turbo:3,nitro:2}
];
// Fixed quarter-mile benchmarks, calibrated against the real player drivetrain
// including shift delays. Rivals never scale to the player's purchased upgrades.
const TARGET_TIMES={starter:[14,12.5,11,10,9],roadster:[11.8,10.5,9.4,8.5,7.8],muscle:[11.1,9.9,8.9,8.1,7.4],race:[10.2,9.2,8.2,7.3,6.75],super:[9.5,8.6,7.65,6.9,6.35]};
export function opponentProfile(id){
 const base=getCar(id)||CARS[0],level=CLASSES.findIndex(c=>c.id===base.classId),build=RIVAL_BUILDS[base.variant],car=tunedCar(base,build);
 const targetSeconds=TARGET_TIMES[base.classId][base.variant],reaction=.45-base.variant*.075,launch=8+level*2+base.variant;
 const seconds=targetSeconds-reaction;
 const distance=acceleration=>{const ramp=Math.min(seconds,(car.topSpeed-launch)/acceleration);return (launch*ramp+.5*acceleration*ramp*ramp+car.topSpeed*(seconds-ramp))*.44704};
 let low=.1,high=200;for(let i=0;i<60;i++){const mid=(low+high)/2;if(distance(mid)<402.336)low=mid;else high=mid}
 return {id:car.id,reaction,launch,acceleration:(low+high)/2,topSpeed:car.topSpeed,hp:car.hp,weight:car.weight,build:{...build},targetSeconds};
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
