"use client";

import { Download, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { HabitForm } from "@/components/habits/habit-form";
import { STARTER_HABITS } from "@/components/habits/habit-options";
import { HabitRow } from "@/components/habits/habit-row";
import {
  Heatmap,
  HeatLegend,
  RangeSelect,
  describeDay,
  type OverviewDay,
} from "@/components/heatmap/heatmap";
import { BackupBanner } from "@/components/layout/backup-banner";
import { useHabits, useLogs, useSettings, useToday } from "@/hooks/use-data";
import { shouldShowBackupReminder } from "@/lib/backup";
import { formatMedium, localDateOfIso, yearOf, type DateStr } from "@/lib/dates";
import * as repo from "@/lib/db/repository";
import { trackedHabitsOn, buildGrid, levelFor, type GridRange } from "@/lib/heatmap";
import { downloadHeatmapPng } from "@/lib/image-export";
import { currentStreak } from "@/lib/streaks";

const LEVEL_FILLS = ["#f1e3d8", "#ffc4c4", "#f79aa6", "#ee6983", "#850e35"];

const NONE: ReadonlySet<DateStr> = new Set();

export default function HomePage() {
  const { active, archived, all, loading } = useHabits();
  const { logs, loading: logsLoading, setDone } = useLogs();
  const { settings, loaded } = useSettings();
  const today = useToday();
  const [range, setRange] = useState<GridRange>("rolling");
  const [arranging, setArranging] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [starter, setStarter] = useState("");
  const [hover, setHover] = useState<DateStr | null>(null);
  const [error, setError] = useState("");
  const [imageMessage, setImageMessage] = useState("");

  const grid = useMemo(
    () => buildGrid({ range, today, weekStart: settings.weekStart }),
    [range, today, settings.weekStart],
  );

  const timeline = useMemo(
    () =>
      all.map((h) => ({
        id: h.id,
        createdOn: localDateOfIso(h.createdAt),
        archivedOn: h.archivedAt ? localDateOfIso(h.archivedAt) : undefined,
      })),
    [all],
  );

  const dayInfo = (date: DateStr): OverviewDay => {
    const ids = trackedHabitsOn(date, timeline, (id, d) => logs.get(id)?.has(d) === true);
    const done = ids.filter((id) => logs.get(id)?.has(date)).length;
    return { level: levelFor(done, ids.length), done, total: ids.length };
  };

  const years = useMemo(() => {
    const current = yearOf(today);
    const first = Math.min(current, ...all.map((h) => yearOf(localDateOfIso(h.createdAt))));
    return Array.from({ length: current - first + 1 }, (_, i) => current - i);
  }, [all, today]);

  const totalLogs = useMemo(() => [...logs.values()].reduce((n, s) => n + s.size, 0), [logs]);
  const showBackup =
    loaded &&
    shouldShowBackupReminder({ settings, habits: all, logCount: totalLogs, now: new Date() });

  async function toggle(id: string, done: boolean) {
    setError("");
    try {
      await setDone(id, today, !done);
    } catch {
      setError("Couldn't save that change. Your browser may be blocking local storage.");
    }
  }

  async function shareOverview() {
    setImageMessage("");
    try {
      await downloadHeatmapPng(
        {
          title: "All habits",
          grid,
          fillFor: (d) => LEVEL_FILLS[dayInfo(d).level]!,
          legend: { kind: "overview" },
        },
        "habit-heatmap-overview.png",
      );
      setImageMessage("Image saved to your downloads.");
    } catch (e) {
      setImageMessage(e instanceof Error ? e.message : "Couldn't create the image.");
    }
  }

  if (loading || logsLoading)
    return (
      <p className="mono muted" aria-live="polite">
        Loading your habits…
      </p>
    );

  const openForm = (name = "") => {
    setStarter(name);
    setFormOpen(true);
  };

  if (all.length === 0) {
    return (
      <>
        <section className="empty" aria-labelledby="empty-title">
          <h2 id="empty-title">Start your first heatmap</h2>
          <p style={{ maxWidth: "36rem" }}>
            Add a habit, tap it each day you do it, and a year of consistency fills in. Your data
            never leaves this browser.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => openForm()}>
            <Plus size={18} aria-hidden="true" /> Add a habit
          </button>
          <div>
            <p className="hint" style={{ marginBottom: "0.5rem" }}>
              Or start from an idea:
            </p>
            <div className="row-tools" style={{ flexWrap: "wrap" }}>
              {STARTER_HABITS.map((name) => (
                <button key={name} type="button" className="chip" onClick={() => openForm(name)}>
                  {name}
                </button>
              ))}
            </div>
          </div>
          <p className="hint">
            Already have a backup? <Link href="/settings">Import it in Settings</Link>.
          </p>
        </section>
        <HabitForm open={formOpen} onClose={() => setFormOpen(false)} initialName={starter} />
      </>
    );
  }

  return (
    <>
      {showBackup && <BackupBanner />}

      <section aria-labelledby="overview-title">
        <div className="section-head">
          <h2 id="overview-title">Overview</h2>
          <RangeSelect value={range} years={years} onChange={setRange} />
        </div>
        <figure className="plate" style={{ margin: 0 }}>
          <figcaption className="plate-cap mono">
            <span>All habits</span>
            <span className="muted">
              {formatMedium(grid.rangeStart)} – {formatMedium(grid.rangeEnd)}
            </span>
          </figcaption>
          <div className="plate-body">
            <Heatmap
              variant="overview"
              grid={grid}
              today={today}
              weekStart={settings.weekStart}
              label="Overview heatmap: share of habits completed each day"
              dayInfo={dayInfo}
              selected={hover}
              onSelect={setHover}
              onHover={setHover}
            />
          </div>
          <div className="hm-caption mono" aria-live="polite">
            {hover ? describeDay(hover, dayInfo(hover)) : <HeatLegend variant="overview" />}
          </div>
        </figure>
        <div className="row-tools" style={{ marginTop: "0.75rem", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-sm" onClick={() => void shareOverview()}>
            <Download size={15} aria-hidden="true" /> Save overview as image
          </button>
          <span className="mono muted" role="status">
            {imageMessage}
          </span>
        </div>
      </section>

      <section aria-labelledby="today-title">
        <div className="section-head">
          <h2 id="today-title">Today</h2>
          <div className="row-tools">
            {active.length > 1 && (
              <button
                type="button"
                className="btn btn-sm"
                aria-pressed={arranging}
                onClick={() => setArranging((a) => !a)}
              >
                {arranging ? "Done arranging" : "Arrange"}
              </button>
            )}
            <button type="button" className="btn btn-sm btn-primary" onClick={() => openForm()}>
              <Plus size={16} aria-hidden="true" /> Add habit
            </button>
          </div>
        </div>
        {error && (
          <p
            role="alert"
            className="hint"
            style={{ color: "var(--danger)", marginBottom: "0.75rem" }}
          >
            {error}
          </p>
        )}
        {active.length === 0 ? (
          <p className="muted">All your habits are archived. Add a new one or restore one below.</p>
        ) : (
          <ul className="habit-list">
            {active.map((habit, i) => {
              const done = logs.get(habit.id)?.has(today) ?? false;
              return (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  done={done}
                  streak={currentStreak(logs.get(habit.id) ?? NONE, today)}
                  arranging={arranging}
                  canUp={i > 0}
                  canDown={i < active.length - 1}
                  onToggle={() => toggle(habit.id, done)}
                  onMove={(d) => void repo.moveHabit(habit.id, d)}
                />
              );
            })}
          </ul>
        )}
      </section>

      {archived.length > 0 && (
        <details>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>
            Archived ({archived.length})
          </summary>
          <ul className="habit-list" style={{ marginTop: "0.75rem" }}>
            {archived.map((h) => (
              <li key={h.id} className="habit-row" style={{ gridTemplateColumns: "1fr auto" }}>
                <Link href={`/habit?id=${h.id}`} className="name">
                  <span>{h.name}</span>
                </Link>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => void repo.unarchiveHabit(h.id)}
                >
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <HabitForm open={formOpen} onClose={() => setFormOpen(false)} initialName={starter} />
    </>
  );
}
