import test from 'node:test';
import assert from 'node:assert/strict';
import { bmiReview, macroNumber, macroTotals } from '../src/progressModel.ts';
import { emptyData, readData, weightChange } from '../src/domain.ts';
test('weight change compares only the two latest dates even when unsorted',()=>{
 assert.equal(weightChange([{day:'2026-01-03',kg:79},{day:'2026-01-01',kg:90},{day:'2026-01-02',kg:80}]),-1);
 assert.equal(weightChange([{day:'2026-01-01',kg:80}]),null);
});
test('BMI review applies adult boundaries and does not classify children as adults',()=>{
 const now=new Date(2026,10,6);for(const [bmi,index] of [[18.4,0],[18.5,1],[24.9,1],[25,2],[29.9,2],[30,3]])assert.equal(bmiReview(bmi*4,200,'2000-01-01',now).index,index);
 assert.equal(bmiReview(80,175,'2012-01-01',now).index,-1);assert.equal(bmiReview(12,80,'2026-01-01',now).value,null);
});
test('macros accept zero, reject invalid input, persist with legacy compatibility',()=>{
 assert.equal(macroNumber('0'),0);assert.equal(macroNumber('12,5'),12.5);for(const value of ['','-1','NaN','1e3','2001'])assert.equal(macroNumber(value),null);
 const entry={id:'meal',at:'2026-11-06T12:00:00Z',day:'2026-11-06',name:'Lunch',protein:30,carbs:50,fat:10};
 assert.deepEqual(macroTotals([entry]),{protein:30,carbs:50,fat:10,kcal:410});
 assert.deepEqual(readData(JSON.stringify(emptyData())),emptyData());
 assert.deepEqual(readData(JSON.stringify({...emptyData(),macros:[entry]})).macros,[entry]);
 assert.throws(()=>readData(JSON.stringify({...emptyData(),macros:[{...entry,protein:-2}]})));
});
