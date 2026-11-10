"use client";

import { useEffect, useRef } from "react";
import { formatLong, formatWeekdayShort, type DateStr, type WeekStart } from "@/lib/dates";
import { HEAT_LAYOUT, gridSize, type HeatGrid, type Level } from "@/lib/heatmap";

export type OverviewDay = { level: Level; done: number; total: number };

type Props = {
  grid: HeatGrid;
  today: DateStr;
  weekStart: WeekStart;
  /** Accessible name for the whole figure. */
  label: string;
  selected?: DateStr | null;
  onSelect?: (date: DateStr) => void;
  onHover?: (date: DateStr | null) => void;
} & (
  | { variant: "habit"; color: string; isDone: (date: DateStr) => boolean }
  | { variant: "overview"; dayInfo: (date: DateStr) => OverviewDay }
);

export function describeDay(date: DateStr, state: { done: boolean } | OverviewDay): string {
  const long = formatLong(date);
  if ("level" in state) {
    if (state.total === 0) return `${long}, no habits tracked`;
    return `${long}, ${state.done} of ${state.total} habits completed`;
  }
  return `${long}, ${state.done ? "completed" : "not completed"}`;
}

export function Heatmap(props: Props) {
  const { grid, today, label, selected, onSelect, onHover } = props;
  const { cell, gap, left, top, pad } = HEAT_LAYOUT;
  const { width, height } = gridSize(grid.weeks.length);
  const scroller = useRef<HTMLDivElement>(null);

  // Start scrolled to the most recent weeks on narrow screens.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [grid.rangeStart, grid.rangeEnd]);

  const firstCol = grid.weeks[0];

  return (
    <div className="hm-scroll" ref={scroller}>
      <svg className="hm" viewBox={`0 0 ${width} ${height}`} role="group" aria-label={label}>
        {grid.monthLabels.map((m) => (
          <text key={`${m.col}-${m.label}`} x={left + m.col * (cell + gap) + pad} y={11}>
            {m.label}
          </text>
        ))}
        {[1, 3, 5].map((row) => (
          <text key={row} x={0} y={top + pad + row * (cell + gap) + cell - 2}>
            {firstCol ? formatWeekdayShort(firstCol[row]!.date) : ""}
          </text>
        ))}
        {grid.weeks.map((week, col) =>
          week.map((c, row) => {
            const x = left + col * (cell + gap) + pad;
            const y = top + row * (cell + gap) + pad;
            if (!c.active) {
              return (
                <rect
                  key={c.date}
                  className="cell inactive"
                  x={x}
                  y={y}
                  width={cell}
                  height={cell}
                  aria-hidden="true"
                />
              );
            }
            let fill: string;
            let text: string;
            if (props.variant === "habit") {
              const done = props.isDone(c.date);
              fill = done ? props.color : "var(--cell-empty)";
              text = describeDay(c.date, { done });
            } else {
              const info = props.dayInfo(c.date);
              fill = info.level === 0 ? "var(--cell-empty)" : `var(--lv${info.level})`;
              text = describeDay(c.date, info);
            }
            const classes = [
              "cell",
              c.date === today ? "today" : "",
              c.date === selected ? "selected" : "",
            ].join(" ");
            return (
              <rect
                key={c.date}
                className={classes}
                x={x}
                y={y}
                width={cell}
                height={cell}
                rx={2}
                style={{ fill }}
                role={onSelect ? "button" : "img"}
                aria-label={text}
                tabIndex={onSelect ? -1 : undefined}
                onClick={onSelect ? () => onSelect(c.date) : undefined}
                onMouseEnter={onHover ? () => onHover(c.date) : undefined}
                onMouseLeave={onHover ? () => onHover(null) : undefined}
              />
            );
          }),
        )}
      </svg>
    </div>
  );
}

export function HeatLegend({ variant, color }: { variant: "habit" | "overview"; color?: string }) {
  if (variant === "habit") {
    return (
      <div className="legend-row mono muted" aria-hidden="true">
        <span className="swatch" style={{ background: "var(--cell-empty)" }} /> Not done
        <span className="swatch" style={{ background: color, marginLeft: "0.6rem" }} /> Done
      </div>
    );
  }
  return (
    <div className="legend-row mono muted" aria-hidden="true">
      Fewer
      <span className="swatch" style={{ background: "var(--cell-empty)" }} />
      {[1, 2, 3, 4].map((n) => (
        <span key={n} className="swatch" style={{ background: `var(--lv${n})` }} />
      ))}
      More
    </div>
  );
}

export function RangeSelect({
  value,
  years,
  onChange,
}: {
  value: "rolling" | number;
  years: number[];
  onChange: (v: "rolling" | number) => void;
}) {
  return (
    <div className="legend-row">
      <label htmlFor="range-select" className="mono muted">
        Period
      </label>
      <select
        id="range-select"
        className="select"
        style={{ width: "auto", minHeight: "2rem", padding: "0.15rem 0.5rem" }}
        value={String(value)}
        onChange={(e) =>
          onChange(e.target.value === "rolling" ? "rolling" : Number(e.target.value))
        }
      >
        <option value="rolling">Last 12 months</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}
