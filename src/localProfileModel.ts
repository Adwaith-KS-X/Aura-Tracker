import { validateProfile, type Profile } from './account/profile';
export type LocalTrackerContext = { userId: string; profile: Profile; onOpenAccount: () => void };
export function readLocalProfile(raw: string): Profile {
  const data = JSON.parse(raw);
  if (data?.version !== 1 || typeof data.profile?.id !== 'string' || !['cm', 'ft'].includes(data.profile.height_unit) || !['kg', 'lb'].includes(data.profile.weight_unit)) throw new Error('Unsupported profile format.');
  const profile = data.profile;
  const checked = validateProfile({ name: profile.name, dob: profile.dob, height: String(profile.height_cm), inches: '', weight: String(profile.initial_weight_kg), heightUnit: 'cm', weightUnit: 'kg' });
  return { id: profile.id, ...checked, height_unit: profile.height_unit, weight_unit: profile.weight_unit };
}
