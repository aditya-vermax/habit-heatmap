import { addDays, compareDates, diffDays, type DateStr } from "./dates";

/** Consecutive days ending today; if today is unlogged, the streak is still alive from yesterday. */
export function currentStreak(done: ReadonlySet<DateStr>, today: DateStr): number {
  let cursor = done.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (done.has(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export function longestStreak(done: ReadonlySet<DateStr>): number {
  const dates = [...done].sort(compareDates);
  let best = 0;
  let run = 0;
  let prev: DateStr | null = null;
  for (const date of dates) {
    run = prev !== null && diffDays(prev, date) === 1 ? run + 1 : 1;
    if (run > best) best = run;
    prev = date;
  }
  return best;
}

/**
 * Completed days / days in the window. The window runs from
 * max(today - (windowDays - 1), habit creation date) through today.
 * Returns null when the window is empty.
 */
export function completionRate(
  done: ReadonlySet<DateStr>,
  windowDays: number,
  today: DateStr,
  createdOn: DateStr,
): number | null {
  const naturalStart = addDays(today, -(windowDays - 1));
  const start = compareDates(createdOn, naturalStart) > 0 ? createdOn : naturalStart;
  const span = diffDays(start, today) + 1;
  if (span <= 0) return null;
  let completed = 0;
  for (let i = 0; i < span; i += 1) if (done.has(addDays(start, i))) completed += 1;
  return completed / span;
}

export type HabitStats = {
  current: number;
  longest: number;
  total: number;
  rate30: number | null;
  rate365: number | null;
};

export function computeStats(
  done: ReadonlySet<DateStr>,
  today: DateStr,
  createdOn: DateStr,
): HabitStats {
  return {
    current: currentStreak(done, today),
    longest: longestStreak(done),
    total: done.size,
    rate30: completionRate(done, 30, today, createdOn),
    rate365: completionRate(done, 365, today, createdOn),
  };
}
