import {cleanTune} from './tuning-data.mjs';
// Fictional cars, local-only credit economy, and the shared pixel car renderer.
export const CLASSES = [
  {id:'starter',name:'Starter',tag:'Every story starts here',description:'Lightweight street cars. Accessible, nimble, and ready for your first quarter mile.'},
  {id:'roadster',name:'Roadster',tag:'Open sky. Open throttle.',description:'Two seats, sculpted bodywork and a lighter touch. Your next step up from the street.'},
  {id:'muscle',name:'American Muscle',tag:'Built around the engine',description:'Long bonnets, wide stances and big power. Classic attitude with serious straight-line pace.'},
  {id:'race',name:'Race Car',tag:'Purpose-built for the line',description:'Stripped-back track machines with race aero, less weight and sharper acceleration.'},
  {id:'super',name:'Supercar',tag:'Nothing ordinary',description:'Low-slung flagships. Mid-engine silhouettes and the strongest performance in the showroom.'},
];
// name, price (credits), horsepower, kg, mph at redline in fifth, drive, paint, body style
const rows = [
  ['starter',[
    ['JD-R S1',0,150,1150,120,'FWD','#39d66f','Street coupe'],
    ['Metro RS',2500,165,1080,125,'FWD','#f2be42','Hot hatch'],
    ['Alto GT',4000,185,1240,132,'RWD','#58addd','Sport saloon'],
    ['Comet SX',6500,205,1180,140,'RWD','#e96649','Fastback'],
    ['Retro XR',8500,220,1130,145,'RWD','#d9d6cb','Club coupe'],
  ]],
  ['roadster',[
    ['Solstice R',12000,235,1090,150,'RWD','#ffbe42','Open-top roadster'],
    ['Coastline S',15000,260,1110,155,'RWD','#43c8c0','Targa'],
    ['Aero Two',18500,280,980,162,'RWD','#69a6ec','Speedster'],
    ['Ventura Spyder',22000,310,1120,169,'RWD','#da625c','Long-nose spyder'],
    ['Halo Roadster',26000,335,1160,175,'RWD','#dce5e8','Touring roadster'],
  ]],
  ['muscle',[
    ['Iron V8',32000,380,1530,176,'RWD','#dc5b38','Classic coupe'],
    ['Stampede 440',38000,425,1490,182,'RWD','#7397d9','Muscle fastback'],
    ['Outlaw SS',45000,465,1550,187,'RWD','#e4ad32','Supercharged coupe'],
    ['Thunder GT',52000,510,1620,193,'RWD','#9c64bd','Widebody muscle'],
    ['Hellion R',60000,550,1570,199,'RWD','#b4c4c5','Drag special'],
  ]],
  ['race',[
    ['Apex Cup',75000,370,990,185,'RWD','#f6f0db','Cup racer'],
    ['Vortex Touring',88000,425,1080,192,'AWD','#54b6d1','Touring racer'],
    ['Stratus GT3',105000,490,1130,201,'RWD','#f16939','GT racer'],
    ['Vector LM',125000,550,1000,210,'RWD','#b0d84e','Endurance racer'],
    ['Phantom RX',145000,590,1050,216,'AWD','#cd5a6b','Time-attack racer'],
  ]],
  ['super',[
    ['Zenith S',180000,620,1370,223,'RWD','#eab62c','Mid-engine supercar'],
    ['Eclipse V12',205000,680,1450,232,'AWD','#e5594c','V12 flagship'],
    ['Nova R',235000,740,1380,241,'AWD','#7294ef','Aero supercar'],
    ['Pulse X',270000,820,1330,251,'AWD','#45c5ab','Track supercar'],
    ['Astral One',320000,950,1420,265,'AWD','#e4e8ed','Hypercar'],
  ]],
];
export const CARS = rows.flatMap(([classId,items])=>items.map((r,variant)=>({
  id:`${classId}-${variant}`,classId,variant,name:r[0],price:r[1],hp:r[2],weight:r[3],topSpeed:r[4],drive:r[5],color:r[6],body:r[7],
  acceleration:Math.sqrt((r[2]/r[3])/(150/1150)),
})));
export const STARTER_ID='starter-0';
export const SAVE_KEY='jd-garage-v1';
export const STARTING_CREDITS=10000;
export const getCar=id=>CARS.find(c=>c.id===id);
export const credits=n=>Math.round(n).toLocaleString('en-GB');
export function normaliseSave(raw){
  const input=raw&&typeof raw==='object'?raw:{};
  const owned=[...new Set([STARTER_ID,...(Array.isArray(input.owned)?input.owned:[])])].filter(id=>getCar(id));
  return {version:1,credits:Number.isSafeInteger(input.credits)&&input.credits>=0?input.credits:STARTING_CREDITS,
    owned,selected:owned.includes(input.selected)?input.selected:STARTER_ID,
    tuning:Object.fromEntries(owned.filter(id=>input.tuning?.[id]).map(id=>[id,cleanTune(input.tuning[id])]))};
}
export function purchaseCar(save,id){
  const car=getCar(id),current=normaliseSave(save);
  if(!car)return {ok:false,error:'Car not found.'};
  if(current.owned.includes(id))return {ok:false,error:'You already own this car.'};
  if(current.credits<car.price)return {ok:false,error:`You need ${credits(car.price-current.credits)} more credits.`};
  return {ok:true,save:{...current,credits:current.credits-car.price,owned:[...current.owned,id],selected:id}};
}
export function selectCar(save,id){
  const current=normaliseSave(save);
  if(!current.owned.includes(id))return {ok:false,error:'Purchase this car before selecting it.'};
  return {ok:true,save:{...current,selected:id}};
}
export function raceReward({win=false,perfect=0,launch=''}){
  if(!win)return 0;
  return 1500+Math.min(5,Math.max(0,Math.floor(Number(perfect)||0)))*100+(launch==='PERFECT'?300:0);
}
export const resaleValue=car=>Math.floor(car.price*.6);
export function sellCar(save,id){
  const current=normaliseSave(save),car=getCar(id);
  if(!car||!current.owned.includes(id))return {ok:false,error:'You do not own this car.'};
  if(id===STARTER_ID)return {ok:false,error:'Your original car stays in your garage.'};
  return {ok:true,save:{...current,credits:Math.min(Number.MAX_SAFE_INTEGER,current.credits+resaleValue(car)),
    tuning:Object.fromEntries(Object.entries(current.tuning).filter(([key])=>key!==id)),
    owned:current.owned.filter(ownedId=>ownedId!==id),selected:current.selected===id?STARTER_ID:current.selected}};
}
export function awardRace(save,result){
  const current=normaliseSave(save),reward=raceReward(result);
  return {reward,save:{...current,credits:Math.min(Number.MAX_SAFE_INTEGER,current.credits+reward)}};
}

// Generated, transparent 16-bit sprites share the same geometry in every game view.
export function carArt(car){
  const chosen=getCar(car?.id)||getCar(STARTER_ID);
  const url=new URL(`./cars/pixel/${chosen.id}.png`,import.meta.url);
  url.search=new URL(import.meta.url).search;
  return `<img class="pixel-car" src="${url.href}" width="256" height="92" alt="" aria-hidden="true" draggable="false" decoding="async" data-car-id="${chosen.id}">`;
}
