import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {CLASSES,CARS,STARTER_ID,STARTING_CREDITS,getCar,normaliseSave,purchaseCar,selectCar,sellCar,resaleValue,raceReward,awardRace,carArt} from '../public/dealership-data.mjs';

test('five classes each contain five unique cars',()=>{
  assert.equal(CLASSES.length,5);assert.equal(CARS.length,25);
  assert.equal(new Set(CARS.map(c=>c.id)).size,25);
  assert.equal(new Set(CARS.map(c=>c.name)).size,25);
  for(const cls of CLASSES)assert.equal(CARS.filter(c=>c.classId===cls.id).length,5);
});
test('existing car starts owned and selected with initial credits',()=>{
  assert.deepEqual(normaliseSave(),{version:1,credits:STARTING_CREDITS,owned:[STARTER_ID],selected:STARTER_ID,tuning:{}});
});
test('invalid saves are normalised without trusting unknown ownership',()=>{
  const save=normaliseSave({credits:-10,owned:['missing','roadster-0','roadster-0'],selected:'super-4'});
  assert.deepEqual(save.owned,[STARTER_ID,'roadster-0']);
  assert.equal(save.credits,STARTING_CREDITS);assert.equal(save.selected,STARTER_ID);
  assert.equal(normaliseSave({credits:0}).credits,0);
});
test('purchase deducts price, adds ownership and selects new car atomically',()=>{
  const before=normaliseSave(),r=purchaseCar(before,'starter-1');
  assert.equal(r.ok,true);assert.equal(r.save.credits,7500);
  assert.deepEqual(r.save.owned,[STARTER_ID,'starter-1']);assert.equal(r.save.selected,'starter-1');
  assert.equal(before.credits,10000);assert.equal(before.owned.length,1);
});
test('duplicate purchases never deduct credits',()=>{
  const save=purchaseCar(normaliseSave(),'starter-1').save;
  assert.equal(purchaseCar(save,'starter-1').ok,false);assert.equal(save.credits,7500);
});
test('unaffordable and unknown cars cannot be purchased',()=>{
  const save=normaliseSave();assert.equal(purchaseCar(save,'super-4').ok,false);
  assert.equal(purchaseCar(save,'missing').ok,false);assert.equal(save.credits,10000);
});
test('exact balance purchase is allowed',()=>{
  const result=purchaseCar({...normaliseSave(),credits:12000},'roadster-0');
  assert.equal(result.ok,true);assert.equal(result.save.credits,0);
});
test('only owned cars can be selected',()=>{
  assert.equal(selectCar(normaliseSave(),'muscle-0').ok,false);
  const save=purchaseCar(normaliseSave(),'starter-2').save;
  const r=selectCar(save,STARTER_ID);assert.equal(r.ok,true);assert.equal(r.save.credits,save.credits);
});
test('selling selected car returns to stock and credits sixty percent',()=>{
  const bought=purchaseCar(normaliseSave(),'starter-1').save;
  const sold=sellCar(bought,'starter-1');assert.equal(sold.ok,true);
  assert.equal(sold.save.credits,9000);assert.equal(sold.save.selected,STARTER_ID);
  assert.deepEqual(sold.save.owned,[STARTER_ID]);assert.equal(resaleValue(getCar('starter-1')),1500);
});
test('selling another owned car preserves selected car',()=>{
  let save=purchaseCar(normaliseSave(),'starter-1').save;
  save=purchaseCar(save,'starter-2').save;
  const sold=sellCar(save,'starter-1');assert.equal(sold.save.selected,'starter-2');
});
test('original car and unowned cars cannot be sold',()=>{
  const save=normaliseSave();assert.equal(sellCar(save,STARTER_ID).ok,false);
  assert.equal(sellCar(save,'super-0').ok,false);assert.equal(sellCar(save,'missing').ok,false);
});
test('buy-sell cycle costs credits and double sell fails',()=>{
  const sold=sellCar(purchaseCar(normaliseSave(),'starter-1').save,'starter-1');
  assert.ok(sold.save.credits<STARTING_CREDITS);assert.equal(sellCar(sold.save,'starter-1').ok,false);
});
test('only winning races award credits, including clean-driving bonuses',()=>{
  assert.equal(raceReward({win:false,perfect:4,launch:'PERFECT'}),0);
  assert.equal(raceReward({win:true}),1500);
  assert.equal(raceReward({win:true,perfect:3,launch:'PERFECT'}),2100);
  assert.equal(awardRace(normaliseSave(),{win:true}).save.credits,11500);
});
test('saved purchases and selected car survive JSON round trip',()=>{
  const save=purchaseCar(normaliseSave(),'starter-3').save;
  assert.deepEqual(normaliseSave(JSON.parse(JSON.stringify(save))),save);
});
test('stock performance is preserved and upper classes have stronger tuning',()=>{
  assert.equal(getCar(STARTER_ID).acceleration,1);assert.equal(getCar(STARTER_ID).topSpeed,120);
  for(const c of CARS){assert.ok(c.acceleration>=1&&c.acceleration<=4);assert.ok(c.topSpeed>=120&&c.topSpeed<=300)}
  const classAverages=CLASSES.map(cls=>CARS.filter(c=>c.classId===cls.id).reduce((sum,c)=>sum+c.acceleration,0)/5);
  for(let i=1;i<classAverages.length;i++)assert.ok(classAverages[i]>classAverages[i-1]);
});
test('all 25 cars have distinct transparent pixel sprites at a common size',()=>{
  const hashes=new Set();
  for(const c of CARS){
    const html=carArt(c);assert.ok(html.startsWith('<img'));assert.ok(!html.includes('undefined'));
    assert.ok(html.includes(`/cars/pixel/${c.id}.png`));assert.ok(html.includes('class="pixel-car"'));
    const png=readFileSync(new URL(`../public/cars/pixel/${c.id}.png`,import.meta.url));
    assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16),256);assert.equal(png.readUInt32BE(20),92);
    assert.equal(png[25],6,'PNG must have an alpha channel');
    hashes.add(createHash('sha256').update(png).digest('hex'));
  }
  assert.equal(hashes.size,25);
});
test('unknown car requests safely render the original car',()=>{
  assert.ok(carArt({id:'../../unknown'}).includes('/starter-0.png'));
});
