export type WaterEntry = { id: string; at: string; day?: string; ml: number };
export type ExerciseEntry = { id: string; at: string; day?: string; name: string; sets: number; reps: number; kg: number };
// Older saved entries have a date only. Keep them without inventing a recording time.
export type WeightEntry = { day: string; kg: number; id?: string; at?: string };
export type MacroEntry = { id: string; at: string; day: string; name: string; protein: number; carbs: number; fat: number; kcal?: number; grams?: number; foodId?: string; source?: string };
export type TrackerData = { version: 1; goalMl: number; water: WaterEntry[]; exercises: ExerciseEntry[]; weights: WeightEntry[]; macros?: MacroEntry[] };

export function emptyData(): TrackerData {
  return { version: 1, goalMl: 2000, water: [], exercises: [], weights: [] };
}

// Use calendar days on the device, rather than UTC, for daily totals.
export function localDay(date: Date | string | number | null | undefined = new Date()): string {
  const d = date ? (date instanceof Date ? date : new Date(date)) : new Date();
  const safeDate = isNaN(d.getTime()) ? new Date() : d;
  return `${safeDate.getFullYear()}-${String(safeDate.getMonth() + 1).padStart(2, '0')}-${String(safeDate.getDate()).padStart(2, '0')}`;
}

export function positiveNumber(value: string, max: number): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const result = Number(normalized);
  return Number.isFinite(result) && result > 0 && result <= max ? result : null;
}

export function waterOnDay(data: TrackerData, day: string): number {
  return data.water.filter(entry => (entry.day ?? localDay(new Date(entry.at))) === day).reduce((sum, entry) => sum + entry.ml, 0);
}

export const weightKey = (entry: WeightEntry) => entry.id ?? `legacy-weight-${entry.day}`;
export function sortedWeights(weights: WeightEntry[]) {
  return [...weights].sort((a,b)=>a.day.localeCompare(b.day)||(a.at??'').localeCompare(b.at??''));
}
export function saveWeight(data: TrackerData, day: string, kg: number, at = new Date().toISOString()): TrackerData {
  let suffix=data.weights.length;
  let id=`weight-${at}-${suffix}`;
  while(data.weights.some(e=>e.id===id))id=`weight-${at}-${++suffix}`;
  return { ...data, weights: sortedWeights([...data.weights, { id, at, day, kg }]) };
}

export function weightChange(weights: WeightEntry[]): number | null {
  if (weights.length < 2) return null;
  const sorted = sortedWeights(weights);
  return Math.round((sorted[sorted.length - 1].kg - sorted[sorted.length - 2].kg) * 100) / 100;
}

export function recentDays(count: number, now = new Date()): string[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (count - 1 - index));
    return localDay(date);
  });
}

export function readData(raw: string): TrackerData {
  const value = JSON.parse(raw);
  const finite = (n: unknown, min: number, max: number): boolean => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
  const validTime = (at: unknown): boolean => typeof at === 'string' && Number.isFinite(Date.parse(at));
  const validDay = (day: unknown): boolean => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) && localDay(new Date(`${day}T12:00:00`)) === day;
  if (!value || value.version !== 1 || !finite(value.goalMl, 100, 10000) ||
      !Array.isArray(value.water) || !Array.isArray(value.exercises) || !Array.isArray(value.weights) ||
      !value.water.every((e: WaterEntry) => e && typeof e.id === 'string' && validTime(e.at) && (e.day === undefined || validDay(e.day)) && finite(e.ml, 1, 5000)) ||
      !value.weights.every((e: WeightEntry) => e && validDay(e.day) && finite(e.kg, 1, 700) && (e.id === undefined || (typeof e.id === 'string' && e.id.length > 0)) && (e.at === undefined || validTime(e.at))) ||
      !value.exercises.every((e: ExerciseEntry) => e && typeof e.id === 'string' && validTime(e.at) && (e.day === undefined || validDay(e.day)) && typeof e.name === 'string' && e.name.trim().length > 0 && finite(e.sets, 1, 100) && Number.isInteger(e.sets) && finite(e.reps, 1, 1000) && Number.isInteger(e.reps) && finite(e.kg, 0, 1000))) {
    throw new Error('Saved data has an unsupported format.');
  }
  if (value.macros !== undefined && (!Array.isArray(value.macros) || !value.macros.every((e: MacroEntry) => e && typeof e.id === 'string' && validTime(e.at) && validDay(e.day) && typeof e.name === 'string' && e.name.trim().length > 0 && e.name.length <= 250 && [e.protein,e.carbs,e.fat].every(n=>finite(n,0,2000)) && (e.kcal===undefined||finite(e.kcal,0,20000)) && (e.grams===undefined||finite(e.grams,.001,2000)) && (e.foodId===undefined||typeof e.foodId==='string') && (e.source===undefined||typeof e.source==='string')))) throw new Error('Saved nutrition data has an unsupported format.');
  return value;
}
