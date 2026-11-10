import {
  addDays,
  compareDates,
  formatDate,
  formatMonthShort,
  parseDate,
  startOfWeek,
  type DateStr,
  type WeekStart,
} from "./dates";

export type HeatCell = {
  date: DateStr;
  /** In range and not in the future, so it can be shown and edited. */
  active: boolean;
  future: boolean;
};

export type HeatGrid = {
  /** weeks[col][row]; row 0 is the configured week start. */
  weeks: HeatCell[][];
  /** First day (inclusive) and last day (inclusive) of the visible range. */
  rangeStart: DateStr;
  rangeEnd: DateStr;
  monthLabels: { col: number; label: string }[];
};

export type GridRange = "rolling" | number;

export function buildGrid(opts: {
  range: GridRange;
  today: DateStr;
  weekStart: WeekStart;
  locale?: string;
}): HeatGrid {
  const { range, today, weekStart, locale } = opts;

  let rangeStart: DateStr;
  let rangeEnd: DateStr;
  let gridStart: DateStr;
  let gridEnd: DateStr;

  if (range === "rolling") {
    gridEnd = addDays(startOfWeek(today, weekStart), 6);
    gridStart = addDays(startOfWeek(today, weekStart), -52 * 7);
    rangeStart = gridStart;
    rangeEnd = today;
  } else {
    rangeStart = formatDate(range, 1, 1);
    rangeEnd = formatDate(range, 12, 31);
    gridStart = startOfWeek(rangeStart, weekStart);
    gridEnd = addDays(startOfWeek(rangeEnd, weekStart), 6);
  }

  const weeks: HeatCell[][] = [];
  for (let cursor = gridStart; compareDates(cursor, gridEnd) <= 0; cursor = addDays(cursor, 7)) {
    const col: HeatCell[] = [];
    for (let row = 0; row < 7; row += 1) {
      const date = addDays(cursor, row);
      const future = compareDates(date, today) > 0;
      const inRange = compareDates(date, rangeStart) >= 0 && compareDates(date, rangeEnd) <= 0;
      col.push({ date, future, active: inRange && !future });
    }
    weeks.push(col);
  }

  // A month label sits above the first column that contains that month's 1st-7th day.
  const monthLabels: { col: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((col, i) => {
    const anchor = col.find((c) => c.active) ?? col[0]!;
    const { m, d } = parseDate(anchor.date);
    const first = col.find((c) => parseDate(c.date).d === 1 && c.active);
    const month = first ? parseDate(first.date).m : m;
    if (month !== lastMonth && (first || (i === 0 && d <= 24))) {
      monthLabels.push({
        col: i,
        label: formatMonthShort(first ? first.date : anchor.date, locale),
      });
      lastMonth = month;
    }
  });
  // Drop a leading label that would collide with the next one.
  if (monthLabels.length > 1 && monthLabels[1]!.col - monthLabels[0]!.col < 3) monthLabels.shift();

  return { weeks, rangeStart, rangeEnd, monthLabels };
}

export type Level = 0 | 1 | 2 | 3 | 4;

/** Quantized overview intensity: 0, ≤25%, ≤50%, ≤75%, >75%. */
export function levelFor(completed: number, activeHabits: number): Level {
  if (activeHabits <= 0 || completed <= 0) return 0;
  const f = completed / activeHabits;
  if (f <= 0.25) return 1;
  if (f <= 0.5) return 2;
  if (f <= 0.75) return 3;
  return 4;
}

/**
 * Habits that count on a given date: created already and not archived at that point,
 * plus any habit with a log on that date, so back-dated check-ins are never dropped.
 */
export function activeHabitsOn(
  date: DateStr,
  habits: { id: string; createdOn: DateStr; archivedOn?: DateStr }[],
  hasLog?: (habitId: string, date: DateStr) => boolean,
): string[] {
  return habits
    .filter(
      (h) =>
        (compareDates(h.createdOn, date) <= 0 &&
          (!h.archivedOn || compareDates(date, h.archivedOn) < 0)) ||
        hasLog?.(h.id, date) === true,
    )
    .map((h) => h.id);
}

/**
 * Habits that make up the denominator for the overview shading on a date: every habit that
 * isn't archived by then, whatever its creation date (history can be back-filled), plus any
 * archived habit that has a log that day. Keeping the denominator stable is what lets
 * "1 of 4" and "4 of 4" shade differently instead of every logged day reading as 100%.
 */
export function trackedHabitsOn(
  date: DateStr,
  habits: { id: string; archivedOn?: DateStr }[],
  hasLog?: (habitId: string, date: DateStr) => boolean,
): string[] {
  return habits
    .filter(
      (h) =>
        !h.archivedOn || compareDates(date, h.archivedOn) < 0 || hasLog?.(h.id, date) === true,
    )
    .map((h) => h.id);
}

/** Layout constants shared by the React heatmap and the PNG renderer. */
export const HEAT_LAYOUT = { cell: 13, gap: 3, left: 30, top: 20, pad: 2 } as const;

export function gridSize(cols: number) {
  const { cell, gap, left, top, pad } = HEAT_LAYOUT;
  return {
    width: left + cols * (cell + gap) - gap + pad * 2,
    height: top + 7 * (cell + gap) - gap + pad * 2,
  };
}
