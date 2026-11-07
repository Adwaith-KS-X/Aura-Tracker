import { Text } from '../Typography';
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { profileBMI } from '../bmi';
import { kgToPounds, poundsToKg, round, validateProfile, type HeightUnit, type WeightUnit, type Profile } from '../account/profile';
import { AccountShell, AccountInput, AccountButton, AccountLink, ErrorText, UnitSwitch, a } from '../account/ui';
import BirthDateField from './BirthDateField';

export function ProfileForm({ onSaved, onSignOut, local = false, onSave }: { onSaved: (profile: Profile) => void; onSignOut: () => void; local?: boolean; onSave: (profile: Omit<Profile, 'id'>) => Promise<Profile> }) {
  const [name, setName] = useState(''), [dob, setDob] = useState('');
  const [heightUnit, setHeightUnit] = useState<HeightUnit>('cm'), [weightUnit, setWeightUnit] = useState<WeightUnit>('kg');
  const [height, setHeight] = useState(''), [inches, setInches] = useState(''), [weight, setWeight] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const inFlight = useRef(false);
  const [review, setReview] = useState<Omit<Profile, 'id'> | null>(null);
  useEffect(() => { setError(''); }, [name, dob, height, inches, weight, heightUnit, weightUnit]);
  function changeHeightUnit(unit: HeightUnit) {
    if (unit === heightUnit) return;
    const value = Number(height.replace(',', '.'));
    if (height.trim() && Number.isFinite(value)) {
      if (unit === 'ft') {
        const totalInches = value / 2.54;
        let feet = Math.floor(totalInches / 12), remaining = round(totalInches - feet * 12, 1);
        if (remaining === 12) { feet++; remaining = 0; }
        setHeight(String(feet)); setInches(String(remaining));
      } else {
        const extra = Number((inches || '0').replace(',', '.'));
        if (Number.isFinite(extra)) setHeight(String(round((value * 12 + extra) * 2.54, 1)));
      }
    }
    setHeightUnit(unit);
  }
  function changeWeightUnit(unit: WeightUnit) {
    if (unit === weightUnit) return;
    const value = Number(weight.replace(',', '.'));
    if (weight.trim() && Number.isFinite(value)) setWeight(String(round(unit === 'lb' ? kgToPounds(value) : poundsToKg(value), 2)));
    setWeightUnit(unit);
  }
  async function save() {
    if (inFlight.current) return;
    setError('');
    let validated: Omit<Profile, 'id'>;
    try { validated = validateProfile({ name, dob, height, inches, weight, heightUnit, weightUnit }); }
    catch (failure) { const message = (failure as Error).message; setError(message.includes('date of birth') ? 'Choose a valid date of birth.' : message); return; }
    if (local && !review) { setReview(validated); return; }
    inFlight.current = true; setBusy(true);
    try {
      const profile = await onSave(review ?? validated);
      onSaved(profile);
    }
    catch { setError(local ? 'Couldn’t save on this device. Please try again.' : 'Couldn’t save your profile. Check your connection and try again.'); }
    finally { inFlight.current = false; setBusy(false); }
  }
  if (local && review) {
    const bmi = profileBMI(review.initial_weight_kg, review.height_cm, review.dob);
    return <AccountShell key="review"><Text style={a.step}>02 REVIEW YOUR PROFILE</Text><Text accessibilityRole="header" style={a.title}>Ready, {review.name.split(' ')[0]}.</Text><Text style={a.body}>Your measurements are saved in centimeters and kilograms.</Text><View style={a.row}><View style={a.flex}><Text style={a.note}>Height</Text><Text style={a.detailValue}>{review.height_cm} cm</Text></View><View style={a.flex}><Text style={a.note}>Starting weight</Text><Text style={a.detailValue}>{review.initial_weight_kg} kg</Text></View></View><View style={a.info}><Text style={a.label}>BODY MASS INDEX</Text><Text style={{ fontSize: 44, color: '#F5F5F5', letterSpacing: -1 }}>{bmi.value?.toFixed(1) ?? '—'}</Text><Text style={a.note}>{bmi.note}</Text></View><Text style={a.note}>Your profile and tracking data stay on this device for now.</Text><ErrorText>{error}</ErrorText><AccountButton title="Start tracking" onPress={save} busy={busy} /><AccountLink title="Edit details" onPress={() => { setReview(null); setError(''); }} disabled={busy} /></AccountShell>;
  }
  return <AccountShell key="details" minimal>
    <View style={{ gap: 8 }}><Text accessibilityRole="header" style={a.title}>Set up your profile</Text><Text style={a.body}>Add your details and starting measurements.</Text></View>
    <AccountInput label="Name" value={name} onChange={setName} placeholder="Your name" />
    <BirthDateField value={dob} onChange={setDob} />
    <View style={{ gap: 12 }}><View style={[a.row, { justifyContent: 'space-between' }]}><Text style={a.label}>Height</Text><UnitSwitch label="Height units" options={[{ value: 'cm', label: 'cm' }, { value: 'ft', label: 'ft + in' }]} value={heightUnit} onChange={changeHeightUnit} /></View><View style={a.row}><View style={a.flex}><AccountInput label={heightUnit === 'cm' ? 'Height (cm)' : 'Feet'} value={height} onChange={setHeight} numeric placeholder={heightUnit === 'cm' ? '175' : '5'} maxLength={6} /></View>{heightUnit === 'ft' && <View style={a.flex}><AccountInput label="Inches" value={inches} onChange={setInches} numeric placeholder="9" maxLength={5} /></View>}</View></View>
    <View style={{ gap: 12 }}><View style={[a.row, { justifyContent: 'space-between' }]}><Text style={a.label}>Starting weight</Text><UnitSwitch label="Weight units" options={[{ value: 'kg', label: 'kg' }, { value: 'lb', label: 'lb' }]} value={weightUnit} onChange={changeWeightUnit} /></View><AccountInput label={`Starting weight (${weightUnit})`} value={weight} onChange={setWeight} numeric placeholder={weightUnit === 'kg' ? '72.5' : '160'} maxLength={7} /></View>
    <ErrorText>{error}</ErrorText><AccountButton title={local ? 'Review profile' : 'Open my tracker'} onPress={save} busy={busy} />{!local && <AccountLink title="Sign out" onPress={onSignOut} disabled={busy} />}
  </AccountShell>;
}
