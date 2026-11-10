import { z } from "zod";
import { EXPORT_APP_ID, EXPORT_VERSION } from "./config";
import { isValidDate } from "./dates";
import { EMOJI_PREFIX } from "../components/habits/emoji-data";
import { HABIT_ICONS } from "../components/habits/habit-options";
import { DEFAULT_SETTINGS, type Habit, type LogEntry, type Settings } from "./types";

/** Generous ceilings so a hostile or corrupt file cannot freeze the tab. */
const MAX_HABITS = 1_000;
const MAX_LOGS = 250_000;

const isoTimestamp = z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Invalid timestamp");
const dateString = z.string().refine(isValidDate, "Invalid calendar date");

const habitSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(80),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Colors must be #rrggbb"),
  icon: z
    .string()
    .min(1)
    .max(40)
    .refine(
      (s) =>
        Object.hasOwn(HABIT_ICONS, s) ||
        (s.startsWith(EMOJI_PREFIX) && s.length > EMOJI_PREFIX.length),
      "Unknown icon",
    ),
  order: z.number().finite(),
  createdAt: isoTimestamp,
  archivedAt: isoTimestamp.optional(),
});

const logSchema = z.object({
  id: z.string().min(1).max(100),
  habitId: z.string().min(1).max(100),
  date: dateString,
  createdAt: isoTimestamp,
});

const settingsSchema = z.object({
  theme: z.enum(["system", "light", "dark"]),
  weekStart: z.union([z.literal(0), z.literal(1)]),
  backupReminderDays: z.number().int().min(0).max(365),
  lastExportAt: isoTimestamp.optional(),
  reminderDismissedAt: isoTimestamp.optional(),
});

const exportSchema = z.object({
  app: z.literal(EXPORT_APP_ID),
  version: z.literal(EXPORT_VERSION),
  exportedAt: isoTimestamp,
  habits: z.array(habitSchema).max(MAX_HABITS),
  logs: z.array(logSchema).max(MAX_LOGS),
  settings: settingsSchema.optional(),
});

export type ExportFile = {
  app: typeof EXPORT_APP_ID;
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  habits: Habit[];
  logs: LogEntry[];
  settings?: Omit<Settings, "key">;
};

export type ImportMode = "merge" | "replace";

export function buildExport(
  data: { habits: Habit[]; logs: LogEntry[]; settings: Settings },
  now: Date = new Date(),
): ExportFile {
  const { key: _key, ...settings } = data.settings;
  void _key;
  return {
    app: EXPORT_APP_ID,
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    habits: data.habits,
    logs: data.logs,
    settings,
  };
}

export type ParseResult = { ok: true; file: ExportFile } | { ok: false; error: string };

export function parseImport(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "This file isn't valid JSON." };
  }
  if (typeof raw !== "object" || raw === null || (raw as { app?: unknown }).app !== EXPORT_APP_ID) {
    return { ok: false, error: "This doesn't look like a Habit Heatmap export." };
  }
  const version = (raw as { version?: unknown }).version;
  if (version !== EXPORT_VERSION) {
    return {
      ok: false,
      error: `Unsupported export version (${String(version)}). This app reads version ${EXPORT_VERSION}.`,
    };
  }
  const parsed = exportSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue ? issue.path.join(".") : "file";
    return {
      ok: false,
      error: `The export is damaged at "${where}": ${issue?.message ?? "invalid"}.`,
    };
  }
  const file = parsed.data as ExportFile;

  // Drop logs that point at unknown habits and de-dupe by id and [habitId+date].
  const habitIds = new Set(file.habits.map((h) => h.id));
  const seenIds = new Set<string>();
  const seenPairs = new Set<string>();
  const logs: LogEntry[] = [];
  for (const log of file.logs) {
    const pair = `${log.habitId}|${log.date}`;
    if (!habitIds.has(log.habitId) || seenIds.has(log.id) || seenPairs.has(pair)) continue;
    seenIds.add(log.id);
    seenPairs.add(pair);
    logs.push(log);
  }
  const habitSeen = new Set<string>();
  const habits = file.habits.filter((h) =>
    habitSeen.has(h.id) ? false : (habitSeen.add(h.id), true),
  );
  return { ok: true, file: { ...file, habits, logs } };
}

/** What to add when merging: keep everything existing, add only what's new. */
export function planMerge(
  existing: { habits: Habit[]; logs: LogEntry[] },
  incoming: { habits: Habit[]; logs: LogEntry[] },
): { habitsToAdd: Habit[]; logsToAdd: LogEntry[] } {
  const habitIds = new Set(existing.habits.map((h) => h.id));
  const maxOrder = existing.habits.reduce((m, h) => Math.max(m, h.order), -1);
  const habitsToAdd = incoming.habits
    .filter((h) => !habitIds.has(h.id))
    .sort((a, b) => a.order - b.order)
    .map((h, i) => ({ ...h, order: maxOrder + 1 + i }));
  const allHabitIds = new Set([...habitIds, ...habitsToAdd.map((h) => h.id)]);
  const logIds = new Set(existing.logs.map((l) => l.id));
  const pairs = new Set(existing.logs.map((l) => `${l.habitId}|${l.date}`));
  const logsToAdd: LogEntry[] = [];
  for (const log of incoming.logs) {
    const pair = `${log.habitId}|${log.date}`;
    if (!allHabitIds.has(log.habitId) || logIds.has(log.id) || pairs.has(pair)) continue;
    logIds.add(log.id);
    pairs.add(pair);
    logsToAdd.push(log);
  }
  return { habitsToAdd, logsToAdd };
}

export function settingsFromImport(s: ExportFile["settings"]): Settings {
  return { ...DEFAULT_SETTINGS, ...(s ?? {}), key: "settings" };
}

export function exportFilename(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `habit-heatmap-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`;
}
