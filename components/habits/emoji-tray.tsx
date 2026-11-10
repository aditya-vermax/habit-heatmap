"use client";

import { useState } from "react";
import { EMOJI_CATEGORIES, firstEmoji } from "./emoji-data";

/** Minimal emoji tray: a few curated categories plus a field for any emoji from the system keyboard. */
export function EmojiTray({
  value,
  onPick,
}: {
  value: string | null;
  onPick: (emoji: string) => void;
}) {
  const [tab, setTab] = useState(0);
  const [typed, setTyped] = useState("");
  const cat = EMOJI_CATEGORIES[tab]!;

  return (
    <div className="tray" role="group" aria-label="Choose an emoji">
      <div className="emoji-tabs" role="tablist" aria-label="Emoji categories">
        {EMOJI_CATEGORIES.map((c, i) => (
          <button
            key={c.label}
            type="button"
            role="tab"
            className="emoji-tab"
            aria-selected={i === tab}
            aria-label={c.label}
            title={c.label}
            onClick={() => setTab(i)}
          >
            {c.emojis[0]}
          </button>
        ))}
      </div>
      <div className="emoji-grid">
        {cat.emojis.map((e) => (
          <button
            key={e}
            type="button"
            className="emoji-cell"
            aria-pressed={value === e}
            onClick={() => onPick(e)}
          >
            {e}
          </button>
        ))}
      </div>
      <input
        className="tray-hex"
        style={{ textTransform: "none" }}
        aria-label="Type or paste any emoji"
        placeholder="Type or paste any emoji"
        value={typed}
        onChange={(e) => {
          const emoji = firstEmoji(e.target.value);
          setTyped(emoji ?? "");
          if (emoji) onPick(emoji);
        }}
      />
    </div>
  );
}
