import { describe, expect, it } from "vitest";
import {
  clamp,
  measureDistance,
  screenToWorld,
  snapToGrid,
  worldToScreen,
} from "./geometry";

describe("board geometry", () => {
  it("clamps values within bounds", () => {
    expect(clamp(5, 1, 10)).toBe(5);
    expect(clamp(-2, 0.1, 5)).toBe(0.1);
    expect(clamp(10, 0.1, 5)).toBe(5);
  });

  it("converts screen coordinates to world coordinates and back", () => {
    const viewport = { x: 100, y: -50, scale: 2 };
    const world = { x: 140, y: 210 };
    const screen = worldToScreen(world, viewport);
    expect(screen).toEqual({ x: 380, y: 370 });
    expect(screenToWorld(screen, viewport)).toEqual(world);
  });

  it("snaps coordinates to the nearest grid cell when snap is enabled", () => {
    expect(snapToGrid({ x: 68, y: 142 }, 70, true)).toEqual({
      x: 70,
      y: 140,
    });
    expect(snapToGrid({ x: 68.4, y: 142.2 }, 70, false)).toEqual({
      x: 68,
      y: 142,
    });
  });

  it("measures distance using Chebyshev, Euclidean, and Alternating rules", () => {
    const start = { x: 0, y: 0 };
    const end = { x: 210, y: 280 }; // 3x4 cells at gridSize=70

    const cheb = measureDistance({
      start,
      end,
      gridSize: 70,
      metersPerCell: 1.5,
      rule: "chebyshev",
    });
    expect(cheb.cells).toBe(4);
    expect(cheb.meters).toBe(6);

    const eucl = measureDistance({
      start,
      end,
      gridSize: 70,
      metersPerCell: 1.5,
      rule: "euclidean",
    });
    expect(eucl.cells).toBe(5);
    expect(eucl.meters).toBe(7.5);

    const alt = measureDistance({
      start,
      end,
      gridSize: 70,
      metersPerCell: 1.5,
      rule: "alternating",
    });
    // 3 diagonals (3 * 1.5 = 4.5) + 1 straight = 5.5 cells
    expect(alt.cells).toBe(5.5);
    expect(alt.meters).toBe(8.3);
  });
});
