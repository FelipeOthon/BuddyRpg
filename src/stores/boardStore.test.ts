import { beforeEach, describe, expect, it } from "vitest";
import { useBoardStore } from "./boardStore";
import type { Scene, Token } from "@/types/domain";

function makeScene(overrides: Partial<Scene> = {}): Scene {
  return {
    id: "scene-1",
    campaign_id: "camp-1",
    name: "Taverna",
    map_url: null,
    map_width: 2000,
    map_height: 2000,
    grid_size: 70,
    grid_opacity: 0.4,
    grid_type: "square",
    grid_offset_x: 0,
    grid_offset_y: 0,
    snap_to_grid: true,
    meters_per_cell: 1.5,
    distance_rule: "chebyshev",
    is_active: true,
    combat_state: null,
    fog_enabled: false,
    fog_mode: "static",
    fog_color: "#09090b",
    ambient_light: 1,
    weather_preset: "none",
    weather_intensity: 0.5,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeToken(overrides: Partial<Token> = {}): Token {
  return {
    id: "token-1",
    scene_id: "scene-1",
    campaign_id: "camp-1",
    owner_id: "user-1",
    character_id: null,
    name: "Herói",
    image_url: null,
    pos_x: 70,
    pos_y: 70,
    size: 1,
    hp_current: 20,
    hp_max: 20,
    is_hidden: false,
    conditions: [],
    ring_color: null,
    is_locked: false,
    vision_range: 18,
    light_radius: 0,
    light_color: "#fbbf24",
    updated_at: "2026-01-01T00:00:10.000Z",
    ...overrides,
  };
}

describe("useBoardStore", () => {
  beforeEach(() => {
    useBoardStore.setState({
      tool: "select",
      viewport: { x: 40, y: 40, scale: 1 },
      scenes: [],
      viewedSceneId: null,
      tokens: [],
      elements: [],
      fogShapes: [],
      walls: [],
      fxBursts: [],
      selectedTokenId: null,
      selectedElementId: null,
      remoteDrawPreviews: {},
      draggingLocalTokenId: null,
      remoteTokenDrags: {},
      remoteRulers: {},
      pinnedRulers: [],
      rulerPinMode: false,
      remotePointers: {},
      uiHidden: false,
      combat: { active: false, round: 1, turnIndex: 0, combatants: [] },
    });
  });

  it("hydrates scenes, tokens, and persisted combat state", () => {
    const scene = makeScene({
      combat_state: {
        active: true,
        round: 3,
        turnIndex: 1,
        combatants: [
          { tokenId: "token-1", name: "Herói", initiative: 18 },
          { tokenId: "token-2", name: "Goblin", initiative: 12 },
        ],
      },
    });
    const token = makeToken();

    useBoardStore.getState().hydrateBoard({ scenes: [scene], tokens: [token] });
    const state = useBoardStore.getState();

    expect(state.viewedSceneId).toBe("scene-1");
    expect(state.tokens).toHaveLength(1);
    expect(state.combat.active).toBe(true);
    expect(state.combat.round).toBe(3);
    expect(state.combat.combatants).toHaveLength(2);
  });

  it("ignores stale token updates based on updated_at", () => {
    const fresh = makeToken({
      pos_x: 210,
      updated_at: "2026-01-01T00:01:00.000Z",
    });
    const stale = makeToken({
      pos_x: 70,
      updated_at: "2026-01-01T00:00:30.000Z",
    });

    useBoardStore.getState().upsertToken(fresh);
    useBoardStore.getState().upsertToken(stale);

    expect(useBoardStore.getState().tokens[0]?.pos_x).toBe(210);
  });

  it("switches viewed scene and syncs its combat state", () => {
    const s1 = makeScene({ id: "scene-1", is_active: true, combat_state: null });
    const s2 = makeScene({
      id: "scene-2",
      is_active: false,
      combat_state: {
        active: true,
        round: 2,
        turnIndex: 0,
        combatants: [{ tokenId: "t2", name: "Dragão", initiative: 20 }],
      },
    });

    useBoardStore.getState().hydrateBoard({ scenes: [s1, s2], tokens: [] });
    useBoardStore.getState().setSelectedTokenId("token-1");
    useBoardStore.getState().setViewedSceneId("scene-2");

    const state = useBoardStore.getState();
    expect(state.viewedSceneId).toBe("scene-2");
    expect(state.selectedTokenId).toBeNull();
    expect(state.combat.active).toBe(true);
    expect(state.combat.round).toBe(2);
  });

  it("removes scene and its associated tokens cleanly", () => {
    const s1 = makeScene({ id: "scene-1", is_active: true });
    const s2 = makeScene({ id: "scene-2", is_active: false });
    const t1 = makeToken({ id: "t1", scene_id: "scene-1" });
    const t2 = makeToken({ id: "t2", scene_id: "scene-2" });

    useBoardStore
      .getState()
      .hydrateBoard({ scenes: [s1, s2], tokens: [t1, t2] });
    useBoardStore.getState().removeScene("scene-1");

    const state = useBoardStore.getState();
    expect(state.viewedSceneId).toBe("scene-2");
    expect(state.tokens.map((t) => t.id)).toEqual(["t2"]);
  });

  it("manages pinned rulers, remote pointers, and uiHidden", () => {
    const store = useBoardStore.getState();
    store.addPinnedRuler({
      id: "r1",
      userId: "u1",
      username: "Mestre",
      color: "#a855f7",
      sceneId: "scene-1",
      startX: 0,
      startY: 0,
      endX: 140,
      endY: 0,
    });
    expect(useBoardStore.getState().pinnedRulers).toHaveLength(1);

    store.removePinnedRuler("r1");
    expect(useBoardStore.getState().pinnedRulers).toHaveLength(0);

    store.setRemotePointer({
      userId: "u2",
      username: "Player",
      color: "#38bdf8",
      sceneId: "scene-1",
      x: 100,
      y: 200,
      active: true,
      ts: 1,
    });
    expect(useBoardStore.getState().remotePointers["u2"]?.active).toBe(true);

    store.setRemotePointer({
      userId: "u2",
      username: "Player",
      color: "#38bdf8",
      sceneId: "scene-1",
      x: 100,
      y: 200,
      active: false,
      ts: 2,
    });
    expect(useBoardStore.getState().remotePointers["u2"]).toBeUndefined();

    store.setUiHidden(true);
    expect(useBoardStore.getState().uiHidden).toBe(true);
  });
});
