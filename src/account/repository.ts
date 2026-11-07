import { createClient } from '@supabase/supabase-js';
import { backend } from './client';
import { localDay, readData, type TrackerData } from '../domain';
import type { Profile } from './profile';
import { fetchWithTimeout } from './request';

// Pin the request to the session that initiated it. A later account switch must not
// send an old screen's pending changes with a new user's token.
async function forUser(userId: string) {
  const client = backend();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  if (!data.session || data.session.user.id !== userId) throw new Error('Your session changed. Please sign in again.');
  return createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    accessToken: async () => data.session!.access_token,
    global: { fetch: fetchWithTimeout },
  });
}
export async function loadProfile(userId: string): Promise<Profile | null> {
  const client = await forUser(userId);
  const { data, error } = await client.from('profiles').select('id,name,dob,height_cm,initial_weight_kg,height_unit,weight_unit').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}
export async function completeProfile(userId: string, profile: Omit<Profile, 'id'>): Promise<Profile> {
  const client = await forUser(userId);
  const { data, error } = await client.rpc('complete_profile', { p_profile: profile, p_day: localDay() });
  if (error) throw error;
  return data as Profile;
}
export async function loadAccountData(userId: string): Promise<TrackerData> {
  const client = await forUser(userId);
  const { data, error } = await client.rpc('get_tracker_data');
  if (error) throw error;
  return readData(JSON.stringify(data));
}

type IdEntry = { id: string };
function changes<T extends IdEntry>(before: T[], after: T[]) {
  const old = new Map(before.map(entry => [entry.id, JSON.stringify(entry)]));
  const next = new Set(after.map(entry => entry.id));
  return { upsert: after.filter(entry => old.get(entry.id) !== JSON.stringify(entry)), remove: before.filter(entry => !next.has(entry.id)).map(entry => entry.id) };
}
export function trackerDiff(before: TrackerData, after: TrackerData) {
  const oldWeights = new Map(before.weights.map(entry => [entry.day, entry.kg]));
  const nextWeights = new Set(after.weights.map(entry => entry.day));
  const water = changes(before.water, after.water);
  const exercises = changes(before.exercises, after.exercises);
  return {
    goal_ml: before.goalMl !== after.goalMl ? after.goalMl : null,
    water_upsert: water.upsert.map(entry => ({ ...entry, day: entry.day ?? localDay(new Date(entry.at)) })),
    water_remove: water.remove,
    exercise_upsert: exercises.upsert.map(entry => ({ ...entry, day: entry.day ?? localDay(new Date(entry.at)) })),
    exercise_remove: exercises.remove,
    weight_upsert: after.weights.filter(entry => oldWeights.get(entry.day) !== entry.kg),
    weight_remove: before.weights.filter(entry => !nextWeights.has(entry.day)).map(entry => entry.day),
  };
}
export async function persistAccountData(userId: string, before: TrackerData, after: TrackerData): Promise<void> {
  const client = await forUser(userId);
  const { error } = await client.rpc('apply_tracker_changes', { p_changes: trackerDiff(before, after) });
  if (error) throw error;
}
