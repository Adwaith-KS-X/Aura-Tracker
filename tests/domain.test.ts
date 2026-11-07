import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyData, localDay, positiveNumber, readData, recentDays, saveWeight, waterOnDay, weightChange } from '../src/domain.ts';

test('hydration counts entries on their local calendar day', () => {
  const data = emptyData();
  data.water = [{ id: '1', at: new Date(2026, 10, 6, 0, 5).toISOString(), ml: 250 }, { id: '2', at: new Date(2026, 10, 5, 23, 55).toISOString(), ml: 500 }];
  assert.equal(waterOnDay(data, '2026-11-06'), 250);
});
test('weight saves retain same-day entries and keep chronological order', () => {
  let data = saveWeight(emptyData(), '2026-11-06', 75);
  data = saveWeight(data, '2026-11-05', 76);
  data = saveWeight(data, '2026-11-06', 74.8);
  assert.equal(data.weights.length, 3);
  assert.equal(weightChange(data.weights), -0.2);
  assert.equal(weightChange(data.weights.slice(0, 1)), null);
});
test('legacy weights survive append and reload without fabricated timestamps',()=>{
  const legacy=readData(JSON.stringify({...emptyData(),weights:[{day:'2026-11-06',kg:80}]}));
  const first=saveWeight(legacy,'2026-11-06',79,'2026-11-06T09:00:00Z');
  const next=saveWeight(first,'2026-11-06',78,'2026-11-06T09:00:00Z');
  const restored=readData(JSON.stringify(next));
  assert.deepEqual(restored.weights.map(e=>e.kg),[80,79,78]);
  assert.equal(restored.weights[0].at,undefined);
  assert.notEqual(restored.weights[1].id,restored.weights[2].id);
  assert.equal(weightChange(restored.weights),-1);
});
test('numeric validation handles decimal comma and rejects malformed values', () => {
  assert.equal(positiveNumber(' 74,8 ', 700), 74.8);
  for (const value of ['', '0', '-5', 'Infinity', '20kg', '1e2', '701']) assert.equal(positiveNumber(value, 700), null);
});
test('seven-day report crosses month and year boundaries', () => {
  const days = recentDays(7, new Date(2027, 0, 3, 12));
  assert.equal(days[0], '2026-12-28');
  assert.equal(days[6], '2027-01-03');
  assert.equal(localDay(new Date(2026, 10, 6)), '2026-11-06');
});
test('invalid saved data fails rather than silently overwriting entries', () => {
  assert.deepEqual(readData(JSON.stringify(emptyData())), emptyData());
  assert.throws(() => readData('{'));
  assert.throws(() => readData(JSON.stringify({ ...emptyData(), version: 2 })));
  assert.throws(() => readData(JSON.stringify({ ...emptyData(), weights: [{ day: '2026-02-31', kg: 70 }] })));
});
