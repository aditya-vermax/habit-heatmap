export type Hsv = { h: number; s: number; v: number }; // h 0–360, s/v 0–1

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function hsvToHex({ h, s, v }: Hsv): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  const hex = (x: number) =>
    Math.round(clamp(x, 0, 1) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${hex(f(5))}${hex(f(3))}${hex(f(1))}`.toUpperCase();
}

export function hexToHsv(hex: string): Hsv {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return { h: 0, s: 0, v: 0 };
  const n = parseInt(m[1]!, 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

/** Accepts "abc", "#abc", "aabbcc" or "#aabbcc"; returns "#AABBCC" or null. */
export function normalizeHex(input: string): string | null {
  const t = input.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(t)) return `#${t[0]}${t[0]}${t[1]}${t[1]}${t[2]}${t[2]}`.toUpperCase();
  if (/^[0-9a-f]{6}$/i.test(t)) return `#${t}`.toUpperCase();
  return null;
}

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of a #RRGGBB colour (0 = black, 1 = white). */
export function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0;
  const n = parseInt(m[1]!, 16);
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
}

/** Picks the dark or light ink that reads best on top of `hex`, for marks drawn over a habit colour. */
export function readableInk(hex: string): "#1B0710" | "#FFFFFF" {
  const l = luminance(hex);
  const onDark = 1.05 / (l + 0.05);
  const onLight = (l + 0.05) / (luminance("#1B0710") + 0.05);
  return onLight > onDark ? "#1B0710" : "#FFFFFF";
}
