import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { sessionStorage } from './sessionStorage';
import { fetchWithTimeout } from './request';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';
export const backendConfigured = /^https:\/\//.test(url) && (key.startsWith('sb_publishable_') || key.startsWith('eyJ'));
export const authStorageKey = 'aura-session-v1';
export const supabase = backendConfigured ? createClient(url, key, {
  global: { fetch: fetchWithTimeout },
  auth: { storage: sessionStorage, storageKey: authStorageKey, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'pkce' },
}) : null;
export function backend() {
  if (!supabase) throw new Error('Account service is not connected yet. Please try again once setup is complete.');
  return supabase;
}
