import { Text } from '../Typography';
import React from 'react';
import { View } from 'react-native';
import { ProfileForm } from '../onboarding/ProfileForm';
import { completeProfile } from './repository';
import { kgToPounds, round, type Profile } from './profile';
import { AccountShell, AccountButton, a } from './ui';
export function ProfileScreen({ userId, onSaved, onSignOut }: { userId: string; onSaved: (profile: Profile) => void; onSignOut: () => void }) {
  return <ProfileForm onSaved={onSaved} onSignOut={onSignOut} onSave={value => completeProfile(userId, value)} />;
}

export function AccountDetails({ profile, email, onBack, onSignOut }: { profile: Profile; email: string; onBack: () => void; onSignOut: () => void }) {
  const details = [
    ['Name', profile.name], ['Email', email],
    ['Date of birth', new Date(`${profile.dob}T12:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })],
    ['Height', `${profile.height_cm} cm`],
    ['Starting weight', `${profile.weight_unit === 'lb' ? round(kgToPounds(profile.initial_weight_kg)) : profile.initial_weight_kg} ${profile.weight_unit}`],
  ];
  return <AccountShell><Text accessibilityRole="header" style={a.title}>Your account</Text><Text style={a.body}>Your profile and activity belong to this account.</Text>{details.map(([label, value]) => <View key={label} style={a.detailRow}><Text style={a.note}>{label}</Text><Text style={a.detailValue}>{value}</Text></View>)}<View style={a.divider} /><AccountButton title="Back to tracker" onPress={onBack} /><AccountButton title="Sign out" secondary onPress={onSignOut} /></AccountShell>;
}
