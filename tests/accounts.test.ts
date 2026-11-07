import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { validateProfile, validateCredentials, validDateOfBirth, poundsToKg, kgToPounds } from '../src/account/profile.ts';
import { createChunkedStorage, splitUtf8 } from '../src/account/chunkedStorage.ts';

test('profile measurements normalize to metric units and date validation rejects impossible dates', () => {
  const input = { name: ' Alex ', dob: '2000-02-29', height: '5', inches: '9', weight: '160', heightUnit: 'ft' as const, weightUnit: 'lb' as const };
  const value = validateProfile(input, new Date(2026, 10, 6));
  assert.equal(value.name, 'Alex'); assert.equal(value.height_cm, 175.26); assert.equal(value.initial_weight_kg, 72.57);
  assert.equal(validDateOfBirth('2001-02-29'), false);
  assert.equal(validDateOfBirth('2027-01-01', new Date(2026, 10, 6)), false);
  assert.equal(validDateOfBirth('1899-01-01'), false);
  assert.equal(Math.round(kgToPounds(poundsToKg(160))), 160);
  assert.throws(() => validateProfile({ ...input, inches: '12' }));
  assert.throws(() => validateProfile({ ...input, height: '5.9' }));
  assert.throws(() => validateProfile({ ...input, weight: 'Infinity' }));
});
test('credential validation keeps Gmail addresses as ordinary app accounts and rejects weak signup passwords', () => {
  assert.equal(validateCredentials(' Person@Gmail.com ', 'a-long-app-password', true), 'person@gmail.com');
  assert.throws(() => validateCredentials('person@gmail.com', 'short', true));
  assert.throws(() => validateCredentials('person@gmail.com', '🧪'.repeat(20), true));
  assert.throws(() => validateCredentials('not-an-email', 'a-long-app-password', true));
});
test('secure session storage round-trips Unicode, clears all chunks, and preserves old data on failed replacement', async () => {
  const data = new Map<string, string>(); let failWrite = false;
  const storage = createChunkedStorage({ getItem: async key => data.get(key) ?? null, setItem: async (key, value) => { if (failWrite && !key.endsWith('auth')) throw new Error('Device locked'); data.set(key, value); }, removeItem: async key => { data.delete(key); } });
  const value = 'session-🧪-用户'.repeat(400);
  for (const chunk of splitUtf8(value)) assert.ok(Buffer.byteLength(chunk, 'utf8') <= 1500);
  await storage.setItem('auth', value);
  assert.equal(await storage.getItem('auth'), value);
  failWrite = true;
  await assert.rejects(storage.setItem('auth', 'replacement'));
  assert.equal(await storage.getItem('auth'), value);
  await storage.removeItem('auth');
  assert.equal(data.size, 0); assert.equal(await storage.getItem('auth'), null);
});

test('PostgreSQL schema enforces ownership, anonymous denial, validation, atomic writes, and daily weight uniqueness', async () => {
  const db = new PGlite();
  const A = '00000000-0000-4000-8000-000000000001', B = '00000000-0000-4000-8000-000000000002';
  const waterId = '10000000-0000-4000-8000-000000000001';
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$; grant usage on schema auth, public to anon, authenticated; insert into auth.users values('${A}'),('${B}');`);
    await db.exec(await readFile(new URL('../supabase/migrations/202611060001_accounts.sql', import.meta.url), 'utf8'));
    const date = (await db.query<{ day: string }>("select current_date::text as day")).rows[0].day;
    const profile = { name: 'Test User', dob: '2000-01-01', height_cm: 175, initial_weight_kg: 72, height_unit: 'cm', weight_unit: 'kg' };
    async function asUser(id: string) { await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]); await db.exec('set role authenticated'); }
    const diff = { goal_ml: null, water_upsert: [], water_remove: [], exercise_upsert: [], exercise_remove: [], weight_upsert: [], weight_remove: [] };
    await asUser(A);
    await db.query('select public.complete_profile($1::jsonb,$2::date)', [JSON.stringify(profile), date]);
    await db.query('select public.complete_profile($1::jsonb,$2::date)', [JSON.stringify(profile), date]);
    await db.query('select public.apply_tracker_changes($1::jsonb)', [JSON.stringify({ ...diff, water_upsert: [{ id: waterId, at: `${date}T10:00:00Z`, day: date, ml: 250 }] })]);
    await db.query('select public.apply_tracker_changes($1::jsonb)', [JSON.stringify({ ...diff, weight_upsert: [{ day: date, kg: 71.5 }] })]);
    assert.equal((await db.query('select * from public.weight_logs')).rows.length, 1);
    await asUser(B);
    await db.query('select public.complete_profile($1::jsonb,$2::date)', [JSON.stringify({ ...profile, name: 'Second User' }), date]);
    assert.equal((await db.query('select * from public.profiles')).rows.length, 1);
    assert.equal((await db.query('select * from public.water_logs')).rows.length, 0);
    await assert.rejects(db.query('insert into public.water_logs(id,user_id,logged_at,log_day,amount_ml) values($1,$2,now(),$3,500)', ['20000000-0000-4000-8000-000000000001', A, date]));
    await assert.rejects(db.query('select public.apply_tracker_changes($1::jsonb)', [JSON.stringify({ ...diff, water_upsert: [{ id: waterId, at: `${date}T10:00:00Z`, day: date, ml: 999 }] })]));
    await db.query('select public.apply_tracker_changes($1::jsonb)', [JSON.stringify({ ...diff, water_remove: [waterId] })]);
    await asUser(A);
    assert.equal((await db.query<{ amount_ml: number }>('select amount_ml from public.water_logs')).rows[0].amount_ml, '250');
    await assert.rejects(db.query('select public.apply_tracker_changes($1::jsonb)', [JSON.stringify({ ...diff, water_upsert: [{ id: '30000000-0000-4000-8000-000000000001', at: `${date}T10:00:00Z`, day: date, ml: 100 }], exercise_upsert: [{ id: '40000000-0000-4000-8000-000000000001', at: `${date}T10:00:00Z`, day: date, name: 'Squat', sets: 0, reps: 10, kg: 20 }] })]));
    assert.equal((await db.query('select * from public.water_logs')).rows.length, 1);
    const result = (await db.query<{ data: { water: { ml: number }[]; weights: { kg: number }[] } }>('select public.get_tracker_data() as data')).rows[0].data;
    assert.equal(result.water[0].ml, 250); assert.equal(result.weights[0].kg, 71.5);
    await db.exec('reset role; set role anon');
    await assert.rejects(db.query('select * from public.profiles'));
    await assert.rejects(db.query('select public.get_tracker_data()'));
  } finally { await db.close(); }
});
