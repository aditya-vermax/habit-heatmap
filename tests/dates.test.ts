import { describe, expect, it } from "vitest";
import {
  addDays,
  diffDays,
  isLeapYear,
  isValidDate,
  startOfWeek,
  todayLocal,
  weekdayOf,
  localDateOfIso,
} from "@/lib/dates";

describe("dates", () => {
  it("derives today from local clock parts, not UTC", () => {
    // 23:30 local on Mar 4 must stay Mar 4 regardless of the UTC offset.
    expect(todayLocal(new Date(2026, 2, 4, 23, 30))).toBe("2026-03-04");
    expect(todayLocal(new Date(2026, 0, 1, 0, 5))).toBe("2026-01-01");
  });
  it("adds days across month, year and leap boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("is DST-safe: spring-forward and fall-back weeks are still 7 days", () => {
    expect(diffDays("2026-03-07", "2026-03-14")).toBe(7); // US spring forward
    expect(diffDays("2026-10-31", "2026-11-07")).toBe(7); // EU/US fall back
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30"); // EU spring forward
  });
  it("finds the start of the week for both conventions", () => {
    expect(weekdayOf("2026-11-09")).toBe(1); // Monday
    expect(startOfWeek("2026-11-09", 1)).toBe("2026-11-09");
    expect(startOfWeek("2026-11-08", 1)).toBe("2026-11-02"); // Sunday -> prior Monday
    expect(startOfWeek("2026-11-09", 0)).toBe("2026-11-08");
  });
  it("validates real calendar dates", () => {
    expect(isValidDate("2024-02-29")).toBe(true);
    expect(isValidDate("2026-02-29")).toBe(false);
    expect(isValidDate("2026-13-01")).toBe(false);
    expect(isValidDate("26-1-1")).toBe(false);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
  });
  it("maps an ISO timestamp to a local date", () => {
    const d = new Date(2026, 5, 15, 12, 0);
    expect(localDateOfIso(d.toISOString())).toBe("2026-06-15");
  });
});
