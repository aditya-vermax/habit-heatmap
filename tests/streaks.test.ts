import { describe, expect, it } from "vitest";
import { completionRate, computeStats, currentStreak, longestStreak } from "@/lib/streaks";

const S = (...d: string[]) => new Set(d);

describe("currentStreak", () => {
  it("counts back from today when today is logged", () => {
    expect(currentStreak(S("2026-11-08", "2026-11-09", "2026-11-10"), "2026-11-10")).toBe(3);
  });
  it("keeps the streak alive from yesterday when today is not logged yet", () => {
    expect(currentStreak(S("2026-11-08", "2026-11-09"), "2026-11-10")).toBe(2);
  });
  it("is zero once a full day is missed", () => {
    expect(currentStreak(S("2026-11-07", "2026-11-08"), "2026-11-10")).toBe(0);
  });
  it("stops at a gap", () => {
    expect(currentStreak(S("2026-11-05", "2026-11-09", "2026-11-10"), "2026-11-10")).toBe(2);
  });
  it("crosses year boundaries and leap days", () => {
    expect(currentStreak(S("2025-12-30", "2025-12-31", "2026-01-01"), "2026-01-01")).toBe(3);
    expect(currentStreak(S("2024-02-28", "2024-02-29", "2024-03-01"), "2024-03-01")).toBe(3);
  });
  it("is DST-safe", () => {
    expect(currentStreak(S("2026-03-07", "2026-03-08", "2026-03-09"), "2026-03-09")).toBe(3);
  });
  it("handles an empty set", () => {
    expect(currentStreak(S(), "2026-11-10")).toBe(0);
  });
});

describe("longestStreak", () => {
  it("finds the longest run", () => {
    expect(
      longestStreak(S("2026-01-01", "2026-01-02", "2026-01-05", "2026-01-06", "2026-01-07")),
    ).toBe(3);
  });
  it("is order independent and handles singles/empty", () => {
    expect(longestStreak(S("2026-01-03", "2026-01-01", "2026-01-02"))).toBe(3);
    expect(longestStreak(S("2026-01-03"))).toBe(1);
    expect(longestStreak(S())).toBe(0);
  });
  it("spans a year boundary", () => {
    expect(longestStreak(S("2025-12-31", "2026-01-01"))).toBe(2);
  });
});

describe("completionRate", () => {
  it("uses the full window for an old habit", () => {
    const done = S("2026-11-10", "2026-11-09", "2026-11-08");
    expect(completionRate(done, 30, "2026-11-10", "2025-01-01")).toBeCloseTo(3 / 30);
  });
  it("starts counting at the habit's creation date", () => {
    const done = S("2026-11-09", "2026-11-10");
    expect(completionRate(done, 30, "2026-11-10", "2026-11-09")).toBe(1);
  });
  it("returns null if the habit was created after today", () => {
    expect(completionRate(S(), 30, "2026-11-10", "2026-11-12")).toBeNull();
  });
  it("computes all stats together", () => {
    const stats = computeStats(S("2026-11-09", "2026-11-10"), "2026-11-10", "2026-11-01");
    expect(stats).toMatchObject({ current: 2, longest: 2, total: 2 });
    expect(stats.rate30).toBeCloseTo(2 / 10);
  });
});
