import { describe, expect, it } from "vitest";
import { shouldShowBackupReminder } from "@/lib/backup";

const now = new Date("2026-11-10T12:00:00Z");
const habits = [{ createdAt: "2026-09-01T00:00:00Z" }];
const base = { backupReminderDays: 30 };

describe("shouldShowBackupReminder", () => {
  it("shows when the last export is older than the interval", () => {
    expect(
      shouldShowBackupReminder({
        settings: { ...base, lastExportAt: "2026-09-20T00:00:00Z" },
        habits,
        logCount: 20,
        now,
      }),
    ).toBe(true);
  });
  it("hides when a recent export exists", () => {
    expect(
      shouldShowBackupReminder({
        settings: { ...base, lastExportAt: "2026-11-01T00:00:00Z" },
        habits,
        logCount: 20,
        now,
      }),
    ).toBe(false);
  });
  it("falls back to the oldest habit when there was never an export", () => {
    expect(shouldShowBackupReminder({ settings: base, habits, logCount: 20, now })).toBe(true);
  });
  it("needs meaningful data, and can be turned off", () => {
    expect(shouldShowBackupReminder({ settings: base, habits, logCount: 3, now })).toBe(false);
    expect(
      shouldShowBackupReminder({ settings: { backupReminderDays: 0 }, habits, logCount: 20, now }),
    ).toBe(false);
  });
  it("stays hidden after dismissal until the interval passes again", () => {
    const s = { ...base, reminderDismissedAt: "2026-11-05T00:00:00Z" };
    expect(shouldShowBackupReminder({ settings: s, habits, logCount: 20, now })).toBe(false);
    expect(
      shouldShowBackupReminder({
        settings: s,
        habits,
        logCount: 20,
        now: new Date("2026-12-20T00:00:00Z"),
      }),
    ).toBe(true);
  });
});
