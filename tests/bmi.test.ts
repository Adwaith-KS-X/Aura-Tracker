import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ageOnDate, calculateBMI, profileBMI } from '../src/bmi.ts';
test('BMI uses kilograms and meters squared, including converted measurements', () => {
  assert.equal(calculateBMI(72.57, 175.26), 23.6);
  assert.equal(calculateBMI(74.84, 175.26), 24.4);
  assert.equal(calculateBMI(70, 175), 22.9);
  assert.equal(calculateBMI(0, 175), null);
  assert.equal(calculateBMI(70, 0), null);
  assert.equal(calculateBMI(Infinity, 175), null);
});
test('BMI interpretation is age-aware without applying adult categories to young users', () => {
  const now = new Date(2026, 10, 6);
  assert.equal(ageOnDate('2006-11-07', now), 19);
  assert.equal(ageOnDate('2006-11-06', now), 20);
  assert.match(profileBMI(70, 175, '2006-11-07', now).note, /growth charts/);
  assert.match(profileBMI(70, 175, '2006-11-06', now).note, /screening/);
  assert.equal(profileBMI(12, 85, '2025-11-06', now).value, null);
});
