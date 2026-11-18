import { describe, expect, it } from "vitest";
import { computeVisibilityPolygon } from "./visibility";

describe("computeVisibilityPolygon", () => {
  it("produces full radius points when there are no blocking walls", () => {
    const poly = computeVisibilityPolygon({ x: 100, y: 100 }, 200, []);
    expect(poly.length).toBe(48 * 2);
    const dist0 = Math.hypot(poly[0]! - 100, poly[1]! - 100);
    expect(Math.round(dist0)).toBe(200);
  });

  it("clips rays blocked by a wall segment", () => {
    const wall = { x1: 180, y1: -300, x2: 180, y2: 500 };
    const poly = computeVisibilityPolygon({ x: 100, y: 100 }, 250, [wall]);

    // Nenhum ponto do polígono deve ultrapassar x = 180 (+ tolerância numérica)
    for (let i = 0; i < poly.length; i += 2) {
      expect(poly[i]!).toBeLessThanOrEqual(180.5);
    }
  });
});
