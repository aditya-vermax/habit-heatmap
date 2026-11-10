import { formatMedium, type DateStr } from "./dates";
import { HEAT_LAYOUT, gridSize, type HeatGrid } from "./heatmap";
import { APP_NAME } from "./config";

/** The shared image always uses the light "paper" palette, whatever theme is on screen. */
const PAPER = {
  bg: "#fcf5ee",
  ink: "#2a0713",
  muted: "#6e4b57",
  rule: "#850e35",
  empty: "#f1e3d8",
  line: "rgba(133,14,53,0.18)",
  levels: ["#f1e3d8", "#ffc4c4", "#f79aa6", "#ee6983", "#850e35"],
};

const SANS = "Helvetica Neue, Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, Menlo, Consolas, monospace";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type ImageSpec = {
  title: string;
  grid: HeatGrid;
  /** Return a fill color for an active day. */
  fillFor: (date: DateStr) => string;
  legend: { kind: "habit"; color: string } | { kind: "overview" };
};

/** Pure: build a standalone SVG string with resolved colors and no external resources. */
export function buildHeatmapSvg(spec: ImageSpec): { svg: string; width: number; height: number } {
  const { grid } = spec;
  const { cell, gap, left, top, pad } = HEAT_LAYOUT;
  const inner = gridSize(grid.weeks.length);
  const margin = 24;
  const headH = 64;
  const footH = 44;
  const width = inner.width + margin * 2;
  const height = headH + inner.height + footH + margin;
  const gx = margin;
  const gy = headH;
  const range = `${formatMedium(grid.rangeStart)} – ${formatMedium(grid.rangeEnd)}`;

  const parts: string[] = [];
  parts.push(`<rect width="${width}" height="${height}" fill="${PAPER.bg}"/>`);
  parts.push(
    `<rect x="0.75" y="0.75" width="${width - 1.5}" height="${height - 1.5}" fill="none" stroke="${PAPER.rule}" stroke-width="1.5"/>`,
  );
  parts.push(
    `<text x="${margin}" y="34" font-family="${SANS}" font-weight="800" font-size="22" fill="${PAPER.ink}">${esc(spec.title)}</text>`,
  );
  parts.push(
    `<text x="${margin}" y="54" font-family="${MONO}" font-size="11" fill="${PAPER.muted}">${esc(range)}</text>`,
  );
  parts.push(
    `<line x1="0" y1="${headH - 4}" x2="${width}" y2="${headH - 4}" stroke="${PAPER.rule}" stroke-opacity="0.35"/>`,
  );

  for (const m of grid.monthLabels) {
    parts.push(
      `<text x="${gx + left + m.col * (cell + gap) + pad}" y="${gy + 11}" font-family="${MONO}" font-size="9.5" fill="${PAPER.muted}">${esc(m.label)}</text>`,
    );
  }
  grid.weeks.forEach((week, col) =>
    week.forEach((c, row) => {
      if (!c.active) return;
      const x = gx + left + col * (cell + gap) + pad;
      const y = gy + top + row * (cell + gap) + pad;
      parts.push(
        `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" fill="${spec.fillFor(c.date)}" stroke="${PAPER.line}"/>`,
      );
    }),
  );

  // Legend + attribution
  const ly = gy + inner.height + 22;
  const swatches = spec.legend.kind === "habit" ? [PAPER.empty, spec.legend.color] : PAPER.levels;
  parts.push(
    `<text x="${margin}" y="${ly + 10}" font-family="${MONO}" font-size="10" fill="${PAPER.muted}">${spec.legend.kind === "habit" ? "Not done" : "Fewer"}</text>`,
  );
  const lx = margin + (spec.legend.kind === "habit" ? 56 : 44);
  swatches.forEach((fill, i) => {
    parts.push(
      `<rect x="${lx + i * 17}" y="${ly}" width="13" height="13" rx="2" fill="${fill}" stroke="${PAPER.line}"/>`,
    );
  });
  parts.push(
    `<text x="${lx + swatches.length * 17 + 4}" y="${ly + 10}" font-family="${MONO}" font-size="10" fill="${PAPER.muted}">${spec.legend.kind === "habit" ? "Done" : "More"}</text>`,
  );
  parts.push(
    `<text x="${width - margin}" y="${ly + 10}" text-anchor="end" font-family="${MONO}" font-size="10" fill="${PAPER.muted}">${esc(APP_NAME)} · stored on this device only</text>`,
  );

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${parts.join("")}</svg>`;
  return { svg, width, height };
}

export async function svgToPngBlob(
  svg: string,
  width: number,
  height: number,
  scale = 2,
): Promise<Blob> {
  const img = new Image();
  img.decoding = "async";
  const loaded = new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not render the image."));
  });
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await loaded;
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0, width, height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not create the PNG."))),
      "image/png",
    ),
  );
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadHeatmapPng(spec: ImageSpec, filename: string): Promise<void> {
  const { svg, width, height } = buildHeatmapSvg(spec);
  downloadBlob(await svgToPngBlob(svg, width, height), filename);
}

export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "habit";
