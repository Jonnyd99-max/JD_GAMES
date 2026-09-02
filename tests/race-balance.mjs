import {race} from './tuning.test.mjs';
import {getCar} from '../public/dealership-data.mjs';
import {tunedCar} from '../public/tuning-data.mjs';
import {advanceRace} from '../public/championship-data.mjs';
export function simulateBuild(id,tune={},profile=null){
 const r=race(),car=tunedCar(getCar(id),tune);
 r.dispatch({type:'jd:vehicle',detail:car});
 r.dispatch({type:'jd:opponent',detail:{profile:profile||{reaction:0,launch:0,acceleration:0,topSpeed:0},advance:advanceRace}});
 Object.assign(r.context.state,{dist:0,cpu:0,time:0,phase:'GO',gear:1,speed:12,rpm:3000,last:1000,nitroRemaining:car.nitroSeconds});
 if(car.nitroSeconds)r.context.keys.add('KeyN');
 for(let i=1;i<2500&&r.context.state.phase==='GO';i++){
  if(r.context.state.rpm>6400&&r.context.state.gear<5)r.context.shift(r.context.state.gear+1);
  r.step(1000+i*20);
 }
 return {seconds:r.context.state.time,win:r.context.state.raceWin,phase:r.context.state.phase};
}
