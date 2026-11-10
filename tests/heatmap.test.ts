import { describe, expect, it } from "vitest";
import { weekdayOf } from "@/lib/dates";
import { activeHabitsOn, buildGrid, levelFor, trackedHabitsOn } from "@/lib/heatmap";

describe("buildGrid", () => {
  it("rolling view: 53 columns of 7 rows ending this week", () => {
    for (const weekStart of [0, 1] as const) {
      const g = buildGrid({ range: "rolling", today: "2026-11-10", weekStart });
      expect(g.weeks).toHaveLength(53);
      expect(g.weeks.every((w) => w.length === 7)).toBe(true);
      expect(weekdayOf(g.weeks[0]![0]!.date)).toBe(weekStart);
    }
  });
  it("marks future cells inactive and today active", () => {
    const g = buildGrid({ range: "rolling", today: "2026-11-10", weekStart: 1 });
    const flat = g.weeks.flat();
    expect(flat.find((c) => c.date === "2026-11-10")?.active).toBe(true);
    expect(flat.find((c) => c.date === "2026-11-11")).toMatchObject({
      future: true,
      active: false,
    });
    expect(g.weeks.at(-1)!.at(-1)!.date).toBe("2026-11-15");
  });
  it("calendar year: only dates in that year are active", () => {
    const g = buildGrid({ range: 2025, today: "2026-11-10", weekStart: 1 });
    const active = g.weeks.flat().filter((c) => c.active);
    expect(active).toHaveLength(365);
    expect(active[0]!.date).toBe("2025-01-01");
    expect(active.at(-1)!.date).toBe("2025-12-31");
  });
  it("calendar year handles leap years and the current partial year", () => {
    expect(
      buildGrid({ range: 2024, today: "2026-11-10", weekStart: 0 })
        .weeks.flat()
        .filter((c) => c.active),
    ).toHaveLength(366);
    const cur = buildGrid({ range: 2026, today: "2026-11-10", weekStart: 1 })
      .weeks.flat()
      .filter((c) => c.active);
    expect(cur.at(-1)!.date).toBe("2026-11-10");
  });
  it("labels months without collisions", () => {
    const g = buildGrid({ range: 2026, today: "2026-11-10", weekStart: 1 });
    const cols = g.monthLabels.map((m) => m.col);
    expect(g.monthLabels.length).toBeGreaterThanOrEqual(11);
    cols.slice(1).forEach((c, i) => expect(c - cols[i]!).toBeGreaterThanOrEqual(3));
  });
});

describe("levelFor", () => {
  it("quantizes to five levels", () => {
    expect(levelFor(0, 4)).toBe(0);
    expect(levelFor(1, 4)).toBe(1);
    expect(levelFor(2, 4)).toBe(2);
    expect(levelFor(3, 4)).toBe(3);
    expect(levelFor(4, 4)).toBe(4);
    expect(levelFor(1, 0)).toBe(0);
  });
});

describe("activeHabitsOn", () => {
  it("excludes habits not yet created or already archived", () => {
    const habits = [
      { id: "a", createdOn: "2026-01-01" },
      { id: "b", createdOn: "2026-06-01" },
      { id: "c", createdOn: "2026-01-01", archivedOn: "2026-03-01" },
    ];
    expect(activeHabitsOn("2026-02-01", habits)).toEqual(["a", "c"]);
    expect(activeHabitsOn("2026-07-01", habits)).toEqual(["a", "b"]);
  });
  it("counts a habit on a back-dated day it was logged, even before its creation date", () => {
    const habits = [
      { id: "a", createdOn: "2026-01-01" },
      { id: "b", createdOn: "2026-06-01" },
    ];
    const hasLog = (id: string, d: string) => id === "b" && d === "2026-02-01";
    expect(activeHabitsOn("2026-02-01", habits, hasLog)).toEqual(["a", "b"]);
    expect(levelFor(1, 2)).toBe(2);
  });
});

describe("trackedHabitsOn", () => {
  it("keeps a stable denominator so partial days shade lighter than full days", () => {
    const habits = [{ id: "a" }, { id: "b" }, { id: "c", archivedOn: "2026-03-01" }];
    expect(trackedHabitsOn("2026-02-01", habits)).toEqual(["a", "b", "c"]);
    expect(trackedHabitsOn("2026-07-01", habits)).toEqual(["a", "b"]);
    expect(trackedHabitsOn("2026-07-01", habits, (id) => id === "c")).toEqual(["a", "b", "c"]);
    expect(levelFor(1, 2)).toBeLessThan(levelFor(2, 2));
  });
});

describe("rolling month labels", () => {
  it("are spaced for every week start", () => {
    for (const weekStart of [0, 1] as const) {
      const g = buildGrid({ range: "rolling", today: "2026-11-10", weekStart });
      const cols = g.monthLabels.map((m) => m.col);
      expect(g.monthLabels.length).toBeGreaterThanOrEqual(12);
      cols.slice(1).forEach((c, i) => expect(c - cols[i]!).toBeGreaterThanOrEqual(3));
    }
  });
});
