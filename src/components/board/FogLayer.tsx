"use client";

import { useEffect, useMemo, useRef } from "react";
import type Konva from "konva";
import { Circle, Group, Line, Rect } from "react-konva";
import { parseFogColor } from "@/lib/board/fogColor";
import {
  buildOrganicCircleCloudPoints,
  buildOrganicRectCloudPoints,
} from "@/lib/board/fogCloudGeometry";
import type { Point2D } from "@/lib/board/geometry";
import { getSmokeTextures } from "@/lib/board/smokeTexture";
import { computeVisibilityPolygon } from "@/lib/board/visibility";
import type { ExploredSpot, RemoteDragPosition } from "@/stores/boardStore";
import type {
  FogOperation,
  FogShapeData,
  Scene,
  SceneFogShape,
  SceneWall,
  Token,
} from "@/types/domain";

export interface LocalFogPreview {
  mode: "rect" | "circle" | "polygon" | "slice";
  operation: FogOperation;
  layer?: "fog" | "darkness";
  start?: Point2D;
  end?: Point2D;
  points?: number[];
}

function renderFogShape(params: {
  id: string;
  operation: FogOperation;
  shape_kind: "rect" | "circle" | "polygon";
  data: FogShapeData;
  fogColor: string;
  backingOpacity: number;
  isGm: boolean;
  isSelected?: boolean;
  canSelect?: boolean;
  onSelect?: (id: string) => void;
  smokeDense: HTMLCanvasElement | null;
  smokeWisps: HTMLCanvasElement | null;
}) {
  const {
    id,
    operation,
    shape_kind,
    data: d,
    fogColor,
    backingOpacity,
    isGm,
    isSelected,
    canSelect,
    onSelect,
    smokeDense,
    smokeWisps,
  } = params;
  const isReveal = operation === "reveal";

  if (isReveal) {
    const commonReveal = {
      fill: "#000000",
      globalCompositeOperation: "destination-out" as const,
      shadowColor: "#000000",
      shadowBlur: 26,
      shadowOpacity: 1,
    };

    if (shape_kind === "rect") {
      const x = d.width && d.width < 0 ? (d.x ?? 0) + d.width : (d.x ?? 0);
      const y = d.height && d.height < 0 ? (d.y ?? 0) + d.height : (d.y ?? 0);
      return (
        <Rect
          key={id}
          x={x}
          y={y}
          width={Math.abs(d.width ?? 0)}
          height={Math.abs(d.height ?? 0)}
          cornerRadius={14}
          {...commonReveal}
        />
      );
    }

    if (shape_kind === "circle") {
      return (
        <Circle
          key={id}
          x={d.x ?? 0}
          y={d.y ?? 0}
          radius={Math.max(d.radius ?? 0, 2)}
          {...commonReveal}
        />
      );
    }

    return (
      <Line
        key={id}
        points={d.points ?? []}
        closed
        tension={0.28}
        {...commonReveal}
      />
    );
  }

  // Modo Cobrir (cover): contornos orgânicos de nuvem + 3 camadas FBM volumétricas sem borda quadrada dura
  const borderStroke = isSelected
    ? "#38bdf8"
    : canSelect && isGm
      ? "rgba(245, 158, 11, 0.42)"
      : undefined;
  const selectHandlers = canSelect
    ? {
        listening: true,
        onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
          e.cancelBubble = true;
          onSelect?.(id);
        },
        onTap: (e: Konva.KonvaEventObject<TouchEvent>) => {
          e.cancelBubble = true;
          onSelect?.(id);
        },
      }
    : { listening: false };

  const renderCloudPolygonLayers = (
    innerPts: number[],
    outerPts: number[],
    tensionVal: number
  ) => (
    <Group key={id} {...selectHandlers}>
      <Line
        points={outerPts}
        closed
        tension={tensionVal}
        fill={fogColor}
        opacity={backingOpacity * 0.42}
        shadowColor={fogColor}
        shadowBlur={42}
        shadowOpacity={0.9 * backingOpacity}
      />
      <Line
        points={innerPts}
        closed
        tension={tensionVal}
        fill={fogColor}
        opacity={backingOpacity * 0.9}
        stroke={borderStroke}
        strokeWidth={isSelected ? 3 : borderStroke ? 1.5 : 0}
        dash={borderStroke ? [8, 6] : undefined}
        shadowColor={fogColor}
        shadowBlur={26}
        shadowOpacity={0.85 * backingOpacity}
      />
      {smokeDense && smokeWisps && (
        <>
          <Line
            name="fog-smoke-1"
            points={innerPts}
            closed
            tension={tensionVal}
            fillPatternImage={smokeDense as unknown as HTMLImageElement}
            fillPatternRepeat="repeat"
            fillPatternScale={{ x: 2.1, y: 2.1 }}
            opacity={0.82}
          />
          <Line
            name="fog-smoke-2"
            points={innerPts}
            closed
            tension={tensionVal}
            fillPatternImage={smokeDense as unknown as HTMLImageElement}
            fillPatternRepeat="repeat"
            fillPatternScale={{ x: 3.2, y: 3.2 }}
            opacity={0.52}
          />
          <Line
            name="fog-smoke-3"
            points={outerPts}
            closed
            tension={tensionVal}
            fillPatternImage={smokeWisps as unknown as HTMLImageElement}
            fillPatternRepeat="repeat"
            fillPatternScale={{ x: 1.8, y: 1.8 }}
            opacity={0.55}
          />
        </>
      )}
    </Group>
  );

  if (shape_kind === "rect") {
    const x = d.width && d.width < 0 ? (d.x ?? 0) + d.width : (d.x ?? 0);
    const y = d.height && d.height < 0 ? (d.y ?? 0) + d.height : (d.y ?? 0);
    const w = Math.abs(d.width ?? 0);
    const h = Math.abs(d.height ?? 0);
    const innerPts = buildOrganicRectCloudPoints(x, y, w, h, id, 18);
    const outerPts = buildOrganicRectCloudPoints(
      x - 8,
      y - 8,
      w + 16,
      h + 16,
      `${id}-outer`,
      24
    );
    return renderCloudPolygonLayers(innerPts, outerPts, 0.46);
  }

  if (shape_kind === "circle") {
    const cx = d.x ?? 0;
    const cy = d.y ?? 0;
    const r = Math.max(d.radius ?? 0, 2);
    const innerPts = buildOrganicCircleCloudPoints(cx, cy, r, id, 16);
    const outerPts = buildOrganicCircleCloudPoints(
      cx,
      cy,
      r + 10,
      `${id}-outer`,
      22
    );
    return renderCloudPolygonLayers(innerPts, outerPts, 0.48);
  }

  const pts = d.points ?? [];
  return renderCloudPolygonLayers(pts, pts, 0.28);
}

export default function FogLayer({
  scene,
  fogShapes,
  localPreview,
  isGm,
  tokens = [],
  walls = [],
  remoteTokenDrags = {},
  localTokenDragPos = null,
  gmUserIds = [],
  selectedTokenId = null,
  gmPreviewVision = false,
  exploredSpots = [],
  canSelectFog = false,
  selectedFogShapeId = null,
  onSelectFogShape,
}: {
  scene: Scene;
  fogShapes: SceneFogShape[];
  localPreview: LocalFogPreview | null;
  isGm: boolean;
  tokens?: Token[];
  walls?: SceneWall[];
  remoteTokenDrags?: Record<string, RemoteDragPosition>;
  localTokenDragPos?: { tokenId: string; x: number; y: number } | null;
  gmUserIds?: string[];
  selectedTokenId?: string | null;
  gmPreviewVision?: boolean;
  exploredSpots?: ExploredSpot[];
  canSelectFog?: boolean;
  selectedFogShapeId?: string | null;
  onSelectFogShape?: (shapeId: string | null) => void;
}) {
  const groupRef = useRef<Konva.Group>(null);
  const smokeTextures = useMemo(() => getSmokeTextures(), []);

  const { hex: fogColor, opacity: sceneFogOpacity } = parseFogColor(
    scene.fog_color
  );
  // Em intensidades menores que 100%, reduz o fundo escuro para destacar os redemoinhos de fumaça
  const backingOpacity =
    sceneFogOpacity >= 0.99 ? 1 : Math.max(0.28, sceneFogOpacity * 0.72);
  const sceneShapes = fogShapes.filter(
    (s) =>
      s.scene_id === scene.id &&
      ((s.data as FogShapeData | null)?.layer ?? "fog") !== "darkness"
  );
  const coverShapes = sceneShapes.filter((s) => s.operation === "cover");
  const revealShapes = sceneShapes.filter((s) => s.operation === "reveal");
  const hasCoverShapes = coverShapes.length > 0;
  const shouldAnimate = scene.fog_enabled && hasCoverShapes;

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

  // Tokens de jogadores/personagens (ou com tocha) abrem um pouco a névoa enquanto caminham
  const visionCutouts = useMemo(() => {
    if (!scene.fog_enabled || !hasCoverShapes) return [];
    const gridSize = Math.max(scene.grid_size || 70, 10);
    const metersPerCell = Math.max(scene.meters_per_cell || 1.5, 0.1);
    const pxPerMeter = gridSize / metersPerCell;
    const gmSet = new Set(gmUserIds);

    const list: Array<{
      id: string;
      x: number;
      y: number;
      radiusPx: number;
      poly: number[];
    }> = [];

    for (const t of tokens) {
      if (t.scene_id !== scene.id) continue;
      if (t.is_hidden && !(isGm && gmPreviewVision && t.id === selectedTokenId)) {
        continue;
      }

      const hasTorch = (t.light_radius ?? 0) > 0;
      const isPlayerToken =
        Boolean(t.character_id) ||
        (t.owner_id !== null && !gmSet.has(t.owner_id));
      const explicitVision = t.vision_range ?? 0;

      let revealMeters = 0;
      if (hasTorch) {
        revealMeters = t.light_radius ?? 12;
      } else if (isPlayerToken) {
        revealMeters =
          explicitVision <= 0
            ? 0
            : explicitVision === 18
              ? 4.5
              : explicitVision;
      } else if (explicitVision > 0 && explicitVision !== 18) {
        revealMeters = explicitVision;
      } else if (isGm && gmPreviewVision && t.id === selectedTokenId) {
        revealMeters = Math.min(Math.max(explicitVision || 4.5, 1.5), 9);
      }

      if (revealMeters <= 0) continue;
      const radiusPx = Math.max(revealMeters * pxPerMeter, gridSize * 1.2);
      const half = (Math.min(Math.max(t.size || 1, 1), 4) * gridSize) / 2;

      let tx = t.pos_x;
      let ty = t.pos_y;
      if (localTokenDragPos && localTokenDragPos.tokenId === t.id) {
        tx = localTokenDragPos.x;
        ty = localTokenDragPos.y;
      } else if (remoteTokenDrags[t.id]) {
        tx = remoteTokenDrags[t.id]!.x;
        ty = remoteTokenDrags[t.id]!.y;
      }

      const cx = tx + half;
      const cy = ty + half;
      const poly = computeVisibilityPolygon(
        { x: cx, y: cy },
        radiusPx,
        sceneWallSegments
      );
      list.push({ id: t.id, x: cx, y: cy, radiusPx, poly });
    }
    return list;
  }, [
    scene.fog_enabled,
    scene.id,
    scene.grid_size,
    scene.meters_per_cell,
    hasCoverShapes,
    tokens,
    isGm,
    gmPreviewVision,
    selectedTokenId,
    gmUserIds,
    localTokenDragPos,
    remoteTokenDrags,
    sceneWallSegments,
  ]);

  // Animação fluida da fumaça diretamente nos nós Konva (zero re-render React)
  useEffect(() => {
    if (!shouldAnimate) return;
    const group = groupRef.current;
    if (!group) return;

    let rafId = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const layer = group.getLayer();
      if (layer) {
        const smoke1 = group.find(".fog-smoke-1");
        const smoke2 = group.find(".fog-smoke-2");
        const smoke3 = group.find(".fog-smoke-3");

        for (const node of smoke1) {
          (node as Konva.Shape).fillPatternOffset({
            x: (elapsed * 16) % 256,
            y: (elapsed * 6) % 256,
          });
        }
        for (const node of smoke2) {
          (node as Konva.Shape).fillPatternOffset({
            x: (-elapsed * 11) % 256,
            y: (elapsed * 8) % 256,
          });
        }
        for (const node of smoke3) {
          (node as Konva.Shape).fillPatternOffset({
            x: (elapsed * 7) % 256,
            y: (-elapsed * 12) % 256,
          });
        }
        layer.batchDraw();
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [shouldAnimate, coverShapes.length]);

  if (!scene.fog_enabled && !localPreview) {
    return null;
  }

  return (
    <Group ref={groupRef} listening={canSelectFog}>
      {scene.fog_enabled && (
        <>
          {coverShapes.map((s) =>
            renderFogShape({
              id: s.id,
              operation: s.operation,
              shape_kind: s.shape_kind,
              data: (s.data ?? {}) as FogShapeData,
              fogColor,
              backingOpacity,
              isGm,
              isSelected: selectedFogShapeId === s.id,
              canSelect: canSelectFog,
              onSelect: onSelectFogShape,
              smokeDense: smokeTextures?.dense ?? null,
              smokeWisps: smokeTextures?.wisps ?? null,
            })
          )}
          {revealShapes.map((s) =>
            renderFogShape({
              id: s.id,
              operation: s.operation,
              shape_kind: s.shape_kind,
              data: (s.data ?? {}) as FogShapeData,
              fogColor,
              backingOpacity,
              isGm,
              smokeDense: smokeTextures?.dense ?? null,
              smokeWisps: smokeTextures?.wisps ?? null,
            })
          )}
          {/* Rastro de áreas já exploradas pelos personagens (penumbra) */}
          {exploredSpots.map((sp, idx) => (
            <Circle
              key={`exp-${idx}`}
              x={sp.x}
              y={sp.y}
              radius={sp.radiusPx}
              globalCompositeOperation="destination-out"
              opacity={0.56}
              fillRadialGradientStartPoint={{ x: 0, y: 0 }}
              fillRadialGradientEndPoint={{ x: 0, y: 0 }}
              fillRadialGradientStartRadius={0}
              fillRadialGradientEndRadius={sp.radiusPx}
              fillRadialGradientColorStops={[
                0,
                "rgba(0,0,0,1)",
                0.7,
                "rgba(0,0,0,0.85)",
                1,
                "rgba(0,0,0,0)",
              ]}
            />
          ))}
          {visionCutouts.map((cut) => (
            <Line
              key={`tok-vis-${cut.id}`}
              points={cut.poly}
              closed
              globalCompositeOperation="destination-out"
              fillRadialGradientStartPoint={{ x: cut.x, y: cut.y }}
              fillRadialGradientEndPoint={{ x: cut.x, y: cut.y }}
              fillRadialGradientStartRadius={0}
              fillRadialGradientEndRadius={cut.radiusPx}
              fillRadialGradientColorStops={[
                0,
                "rgba(0,0,0,1)",
                0.62,
                "rgba(0,0,0,0.92)",
                1,
                "rgba(0,0,0,0)",
              ]}
            />
          ))}
        </>
      )}

      {/* Preview local da ferramenta de Névoa / Slice do GM */}
      {isGm &&
        localPreview &&
        localPreview.mode === "slice" &&
        localPreview.start &&
        localPreview.end && (
          <Line
            points={[
              localPreview.start.x,
              localPreview.start.y,
              localPreview.end.x,
              localPreview.end.y,
            ]}
            stroke="#38bdf8"
            strokeWidth={3}
            dash={[8, 5]}
          />
        )}

      {isGm &&
        localPreview &&
        localPreview.mode === "rect" &&
        localPreview.start &&
        localPreview.end && (
          <Rect
            x={Math.min(localPreview.start.x, localPreview.end.x)}
            y={Math.min(localPreview.start.y, localPreview.end.y)}
            width={Math.abs(localPreview.end.x - localPreview.start.x)}
            height={Math.abs(localPreview.end.y - localPreview.start.y)}
            fill={
              localPreview.operation === "cover"
                ? localPreview.layer === "darkness"
                  ? "rgba(99, 102, 241, 0.28)"
                  : "rgba(245, 158, 11, 0.25)"
                : "rgba(16, 185, 129, 0.25)"
            }
            stroke={
              localPreview.operation === "cover"
                ? localPreview.layer === "darkness"
                  ? "#818cf8"
                  : "#f59e0b"
                : "#10b981"
            }
            strokeWidth={2}
            dash={[6, 4]}
          />
        )}

      {isGm &&
        localPreview &&
        localPreview.mode === "circle" &&
        localPreview.start &&
        localPreview.end && (
          <Circle
            x={localPreview.start.x}
            y={localPreview.start.y}
            radius={Math.hypot(
              localPreview.end.x - localPreview.start.x,
              localPreview.end.y - localPreview.start.y
            )}
            fill={
              localPreview.operation === "cover"
                ? localPreview.layer === "darkness"
                  ? "rgba(99, 102, 241, 0.28)"
                  : "rgba(245, 158, 11, 0.25)"
                : "rgba(16, 185, 129, 0.25)"
            }
            stroke={
              localPreview.operation === "cover"
                ? localPreview.layer === "darkness"
                  ? "#818cf8"
                  : "#f59e0b"
                : "#10b981"
            }
            strokeWidth={2}
            dash={[6, 4]}
          />
        )}

      {isGm &&
        localPreview &&
        localPreview.mode === "polygon" &&
        localPreview.points &&
        localPreview.points.length >= 2 && (
          <Line
            points={localPreview.points}
            stroke={
              localPreview.operation === "cover"
                ? localPreview.layer === "darkness"
                  ? "#818cf8"
                  : "#f59e0b"
                : "#10b981"
            }
            strokeWidth={2}
            dash={[6, 4]}
          />
        )}
    </Group>
  );
}
