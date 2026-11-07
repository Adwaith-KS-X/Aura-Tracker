import test from 'node:test';
import assert from 'node:assert/strict';
import { generateReportHtml } from '../src/report/pdfTemplate.ts';
import type { Profile } from '../src/account/profile.ts';
import type { TrackerData } from '../src/domain.ts';

const mockProfile: Profile = {
  id: 'user-1',
  name: 'Adwaith',
  dob: '2000-05-15',
  height_cm: 178,
  initial_weight_kg: 74,
  height_unit: 'cm',
  weight_unit: 'kg',
};

const mockData: TrackerData = {
  version: 1,
  goalMl: 2500,
  water: [
    { id: 'w1', at: '2026-11-06T08:00:00Z', day: '2026-11-06', ml: 500 },
    { id: 'w2', at: '2026-11-06T12:00:00Z', day: '2026-11-06', ml: 1000 },
    { id: 'w3', at: '2026-11-05T09:00:00Z', day: '2026-11-05', ml: 2500 },
  ],
  exercises: [
    { id: 'e1', at: '2026-11-06T10:00:00Z', day: '2026-11-06', name: 'Bench Press', sets: 4, reps: 10, kg: 70 },
    { id: 'e2', at: '2026-11-05T10:00:00Z', day: '2026-11-05', name: 'Squat', sets: 5, reps: 5, kg: 100 },
  ],
  weights: [
    { id: 'wt1', at: '2026-11-01T07:00:00Z', day: '2026-11-01', kg: 75.0 },
    { id: 'wt2', at: '2026-11-06T07:00:00Z', day: '2026-11-06', kg: 74.2 },
  ],
  macros: [
    { id: 'm1', at: '2026-11-06T13:00:00Z', day: '2026-11-06', name: 'Chicken Rice', protein: 45, carbs: 60, fat: 12, kcal: 530 },
  ],
};

test('generateReportHtml generates valid HTML for 1 day', () => {
  const html = generateReportHtml(mockProfile, mockData, '1 day', '2026-11-06');
  assert.ok(html.includes('Aura Tracker'));
  assert.ok(html.includes('Adwaith'));
  assert.ok(html.includes('Bench Press'));
  assert.ok(html.includes('Chicken Rice'));
  assert.ok(html.includes('Hydration Summary'));
  assert.ok(html.includes('Body Weight &amp; BMI Trends') || html.includes('Body Weight & BMI Trends'));
});

test('generateReportHtml generates valid HTML for 7 days', () => {
  const html = generateReportHtml(mockProfile, mockData, '7 days', '2026-11-06');
  assert.ok(html.includes('7 days Summary'));
  assert.ok(html.includes('Bench Press'));
  assert.ok(html.includes('Squat'));
  assert.ok(html.includes('svg'));
});

test('generateReportHtml generates valid HTML for 30 days', () => {
  const html = generateReportHtml(mockProfile, mockData, '30 days', '2026-11-06');
  assert.ok(html.includes('30 days Summary'));
  assert.ok(html.includes('Macronutrient Intake Curve'));
});
