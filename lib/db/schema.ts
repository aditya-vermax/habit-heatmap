import Dexie, { type Table } from "dexie";
import type { Habit, LogEntry, Settings } from "../types";

export class HabitDB extends Dexie {
  habits!: Table<Habit, string>;
  logs!: Table<LogEntry, string>;
  settings!: Table<Settings, string>;

  constructor(name = "habit-heatmap") {
    super(name);
    this.version(1).stores({
      habits: "id, order, archivedAt",
      logs: "id, &[habitId+date], habitId, date",
      settings: "key",
    });
  }
}

let instance: HabitDB | null = null;

/** Lazily created so importing this module on the server never touches IndexedDB. */
export function getDb(): HabitDB {
  if (!instance) instance = new HabitDB();
  return instance;
}

/** Test helper: swap in a fresh database. */
export function resetDbForTests(name: string): HabitDB {
  instance = new HabitDB(name);
  return instance;
}
