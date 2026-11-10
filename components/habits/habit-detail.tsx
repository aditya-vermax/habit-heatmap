"use client";

import { Archive, ArchiveRestore, Check, Download, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Heatmap, HeatLegend, RangeSelect, describeDay } from "@/components/heatmap/heatmap";
import { ConfirmDialog } from "@/components/ui/sheet";
import { useHabits, useLogs, useSettings, useToday } from "@/hooks/use-data";
import {
  compareDates,
  formatLong,
  formatMedium,
  isValidDate,
  localDateOfIso,
  yearOf,
  type DateStr,
} from "@/lib/dates";
import * as repo from "@/lib/db/repository";
import { buildGrid, type GridRange } from "@/lib/heatmap";
import { downloadHeatmapPng, slug } from "@/lib/image-export";
import { computeStats } from "@/lib/streaks";
import { HabitForm } from "./habit-form";
import { HabitIcon } from "./habit-icon";

const pct = (r: number | null) => (r === null ? "–" : `${Math.round(r * 100)}%`);

export function HabitDetail() {
  const id = useSearchParams().get("id") ?? "";
  const router = useRouter();
  const { all, loading } = useHabits();
  const { logs, loading: logsLoading, setDone } = useLogs();
  const { settings } = useSettings();
  const today = useToday();
  const [range, setRange] = useState<GridRange>("rolling");
  const [selected, setSelected] = useState<DateStr | null>(null);
  const [hover, setHover] = useState<DateStr | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");

  const habit = all.find((h) => h.id === id);
  const done = useMemo(() => logs.get(id) ?? new Set<DateStr>(), [logs, id]);
  const grid = useMemo(
    () => buildGrid({ range, today, weekStart: settings.weekStart }),
    [range, today, settings.weekStart],
  );
  const createdOn = habit ? localDateOfIso(habit.createdAt) : today;
  const stats = useMemo(() => computeStats(done, today, createdOn), [done, today, createdOn]);
  const years = useMemo(() => {
    const current = yearOf(today);
    const first = Math.min(current, yearOf(createdOn), ...[...done].map(yearOf));
    return Array.from({ length: current - first + 1 }, (_, i) => current - i);
  }, [today, createdOn, done]);

  if (loading || logsLoading)
    return (
      <p className="mono muted" aria-live="polite">
        Loading…
      </p>
    );
  if (!habit) {
    return (
      <section className="empty">
        <h2>Habit not found</h2>
        <p>
          It may have been deleted, or this link came from another device. Habits are stored per
          browser.
        </p>
        <Link href="/" className="btn">
          Back to today
        </Link>
      </section>
    );
  }

  const isArchived = Boolean(habit.archivedAt);
  const doneToday = done.has(today);
  const shownDate = hover ?? selected;
  const selectedDone = selected ? done.has(selected) : false;

  async function setDay(date: DateStr, value: boolean) {
    setMessage("");
    try {
      await setDone(habit!.id, date, value);
    } catch {
      setMessage("Couldn't save that change. Your browser may be blocking local storage.");
    }
  }

  async function shareImage() {
    setMessage("");
    try {
      await downloadHeatmapPng(
        {
          title: habit!.name,
          grid,
          fillFor: (d) => (done.has(d) ? habit!.color : "#f1e3d8"),
          legend: { kind: "habit", color: habit!.color },
        },
        `${slug(habit!.name)}-heatmap.png`,
      );
      setMessage("Image saved to your downloads.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Couldn't create the image.");
    }
  }

  return (
    <>
      <div>
        <Link href="/" className="mono muted">
          ← All habits
        </Link>
        <div
          className="section-head"
          style={{ marginTop: "0.75rem", marginBottom: 0, borderBottom: 0 }}
        >
          <h1
            style={{
              fontSize: "clamp(2rem, 6vw, 3.25rem)",
              display: "flex",
              gap: "0.6rem",
              alignItems: "center",
            }}
          >
            <span style={{ color: habit.color, display: "inline-flex" }}>
              <HabitIcon icon={habit.icon} size={32} />
            </span>
            <span style={{ overflowWrap: "anywhere" }}>{habit.name}</span>
          </h1>
          <div className="row-tools" style={{ flexWrap: "wrap" }}>
            <button type="button" className="btn btn-sm" onClick={() => setEditing(true)}>
              <Pencil size={15} aria-hidden="true" /> Edit
            </button>
            {isArchived ? (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => void repo.unarchiveHabit(habit.id)}
              >
                <ArchiveRestore size={15} aria-hidden="true" /> Restore
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => void repo.archiveHabit(habit.id)}
              >
                <Archive size={15} aria-hidden="true" /> Archive
              </button>
            )}
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => setDeleting(true)}
            >
              <Trash2 size={15} aria-hidden="true" /> Delete
            </button>
          </div>
        </div>
        {isArchived && <p className="mono muted">Archived. Hidden from Today, history kept.</p>}
      </div>

      {!isArchived && (
        <ul className="habit-list" style={{ ["--stamp" as string]: habit.color }}>
          <li className="habit-row" style={{ gridTemplateColumns: "auto 1fr" }}>
            <button
              type="button"
              className="stamp"
              aria-pressed={doneToday}
              onClick={() => void setDay(today, !doneToday)}
              aria-label={`${habit.name}, today`}
            >
              <Check size={24} strokeWidth={3} aria-hidden="true" />
            </button>
            <div>
              <p className="name" style={{ fontWeight: 700 }}>
                {doneToday ? "Done today" : "Not done yet today"}
              </p>
              <p className="mono muted">{formatLong(today)}</p>
            </div>
          </li>
        </ul>
      )}

      <dl className="stats" style={{ margin: 0 }}>
        <div className="stat">
          <dt>Current streak</dt>
          <dd>{stats.current}</dd>
        </div>
        <div className="stat">
          <dt>Longest streak</dt>
          <dd>{stats.longest}</dd>
        </div>
        <div className="stat">
          <dt>Total days</dt>
          <dd>{stats.total}</dd>
        </div>
        <div className="stat">
          <dt>Last 30 days</dt>
          <dd>{pct(stats.rate30)}</dd>
        </div>
        <div className="stat">
          <dt>Last 365 days</dt>
          <dd>{pct(stats.rate365)}</dd>
        </div>
      </dl>

      <section aria-labelledby="map-title">
        <div className="section-head">
          <h2 id="map-title">Heatmap</h2>
          <RangeSelect value={range} years={years} onChange={setRange} />
        </div>
        <figure className="plate" style={{ margin: 0 }}>
          <figcaption className="plate-cap mono">
            <span>{habit.name}</span>
            <span className="muted">
              {formatMedium(grid.rangeStart)} – {formatMedium(grid.rangeEnd)}
            </span>
          </figcaption>
          <div className="plate-body">
            <Heatmap
              variant="habit"
              grid={grid}
              today={today}
              weekStart={settings.weekStart}
              color={habit.color}
              isDone={(d) => done.has(d)}
              label={`${habit.name} heatmap`}
              selected={selected}
              onSelect={setSelected}
              onHover={setHover}
            />
          </div>
          <div className="hm-caption mono" aria-live="polite">
            {shownDate ? (
              describeDay(shownDate, { done: done.has(shownDate) })
            ) : (
              <HeatLegend variant="habit" color={habit.color} />
            )}
          </div>
        </figure>
      </section>

      <section
        aria-labelledby="day-title"
        className="plate"
        style={{ padding: "1rem", display: "grid", gap: "0.9rem" }}
      >
        <h2 id="day-title" style={{ fontSize: "1.375rem" }}>
          Edit a day
        </h2>
        <div className="field" style={{ maxWidth: "16rem" }}>
          <label htmlFor="day-picker">Pick a date, or tap a square above</label>
          <input
            id="day-picker"
            type="date"
            className="input"
            max={today}
            value={selected ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setSelected(isValidDate(v) && compareDates(v, today) <= 0 ? v : null);
            }}
          />
        </div>
        {selected && (
          <div className="row-tools" style={{ flexWrap: "wrap", gap: "0.75rem" }}>
            <p style={{ fontWeight: 600 }}>
              {formatLong(selected)}: {selectedDone ? "completed" : "not completed"}
            </p>
            <button
              type="button"
              className={selectedDone ? "btn" : "btn btn-primary"}
              onClick={() => void setDay(selected, !selectedDone)}
            >
              {selectedDone ? "Mark not done" : "Mark done"}
            </button>
          </div>
        )}
      </section>

      <div className="row-tools" style={{ flexWrap: "wrap" }}>
        <button type="button" className="btn" onClick={() => void shareImage()}>
          <Download size={16} aria-hidden="true" /> Save heatmap as image
        </button>
        <span className="mono muted status" role="status">
          {message}
        </span>
      </div>

      <HabitForm open={editing} onClose={() => setEditing(false)} habit={habit} />
      <ConfirmDialog
        open={deleting}
        title="Delete this habit?"
        message={
          <>
            “{habit.name}” and all {stats.total} logged days will be permanently deleted from this
            device. This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete habit"
        onClose={() => setDeleting(false)}
        onConfirm={async () => {
          await repo.deleteHabit(habit.id);
          router.replace("/");
        }}
      />
    </>
  );
}
