import { create } from "zustand";
import type { ViewportTransform } from "@/lib/board/geometry";
import type {
  RollResult,
  RulerBroadcastPayload,
  Scene,
  Token,
} from "@/types/domain";

export type BoardTool = "select" | "pan" | "ruler";

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
  dice3dEnabled: true,
  activeDice3dRoll: null,
  combat: {
    active: false,
    round: 1,
    turnIndex: 0,
    combatants: [],
  },

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

      return {
        scenes,
        viewedSceneId: keepViewed
          ? state.viewedSceneId
          : activeScene?.id ?? null,
        tokens,
      };
    }),

  setViewedSceneId: (sceneId) =>
    set({ viewedSceneId: sceneId, selectedTokenId: null }),

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

      return {
        scenes: nextScenes,
        viewedSceneId: nextViewed,
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

  setDice3dEnabled: (enabled) => set({ dice3dEnabled: enabled }),
  triggerDice3dRoll: (roll) => set({ activeDice3dRoll: roll }),
  setCombatState: (combat) => set({ combat }),
}));
