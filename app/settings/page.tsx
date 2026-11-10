"use client";

import { Download, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/sheet";
import { useHabits, useSettings } from "@/hooks/use-data";
import { downloadBackup } from "@/lib/backup";
import { formatMedium, localDateOfIso } from "@/lib/dates";
import * as repo from "@/lib/db/repository";
import { parseImport, type ExportFile } from "@/lib/export";
import type { ThemeSetting } from "@/lib/types";

const REMINDER_OPTIONS = [
  { value: 0, label: "Off" },
  { value: 7, label: "Every 7 days" },
  { value: 14, label: "Every 14 days" },
  { value: 30, label: "Every 30 days" },
  { value: 60, label: "Every 60 days" },
  { value: 90, label: "Every 90 days" },
];

type Persist = "unknown" | "unsupported" | "granted" | "not-granted";

export default function SettingsPage() {
  const { settings, update } = useSettings();
  const { all } = useHabits();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<ExportFile | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [message, setMessage] = useState("");
  const [problem, setProblem] = useState("");
  const [persist, setPersist] = useState<Persist>("unknown");

  useEffect(() => {
    const check = async (): Promise<Persist> => {
      if (!navigator.storage?.persisted) return "unsupported";
      try {
        return (await navigator.storage.persisted()) ? "granted" : "not-granted";
      } catch {
        return "unsupported";
      }
    };
    void check().then(setPersist);
  }, []);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    setMessage("");
    setProblem("");
    setPending(null);
    if (!file) return;
    if (file.size > 25 * 1024 * 1024)
      return setProblem("That file is too large to be a Habit Heatmap export.");
    const result = parseImport(await file.text());
    if (!result.ok) return setProblem(result.error);
    setPending(result.file);
  }

  async function runImport(mode: "merge" | "replace") {
    if (!pending) return;
    try {
      const res = await repo.importAll(pending, mode);
      setMessage(
        mode === "replace"
          ? `Replaced everything with ${res.habits} habits and ${res.logs} logged days.`
          : `Merged: added ${res.habits} new habits and ${res.logs} new logged days.`,
      );
      setPending(null);
    } catch {
      setProblem("The import failed and nothing was changed.");
    }
    setConfirmReplace(false);
  }

  return (
    <>
      <h1 style={{ fontSize: "clamp(2rem, 6vw, 3.25rem)" }}>Settings</h1>

      <section aria-labelledby="appearance">
        <div className="section-head">
          <h2 id="appearance">Appearance</h2>
        </div>
        <div className="setting">
          <span className="label" id="theme-label" style={{ fontWeight: 600 }}>
            Theme
          </span>
          <div className="segmented" role="radiogroup" aria-labelledby="theme-label">
            {(["system", "light", "dark"] as ThemeSetting[]).map((t) => (
              <label key={t}>
                <input
                  type="radio"
                  name="theme"
                  checked={settings.theme === t}
                  onChange={() => void update({ theme: t })}
                />
                <span>{t === "system" ? "System" : t === "light" ? "Light" : "Dark"}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="setting">
          <span className="label" id="week-label" style={{ fontWeight: 600 }}>
            Week starts on
          </span>
          <div className="segmented" role="radiogroup" aria-labelledby="week-label">
            {([1, 0] as const).map((d) => (
              <label key={d}>
                <input
                  type="radio"
                  name="week"
                  checked={settings.weekStart === d}
                  onChange={() => void update({ weekStart: d })}
                />
                <span>{d === 1 ? "Monday" : "Sunday"}</span>
              </label>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="data">
        <div className="section-head">
          <h2 id="data">Your data</h2>
        </div>
        <p className="muted" style={{ maxWidth: "40rem" }}>
          Everything is stored in this browser only. Clearing site data deletes it, and it
          doesn&apos;t sync to other devices. Export a JSON file to back up or move to another
          device.
        </p>
        <div className="setting">
          <div className="row-tools" style={{ flexWrap: "wrap", gap: "0.75rem" }}>
            <button
              type="button"
              className="btn"
              onClick={async () => {
                setProblem("");
                try {
                  await downloadBackup();
                  setMessage("Backup saved to your downloads.");
                } catch {
                  setProblem("Couldn't create the backup.");
                }
              }}
            >
              <Download size={16} aria-hidden="true" /> Export backup (JSON)
            </button>
            <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
              <Upload size={16} aria-hidden="true" /> Import backup…
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              tabIndex={-1}
              aria-label="Choose a backup file"
              onChange={onFile}
            />
          </div>
          <p className="mono muted">
            {settings.lastExportAt
              ? `Last export: ${formatMedium(localDateOfIso(settings.lastExportAt))}`
              : "You haven't exported a backup yet."}
          </p>
        </div>

        {pending && (
          <div className="plate" style={{ padding: "1rem", display: "grid", gap: "0.75rem" }}>
            <h3 style={{ fontSize: "1.25rem" }}>Ready to import</h3>
            <p>
              This file has <strong>{pending.habits.length}</strong> habits and{" "}
              <strong>{pending.logs.length}</strong> logged days, exported{" "}
              {formatMedium(localDateOfIso(pending.exportedAt))}.
            </p>
            <p className="hint">
              <strong>Merge</strong> keeps what you have and adds what&apos;s new.{" "}
              <strong>Replace</strong> erases everything here first.
            </p>
            <div className="row-tools" style={{ flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void runImport("merge")}
              >
                Merge into my data
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => setConfirmReplace(true)}
              >
                Replace my data…
              </button>
              <button type="button" className="btn btn-quiet" onClick={() => setPending(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="status" role="status" style={{ marginTop: "0.75rem" }}>
          {message}
        </div>
        {problem && (
          <p role="alert" style={{ color: "var(--danger)", fontWeight: 600 }}>
            {problem}
          </p>
        )}

        <div className="setting">
          <div className="field" style={{ maxWidth: "16rem" }}>
            <label htmlFor="reminder">Backup reminder</label>
            <select
              id="reminder"
              className="select"
              value={settings.backupReminderDays}
              onChange={(e) => void update({ backupReminderDays: Number(e.target.value) })}
            >
              {REMINDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="hint">
              A gentle nudge on the home screen when your last export is older than this.
            </p>
          </div>
        </div>

        <div className="setting">
          <span style={{ fontWeight: 600 }}>Persistent storage</span>
          <p className="muted">
            {persist === "granted" &&
              "On. Your browser has promised not to clear this data automatically."}
            {persist === "not-granted" &&
              "Off. Your browser may clear this data if the device runs low on space."}
            {persist === "unsupported" &&
              "This browser doesn't support persistent storage, so keep backups."}
            {persist === "unknown" && "Checking…"}
          </p>
          {persist === "not-granted" && (
            <div>
              <button
                type="button"
                className="btn btn-sm"
                onClick={async () => {
                  const ok = await navigator.storage.persist().catch(() => false);
                  setPersist(ok ? "granted" : "not-granted");
                  setMessage(
                    ok
                      ? "Persistent storage is on."
                      : "Your browser declined. Installing the app or using it more often can help.",
                  );
                }}
              >
                Request persistent storage
              </button>
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="danger">
        <div className="section-head">
          <h2 id="danger">Delete everything</h2>
        </div>
        <p className="muted" style={{ marginBottom: "0.75rem" }}>
          Removes all habits, logged days and settings from this browser.
        </p>
        <button type="button" className="btn btn-danger" onClick={() => setConfirmWipe(true)}>
          Delete all data…
        </button>
      </section>

      <ConfirmDialog
        open={confirmReplace}
        title="Replace all your data?"
        message="Everything currently in this browser will be erased and replaced with the contents of the file. This can't be undone."
        confirmLabel="Replace my data"
        onClose={() => setConfirmReplace(false)}
        onConfirm={() => void runImport("replace")}
      />
      <ConfirmDialog
        open={confirmWipe}
        title="Delete all data?"
        message={`This permanently deletes ${all.length} habit${all.length === 1 ? "" : "s"}, every logged day and your settings from this device. Export a backup first if you might want them back.`}
        confirmLabel="Delete everything"
        onClose={() => setConfirmWipe(false)}
        onConfirm={async () => {
          await repo.deleteAllData();
          setConfirmWipe(false);
          setPending(null);
          setMessage("All data deleted.");
        }}
      />
    </>
  );
}
