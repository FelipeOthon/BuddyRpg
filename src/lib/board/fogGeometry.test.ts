import { describe, expect, it } from "vitest";
import {
  computeNonOverlappingCoverRects,
  rectToFlatPolygon,
  slicePolygonByLine,
} from "./fogGeometry";

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

describe("computeNonOverlappingCoverRects", () => {
  it("returns empty when the new fog rect is already completely covered", () => {
    const pieces = computeNonOverlappingCoverRects(
      { x: 0, y: 0, width: 140, height: 140 },
      [{ x: 0, y: 0, width: 280, height: 280 }]
    );
    expect(pieces).toEqual([]);
  });

  it("places fog only on the uncovered portion when overlapping existing fog", () => {
    const pieces = computeNonOverlappingCoverRects(
      { x: 70, y: 0, width: 140, height: 140 },
      [{ x: 0, y: 0, width: 140, height: 140 }]
    );
    expect(pieces).toEqual([{ x: 140, y: 0, width: 70, height: 140 }]);
  });

  it("allows re-covering an area that was previously revealed", () => {
    const pieces = computeNonOverlappingCoverRects(
      { x: 70, y: 70, width: 70, height: 70 },
      [{ x: 0, y: 0, width: 210, height: 210 }],
      [{ x: 70, y: 70, width: 70, height: 70 }]
    );
    expect(pieces).toEqual([{ x: 70, y: 70, width: 70, height: 70 }]);
  });
});
