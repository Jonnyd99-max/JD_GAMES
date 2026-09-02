import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CARS,racePrize,raceReward,normaliseSave,awardRace} from '../public/dealership-data.mjs';
test('base prize increases by 250 for each of the 25 stages, including class boundaries',()=>{
 CARS.forEach((car,index)=>assert.equal(racePrize(car.id),1500+index*250));
 assert.equal(racePrize('super-4'),7500);
});
test('winning bonuses add to the correct stage prize; losses pay a quarter without bonuses',()=>{
 for(const car of CARS){const base=racePrize(car.id);assert.equal(raceReward({opponentId:car.id,win:true,perfect:5,launch:'PERFECT'}),base+800);assert.equal(raceReward({opponentId:car.id,win:false,perfect:5,launch:'PERFECT'}),Math.floor(base/4))}
});
test('replay prizes stay fixed and the awarded credits are persisted in the resulting save',()=>{
 let save=normaliseSave();for(let i=0;i<2;i++){const r=awardRace(save,{opponentId:'roadster-3',win:true});assert.equal(r.reward,3500);save=r.save}assert.equal(save.credits,17000);
 const lost=awardRace(save,{opponentId:'super-4',win:false});assert.equal(lost.reward,1875);assert.equal(lost.save.credits,18875);assert.deepEqual(lost.save.championship.wins,[]);
});
test('old or unknown race identifiers safely use the starter prize',()=>{
 assert.equal(racePrize(),1500);assert.equal(racePrize('missing'),1500);assert.equal(raceReward({win:false}),375);
});
test('reward uses the completed race opponent rather than current menu selection',()=>{
 const source=readFileSync(new URL('../public/dealership.js',import.meta.url),'utf8');assert.ok(source.includes('awardRace(garageSave,{...e.detail,opponentId:attempt?.opponentId})'));
});
