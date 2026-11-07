export type HeightUnit = 'cm' | 'ft';
export type WeightUnit = 'kg' | 'lb';
export type Profile = {
  id: string; name: string; dob: string; height_cm: number;
  initial_weight_kg: number; height_unit: HeightUnit; weight_unit: WeightUnit;
};
export type ProfileInput = {
  name: string; dob: string; height: string; inches: string; weight: string;
  heightUnit: HeightUnit; weightUnit: WeightUnit;
};
const numeric = (value: string) => /^\d+(?:[.,]\d+)?$/.test(value.trim()) ? Number(value.trim().replace(',', '.')) : NaN;
export const poundsToKg = (value: number) => value * 0.45359237;
export const kgToPounds = (value: number) => value / 0.45359237;
export const inchesToCm = (value: number) => value * 2.54;
export const round = (value: number, places = 2) => Math.round(value * 10 ** places) / 10 ** places;

export function validDateOfBirth(value: string, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  const [year, month, day] = value.split('-').map(Number);
  return date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() === day && year >= 1900 && date <= new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
}
export function validateProfile(input: ProfileInput, now = new Date()): Omit<Profile, 'id'> {
  const name = input.name.trim();
  if (name.length < 1 || name.length > 80) throw new Error('Enter your name (up to 80 characters).');
  if (!validDateOfBirth(input.dob, now)) throw new Error('Enter a real date of birth in YYYY-MM-DD format, from 1900 through today.');
  const height = numeric(input.height);
  const inches = input.inches.trim() ? numeric(input.inches) : 0;
  if (input.heightUnit === 'ft' && (!Number.isInteger(height) || height < 0 || !Number.isFinite(inches) || inches < 0 || inches >= 12)) throw new Error('Use whole feet and inches from 0 to less than 12.');
  const heightCm = input.heightUnit === 'cm' ? height : inchesToCm(height * 12 + inches);
  if (!Number.isFinite(heightCm) || heightCm < 30 || heightCm > 300) throw new Error('Enter a height between 30 and 300 cm, or its equivalent in feet and inches.');
  const weight = numeric(input.weight);
  const weightKg = input.weightUnit === 'kg' ? weight : poundsToKg(weight);
  if (!Number.isFinite(weightKg) || weightKg < 1 || weightKg > 700) throw new Error('Enter a weight between 1 and 700 kg, or its equivalent in pounds.');
  return { name, dob: input.dob, height_cm: round(heightCm), initial_weight_kg: round(weightKg), height_unit: input.heightUnit, weight_unit: input.weightUnit };
}
export function validateCredentials(email: string, password: string, creating: boolean): string {
  const normalized = email.trim().toLowerCase();
  if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error('Enter a valid email address. Gmail addresses are welcome.');
  if (!password) throw new Error('Enter your password.');
  if (creating && (password.length < 12 || new TextEncoder().encode(password).length > 72)) throw new Error('Use at least 12 characters and at most 72 UTF-8 bytes for your password.');
  return normalized;
}
