"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as repo from "@/lib/db/repository";
import { DEFAULT_SETTINGS, type Habit, type Settings } from "@/lib/types";
import { msUntilLocalMidnight, todayLocal, type DateStr } from "@/lib/dates";

export function useHabits() {
  const all = useLiveQuery(() => repo.listHabits(), [], undefined as Habit[] | undefined);
  return useMemo(
    () => ({
      loading: all === undefined,
      active: (all ?? []).filter((h) => !h.archivedAt),
      archived: (all ?? []).filter((h) => h.archivedAt),
      all: all ?? [],
    }),
    [all],
  );
}

export function useSettings() {
  const stored = useLiveQuery(() => repo.getSettings(), [], undefined as Settings | undefined);
  const update = useCallback(
    (patch: Partial<Omit<Settings, "key">>) => repo.updateSettings(patch),
    [],
  );
  return { settings: stored ?? DEFAULT_SETTINGS, loaded: stored !== undefined, update };
}

/**
 * Logs for every habit with optimistic toggling: the UI flips instantly,
 * and the override is dropped once the live query agrees (or the write fails).
 */
export function useLogs() {
  const raw = useLiveQuery(
    () => repo.getLogMap(),
    [],
    undefined as Map<string, Set<string>> | undefined,
  );
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!raw) return;
    setOverrides((prev) => {
      const next: Record<string, boolean> = {};
      for (const [key, value] of Object.entries(prev)) {
        const [habitId, date] = key.split("|") as [string, string];
        if (raw.get(habitId)?.has(date) !== value) next[key] = value;
      }
      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
  }, [raw]);

  const logs = useMemo(() => {
    const map = new Map<string, Set<string>>();
    raw?.forEach((set, id) => map.set(id, new Set(set)));
    for (const [key, done] of Object.entries(overrides)) {
      const [habitId, date] = key.split("|") as [string, string];
      let set = map.get(habitId);
      if (!set) map.set(habitId, (set = new Set()));
      if (done) set.add(date);
      else set.delete(date);
    }
    return map;
  }, [raw, overrides]);

  const setDone = useCallback(async (habitId: string, date: DateStr, done: boolean) => {
    const key = `${habitId}|${date}`;
    setOverrides((o) => ({ ...o, [key]: done }));
    try {
      await repo.setLog(habitId, date, done);
    } catch (error) {
      setOverrides((o) => {
        const { [key]: _drop, ...rest } = o;
        void _drop;
        return rest;
      });
      throw error;
    }
  }, []);

  return { logs, loading: raw === undefined, setDone };
}

/** Today's local date; refreshes at local midnight and when the tab regains focus. */
export function useToday(): DateStr {
  const [today, setToday] = useState<DateStr>(() => todayLocal());
  useEffect(() => {
    const refresh = () =>
      setToday((prev) => {
        const now = todayLocal();
        return now === prev ? prev : now;
      });
    let timer = window.setTimeout(function tick() {
      refresh();
      timer = window.setTimeout(tick, msUntilLocalMidnight());
    }, msUntilLocalMidnight());
    const onVisible = () => document.visibilityState === "visible" && refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return today;
}
