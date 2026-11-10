import { exportAll, markExported } from "./db/repository";
import { exportFilename } from "./export";
import { downloadBlob } from "./image-export";
import type { Habit, Settings } from "./types";

const DAY_MS = 86_400_000;
/** Backing up a nearly empty tracker isn't worth a nag. */
export const MEANINGFUL_LOG_COUNT = 7;

/** Pure: should the gentle backup reminder show right now? */
export function shouldShowBackupReminder(input: {
  settings: Pick<Settings, "backupReminderDays" | "lastExportAt" | "reminderDismissedAt">;
  habits: Pick<Habit, "createdAt">[];
  logCount: number;
  now: Date;
}): boolean {
  const { settings, habits, logCount, now } = input;
  const days = settings.backupReminderDays;
  if (days <= 0 || logCount < MEANINGFUL_LOG_COUNT || habits.length === 0) return false;
  const interval = days * DAY_MS;
  const since = (iso: string) => now.getTime() - Date.parse(iso);
  if (settings.reminderDismissedAt && since(settings.reminderDismissedAt) < interval) return false;
  const basis = settings.lastExportAt ?? habits.map((h) => h.createdAt).sort()[0]!;
  return since(basis) >= interval;
}

/** Download everything as JSON and remember when. */
export async function downloadBackup(): Promise<void> {
  const now = new Date();
  const file = await exportAll(now);
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
  downloadBlob(blob, exportFilename(now));
  await markExported(now);
}
