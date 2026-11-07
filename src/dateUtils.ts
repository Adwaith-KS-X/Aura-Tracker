// Safe, pure-JavaScript date and time formatters that never crash Hermes or Android native Intl

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatTimeSafe(isoOrDate: string | Date | undefined | null): string {
  if (!isoOrDate) return '';
  try {
    const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
    if (isNaN(d.getTime())) return '';
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  } catch {
    return '';
  }
}

export function formatDateSafe(dayOrDate: string | Date | undefined | null, full = false): string {
  if (!dayOrDate) return '';
  try {
    const d = typeof dayOrDate === 'string'
      ? (dayOrDate.includes('T') ? new Date(dayOrDate) : new Date(`${dayOrDate}T12:00:00`))
      : dayOrDate;
    if (isNaN(d.getTime())) return String(dayOrDate);
    if (full) {
      return `${DAYS_FULL[d.getDay()]}, ${MONTHS_FULL[d.getMonth()]} ${d.getDate()}`;
    }
    return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
  } catch {
    return String(dayOrDate);
  }
}

export function formatFullDateSafe(dayOrDate: string | Date | undefined | null): string {
  if (!dayOrDate) return '';
  try {
    const d = typeof dayOrDate === 'string'
      ? (dayOrDate.includes('T') ? new Date(dayOrDate) : new Date(`${dayOrDate}T12:00:00`))
      : dayOrDate;
    if (isNaN(d.getTime())) return String(dayOrDate);
    return `${DAYS_FULL[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return String(dayOrDate);
  }
}

export function formatNumberSafe(n: number | undefined | null, maxFractionDigits = 1): string {
  if (n === undefined || n === null || !Number.isFinite(n)) return '0';
  const factor = Math.pow(10, maxFractionDigits);
  const rounded = Math.round(n * factor) / factor;
  const parts = String(rounded).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}
