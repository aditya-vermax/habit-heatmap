import { HABIT_ICONS } from "./habit-options";
import { EMOJI_PREFIX } from "./emoji-data";

export function HabitIcon({ icon, size = 20 }: { icon: string; size?: number }) {
  if (icon.startsWith(EMOJI_PREFIX)) {
    return (
      <span
        aria-hidden="true"
        className="pick-emoji"
        style={{
          fontSize: size * 0.9,
          width: size,
          height: size,
          display: "inline-grid",
          placeItems: "center",
        }}
      >
        {icon.slice(EMOJI_PREFIX.length)}
      </span>
    );
  }
  // Own-property check: a key like "constructor" must not resolve to something inherited.
  const known = Object.hasOwn(HABIT_ICONS, icon) ? HABIT_ICONS[icon] : undefined;
  const { Icon } = known ?? HABIT_ICONS.spark!;
  return <Icon size={size} strokeWidth={2} aria-hidden="true" />;
}
