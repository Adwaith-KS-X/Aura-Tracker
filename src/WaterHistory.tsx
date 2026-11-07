import { Text } from './Typography';
import React, { useMemo } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatTimeSafe, formatFullDateSafe } from './dateUtils';
import { localDay, type WaterEntry } from './domain';
import { Alert } from './dialogs';
import { corners } from './theme';

export function WaterHistory({ entries, onClose, onRemove }: { entries: WaterEntry[]; onClose: () => void; onRemove: (id: string) => void }) {
  const sections = useMemo(() => {
    const days = new Map<string, WaterEntry[]>();
    for (const entry of entries) { const day = entry.day ?? localDay(new Date(entry.at)); const group = days.get(day); if (group) group.push(entry); else days.set(day, [entry]); }
    return [...days].sort(([a], [b]) => b.localeCompare(a)).map(([day, data]) => ({ day, data: data.sort((a, b) => b.at.localeCompare(a.at)), total: data.reduce((sum, entry) => sum + entry.ml, 0) }));
  }, [entries]);
  return <SafeAreaView style={s.screen}><View style={s.header}><Pressable accessibilityRole="button" onPress={onClose} style={s.back}><Text style={s.backText}>‹ Back</Text></Pressable><Text accessibilityRole="header" style={s.title}>Water history</Text><Text style={s.subtitle}>{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</Text></View>
    <SectionList sections={sections} keyExtractor={entry => entry.id} contentContainerStyle={s.list} stickySectionHeadersEnabled={false} initialNumToRender={20} renderSectionHeader={({ section }) => <View style={s.dateRow}><Text style={s.date}>{formatFullDateSafe(section.day)}</Text><Text style={s.total}>{section.total.toLocaleString()} ml</Text></View>} renderItem={({ item }) => <View style={s.entry}><View style={{ flex: 1 }}><Text style={s.amount}>{item.ml.toLocaleString()} ml</Text><Text style={s.time}>{formatTimeSafe(item.at)}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Delete ${item.ml} ml water entry`} style={s.remove} onPress={() => Alert.alert('Remove water entry?', `${item.ml} ml · ${formatFullDateSafe(item.at)} ${formatTimeSafe(item.at)}`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => onRemove(item.id) }])}><Text style={s.removeText}>Remove</Text></Pressable></View>} ListEmptyComponent={<View style={s.empty}><Text style={s.amount}>No water logged yet</Text><Text style={s.time}>Add water from Hydration to start your history.</Text></View>} />
  </SafeAreaView>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' }, header: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 24, gap: 12 }, back: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }, backText: { color: '#F5F5F5', fontSize: 16 }, title: { color: '#F5F5F5', fontSize: 30, fontWeight: '600', letterSpacing: -1 }, subtitle: { color: '#A3A3A3', fontSize: 13 }, list: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 24, paddingBottom: 32 }, dateRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingTop: 24, paddingBottom: 14 }, date: { color: '#BDBDBD', fontSize: 12, fontWeight: '600' }, total: { color: '#A3A3A3', fontSize: 12 }, entry: { ...corners.inset, borderWidth: 1, borderColor: '#2C2C2C', backgroundColor: '#121212', padding: 18, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }, amount: { color: '#F5F5F5', fontSize: 17, fontWeight: '500' }, time: { color: '#A3A3A3', fontSize: 12, marginTop: 7, lineHeight: 20 }, remove: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }, removeText: { color: '#BDBDBD', fontSize: 12 }, empty: { ...corners.card, padding: 24, backgroundColor: '#121212', borderWidth: 1, borderColor: '#2C2C2C', marginTop: 20 },
});
