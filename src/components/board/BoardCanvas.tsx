"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, HelpCircle } from "lucide-react";
import { Layer, Rect, Stage } from "react-konva";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { clamp, screenToWorld, type Point2D } from "@/lib/board/geometry";
import { computeVisibilityPolygon } from "@/lib/board/visibility";
import { useKeyPressed } from "@/hooks/useKeyPressed";
import { useExploredPersistence } from "@/hooks/useExploredPersistence";
import { useBoardStore } from "@/stores/boardStore";
import {
  clearSceneDrawingsAction,
  createSceneElementAction,
  deleteSceneElementAction,
  updateSceneElementAction,
} from "@/actions/elements";
import {
  createFogShapeAction,
  deleteFogShapeAction,
  replaceFogShapesAction,
  resetSceneTrailAction,
  updateSceneFogSettingsAction,
} from "@/actions/fog";
import {
  clearSceneWallsAction,
  createSceneWallAction,
  deleteSceneWallAction,
  toggleDoorAction,
  updateSceneEnvironmentAction,
} from "@/actions/lighting";
import { createTokenAction } from "@/actions/tokens";
import { snapToGrid } from "@/lib/board/geometry";
import { formatFogColor, parseFogColor } from "@/lib/board/fogColor";
import { computeTokenRevealMeters } from "@/lib/board/tokenVision";
import {
  computeNonOverlappingCoverRects,
  rectToFlatPolygon,
  slicePolygonByLine,
  subtractFogRect,
  type FogRect,
} from "@/lib/board/fogGeometry";
import { uploadCampaignImage } from "@/lib/utils/storage";
import type { Json } from "@/types/database.types";
import type {
  CampaignRole,
  DrawPreviewPayload,
  FogShapeData,
  MusicStatePayload,
  PinnedRuler,
  RevealMode,
  Scene,
  SceneElementData,
  Token,
} from "@/types/domain";
import MapLayer from "./MapLayer";
import AnimatedPropsOverlay from "./AnimatedPropsOverlay";
import GridLayer from "./GridLayer";
import ElementsLayer, { type LocalDrawState } from "./ElementsLayer";
import DrawingSubToolbar from "./DrawingSubToolbar";
import FogLayer, { type LocalFogPreview } from "./FogLayer";
import FogSubToolbar from "./FogSubToolbar";
import LightingLayer from "./LightingLayer";
import WallsLayer, { type LocalWallPreview } from "./WallsLayer";
import WallEnvSubToolbar from "./WallEnvSubToolbar";
import WeatherSubToolbar from "./WeatherSubToolbar";
import WeatherOverlay from "./WeatherOverlay";
import TokenNode from "./TokenNode";
import RulerLayer, { type LocalRulerState } from "./RulerLayer";
import PointerLayer from "./PointerLayer";
import BoardToolbar from "./BoardToolbar";

export default function BoardCanvas({
  scene,
  currentUserId,
  currentUsername,
  role,
  gmUserIds = [],
  onTokenDragBroadcast,
  onTokenDragCommit,
  onRulerBroadcast,
  onRulerPinBroadcast,
  onPointerBroadcast,
  onDrawPreviewBroadcast,
  onSyncView,
  onQuickRoll,
  onBroadcastMusicState,
  onOpenSceneManager,
}: {
  scene: Scene;
  currentUserId: string;
  currentUsername: string;
  role: CampaignRole;
  gmUserIds?: string[];
  onTokenDragBroadcast?: (tokenId: string, x: number, y: number) => void;
  onTokenDragCommit?: (
    tokenId: string,
    x: number,
    y: number,
    prevX: number,
    prevY: number
  ) => void;
  onRulerBroadcast?: (
    start: Point2D,
    end: Point2D,
    active: boolean
  ) => void;
  onRulerPinBroadcast?: (
    action: "add" | "remove" | "clear",
    ruler?: Omit<PinnedRuler, "userId" | "username" | "color">,
    rulerId?: string
  ) => PinnedRuler | null;
  onPointerBroadcast?: (pos: Point2D, active: boolean) => void;
  onDrawPreviewBroadcast?: (
    preview: Omit<DrawPreviewPayload, "userId" | "sceneId">
  ) => void;
  onSyncView?: (x: number, y: number, scale: number) => void;
  onQuickRoll?: (cmd: string) => void;
  onBroadcastMusicState?: (state: Omit<MusicStatePayload, "userId">) => void;
  onOpenSceneManager?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);

  const [size, setSize] = useState({ width: 900, height: 650 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(
    null
  );
  const pinchDistRef = useRef<number | null>(null);
  const [localRuler, setLocalRuler] = useState<LocalRulerState | null>(null);
  const [localPointer, setLocalPointer] = useState<Point2D | null>(null);
  const [localDraw, setLocalDraw] = useState<LocalDrawState | null>(null);
  const [localFogPreview, setLocalFogPreview] =
    useState<LocalFogPreview | null>(null);
  const [localWeatherPreview, setLocalWeatherPreview] = useState<{
    start: Point2D;
    end: Point2D;
  } | null>(null);
  const [fogPolygonPoints, setFogPolygonPoints] = useState<number[]>([]);
  const [localWall, setLocalWall] = useState<LocalWallPreview | null>(null);
  const [textDraft, setTextDraft] = useState<{
    world: Point2D;
    screen: Point2D;
    value: string;
  } | null>(null);
  const [localTokenDragPos, setLocalTokenDragPos] = useState<{
    tokenId: string;
    x: number;
    y: number;
  } | null>(null);
  const [isDragOverFile, setIsDragOverFile] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [pendingDrop, setPendingDrop] = useState<{
    file: File;
    world: Point2D;
    screen: Point2D;
  } | null>(null);
  const [tokenDragRuler, setTokenDragRuler] =
    useState<LocalRulerState | null>(null);
  const tokenDragCenterRef = useRef<{
    origin: Point2D;
    halfSize: number;
  } | null>(null);

  const spaceDown = useKeyPressed(" ");
  const shiftDown = useKeyPressed("Shift");
  const altDown = useKeyPressed("Alt");
  const {
    tool,
    viewport,
    setViewport,
    tokens,
    elements,
    fogShapes,
    fogToolConfig,
    selectedFogShapeId,
    setSelectedFogShapeId,
    exploredMemory,
    exploredDarknessMemory,
    recordExploredSpot,
    clearExploredMemory,
    gmFogOpacity,
    setGmFogOpacity,
    walls,
    wallToolType,
    weatherToolConfig,
    setWeatherToolConfig,
    weatherSelectedIds,
    setWeatherSelectedIds,
    toggleWeatherSelectedId,
    gmPreviewVision,
    selectedTokenId,
    selectedElementId,
    drawConfig,
    remoteDrawPreviews,
    setTool,
    setSelectedTokenId,
    setSelectedElementId,
    upsertElement,
    removeElement,
    clearDrawingsForScene,
    upsertFogShape,
    removeFogShape,
    upsertWall,
    removeWall,
    clearWallsForScene,
    upsertScene,
    setDraggingLocalTokenId,
    remoteTokenDrags,
    remoteRulers,
    pinnedRulers,
    rulerPinMode,
    addPinnedRuler,
    removePinnedRuler,
    clearPinnedRulers,
    remotePointers,
    uiHidden,
    setUiHidden,
    upsertToken,
  } = useBoardStore();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      setSize({
        width: Math.max(el.clientWidth, 200),
        height: Math.max(el.clientHeight, 200),
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  const sceneTokens = useMemo(
    () =>
      tokens.filter(
        (t) => t.scene_id === scene.id && (role === "gm" || !t.is_hidden)
      ),
    [tokens, scene.id, role]
  );

  const renderedTokens = sceneTokens;

  useExploredPersistence(scene);

  const canUserMoveToken = (token: Token): boolean => {
    if (role === "gm") return true;
    if (token.is_locked) return false;
    return token.owner_id === currentUserId;
  };

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const oldScale = viewport.scale;
    const zoomFactor = e.evt.deltaY > 0 ? 1 / 1.15 : 1.15;
    const nextScale = clamp(
      Math.round(oldScale * zoomFactor * 1000) / 1000,
      0.1,
      10
    );

    const worldPoint = screenToWorld(pointer, viewport);
    setViewport({
      scale: nextScale,
      x: pointer.x - worldPoint.x * nextScale,
      y: pointer.y - worldPoint.y * nextScale,
    });
  };

  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;

    const isMiddleClick = e.evt.button === 1;
    const isRightClick = e.evt.button === 2;
    const isLeftClick = e.evt.button === 0;
    const wantPan = isMiddleClick || (isLeftClick && (spaceDown || tool === "pan"));

    if (isRightClick || (isLeftClick && tool === "pointer")) {
      e.evt.preventDefault();
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const worldPt = screenToWorld(pointer, viewport);
      setLocalPointer(worldPt);
      onPointerBroadcast?.(worldPt, true);
      return;
    }

    if (wantPan) {
      e.evt.preventDefault();
      setIsPanning(true);
      panStartRef.current = {
        x: e.evt.clientX,
        y: e.evt.clientY,
        vx: viewport.x,
        vy: viewport.y,
      };
      return;
    }

    if (isLeftClick && tool === "ruler") {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const worldPt = screenToWorld(pointer, viewport);
      setLocalRuler({ start: worldPt, end: worldPt });
      onRulerBroadcast?.(worldPt, worldPt, true);
      return;
    }

    if (isLeftClick && tool === "draw") {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const worldPt = screenToWorld(pointer, viewport);
      const initial: LocalDrawState = {
        kind: drawConfig.kind,
        x: worldPt.x,
        y: worldPt.y,
        rotation: 0,
        data: {
          points:
            drawConfig.kind === "freehand" || drawConfig.kind === "line"
              ? [0, 0]
              : undefined,
          width: drawConfig.kind === "rect" ? 0 : undefined,
          height: drawConfig.kind === "rect" ? 0 : undefined,
          radius:
            drawConfig.kind === "circle" || drawConfig.kind === "cone"
              ? 0
              : undefined,
          angle: drawConfig.kind === "cone" ? 53 : undefined,
          stroke: drawConfig.stroke,
          fill: drawConfig.fill,
          strokeWidth: drawConfig.strokeWidth,
          opacity: drawConfig.opacity,
        },
      };
      setLocalDraw(initial);
      onDrawPreviewBroadcast?.({ ...initial, active: true });
      return;
    }

    if (isLeftClick && tool === "text") {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const worldPt = screenToWorld(pointer, viewport);
      setTextDraft({ world: worldPt, screen: pointer, value: "" });
      return;
    }

    if (isLeftClick && (tool === "fog" || tool === "darkness") && role === "gm") {
      const activeCoverLayer: "fog" | "darkness" =
        tool === "darkness" ? "darkness" : "fog";
      if (fogToolConfig.mode === "select") {
        if (e.target === stage) {
          setSelectedFogShapeId(null);
        }
        return;
      }
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const worldPt = screenToWorld(pointer, viewport);

      if (fogToolConfig.mode === "polygon") {
        const nextPts = [...fogPolygonPoints, worldPt.x, worldPt.y];
        setFogPolygonPoints(nextPts);
        setLocalFogPreview({
          mode: "polygon",
          operation: fogToolConfig.operation,
          layer: activeCoverLayer,
          points: nextPts,
        });
      } else {
        const g = Math.max(scene.grid_size || 70, 10);
        const ox = scene.grid_offset_x ?? 0;
        const oy = scene.grid_offset_y ?? 0;
        const snappedStart =
          fogToolConfig.mode === "rect" && fogToolConfig.snapToGrid && !altDown
            ? {
              x: Math.floor((worldPt.x - ox) / g) * g + ox,
              y: Math.floor((worldPt.y - oy) / g) * g + oy,
            }
            : worldPt;
        setLocalFogPreview({
          mode: fogToolConfig.mode,
          operation: fogToolConfig.operation,
          layer: activeCoverLayer,
          start: snappedStart,
          end:
            fogToolConfig.mode === "rect" && fogToolConfig.snapToGrid && !altDown
              ? { x: snappedStart.x + g, y: snappedStart.y + g }
              : worldPt,
        });
      }
      return;
    }

    if (isLeftClick && tool === "weather" && role === "gm") {
      if (weatherToolConfig.mode === "select") {
        if (e.target === stage) {
          setSelectedElementId(null);
          setWeatherSelectedIds([]);
        }
        return;
      }
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const worldPt = screenToWorld(pointer, viewport);
      const g = Math.max(scene.grid_size || 70, 10);
      const ox = scene.grid_offset_x ?? 0;
      const oy = scene.grid_offset_y ?? 0;
      const snappedStart =
        !altDown
          ? {
            x: Math.floor((worldPt.x - ox) / g) * g + ox,
            y: Math.floor((worldPt.y - oy) / g) * g + oy,
          }
          : worldPt;
      setLocalWeatherPreview({
        start: snappedStart,
        end: !altDown
          ? { x: snappedStart.x + g, y: snappedStart.y + g }
          : worldPt,
      });
      return;
    }

    if (isLeftClick && tool === "wall" && role === "gm") {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const worldPt = screenToWorld(pointer, viewport);
      setLocalWall({
        x1: worldPt.x,
        y1: worldPt.y,
        x2: worldPt.x,
        y2: worldPt.y,
        wallType: wallToolType,
      });
      return;
    }

    if (e.target === stage) {
      setSelectedTokenId(null);
      setSelectedElementId(null);
    }
  };

  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (isPanning && panStartRef.current) {
      const dx = e.evt.clientX - panStartRef.current.x;
      const dy = e.evt.clientY - panStartRef.current.y;
      setViewport({
        ...viewport,
        x: panStartRef.current.vx + dx,
        y: panStartRef.current.vy + dy,
      });
      return;
    }

    if (localPointer) {
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const worldPt = screenToWorld(pointer, viewport);
      setLocalPointer(worldPt);
      onPointerBroadcast?.(worldPt, true);
      return;
    }

    if (localFogPreview && localFogPreview.mode !== "polygon") {
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const worldPt = screenToWorld(pointer, viewport);
      if (
        localFogPreview.mode === "rect" &&
        fogToolConfig.snapToGrid &&
        !altDown &&
        localFogPreview.start
      ) {
        const g = Math.max(scene.grid_size || 70, 10);
        const ox = scene.grid_offset_x ?? 0;
        const oy = scene.grid_offset_y ?? 0;
        const rawEndX =
          worldPt.x >= localFogPreview.start.x
            ? Math.ceil((worldPt.x - ox) / g) * g + ox
            : Math.floor((worldPt.x - ox) / g) * g + ox;
        const rawEndY =
          worldPt.y >= localFogPreview.start.y
            ? Math.ceil((worldPt.y - oy) / g) * g + oy
            : Math.floor((worldPt.y - oy) / g) * g + oy;
        const snappedEnd = {
          x:
            rawEndX === localFogPreview.start.x
              ? localFogPreview.start.x + g
              : rawEndX,
          y:
            rawEndY === localFogPreview.start.y
              ? localFogPreview.start.y + g
              : rawEndY,
        };
        setLocalFogPreview((prev) => (prev ? { ...prev, end: snappedEnd } : null));
        return;
      }
      setLocalFogPreview((prev) => (prev ? { ...prev, end: worldPt } : null));
      return;
    }

    if (localWeatherPreview) {
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const worldPt = screenToWorld(pointer, viewport);
      if (!altDown) {
        const g = Math.max(scene.grid_size || 70, 10);
        const ox = scene.grid_offset_x ?? 0;
        const oy = scene.grid_offset_y ?? 0;
        const rawEndX =
          worldPt.x >= localWeatherPreview.start.x
            ? Math.ceil((worldPt.x - ox) / g) * g + ox
            : Math.floor((worldPt.x - ox) / g) * g + ox;
        const rawEndY =
          worldPt.y >= localWeatherPreview.start.y
            ? Math.ceil((worldPt.y - oy) / g) * g + oy
            : Math.floor((worldPt.y - oy) / g) * g + oy;
        setLocalWeatherPreview((prev) =>
          prev
            ? {
              ...prev,
              end: {
                x:
                  rawEndX === prev.start.x ? prev.start.x + g : rawEndX,
                y:
                  rawEndY === prev.start.y ? prev.start.y + g : rawEndY,
              },
            }
            : null
        );
        return;
      }
      setLocalWeatherPreview((prev) => (prev ? { ...prev, end: worldPt } : null));
      return;
    }

    if (localWall) {
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const worldPt = screenToWorld(pointer, viewport);
      setLocalWall((prev) =>
        prev ? { ...prev, x2: worldPt.x, y2: worldPt.y } : null
      );
      return;
    }

    if (localDraw) {
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const worldPt = screenToWorld(pointer, viewport);
      const dx = worldPt.x - localDraw.x;
      const dy = worldPt.y - localDraw.y;

      let nextDraw: LocalDrawState = localDraw;
      if (localDraw.kind === "freehand") {
        nextDraw = {
          ...localDraw,
          data: {
            ...localDraw.data,
            points: [...(localDraw.data.points ?? [0, 0]), dx, dy],
          },
        };
      } else if (localDraw.kind === "line") {
        nextDraw = {
          ...localDraw,
          data: { ...localDraw.data, points: [0, 0, dx, dy] },
        };
      } else if (localDraw.kind === "rect") {
        nextDraw = {
          ...localDraw,
          data: { ...localDraw.data, width: dx, height: dy },
        };
      } else if (localDraw.kind === "circle") {
        nextDraw = {
          ...localDraw,
          data: { ...localDraw.data, radius: Math.hypot(dx, dy) },
        };
      } else if (localDraw.kind === "cone") {
        nextDraw = {
          ...localDraw,
          rotation: (Math.atan2(dy, dx) * 180) / Math.PI,
          data: { ...localDraw.data, radius: Math.hypot(dx, dy) },
        };
      }

      setLocalDraw(nextDraw);
      onDrawPreviewBroadcast?.({ ...nextDraw, active: true });
      return;
    }

    if (localRuler) {
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const worldPt = screenToWorld(pointer, viewport);
      setLocalRuler((prev) => (prev ? { ...prev, end: worldPt } : null));
      onRulerBroadcast?.(localRuler.start, worldPt, true);
    }
  };

  const finishInteraction = () => {
    pinchDistRef.current = null;
    if (isPanning) {
      setIsPanning(false);
      panStartRef.current = null;
    }
    if (localPointer) {
      onPointerBroadcast?.(localPointer, false);
      setLocalPointer(null);
    }
    if (localWall) {
      const finishedWall = localWall;
      setLocalWall(null);
      if (
        Math.hypot(
          finishedWall.x2 - finishedWall.x1,
          finishedWall.y2 - finishedWall.y1
        ) > 10
      ) {
        void createSceneWallAction({
          sceneId: scene.id,
          campaignId: scene.campaign_id,
          x1: finishedWall.x1,
          y1: finishedWall.y1,
          x2: finishedWall.x2,
          y2: finishedWall.y2,
          wallType: finishedWall.wallType,
        }).then((res) => {
          if (res.ok && res.wall) {
            upsertWall(res.wall);
          }
        });
      }
    }
    if (localFogPreview && localFogPreview.mode !== "polygon") {
      const finishedFog = localFogPreview;
      setLocalFogPreview(null);
      if (finishedFog.start && finishedFog.end) {
        const dx = finishedFog.end.x - finishedFog.start.x;
        const dy = finishedFog.end.y - finishedFog.start.y;
        if (Math.hypot(dx, dy) > 10) {
          if (finishedFog.mode === "slice") {
            const targetLayer =
              finishedFog.layer ?? fogToolConfig.targetLayer ?? "fog";
            const coverTargets = fogShapes.filter((s) => {
              if (
                s.scene_id !== scene.id ||
                s.operation !== "cover" ||
                (s.shape_kind !== "rect" && s.shape_kind !== "polygon")
              ) {
                return false;
              }
              const d = (s.data ?? {}) as FogShapeData;
              return (d.layer ?? "fog") === targetLayer;
            });
            const deleteIds: string[] = [];
            const newShapes: Array<{
              operation: "cover";
              shapeKind: "polygon";
              data: FogShapeData;
            }> = [];

            for (const target of coverTargets) {
              const d = (target.data ?? {}) as FogShapeData;
              const poly =
                target.shape_kind === "rect"
                  ? rectToFlatPolygon(
                    d.x ?? 0,
                    d.y ?? 0,
                    d.width ?? 0,
                    d.height ?? 0
                  )
                  : (d.points ?? []);
              const sliced = slicePolygonByLine(
                poly,
                finishedFog.start,
                finishedFog.end
              );
              if (sliced) {
                deleteIds.push(target.id);
                newShapes.push(
                  {
                    operation: "cover",
                    shapeKind: "polygon",
                    data: { points: sliced[0], layer: targetLayer },
                  },
                  {
                    operation: "cover",
                    shapeKind: "polygon",
                    data: { points: sliced[1], layer: targetLayer },
                  }
                );
              }
            }

            if (deleteIds.length > 0) {
              deleteIds.forEach((id) => removeFogShape(id));
              void replaceFogShapesAction({
                sceneId: scene.id,
                campaignId: scene.campaign_id,
                deleteIds,
                newShapes,
              }).then((res) => {
                if (res.ok && res.shapes) {
                  res.shapes.forEach((sh) => upsertFogShape(sh));
                }
              });
            }
          } else {
            const shapeKind = finishedFog.mode === "circle" ? "circle" : "rect";
            const targetLayer =
              finishedFog.layer ?? (tool === "darkness" ? "darkness" : "fog");
            const ensureTargetLayerVisible = () => {
              if (targetLayer === "fog") {
                if (!scene.fog_enabled) {
                  upsertScene({ ...scene, fog_enabled: true });
                  void updateSceneFogSettingsAction({
                    sceneId: scene.id,
                    campaignId: scene.campaign_id,
                    fogEnabled: true,
                  });
                }
              } else if ((scene.ambient_light ?? 1) >= 0.99) {
                upsertScene({ ...scene, ambient_light: 0.98 });
                void updateSceneEnvironmentAction({
                  sceneId: scene.id,
                  campaignId: scene.campaign_id,
                  ambientLight: 0.98,
                });
              }
            };

            if (shapeKind === "rect" && finishedFog.operation === "cover") {
              const newRect: FogRect = {
                x: Math.min(finishedFog.start.x, finishedFog.end.x),
                y: Math.min(finishedFog.start.y, finishedFog.end.y),
                width: Math.abs(dx),
                height: Math.abs(dy),
              };
              const sceneRects = fogShapes.filter((s) => {
                if (s.scene_id !== scene.id || s.shape_kind !== "rect") {
                  return false;
                }
                const d = (s.data ?? {}) as FogShapeData;
                return (d.layer ?? "fog") === targetLayer;
              });
              const existingCoverRects = sceneRects
                .filter((s) => s.operation === "cover")
                .map((s) => {
                  const d = (s.data ?? {}) as FogShapeData;
                  return {
                    x: d.x ?? 0,
                    y: d.y ?? 0,
                    width: d.width ?? 0,
                    height: d.height ?? 0,
                  };
                });
              const existingRevealShapes = sceneRects.filter(
                (s) => s.operation === "reveal"
              );
              const existingRevealRects = existingRevealShapes.map((s) => {
                const d = (s.data ?? {}) as FogShapeData;
                return {
                  x: d.x ?? 0,
                  y: d.y ?? 0,
                  width: d.width ?? 0,
                  height: d.height ?? 0,
                };
              });

              const uncoveredPieces = computeNonOverlappingCoverRects(
                newRect,
                existingCoverRects,
                existingRevealRects
              );

              if (uncoveredPieces.length === 0) {
                return;
              }

              const deleteRevealIds: string[] = [];
              const newShapesPayload: Array<{
                operation: "cover" | "reveal";
                shapeKind: "rect";
                data: FogShapeData;
              }> = uncoveredPieces.map((p) => ({
                operation: "cover",
                shapeKind: "rect",
                data: { ...p, layer: targetLayer },
              }));

              for (const rev of existingRevealShapes) {
                const rd = (rev.data ?? {}) as FogShapeData;
                const rr: FogRect = {
                  x: rd.x ?? 0,
                  y: rd.y ?? 0,
                  width: rd.width ?? 0,
                  height: rd.height ?? 0,
                };
                const clipped = subtractFogRect(rr, newRect);
                const unchanged =
                  clipped.length === 1 &&
                  Math.abs(clipped[0]!.x - rr.x) < 1 &&
                  Math.abs(clipped[0]!.y - rr.y) < 1 &&
                  Math.abs(clipped[0]!.width - Math.abs(rr.width)) < 1 &&
                  Math.abs(clipped[0]!.height - Math.abs(rr.height)) < 1;
                if (!unchanged) {
                  deleteRevealIds.push(rev.id);
                  for (const cp of clipped) {
                    newShapesPayload.push({
                      operation: "reveal",
                      shapeKind: "rect",
                      data: { ...cp, layer: targetLayer },
                    });
                  }
                }
              }

              ensureTargetLayerVisible();
              deleteRevealIds.forEach((id) => removeFogShape(id));
              void replaceFogShapesAction({
                sceneId: scene.id,
                campaignId: scene.campaign_id,
                deleteIds: deleteRevealIds,
                newShapes: newShapesPayload,
              }).then((res) => {
                if (res.ok && res.shapes) {
                  res.shapes.forEach((sh) => upsertFogShape(sh));
                }
              });
              return;
            }

            const data: FogShapeData =
              shapeKind === "circle"
                ? {
                  layer: targetLayer,
                  x: finishedFog.start.x,
                  y: finishedFog.start.y,
                  radius: Math.hypot(dx, dy),
                }
                : {
                  layer: targetLayer,
                  x: Math.min(finishedFog.start.x, finishedFog.end.x),
                  y: Math.min(finishedFog.start.y, finishedFog.end.y),
                  width: Math.abs(dx),
                  height: Math.abs(dy),
                };

            ensureTargetLayerVisible();

            void createFogShapeAction({
              sceneId: scene.id,
              campaignId: scene.campaign_id,
              operation: finishedFog.operation,
              shapeKind,
              data,
            }).then((res) => {
              if (res.ok && res.shape) {
                upsertFogShape(res.shape);
              }
            });
          }
        }
      }
    }
    if (localWeatherPreview) {
      const finishedWeather = localWeatherPreview;
      setLocalWeatherPreview(null);
      const dx = finishedWeather.end.x - finishedWeather.start.x;
      const dy = finishedWeather.end.y - finishedWeather.start.y;
      if (Math.hypot(dx, dy) > 10) {
        const wx = Math.min(finishedWeather.start.x, finishedWeather.end.x);
        const wy = Math.min(finishedWeather.start.y, finishedWeather.end.y);
        const ww = Math.abs(dx);
        const wh = Math.abs(dy);
        void createSceneElementAction({
          sceneId: scene.id,
          campaignId: scene.campaign_id,
          layer: "prop",
          kind: "rect",
          x: wx,
          y: wy,
          data: {
            width: ww,
            height: wh,
            stroke: "#38bdf8",
            fill: "#38bdf8",
            strokeWidth: 2,
            opacity: 0.06,
            label: "__weather_zone__",
            zLayer: "above_map",
            weatherPreset: weatherToolConfig.preset,
            weatherIntensity: weatherToolConfig.intensity,
          },
        }).then((res) => {
          if (res.ok && res.element) {
            upsertElement(res.element);
            setSelectedElementId(res.element.id);
            setWeatherToolConfig({ mode: "select" });
          }
        });
      }
    }
    if (localDraw) {
      const finished = localDraw;
      setLocalDraw(null);
      onDrawPreviewBroadcast?.({ ...finished, active: false });

      const pts = finished.data.points ?? [];
      const hasSize =
        finished.kind === "freehand"
          ? pts.length >= 4
          : finished.kind === "line"
            ? Math.hypot(pts[2] ?? 0, pts[3] ?? 0) > 6
            : finished.kind === "rect"
              ? Math.abs(finished.data.width ?? 0) > 6 ||
              Math.abs(finished.data.height ?? 0) > 6
              : (finished.data.radius ?? 0) > 6;

      if (hasSize) {
        void createSceneElementAction({
          sceneId: scene.id,
          campaignId: scene.campaign_id,
          layer: "drawing",
          kind: finished.kind,
          x: finished.x,
          y: finished.y,
          rotation: finished.rotation,
          data: finished.data,
        }).then((res) => {
          if (res.ok && res.element) {
            upsertElement(res.element);
          }
        });
      }
    }
    if (localRuler) {
      const dist = Math.hypot(
        localRuler.end.x - localRuler.start.x,
        localRuler.end.y - localRuler.start.y
      );
      if ((rulerPinMode || shiftDown) && dist > 12) {
        const id = `ruler-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const base = {
          id,
          sceneId: scene.id,
          startX: localRuler.start.x,
          startY: localRuler.start.y,
          endX: localRuler.end.x,
          endY: localRuler.end.y,
        };
        const created = onRulerPinBroadcast?.("add", base) ?? {
          ...base,
          userId: currentUserId,
          username: currentUsername,
          color: "#a855f7",
        };
        addPinnedRuler(created);
      }
      onRulerBroadcast?.(localRuler.start, localRuler.end, false);
      setLocalRuler(null);
    }
  };

  const handleTouchStart = (e: KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;
    const stage = stageRef.current;
    if (!stage) return;

    if (touches.length === 2) {
      const dx = touches[0]!.clientX - touches[1]!.clientX;
      const dy = touches[0]!.clientY - touches[1]!.clientY;
      pinchDistRef.current = Math.hypot(dx, dy);
      setIsPanning(false);
      return;
    }

    if (touches.length === 1) {
      const t = touches[0]!;
      if (tool === "pan") {
        setIsPanning(true);
        panStartRef.current = {
          x: t.clientX,
          y: t.clientY,
          vx: viewport.x,
          vy: viewport.y,
        };
        return;
      }

      if (tool === "ruler") {
        const pointer = stage.getPointerPosition();
        if (!pointer) return;
        const worldPt = screenToWorld(pointer, viewport);
        setLocalRuler({ start: worldPt, end: worldPt });
        onRulerBroadcast?.(worldPt, worldPt, true);
        return;
      }

      if (e.target === stage) {
        setSelectedTokenId(null);
      }
    }
  };

  const handleTouchMove = (e: KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;
    const stage = stageRef.current;
    if (!stage) return;

    if (touches.length === 2 && pinchDistRef.current) {
      e.evt.preventDefault();
      const t0 = touches[0]!;
      const t1 = touches[1]!;
      const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
      const scaleBy = dist / pinchDistRef.current;
      pinchDistRef.current = dist;

      const rect = stage.container().getBoundingClientRect();
      const centerScreen = {
        x: (t0.clientX + t1.clientX) / 2 - rect.left,
        y: (t0.clientY + t1.clientY) / 2 - rect.top,
      };
      const nextScale = clamp(
        Math.round(viewport.scale * scaleBy * 1000) / 1000,
        0.1,
        10
      );
      const worldPoint = screenToWorld(centerScreen, viewport);
      setViewport({
        scale: nextScale,
        x: centerScreen.x - worldPoint.x * nextScale,
        y: centerScreen.y - worldPoint.y * nextScale,
      });
      return;
    }

    if (touches.length === 1) {
      const t = touches[0]!;
      if (isPanning && panStartRef.current) {
        const dx = t.clientX - panStartRef.current.x;
        const dy = t.clientY - panStartRef.current.y;
        setViewport({
          ...viewport,
          x: panStartRef.current.vx + dx,
          y: panStartRef.current.vy + dy,
        });
        return;
      }

      if (localRuler) {
        const pointer = stage.getPointerPosition();
        if (!pointer) return;
        const worldPt = screenToWorld(pointer, viewport);
        setLocalRuler((prev) => (prev ? { ...prev, end: worldPt } : null));
        onRulerBroadcast?.(localRuler.start, worldPt, true);
      }
    }
  };

  const sceneWallSegments = useMemo(
    () =>
      walls
        .filter(
          (w) =>
            w.scene_id === scene.id &&
            (w.wall_type === "wall" || (w.wall_type === "door" && !w.is_open))
        )
        .map((w) => ({ x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 })),
    [walls, scene.id]
  );

  const hasDarknessLayer = useMemo(
    () =>
      (scene.ambient_light ?? 1) < 0.99 ||
      fogShapes.some(
        (s) =>
          s.scene_id === scene.id &&
          s.operation === "cover" &&
          ((s.data as FogShapeData | null)?.layer ?? "fog") === "darkness"
      ),
    [scene.ambient_light, fogShapes, scene.id]
  );

  const maybeRecordExploration = useCallback(
    (tokenId: string, x: number, y: number) => {
      const fogTrail =
        scene.fog_enabled && (scene.fog_reveal_mode ?? "trail") === "trail";
      const darknessTrail =
        hasDarknessLayer &&
        (scene.darkness_reveal_mode ?? "vision") === "trail";
      if (!fogTrail && !darknessTrail) return;

      const tok = renderedTokens.find((t) => t.id === tokenId);
      if (!tok) return;
      const meters = computeTokenRevealMeters(tok, {
        gmUserIds,
        isGm: role === "gm",
        gmPreviewVision,
        selectedTokenId,
      });
      if (meters <= 0) return;

      const g = Math.max(scene.grid_size || 70, 10);
      const mpc = Math.max(scene.meters_per_cell || 1.5, 0.1);
      const radiusPx = Math.max((meters * g) / mpc, g);
      const half = (Math.min(Math.max(tok.size || 1, 1), 4) * g) / 2;
      const cx = x + half;
      const cy = y + half;
      const poly =
        sceneWallSegments.length > 0
          ? computeVisibilityPolygon({ x: cx, y: cy }, radiusPx, sceneWallSegments)
          : undefined;

      const spot = { x: cx, y: cy, radiusPx, poly };
      if (fogTrail) {
        recordExploredSpot(scene.id, spot, g * 0.45, "fog");
      }
      if (darknessTrail) {
        recordExploredSpot(scene.id, spot, g * 0.45, "darkness");
      }
    },
    [
      scene.fog_enabled,
      scene.fog_reveal_mode,
      scene.darkness_reveal_mode,
      scene.id,
      scene.grid_size,
      scene.meters_per_cell,
      hasDarknessLayer,
      renderedTokens,
      gmUserIds,
      role,
      gmPreviewVision,
      selectedTokenId,
      sceneWallSegments,
      recordExploredSpot,
    ]
  );

  // Registra automaticamente posições atuais e movimentos remotos quando o modo 'trail' está ativo
  useEffect(() => {
    const fogTrail =
      scene.fog_enabled && (scene.fog_reveal_mode ?? "trail") === "trail";
    const darknessTrail =
      hasDarknessLayer &&
      (scene.darkness_reveal_mode ?? "vision") === "trail";
    if (!fogTrail && !darknessTrail) return;
    for (const t of renderedTokens) {
      if (t.scene_id !== scene.id) continue;
      maybeRecordExploration(t.id, t.pos_x, t.pos_y);
    }
  }, [
    scene.id,
    scene.fog_enabled,
    scene.fog_reveal_mode,
    scene.darkness_reveal_mode,
    scene.fog_trail_epoch,
    scene.darkness_trail_epoch,
    hasDarknessLayer,
    renderedTokens,
    maybeRecordExploration,
  ]);

  const handleTokenDragStart = (tokenId: string) => {
    setDraggingLocalTokenId(tokenId);
    const token = renderedTokens.find((t) => t.id === tokenId);
    if (token) {
      maybeRecordExploration(tokenId, token.pos_x, token.pos_y);
      const halfSize = (Math.min(Math.max(token.size || 1, 1), 4) * scene.grid_size) / 2;
      const center = {
        x: token.pos_x + halfSize,
        y: token.pos_y + halfSize,
      };
      tokenDragCenterRef.current = { origin: center, halfSize };
      setTokenDragRuler({ start: center, end: center });
    }
  };

  const handleTokenDragMove = (tokenId: string, x: number, y: number) => {
    setLocalTokenDragPos({ tokenId, x, y });
    maybeRecordExploration(tokenId, x, y);
    if (tokenDragCenterRef.current) {
      const { origin, halfSize } = tokenDragCenterRef.current;
      setTokenDragRuler({
        start: origin,
        end: { x: x + halfSize, y: y + halfSize },
      });
    }
    onTokenDragBroadcast?.(tokenId, x, y);
  };

  const handleTokenDragEnd = (tokenId: string, x: number, y: number) => {
    maybeRecordExploration(tokenId, x, y);
    setDraggingLocalTokenId(null);
    setLocalTokenDragPos(null);
    tokenDragCenterRef.current = null;
    setTokenDragRuler(null);

    const existing = tokens.find((t) => t.id === tokenId);
    const prevX = existing?.pos_x ?? x;
    const prevY = existing?.pos_y ?? y;
    if (existing) {
      upsertToken({
        ...existing,
        pos_x: x,
        pos_y: y,
        updated_at: new Date().toISOString(),
      });
    }
    onTokenDragCommit?.(tokenId, x, y, prevX, prevY);
  };

  const createTokenFromFile = async (file: File, worldPt: Point2D) => {
    try {
      const uploaded = await uploadCampaignImage({
        bucket: "tokens",
        campaignId: scene.campaign_id,
        file,
      });
      const baseName =
        file.name.replace(/\.[^.]+$/, "").slice(0, 40) || "Token";
      const snappedPos = snapToGrid(
        {
          x: worldPt.x - scene.grid_size / 2,
          y: worldPt.y - scene.grid_size / 2,
        },
        scene.grid_size,
        scene.snap_to_grid,
        scene.grid_offset_x ?? 0,
        scene.grid_offset_y ?? 0,
        scene.grid_type ?? "square"
      );
      const res = await createTokenAction({
        sceneId: scene.id,
        campaignId: scene.campaign_id,
        name: baseName,
        imageUrl: uploaded.publicUrl,
        size: 1,
        hpCurrent: 20,
        hpMax: 20,
        posX: snappedPos.x,
        posY: snappedPos.y,
        visionRange: 4.5,
      });
      if (res.ok && res.token) {
        upsertToken(res.token);
        setSelectedTokenId(res.token.id);
      }
    } catch {
      // Silencioso se o formato ou permissão falhar
    }
  };

  const handleUploadMapProp = async (file: File, worldPt?: Point2D) => {
    if (role !== "gm") return;
    try {
      const uploaded = await uploadCampaignImage({
        bucket: "maps",
        campaignId: scene.campaign_id,
        file,
      });
      const g = Math.max(scene.grid_size || 70, 20);
      const cellsW = Math.min(
        Math.max(Math.round(uploaded.width / g), 2),
        16
      );
      const propW = cellsW * g;
      const ratio = uploaded.height / Math.max(uploaded.width, 1);
      const propH = Math.max(g, Math.round((propW * ratio) / g) * g);
      const targetCenter =
        worldPt ??
        screenToWorld(
          { x: size.width / 2, y: size.height / 2 },
          viewport
        );
      const snappedPos = snapToGrid(
        { x: targetCenter.x - propW / 2, y: targetCenter.y - propH / 2 },
        g,
        scene.snap_to_grid,
        scene.grid_offset_x ?? 0,
        scene.grid_offset_y ?? 0,
        scene.grid_type ?? "square"
      );

      const res = await createSceneElementAction({
        sceneId: scene.id,
        campaignId: scene.campaign_id,
        layer: "prop",
        kind: "image",
        x: snappedPos.x,
        y: snappedPos.y,
        data: {
          imageUrl: uploaded.publicUrl,
          width: propW,
          height: propH,
          opacity: 1,
          label: file.name.replace(/\.[^.]+$/, "").slice(0, 40),
        },
      });
      if (res.ok && res.element) {
        upsertElement(res.element);
        setTool("select");
        setSelectedElementId(res.element.id);
      }
    } catch {
      // Silencioso se formato/tamanho exceder
    }
  };

  const handleUploadMultipleMapProps = async (files: File[]) => {
    if (role !== "gm" || files.length === 0) return;
    const g = Math.max(scene.grid_size || 70, 20);
    const center = screenToWorld(
      { x: size.width / 2, y: size.height / 2 },
      viewport
    );
    let cursorX = snapToGrid(
      { x: center.x - g * 3, y: center.y - g * 3 },
      g,
      scene.snap_to_grid,
      scene.grid_offset_x ?? 0,
      scene.grid_offset_y ?? 0,
      scene.grid_type ?? "square"
    ).x;
    const baseY = snapToGrid(
      { x: center.x - g * 3, y: center.y - g * 3 },
      g,
      scene.snap_to_grid,
      scene.grid_offset_x ?? 0,
      scene.grid_offset_y ?? 0,
      scene.grid_type ?? "square"
    ).y;

    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      try {
        const uploaded = await uploadCampaignImage({
          bucket: "maps",
          campaignId: scene.campaign_id,
          file,
        });
        const cellsW = Math.min(Math.max(Math.round(uploaded.width / g), 2), 16);
        const propW = cellsW * g;
        const ratio = uploaded.height / Math.max(uploaded.width, 1);
        const propH = Math.max(g, Math.round((propW * ratio) / g) * g);
        const res = await createSceneElementAction({
          sceneId: scene.id,
          campaignId: scene.campaign_id,
          layer: "prop",
          kind: "image",
          x: cursorX,
          y: baseY,
          data: {
            imageUrl: uploaded.publicUrl,
            width: propW,
            height: propH,
            opacity: 1,
            label: file.name.replace(/\.[^.]+$/, "").slice(0, 40),
          },
        });
        if (res.ok && res.element) {
          upsertElement(res.element);
          setTool("select");
          setSelectedElementId(res.element.id);
        }
        cursorX += propW;
      } catch {
        // continua para os próximos arquivos
      }
    }
  };

  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOverFile(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const screenPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPt = screenToWorld(screenPt, viewport);

    if (role === "gm") {
      setPendingDrop({ file, world: worldPt, screen: screenPt });
      return;
    }

    await createTokenFromFile(file, worldPt);
  };

  const submitTextDraft = () => {
    if (!textDraft) return;
    const content = textDraft.value.trim();
    const world = textDraft.world;
    setTextDraft(null);
    if (!content) return;

    void createSceneElementAction({
      sceneId: scene.id,
      campaignId: scene.campaign_id,
      layer: "text",
      kind: "text",
      x: world.x,
      y: world.y,
      data: {
        text: content,
        stroke: drawConfig.stroke,
        fontSize: 18,
      },
    }).then((res) => {
      if (res.ok && res.element) {
        upsertElement(res.element);
      }
    });
  };

  const finishFogPolygon = () => {
    if (role !== "gm" || fogPolygonPoints.length < 6) {
      setFogPolygonPoints([]);
      setLocalFogPreview(null);
      return;
    }
    const pts = fogPolygonPoints;
    const op = fogToolConfig.operation;
    const targetLayer: "fog" | "darkness" =
      tool === "darkness" ? "darkness" : "fog";
    setFogPolygonPoints([]);
    setLocalFogPreview(null);

    if (targetLayer === "fog") {
      if (!scene.fog_enabled) {
        upsertScene({ ...scene, fog_enabled: true });
        void updateSceneFogSettingsAction({
          sceneId: scene.id,
          campaignId: scene.campaign_id,
          fogEnabled: true,
        });
      }
    } else if ((scene.ambient_light ?? 1) >= 0.99) {
      upsertScene({ ...scene, ambient_light: 0.98 });
      void updateSceneEnvironmentAction({
        sceneId: scene.id,
        campaignId: scene.campaign_id,
        ambientLight: 0.98,
      });
    }

    void createFogShapeAction({
      sceneId: scene.id,
      campaignId: scene.campaign_id,
      operation: op,
      shapeKind: "polygon",
      data: { points: pts, layer: targetLayer },
    }).then((res) => {
      if (res.ok && res.shape) {
        upsertFogShape(res.shape);
      }
    });
  };

  const handleToggleFogEnabled = (enabled: boolean) => {
    if (role !== "gm") return;
    upsertScene({ ...scene, fog_enabled: enabled });
    void updateSceneFogSettingsAction({
      sceneId: scene.id,
      campaignId: scene.campaign_id,
      fogEnabled: enabled,
    });
  };

  const handleChangeFogMode = (fogMode: Scene["fog_mode"]) => {
    if (role !== "gm") return;
    upsertScene({ ...scene, fog_mode: fogMode });
    void updateSceneFogSettingsAction({
      sceneId: scene.id,
      campaignId: scene.campaign_id,
      fogEnabled: scene.fog_enabled,
      fogMode,
    });
  };

  const resetTrail = (layer: "fog" | "darkness") => {
    clearExploredMemory(scene.id, layer);
    if (role !== "gm") return;
    const epochKey =
      layer === "fog" ? "fog_trail_epoch" : "darkness_trail_epoch";
    upsertScene({ ...scene, [epochKey]: (scene[epochKey] ?? 0) + 1 });
    void resetSceneTrailAction({
      sceneId: scene.id,
      campaignId: scene.campaign_id,
      layer,
    });
  };

  const handleChangeFogRevealMode = (fogRevealMode: RevealMode) => {
    if (role !== "gm") return;
    upsertScene({ ...scene, fog_reveal_mode: fogRevealMode });
    if (fogRevealMode === "vision") {
      resetTrail("fog");
    }
    void updateSceneFogSettingsAction({
      sceneId: scene.id,
      campaignId: scene.campaign_id,
      fogEnabled: scene.fog_enabled,
      fogRevealMode,
    });
  };

  const handleChangeDarknessRevealMode = (darknessRevealMode: RevealMode) => {
    if (role !== "gm") return;
    upsertScene({ ...scene, darkness_reveal_mode: darknessRevealMode });
    if (darknessRevealMode === "vision") {
      resetTrail("darkness");
    }
    void updateSceneEnvironmentAction({
      sceneId: scene.id,
      campaignId: scene.campaign_id,
      darknessRevealMode,
    });
  };

  const { hex: fogHex, opacity: sceneFogOpacity } = parseFogColor(
    scene.fog_color
  );
  const fogSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const envSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (role !== "gm") return;
    try {
      const saved = window.localStorage.getItem("buddyrpg:gmFogOpacity");
      if (saved !== null) {
        const num = Number(saved);
        if (Number.isFinite(num)) setGmFogOpacity(num);
      }
    } catch {
      // ignora erro de acesso ao localStorage
    }
  }, [role, setGmFogOpacity]);

  useEffect(() => {
    if (role !== "gm") return;
    try {
      window.localStorage.setItem("buddyrpg:gmFogOpacity", String(gmFogOpacity));
    } catch {
      // ignora erro de acesso ao localStorage
    }
  }, [role, gmFogOpacity]);

  useEffect(() => {
    return () => {
      if (fogSaveTimerRef.current) clearTimeout(fogSaveTimerRef.current);
      if (envSaveTimerRef.current) clearTimeout(envSaveTimerRef.current);
    };
  }, []);

  const handleChangeFogIntensity = (opacity: number) => {
    if (role !== "gm") return;
    const nextFogColor = formatFogColor(fogHex, opacity);
    upsertScene({ ...scene, fog_color: nextFogColor });
    if (fogSaveTimerRef.current) clearTimeout(fogSaveTimerRef.current);
    const targetSceneId = scene.id;
    const targetCampaignId = scene.campaign_id;
    const targetFogEnabled = scene.fog_enabled;
    const targetFogMode = scene.fog_mode;
    fogSaveTimerRef.current = setTimeout(() => {
      void updateSceneFogSettingsAction({
        sceneId: targetSceneId,
        campaignId: targetCampaignId,
        fogEnabled: targetFogEnabled,
        fogMode: targetFogMode,
        fogColor: nextFogColor,
      });
    }, 220);
  };

  const handleDeleteSelectedFogShape = () => {
    if (role !== "gm" || !selectedFogShapeId) return;
    const targetId = selectedFogShapeId;
    removeFogShape(targetId);
    void deleteFogShapeAction({ shapeId: targetId });
  };

  useEffect(() => {
    if (
      role !== "gm" ||
      (tool !== "fog" && tool !== "darkness") ||
      !selectedFogShapeId
    ) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        const targetId = selectedFogShapeId;
        removeFogShape(targetId);
        void deleteFogShapeAction({ shapeId: targetId });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [role, tool, selectedFogShapeId, removeFogShape]);

  const handleChangeAmbientLight = (light: number) => {
    if (role !== "gm") return;
    upsertScene({ ...scene, ambient_light: light });
    if (envSaveTimerRef.current) clearTimeout(envSaveTimerRef.current);
    const targetSceneId = scene.id;
    const targetCampaignId = scene.campaign_id;
    envSaveTimerRef.current = setTimeout(() => {
      void updateSceneEnvironmentAction({
        sceneId: targetSceneId,
        campaignId: targetCampaignId,
        ambientLight: light,
      });
    }, 200);
  };

  const canSelectElements =
    (tool === "select" ||
      (tool === "weather" && weatherToolConfig.mode === "select")) &&
    !spaceDown;

  const sharedElementsProps = {
    elements,
    tokens: renderedTokens,
    remoteTokenDrags,
    localTokenDragPos,
    sceneId: scene.id,
    currentUserId,
    isGm: role === "gm",
    canSelect: canSelectElements,
    weatherToolActive: tool === "weather",
    selectedElementId,
    weatherSelectedIds,
    gridSize: scene.grid_size,
    gridOffsetX: scene.grid_offset_x ?? 0,
    gridOffsetY: scene.grid_offset_y ?? 0,
    gridType: scene.grid_type ?? "square",
    snapEnabled: scene.snap_to_grid,
    onSelectElement: (id: string | null, multi?: boolean) => {
      if (!id) {
        setSelectedElementId(null);
        if (tool === "weather") setWeatherSelectedIds([]);
        return;
      }
      if (tool === "weather") {
        if (multi) {
          toggleWeatherSelectedId(id);
        } else {
          setWeatherSelectedIds([id]);
        }
      }
      setSelectedTokenId(null);
      setSelectedElementId(id);
    },
    onMoveElement: (elId: string, nx: number, ny: number) => {
      const cur = elements.find((x) => x.id === elId);
      if (cur) upsertElement({ ...cur, x: nx, y: ny });
      void updateSceneElementAction({
        elementId: elId,
        campaignId: scene.campaign_id,
        x: nx,
        y: ny,
      });
    },
    onTransformElement: (
      elId: string,
      patch: { x: number; y: number; rotation: number; data: SceneElementData }
    ) => {
      const cur = elements.find((x) => x.id === elId);
      if (cur) {
        upsertElement({
          ...cur,
          x: patch.x,
          y: patch.y,
          rotation: patch.rotation,
          data: patch.data as unknown as Json,
        });
      }
      void updateSceneElementAction({
        elementId: elId,
        campaignId: scene.campaign_id,
        x: patch.x,
        y: patch.y,
        rotation: patch.rotation,
        data: patch.data,
      });
    },
  };

  const handleCoverAllLayer = (layer: "fog" | "darkness") => {
    if (role !== "gm") return;
    const existingIds = fogShapes
      .filter(
        (s) =>
          s.scene_id === scene.id &&
          ((s.data as FogShapeData | null)?.layer ?? "fog") === layer
      )
      .map((s) => s.id);
    existingIds.forEach((id) => removeFogShape(id));
    resetTrail(layer);

    if (layer === "fog") {
      upsertScene({ ...scene, fog_enabled: true });
      void updateSceneFogSettingsAction({
        sceneId: scene.id,
        campaignId: scene.campaign_id,
        fogEnabled: true,
      });
    } else if ((scene.ambient_light ?? 1) >= 0.99) {
      upsertScene({ ...scene, ambient_light: 0.98 });
      void updateSceneEnvironmentAction({
        sceneId: scene.id,
        campaignId: scene.campaign_id,
        ambientLight: 0.98,
      });
    }

    void replaceFogShapesAction({
      sceneId: scene.id,
      campaignId: scene.campaign_id,
      deleteIds: existingIds,
      newShapes: [
        {
          operation: "cover",
          shapeKind: "rect",
          data: {
            layer,
            x: 0,
            y: 0,
            width: scene.map_width || 2000,
            height: scene.map_height || 2000,
          },
        },
      ],
    }).then((res) => {
      if (res.ok && res.shapes) {
        res.shapes.forEach((sh) => upsertFogShape(sh));
      }
    });
  };

  const handleClearAllLayer = (layer: "fog" | "darkness") => {
    if (role !== "gm") return;
    setFogPolygonPoints([]);
    setLocalFogPreview(null);
    setSelectedFogShapeId(null);
    resetTrail(layer);
    const layerIds = fogShapes
      .filter(
        (s) =>
          s.scene_id === scene.id &&
          ((s.data as FogShapeData | null)?.layer ?? "fog") === layer
      )
      .map((s) => s.id);
    if (layerIds.length === 0) return;
    layerIds.forEach((id) => removeFogShape(id));
    void replaceFogShapesAction({
      sceneId: scene.id,
      campaignId: scene.campaign_id,
      deleteIds: layerIds,
      newShapes: [],
    });
  };

  const selectedElement =
    elements.find((el) => el.id === selectedElementId) ?? null;

  useEffect(() => {
    if (!selectedElement) return;
    const canDelete =
      role === "gm" ||
      (selectedElement.created_by === currentUserId &&
        !selectedElement.is_locked);
    if (!canDelete) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        const elId = selectedElement.id;
        removeElement(elId);
        void deleteSceneElementAction({ elementId: elId });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedElement, role, currentUserId, removeElement]);

  const cursorClass =
    isPanning
      ? "cursor-grabbing"
      : spaceDown || tool === "pan"
        ? "cursor-grab"
        : tool === "ruler" ||
          tool === "pointer" ||
          tool === "draw" ||
          tool === "text" ||
          tool === "fog" ||
          tool === "darkness" ||
          (tool === "weather" && weatherToolConfig.mode === "draw") ||
          tool === "wall"
          ? "cursor-crosshair"
          : "cursor-default";

  return (
    <div
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setIsDragOverFile(true);
        }
      }}
      onDragLeave={() => setIsDragOverFile(false)}
      onDrop={handleFileDrop}
      className={`relative h-full w-full touch-none overflow-hidden bg-zinc-950 select-none ${cursorClass}`}
    >
      {!uiHidden ? (
        <>
          <BoardToolbar
            scene={scene}
            isGm={role === "gm"}
            onSyncView={onSyncView}
            onQuickRoll={onQuickRoll}
            onBroadcastMusicState={onBroadcastMusicState}
            onUploadMapProps={(files) => {
              void handleUploadMultipleMapProps(files);
            }}
            onPlaceVfxProp={(vfxUrl, label, defaultCells) => {
              if (role !== "gm") return;
              const centerX =
                (-viewport.x + size.width / 2) / viewport.scale;
              const centerY =
                (-viewport.y + size.height / 2) / viewport.scale;
              const dim = Math.round(scene.grid_size * defaultCells);
              void createSceneElementAction({
                sceneId: scene.id,
                campaignId: scene.campaign_id,
                layer: "prop",
                kind: "image",
                x: Math.round(centerX - dim / 2),
                y: Math.round(centerY - dim / 2),
                data: {
                  imageUrl: vfxUrl,
                  width: dim,
                  height: dim,
                  opacity: 1,
                  label,
                  zLayer: "above_tokens",
                },
              }).then((res) => {
                if (res.ok && res.element) {
                  upsertElement(res.element);
                  setSelectedElementId(res.element.id);
                }
              });
            }}
            onPlaceProp={({ imageUrl, label, cols, rows, zLayer }) => {
              if (role !== "gm") return;
              const g = Math.max(scene.grid_size || 70, 20);
              const centerX =
                (-viewport.x + size.width / 2) / viewport.scale;
              const centerY =
                (-viewport.y + size.height / 2) / viewport.scale;
              const w = Math.round(cols * g);
              const h = Math.round(rows * g);
              const snapped = snapToGrid(
                { x: centerX - w / 2, y: centerY - h / 2 },
                g,
                scene.snap_to_grid,
                scene.grid_offset_x ?? 0,
                scene.grid_offset_y ?? 0,
                scene.grid_type ?? "square"
              );
              void createSceneElementAction({
                sceneId: scene.id,
                campaignId: scene.campaign_id,
                layer: "prop",
                kind: "image",
                x: snapped.x,
                y: snapped.y,
                data: {
                  imageUrl,
                  width: w,
                  height: h,
                  opacity: 1,
                  label,
                  zLayer: zLayer ?? "above_map",
                },
              }).then((res) => {
                if (res.ok && res.element) {
                  upsertElement(res.element);
                  setSelectedElementId(res.element.id);
                  setTool("select");
                }
              });
            }}
            onPlaceMapPiece={({ url, title, cols, rows }) => {
              if (role !== "gm") return;
              const g = Math.max(scene.grid_size || 70, 20);
              const existingProps = elements.filter(
                (el) =>
                  el.scene_id === scene.id &&
                  el.layer === "prop" &&
                  el.kind === "image"
              );
              let rawX = 0;
              if (existingProps.length > 0) {
                rawX = Math.max(
                  ...existingProps.map(
                    (el) =>
                      el.x + ((el.data as SceneElementData)?.width ?? 280)
                  )
                );
              } else if (scene.map_url) {
                rawX = scene.map_width || 0;
              }
              const placeX = Math.round(rawX / g) * g;
              void createSceneElementAction({
                sceneId: scene.id,
                campaignId: scene.campaign_id,
                layer: "prop",
                kind: "image",
                x: placeX,
                y: 0,
                data: {
                  imageUrl: url,
                  width: cols * g,
                  height: rows * g,
                  opacity: 1,
                  label: title,
                  zLayer: "above_map",
                },
              }).then((res) => {
                if (res.ok && res.element) {
                  upsertElement(res.element);
                  setSelectedElementId(res.element.id);
                  setTool("select");
                  setViewport({
                    ...viewport,
                    x: Math.round(80 - placeX * viewport.scale),
                    y: 80,
                  });
                }
              });
            }}
            onPlaceToken={({ name, imageUrl, size: tokenSize }) => {
              if (role !== "gm") return;
              const g = Math.max(scene.grid_size || 70, 20);
              const centerX =
                (-viewport.x + size.width / 2) / viewport.scale;
              const centerY =
                (-viewport.y + size.height / 2) / viewport.scale;
              const snapped = snapToGrid(
                { x: centerX - g / 2, y: centerY - g / 2 },
                g,
                scene.snap_to_grid,
                scene.grid_offset_x ?? 0,
                scene.grid_offset_y ?? 0,
                scene.grid_type ?? "square"
              );
              void createTokenAction({
                sceneId: scene.id,
                campaignId: scene.campaign_id,
                name,
                imageUrl,
                size: tokenSize,
                hpCurrent: 20,
                hpMax: 20,
                posX: snapped.x,
                posY: snapped.y,
                visionRange: 4.5,
              }).then((res) => {
                if (res.ok && res.token) {
                  upsertToken(res.token);
                  setSelectedTokenId(res.token.id);
                  setTool("select");
                }
              });
            }}
            onOpenSceneManager={onOpenSceneManager}
            onClearPinnedRulers={() => {
              clearPinnedRulers(scene.id);
              onRulerPinBroadcast?.("clear");
            }}
          />
          <DrawingSubToolbar
            sceneId={scene.id}
            gridSize={scene.grid_size}
            sceneTokens={sceneTokens}
            selectedElement={selectedElement}
            isGm={role === "gm"}
            currentUserId={currentUserId}
            onClearDrawings={(sid) => {
              clearDrawingsForScene(sid);
              void clearSceneDrawingsAction({ sceneId: sid });
            }}
            onDeleteElement={(elId) => {
              removeElement(elId);
              void deleteSceneElementAction({ elementId: elId });
            }}
            onUploadMapProp={(file) => {
              void handleUploadMapProp(file);
            }}
            onUpdateElement={(elId, patch) => {
              const current = elements.find((x) => x.id === elId);
              if (current) {
                upsertElement({
                  ...current,
                  ...(patch.attachedToTokenId !== undefined
                    ? { attached_to_token_id: patch.attachedToTokenId }
                    : {}),
                  ...(patch.isLocked !== undefined
                    ? { is_locked: patch.isLocked }
                    : {}),
                  ...(patch.rotation !== undefined
                    ? { rotation: patch.rotation }
                    : {}),
                  ...(patch.data !== undefined
                    ? { data: patch.data as unknown as Json }
                    : {}),
                });
              }
              void updateSceneElementAction({
                elementId: elId,
                campaignId: scene.campaign_id,
                ...patch,
              });
            }}
          />
          <FogSubToolbar
            scene={scene}
            isGm={role === "gm"}
            polygonPointCount={fogPolygonPoints.length}
            fogIntensity={sceneFogOpacity}
            exploredCount={(exploredMemory[scene.id] ?? []).length}
            darknessExploredCount={(exploredDarknessMemory[scene.id] ?? []).length}
            onFinishPolygon={finishFogPolygon}
            onToggleFogEnabled={handleToggleFogEnabled}
            onChangeFogMode={handleChangeFogMode}
            onChangeFogRevealMode={handleChangeFogRevealMode}
            onChangeDarknessRevealMode={handleChangeDarknessRevealMode}
            onChangeFogIntensity={handleChangeFogIntensity}
            onChangeAmbientLight={handleChangeAmbientLight}
            onDeleteSelectedShape={handleDeleteSelectedFogShape}
            onResetExplored={(layer) => resetTrail(layer)}
            onCoverAllLayer={handleCoverAllLayer}
            onClearAllLayer={handleClearAllLayer}
          />
          <WeatherSubToolbar
            scene={scene}
            isGm={role === "gm"}
            sceneProps={elements.filter(
              (el) =>
                el.scene_id === scene.id &&
                el.layer === "prop" &&
                (el.kind === "image" || el.kind === "rect")
            )}
            selectedElement={selectedElement}
            onSelectElement={setSelectedElementId}
            onDeleteElement={(elId) => {
              removeElement(elId);
              void deleteSceneElementAction({ elementId: elId });
            }}
            onUpdateSceneWeather={(patch) => {
              upsertScene({
                ...scene,
                ...(patch.weatherPreset !== undefined
                  ? { weather_preset: patch.weatherPreset }
                  : {}),
                ...(patch.weatherIntensity !== undefined
                  ? { weather_intensity: patch.weatherIntensity }
                  : {}),
              });
              if (envSaveTimerRef.current) clearTimeout(envSaveTimerRef.current);
              const targetSceneId = scene.id;
              const targetCampaignId = scene.campaign_id;
              envSaveTimerRef.current = setTimeout(() => {
                void updateSceneEnvironmentAction({
                  sceneId: targetSceneId,
                  campaignId: targetCampaignId,
                  ...patch,
                });
              }, 200);
            }}
            onUpdateElementsWeather={(elementIds, patch) => {
              for (const elId of elementIds) {
                const cur = elements.find((x) => x.id === elId);
                if (!cur) continue;
                const curData = (cur.data ?? {}) as SceneElementData;
                const nextData: SceneElementData = {
                  ...curData,
                  weatherPreset: patch.weatherPreset ?? curData.weatherPreset,
                  weatherIntensity:
                    patch.weatherIntensity ?? curData.weatherIntensity ?? 0.6,
                };
                upsertElement({
                  ...cur,
                  data: nextData as unknown as Json,
                });
                void updateSceneElementAction({
                  elementId: elId,
                  campaignId: scene.campaign_id,
                  data: nextData,
                });
              }
            }}
          />
          <WallEnvSubToolbar
            isGm={role === "gm"}
            onClearWalls={() => {
              clearWallsForScene(scene.id);
              void clearSceneWallsAction({ sceneId: scene.id });
            }}
          />
        </>
      ) : (
        <button
          type="button"
          onClick={() => setUiHidden(false)}
          title="Mostrar interface (Ctrl+Shift+H)"
          className="absolute top-3 right-3 z-30 inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-zinc-950/90 px-3 py-1.5 text-xs font-semibold text-amber-300 shadow-xl backdrop-blur transition hover:bg-zinc-900"
        >
          <Eye className="h-3.5 w-3.5" />
          Mostrar UI
        </button>
      )}

      {isDragOverFile && (
        <div className="pointer-events-none absolute inset-4 z-40 flex items-center justify-center rounded-2xl border-2 border-dashed border-amber-400 bg-amber-500/10 text-sm font-bold text-amber-200 backdrop-blur-[1px]">
          {role === "gm"
            ? "Solte a imagem para colocar como Peça de Mapa ou Token"
            : "Solte a imagem para invocar um Token nesta posição"}
        </div>
      )}

      {pendingDrop && (
        <div
          className="absolute z-40 w-60 rounded-2xl border border-amber-500/50 bg-zinc-950/95 p-3 text-xs shadow-2xl backdrop-blur"
          style={{
            left: Math.min(pendingDrop.screen.x, Math.max(size.width - 260, 16)),
            top: Math.min(pendingDrop.screen.y, Math.max(size.height - 160, 16)),
          }}
        >
          <p className="mb-2 truncate font-semibold text-amber-200">
            Como colocar &ldquo;{pendingDrop.file.name}&rdquo;?
          </p>
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => {
                const drop = pendingDrop;
                setPendingDrop(null);
                void handleUploadMapProp(drop.file, drop.world);
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 font-bold text-zinc-950 transition hover:bg-amber-400"
            >
              🗺️ Peça / Mapa no Grid
            </button>
            <button
              type="button"
              onClick={() => {
                const drop = pendingDrop;
                setPendingDrop(null);
                void createTokenFromFile(drop.file, drop.world);
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 font-semibold text-zinc-200 transition hover:border-amber-500/40 hover:text-white"
            >
              🎭 Token de Personagem
            </button>
            <button
              type="button"
              onClick={() => setPendingDrop(null)}
              className="w-full rounded-lg py-1 text-[11px] text-zinc-500 hover:text-zinc-300"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {textDraft && (
        <div
          className="absolute z-40 flex items-center gap-1.5 rounded-xl border border-amber-500/50 bg-zinc-950/95 p-1.5 shadow-2xl"
          style={{
            left: Math.min(textDraft.screen.x, Math.max(size.width - 240, 20)),
            top: Math.min(textDraft.screen.y, Math.max(size.height - 60, 20)),
          }}
        >
          <input
            type="text"
            autoFocus
            value={textDraft.value}
            onChange={(e) =>
              setTextDraft((prev) =>
                prev ? { ...prev, value: e.target.value } : null
              )
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitTextDraft();
              } else if (e.key === "Escape") {
                setTextDraft(null);
              }
            }}
            placeholder="Digite a anotação..."
            className="w-44 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-white outline-none focus:border-amber-400"
          />
          <button
            type="button"
            onClick={submitTextDraft}
            className="rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-bold text-zinc-950"
          >
            OK
          </button>
        </div>
      )}

      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        x={viewport.x}
        y={viewport.y}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={finishInteraction}
        onMouseLeave={finishInteraction}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={finishInteraction}
      >
        {/* Camada 0A: Fundo base da área principal do mapa */}
        <Layer listening={false}>
          <MapLayer scene={scene} mode="backdrop" />
        </Layer>

        {/* Camada 0B: Assets / PNGs colocados ABAIXO do mapa */}
        <Layer>
          <ElementsLayer
            {...sharedElementsProps}
            localDraw={null}
            remoteDrawPreviews={{}}
            layerFilter="prop"
            depthFilter="under_map"
          />
        </Layer>

        {/* Camada 1A: Imagem principal do mapa da cena */}
        <Layer listening={false}>
          <MapLayer scene={scene} mode="image" />
        </Layer>

        {/* Camada 1B: Mapas Extras & Peças SOBRE o mapa (sob o Grid) */}
        <Layer>
          <ElementsLayer
            {...sharedElementsProps}
            localDraw={null}
            remoteDrawPreviews={{}}
            layerFilter="prop"
            depthFilter="above_map"
          />
        </Layer>

        {/* Camada 1C: Malha quadriculada adaptada ao mapa e peças colocadas */}
        <Layer listening={false}>
          <GridLayer
            scene={scene}
            viewport={viewport}
            stageWidth={size.width}
            stageHeight={size.height}
            elements={elements}
            tokens={renderedTokens}
          />
        </Layer>

        {/* Camada 2: Desenhos, Textos, Templates de Magia & Attachments */}
        <Layer>
          <ElementsLayer
            {...sharedElementsProps}
            localDraw={localDraw}
            remoteDrawPreviews={remoteDrawPreviews}
            layerFilter="overlay"
          />
        </Layer>

        {/* Camada 3A: Tokens */}
        <Layer>
          {localTokenDragPos &&
            scene.snap_to_grid &&
            !altDown &&
            (() => {
              const draggedTok = renderedTokens.find(
                (t) => t.id === localTokenDragPos.tokenId
              );
              if (!draggedTok) return null;
              const cellPx =
                Math.min(Math.max(draggedTok.size || 1, 1), 4) * scene.grid_size;
              const snappedTarget = snapToGrid(
                { x: localTokenDragPos.x, y: localTokenDragPos.y },
                scene.grid_size,
                true,
                scene.grid_offset_x ?? 0,
                scene.grid_offset_y ?? 0,
                scene.grid_type ?? "square"
              );
              return (
                <Rect
                  x={snappedTarget.x}
                  y={snappedTarget.y}
                  width={cellPx}
                  height={cellPx}
                  fill="rgba(245, 158, 11, 0.14)"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  dash={[6, 4]}
                  listening={false}
                />
              );
            })()}
          {renderedTokens.map((token) => {
            const remoteDrag = remoteTokenDrags[token.id];
            const displayX = remoteDrag ? remoteDrag.x : token.pos_x;
            const displayY = remoteDrag ? remoteDrag.y : token.pos_y;
            const canMove =
              tool === "select" && !spaceDown && canUserMoveToken(token);

            return (
              <TokenNode
                key={token.id}
                token={token}
                displayX={displayX}
                displayY={displayY}
                gridSize={scene.grid_size}
                gridOffsetX={scene.grid_offset_x ?? 0}
                gridOffsetY={scene.grid_offset_y ?? 0}
                gridType={scene.grid_type ?? "square"}
                snapEnabled={scene.snap_to_grid}
                canMove={canMove}
                isSelected={selectedTokenId === token.id}
                onSelect={(tid) => {
                  setSelectedElementId(null);
                  setSelectedTokenId(tid);
                }}
                onDragStart={handleTokenDragStart}
                onDragMove={handleTokenDragMove}
                onDragEnd={handleTokenDragEnd}
              />
            );
          })}
        </Layer>

        {/* Camada 3B: Assets / PNGs por cima dos tokens (teto, copas, pontes) */}
        <Layer>
          <ElementsLayer
            {...sharedElementsProps}
            localDraw={null}
            remoteDrawPreviews={{}}
            layerFilter="prop"
            depthFilter="above_tokens"
          />
        </Layer>

        {/* Camada 4A: Névoa de Guerra / Nuvem orgânica (F) */}
        <Layer
          opacity={
            role === "gm"
              ? Math.max(0.05, Math.min(1, sceneFogOpacity * gmFogOpacity))
              : sceneFogOpacity
          }
          listening={
            role === "gm" &&
            tool === "fog" &&
            fogToolConfig.mode === "select"
          }
        >
          <FogLayer
            scene={scene}
            fogShapes={fogShapes}
            localPreview={localFogPreview}
            isGm={role === "gm"}
            tokens={renderedTokens}
            walls={walls}
            remoteTokenDrags={remoteTokenDrags}
            localTokenDragPos={localTokenDragPos}
            gmUserIds={gmUserIds}
            selectedTokenId={selectedTokenId}
            gmPreviewVision={gmPreviewVision}
            exploredSpots={exploredMemory[scene.id] ?? []}
            canSelectFog={
              role === "gm" &&
              tool === "fog" &&
              fogToolConfig.mode === "select"
            }
            selectedFogShapeId={selectedFogShapeId}
            onSelectFogShape={setSelectedFogShapeId}
          />
        </Layer>

        {/* Camada 4B: Escuridão & Iluminação Dinâmica (E — funde sobre a névoa) */}
        <Layer
          listening={
            role === "gm" &&
            tool === "darkness" &&
            fogToolConfig.mode === "select"
          }
        >
          <LightingLayer
            scene={scene}
            tokens={renderedTokens}
            walls={walls}
            fogShapes={fogShapes}
            exploredSpots={exploredDarknessMemory[scene.id] ?? []}
            gmFogOpacity={gmFogOpacity}
            canSelectDarkness={
              role === "gm" &&
              tool === "darkness" &&
              fogToolConfig.mode === "select"
            }
            selectedFogShapeId={selectedFogShapeId}
            onSelectFogShape={setSelectedFogShapeId}
            remoteTokenDrags={remoteTokenDrags}
            localTokenDragPos={localTokenDragPos}
            gmUserIds={gmUserIds}
            currentUserId={currentUserId}
            selectedTokenId={selectedTokenId}
            isGm={role === "gm"}
            gmPreviewVision={gmPreviewVision}
          />
        </Layer>

        {/* Camada 4C: Paredes e Portas Interativas (P — Apenas GM) */}
        {role === "gm" && (
          <Layer>
            <WallsLayer
              walls={walls}
              localWall={localWall}
              sceneId={scene.id}
              isGm={role === "gm"}
              isWallToolActive={tool === "wall"}
              onToggleDoor={(w) => {
                const nextOpen = !w.is_open;
                upsertWall({ ...w, is_open: nextOpen });
                void toggleDoorAction({ wallId: w.id, isOpen: nextOpen });
              }}
              onDeleteWall={(wId) => {
                removeWall(wId);
                void deleteSceneWallAction({ wallId: wId });
              }}
            />
          </Layer>
        )}

        {/* Camada 5: Régua de Medição, Pointer Laser e Preview de Bloco de Clima */}
        <Layer>
          {localWeatherPreview && (
            <Rect
              x={Math.min(localWeatherPreview.start.x, localWeatherPreview.end.x)}
              y={Math.min(localWeatherPreview.start.y, localWeatherPreview.end.y)}
              width={Math.abs(
                localWeatherPreview.end.x - localWeatherPreview.start.x
              )}
              height={Math.abs(
                localWeatherPreview.end.y - localWeatherPreview.start.y
              )}
              fill="rgba(56, 189, 248, 0.16)"
              stroke="#38bdf8"
              strokeWidth={2}
              dash={[6, 4]}
              listening={false}
            />
          )}
          <RulerLayer
            localRuler={localRuler}
            tokenDragRuler={tokenDragRuler}
            remoteRulers={remoteRulers}
            pinnedRulers={pinnedRulers}
            onRemovePinnedRuler={(rulerId) => {
              removePinnedRuler(rulerId);
              onRulerPinBroadcast?.("remove", undefined, rulerId);
            }}
            sceneId={scene.id}
            gridSize={scene.grid_size}
            metersPerCell={scene.meters_per_cell}
            rule={scene.distance_rule}
          />
          <PointerLayer
            localPointer={localPointer}
            remotePointers={remotePointers}
            sceneId={scene.id}
            localUsername={currentUsername}
          />
        </Layer>
      </Stage>

      {/* Vídeos VFX animados (.webm com fundo transparente) sincronizados no tabuleiro */}
      <AnimatedPropsOverlay
        sceneId={scene.id}
        elements={elements}
        isGm={role === "gm"}
      />

      {/* Camada VFX 60fps: Clima Global e Zonas por Bloco + Explosões de Magia */}
      <WeatherOverlay
        sceneId={scene.id}
        preset={scene.weather_preset ?? "none"}
        intensity={scene.weather_intensity ?? 0.5}
        elements={elements}
        width={size.width}
        height={size.height}
      />

      {/* Botão discreto de Atalhos (?) no canto inferior esquerdo */}
      {!uiHidden && (
        <div className="pointer-events-auto absolute bottom-3 left-3 z-20">
          {helpOpen && (
            <div className="mb-2 w-72 rounded-2xl border border-zinc-800 bg-zinc-950/95 p-3 text-[11px] text-zinc-300 shadow-2xl backdrop-blur">
              <p className="mb-1.5 font-semibold text-amber-200">
                Atalhos do Tabuleiro
              </p>
              <ul className="space-y-1 text-zinc-400">
                <li>
                  <strong className="text-zinc-200">Scroll</strong>: Zoom ·{" "}
                  <strong className="text-zinc-200">Espaço</strong>: Mover mapa
                </li>
                <li>
                  <strong className="text-zinc-200">Botão Direito / Q</strong>:
                  Ponteiro laser
                </li>
                <li>
                  <strong className="text-zinc-200">Alt (ao arrastar)</strong>:
                  Soltar fora do grid
                </li>
                <li>
                  <strong className="text-zinc-200">Shift + Régua</strong>:
                  Fixar medição no mapa
                </li>
                <li>
                  <strong className="text-zinc-200">Delete / Backspace</strong>:
                  Excluir item selecionado
                </li>
                <li>
                  <strong className="text-zinc-200">Arrastar imagem</strong>:
                  Criar Peça de Mapa ou Token
                </li>
              </ul>
            </div>
          )}
          <button
            type="button"
            onClick={() => setHelpOpen((v) => !v)}
            title="Atalhos e dicas de controle"
            className={`flex h-8 w-8 items-center justify-center rounded-xl border shadow-lg backdrop-blur transition ${helpOpen
              ? "border-amber-400 bg-zinc-900 text-amber-200"
              : "border-zinc-800 bg-zinc-950/85 text-zinc-400 hover:border-amber-500/40 hover:text-amber-200"
              }`}
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
