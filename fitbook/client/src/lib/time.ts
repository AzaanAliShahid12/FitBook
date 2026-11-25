// Class times are stored as UTC wall-clock ("studio time") and displayed as-is.
export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}
export function fmtDateLong(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
export function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
}
export function fmtDateTime(iso: string) {
  return `${fmtDate(iso)} · ${fmtTime(iso)}`;
}
export function dayKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}
export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
export function isPastTime(iso: string) {
  return new Date(iso).getTime() < Date.now();
}
export function relativeDay(iso: string) {
  const d = dayKey(iso);
  const t = todayKey();
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  if (d === t) return 'Today';
  if (d === tomorrow) return 'Tomorrow';
  return fmtDate(iso);
}
