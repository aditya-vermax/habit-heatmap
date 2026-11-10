import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { parseImport, planMerge, buildExport } from "@/lib/export";
import { resetDbForTests } from "@/lib/db/schema";
import * as repo from "@/lib/db/repository";
import { DEFAULT_SETTINGS } from "@/lib/types";

let n = 0;
beforeEach(() => {
  n += 1;
  resetDbForTests(`test-db-${n}`);
});

describe("repository", () => {
  it("creates, orders, moves, archives and deletes habits", async () => {
    const a = await repo.createHabit({ name: " Read ", color: "#850E35", icon: "book" });
    const b = await repo.createHabit({ name: "Run", color: "#EE6983", icon: "run" });
    expect(a.name).toBe("Read");
    await repo.moveHabit(b.id, "up");
    expect((await repo.listHabits()).map((h) => h.name)).toEqual(["Run", "Read"]);
    await repo.archiveHabit(a.id);
    expect((await repo.listHabits()).find((h) => h.id === a.id)?.archivedAt).toBeTruthy();
    await repo.unarchiveHabit(a.id);
    expect((await repo.listHabits()).find((h) => h.id === a.id)?.archivedAt).toBeUndefined();
    await repo.setLog(a.id, "2026-11-09", true);
    await repo.deleteHabit(a.id);
    expect((await repo.getLogMap()).get(a.id)).toBeUndefined();
  });

  it("toggles logs and enforces one entry per habit and day", async () => {
    const h = await repo.createHabit({ name: "Read", color: "#850E35", icon: "book" });
    expect(await repo.toggleLog(h.id, "2026-11-09")).toBe(true);
    await repo.setLog(h.id, "2026-11-09", true); // idempotent
    expect((await repo.getLogMap()).get(h.id)?.size).toBe(1);
    expect(await repo.toggleLog(h.id, "2026-11-09")).toBe(false);
    await expect(repo.setLog(h.id, "2026-02-30", true)).rejects.toThrow();
    await repo.setLog(h.id, "2025-12-31", true);
    await repo.setLog(h.id, "2026-01-01", true);
    expect(await repo.getLogsForYear(h.id, 2026)).toHaveLength(1);
  });

  it("round-trips export → replace import to the exact same state", async () => {
    const a = await repo.createHabit({ name: "Read", color: "#850E35", icon: "book" });
    const b = await repo.createHabit({ name: "Run", color: "#EE6983", icon: "run" });
    await repo.archiveHabit(b.id);
    await repo.setLog(a.id, "2026-11-08", true);
    await repo.setLog(a.id, "2026-11-09", true);
    await repo.setLog(b.id, "2026-10-01", true);
    await repo.updateSettings({ weekStart: 0, theme: "dark", backupReminderDays: 14 });

    const exported = await repo.exportAll(new Date("2026-11-10T10:00:00Z"));
    const parsed = parseImport(JSON.stringify(exported));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    await repo.deleteAllData();
    expect(await repo.listHabits()).toHaveLength(0);
    await repo.importAll(parsed.file, "replace");

    const again = await repo.exportAll(new Date("2026-11-10T10:00:00Z"));
    expect(again).toEqual(exported);
  });

  it("merges without duplicating habits or logs", async () => {
    const a = await repo.createHabit({ name: "Read", color: "#850E35", icon: "book" });
    await repo.setLog(a.id, "2026-11-08", true);
    const snapshot = await repo.exportAll();
    const parsed = parseImport(JSON.stringify(snapshot));
    if (!parsed.ok) throw new Error("parse failed");
    const res = await repo.importAll(parsed.file, "merge");
    expect(res).toEqual({ habits: 0, logs: 0 });

    const extra = structuredClone(parsed.file);
    extra.habits.push({ ...a, id: "new-habit", name: "Stretch", order: 0 });
    extra.logs.push(
      { id: "l-new", habitId: "new-habit", date: "2026-11-01", createdAt: a.createdAt },
      { id: "l-dupe", habitId: a.id, date: "2026-11-08", createdAt: a.createdAt },
      { id: "l-new2", habitId: a.id, date: "2026-11-07", createdAt: a.createdAt },
    );
    expect(await repo.importAll(extra, "merge")).toEqual({ habits: 1, logs: 2 });
    expect((await repo.getLogMap()).get(a.id)?.size).toBe(2);
  });
});

describe("import validation", () => {
  it("rejects bad JSON, wrong app and unknown versions with clear messages", () => {
    expect(parseImport("{nope")).toMatchObject({
      ok: false,
      error: expect.stringContaining("JSON"),
    });
    expect(parseImport('{"app":"other"}')).toMatchObject({ ok: false });
    const res = parseImport('{"app":"habit-heatmap","version":99}');
    expect(res).toMatchObject({ ok: false, error: expect.stringContaining("version") });
  });
  it("rejects malformed data and drops orphan or duplicate logs", () => {
    const base = buildExport(
      {
        habits: [
          {
            id: "h",
            name: "A",
            color: "#112233",
            icon: "book",
            order: 0,
            createdAt: "2026-01-01T00:00:00Z",
          },
        ],
        logs: [
          { id: "1", habitId: "h", date: "2026-01-01", createdAt: "2026-01-01T00:00:00Z" },
          { id: "2", habitId: "h", date: "2026-01-01", createdAt: "2026-01-01T00:00:00Z" },
          { id: "3", habitId: "ghost", date: "2026-01-02", createdAt: "2026-01-01T00:00:00Z" },
        ],
        settings: DEFAULT_SETTINGS,
      },
      new Date("2026-11-10T00:00:00Z"),
    );
    const ok = parseImport(JSON.stringify(base));
    expect(ok.ok && ok.file.logs).toHaveLength(1);
    const bad = structuredClone(base);
    bad.logs[0]!.date = "2026-02-30";
    expect(parseImport(JSON.stringify(bad))).toMatchObject({ ok: false });
    const badColor = structuredClone(base);
    badColor.habits[0]!.color = "javascript:alert(1)";
    expect(parseImport(JSON.stringify(badColor))).toMatchObject({ ok: false });
    for (const icon of ["constructor", "__proto__", "toString", "nope", "emoji:"]) {
      const badIcon = structuredClone(base);
      badIcon.habits[0]!.icon = icon;
      expect(parseImport(JSON.stringify(badIcon))).toMatchObject({ ok: false });
    }
    const emojiIcon = structuredClone(base);
    emojiIcon.habits[0]!.icon = "emoji:🔥";
    expect(parseImport(JSON.stringify(emojiIcon)).ok).toBe(true);
  });
  it("planMerge appends new habits after existing ones", () => {
    const h = (id: string, order: number) => ({
      id,
      name: id,
      color: "#112233",
      icon: "book",
      order,
      createdAt: "2026-01-01T00:00:00Z",
    });
    const plan = planMerge(
      { habits: [h("a", 0), h("b", 1)], logs: [] },
      { habits: [h("a", 0), h("c", 0)], logs: [] },
    );
    expect(plan.habitsToAdd).toEqual([h("c", 2)]);
  });
});
