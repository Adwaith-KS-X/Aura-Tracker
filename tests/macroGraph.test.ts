import test from 'node:test';
import assert from 'node:assert/strict';
import { macroGraphPoints } from '../src/macroGraphModel.ts';
const entries=[{id:'b',day:'2026-11-06',at:'2026-11-06T12:00:00Z',name:'Lunch',protein:20,carbs:30,fat:5},{id:'a',day:'2026-11-06',at:'2026-11-06T08:00:00Z',name:'Breakfast',protein:30,carbs:40,fat:10}];
test('today preserves meal order and cumulative values without mutating entries',()=>{const points=macroGraphPoints(entries,'2026-11-06','Today');assert.deepEqual(points.map(p=>[p.id,p.protein,p.carbs,p.fat]),[['a',30,40,10],['b',50,70,15]]);assert.equal(entries[0].id,'b');});
test('daily views aggregate grams and distinguish missing records from logged zero',()=>{const points=macroGraphPoints(entries,'2026-11-06','7 days');assert.equal(points.length,7);assert.equal(points[0].count,0);assert.equal(points.at(-1)!.protein,50);assert.equal(points.at(-1)!.count,2);assert.equal(macroGraphPoints(entries,'2026-11-06','30 days').length,30);assert.deepEqual(macroGraphPoints(entries,'2026-12-06','7 days'),[]);assert.deepEqual(macroGraphPoints([],'2026-11-06','Today'),[]);});
