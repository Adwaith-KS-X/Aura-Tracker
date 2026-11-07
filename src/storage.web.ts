import { emptyData, readData, type TrackerData } from './domain';

const key = 'aura-tracker-v1';
export function loadData(): TrackerData {
  const saved = localStorage.getItem(key);
  return saved ? readData(saved) : emptyData();
}
export function persistData(data: TrackerData): void {
  localStorage.setItem(key, JSON.stringify(data));
}
