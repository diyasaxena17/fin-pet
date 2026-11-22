const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "2026-11-10T15:40:00-05:00" -> "Nov 10 · 3:40 PM" (wall-clock, no timezone conversion). */
export function fmtWhen(iso: string): string { return `${fmtDay(iso)} · ${fmtTime(iso)}`; }
export function fmtDay(iso: string): string { return `${months[Number(iso.slice(5, 7)) - 1]} ${Number(iso.slice(8, 10))}`; }
export function fmtTime(iso: string): string {
  const h = Number(iso.slice(11, 13)); const m = iso.slice(14, 16);
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h < 12 ? 'AM' : 'PM'}`;
}
export const pct = (ratio: number | null, digits = 0) => (ratio === null ? '—' : `${(ratio * 100).toFixed(digits)}%`);
export const fmtDuration = (minutes: number) => (minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}m` : ''}`.trim());
export const fmtHours = (hours: number) => (hours < 1 ? `${Math.round(hours * 60)} min` : `${hours % 1 === 0 ? hours : hours.toFixed(1)}h`);
export const simClockLabel = (nowMs: number, offsetHours: number) => {
  // BASE_NOW is Toronto (-05:00); shift to wall-clock by formatting in UTC after applying the offset.
  const d = new Date(nowMs - 5 * 3_600_000).toISOString();
  return `${fmtDay(d)}, ${fmtTime(d)}${offsetHours ? ` (+${offsetHours}h)` : ''}`;
};
/** Wall-clock calendar date (YYYY-MM-DD) of the simulated clock; the sandbox is America/Toronto (-05:00). */
export const simDate = (nowMs: number) => new Date(nowMs - 5 * 3_600_000).toISOString().slice(0, 10);
