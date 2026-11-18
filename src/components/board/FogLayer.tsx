"use client";

import { useEffect, useMemo, useRef } from "react";
import type Konva from "konva";
import { Circle, Group, Line, Rect } from "react-konva";
import type { Point2D } from "@/lib/board/geometry";
import { getSmokeTextures } from "@/lib/board/smokeTexture";
import type {
  FogOperation,
  FogShapeData,
  Scene,
  SceneFogShape,
} from "@/types/domain";

export interface LocalFogPreview {
  mode: "rect" | "circle" | "polygon" | "slice";
  operation: FogOperation;
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
  isGm: boolean;
  smokeDense: HTMLCanvasElement | null;
  smokeWisps: HTMLCanvasElement | null;
}) {
  const {
    id,
    operation,
    shape_kind,
    data: d,
    fogColor,
    isGm,
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
        {...commonReveal}
      />
    );
  }

  // Modo Cobrir (cover): base opaca + 3 camadas FBM volumétricas em direções distintas
  const borderStroke = isGm ? "rgba(245, 158, 11, 0.35)" : undefined;
  const baseShadow = {
    shadowColor: fogColor,
    shadowBlur: 36,
    shadowOpacity: 0.95,
  };

  if (shape_kind === "rect") {
    const x = d.width && d.width < 0 ? (d.x ?? 0) + d.width : (d.x ?? 0);
    const y = d.height && d.height < 0 ? (d.y ?? 0) + d.height : (d.y ?? 0);
    const w = Math.abs(d.width ?? 0);
    const h = Math.abs(d.height ?? 0);

    return (
      <Group key={id}>
        <Rect
          x={x}
          y={y}
          width={w}
          height={h}
          fill={fogColor}
          stroke={borderStroke}
          strokeWidth={borderStroke ? 1.5 : 0}
          dash={borderStroke ? [8, 6] : undefined}
          {...baseShadow}
        />
        {smokeDense && smokeWisps && (
          <>
            <Rect
              name="fog-smoke-1"
              x={x}
              y={y}
              width={w}
              height={h}
              fillPatternImage={smokeDense as unknown as HTMLImageElement}
              fillPatternRepeat="repeat"
              fillPatternScale={{ x: 2.1, y: 2.1 }}
              opacity={0.85}
            />
            <Rect
              name="fog-smoke-2"
              x={x}
              y={y}
              width={w}
              height={h}
              fillPatternImage={smokeDense as unknown as HTMLImageElement}
              fillPatternRepeat="repeat"
              fillPatternScale={{ x: 3.2, y: 3.2 }}
              opacity={0.55}
            />
            <Rect
              name="fog-smoke-3"
              x={x}
              y={y}
              width={w}
              height={h}
              fillPatternImage={smokeWisps as unknown as HTMLImageElement}
              fillPatternRepeat="repeat"
              fillPatternScale={{ x: 1.7, y: 1.7 }}
              opacity={0.5}
            />
          </>
        )}
      </Group>
    );
  }

  if (shape_kind === "circle") {
    const cx = d.x ?? 0;
    const cy = d.y ?? 0;
    const r = Math.max(d.radius ?? 0, 2);

    return (
      <Group key={id}>
        <Circle
          x={cx}
          y={cy}
          radius={r}
          fill={fogColor}
          stroke={borderStroke}
          strokeWidth={borderStroke ? 1.5 : 0}
          dash={borderStroke ? [8, 6] : undefined}
          {...baseShadow}
        />
        {smokeDense && smokeWisps && (
          <>
            <Circle
              name="fog-smoke-1"
              x={cx}
              y={cy}
              radius={r}
              fillPatternImage={smokeDense as unknown as HTMLImageElement}
              fillPatternRepeat="repeat"
              fillPatternScale={{ x: 2.1, y: 2.1 }}
              opacity={0.85}
            />
            <Circle
              name="fog-smoke-2"
              x={cx}
              y={cy}
              radius={r}
              fillPatternImage={smokeDense as unknown as HTMLImageElement}
              fillPatternRepeat="repeat"
              fillPatternScale={{ x: 3.2, y: 3.2 }}
              opacity={0.55}
            />
            <Circle
              name="fog-smoke-3"
              x={cx}
              y={cy}
              radius={r}
              fillPatternImage={smokeWisps as unknown as HTMLImageElement}
              fillPatternRepeat="repeat"
              fillPatternScale={{ x: 1.7, y: 1.7 }}
              opacity={0.5}
            />
          </>
        )}
      </Group>
    );
  }

  const pts = d.points ?? [];
  return (
    <Group key={id}>
      <Line
        points={pts}
        closed
        fill={fogColor}
        stroke={borderStroke}
        strokeWidth={borderStroke ? 1.5 : 0}
        dash={borderStroke ? [8, 6] : undefined}
        {...baseShadow}
      />
      {smokeDense && smokeWisps && (
        <>
          <Line
            name="fog-smoke-1"
            points={pts}
            closed
            fillPatternImage={smokeDense as unknown as HTMLImageElement}
            fillPatternRepeat="repeat"
            fillPatternScale={{ x: 2.1, y: 2.1 }}
            opacity={0.85}
          />
          <Line
            name="fog-smoke-2"
            points={pts}
            closed
            fillPatternImage={smokeDense as unknown as HTMLImageElement}
            fillPatternRepeat="repeat"
            fillPatternScale={{ x: 3.2, y: 3.2 }}
            opacity={0.55}
          />
          <Line
            name="fog-smoke-3"
            points={pts}
            closed
            fillPatternImage={smokeWisps as unknown as HTMLImageElement}
            fillPatternRepeat="repeat"
            fillPatternScale={{ x: 1.7, y: 1.7 }}
            opacity={0.5}
          />
        </>
      )}
    </Group>
  );
}

export default function FogLayer({
  scene,
  fogShapes,
  localPreview,
  isGm,
}: {
  scene: Scene;
  fogShapes: SceneFogShape[];
  localPreview: LocalFogPreview | null;
  isGm: boolean;
}) {
  const groupRef = useRef<Konva.Group>(null);
  const smokeTextures = useMemo(() => getSmokeTextures(), []);

  const fogColor = scene.fog_color || "#070a12";
  const sceneShapes = fogShapes.filter((s) => s.scene_id === scene.id);
  const coverShapes = sceneShapes.filter((s) => s.operation === "cover");
  const revealShapes = sceneShapes.filter((s) => s.operation === "reveal");
  const shouldAnimate = scene.fog_enabled && coverShapes.length > 0;

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
    <Group ref={groupRef} listening={false}>
      {scene.fog_enabled && (
        <>
          {coverShapes.map((s) =>
            renderFogShape({
              id: s.id,
              operation: s.operation,
              shape_kind: s.shape_kind,
              data: (s.data ?? {}) as FogShapeData,
              fogColor,
              isGm,
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
              isGm,
              smokeDense: smokeTextures?.dense ?? null,
              smokeWisps: smokeTextures?.wisps ?? null,
            })
          )}
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
                ? "rgba(245, 158, 11, 0.25)"
                : "rgba(16, 185, 129, 0.25)"
            }
            stroke={localPreview.operation === "cover" ? "#f59e0b" : "#10b981"}
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
                ? "rgba(245, 158, 11, 0.25)"
                : "rgba(16, 185, 129, 0.25)"
            }
            stroke={localPreview.operation === "cover" ? "#f59e0b" : "#10b981"}
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
            stroke={localPreview.operation === "cover" ? "#f59e0b" : "#10b981"}
            strokeWidth={2}
            dash={[6, 4]}
          />
        )}
    </Group>
  );
}
