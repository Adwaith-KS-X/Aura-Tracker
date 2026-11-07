import React, { useState } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '../Typography';
import { Alert } from '../dialogs';
import { corners } from '../theme';
import type { Profile } from '../account/profile';
import type { TrackerData } from '../domain';
import { exportReportPdf } from './pdfGenerator';
import type { ReportRange } from './pdfTemplate';

const ranges: { id: ReportRange; label: string; sub: string }[] = [
  { id: '1 day', label: '1 Day', sub: 'Today' },
  { id: '7 days', label: '7 Days', sub: 'Weekly' },
  { id: '30 days', label: '30 Days', sub: 'Monthly' },
];

export function ReportExporter({
  profile,
  data,
}: {
  profile: Profile;
  data: TrackerData;
}) {
  const [range, setRange] = useState<ReportRange>('7 days');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  async function handleGeneratePdf() {
    if (loading) return;
    setLoading(true);
    setNotice('');

    try {
      const res = await exportReportPdf(profile, data, range);
      if (res.success) {
        setNotice(`PDF report for ${range} generated successfully!`);
      } else {
        Alert.alert('Report Generation Error', res.error || 'Failed to create PDF.');
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not create PDF report.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={s.card}>
      <View style={s.header}>
        <Text style={s.title}>📑 Export PDF Report</Text>
        <Text style={s.desc}>
          Download a comprehensive report with your vitals, hydration, macros, graphs, and full workout history.
        </Text>
      </View>

      <Text style={s.label}>SELECT TIMEFRAME</Text>
      <View style={s.rangeRow}>
        {ranges.map(item => {
          const active = range === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.label} report`}
              accessibilityState={{ selected: active }}
              onPress={() => {
                setRange(item.id);
                setNotice('');
              }}
              style={[s.rangeBtn, active && s.rangeBtnActive]}
            >
              <Text style={[s.rangeLabel, active && s.rangeLabelActive]}>{item.label}</Text>
              <Text style={[s.rangeSub, active && s.rangeSubActive]}>{item.sub}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={loading}
        onPress={handleGeneratePdf}
        style={({ pressed }) => [s.downloadBtn, (pressed || loading) && { opacity: 0.6 }]}
      >
        {loading ? (
          <ActivityIndicator color="#121212" size="small" />
        ) : (
          <Text style={s.downloadBtnText}>Download {range} PDF Report</Text>
        )}
      </Pressable>

      {!!notice && <Text style={s.noticeText}>{notice}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    ...corners.card,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#2C2C2C',
    padding: 18,
    gap: 14,
    width: '100%',
    marginVertical: 12,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5F5F5',
  },
  desc: {
    fontSize: 12,
    color: '#A3A3A3',
    lineHeight: 18,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    color: '#8E8E8E',
    marginTop: 2,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rangeBtn: {
    flex: 1,
    backgroundColor: '#1C1C1C',
    borderWidth: 1,
    borderColor: '#303030',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  rangeBtnActive: {
    backgroundColor: '#F5F5F5',
    borderColor: '#F5F5F5',
  },
  rangeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#BDBDBD',
  },
  rangeLabelActive: {
    color: '#121212',
  },
  rangeSub: {
    fontSize: 10,
    color: '#777777',
  },
  rangeSubActive: {
    color: '#333333',
  },
  downloadBtn: {
    ...corners.button,
    backgroundColor: '#F5F5F5',
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  downloadBtnText: {
    color: '#121212',
    fontSize: 13,
    fontWeight: '600',
  },
  noticeText: {
    fontSize: 11,
    color: '#65D9C5',
    textAlign: 'center',
    lineHeight: 16,
  },
});
