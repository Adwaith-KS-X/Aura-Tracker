import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createSearchIndex, searchExercises, demoIds, type Exercise } from '../src/exercises/search.ts';
const catalog: Exercise[]=JSON.parse(readFileSync(new URL('../src/exercises/catalog.json',import.meta.url),'utf8'));
const index=createSearchIndex(catalog);
test('catalog has more than 1,000 unique named exercises with instructions and valid demos',()=>{
  assert.ok(catalog.length>=1000);
  assert.equal(new Set(catalog.map(e=>e.id)).size,catalog.length);
  assert.equal(new Set(catalog.map(e=>e.name.toLowerCase())).size,catalog.length);
  for(const e of catalog){assert.ok(e.name.length<=80);assert.ok(e.steps.length>0);assert.ok(e.steps.every(step=>typeof step==='string'&&step.trim()));}
  for(const id of demoIds)assert.ok(catalog.some(e=>e.id===id));
});
test('search handles punctuation, word order, aliases and combined filters',()=>{
  assert.equal(searchExercises(index,'PUSH UP')[0].id,'0662');
  assert.ok(searchExercises(index,'pushup').some(e=>e.id==='0662'));
  assert.ok(searchExercises(index,'jumping jacks').some(e=>e.id==='3224'));
  assert.ok(searchExercises(index,'curl dumbbell').some(e=>e.id==='0294'));
  const filtered=searchExercises(index,'','upper arms','dumbbell');
  assert.ok(filtered.length>0);assert.ok(filtered.every(e=>e.bodyPart==='upper arms'&&e.equipment==='dumbbell'));
  assert.equal(searchExercises(index,'','All','All',true).length,500);
  assert.equal(searchExercises(index,'zzzzmissingexercise').length,0);
});
test('every imported animated ID has a statically bundled local sprite',()=>{
  const assets=readFileSync(new URL('../src/exercises/animationAssets.ts',import.meta.url),'utf8');
  const ids=[...assets.matchAll(/'([0-9]+)': require\('\.\/animations\/\1\.png'\)/g)].map(match=>match[1]);
  assert.equal(ids.length,499);
  assert.equal(new Set(ids).size,499);
  for(const id of ids){assert.ok(demoIds.has(id));assert.ok(readFileSync(new URL(`../src/exercises/animations/${id}.png`,import.meta.url)).length>100);}
  assert.ok(demoIds.has('aura-squat'));
});
