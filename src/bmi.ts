// Formula and age interpretation: https://www.cdc.gov/bmi/about/index.html
export function ageOnDate(dob: string, now = new Date()): number {
  const [year, month, day] = dob.split('-').map(Number);
  return now.getFullYear() - year - (now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day) ? 1 : 0);
}
export function calculateBMI(weightKg: number, heightCm: number): number | null {
  if (!Number.isFinite(weightKg) || !Number.isFinite(heightCm) || weightKg <= 0 || heightCm <= 0) return null;
  return Math.round(weightKg / (heightCm / 100) ** 2 * 10) / 10;
}
export function profileBMI(weightKg: number, heightCm: number, dob: string, now = new Date()) {
  const age = ageOnDate(dob, now);
  return {
    value: age >= 2 ? calculateBMI(weightKg, heightCm) : null,
    note: age < 2 ? 'BMI is not shown for children under 2.' : age < 20 ? 'For ages 2–19, interpreting BMI needs age- and sex-specific growth charts.' : 'BMI is a screening measure, not a diagnosis.',
  };
}
