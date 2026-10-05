export const TIME_ZONE = 'Asia/Kuala_Lumpur';
export function dayKey(value: Date | string | number = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}
export function displayDate(value: string | Date, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, day: 'numeric', month: 'short', ...options }).format(new Date(value));
}
export function dateShift(day: string, amount: number) {
  const d = new Date(`${day}T12:00:00+08:00`); d.setUTCDate(d.getUTCDate() + amount); return dayKey(d);
}
export function duration(seconds: number) { return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`; }
