import { Text } from '../Typography';
import React, { useRef } from 'react';
import { View } from 'react-native';
import { localDay } from '../domain';
import { a } from '../account/ui';

export default function BirthDateField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return <View style={a.field}><Text nativeID="birth-date-label" style={a.label}>Date of birth</Text><View style={a.inputWrap}>
    <input ref={input} type="date" aria-labelledby="birth-date-label" aria-label="Date of birth" min="1900-01-01" max={localDay()} value={value} onChange={event => onChange(event.target.value)} onClick={() => { try { input.current?.showPicker?.(); } catch { /* The built-in calendar indicator remains available. */ } }} style={{ boxSizing: 'border-box', width: '100%', minWidth: 0, minHeight: 48, padding: '12px 14px', border: 0, borderRadius: 'inherit', color: '#F5F5F5', colorScheme: 'dark', background: 'transparent', fontFamily: 'OutfitMedium, sans-serif', fontSize: 16, accentColor: '#F5F5F5' }} />
  </View></View>;
}
