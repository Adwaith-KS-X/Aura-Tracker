import { Text } from '../Typography';
import { MotionModal } from '../Motion';
import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { localDay } from '../domain';
import { a, AccountButton, AccountLink } from '../account/ui';
import { corners } from '../theme';

type Props = { value: string; onChange: (value: string) => void };
const minimum = new Date(1900, 0, 1);
export default function BirthDateField({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(new Date(2000, 0, 1));
  const today = new Date();
  const current = value ? new Date(`${value}T12:00:00`) : new Date(2000, 0, 1);
  function show() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current, mode: 'date', display: 'calendar', minimumDate: minimum, maximumDate: today,
        positiveButton: { label: 'Done', textColor: '#F5F5F5' }, negativeButton: { label: 'Cancel', textColor: '#BDBDBD' },
        onValueChange: (_, date) => { if (date) onChange(localDay(date)); },
      });
    } else { setDraft(current); setOpen(true); }
  }
  return <View style={a.field}><Text style={a.label}>Date of birth</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Choose date of birth" onPress={show} style={({ pressed }) => [s.control, pressed && { opacity: 0.65 }]}><Text style={[s.value, !value && { color: '#929292' }]}>{value ? current.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : 'Select date of birth'}</Text><View style={s.calendar}><View style={s.calendarTop} /><View style={s.calendarDot} /></View></Pressable>
    <MotionModal visible={open} onClose={() => setOpen(false)}><View style={s.backdrop}><View accessibilityViewIsModal style={s.sheet}><View style={s.heading}><Text style={s.title}>Date of birth</Text><AccountLink title="Cancel" onPress={() => setOpen(false)} /></View><DateTimePicker value={draft} mode="date" display="spinner" minimumDate={minimum} maximumDate={today} themeVariant="dark" textColor="#F5F5F5" accentColor="#F5F5F5" onValueChange={(_, date) => setDraft(date)} style={{ alignSelf: 'stretch' }} /><AccountButton title="Done" onPress={() => { onChange(localDay(draft)); setOpen(false); }} /></View></View></MotionModal>
  </View>;
}
const s = StyleSheet.create({
  control: { ...corners.input, minHeight: 50, borderWidth: 1, borderColor: '#3A3A3A', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, value: { fontSize: 16, color: '#F5F5F5', flex: 1 },
  calendar: { width: 18, height: 18, borderWidth: 1.5, borderColor: '#BDBDBD', borderRadius: 4 }, calendarTop: { height: 5, borderBottomWidth: 1.5, borderBottomColor: '#BDBDBD' }, calendarDot: { width: 3, height: 3, backgroundColor: '#BDBDBD', margin: 3 },
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }, sheet: { ...corners.modal, width: '100%', maxWidth: 430, padding: 22, backgroundColor: '#121212', gap: 16 }, heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: { fontSize: 18, color: '#F5F5F5', fontWeight: '600' },
});
