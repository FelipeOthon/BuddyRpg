import { describe, expect, it } from "vitest";
import {
  buildAiBattlemapUrl,
  FORGOTTEN_REALMS_PRESETS,
  generateProceduralMap,
} from "./mapGenerator";

describe("procedural map generator (Forgotten Realms biomes)", () => {
  it("generates deterministic layouts for the same seed across all 4 biomes", () => {
    const biomes = [
      "undermountain",
      "underdark",
      "cormyr_forest",
      "waterdeep_tavern",
    ] as const;

    for (const biome of biomes) {
      const m1 = generateProceduralMap({
        biome,
        cols: 20,
        rows: 16,
        seed: "waterdeep-seed-123",
      });
      const m2 = generateProceduralMap({
        biome,
        cols: 20,
        rows: 16,
        seed: "waterdeep-seed-123",
      });

      expect(m1.rows).toBe(16);
      expect(m1.cols).toBe(20);
      expect(m1.tiles).toEqual(m2.tiles);
      expect(m1.props).toEqual(m2.props);
    }
  });

  it("includes 4 Forgotten Realms classic presets and builds AI top-down URLs", () => {
    expect(FORGOTTEN_REALMS_PRESETS).toHaveLength(4);
    const url = buildAiBattlemapUrl(
      "templo élfico na floresta",
      1400,
      1050,
      "99"
    );
    expect(url).toContain("https://image.pollinations.ai/prompt/");
    expect(url).toContain("battlemap");
  });
});
