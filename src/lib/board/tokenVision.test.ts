import { describe, expect, it } from "vitest";
import type { Token } from "@/types/domain";
import { computeTokenRevealMeters } from "./tokenVision";

function makeToken(patch: Partial<Token>): Token {
  return {
    id: "t1",
    scene_id: "s1",
    campaign_id: "c1",
    owner_id: "player-1",
    character_id: null,
    name: "Hero",
    image_url: null,
    pos_x: 0,
    pos_y: 0,
    size: 1,
    hp_current: 10,
    hp_max: 10,
    is_hidden: false,
    conditions: [],
    ring_color: null,
    is_locked: false,
    vision_range: 18,
    light_radius: 0,
    light_color: "#fbbf24",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...patch,
  };
}

describe("computeTokenRevealMeters", () => {
  it("limita o padrão de 18m do banco para 4.5m (3 quadrados) em tokens de jogadores", () => {
    const tok = makeToken({ owner_id: "player-1", vision_range: 18 });
    expect(
      computeTokenRevealMeters(tok, {
        gmUserIds: ["gm-1"],
        isGm: true,
        gmPreviewVision: false,
        selectedTokenId: null,
      })
    ).toBe(4.5);
  });

  it("não recorta escuridão para monstros do Mestre sem visão customizada ou tocha", () => {
    const npc = makeToken({ owner_id: "gm-1", vision_range: 18, light_radius: 0 });
    expect(
      computeTokenRevealMeters(npc, {
        gmUserIds: ["gm-1"],
        isGm: true,
        gmPreviewVision: false,
        selectedTokenId: null,
      })
    ).toBe(0);
  });

  it("respeita tocha acesa e preview do Mestre", () => {
    const npcTorch = makeToken({ owner_id: "gm-1", light_radius: 9 });
    expect(
      computeTokenRevealMeters(npcTorch, {
        gmUserIds: ["gm-1"],
        isGm: true,
        gmPreviewVision: false,
        selectedTokenId: null,
      })
    ).toBe(9);

    const npcPreview = makeToken({ id: "npc-1", owner_id: "gm-1", vision_range: 18 });
    expect(
      computeTokenRevealMeters(npcPreview, {
        gmUserIds: ["gm-1"],
        isGm: true,
        gmPreviewVision: true,
        selectedTokenId: "npc-1",
      })
    ).toBe(4.5);
  });
});
