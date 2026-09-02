export const PARTS={
 engine:[{id:1,name:'Street engine',price:1800,power:.18,weight:35},{id:2,name:'Forged engine',price:4500,power:.38,weight:75},{id:3,name:'Competition engine',price:9000,power:.65,weight:120}],
 wheels:[{id:1,name:'Five-spoke alloys',price:800,acceleration:.05,weight:15},{id:2,name:'Lightweight six-spoke',price:2200,acceleration:.10,weight:30},{id:3,name:'Forged mesh alloys',price:4800,acceleration:.16,weight:45}],
 nitro:[{id:1,name:'Single bottle',price:2500,seconds:2},{id:2,name:'Twin bottles',price:6000,seconds:4}],
 turbo:[{id:1,name:'Street turbo',price:2200,power:.15,weight:10,mph:12},{id:2,name:'Ball-bearing turbo',price:5500,power:.32,weight:25,mph:25},{id:3,name:'Competition turbo',price:11000,power:.55,weight:40,mph:40}],
 paint:[{id:'red',name:'Signal red',color:'#ef4545',price:100},{id:'blue',name:'Electric blue',color:'#4085ee',price:100},{id:'green',name:'Acid green',color:'#64df55',price:100},{id:'yellow',name:'Sunburst yellow',color:'#f6c843',price:100},{id:'purple',name:'Midnight purple',color:'#a968dd',price:100},{id:'white',name:'Pearl white',color:'#e4e8ed',price:100},{id:'black',name:'Graphite black',color:'#484e57',price:100}],
 decal:[{id:'none',name:'Remove decal',price:0},{id:'stripe',name:'Speed stripe',price:250},{id:'bolt',name:'Lightning bolt',price:500},{id:'number',name:'Race number 07',price:750}]
};
export function cleanTune(raw={}){const t={};for(const key of Object.keys(PARTS)){const match=PARTS[key].find(p=>p.id===raw?.[key]);t[key]=match?.id??(key==='paint'?'stock':key==='decal'?'none':0)}return t}
export function tunedCar(car,raw){const t=cleanTune(raw),part=k=>PARTS[k].find(p=>p.id===t[k])||{};
 const hp=Math.round(car.hp*(1+(part('engine').power||0)+(part('turbo').power||0)));
 const weight=Math.max(600,car.weight-(part('engine').weight||0)-(part('wheels').weight||0)-(part('turbo').weight||0));
 return {...car,hp,weight,topSpeed:car.topSpeed+(part('turbo').mph||0),acceleration:Math.sqrt((hp/weight)/(150/1150))*(1+(part('wheels').acceleration||0)),nitroSeconds:part('nitro').seconds||0,tune:t};
}
export function buyPart(save,carId,category,id){
 if(!save.owned.includes(carId))return {ok:false,error:'Choose a car you own.'};
 const part=PARTS[category]?.find(p=>p.id===id),current=cleanTune(save.tuning?.[carId]);
 if(!part)return {ok:false,error:'Part not found.'};
 if(current[category]===id||(['engine','wheels','nitro','turbo'].includes(category)&&current[category]>=id))return {ok:false,error:'This stage is already installed or superseded.'};
 if(save.credits<part.price)return {ok:false,error:'Not enough credits for this upgrade.'};
 return {ok:true,save:{...save,credits:save.credits-part.price,tuning:{...save.tuning,[carId]:{...current,[category]:id}}}};
}
// Simulation-time charge: pausing or returning to a menu cannot burn fuel.
export function tickNitro(remaining,dt,active){const used=active?Math.min(Math.max(0,remaining),Math.max(0,dt)):0;return {remaining:Math.max(0,remaining-used),multiplier:dt>0?1+.65*used/dt:1}}
