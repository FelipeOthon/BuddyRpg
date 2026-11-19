import { describe, expect, it } from "vitest";
import {
  buildOrganicCircleCloudPoints,
  buildOrganicRectCloudPoints,
} from "./fogCloudGeometry";

describe("fogCloudGeometry", () => {
  it("gera contorno determinístico de nuvem sem pontos infinitos para retângulos", () => {
    const p1 = buildOrganicRectCloudPoints(100, 140, 210, 140, "shape-1", 18);
    const p2 = buildOrganicRectCloudPoints(100, 140, 210, 140, "shape-1", 18);
    expect(p1).toEqual(p2);
    expect(p1.length).toBeGreaterThanOrEqual(32);
    expect(p1.every((v) => Number.isFinite(v))).toBe(true);
  });

  it("gera contorno orgânico para círculos", () => {
    const pts = buildOrganicCircleCloudPoints(400, 300, 120, "circle-a", 14);
    expect(pts.length).toBeGreaterThanOrEqual(32);
    expect(pts.every((v) => Number.isFinite(v))).toBe(true);
  });
});
