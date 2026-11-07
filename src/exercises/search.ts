export type Exercise = { id: string; name: string; bodyPart: string; equipment: string; target: string; secondary: string[]; steps: string[] };
import { animatedExerciseIds } from './animationIds.ts';
export const demoIds = new Set<string>(animatedExerciseIds);
const aliases: Record<string, string> = {
  '0662': 'pushup pushups push ups', '0294': 'bicep curls biceps curls',
  '3224': 'jumping jack jumping jacks', 'aura-squat': 'air squat squats bodyweight',
};
export const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
export function createSearchIndex(exercises: Exercise[]) {
  return exercises.map(exercise => ({ exercise, text: normalize([exercise.name, exercise.bodyPart, exercise.equipment, exercise.target, ...exercise.secondary, aliases[exercise.id] ?? ''].join(' ')), name: normalize(exercise.name) }));
}
export function searchExercises(index: ReturnType<typeof createSearchIndex>, query: string, bodyPart = 'All', equipment = 'All', demosOnly = false): Exercise[] {
  const normalized = normalize(query), words = normalized.split(' ').filter(Boolean);
  return index.filter(({exercise:e,text}) => (bodyPart === 'All' || e.bodyPart === bodyPart) && (equipment === 'All' || e.equipment === equipment) && (!demosOnly || demoIds.has(e.id)) && words.every(word => text.includes(word)))
    .sort((a,b) => Number(b.name === normalized) - Number(a.name === normalized) || Number(b.name.startsWith(normalized)) - Number(a.name.startsWith(normalized)) || a.name.localeCompare(b.name))
    .map(item => item.exercise);
}
