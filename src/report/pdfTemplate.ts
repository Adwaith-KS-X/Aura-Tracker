import type { Profile } from '../account/profile.ts';
import { kgToPounds } from '../account/profile.ts';
import { calculateBMI, ageOnDate } from '../bmi.ts';
import { bmiReview } from '../progressModel.ts';
import { recentDays, sortedWeights, localDay, type TrackerData, type WeightEntry, type WaterEntry, type ExerciseEntry, type MacroEntry } from '../domain.ts';
import { formatDateSafe, formatNumberSafe } from '../dateUtils.ts';

export type ReportRange = '1 day' | '7 days' | '30 days';

function fmt(n: number, decimals = 1): string {
  return formatNumberSafe(n, decimals);
}

function formatDate(dateStr: string): string {
  return formatDateSafe(dateStr, true);
}

export function generateReportHtml(
  profile: Profile,
  data: TrackerData,
  range: ReportRange,
  today = localDay()
): string {
  const dayCount = range === '1 day' ? 1 : range === '7 days' ? 7 : 30;
  const days = recentDays(dayCount, new Date(`${today}T12:00:00`));
  const startDate = days[0];
  const endDate = days[days.length - 1];

  const weightUnit = profile.weight_unit;
  const convertWeight = (kg: number) => (weightUnit === 'lb' ? kgToPounds(kg) : kg);

  // Filter records within range
  const rangeWeights = sortedWeights(data.weights).filter(w => w.day >= startDate && w.day <= endDate);
  const allSortedWeights = sortedWeights(data.weights);
  const latestWeightEntry = allSortedWeights[allSortedWeights.length - 1];
  const currentWeightKg = latestWeightEntry ? latestWeightEntry.kg : profile.initial_weight_kg;
  const currentWeightDisplay = convertWeight(currentWeightKg);

  const startWeightEntry = rangeWeights[0];
  const endWeightEntry = rangeWeights[rangeWeights.length - 1];
  const weightChangeVal = startWeightEntry && endWeightEntry && rangeWeights.length > 1
    ? convertWeight(endWeightEntry.kg) - convertWeight(startWeightEntry.kg)
    : null;

  const currentBmi = calculateBMI(currentWeightKg, profile.height_cm) ?? 0;
  const bmiInfo = bmiReview(currentWeightKg, profile.height_cm, profile.dob);

  // Hydration calculations
  const waterEntries = data.water.filter(w => {
    const d = w.day ?? localDay(new Date(w.at));
    return d >= startDate && d <= endDate;
  });
  const waterByDay = new Map<string, number>(days.map(d => [d, 0]));
  for (const w of waterEntries) {
    const d = w.day ?? localDay(new Date(w.at));
    if (waterByDay.has(d)) {
      waterByDay.set(d, waterByDay.get(d)! + w.ml);
    }
  }
  const totalWaterMl = Array.from(waterByDay.values()).reduce((sum, v) => sum + v, 0);
  const avgWaterMl = totalWaterMl / dayCount;
  const daysMetGoal = Array.from(waterByDay.values()).filter(v => v >= data.goalMl).length;
  const compliancePct = Math.round((daysMetGoal / dayCount) * 100);

  // Nutrition / Macros calculations
  const macrosEntries = (data.macros ?? []).filter(m => m.day >= startDate && m.day <= endDate);
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalKcal = 0;
  for (const m of macrosEntries) {
    totalProtein += m.protein;
    totalCarbs += m.carbs;
    totalFat += m.fat;
    const estKcal = m.kcal !== undefined ? m.kcal : m.protein * 4 + m.carbs * 4 + m.fat * 9;
    totalKcal += estKcal;
  }
  const avgKcal = totalKcal / dayCount;
  const avgProtein = totalProtein / dayCount;
  const avgCarbs = totalCarbs / dayCount;
  const avgFat = totalFat / dayCount;

  // Workouts / Exercises calculations
  const exerciseEntries = data.exercises.filter(e => {
    const d = e.day ?? localDay(new Date(e.at));
    return d >= startDate && d <= endDate;
  });
  const trainingDays = new Set(exerciseEntries.map(e => e.day ?? localDay(new Date(e.at)))).size;
  const totalSets = exerciseEntries.reduce((sum, e) => sum + e.sets, 0);
  const totalReps = exerciseEntries.reduce((sum, e) => sum + e.sets * e.reps, 0);
  const totalTonnageKg = exerciseEntries.reduce((sum, e) => sum + e.sets * e.reps * (e.kg || 0), 0);

  // High-Resolution Vector SVG Line Chart Builder (Print Document Grade)
  function buildLineChartSvg(
    points: { label: string; value: number }[],
    strokeColor: string,
    unitStr: string,
    targetLine?: number
  ): string {
    if (!points.length) {
      return '<div class="no-chart">No measurement points recorded in this period.</div>';
    }
    const width = 680;
    const height = 180;
    const padL = 50;
    const padR = 20;
    const padT = 20;
    const padB = 30;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    const values = points.map(p => p.value);
    let minV = Math.min(...values, targetLine ?? Infinity);
    let maxV = Math.max(...values, targetLine ?? -Infinity);
    if (minV === maxV) {
      minV = Math.max(0, minV - 5);
      maxV = maxV + 5;
    }
    const span = maxV - minV || 1;

    const getX = (i: number) => (points.length === 1 ? padL + plotW / 2 : padL + (i / (points.length - 1)) * plotW);
    const getY = (val: number) => padT + plotH - ((val - minV) / span) * plotH;

    const coords = points.map((p, i) => ({ x: getX(i), y: getY(p.value) }));
    const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');

    let svg = `<svg viewBox="0 0 ${width} ${height}" class="chart-svg">`;
    // Background card for chart
    svg += `<rect width="${width}" height="${height}" fill="#FDFDFD" rx="6" />`;
    // Grid lines
    for (let t = 0; t <= 1; t += 0.5) {
      const y = padT + plotH * (1 - t);
      const val = minV + t * span;
      svg += `<line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" stroke="#E5E7EB" stroke-dasharray="3,3" />`;
      svg += `<text x="${padL - 8}" y="${y + 4}" fill="#6B7280" font-size="10" font-family="sans-serif" text-anchor="end">${fmt(val, 1)}</text>`;
    }

    // Target line if any (e.g. water goal)
    if (targetLine !== undefined) {
      const ty = getY(targetLine);
      svg += `<line x1="${padL}" y1="${ty}" x2="${width - padR}" y2="${ty}" stroke="#059669" stroke-dasharray="4,4" stroke-width="1.5" />`;
      svg += `<text x="${width - padR}" y="${ty - 5}" fill="#059669" font-size="10" font-family="sans-serif" font-weight="600" text-anchor="end">Daily Goal: ${fmt(targetLine)} ${unitStr}</text>`;
    }

    // Main line path
    svg += `<path d="${pathD}" fill="none" stroke="${strokeColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />`;

    // Data points
    coords.forEach((c) => {
      svg += `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="4.5" fill="#FFFFFF" stroke="${strokeColor}" stroke-width="2.5" />`;
    });

    // X axis labels
    if (points.length > 0) {
      svg += `<text x="${coords[0].x}" y="${height - 8}" fill="#6B7280" font-size="10" font-family="sans-serif" text-anchor="start">${points[0].label}</text>`;
      if (points.length > 2) {
        const midIdx = Math.floor(points.length / 2);
        svg += `<text x="${coords[midIdx].x}" y="${height - 8}" fill="#6B7280" font-size="10" font-family="sans-serif" text-anchor="middle">${points[midIdx].label}</text>`;
      }
      if (points.length > 1) {
        svg += `<text x="${coords[coords.length - 1].x}" y="${height - 8}" fill="#6B7280" font-size="10" font-family="sans-serif" text-anchor="end">${points[points.length - 1].label}</text>`;
      }
    }

    svg += '</svg>';
    return svg;
  }

  // Multi-line chart for Macros (Protein, Carbs, Fat)
  function buildMacrosChartSvg(): string {
    const dailyMacros = days.map(d => {
      const entries = macrosEntries.filter(m => m.day === d);
      return {
        day: d.slice(5),
        protein: entries.reduce((s, m) => s + m.protein, 0),
        carbs: entries.reduce((s, m) => s + m.carbs, 0),
        fat: entries.reduce((s, m) => s + m.fat, 0),
      };
    });

    const maxVal = Math.max(10, ...dailyMacros.flatMap(m => [m.protein, m.carbs, m.fat])) * 1.15;
    const width = 680;
    const height = 180;
    const padL = 50;
    const padR = 20;
    const padT = 20;
    const padB = 30;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    const getX = (i: number) => (dailyMacros.length === 1 ? padL + plotW / 2 : padL + (i / (dailyMacros.length - 1)) * plotW);
    const getY = (val: number) => padT + plotH - (val / maxVal) * plotH;

    let svg = `<svg viewBox="0 0 ${width} ${height}" class="chart-svg">`;
    svg += `<rect width="${width}" height="${height}" fill="#FDFDFD" rx="6" />`;
    for (let t = 0; t <= 1; t += 0.5) {
      const y = padT + plotH * (1 - t);
      svg += `<line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" stroke="#E5E7EB" stroke-dasharray="3,3" />`;
      svg += `<text x="${padL - 8}" y="${y + 4}" fill="#6B7280" font-size="10" font-family="sans-serif" text-anchor="end">${Math.round(t * maxVal)}g</text>`;
    }

    const series = [
      { key: 'protein' as const, color: '#7C3AED', name: 'Protein' },
      { key: 'carbs' as const, color: '#D97706', name: 'Carbs' },
      { key: 'fat' as const, color: '#E11D48', name: 'Fat' },
    ];

    series.forEach(s => {
      const pathD = dailyMacros.map((m, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(m[s.key]).toFixed(1)}`).join(' ');
      svg += `<path d="${pathD}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />`;
      dailyMacros.forEach((m, i) => {
        svg += `<circle cx="${getX(i).toFixed(1)}" cy="${getY(m[s.key]).toFixed(1)}" r="3.5" fill="#FFFFFF" stroke="${s.color}" stroke-width="2" />`;
      });
    });

    if (dailyMacros.length > 0) {
      svg += `<text x="${getX(0)}" y="${height - 8}" fill="#6B7280" font-size="10" font-family="sans-serif" text-anchor="start">${dailyMacros[0].day}</text>`;
      if (dailyMacros.length > 1) {
        svg += `<text x="${getX(dailyMacros.length - 1)}" y="${height - 8}" fill="#6B7280" font-size="10" font-family="sans-serif" text-anchor="end">${dailyMacros[dailyMacros.length - 1].day}</text>`;
      }
    }

    svg += '</svg>';
    return svg;
  }

  // Weight and BMI points
  const weightPoints = (rangeWeights.length ? rangeWeights : latestWeightEntry ? [latestWeightEntry] : []).map(w => ({
    label: w.day.slice(5),
    value: convertWeight(w.kg),
  }));

  const bmiPoints = (rangeWeights.length ? rangeWeights : latestWeightEntry ? [latestWeightEntry] : []).map(w => ({
    label: w.day.slice(5),
    value: calculateBMI(w.kg, profile.height_cm) || 0,
  }));

  const waterPoints = days.map(d => ({
    label: d.slice(5),
    value: (waterByDay.get(d) || 0) / 1000,
  }));

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Aura Tracker - Health & Fitness Report</title>
  <style>
    @page {
      margin: 14mm 16mm 14mm 16mm;
      size: A4 portrait;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #FFFFFF;
      color: #111827;
      margin: 0;
      padding: 0;
      font-size: 10pt;
      line-height: 1.5;
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #111827;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }
    .brand-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-title {
      font-size: 22pt;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #111827;
      margin: 0;
      line-height: 1;
    }
    .brand-title span { font-weight: 400; color: #4B5563; }
    .report-meta {
      text-align: right;
    }
    .report-badge {
      display: inline-block;
      background: #F3F4F6;
      color: #111827;
      font-size: 8.5pt;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid #E5E7EB;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    .report-date {
      font-size: 9pt;
      color: #4B5563;
      margin-top: 4px;
      font-weight: 500;
    }
    .section-title {
      font-size: 13pt;
      font-weight: 700;
      color: #111827;
      margin: 24px 0 12px 0;
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 1.5px solid #E5E7EB;
      padding-bottom: 5px;
    }
    .kpi-grid {
      display: flex;
      gap: 10px;
      margin-bottom: 16px;
    }
    .kpi-card {
      flex: 1;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 12px 14px;
    }
    .kpi-label {
      font-size: 7.5pt;
      font-weight: 700;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin-bottom: 4px;
    }
    .kpi-val {
      font-size: 18pt;
      font-weight: 800;
      color: #111827;
      line-height: 1.1;
    }
    .kpi-val small { font-size: 10pt; font-weight: 500; color: #6B7280; }
    .kpi-sub {
      font-size: 8pt;
      color: #6B7280;
      margin-top: 4px;
    }
    .chart-box {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 14px;
      margin-bottom: 14px;
      page-break-inside: avoid;
    }
    .chart-title {
      font-size: 10.5pt;
      font-weight: 700;
      color: #1F2937;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .chart-svg {
      width: 100%;
      height: auto;
      max-height: 180px;
      display: block;
      border: 1px solid #F3F4F6;
      border-radius: 6px;
    }
    .no-chart {
      text-align: center;
      padding: 24px;
      color: #9CA3AF;
      font-size: 9pt;
      font-style: italic;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 9pt;
    }
    .data-table th {
      background: #F3F4F6;
      color: #374151;
      text-align: left;
      padding: 8px 10px;
      font-weight: 700;
      font-size: 8pt;
      text-transform: uppercase;
      border-bottom: 1.5px solid #D1D5DB;
    }
    .data-table td {
      padding: 7px 10px;
      border-bottom: 1px solid #E5E7EB;
      color: #1F2937;
    }
    .data-table tr:nth-child(even) td {
      background: #F9FAFB;
    }
    .legend-row {
      display: flex;
      gap: 14px;
      font-size: 8.5pt;
      margin-top: 4px;
      color: #4B5563;
      font-weight: 600;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .legend-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .card-row {
      display: flex;
      gap: 10px;
      page-break-inside: avoid;
    }
    .card-col {
      flex: 1;
    }
    .footer {
      margin-top: 30px;
      border-top: 1px solid #E5E7EB;
      padding-top: 12px;
      font-size: 8pt;
      color: #6B7280;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    .tag {
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
    }
    .tag-met { background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0; }
    .tag-unmet { background: #FFF1F2; color: #BE123C; border: 1px solid #FECDD3; }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header-bar">
    <div class="brand-group">
      <!-- Aura Tracker Official Concentric Ring Logo -->
      <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
        <circle cx="21" cy="21" r="16" stroke="#111827" stroke-width="6.5" />
        <circle cx="21" cy="21" r="3.2" fill="#111827" />
      </svg>
      <div>
        <h1 class="brand-title">aura <span>tracker</span></h1>
        <div style="font-size: 8pt; color: #6B7280; font-weight: 600; letter-spacing: 0.8px; margin-top: 2px;">EXECUTIVE HEALTH & FITNESS REPORT</div>
      </div>
    </div>
    <div class="report-meta">
      <span class="report-badge">${range} Summary</span>
      <div class="report-date">${formatDate(startDate)} &ndash; ${formatDate(endDate)}</div>
      <div style="font-size: 7.5pt; color: #9CA3AF; margin-top: 2px;">Generated on ${formatDate(today)}</div>
    </div>
  </div>

  <!-- USER PROFILE SUMMARY -->
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Patient / User Profile</div>
      <div class="kpi-val" style="font-size: 15pt;">${profile.name}</div>
      <div class="kpi-sub">Height: ${profile.height_cm} cm · Born: ${profile.dob}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Current Weight</div>
      <div class="kpi-val">${fmt(currentWeightDisplay)} <small>${weightUnit}</small></div>
      <div class="kpi-sub">${weightChangeVal !== null ? `${weightChangeVal >= 0 ? '+' : ''}${fmt(weightChangeVal)} ${weightUnit} in period` : 'Single weigh-in recorded'}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">BMI Score</div>
      <div class="kpi-val" style="color: #0D9488;">${currentBmi ? currentBmi.toFixed(1) : '—'}</div>
      <div class="kpi-sub">${bmiInfo.title}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Active Training</div>
      <div class="kpi-val">${trainingDays} <small>sessions</small></div>
      <div class="kpi-sub">${totalSets} sets · ${totalReps} total reps</div>
    </div>
  </div>

  <!-- SECTION: BODY WEIGHT & BMI -->
  <div class="section-title">⚖️ Body Weight & BMI Trends</div>
  <div class="card-row">
    <div class="card-col">
      <div class="chart-box">
        <div class="chart-title">
          <span>Body Weight Trend (${weightUnit})</span>
          <span style="font-size: 8.5pt; color: #6B7280;">${weightPoints.length} recorded measurements</span>
        </div>
        ${buildLineChartSvg(weightPoints, '#0D9488', weightUnit)}
      </div>
    </div>
    <div class="card-col">
      <div class="chart-box">
        <div class="chart-title">
          <span>BMI Index Evolution</span>
          <span style="font-size: 8.5pt; color: #6B7280;">Height ${profile.height_cm} cm</span>
        </div>
        ${buildLineChartSvg(bmiPoints, '#7C3AED', 'BMI')}
      </div>
    </div>
  </div>

  <!-- SECTION: HYDRATION -->
  <div class="section-title">💧 Hydration Summary</div>
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Total Water Consumed</div>
      <div class="kpi-val">${fmt(totalWaterMl / 1000, 2)} <small>L</small></div>
      <div class="kpi-sub">${fmt(totalWaterMl, 0)} ml total intake in period</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Daily Average</div>
      <div class="kpi-val">${fmt(avgWaterMl, 0)} <small>ml/day</small></div>
      <div class="kpi-sub">Target: ${fmt(data.goalMl, 0)} ml daily goal</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Goal Compliance Rate</div>
      <div class="kpi-val" style="color: #059669;">${compliancePct}%</div>
      <div class="kpi-sub">${daysMetGoal} of ${dayCount} days met daily target</div>
    </div>
  </div>

  <div class="chart-box">
    <div class="chart-title">
      <span>Daily Hydration vs Goal (${fmt(data.goalMl / 1000, 1)} L)</span>
      <span style="font-size: 8.5pt; color: #6B7280;">Volume logged per calendar day</span>
    </div>
    ${buildLineChartSvg(waterPoints, '#2563EB', 'L', data.goalMl / 1000)}
  </div>

  <!-- TABLE: HYDRATION BREAKDOWN -->
  ${dayCount > 1 ? `
  <div class="chart-box">
    <div class="chart-title"><span>Daily Hydration Log Table</span></div>
    <table class="data-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Intake (ml)</th>
          <th>Intake (L)</th>
          <th>% of Goal</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${days.map(d => {
          const ml = waterByDay.get(d) || 0;
          const pct = Math.round((ml / data.goalMl) * 100);
          const isMet = ml >= data.goalMl;
          return `<tr>
            <td>${formatDate(d)}</td>
            <td><strong>${fmt(ml, 0)} ml</strong></td>
            <td>${fmt(ml / 1000, 2)} L</td>
            <td>${pct}%</td>
            <td><span class="tag ${isMet ? 'tag-met' : 'tag-unmet'}">${isMet ? 'Goal Met' : 'Below Goal'}</span></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <!-- SECTION: NUTRITION & MACROS -->
  <div class="section-title">🥗 Nutrition & Macronutrient Intake</div>
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Total Calories Consumed</div>
      <div class="kpi-val">${fmt(totalKcal, 0)} <small>kcal</small></div>
      <div class="kpi-sub">Daily average: ${fmt(avgKcal, 0)} kcal/day</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Protein</div>
      <div class="kpi-val" style="color: #7C3AED;">${fmt(totalProtein, 0)} <small>g</small></div>
      <div class="kpi-sub">Daily avg: ${fmt(avgProtein, 1)} g</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Carbohydrates</div>
      <div class="kpi-val" style="color: #D97706;">${fmt(totalCarbs, 0)} <small>g</small></div>
      <div class="kpi-sub">Daily avg: ${fmt(avgCarbs, 1)} g</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Dietary Fat</div>
      <div class="kpi-val" style="color: #E11D48;">${fmt(totalFat, 0)} <small>g</small></div>
      <div class="kpi-sub">Daily avg: ${fmt(avgFat, 1)} g</div>
    </div>
  </div>

  <div class="chart-box">
    <div class="chart-title">
      <span>Macronutrient Intake Curve</span>
      <div class="legend-row">
        <div class="legend-item"><div class="legend-dot" style="background:#7C3AED;"></div> Protein</div>
        <div class="legend-item"><div class="legend-dot" style="background:#D97706;"></div> Carbs</div>
        <div class="legend-item"><div class="legend-dot" style="background:#E11D48;"></div> Fat</div>
      </div>
    </div>
    ${buildMacrosChartSvg()}
  </div>

  <!-- TABLE: LOGGED MEALS -->
  <div class="chart-box">
    <div class="chart-title"><span>Logged Foods & Meals (${macrosEntries.length} items)</span></div>
    ${macrosEntries.length ? `
    <table class="data-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Meal / Food Item</th>
          <th>Portion</th>
          <th>Calories</th>
          <th>Protein</th>
          <th>Carbs</th>
          <th>Fat</th>
        </tr>
      </thead>
      <tbody>
        ${macrosEntries.map(m => `
          <tr>
            <td>${formatDate(m.day)}</td>
            <td><strong>${m.name}</strong></td>
            <td>${m.grams ? `${fmt(m.grams, 0)} g` : '1 serving'}</td>
            <td><strong>${m.kcal !== undefined ? `${fmt(m.kcal, 0)} kcal` : `${fmt(m.protein * 4 + m.carbs * 4 + m.fat * 9, 0)} kcal`}</strong></td>
            <td style="color:#7C3AED; font-weight:600;">${fmt(m.protein, 1)} g</td>
            <td style="color:#D97706; font-weight:600;">${fmt(m.carbs, 1)} g</td>
            <td style="color:#E11D48; font-weight:600;">${fmt(m.fat, 1)} g</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ` : '<div class="no-chart">No meals or food items logged in this period.</div>'}
  </div>

  <!-- SECTION: TRAINING & WORKOUT ACTIVITY -->
  <div class="section-title">🏋️ Training & Workout Activity</div>
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Total Workouts</div>
      <div class="kpi-val">${trainingDays} <small>sessions</small></div>
      <div class="kpi-sub">${exerciseEntries.length} exercise entries</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Volume Sets Completed</div>
      <div class="kpi-val">${totalSets} <small>sets</small></div>
      <div class="kpi-sub">${totalReps} total repetitions performed</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Cumulative Tonnage</div>
      <div class="kpi-val" style="color: #0D9488;">${fmt(totalTonnageKg, 0)} <small>kg</small></div>
      <div class="kpi-sub">Total weight lifted in period</div>
    </div>
  </div>

  <!-- TABLE: EXERCISE DETAILS -->
  <div class="chart-box">
    <div class="chart-title"><span>Workout Activity Breakdown (${exerciseEntries.length} entries)</span></div>
    ${exerciseEntries.length ? `
    <table class="data-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Exercise Name</th>
          <th>Sets</th>
          <th>Reps / Set</th>
          <th>Load</th>
          <th>Tonnage (Sets × Reps × Load)</th>
        </tr>
      </thead>
      <tbody>
        ${exerciseEntries.map(e => {
          const loadStr = e.kg ? `${fmt(e.kg)} kg` : 'Bodyweight';
          const tonnage = e.kg ? `${fmt(e.sets * e.reps * e.kg, 0)} kg` : '—';
          return `<tr>
            <td>${formatDate(e.day ?? localDay(new Date(e.at)))}</td>
            <td><strong>${e.name}</strong></td>
            <td>${e.sets}</td>
            <td>${e.reps}</td>
            <td><strong>${loadStr}</strong></td>
            <td style="color:#0D9488; font-weight:600;">${tonnage}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    ` : '<div class="no-chart">No exercise sets logged in this period.</div>'}
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div>Aura Tracker &copy; ${new Date().getFullYear()} &middot; Personal Health & Fitness Report</div>
    <div>CONFIDENTIAL DOCUMENT &middot; PREPARED FOR PERSONAL AND COACHING USE</div>
  </div>

</body>
</html>`;
}
