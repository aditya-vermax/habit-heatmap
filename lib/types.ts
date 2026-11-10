import type { WeekStart } from "./dates";

export type Habit = {
  id: string;
  name: string;
  color: string; // #rrggbb
  icon: string; // icon key, see components/habits/habit-options.ts
  order: number;
  createdAt: string; // ISO timestamp
  archivedAt?: string; // ISO timestamp
};

/** Presence of an entry = done that day. Unique on [habitId+date]. */
export type LogEntry = {
  id: string;
  habitId: string;
  date: string; // local calendar date "YYYY-MM-DD"
  createdAt: string; // ISO timestamp
};

export type ThemeSetting = "system" | "light" | "dark";

export type Settings = {
  key: "settings";
  theme: ThemeSetting;
  weekStart: WeekStart;
  /** 0 turns the backup reminder off. */
  backupReminderDays: number;
  lastExportAt?: string;
  /** Last time the user dismissed the backup reminder. */
  reminderDismissedAt?: string;
};

export const DEFAULT_SETTINGS: Settings = {
  key: "settings",
  theme: "system",
  weekStart: 1,
  backupReminderDays: 30,
};
