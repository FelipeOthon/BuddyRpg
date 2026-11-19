import { describe, expect, it } from "vitest";
import {
  appendExploredSpot,
  isSpotContained,
  parseTrail,
  pruneExploredSpots,
  serializeTrail,
  shouldRecordSpot,
} from "./exploredSpots";

describe("exploredSpots", () => {
  it("detects contained spots and avoids redundant records", () => {
    const big = { x: 100, y: 100, radiusPx: 200 };
    const small = { x: 130, y: 100, radiusPx: 60 };
    expect(isSpotContained(small, big)).toBe(true);
    expect(shouldRecordSpot([big], small, 30)).toBe(false);
    expect(shouldRecordSpot([big], { x: 400, y: 100, radiusPx: 60 }, 30)).toBe(
      true
    );
  });

  it("appends only useful spots", () => {
    const first = appendExploredSpot([], { x: 0, y: 0, radiusPx: 100 }, 30)!;
    expect(first).toHaveLength(1);
    expect(
      appendExploredSpot(first, { x: 5, y: 5, radiusPx: 100 }, 30)
    ).toBeNull();
  });

  it("prunes redundant spots and caps size", () => {
    const spots = Array.from({ length: 300 }, (_, i) => ({
      x: i * 4,
      y: 0,
      radiusPx: 80,
    }));
    const pruned = pruneExploredSpots(spots, 900);
    expect(pruned.length).toBeLessThan(spots.length);
    // cobertura final continua alcançando as pontas
    expect(pruned.some((s) => s.x <= 40)).toBe(true);
    expect(pruned.some((s) => s.x >= 1100)).toBe(true);
  });

  it("round-trips storage and invalidates by epoch", () => {
    const spots = [{ x: 1, y: 2, radiusPx: 3 }];
    const raw = serializeTrail(spots, 4);
    expect(parseTrail(raw, 4)).toEqual(spots);
    expect(parseTrail(raw, 5)).toEqual([]);
    expect(parseTrail("not-json", 0)).toEqual([]);
    expect(parseTrail(null, 0)).toEqual([]);
  });
});
