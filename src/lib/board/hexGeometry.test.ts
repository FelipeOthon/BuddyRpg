import { describe, expect, it } from "vitest";
import { snapToGrid } from "./geometry";

describe("grid offset and hexagonal snapping", () => {
  it("respects grid offset in square mode", () => {
    const snapped = snapToGrid({ x: 82, y: 85 }, 70, true, 15, 10, "square");
    expect(snapped).toEqual({ x: 85, y: 80 });
  });

  it("bypasses snapping when gridType is none", () => {
    const snapped = snapToGrid(
      { x: 82.4, y: 85.7 },
      70,
      true,
      15,
      10,
      "none"
    );
    expect(snapped).toEqual({ x: 82, y: 86 });
  });

  it("snaps deterministically on hex_pointy and hex_flat grids", () => {
    const pointyA = snapToGrid({ x: 5, y: 5 }, 70, true, 0, 0, "hex_pointy");
    const pointyB = snapToGrid({ x: 8, y: 8 }, 70, true, 0, 0, "hex_pointy");
    expect(pointyA).toEqual(pointyB);

    const flatA = snapToGrid({ x: 5, y: 5 }, 70, true, 0, 0, "hex_flat");
    const flatB = snapToGrid({ x: 8, y: 8 }, 70, true, 0, 0, "hex_flat");
    expect(flatA).toEqual(flatB);
  });
});
