import {PARTS,cleanTune} from './tuning-data.mjs';
import {paintBody,drawNumber,drawStripe} from './car-paint.mjs';
import {findWheels,drawWheels} from './car-wheels.mjs';
const cache=new Map();
const wheelGeometry=new Map();
function recolor(image,tune){
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=92;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=false;ctx.drawImage(image,0,0,256,92);
 const pixels=ctx.getImageData(0,0,256,92),data=pixels.data;
 const id=image.dataset.carId;
 if(!wheelGeometry.has(id))wheelGeometry.set(id,findWheels(data,id));
 const wheels=wheelGeometry.get(id);
 const paint=PARTS.paint.find(p=>p.id===tune.paint);
 if(paint){paintBody(data,paint.color,image.dataset.carId,wheels);ctx.putImageData(pixels,0,0);
 }
 if(tune.decal!=='none'){
  ctx.save();ctx.globalCompositeOperation='source-atop';ctx.fillStyle='#f7f3da';
  if(tune.decal==='stripe')drawStripe(ctx);
  if(tune.decal==='bolt'){ctx.beginPath();ctx.moveTo(105,55);ctx.lineTo(150,55);ctx.lineTo(129,63);ctx.lineTo(160,63);ctx.lineTo(115,74);ctx.lineTo(129,65);ctx.lineTo(99,65);ctx.fill()}
  if(tune.decal==='number')drawNumber(ctx);ctx.restore();
 }
 if(tune.wheels)drawWheels(ctx,wheels,tune.wheels);
 return canvas.toDataURL('image/png');
}
export function customizeCars(root,save){
 for(const img of root.querySelectorAll('img[data-car-id]')){
  const tune=cleanTune(save.tuning?.[img.dataset.carId]);if(tune.paint==='stock'&&tune.decal==='none'&&!tune.wheels)continue;
  const key=img.dataset.carId+JSON.stringify(tune);const original=img.src;
  const apply=()=>{if(!img.isConnected)return;try{if(!cache.has(key))cache.set(key,recolor(img,tune));img.src=cache.get(key)}catch{img.src=original}};
  if(img.complete&&img.naturalWidth)apply();else img.addEventListener('load',apply,{once:true});
 }
}
