const DAY = 86_400_000;

/** Local calendar date as YYYY-MM-DD. */
export function toDay(t: number | Date): string {
  const d = typeof t === 'number' ? new Date(t) : t;
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Start of a local YYYY-MM-DD date, in epoch ms. */
export function dayStart(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

/** End of a local YYYY-MM-DD date (last millisecond). */
export function dayEnd(day: string): number {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d + 1).getTime() - 1;
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return toDay(new Date(y, m - 1, d + n));
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((dayStart(b) - dayStart(a)) / DAY);
}

/** Monday of the week containing `day`, as YYYY-MM-DD. */
export function weekKey(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dow = (date.getDay() + 6) % 7; // Monday = 0
  return toDay(new Date(y, m - 1, d - dow));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "12 Oct" (adds the year when it isn't the current one). */
export function shortDate(t: number | string, now = Date.now()): string {
  const d = typeof t === 'string' ? new Date(dayStart(t)) : new Date(t);
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === new Date(now).getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

export function isValidDay(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return toDay(new Date(dayStart(s))) === s;
}
