import test from 'node:test';
import assert from 'node:assert/strict';
import {HELP_CONTENT} from '../public/how-to-play.js';
test('handbook covers controls, launches, progression, purchases and local saves',()=>{
 for(const text of ['Space','6,200–6,700','3,000–4,000','five different opponents','matching class','1,500 CR','60%','Buy & Fit','2 seconds','4 seconds','separate saves'])assert.ok(HELP_CONTENT.includes(text),text);
});
test('all handbook topic links point to unique sections',()=>{
 const ids=[...HELP_CONTENT.matchAll(/id="(help-[^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,6);assert.equal(new Set(ids).size,6);
 for(const link of HELP_CONTENT.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(link[1]));
});
