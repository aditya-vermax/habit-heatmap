import { ArrowDown, ArrowUp, Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import { readableInk } from "@/lib/color";
import type { Habit } from "@/lib/types";
import { HabitIcon } from "./habit-icon";

type Props = {
  habit: Habit;
  done: boolean;
  streak: number;
  arranging: boolean;
  canUp: boolean;
  canDown: boolean;
  onToggle: () => void;
  onMove: (direction: "up" | "down") => void;
};

export function HabitRow({
  habit,
  done,
  streak,
  arranging,
  canUp,
  canDown,
  onToggle,
  onMove,
}: Props) {
  return (
    <li
      className="habit-row"
      style={
        { "--stamp": habit.color, "--stamp-ink": readableInk(habit.color) } as React.CSSProperties
      }
    >
      <button
        type="button"
        className="stamp"
        aria-pressed={done}
        onClick={onToggle}
        aria-label={`${habit.name}, today`}
      >
        <Check size={24} strokeWidth={3} aria-hidden="true" />
      </button>
      <div style={{ minWidth: 0 }}>
        <Link href={`/habit?id=${habit.id}`} className="name">
          <span style={{ color: habit.color, display: "inline-flex" }}>
            <HabitIcon icon={habit.icon} size={18} />
          </span>
          <span>{habit.name}</span>
        </Link>
        <p className="mono muted">{streak > 0 ? `${streak}-day streak` : "No streak yet"}</p>
      </div>
      {arranging ? (
        <div className="row-tools">
          <button
            type="button"
            className="btn btn-icon btn-sm"
            disabled={!canUp}
            onClick={() => onMove("up")}
            aria-label={`Move ${habit.name} up`}
          >
            <ArrowUp size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="btn btn-icon btn-sm"
            disabled={!canDown}
            onClick={() => onMove("down")}
            aria-label={`Move ${habit.name} down`}
          >
            <ArrowDown size={16} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <Link
          href={`/habit?id=${habit.id}`}
          className="btn btn-quiet btn-icon"
          aria-label={`Open ${habit.name}`}
        >
          <ChevronRight size={20} aria-hidden="true" />
        </Link>
      )}
    </li>
  );
}
