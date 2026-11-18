import { create } from "zustand";
import type { ViewportTransform } from "@/lib/board/geometry";
import type {
  CampaignTrack,
  DrawPreviewPayload,
  FogOperation,
  FxBurstPayload,
  MusicStatePayload,
  PinnedRuler,
  PointerBroadcastPayload,
  RollResult,
  RulerBroadcastPayload,
  Scene,
  SceneElement,
  SceneElementKind,
  SceneFogShape,
  SceneWall,
  Token,
  WallType,
} from "@/types/domain";

export type BoardTool =
  | "select"
  | "pan"
  | "ruler"
  | "pointer"
  | "draw"
  | "text"
  | "fog"
  | "wall";

export interface FogToolConfig {
  operation: FogOperation;
  mode: "rect" | "circle" | "polygon" | "slice";
}

export interface DrawConfig {
  kind: Extract<
    SceneElementKind,
    "freehand" | "line" | "rect" | "circle" | "cone"
  >;
  stroke: string;
  fill: string;
  strokeWidth: number;
  opacity: number;
}

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
  elements: SceneElement[];
  fogShapes: SceneFogShape[];
  fogToolConfig: FogToolConfig;
  gmFogOpacity: number;
  walls: SceneWall[];
  wallToolType: WallType;
  gmPreviewVision: boolean;
  fxBursts: FxBurstPayload[];
  selectedTokenId: string | null;
  selectedElementId: string | null;
  drawConfig: DrawConfig;
  remoteDrawPreviews: Record<string, DrawPreviewPayload>;
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
  tracks: CampaignTrack[];
  musicState: MusicStatePayload;
  localMusicVolume: number;
  soundMuted: boolean;
  audioAutoplayBlocked: boolean;

  setTool: (tool: BoardTool) => void;
  setViewport: (viewport: ViewportTransform) => void;
  resetViewport: () => void;
  hydrateBoard: (payload: {
    scenes: Scene[];
    tokens: Token[];
    elements?: SceneElement[];
    fogShapes?: SceneFogShape[];
    walls?: SceneWall[];
    tracks?: CampaignTrack[];
  }) => void;
  setViewedSceneId: (sceneId: string) => void;
  upsertScene: (scene: Scene) => void;
  removeScene: (sceneId: string) => void;
  upsertToken: (token: Token) => void;
  removeToken: (tokenId: string) => void;
  upsertElement: (element: SceneElement) => void;
  removeElement: (elementId: string) => void;
  clearDrawingsForScene: (sceneId: string) => void;
  upsertFogShape: (shape: SceneFogShape) => void;
  removeFogShape: (shapeId: string) => void;
  clearFogForScene: (sceneId: string) => void;
  setFogToolConfig: (patch: Partial<FogToolConfig>) => void;
  setGmFogOpacity: (opacity: number) => void;
  upsertWall: (wall: SceneWall) => void;
  removeWall: (wallId: string) => void;
  clearWallsForScene: (sceneId: string) => void;
  setWallToolType: (wallType: WallType) => void;
  setGmPreviewVision: (preview: boolean) => void;
  triggerFxBurst: (burst: FxBurstPayload) => void;
  pruneFxBursts: (nowTs: number) => void;
  setSelectedTokenId: (tokenId: string | null) => void;
  setSelectedElementId: (elementId: string | null) => void;
  setDrawConfig: (patch: Partial<DrawConfig>) => void;
  setRemoteDrawPreview: (payload: DrawPreviewPayload) => void;
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
  upsertTrack: (track: CampaignTrack) => void;
  removeTrack: (trackId: string) => void;
  setMusicState: (music: MusicStatePayload) => void;
  setLocalMusicVolume: (volume: number) => void;
  setSoundMuted: (muted: boolean) => void;
  setAudioAutoplayBlocked: (blocked: boolean) => void;
}

export const useBoardStore = create<BoardState>((set) => ({
  tool: "select",
  viewport: { x: 40, y: 40, scale: 1 },
  scenes: [],
  viewedSceneId: null,
  tokens: [],
  elements: [],
  fogShapes: [],
  fogToolConfig: {
    operation: "cover",
    mode: "rect",
  },
  gmFogOpacity: 0.62,
  walls: [],
  wallToolType: "wall",
  gmPreviewVision: false,
  fxBursts: [],
  selectedTokenId: null,
  selectedElementId: null,
  drawConfig: {
    kind: "freehand",
    stroke: "#f59e0b",
    fill: "#f59e0b",
    strokeWidth: 4,
    opacity: 0.35,
  },
  remoteDrawPreviews: {},
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
  tracks: [],
  musicState: {
    playing: false,
    kind: "preset",
    preset: "none",
    volume: 0.7,
    loop: true,
    ts: 0,
  },
  localMusicVolume: 0.75,
  soundMuted: false,
  audioAutoplayBlocked: false,

  setTool: (tool) => set({ tool }),
  setViewport: (viewport) => set({ viewport }),
  resetViewport: () => set({ viewport: { x: 40, y: 40, scale: 1 } }),

  hydrateBoard: ({ scenes, tokens, elements, fogShapes, walls, tracks }) =>
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
        ...(elements !== undefined ? { elements } : {}),
        ...(fogShapes !== undefined ? { fogShapes } : {}),
        ...(walls !== undefined ? { walls } : {}),
        ...(tracks !== undefined ? { tracks } : {}),
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
        selectedElementId: null,
        combat: targetScene
          ? extractCombatState(targetScene)
          : DEFAULT_COMBAT_STATE,
      };
    }),

  upsertScene: (scene) =>
    set((state) => {
      const existing = state.scenes.find((s) => s.id === scene.id);
      const nextScenes = existing
        ? state.scenes.map((s) => (s.id === scene.id ? scene : s))
        : [...state.scenes, scene];

      const newlyActivated = Boolean(scene.is_active && !existing?.is_active);
      const nextViewed =
        newlyActivated || !state.viewedSceneId
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

  setSelectedTokenId: (tokenId) =>
    set({ selectedTokenId: tokenId, selectedElementId: null }),
  setSelectedElementId: (elementId) =>
    set({ selectedElementId: elementId, selectedTokenId: null }),
  setDrawConfig: (patch) =>
    set((state) => ({ drawConfig: { ...state.drawConfig, ...patch } })),
  setRemoteDrawPreview: (payload) =>
    set((state) => {
      const next = { ...state.remoteDrawPreviews };
      if (!payload.active) {
        delete next[payload.userId];
      } else {
        next[payload.userId] = payload;
      }
      return { remoteDrawPreviews: next };
    }),
  upsertElement: (element) =>
    set((state) => {
      const exists = state.elements.some((el) => el.id === element.id);
      return {
        elements: exists
          ? state.elements.map((el) => (el.id === element.id ? element : el))
          : [...state.elements, element],
      };
    }),
  removeElement: (elementId) =>
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== elementId),
      selectedElementId:
        state.selectedElementId === elementId ? null : state.selectedElementId,
    })),
  clearDrawingsForScene: (sceneId) =>
    set((state) => ({
      elements: state.elements.filter(
        (el) =>
          el.scene_id !== sceneId ||
          (el.layer !== "drawing" && el.layer !== "text")
      ),
    })),
  upsertFogShape: (shape) =>
    set((state) => {
      const exists = state.fogShapes.some((s) => s.id === shape.id);
      return {
        fogShapes: exists
          ? state.fogShapes.map((s) => (s.id === shape.id ? shape : s))
          : [...state.fogShapes, shape],
      };
    }),
  removeFogShape: (shapeId) =>
    set((state) => ({
      fogShapes: state.fogShapes.filter((s) => s.id !== shapeId),
    })),
  clearFogForScene: (sceneId) =>
    set((state) => ({
      fogShapes: state.fogShapes.filter((s) => s.scene_id !== sceneId),
    })),
  setFogToolConfig: (patch) =>
    set((state) => ({
      fogToolConfig: { ...state.fogToolConfig, ...patch },
    })),
  setGmFogOpacity: (opacity) =>
    set({
      gmFogOpacity: Math.min(Math.max(Math.round(opacity * 100) / 100, 0.05), 1),
    }),
  upsertWall: (wall) =>
    set((state) => {
      const exists = state.walls.some((w) => w.id === wall.id);
      return {
        walls: exists
          ? state.walls.map((w) => (w.id === wall.id ? wall : w))
          : [...state.walls, wall],
      };
    }),
  removeWall: (wallId) =>
    set((state) => ({
      walls: state.walls.filter((w) => w.id !== wallId),
    })),
  clearWallsForScene: (sceneId) =>
    set((state) => ({
      walls: state.walls.filter((w) => w.scene_id !== sceneId),
    })),
  setWallToolType: (wallToolType) => set({ wallToolType }),
  setGmPreviewVision: (gmPreviewVision) => set({ gmPreviewVision }),
  triggerFxBurst: (burst) =>
    set((state) => ({
      fxBursts: [...state.fxBursts.slice(-12), burst],
    })),
  pruneFxBursts: (nowTs) =>
    set((state) => ({
      fxBursts: state.fxBursts.filter((b) => nowTs - b.ts < 2200),
    })),
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
  upsertTrack: (track) =>
    set((state) => {
      const exists = state.tracks.some((t) => t.id === track.id);
      return {
        tracks: exists
          ? state.tracks.map((t) => (t.id === track.id ? track : t))
          : [...state.tracks, track],
      };
    }),
  removeTrack: (trackId) =>
    set((state) => ({
      tracks: state.tracks.filter((t) => t.id !== trackId),
    })),
  setMusicState: (musicState) => set({ musicState }),
  setLocalMusicVolume: (volume) =>
    set({ localMusicVolume: Math.min(Math.max(volume, 0), 1) }),
  setSoundMuted: (soundMuted) => set({ soundMuted }),
  setAudioAutoplayBlocked: (audioAutoplayBlocked) =>
    set({ audioAutoplayBlocked }),
}));
