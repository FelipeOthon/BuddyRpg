import { describe, expect, it } from "vitest";
import { rectToFlatPolygon, slicePolygonByLine } from "./fogGeometry";

describe("fogGeometry slicePolygonByLine", () => {
  it("splits a rectangle cleanly into two polygons when sliced across", () => {
    const rect = rectToFlatPolygon(0, 0, 200, 100);
    const result = slicePolygonByLine(
      rect,
      { x: 100, y: -20 },
      { x: 100, y: 120 }
    );
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result[0].length).toBeGreaterThanOrEqual(8);
    expect(result[1].length).toBeGreaterThanOrEqual(8);
  });

  it("returns null if the slice line does not cross the polygon", () => {
    const rect = rectToFlatPolygon(0, 0, 200, 100);
    const result = slicePolygonByLine(
      rect,
      { x: 300, y: 0 },
      { x: 300, y: 100 }
    );
    expect(result).toBeNull();
  });
});
