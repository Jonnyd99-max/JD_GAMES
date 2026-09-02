const hue=(r,g,b)=>{const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;return d===0?0:((max===r?(g-b)/d:max===g?(b-r)/d+2:(r-g)/d+4)*60+360)%360};
const distance=(a,b)=>Math.min(Math.abs(a-b),360-Math.abs(a-b));
const inside=(x,y,points)=>{let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit}return hit};
// Interior glazing only, never the roof, pillars, spoilers or painted bumpers.
const glass={
 starter:[[70,34],[88,20],[125,20],[151,34]],
 roadster:[[105,39],[119,26],[146,38]],
 muscle:[[78,36],[95,23],[130,23],[156,36]],
 race:[[85,39],[105,29],[133,28],[154,40]],
 super:[[83,41],[112,28],[145,31],[171,43]]
};
export function paintBody(data,color,id,wheels=[]){
 const rgb=color.match(/\w\w/g).map(v=>parseInt(v,16)),hist=Array(36).fill(0);
 // Sample the door, not the glass: sprite colours differ from catalogue swatches.
 for(let y=48;y<72;y++)for(let x=85;x<171;x++){const i=(y*256+x)*4,max=Math.max(data[i],data[i+1],data[i+2]),min=Math.min(data[i],data[i+1],data[i+2]);if(data[i+3]>128&&max-min>28&&max>65)hist[Math.floor(hue(data[i],data[i+1],data[i+2])/10)]+=max-min}
 const peak=Math.max(...hist),bodyHue=hist.indexOf(peak)*10+5;
 const neutral=['starter-4','roadster-4','muscle-4','race-0','super-4'].includes(id)||peak===0;
 const glazing=glass[id.split('-')[0]]||glass.starter;
 for(let y=0;y<92;y++)for(let x=0;x<256;x++){
  const i=(y*256+x)*4,r=data[i],g=data[i+1],b=data[i+2],max=Math.max(r,g,b),min=Math.min(r,g,b),chroma=max-min;
  if(data[i+3]<128||max<25||wheels.some(w=>Math.hypot(x-w.x,y-w.y)<(w.radius||12)))continue;
  if(inside(x,y,glazing)&&(b>r*1.12||max<95))continue;
  // Small lamp lenses retain their original colour.
  if(((x<25&&y>35&&y<56)||(x>230&&y>43&&y<63))&&((r>g*1.4)||(r>170&&g>160&&b>140)))continue;
  const body=neutral?chroma<42&&max>65:chroma>8&&distance(hue(r,g,b),bodyHue)<60;
  if(!body)continue;
  // Use brightness rather than luminance so yellow/green sources don't wash out.
  const value=max/255,shade=.18+.82*value,highlight=Math.max(0,(value-.84)/.16)*.22;
  for(let c=0;c<3;c++)data[i+c]=Math.round(rgb[c]*shade*(1-highlight)+255*highlight);
 }
 return data;
}
const DIGITS={'0':['01110','11011','11011','11011','11011','11011','01110'],'7':['11111','00011','00011','00110','00110','01100','01100']};
export function drawNumber(ctx){
 // Integer-pixel motorsport plate and hand-set digits: no antialiased system font.
 ctx.fillStyle='#121c29';ctx.fillRect(114,51,29,23);ctx.fillRect(112,54,33,17);
 ctx.fillStyle='#f7f3da';ctx.fillRect(115,53,27,19);ctx.fillRect(114,55,29,15);
 ctx.fillStyle='#d83f35';ctx.fillRect(117,55,23,2);
 ctx.fillStyle='#172333';for(const [index,digit] of [...'07'].entries())for(let y=0;y<7;y++)for(let x=0;x<5;x++)if(DIGITS[digit][y][x]==='1')ctx.fillRect(118+index*12+x*2,58+y*2,2,2);
}
export function drawStripe(ctx){
 // Stepped two-tone sill graphic, with a tapered leading end and slash accents.
 ctx.fillStyle='#14202d';ctx.fillRect(76,64,104,9);ctx.fillRect(80,62,97,2);
 ctx.fillStyle='#f7f3da';ctx.fillRect(80,65,95,3);ctx.fillRect(84,64,91,1);ctx.fillRect(88,63,83,1);ctx.fillRect(80,70,95,1);
 ctx.fillStyle='#e64735';for(let n=0;n<3;n++)for(let y=0;y<7;y++)ctx.fillRect(150+n*8+y,64+y,3,1);
}
