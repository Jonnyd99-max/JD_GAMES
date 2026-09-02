// Wheel centres in the original 256×92 sprites, not viewport-relative guesses.
const centres={
 starter:[[58,68,192,68],[55,70,186,70],[59,70,194,70],[57,70,198,70],[59,69,197,69]],
 roadster:[[53,67,203,67],[54,69,198,69],[55,70,198,70],[63,71,199,71],[52,69,203,69]],
 muscle:[[65,70,199,70],[61,69,203,69],[62,70,202,70],[60,69,203,69],[60,68,206,68]],
 race:[[60,71,188,71],[61,70,199,70],[55,72,192,72],[52,67,194,70],[61,70,202,70]],
 super:[[52,68,189,69],[51,69,189,69],[51,67,190,68],[56,67,192,67],[48,67,187,68]]
};
export function findWheels(data,id){
 const [group,variant]=id.split('-'),seed=centres[group]?.[Number(variant)]||centres.starter[0];
 const light=(x,y)=>{x=Math.round(x);y=Math.round(y);if(x<0||x>=256||y<0||y>=92)return 0;const i=(y*256+x)*4;return data[i+3]<128?0:(data[i]+data[i+1]+data[i+2])/3};
 return [0,2].map(index=>{
  let best={score:-Infinity,x:seed[index],y:seed[index+1],radius:14};
  // Fit the bright outer rim against its dark rubber surround. This also handles
  // different front/rear diameters, low-profile tyres and off-centre source sheets.
  for(let x=seed[index]-7;x<=seed[index]+7;x++)for(let y=seed[index+1]-5;y<=seed[index+1]+5;y++)for(let radius=10;radius<=17;radius+=.5){
   let score=0;for(let n=0;n<40;n++){const a=n*Math.PI/20,c=Math.cos(a),s=Math.sin(a);score+=light(x+c*radius,y+s*radius)-light(x+c*(radius+2),y+s*(radius+2))*.85}
   score=score/40-Math.hypot(x-seed[index],y-seed[index+1])*.5;
   if(score>best.score)best={score,x,y,radius:radius+1};
  }
  return {x:best.x,y:best.y,radius:best.radius};
 });
}
export function drawWheels(ctx,wheels,stage){
 const spokes=[0,5,6,10][stage];if(!spokes)return;
 // Every pixel of the old rim is overwritten before drawing the new face.
 // Draw on the integer sprite grid: no blurred circles or fractional spokes.
 for(const w of wheels){
  const radius=w.radius;
  for(let y=Math.floor(w.y-radius);y<=Math.ceil(w.y+radius);y++)for(let x=Math.floor(w.x-radius);x<=Math.ceil(w.x+radius);x++){
   const dx=x-w.x,dy=y-w.y,d=Math.hypot(dx,dy);if(d>radius)continue;
   const angle=Math.atan2(dy,dx),sector=Math.PI*2/spokes;
   const spokeDistance=Math.abs(Math.sin(Math.round(angle/sector)*sector-angle))*d;
   const spoke=stage===3?Math.min(spokeDistance,Math.abs(Math.sin(Math.round((angle+.17)/sector)*sector-angle-.17))*d)<.8:spokeDistance<(stage===1?1.6:1.15);
   let color='#111923';
   if(d>radius-1)color='#10151b';
   else if(d>radius-2.5)color=dy<0?'#edf5f8':'#9aadb9';
   else if(d<2.5)color='#c5d3dc';
   else if(spoke)color=stage===3?(dy<0?'#f5dba0':'#b18c4b'):(dy<0?'#e9f1f5':'#9bafc0');
   ctx.fillStyle=color;ctx.fillRect(x,y,1,1);
  }
 }
}
