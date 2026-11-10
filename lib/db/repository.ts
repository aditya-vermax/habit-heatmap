/**
 * The storage interface. UI code talks to this module only, never to Dexie directly.
 */
import {
  buildExport,
  planMerge,
  settingsFromImport,
  type ExportFile,
  type ImportMode,
} from "../export";
import { isValidDate } from "../dates";
import { DEFAULT_SETTINGS, type Habit, type LogEntry, type Settings } from "../types";
import { getDb } from "./schema";

const uuid = () => crypto.randomUUID();

// ---- Habits ----------------------------------------------------------------

export async function listHabits(): Promise<Habit[]> {
  const all = await getDb().habits.orderBy("order").toArray();
  return all;
}

export async function createHabit(input: Pick<Habit, "name" | "color" | "icon">): Promise<Habit> {
  const db = getDb();
  return db.transaction("rw", db.habits, async () => {
    const last = await db.habits.orderBy("order").last();
    const habit: Habit = {
      id: uuid(),
      name: input.name.trim(),
      color: input.color,
      icon: input.icon,
      order: (last?.order ?? -1) + 1,
      createdAt: new Date().toISOString(),
    };
    await db.habits.add(habit);
    return habit;
  });
}

export async function updateHabit(
  id: string,
  patch: Partial<Pick<Habit, "name" | "color" | "icon">>,
): Promise<void> {
  const next = { ...patch };
  if (next.name !== undefined) next.name = next.name.trim();
  await getDb().habits.update(id, next);
}

export async function archiveHabit(id: string): Promise<void> {
  await getDb().habits.update(id, { archivedAt: new Date().toISOString() });
}

export async function unarchiveHabit(id: string): Promise<void> {
  const db = getDb();
  await db.transaction("rw", db.habits, async () => {
    const last = await db.habits.orderBy("order").last();
    await db.habits.update(id, { archivedAt: undefined, order: (last?.order ?? -1) + 1 });
  });
}

/** Swap a habit with its neighbour among the habits shown in the main list. */
export async function moveHabit(id: string, direction: "up" | "down"): Promise<void> {
  const db = getDb();
  await db.transaction("rw", db.habits, async () => {
    const active = (await db.habits.orderBy("order").toArray()).filter((h) => !h.archivedAt);
    const i = active.findIndex((h) => h.id === id);
    const j = direction === "up" ? i - 1 : i + 1;
    const a = active[i];
    const b = active[j];
    if (!a || !b) return;
    await db.habits.update(a.id, { order: b.order });
    await db.habits.update(b.id, { order: a.order });
  });
}

export async function deleteHabit(id: string): Promise<void> {
  const db = getDb();
  await db.transaction("rw", db.habits, db.logs, async () => {
    await db.logs.where("habitId").equals(id).delete();
    await db.habits.delete(id);
  });
}

// ---- Logs ------------------------------------------------------------------

export async function setLog(habitId: string, date: string, done: boolean): Promise<void> {
  if (!isValidDate(date)) throw new Error(`Invalid date: ${date}`);
  const db = getDb();
  await db.transaction("rw", db.logs, async () => {
    const existing = await db.logs.where("[habitId+date]").equals([habitId, date]).first();
    if (done && !existing) {
      await db.logs.add({ id: uuid(), habitId, date, createdAt: new Date().toISOString() });
    } else if (!done && existing) {
      await db.logs.delete(existing.id);
    }
  });
}

/** Flip a day and return the new state. */
export async function toggleLog(habitId: string, date: string): Promise<boolean> {
  const db = getDb();
  return db.transaction("rw", db.logs, async () => {
    const existing = await db.logs.where("[habitId+date]").equals([habitId, date]).first();
    if (existing) {
      await db.logs.delete(existing.id);
      return false;
    }
    await db.logs.add({ id: uuid(), habitId, date, createdAt: new Date().toISOString() });
    return true;
  });
}

export async function getLogsForYear(habitId: string, year: number): Promise<LogEntry[]> {
  const from = `${String(year).padStart(4, "0")}-01-01`;
  const to = `${String(year).padStart(4, "0")}-12-31`;
  return getDb()
    .logs.where("[habitId+date]")
    .between([habitId, from], [habitId, to], true, true)
    .toArray();
}

export async function getLogMap(): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>();
  await getDb().logs.each((log) => {
    let set = map.get(log.habitId);
    if (!set) map.set(log.habitId, (set = new Set()));
    set.add(log.date);
  });
  return map;
}

// ---- Settings --------------------------------------------------------------

export async function getSettings(): Promise<Settings> {
  const stored = await getDb().settings.get("settings");
  return { ...DEFAULT_SETTINGS, ...stored, key: "settings" };
}

export async function updateSettings(patch: Partial<Omit<Settings, "key">>): Promise<Settings> {
  const db = getDb();
  return db.transaction("rw", db.settings, async () => {
    const stored = await db.settings.get("settings");
    const next: Settings = { ...DEFAULT_SETTINGS, ...stored, ...patch, key: "settings" };
    await db.settings.put(next);
    return next;
  });
}

// ---- Export / import -------------------------------------------------------

export async function exportAll(now: Date = new Date()): Promise<ExportFile> {
  const db = getDb();
  const [habits, logs, settings] = await Promise.all([
    db.habits.orderBy("order").toArray(),
    db.logs.toArray(),
    getSettings(),
  ]);
  return buildExport({ habits, logs, settings }, now);
}

export async function markExported(now: Date = new Date()): Promise<void> {
  await updateSettings({ lastExportAt: now.toISOString() });
}

export async function importAll(
  file: ExportFile,
  mode: ImportMode,
): Promise<{ habits: number; logs: number }> {
  const db = getDb();
  return db.transaction("rw", db.habits, db.logs, db.settings, async () => {
    if (mode === "replace") {
      await Promise.all([db.habits.clear(), db.logs.clear(), db.settings.clear()]);
      await db.habits.bulkAdd(file.habits);
      await db.logs.bulkAdd(file.logs);
      await db.settings.put(settingsFromImport(file.settings));
      return { habits: file.habits.length, logs: file.logs.length };
    }
    const [habits, logs] = await Promise.all([db.habits.toArray(), db.logs.toArray()]);
    const { habitsToAdd, logsToAdd } = planMerge({ habits, logs }, file);
    await db.habits.bulkAdd(habitsToAdd);
    await db.logs.bulkAdd(logsToAdd);
    return { habits: habitsToAdd.length, logs: logsToAdd.length };
  });
}

export async function deleteAllData(): Promise<void> {
  const db = getDb();
  await db.transaction("rw", db.habits, db.logs, db.settings, async () => {
    await Promise.all([db.habits.clear(), db.logs.clear(), db.settings.clear()]);
  });
}
