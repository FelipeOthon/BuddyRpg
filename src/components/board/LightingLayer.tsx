"use client";

import { useEffect, useMemo, useRef } from "react";
import type Konva from "konva";
import { Circle, Group, Line, Rect } from "react-konva";
import {
  buildOrganicCircleCloudPoints,
  buildOrganicRectCloudPoints,
} from "@/lib/board/fogCloudGeometry";
import { getSmokeTextures } from "@/lib/board/smokeTexture";
import { computeTokenRevealMeters } from "@/lib/board/tokenVision";
import { computeVisibilityPolygon } from "@/lib/board/visibility";
import type { ExploredSpot, RemoteDragPosition } from "@/stores/boardStore";
import type {
  FogShapeData,
  Scene,
  SceneFogShape,
  SceneWall,
  Token,
} from "@/types/domain";

export default function LightingLayer({
  scene,
  tokens,
  walls,
  fogShapes = [],
  exploredSpots = [],
  gmFogOpacity = 0.62,
  canSelectDarkness = false,
  selectedFogShapeId = null,
  onSelectFogShape,
  remoteTokenDrags,
  localTokenDragPos,
  gmUserIds = [],
  selectedTokenId,
  isGm,
  gmPreviewVision,
}: {
  scene: Scene;
  tokens: Token[];
  walls: SceneWall[];
  fogShapes?: SceneFogShape[];
  exploredSpots?: ExploredSpot[];
  gmFogOpacity?: number;
  canSelectDarkness?: boolean;
  selectedFogShapeId?: string | null;
  onSelectFogShape?: (id: string | null) => void;
  remoteTokenDrags: Record<string, RemoteDragPosition>;
  localTokenDragPos?: { tokenId: string; x: number; y: number } | null;
  gmUserIds?: string[];
  currentUserId?: string;
  selectedTokenId: string | null;
  isGm: boolean;
  gmPreviewVision: boolean;
}) {
  const ambientLight = scene.ambient_light ?? 1;
  const isDynamicMode =
    scene.fog_mode === "dynamic" || scene.fog_mode === "hybrid";
  const shouldRender = isDynamicMode || ambientLight < 0.99;
  const groupRef = useRef<Konva.Group>(null);
  const shadowTextures = useMemo(() => getSmokeTextures(), []);

  const sceneWalls = useMemo(
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

  const gridSize = Math.max(scene.grid_size || 70, 10);
  const metersPerCell = Math.max(scene.meters_per_cell || 1.5, 0.1);
  const pxPerMeter = gridSize / metersPerCell;

  const sources = useMemo(() => {
    if (!shouldRender) return [];
    const list: Array<{
      id: string;
      x: number;
      y: number;
      radiusPx: number;
      lightColor: string;
      isLight: boolean;
      poly: number[];
    }> = [];

    for (const t of tokens) {
      if (t.scene_id !== scene.id) continue;

      const half =
        (Math.min(Math.max(t.size || 1, 1), 4) * gridSize) / 2;
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
      const lightPx = (t.light_radius ?? 0) * pxPerMeter;
      const revealMeters = computeTokenRevealMeters(t, {
        gmUserIds,
        isGm,
        gmPreviewVision,
        selectedTokenId,
      });

      const effectiveRadius =
        revealMeters > 0 ? Math.max(revealMeters * pxPerMeter, gridSize) : 0;

      if (effectiveRadius > 10) {
        const poly = computeVisibilityPolygon(
          { x: cx, y: cy },
          effectiveRadius,
          sceneWalls
        );
        list.push({
          id: t.id,
          x: cx,
          y: cy,
          radiusPx: effectiveRadius,
          lightColor: t.light_color || "#fbbf24",
          isLight: lightPx > 0,
          poly,
        });
      }
    }

    return list;
  }, [
    shouldRender,
    tokens,
    scene.id,
    gridSize,
    pxPerMeter,
    localTokenDragPos,
    remoteTokenDrags,
    gmUserIds,
    isGm,
    gmPreviewVision,
    selectedTokenId,
    sceneWalls,
  ]);

  const mapW = scene.map_width || 2000;
  const mapH = scene.map_height || 2000;
  // ambient_light >= 0.99 = Escuridão OFF; ~0.98 = apenas blocos pintados; <= 0.96 = escuridão global
  const isDarknessEnabled = ambientLight < 0.99;
  const rawGlobalDarkness =
    ambientLight >= 0.97 ? 0 : Math.max(0.92 - ambientLight * 0.92, 0);
  const globalDarknessOpacity =
    isGm && !gmPreviewVision
      ? Math.min(rawGlobalDarkness, Math.max(0.05, gmFogOpacity))
      : rawGlobalDarkness;

  const darknessShapes = fogShapes.filter(
    (s) =>
      s.scene_id === scene.id &&
      (s.data as FogShapeData | null)?.layer === "darkness"
  );
  const darknessCoverShapes = darknessShapes.filter(
    (s) => s.operation === "cover"
  );
  const darknessRevealShapes = darknessShapes.filter(
    (s) => s.operation === "reveal"
  );
  const blockDarknessOpacity =
    isGm && !gmPreviewVision ? Math.max(0.14, gmFogOpacity * 0.85) : 0.82;
  const hasAnyDarkness =
    isDarknessEnabled &&
    (globalDarknessOpacity > 0.01 || darknessCoverShapes.length > 0);
  const hasTorches = sources.some((s) => s.isLight);
  const shouldAnimate = shouldRender && (hasAnyDarkness || hasTorches);

  useEffect(() => {
    if (!shouldAnimate) return;
    const group = groupRef.current;
    if (!group) return;

    let rafId = 0;
    const start = performance.now();
    const baseGlowOp = ambientLight < 0.7 ? 0.3 : 0.16;

    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      const layer = group.getLayer();
      if (layer) {
        const s1 = group.find(".dark-shadow-1");
        const s2 = group.find(".dark-shadow-2");
        const glows = group.find(".torch-glow");

        for (const n of s1) {
          (n as Konva.Shape).fillPatternOffset({
            x: (elapsed * 9) % 256,
            y: (elapsed * 4) % 256,
          });
        }
        for (const n of s2) {
          (n as Konva.Shape).fillPatternOffset({
            x: (-elapsed * 6) % 256,
            y: (elapsed * 7) % 256,
          });
        }
        glows.forEach((n, i) => {
          const flicker =
            1 +
            Math.sin(elapsed * 7.5 + i * 2.1) * 0.07 +
            Math.sin(elapsed * 13.3 + i) * 0.04;
          n.opacity(Math.min(0.45, Math.max(0.08, baseGlowOp * flicker)));
        });
        layer.batchDraw();
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [shouldAnimate, ambientLight, darknessCoverShapes.length]);

  if (!shouldRender) return null;

  return (
    <Group ref={groupRef} listening={canSelectDarkness}>
      {hasAnyDarkness && (
        <Group>
          {/* Escuridão Global (quando Escuridão Global está ativa) */}
          {globalDarknessOpacity > 0.01 && (
            <>
              <Rect
                x={0}
                y={0}
                width={mapW}
                height={mapH}
                fill="#040312"
                opacity={globalDarknessOpacity * 0.84}
                listening={false}
              />
              {shadowTextures?.shadow && (
                <>
                  <Rect
                    name="dark-shadow-1"
                    x={0}
                    y={0}
                    width={mapW}
                    height={mapH}
                    fillPatternImage={
                      shadowTextures.shadow as unknown as HTMLImageElement
                    }
                    fillPatternRepeat="repeat"
                    fillPatternScale={{ x: 2.6, y: 2.6 }}
                    opacity={globalDarknessOpacity * 0.78}
                    listening={false}
                  />
                  <Rect
                    name="dark-shadow-2"
                    x={0}
                    y={0}
                    width={mapW}
                    height={mapH}
                    fillPatternImage={
                      shadowTextures.shadow as unknown as HTMLImageElement
                    }
                    fillPatternRepeat="repeat"
                    fillPatternScale={{ x: 4.1, y: 4.1 }}
                    opacity={globalDarknessOpacity * 0.45}
                    listening={false}
                  />
                </>
              )}
            </>
          )}

          {/* Blocos individuais de Escuridão (contornos orgânicos sombrios que fundem sobre a névoa) */}
          {darknessCoverShapes.map((s) => {
            const d = (s.data ?? {}) as FogShapeData;
            const isSel = selectedFogShapeId === s.id;
            const stroke = isSel
              ? "#38bdf8"
              : canSelectDarkness && isGm
                ? "rgba(129, 140, 248, 0.45)"
                : undefined;
            const selectProps = canSelectDarkness
              ? {
                  listening: true,
                  onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
                    e.cancelBubble = true;
                    onSelectFogShape?.(s.id);
                  },
                  onTap: (e: Konva.KonvaEventObject<TouchEvent>) => {
                    e.cancelBubble = true;
                    onSelectFogShape?.(s.id);
                  },
                }
              : { listening: false };

            const renderDarkCloud = (
              innerPts: number[],
              outerPts: number[],
              tensionVal: number
            ) => (
              <Group key={`dark-blk-${s.id}`} {...selectProps}>
                <Line
                  points={outerPts}
                  closed
                  tension={tensionVal}
                  fill="#060417"
                  opacity={blockDarknessOpacity * 0.4}
                  shadowColor="#050314"
                  shadowBlur={38}
                  shadowOpacity={0.92}
                />
                <Line
                  points={innerPts}
                  closed
                  tension={tensionVal}
                  fill="#0c0720"
                  opacity={blockDarknessOpacity * 0.78}
                  stroke={stroke}
                  strokeWidth={isSel ? 3 : stroke ? 1.5 : 0}
                  dash={stroke ? [8, 6] : undefined}
                  shadowColor="#050314"
                  shadowBlur={26}
                  shadowOpacity={0.9}
                />
                {shadowTextures?.shadow && (
                  <>
                    <Line
                      name="dark-shadow-1"
                      points={innerPts}
                      closed
                      tension={tensionVal}
                      fillPatternImage={
                        shadowTextures.shadow as unknown as HTMLImageElement
                      }
                      fillPatternRepeat="repeat"
                      fillPatternScale={{ x: 2.3, y: 2.3 }}
                      opacity={blockDarknessOpacity}
                      listening={false}
                    />
                    <Line
                      name="dark-shadow-2"
                      points={outerPts}
                      closed
                      tension={tensionVal}
                      fillPatternImage={
                        shadowTextures.shadow as unknown as HTMLImageElement
                      }
                      fillPatternRepeat="repeat"
                      fillPatternScale={{ x: 3.4, y: 3.4 }}
                      opacity={blockDarknessOpacity * 0.45}
                      listening={false}
                    />
                  </>
                )}
              </Group>
            );

            if (s.shape_kind === "rect") {
              const rx =
                d.width && d.width < 0 ? (d.x ?? 0) + d.width : (d.x ?? 0);
              const ry =
                d.height && d.height < 0 ? (d.y ?? 0) + d.height : (d.y ?? 0);
              const rw = Math.abs(d.width ?? 0);
              const rh = Math.abs(d.height ?? 0);
              return renderDarkCloud(
                buildOrganicRectCloudPoints(rx, ry, rw, rh, `dark-${s.id}`, 16),
                buildOrganicRectCloudPoints(
                  rx - 7,
                  ry - 7,
                  rw + 14,
                  rh + 14,
                  `dark-${s.id}-out`,
                  22
                ),
                0.46
              );
            }

            if (s.shape_kind === "circle") {
              const cx = d.x ?? 0;
              const cy = d.y ?? 0;
              const r = Math.max(d.radius ?? 0, 2);
              return renderDarkCloud(
                buildOrganicCircleCloudPoints(cx, cy, r, `dark-${s.id}`, 15),
                buildOrganicCircleCloudPoints(
                  cx,
                  cy,
                  r + 8,
                  `dark-${s.id}-out`,
                  20
                ),
                0.48
              );
            }

            const pts = d.points ?? [];
            return renderDarkCloud(pts, pts, 0.28);
          })}

          {/* Áreas de Escuridão reveladas manualmente pelo Mestre */}
          {darknessRevealShapes.map((s) => {
            const d = (s.data ?? {}) as FogShapeData;
            const revealProps = {
              fill: "#000000",
              globalCompositeOperation: "destination-out" as const,
              shadowColor: "#000000",
              shadowBlur: 24,
              shadowOpacity: 1,
            };
            if (s.shape_kind === "rect") {
              const rx =
                d.width && d.width < 0 ? (d.x ?? 0) + d.width : (d.x ?? 0);
              const ry =
                d.height && d.height < 0 ? (d.y ?? 0) + d.height : (d.y ?? 0);
              return (
                <Rect
                  key={`dark-rev-${s.id}`}
                  x={rx}
                  y={ry}
                  width={Math.abs(d.width ?? 0)}
                  height={Math.abs(d.height ?? 0)}
                  cornerRadius={14}
                  {...revealProps}
                />
              );
            }
            if (s.shape_kind === "circle") {
              return (
                <Circle
                  key={`dark-rev-${s.id}`}
                  x={d.x ?? 0}
                  y={d.y ?? 0}
                  radius={Math.max(d.radius ?? 0, 2)}
                  {...revealProps}
                />
              );
            }
            return (
              <Line
                key={`dark-rev-${s.id}`}
                points={d.points ?? []}
                closed
                {...revealProps}
              />
            );
          })}

          {/* Rastro de áreas já exploradas (Somente no modo "trail" = Escuridão some de vez onde passou) */}
          {(scene.darkness_reveal_mode ?? "vision") === "trail" &&
            exploredSpots.map((sp, idx) =>
              sp.poly && sp.poly.length >= 6 ? (
                <Line
                  key={`dark-exp-${idx}`}
                  points={sp.poly}
                  closed
                  globalCompositeOperation="destination-out"
                  fillRadialGradientStartPoint={{ x: sp.x, y: sp.y }}
                  fillRadialGradientEndPoint={{ x: sp.x, y: sp.y }}
                  fillRadialGradientStartRadius={0}
                  fillRadialGradientEndRadius={sp.radiusPx}
                  fillRadialGradientColorStops={[
                    0,
                    "rgba(0,0,0,1)",
                    0.74,
                    "rgba(0,0,0,0.95)",
                    1,
                    "rgba(0,0,0,0)",
                  ]}
                />
              ) : (
                <Circle
                  key={`dark-exp-${idx}`}
                  x={sp.x}
                  y={sp.y}
                  radius={sp.radiusPx}
                  globalCompositeOperation="destination-out"
                  fillRadialGradientStartPoint={{ x: 0, y: 0 }}
                  fillRadialGradientEndPoint={{ x: 0, y: 0 }}
                  fillRadialGradientStartRadius={0}
                  fillRadialGradientEndRadius={sp.radiusPx}
                  fillRadialGradientColorStops={[
                    0,
                    "rgba(0,0,0,1)",
                    0.74,
                    "rgba(0,0,0,0.95)",
                    1,
                    "rgba(0,0,0,0)",
                  ]}
                />
              )
            )}

          {/* Recortes de visão & luz com transição Bright -> Dim -> Darkness */}
          {sources.map((src) => (
            <Line
              key={`cut-${src.id}`}
              points={src.poly}
              closed
              globalCompositeOperation="destination-out"
              fillRadialGradientStartPoint={{ x: src.x, y: src.y }}
              fillRadialGradientEndPoint={{ x: src.x, y: src.y }}
              fillRadialGradientStartRadius={0}
              fillRadialGradientEndRadius={src.radiusPx}
              fillRadialGradientColorStops={[
                0,
                "rgba(0,0,0,1)",
                0.55,
                "rgba(0,0,0,0.96)",
                0.82,
                "rgba(0,0,0,0.58)",
                1,
                "rgba(0,0,0,0)",
              ]}
            />
          ))}
        </Group>
      )}

      {/* Brilho quente/colorido pulsante das fontes de luz (tochas, lanternas, magias) */}
      {sources
        .filter((s) => s.isLight)
        .map((src) => (
          <Line
            key={`glow-${src.id}`}
            name="torch-glow"
            points={src.poly}
            closed
            opacity={ambientLight < 0.7 ? 0.3 : 0.16}
            globalCompositeOperation="screen"
            fillRadialGradientStartPoint={{ x: src.x, y: src.y }}
            fillRadialGradientEndPoint={{ x: src.x, y: src.y }}
            fillRadialGradientStartRadius={0}
            fillRadialGradientEndRadius={src.radiusPx}
            fillRadialGradientColorStops={[
              0,
              src.lightColor,
              0.32,
              src.lightColor,
              0.78,
              "rgba(245, 158, 11, 0.15)",
              1,
              "rgba(0,0,0,0)",
            ]}
          />
        ))}
    </Group>
  );
}
