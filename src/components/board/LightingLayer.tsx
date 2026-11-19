"use client";

import { useEffect, useMemo, useRef } from "react";
import type Konva from "konva";
import { Circle, Group, Line, Rect } from "react-konva";
import { getSmokeTextures } from "@/lib/board/smokeTexture";
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
  remoteTokenDrags,
  localTokenDragPos,
  currentUserId,
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
  remoteTokenDrags: Record<string, RemoteDragPosition>;
  localTokenDragPos?: { tokenId: string; x: number; y: number } | null;
  currentUserId: string;
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
      const visionPx = (t.vision_range ?? 18) * pxPerMeter;

      const isMyToken = t.owner_id === currentUserId;
      const isSelectedPreview = isGm && gmPreviewVision && t.id === selectedTokenId;
      const includeVision =
        (isGm && !gmPreviewVision) ||
        isSelectedPreview ||
        (!isGm && isMyToken);

      const effectiveRadius = Math.max(
        lightPx,
        includeVision ? visionPx : 0
      );

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
    currentUserId,
    isGm,
    gmPreviewVision,
    selectedTokenId,
    sceneWalls,
  ]);

  const mapW = scene.map_width || 2000;
  const mapH = scene.map_height || 2000;
  const rawDarkness = Math.max(0.96 - ambientLight * 0.96, 0);
  const darknessOpacity =
    isGm && !gmPreviewVision
      ? Math.min(rawDarkness, Math.max(0.05, gmFogOpacity))
      : rawDarkness;
  const revealShapes = fogShapes.filter(
    (s) => s.scene_id === scene.id && s.operation === "reveal"
  );
  const hasTorches = sources.some((s) => s.isLight);
  const shouldAnimate = shouldRender && (darknessOpacity > 0.01 || hasTorches);

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
  }, [shouldAnimate, ambientLight]);

  if (!shouldRender) return null;

  return (
    <Group ref={groupRef} listening={false}>
      {darknessOpacity > 0.01 && (
        <Group>
          {/* Base abissal de escuridão profunda */}
          <Rect
            x={0}
            y={0}
            width={mapW}
            height={mapH}
            fill="#020308"
            opacity={darknessOpacity * 0.92}
          />
          {/* Textura FBM orgânica de sombras em movimento */}
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
                opacity={darknessOpacity * 0.78}
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
                opacity={darknessOpacity * 0.45}
              />
            </>
          )}

          {/* Áreas reveladas manualmente pelo Mestre (mesmo comportamento da névoa) */}
          {revealShapes.map((s) => {
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

          {/* Rastro de áreas já exploradas (penumbra coordenada com a névoa) */}
          {exploredSpots.map((sp, idx) => (
            <Circle
              key={`dark-exp-${idx}`}
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
