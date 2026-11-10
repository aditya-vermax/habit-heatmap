"use client";

import { useRef, useState } from "react";
import { hexToHsv, hsvToHex, normalizeHex, type Hsv } from "@/lib/color";

const clamp = (n: number) => Math.min(1, Math.max(0, n));

/** Minimal colour tray: saturation/brightness square, hue slider and a hex field. */
export function ColorTray({
  value,
  onChange,
  onDone,
}: {
  value: string;
  onChange: (hex: string) => void;
  onDone: () => void;
}) {
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value));
  const [hexText, setHexText] = useState(value.toUpperCase());
  const area = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  function apply(next: Hsv) {
    const hex = hsvToHex(next);
    setHsv(next);
    setHexText(hex);
    onChange(hex);
  }

  function fromPointer(e: React.PointerEvent) {
    const r = area.current!.getBoundingClientRect();
    apply({
      h: hsv.h,
      s: clamp((e.clientX - r.left) / r.width),
      v: 1 - clamp((e.clientY - r.top) / r.height),
    });
  }

  function onKey(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 0.1 : 0.02;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    apply({ h: hsv.h, s: clamp(hsv.s + m[0]), v: clamp(hsv.v + m[1]) });
  }

  const current = hsvToHex(hsv);

  return (
    <div className="tray" role="group" aria-label="Custom colour">
      <div
        ref={area}
        className="sv-area"
        style={{ "--h": hsv.h } as React.CSSProperties}
        role="slider"
        tabIndex={0}
        aria-label="Saturation and brightness"
        aria-valuetext={`Saturation ${Math.round(hsv.s * 100)}%, brightness ${Math.round(hsv.v * 100)}%`}
        aria-valuenow={Math.round(hsv.s * 100)}
        onKeyDown={onKey}
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          fromPointer(e);
        }}
        onPointerMove={(e) => dragging.current && fromPointer(e)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      >
        <span className="sv-thumb" style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }} />
      </div>
      <input
        type="range"
        className="hue-range"
        min={0}
        max={360}
        value={Math.round(hsv.h)}
        aria-label="Hue"
        onChange={(e) => apply({ ...hsv, h: Number(e.target.value) })}
      />
      <div className="tray-row">
        <span className="tray-preview" style={{ "--c": current } as React.CSSProperties} aria-hidden="true" />
        <input
          className="tray-hex"
          aria-label="Hex colour"
          value={hexText}
          maxLength={7}
          spellCheck={false}
          onChange={(e) => {
            setHexText(e.target.value);
            const hex = normalizeHex(e.target.value);
            if (hex) {
              setHsv(hexToHsv(hex));
              onChange(hex);
            }
          }}
          onBlur={() => setHexText(current)}
        />
        <button type="button" className="btn btn-sm" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}
