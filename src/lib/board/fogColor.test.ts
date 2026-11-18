import { describe, expect, it } from "vitest";
import { formatFogColor, parseFogColor } from "./fogColor";

describe("fogColor helpers", () => {
  it("parses standard 6-digit hex colors with full opacity", () => {
    expect(parseFogColor("#09090b")).toEqual({
      hex: "#09090b",
      opacity: 1,
    });
  });

  it("parses 8-digit hex colors into hex and clamped opacity", () => {
    const parsed = parseFogColor("#09090b80");
    expect(parsed.hex).toBe("#09090b");
    expect(parsed.opacity).toBeCloseTo(0.5, 2);
  });

  it("clamps minimum opacity to 0.05", () => {
    expect(parseFogColor("#09090b00").opacity).toBe(0.05);
    expect(formatFogColor("#09090b", 0)).toBe("#09090b0d");
  });

  it("formats 100% opacity as 6-digit hex", () => {
    expect(formatFogColor("#112233", 1)).toBe("#112233");
    expect(formatFogColor("#11223380", 1)).toBe("#112233");
  });
});
