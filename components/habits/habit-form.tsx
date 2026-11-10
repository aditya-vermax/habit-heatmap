"use client";

import { SmilePlus } from "lucide-react";
import { useState } from "react";
import { createHabit, updateHabit } from "@/lib/db/repository";
import type { Habit } from "@/lib/types";
import { Sheet } from "@/components/ui/sheet";
import { HABIT_COLORS, HABIT_ICONS } from "./habit-options";
import { ColorTray } from "./color-tray";
import { EmojiTray } from "./emoji-tray";
import { EMOJI_PREFIX } from "./emoji-data";

type Props = {
  open: boolean;
  onClose: () => void;
  habit?: Habit;
  initialName?: string;
  onSaved?: (habit: { id: string }) => void;
};

export function HabitForm(props: Props) {
  // The sheet only renders its children while open, so fields reset each time it opens.
  return (
    <Sheet
      open={props.open}
      onClose={props.onClose}
      title={props.habit ? "Edit habit" : "New habit"}
    >
      <HabitFields {...props} />
    </Sheet>
  );
}

function HabitFields({ onClose, habit, initialName, onSaved }: Props) {
  const [name, setName] = useState(habit?.name ?? initialName ?? "");
  const [color, setColor] = useState(habit?.color ?? HABIT_COLORS[0]!.value);
  const [icon, setIcon] = useState(habit?.icon ?? "spark");
  const [tray, setTray] = useState<"color" | "emoji" | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const isPresetColor = HABIT_COLORS.some((c) => c.value.toLowerCase() === color.toLowerCase());
  const emoji = icon.startsWith(EMOJI_PREFIX) ? icon.slice(EMOJI_PREFIX.length) : null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError("Give the habit a name.");
    setSaving(true);
    try {
      if (habit) {
        await updateHabit(habit.id, { name: trimmed, color, icon });
        onSaved?.({ id: habit.id });
      } else {
        const created = await createHabit({ name: trimmed, color, icon });
        onSaved?.({ id: created.id });
      }
      onClose();
    } catch {
      setError("Couldn't save. Your browser may be blocking local storage.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} style={{ display: "contents" }}>
      <div className="field">
        <label htmlFor="habit-name">Name</label>
        <input
          id="habit-name"
          className="input"
          value={name}
          maxLength={80}
          autoFocus
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          placeholder="Read 20 minutes"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "habit-error" : undefined}
        />
        {error && (
          <p id="habit-error" role="alert" className="hint" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
      </div>
      <fieldset className="picker">
        <legend className="legend" style={{ marginBottom: "0.5rem" }}>
          Color
        </legend>
        {HABIT_COLORS.map((c) => (
          <label key={c.value}>
            <input
              type="radio"
              name="color"
              value={c.value}
              checked={color === c.value}
              onChange={() => setColor(c.value)}
            />
            <span
              className="pick-color"
              style={{ "--c": c.value } as React.CSSProperties}
              title={c.label}
            />
            <span className="sr-only">{c.label}</span>
          </label>
        ))}
        <button
          type="button"
          className={`pick-btn is-custom${isPresetColor ? "" : " has-value is-selected"}`}
          style={{ "--c": color } as React.CSSProperties}
          title="Custom colour"
          aria-label="Custom colour"
          aria-expanded={tray === "color"}
          onClick={() => setTray(tray === "color" ? null : "color")}
        >
          {isPresetColor && <span aria-hidden="true" className="pick-plus">+</span>}
        </button>
      </fieldset>
      {tray === "color" && (
        <ColorTray value={color} onChange={setColor} onDone={() => setTray(null)} />
      )}
      <fieldset className="picker">
        <legend className="legend" style={{ marginBottom: "0.5rem" }}>
          Icon
        </legend>
        {Object.entries(HABIT_ICONS).map(([key, { Icon, label }]) => (
          <label key={key}>
            <input
              type="radio"
              name="icon"
              value={key}
              checked={icon === key}
              onChange={() => setIcon(key)}
            />
            <span className="pick-icon" title={label}>
              <Icon size={20} aria-hidden="true" />
            </span>
            <span className="sr-only">{label}</span>
          </label>
        ))}
        <button
          type="button"
          className={`pick-btn${emoji ? " is-selected" : ""}`}
          title="Choose an emoji"
          aria-label={emoji ? `Emoji ${emoji}, change` : "Choose an emoji"}
          aria-expanded={tray === "emoji"}
          onClick={() => setTray(tray === "emoji" ? null : "emoji")}
        >
          {emoji ? (
            <span className="pick-emoji" aria-hidden="true">
              {emoji}
            </span>
          ) : (
            <SmilePlus size={20} aria-hidden="true" />
          )}
        </button>
      </fieldset>
      {tray === "emoji" && (
        <EmojiTray
          value={emoji}
          onPick={(e) => {
            setIcon(EMOJI_PREFIX + e);
            setTray(null);
          }}
        />
      )}
      <div className="dialog-foot">
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {habit ? "Save changes" : "Add habit"}
        </button>
      </div>
    </form>
  );
}
