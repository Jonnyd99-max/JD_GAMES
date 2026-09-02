import test from 'node:test';
import assert from 'node:assert/strict';
import {race} from './tuning.test.mjs';
import {getCar} from '../public/dealership-data.mjs';
import {tunedCar} from '../public/tuning-data.mjs';
import {opponentProfile,advanceRace} from '../public/championship-data.mjs';
import {simulateBuild} from './race-balance.mjs';
test('lightly upgraded second cars cannot sweep any championship',()=>{
 for(const cls of ['starter','roadster','muscle','race','super']){
  const tune={engine:1,wheels:1,turbo:1};
  assert.equal(simulateBuild(cls+'-1',tune,opponentProfile(cls+'-0')).win,true,cls+' early race remains accessible');
  for(const opponent of [2,3,4])assert.equal(simulateBuild(cls+'-1',tune,opponentProfile(cls+'-'+opponent)).win,false,cls+' later race requires stronger build');
 }
});
test('class champions defeat mid-tier entry builds but remain beatable with a developed car',()=>{
 for(const cls of ['starter','roadster','muscle','race','super']){
  const rival=opponentProfile(cls+'-4');
  assert.equal(simulateBuild(cls+'-0',{engine:2,wheels:2,turbo:2,nitro:1},rival).win,false,cls+' mid-tier does not beat champion');
  assert.equal(simulateBuild(cls+'-0',{engine:3,wheels:3,turbo:3,nitro:2},rival).win,true,cls+' fully upgraded entry car has a path to victory');
 }
});
test('actual opponent finishing times match displayed targets and get faster each race',()=>{
 for(const cls of ['starter','roadster','muscle','race','super']){let previous=Infinity;
  for(let i=0;i<5;i++){const p=opponentProfile(cls+'-'+i),state={dist:0,cpu:0,time:0};let result=null;while(result===null)result=advanceRace(state,.02,0,p);assert.equal(result,false);assert.ok(Math.abs(state.time-p.targetSeconds)<.025);assert.ok(state.time<previous);previous=state.time;}
 }
});
test('each class can be completed with its entry car and available upgrades',()=>{
 for(const cls of ['starter','roadster','muscle','race','super']){
  const r=race(),car=tunedCar(getCar(cls+'-0'),{engine:3,wheels:3,turbo:3,nitro:2});
  r.dispatch({type:'jd:vehicle',detail:car});r.dispatch({type:'jd:opponent',detail:{profile:opponentProfile(cls+'-4'),advance:advanceRace}});
  Object.assign(r.context.state,{dist:0,cpu:0,time:0,phase:'GO',gear:1,speed:12,rpm:3000,last:1000,nitroRemaining:4});r.context.keys.add('KeyN');
  for(let i=1;i<1600&&r.context.state.phase==='GO';i++){if(r.context.state.rpm>6400&&r.context.state.gear<5)r.context.shift(r.context.state.gear+1);r.step(1000+i*35)}
  assert.equal(r.context.state.phase,'FINISHED',cls+' race completes');assert.equal(r.context.state.raceWin,true,cls+' entry car can beat final opponent with upgrades');
 }
});
test('the first opponent is beatable with the free starter and no upgrades',()=>{
 const r=race();r.dispatch({type:'jd:opponent',detail:{profile:opponentProfile('starter-0'),advance:advanceRace}});
 Object.assign(r.context.state,{dist:0,cpu:0,time:0,phase:'GO',gear:1,speed:12,rpm:3000,last:1000,nitroRemaining:0});
 for(let i=1;i<1600&&r.context.state.phase==='GO';i++){if(r.context.state.rpm>6400&&r.context.state.gear<5)r.context.shift(r.context.state.gear+1);r.step(1000+i*35)}
 assert.equal(r.context.state.raceWin,true);
});
