// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Heatmap } from "@/components/heatmap/heatmap";
import { HabitRow } from "@/components/habits/habit-row";
import { buildGrid } from "@/lib/heatmap";
import { buildHeatmapSvg } from "@/lib/image-export";
import { formatLong } from "@/lib/dates";

afterEach(cleanup);

const today = "2026-11-10";
const grid = buildGrid({ range: "rolling", today, weekStart: 1 });

describe("<Heatmap />", () => {
  it("labels every active cell for screen readers and reports selection", () => {
    const onSelect = vi.fn();
    render(
      <Heatmap
        variant="habit"
        grid={grid}
        today={today}
        weekStart={1}
        color="#850E35"
        isDone={(d) => d === "2026-11-09"}
        label="Read heatmap"
        onSelect={onSelect}
      />,
    );
    expect(screen.getByRole("group", { name: "Read heatmap" })).toBeTruthy();
    const done = screen.getByRole("button", { name: `${formatLong("2026-11-09")}, completed` });
    expect(
      screen.getByRole("button", { name: `${formatLong(today)}, not completed` }),
    ).toBeTruthy();
    fireEvent.click(done);
    expect(onSelect).toHaveBeenCalledWith("2026-11-09");
    // Future days are not rendered as interactive cells.
    expect(screen.queryByRole("button", { name: new RegExp(formatLong("2026-11-11")) })).toBeNull();
  });

  it("describes overview days as counts", () => {
    render(
      <Heatmap
        variant="overview"
        grid={grid}
        today={today}
        weekStart={1}
        label="Overview"
        dayInfo={(d) =>
          d === today ? { level: 2, done: 1, total: 2 } : { level: 0, done: 0, total: 2 }
        }
      />,
    );
    expect(
      screen.getByRole("img", { name: `${formatLong(today)}, 1 of 2 habits completed` }),
    ).toBeTruthy();
  });
});

describe("<HabitRow />", () => {
  it("exposes the toggle as a pressed button and calls back on tap", () => {
    const onToggle = vi.fn();
    const habit = {
      id: "1",
      name: "Read",
      color: "#850E35",
      icon: "book",
      order: 0,
      createdAt: "2026-01-01T00:00:00Z",
    };
    render(
      <ul>
        <HabitRow
          habit={habit}
          done
          streak={4}
          arranging={false}
          canUp={false}
          canDown={false}
          onToggle={onToggle}
          onMove={() => {}}
        />
      </ul>,
    );
    const btn = screen.getByRole("button", { name: "Read, today" });
    expect(btn.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("4-day streak")).toBeTruthy();
    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalledOnce();
  });
});

describe("PNG export SVG", () => {
  it("escapes user text and contains no external resources", () => {
    const { svg } = buildHeatmapSvg({
      title: 'Read <b>"fast"</b> & more',
      grid,
      fillFor: () => "#850E35",
      legend: { kind: "habit", color: "#850E35" },
    });
    expect(svg).not.toContain("<b>");
    expect(svg).toContain("&lt;b&gt;");
    expect(svg).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
    expect(svg).not.toContain("<image");
  });
});
