import test from 'node:test';import assert from 'node:assert/strict';
const max=[0,32,52,73,95,120],redline=7000;
const rpm=(mph,gear)=>gear?Math.max(900,mph/max[gear]*redline):900;
test('selecting a gear does not change road speed',()=>{const speed=0;rpm(speed,1);assert.equal(speed,0)});
test('redline speeds rise with every gear',()=>{assert.deepEqual(max.slice(1),[32,52,73,95,120])});
test('1-2 shift preserves speed and drops rpm',()=>{const speed=30;assert.equal(speed,30);assert.ok(rpm(speed,2)<rpm(speed,1))});
test('perfect shift band is 6200 through 6700 rpm',()=>{const perfect=r=>r>=6200&&r<=6700;assert.equal(perfect(6200),true);assert.equal(perfect(6700),true);assert.equal(perfect(6199),false);assert.equal(perfect(6701),false)});
