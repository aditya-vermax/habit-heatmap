import { describe, expect, it } from "vitest";
import { hexToHsv, hsvToHex, normalizeHex, readableInk } from "@/lib/color";
import { firstEmoji } from "@/components/habits/emoji-data";

describe("color helpers", () => {
  it("round-trips hex through HSV", () => {
    for (const hex of ["#E5383B", "#2F80ED", "#FFFFFF", "#000000", "#2FB344"]) {
      expect(hsvToHex(hexToHsv(hex))).toBe(hex);
    }
  });
  it("normalizes short and long hex", () => {
    expect(normalizeHex("#abc")).toBe("#AABBCC");
    expect(normalizeHex("12ab9f")).toBe("#12AB9F");
    expect(normalizeHex("#12")).toBeNull();
  });
});

describe("readableInk", () => {
  it("uses dark ink on light colours and white ink on dark ones", () => {
    expect(readableInk("#FFE066")).toBe("#1B0710");
    expect(readableInk("#FFFFFF")).toBe("#1B0710");
    expect(readableInk("#850E35")).toBe("#FFFFFF");
    expect(readableInk("#1D4ED8")).toBe("#FFFFFF");
  });
});

describe("firstEmoji", () => {
  it("finds an emoji in mixed text and ignores plain text", () => {
    expect(firstEmoji("hi 🏃")).toBe("🏃");
    expect(firstEmoji("abc")).toBeNull();
  });
});
