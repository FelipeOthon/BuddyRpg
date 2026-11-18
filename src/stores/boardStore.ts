import { create } from "zustand";
import type { ViewportTransform } from "@/lib/board/geometry";
import type {
  PinnedRuler,
  PointerBroadcastPayload,
  RollResult,
  RulerBroadcastPayload,
  Scene,
  Token,
} from "@/types/domain";

export type BoardTool = "select" | "pan" | "ruler" | "pointer";

export interface RemoteDragPosition {
  x: number;
  y: number;
  userId: string;
  ts: number;
}

export interface ActiveDice3DRoll {
  id: string;
  author: string;
  roll: RollResult;
  ts: number;
}

export interface CombatantEntry {
  tokenId: string;
  name: string;
  initiative: number;
}

export interface CombatStatePayload {
  active: boolean;
  round: number;
  turnIndex: number;
  combatants: CombatantEntry[];
}

const DEFAULT_COMBAT_STATE: CombatStatePayload = {
  active: false,
  round: 1,
  turnIndex: 0,
  combatants: [],
};

function extractCombatState(scene: Scene | null | undefined): CombatStatePayload {
  const raw = scene?.combat_state as unknown;
  if (!raw || typeof raw !== "object") return DEFAULT_COMBAT_STATE;
  const obj = raw as Partial<CombatStatePayload>;
  if (typeof obj.active !== "boolean" || !Array.isArray(obj.combatants)) {
    return DEFAULT_COMBAT_STATE;
  }
  return {
    active: obj.active,
    round: typeof obj.round === "number" && obj.round >= 1 ? obj.round : 1,
    turnIndex:
      typeof obj.turnIndex === "number" && obj.turnIndex >= 0
        ? obj.turnIndex
        : 0,
    combatants: obj.combatants,
  };
}

interface BoardState {
  tool: BoardTool;
  viewport: ViewportTransform;
  scenes: Scene[];
  viewedSceneId: string | null;
  tokens: Token[];
  selectedTokenId: string | null;
  draggingLocalTokenId: string | null;
  remoteTokenDrags: Record<string, RemoteDragPosition>;
  remoteRulers: Record<string, RulerBroadcastPayload>;
  pinnedRulers: PinnedRuler[];
  rulerPinMode: boolean;
  remotePointers: Record<string, PointerBroadcastPayload>;
  uiHidden: boolean;
  dice3dEnabled: boolean;
  activeDice3dRoll: ActiveDice3DRoll | null;
  combat: CombatStatePayload;

  setTool: (tool: BoardTool) => void;
  setViewport: (viewport: ViewportTransform) => void;
  resetViewport: () => void;
  hydrateBoard: (payload: { scenes: Scene[]; tokens: Token[] }) => void;
  setViewedSceneId: (sceneId: string) => void;
  upsertScene: (scene: Scene) => void;
  removeScene: (sceneId: string) => void;
  upsertToken: (token: Token) => void;
  removeToken: (tokenId: string) => void;
  setSelectedTokenId: (tokenId: string | null) => void;
  setDraggingLocalTokenId: (tokenId: string | null) => void;
  setRemoteTokenDrag: (tokenId: string, drag: RemoteDragPosition) => void;
  clearRemoteTokenDrag: (tokenId: string) => void;
  setRemoteRuler: (payload: RulerBroadcastPayload) => void;
  setRulerPinMode: (pin: boolean) => void;
  addPinnedRuler: (ruler: PinnedRuler) => void;
  removePinnedRuler: (rulerId: string) => void;
  clearPinnedRulers: (sceneId?: string) => void;
  setRemotePointer: (payload: PointerBroadcastPayload) => void;
  setUiHidden: (hidden: boolean) => void;
  setDice3dEnabled: (enabled: boolean) => void;
  triggerDice3dRoll: (roll: ActiveDice3DRoll | null) => void;
  setCombatState: (combat: CombatStatePayload) => void;
}

export const useBoardStore = create<BoardState>((set) => ({
  tool: "select",
  viewport: { x: 40, y: 40, scale: 1 },
  scenes: [],
  viewedSceneId: null,
  tokens: [],
  selectedTokenId: null,
  draggingLocalTokenId: null,
  remoteTokenDrags: {},
  remoteRulers: {},
  pinnedRulers: [],
  rulerPinMode: false,
  remotePointers: {},
  uiHidden: false,
  dice3dEnabled: true,
  activeDice3dRoll: null,
  combat: DEFAULT_COMBAT_STATE,

  setTool: (tool) => set({ tool }),
  setViewport: (viewport) => set({ viewport }),
  resetViewport: () => set({ viewport: { x: 40, y: 40, scale: 1 } }),

  hydrateBoard: ({ scenes, tokens }) =>
    set((state) => {
      const activeScene =
        scenes.find((s) => s.is_active) ?? scenes[0] ?? null;
      const keepViewed =
        state.viewedSceneId &&
        scenes.some((s) => s.id === state.viewedSceneId);
      const nextViewedId = keepViewed
        ? state.viewedSceneId
        : activeScene?.id ?? null;
      const viewedScene =
        scenes.find((s) => s.id === nextViewedId) ?? activeScene;

      return {
        scenes,
        viewedSceneId: nextViewedId,
        tokens,
        combat: viewedScene
          ? extractCombatState(viewedScene)
          : DEFAULT_COMBAT_STATE,
      };
    }),

  setViewedSceneId: (sceneId) =>
    set((state) => {
      const targetScene = state.scenes.find((s) => s.id === sceneId);
      return {
        viewedSceneId: sceneId,
        selectedTokenId: null,
        combat: targetScene
          ? extractCombatState(targetScene)
          : DEFAULT_COMBAT_STATE,
      };
    }),

  upsertScene: (scene) =>
    set((state) => {
      const exists = state.scenes.some((s) => s.id === scene.id);
      const nextScenes = exists
        ? state.scenes.map((s) => (s.id === scene.id ? scene : s))
        : [...state.scenes, scene];

      const nextViewed =
        scene.is_active || !state.viewedSceneId
          ? scene.id
          : state.viewedSceneId;

      const shouldSyncCombat =
        scene.id === nextViewed && scene.combat_state !== undefined;

      return {
        scenes: nextScenes,
        viewedSceneId: nextViewed,
        ...(shouldSyncCombat
          ? { combat: extractCombatState(scene) }
          : {}),
      };
    }),

  removeScene: (sceneId) =>
    set((state) => {
      const nextScenes = state.scenes.filter((s) => s.id !== sceneId);
      const fallback =
        nextScenes.find((s) => s.is_active) ?? nextScenes[0] ?? null;
      return {
        scenes: nextScenes,
        viewedSceneId:
          state.viewedSceneId === sceneId
            ? fallback?.id ?? null
            : state.viewedSceneId,
        tokens: state.tokens.filter((t) => t.scene_id !== sceneId),
      };
    }),

  upsertToken: (token) =>
    set((state) => {
      const existing = state.tokens.find((t) => t.id === token.id);
      if (
        existing &&
        existing.updated_at &&
        token.updated_at &&
        new Date(token.updated_at).getTime() <
          new Date(existing.updated_at).getTime()
      ) {
        return state;
      }

      const nextTokens = existing
        ? state.tokens.map((t) => (t.id === token.id ? token : t))
        : [...state.tokens, token];

      const nextDrags = { ...state.remoteTokenDrags };
      delete nextDrags[token.id];

      return {
        tokens: nextTokens,
        remoteTokenDrags: nextDrags,
      };
    }),

  removeToken: (tokenId) =>
    set((state) => {
      const nextDrags = { ...state.remoteTokenDrags };
      delete nextDrags[tokenId];
      return {
        tokens: state.tokens.filter((t) => t.id !== tokenId),
        selectedTokenId:
          state.selectedTokenId === tokenId ? null : state.selectedTokenId,
        remoteTokenDrags: nextDrags,
      };
    }),

  setSelectedTokenId: (tokenId) => set({ selectedTokenId: tokenId }),
  setDraggingLocalTokenId: (tokenId) => set({ draggingLocalTokenId: tokenId }),

  setRemoteTokenDrag: (tokenId, drag) =>
    set((state) => {
      if (state.draggingLocalTokenId === tokenId) {
        return state;
      }
      return {
        remoteTokenDrags: {
          ...state.remoteTokenDrags,
          [tokenId]: drag,
        },
      };
    }),

  clearRemoteTokenDrag: (tokenId) =>
    set((state) => {
      const next = { ...state.remoteTokenDrags };
      delete next[tokenId];
      return { remoteTokenDrags: next };
    }),

  setRemoteRuler: (payload) =>
    set((state) => {
      const next = { ...state.remoteRulers };
      if (!payload.active) {
        delete next[payload.userId];
      } else {
        next[payload.userId] = payload;
      }
      return { remoteRulers: next };
    }),

  setRulerPinMode: (rulerPinMode) => set({ rulerPinMode }),

  addPinnedRuler: (ruler) =>
    set((state) => ({
      pinnedRulers: state.pinnedRulers.some((r) => r.id === ruler.id)
        ? state.pinnedRulers
        : [...state.pinnedRulers, ruler],
    })),

  removePinnedRuler: (rulerId) =>
    set((state) => ({
      pinnedRulers: state.pinnedRulers.filter((r) => r.id !== rulerId),
    })),

  clearPinnedRulers: (sceneId) =>
    set((state) => ({
      pinnedRulers: sceneId
        ? state.pinnedRulers.filter((r) => r.sceneId !== sceneId)
        : [],
    })),

  setRemotePointer: (payload) =>
    set((state) => {
      const next = { ...state.remotePointers };
      if (!payload.active) {
        delete next[payload.userId];
      } else {
        next[payload.userId] = payload;
      }
      return { remotePointers: next };
    }),

  setUiHidden: (uiHidden) => set({ uiHidden }),

  setDice3dEnabled: (enabled) => set({ dice3dEnabled: enabled }),
  triggerDice3dRoll: (roll) => set({ activeDice3dRoll: roll }),
  setCombatState: (combat) => set({ combat }),
}));
