"use client";

import { Circle, Group, Line, Rect } from "react-konva";
import type { Point2D } from "@/lib/board/geometry";
import type { FogOperation, FogShapeData, Scene, SceneFogShape } from "@/types/domain";

export interface LocalFogPreview {
  mode: "rect" | "circle" | "polygon" | "slice";
  operation: FogOperation;
  start?: Point2D;
  end?: Point2D;
  points?: number[];
}

function renderFogShape(
  shape: {
    id: string;
    operation: FogOperation;
    shape_kind: "rect" | "circle" | "polygon";
    data: FogShapeData;
  },
  fogColor: string,
  isGm: boolean
) {
  const isReveal = shape.operation === "reveal";
  const composite = isReveal ? "destination-out" : "source-over";
  const fill = isReveal ? "#000000" : fogColor;
  const stroke = !isReveal && isGm ? "rgba(245, 158, 11, 0.35)" : undefined;
  const d = shape.data;

  if (shape.shape_kind === "rect") {
    const x = d.width && d.width < 0 ? (d.x ?? 0) + d.width : (d.x ?? 0);
    const y = d.height && d.height < 0 ? (d.y ?? 0) + d.height : (d.y ?? 0);
    return (
      <Rect
        key={shape.id}
        x={x}
        y={y}
        width={Math.abs(d.width ?? 0)}
        height={Math.abs(d.height ?? 0)}
        fill={fill}
        stroke={stroke}
        strokeWidth={stroke ? 1.5 : 0}
        globalCompositeOperation={composite}
      />
    );
  }

  if (shape.shape_kind === "circle") {
    return (
      <Circle
        key={shape.id}
        x={d.x ?? 0}
        y={d.y ?? 0}
        radius={Math.max(d.radius ?? 0, 2)}
        fill={fill}
        stroke={stroke}
        strokeWidth={stroke ? 1.5 : 0}
        globalCompositeOperation={composite}
      />
    );
  }

  if (shape.shape_kind === "polygon") {
    return (
      <Line
        key={shape.id}
        points={d.points ?? []}
        closed
        fill={fill}
        stroke={stroke}
        strokeWidth={stroke ? 1.5 : 0}
        globalCompositeOperation={composite}
      />
    );
  }

  return null;
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
  if (!scene.fog_enabled && !localPreview) {
    return null;
  }

  const fogColor = scene.fog_color || "#09090b";
  const sceneShapes = fogShapes.filter((s) => s.scene_id === scene.id);
  const coverShapes = sceneShapes.filter((s) => s.operation === "cover");
  const revealShapes = sceneShapes.filter((s) => s.operation === "reveal");

  return (
    <Group listening={false}>
      {scene.fog_enabled && (
        <>
          {coverShapes.map((s) =>
            renderFogShape(
              {
                id: s.id,
                operation: s.operation,
                shape_kind: s.shape_kind,
                data: (s.data ?? {}) as FogShapeData,
              },
              fogColor,
              isGm
            )
          )}
          {revealShapes.map((s) =>
            renderFogShape(
              {
                id: s.id,
                operation: s.operation,
                shape_kind: s.shape_kind,
                data: (s.data ?? {}) as FogShapeData,
              },
              fogColor,
              isGm
            )
          )}
        </>
      )}

      {/* Preview local da ferramenta de Névoa / Slice do GM */}
      {isGm && localPreview && localPreview.mode === "slice" && localPreview.start && localPreview.end && (
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

      {isGm && localPreview && localPreview.mode === "rect" && localPreview.start && localPreview.end && (
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

      {isGm && localPreview && localPreview.mode === "circle" && localPreview.start && localPreview.end && (
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

      {isGm && localPreview && localPreview.mode === "polygon" && localPreview.points && localPreview.points.length >= 2 && (
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
