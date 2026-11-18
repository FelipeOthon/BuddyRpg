"use client";

import { useEffect, useRef, useState } from "react";
import { Eye } from "lucide-react";
import { Layer, Stage } from "react-konva";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { clamp, screenToWorld, type Point2D } from "@/lib/board/geometry";
import { useKeyPressed } from "@/hooks/useKeyPressed";
import { useBoardStore } from "@/stores/boardStore";
import {
  clearSceneDrawingsAction,
  createSceneElementAction,
  deleteSceneElementAction,
  updateSceneElementAction,
} from "@/actions/elements";
import {
  clearSceneFogAction,
  createFogShapeAction,
  replaceFogShapesAction,
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
import { formatFogColor, parseFogColor } from "@/lib/board/fogColor";
import {
  rectToFlatPolygon,
  slicePolygonByLine,
} from "@/lib/board/fogGeometry";
import { uploadCampaignImage } from "@/lib/utils/storage";
import type {
  CampaignRole,
  DrawPreviewPayload,
  FogShapeData,
  PinnedRuler,
  Scene,
  Token,
} from "@/types/domain";
import MapLayer from "./MapLayer";
import GridLayer from "./GridLayer";
import ElementsLayer, { type LocalDrawState } from "./ElementsLayer";
import DrawingSubToolbar from "./DrawingSubToolbar";
import FogLayer, { type LocalFogPreview } from "./FogLayer";
import FogSubToolbar from "./FogSubToolbar";
import LightingLayer from "./LightingLayer";
import WallsLayer, { type LocalWallPreview } from "./WallsLayer";
import WallEnvSubToolbar from "./WallEnvSubToolbar";
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
  onTokenDragBroadcast,
  onTokenDragCommit,
  onRulerBroadcast,
  onRulerPinBroadcast,
  onPointerBroadcast,
  onDrawPreviewBroadcast,
  onSyncView,
}: {
  scene: Scene;
  currentUserId: string;
  currentUsername: string;
  role: CampaignRole;
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
  const [tokenDragRuler, setTokenDragRuler] =
    useState<LocalRulerState | null>(null);
  const tokenDragCenterRef = useRef<{
    origin: Point2D;
    halfSize: number;
  } | null>(null);

  // Token de demonstração local caso a cena ainda não tenha tokens no banco
  const [demoTokenPos, setDemoTokenPos] = useState<Point2D>({
    x: scene.grid_size * 2,
    y: scene.grid_size * 2,
  });

  const spaceDown = useKeyPressed(" ");
  const shiftDown = useKeyPressed("Shift");
  const {
    tool,
    viewport,
    setViewport,
    tokens,
    elements,
    fogShapes,
    fogToolConfig,
    gmFogOpacity,
    setGmFogOpacity,
    walls,
    wallToolType,
    gmPreviewVision,
    selectedTokenId,
    selectedElementId,
    drawConfig,
    remoteDrawPreviews,
    setSelectedTokenId,
    setSelectedElementId,
    upsertElement,
    removeElement,
    clearDrawingsForScene,
    upsertFogShape,
    removeFogShape,
    clearFogForScene,
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

  const sceneTokens = tokens.filter(
    (t) => t.scene_id === scene.id && (role === "gm" || !t.is_hidden)
  );

  const fallbackDemoToken: Token = {
    id: `demo-token-${scene.id}`,
    scene_id: scene.id,
    campaign_id: scene.campaign_id,
    owner_id: currentUserId,
    character_id: null,
    name: "Herói (Demo)",
    image_url: null,
    pos_x: demoTokenPos.x,
    pos_y: demoTokenPos.y,
    size: 1,
    hp_current: 24,
    hp_max: 30,
    is_hidden: false,
    conditions: [],
    ring_color: null,
    is_locked: false,
    vision_range: 18,
    light_radius: 0,
    light_color: "#fbbf24",
    updated_at: new Date().toISOString(),
  };

  const renderedTokens =
    sceneTokens.length > 0 ? sceneTokens : [fallbackDemoToken];

  const canUserMoveToken = (token: Token): boolean => {
    if (token.id.startsWith("demo-token-")) return true;
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
    const zoomFactor = e.evt.deltaY > 0 ? 1 / 1.12 : 1.12;
    const nextScale = clamp(
      Math.round(oldScale * zoomFactor * 1000) / 1000,
      0.15,
      4
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

    if (isLeftClick && tool === "fog" && role === "gm") {
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const worldPt = screenToWorld(pointer, viewport);

      if (fogToolConfig.mode === "polygon") {
        const nextPts = [...fogPolygonPoints, worldPt.x, worldPt.y];
        setFogPolygonPoints(nextPts);
        setLocalFogPreview({
          mode: "polygon",
          operation: fogToolConfig.operation,
          points: nextPts,
        });
      } else {
        setLocalFogPreview({
          mode: fogToolConfig.mode,
          operation: fogToolConfig.operation,
          start: worldPt,
          end: worldPt,
        });
      }
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
      setLocalFogPreview((prev) => (prev ? { ...prev, end: worldPt } : null));
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
            const coverTargets = fogShapes.filter(
              (s) =>
                s.scene_id === scene.id &&
                s.operation === "cover" &&
                (s.shape_kind === "rect" || s.shape_kind === "polygon")
            );
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
                    data: { points: sliced[0] },
                  },
                  {
                    operation: "cover",
                    shapeKind: "polygon",
                    data: { points: sliced[1] },
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
            const data: FogShapeData =
              shapeKind === "circle"
                ? {
                    x: finishedFog.start.x,
                    y: finishedFog.start.y,
                    radius: Math.hypot(dx, dy),
                  }
                : {
                    x: Math.min(finishedFog.start.x, finishedFog.end.x),
                    y: Math.min(finishedFog.start.y, finishedFog.end.y),
                    width: Math.abs(dx),
                    height: Math.abs(dy),
                  };

            if (!scene.fog_enabled) {
              upsertScene({ ...scene, fog_enabled: true });
              void updateSceneFogSettingsAction({
                sceneId: scene.id,
                campaignId: scene.campaign_id,
                fogEnabled: true,
              });
            }

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
        0.15,
        4
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

  const handleTokenDragStart = (tokenId: string) => {
    setDraggingLocalTokenId(tokenId);
    const token = renderedTokens.find((t) => t.id === tokenId);
    if (token) {
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
    if (tokenDragCenterRef.current) {
      const { origin, halfSize } = tokenDragCenterRef.current;
      setTokenDragRuler({
        start: origin,
        end: { x: x + halfSize, y: y + halfSize },
      });
    }
    if (tokenId.startsWith("demo-token-")) return;
    onTokenDragBroadcast?.(tokenId, x, y);
  };

  const handleTokenDragEnd = (tokenId: string, x: number, y: number) => {
    setDraggingLocalTokenId(null);
    setLocalTokenDragPos(null);
    tokenDragCenterRef.current = null;
    setTokenDragRuler(null);

    if (tokenId.startsWith("demo-token-")) {
      setDemoTokenPos({ x, y });
      return;
    }

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

  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOverFile(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const worldPt = screenToWorld(
      { x: e.clientX - rect.left, y: e.clientY - rect.top },
      viewport
    );

    try {
      const uploaded = await uploadCampaignImage({
        bucket: "tokens",
        campaignId: scene.campaign_id,
        file,
      });
      const baseName = file.name.replace(/\.[^.]+$/, "").slice(0, 40) || "Token";
      const res = await createTokenAction({
        sceneId: scene.id,
        campaignId: scene.campaign_id,
        name: baseName,
        imageUrl: uploaded.publicUrl,
        size: 1,
        hpCurrent: 20,
        hpMax: 20,
        posX: Math.round(worldPt.x - scene.grid_size / 2),
        posY: Math.round(worldPt.y - scene.grid_size / 2),
      });
      if (res.ok && res.token) {
        upsertToken(res.token);
      }
    } catch {
      // Silencioso se o formato ou permissão falhar
    }
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
    setFogPolygonPoints([]);
    setLocalFogPreview(null);

    if (!scene.fog_enabled) {
      upsertScene({ ...scene, fog_enabled: true });
      void updateSceneFogSettingsAction({
        sceneId: scene.id,
        campaignId: scene.campaign_id,
        fogEnabled: true,
      });
    }

    void createFogShapeAction({
      sceneId: scene.id,
      campaignId: scene.campaign_id,
      operation: op,
      shapeKind: "polygon",
      data: { points: pts },
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

  const handleCoverAllFog = () => {
    if (role !== "gm") return;
    const existingIds = fogShapes
      .filter((s) => s.scene_id === scene.id)
      .map((s) => s.id);
    clearFogForScene(scene.id);
    upsertScene({ ...scene, fog_enabled: true });
    void updateSceneFogSettingsAction({
      sceneId: scene.id,
      campaignId: scene.campaign_id,
      fogEnabled: true,
    });
    void replaceFogShapesAction({
      sceneId: scene.id,
      campaignId: scene.campaign_id,
      deleteIds: existingIds,
      newShapes: [
        {
          operation: "cover",
          shapeKind: "rect",
          data: {
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

  const handleClearAllFog = () => {
    if (role !== "gm") return;
    setFogPolygonPoints([]);
    setLocalFogPreview(null);
    clearFogForScene(scene.id);
    void clearSceneFogAction({ sceneId: scene.id });
  };

  const selectedElement =
    elements.find((el) => el.id === selectedElementId) ?? null;

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
            onClearPinnedRulers={() => {
              clearPinnedRulers(scene.id);
              onRulerPinBroadcast?.("clear");
            }}
          />
          <DrawingSubToolbar
            sceneId={scene.id}
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
            onFinishPolygon={finishFogPolygon}
            onToggleFogEnabled={handleToggleFogEnabled}
            onChangeFogMode={handleChangeFogMode}
            onChangeFogIntensity={handleChangeFogIntensity}
            onCoverAll={handleCoverAllFog}
            onClearAll={handleClearAllFog}
          />
          <WallEnvSubToolbar
            scene={scene}
            isGm={role === "gm"}
            onClearWalls={() => {
              clearWallsForScene(scene.id);
              void clearSceneWallsAction({ sceneId: scene.id });
            }}
            onUpdateEnvironment={(patch) => {
              upsertScene({
                ...scene,
                ...(patch.ambientLight !== undefined
                  ? { ambient_light: patch.ambientLight }
                  : {}),
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
          Solte a imagem para invocar um Token nesta posição
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
        {/* Camada 1: Mapa + Grade (listening=false para performance máxima) */}
        <Layer listening={false}>
          <MapLayer scene={scene} />
          <GridLayer scene={scene} />
        </Layer>

        {/* Camada 2: Desenhos, Textos, Templates de Magia & Attachments */}
        <Layer>
          <ElementsLayer
            elements={elements}
            tokens={renderedTokens}
            remoteTokenDrags={remoteTokenDrags}
            localTokenDragPos={localTokenDragPos}
            localDraw={localDraw}
            remoteDrawPreviews={remoteDrawPreviews}
            sceneId={scene.id}
            currentUserId={currentUserId}
            isGm={role === "gm"}
            canSelect={tool === "select" && !spaceDown}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            onMoveElement={(elId, nx, ny) => {
              const cur = elements.find((x) => x.id === elId);
              if (cur) upsertElement({ ...cur, x: nx, y: ny });
              void updateSceneElementAction({
                elementId: elId,
                campaignId: scene.campaign_id,
                x: nx,
                y: ny,
              });
            }}
          />
        </Layer>

        {/* Camada 3: Tokens */}
        <Layer>
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
                onSelect={setSelectedTokenId}
                onDragStart={handleTokenDragStart}
                onDragMove={handleTokenDragMove}
                onDragEnd={handleTokenDragEnd}
              />
            );
          })}
        </Layer>

        {/* Camada 4A: Iluminação Dinâmica & Linha de Visão (Raycasting 2D) */}
        <Layer listening={false}>
          <LightingLayer
            scene={scene}
            tokens={renderedTokens}
            walls={walls}
            remoteTokenDrags={remoteTokenDrags}
            localTokenDragPos={localTokenDragPos}
            currentUserId={currentUserId}
            selectedTokenId={selectedTokenId}
            isGm={role === "gm"}
            gmPreviewVision={gmPreviewVision}
          />
        </Layer>

        {/* Camada 4B: Névoa de Guerra Estática (sobrepõe iluminação em modo híbrido) */}
        <Layer
          opacity={
            role === "gm"
              ? Math.max(0.05, Math.min(1, sceneFogOpacity * gmFogOpacity))
              : sceneFogOpacity
          }
          listening={false}
        >
          <FogLayer
            scene={scene}
            fogShapes={fogShapes}
            localPreview={localFogPreview}
            isGm={role === "gm"}
          />
        </Layer>

        {/* Camada 4C: Paredes e Portas Interativas (Apenas GM) */}
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

        {/* Camada 5: Régua de Medição e Pointer Laser */}
        <Layer>
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

      {/* Camada VFX 60fps: Clima (Chuva/Neve/Neblina/Brasas) & Explosões de Magia */}
      <WeatherOverlay
        sceneId={scene.id}
        preset={scene.weather_preset ?? "none"}
        intensity={scene.weather_intensity ?? 0.5}
        width={size.width}
        height={size.height}
      />

      {/* Dica de controles no rodapé do tabuleiro */}
      {!uiHidden && (
        <div className="pointer-events-none absolute bottom-3 left-4 z-10 hidden rounded-lg border border-zinc-800/80 bg-zinc-900/80 px-3 py-1.5 text-[11px] text-zinc-400 backdrop-blur sm:block">
          Zoom: Scroll · Pan: Espaço · Pointer: Botão Dir. (Q) · Desenhar: D · Texto: T · Régua: R (Shift fixa) · Solte imagem p/ Token
        </div>
      )}
    </div>
  );
}
