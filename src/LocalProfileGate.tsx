import { Text } from './Typography';
import { MotionView } from './Motion';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { uid } from './uuid';
import { ReportExporter } from './report/ReportExporter';
import type { Profile } from './account/profile';
import { ProfileForm } from './onboarding/ProfileForm';
import { AccountShell, AccountButton, a } from './account/ui';
import { loadLocalProfile, saveLocalProfile } from './localProfileStore';
import { loadData, persistData } from './storage';
import { localDay, sortedWeights, saveWeight } from './domain';
import { profileBMI } from './bmi';
import BirthDateField from './onboarding/BirthDateField';
import { validDateOfBirth } from './account/profile';
import type { LocalTrackerContext } from './localProfileModel';

export function LocalProfileGate({ children }: { children: (context: LocalTrackerContext) => React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null), [loading, setLoading] = useState(true), [failed, setFailed] = useState(false), [showProfile, setShowProfile] = useState(false), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true; setLoading(true); setFailed(false);
    loadLocalProfile().then(value => { if (active) { setProfile(value); setLoading(false); } }).catch(() => { if (active) { setFailed(true); setLoading(false); } });
    return () => { active = false; };
  }, [attempt]);
  async function save(value: Omit<Profile, 'id'>) {
    const next = { ...value, id: uid() };
    const previous = loadData();
    persistData(saveWeight(previous, localDay(), value.initial_weight_kg));
    try { await saveLocalProfile(next); }
    catch (error) { persistData(previous); throw error; }
    return next;
  }
  if (loading) return <AccountShell><ActivityIndicator color="#F5F5F5" /></AccountShell>;
  if (failed) return <AccountShell><Text style={a.title}>Couldn’t open your profile</Text><Text style={a.body}>Your saved data has been preserved.</Text><AccountButton title="Try again" onPress={() => setAttempt(value => value + 1)} /></AccountShell>;
  if (!profile) return <ProfileForm local onSaved={setProfile} onSignOut={() => {}} onSave={save} />;
  if (showProfile) return <MotionView transitionKey="profile" style={{ flex: 1 }}><LocalProfileDetails profile={profile} onChanged={setProfile} onBack={() => setShowProfile(false)} /></MotionView>;
  return <MotionView transitionKey="tracker" style={{ flex: 1 }}>{children({ userId: profile.id, profile, onOpenAccount: () => setShowProfile(true) })}</MotionView>;
}
function LocalProfileDetails({ profile, onBack, onChanged }: { profile: Profile; onBack: () => void; onChanged: (profile: Profile) => void }) {
  const [dob, setDob] = useState(profile.dob), [saving, setSaving] = useState(false), [error, setError] = useState('');
  async function saveDate() {
    if (saving) return;
    if (!validDateOfBirth(dob)) { setError('Choose a valid date of birth.'); return; }
    setSaving(true); setError('');
    try { const next = { ...profile, dob }; await saveLocalProfile(next); onChanged(next); }
    catch { setError('Couldn’t save the date on this device. Please try again.'); }
    finally { setSaving(false); }
  }
  const currentData = loadData();
  let latest = profile.initial_weight_kg;
  try { const weights = sortedWeights(currentData.weights); if (weights.length) latest = weights[weights.length - 1].kg; } catch { /* The tracker exposes storage errors when reopened. */ }
  const bmi = profileBMI(latest, profile.height_cm, profile.dob);
  return <AccountShell><Text accessibilityRole="header" style={a.title}>Your profile</Text><View style={a.detailRow}><Text style={a.note}>Name</Text><Text style={a.detailValue}>{profile.name}</Text></View><BirthDateField value={dob} onChange={value => { setDob(value); setError(''); }} />{dob !== profile.dob && <AccountButton title="Save date of birth" onPress={saveDate} busy={saving} />}{!!error && <Text accessibilityRole="alert" style={a.error}>{error}</Text>}{[
    ['Height', `${profile.height_cm} cm`], ['Weight units', profile.weight_unit],
  ].map(([label, value]) => <View key={label} style={a.detailRow}><Text style={a.note}>{label}</Text><Text style={a.detailValue}>{value}</Text></View>)}<View style={a.info}><Text style={a.label}>CURRENT BMI</Text><Text style={{ fontSize: 36, color: '#F5F5F5' }}>{bmi.value?.toFixed(1) ?? '—'}</Text><Text style={a.note}>{bmi.note}</Text></View><ReportExporter profile={profile} data={currentData} /><Text style={a.note}>Saved on this device. Accounts and cloud sync will be added later.</Text><AccountButton title="Back to tracker" onPress={onBack} /></AccountShell>;
}
