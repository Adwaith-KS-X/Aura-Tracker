import type { Profile } from './account/profile';
import { readLocalProfile } from './localProfileModel';
const key = 'aura-local-profile-v1';
export async function loadLocalProfile(): Promise<Profile | null> {
  const raw = localStorage.getItem(key);
  return raw ? readLocalProfile(raw) : null;
}
export async function saveLocalProfile(profile: Profile): Promise<void> {
  localStorage.setItem(key, JSON.stringify({ version: 1, profile }));
}
