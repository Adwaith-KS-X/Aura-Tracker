import * as SecureStore from 'expo-secure-store';
import type { Profile } from './account/profile';
import { readLocalProfile } from './localProfileModel';
const key = 'aura-local-profile-v1';
export async function loadLocalProfile(): Promise<Profile | null> {
  const raw = await SecureStore.getItemAsync(key);
  return raw ? readLocalProfile(raw) : null;
}
export async function saveLocalProfile(profile: Profile): Promise<void> {
  await SecureStore.setItemAsync(key, JSON.stringify({ version: 1, profile }), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}
