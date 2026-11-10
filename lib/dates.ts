/**
 * Local calendar-date helpers. A date is a "YYYY-MM-DD" string.
 * "Today" always comes from the local clock. Date.UTC is used only as a
 * calendar-arithmetic container (no DST, no timezone), never to derive local dates.
 */
export type DateStr = string;
export type WeekStart = 0 | 1;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

export function formatDate(y: number, m: number, d: number): DateStr {
  return `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
}

export function parseDate(s: DateStr): { y: number; m: number; d: number } {
  const match = DATE_RE.exec(s);
  if (!match) throw new Error(`Invalid date string: ${s}`);
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

export function isValidDate(s: string): boolean {
  const match = DATE_RE.exec(s);
  if (!match) return false;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

/** Today's date on the local clock. */
export function todayLocal(now: Date = new Date()): DateStr {
  return formatDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** Local calendar date of an ISO timestamp (e.g. a habit's createdAt). */
export function localDateOfIso(iso: string): DateStr {
  return todayLocal(new Date(iso));
}

const utcMs = (s: DateStr) => {
  const { y, m, d } = parseDate(s);
  return Date.UTC(y, m - 1, d);
};

export function addDays(s: DateStr, n: number): DateStr {
  const { y, m, d } = parseDate(s);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return formatDate(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** Whole days from a to b (b - a). */
export function diffDays(a: DateStr, b: DateStr): number {
  return Math.round((utcMs(b) - utcMs(a)) / 86_400_000);
}

export function compareDates(a: DateStr, b: DateStr): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** 0 = Sunday … 6 = Saturday */
export function weekdayOf(s: DateStr): number {
  return new Date(utcMs(s)).getUTCDay();
}

export function startOfWeek(s: DateStr, weekStart: WeekStart): DateStr {
  const offset = (weekdayOf(s) - weekStart + 7) % 7;
  return addDays(s, -offset);
}

export function yearOf(s: DateStr): number {
  return parseDate(s).y;
}

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

const fmt = (opts: Intl.DateTimeFormatOptions, s: DateStr, locale?: string) =>
  new Intl.DateTimeFormat(locale, { ...opts, timeZone: "UTC" }).format(new Date(utcMs(s)));

export const formatLong = (s: DateStr, locale?: string) =>
  fmt({ weekday: "long", year: "numeric", month: "long", day: "numeric" }, s, locale);
export const formatMedium = (s: DateStr, locale?: string) =>
  fmt({ year: "numeric", month: "short", day: "numeric" }, s, locale);
export const formatMonthShort = (s: DateStr, locale?: string) => fmt({ month: "short" }, s, locale);
export const formatWeekdayShort = (s: DateStr, locale?: string) =>
  fmt({ weekday: "short" }, s, locale);

/** Milliseconds until the next local midnight. */
export function msUntilLocalMidnight(now: Date = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return Math.max(1000, next.getTime() - now.getTime());
}
