"use client";

import { useEffect, useRef } from "react";
import type Konva from "konva";
import {
  Arc,
  Circle,
  Group,
  Image as KonvaImage,
  Line,
  Rect,
  Text,
  Transformer,
} from "react-konva";
import useImage from "use-image";
import { useKeyPressed } from "@/hooks/useKeyPressed";
import { snapToGrid } from "@/lib/board/geometry";
import { formatWeatherBadge } from "@/lib/board/weatherPresets";
import type { RemoteDragPosition } from "@/stores/boardStore";
import type {
  DrawPreviewPayload,
  ElementDepthLayer,
  GridType,
  SceneElement,
  SceneElementData,
  SceneElementKind,
  Token,
} from "@/types/domain";

export interface LocalDrawState {
  kind: SceneElementKind;
  x: number;
  y: number;
  rotation: number;
  data: SceneElementData;
}

function LoadedElementImage({
  url,
  width,
  height,
  opacity,
  isSelected,
}: {
  url: string;
  width: number;
  height: number;
  opacity: number;
  isSelected?: boolean;
}) {
  const [image] = useImage(url, "anonymous");

  return (
    <Group>
      {image ? (
        <KonvaImage
          image={image}
          x={0}
          y={0}
          width={width}
          height={height}
          opacity={opacity}
        />
      ) : (
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill="rgba(24, 24, 27, 0.7)"
          stroke="#52525b"
          strokeWidth={1.5}
          dash={[6, 4]}
        />
      )}
      {isSelected && (
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          stroke="#f59e0b"
          strokeWidth={2}
          dash={[8, 4]}
          listening={false}
        />
      )}
    </Group>
  );
}

function renderShapeGraphic(params: {
  kind: SceneElementKind;
  data: SceneElementData;
  isSelected?: boolean;
  isGm?: boolean;
  weatherToolActive?: boolean;
}) {
  const { kind, data, isSelected, isGm, weatherToolActive } = params;
  const stroke = data.stroke ?? "#f59e0b";
  const fill = data.fill ?? "#f59e0b";
  const strokeWidth = data.strokeWidth ?? 3;
  const opacity = data.opacity ?? 0.35;
  const hasWeather = Boolean(data.weatherPreset && data.weatherPreset !== "none");

  if (kind === "image" && data.imageUrl) {
    const imgW = Math.max(data.width ?? 280, 20);
    const imgH = Math.max(data.height ?? 280, 20);
    return (
      <Group>
        <LoadedElementImage
          url={data.imageUrl}
          width={imgW}
          height={imgH}
          opacity={data.opacity ?? 1}
          isSelected={isSelected}
        />
        {isGm && hasWeather && (
          <Group listening={false}>
            <Rect
              x={8}
              y={8}
              width={118}
              height={22}
              cornerRadius={6}
              fill="rgba(9, 9, 11, 0.82)"
              stroke="rgba(56, 189, 248, 0.65)"
              strokeWidth={1}
            />
            <Text
              x={14}
              y={13}
              text={formatWeatherBadge(data.weatherPreset!)}
              fontSize={11}
              fontStyle="bold"
              fill="#7dd3fc"
            />
          </Group>
        )}
      </Group>
    );
  }

  if (kind === "freehand" || kind === "line") {
    return (
      <Line
        points={data.points ?? [0, 0]}
        stroke={isSelected ? "#fef08a" : stroke}
        strokeWidth={strokeWidth}
        lineCap="round"
        lineJoin="round"
        tension={kind === "freehand" ? 0.35 : 0}
      />
    );
  }

  if (kind === "rect") {
    const w = data.width ?? 0;
    const h = data.height ?? 0;
    const isWeatherZone = hasWeather || data.label === "__weather_zone__";
    if (isWeatherZone) {
      if (!isGm) return null;
      const rx = w < 0 ? w : 0;
      const ry = h < 0 ? h : 0;
      const absW = Math.abs(w);
      const absH = Math.abs(h);
      const badgeText = hasWeather
        ? formatWeatherBadge(data.weatherPreset!)
        : "☁️ Zona de Clima";
      return (
        <Group opacity={isSelected || weatherToolActive ? 0.95 : 0.45}>
          <Rect
            x={rx}
            y={ry}
            width={absW}
            height={absH}
            stroke={isSelected ? "#fef08a" : "#38bdf8"}
            strokeWidth={isSelected ? 2.5 : 1.5}
            dash={[8, 6]}
            fill="rgba(56, 189, 248, 0.06)"
          />
          <Rect
            x={rx + 6}
            y={ry + 6}
            width={Math.min(absW - 12, 128)}
            height={22}
            cornerRadius={6}
            fill="rgba(9, 9, 11, 0.82)"
            stroke="rgba(56, 189, 248, 0.5)"
            strokeWidth={1}
            listening={false}
          />
          <Text
            x={rx + 12}
            y={ry + 11}
            text={badgeText}
            fontSize={11}
            fontStyle="bold"
            fill="#bae6fd"
            listening={false}
          />
        </Group>
      );
    }

    return (
      <Rect
        x={w < 0 ? w : 0}
        y={h < 0 ? h : 0}
        width={Math.abs(w)}
        height={Math.abs(h)}
        stroke={isSelected ? "#fef08a" : stroke}
        strokeWidth={strokeWidth}
        fill={fill}
        fillEnabled={opacity > 0.01}
        opacity={opacity > 0.01 ? opacity + 0.35 : 1}
      />
    );
  }

  if (kind === "circle" || kind === "aura") {
    const r = Math.max(data.radius ?? 0, 2);
    return (
      <Group>
        <Circle
          radius={r}
          fill={fill}
          opacity={opacity}
          stroke={isSelected ? "#fef08a" : stroke}
          strokeWidth={strokeWidth}
          dash={kind === "aura" ? [8, 6] : undefined}
        />
        {data.label && (
          <Text
            x={-60}
            y={-8}
            width={120}
            align="center"
            text={data.label}
            fontSize={12}
            fontStyle="bold"
            fill="#fef08a"
            listening={false}
          />
        )}
      </Group>
    );
  }

  if (kind === "cone") {
    const r = Math.max(data.radius ?? 0, 4);
    const angle = data.angle ?? 53;
    return (
      <Arc
        innerRadius={0}
        outerRadius={r}
        angle={angle}
        rotation={-angle / 2}
        fill={fill}
        opacity={opacity}
        stroke={isSelected ? "#fef08a" : stroke}
        strokeWidth={strokeWidth}
      />
    );
  }

  if (kind === "text") {
    const text = data.text ?? "Nota";
    const fontSize = data.fontSize ?? 18;
    const estWidth = Math.max(text.length * fontSize * 0.58 + 16, 60);
    return (
      <Group>
        <Rect
          width={estWidth}
          height={fontSize + 14}
          cornerRadius={6}
          fill="rgba(9, 9, 11, 0.78)"
          stroke={isSelected ? "#fef08a" : stroke}
          strokeWidth={isSelected ? 2 : 1}
        />
        <Text
          x={8}
          y={7}
          text={text}
          fontSize={fontSize}
          fontStyle="bold"
          fill={stroke}
        />
      </Group>
    );
  }

  return null;
}

export default function ElementsLayer({
  elements,
  tokens,
  remoteTokenDrags,
  localTokenDragPos,
  localDraw,
  remoteDrawPreviews,
  sceneId,
  currentUserId,
  isGm,
  canSelect,
  weatherToolActive = false,
  selectedElementId,
  layerFilter = "all",
  depthFilter,
  gridSize = 70,
  gridOffsetX = 0,
  gridOffsetY = 0,
  gridType = "square",
  snapEnabled = true,
  onSelectElement,
  onMoveElement,
  onTransformElement,
}: {
  elements: SceneElement[];
  tokens: Token[];
  remoteTokenDrags: Record<string, RemoteDragPosition>;
  localTokenDragPos?: { tokenId: string; x: number; y: number } | null;
  localDraw: LocalDrawState | null;
  remoteDrawPreviews: Record<string, DrawPreviewPayload>;
  sceneId: string;
  currentUserId: string;
  isGm: boolean;
  canSelect: boolean;
  weatherToolActive?: boolean;
  selectedElementId: string | null;
  layerFilter?: "all" | "prop" | "overlay";
  depthFilter?: ElementDepthLayer;
  gridSize?: number;
  gridOffsetX?: number;
  gridOffsetY?: number;
  gridType?: GridType;
  snapEnabled?: boolean;
  onSelectElement: (id: string | null) => void;
  onMoveElement: (elementId: string, nextX: number, nextY: number) => void;
  onTransformElement?: (
    elementId: string,
    patch: { x: number; y: number; rotation: number; data: SceneElementData }
  ) => void;
}) {
  const altDown = useKeyPressed("Alt");
  const shiftDown = useKeyPressed("Shift");
  const trRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef<Map<string, Konva.Group>>(new Map());

  const sceneElements = elements
    .filter((el) => {
      if (el.scene_id !== sceneId) return false;
      if (!isGm && el.is_hidden) return false;
      if (layerFilter === "prop") {
        if (el.layer !== "prop") return false;
        if (depthFilter) {
          const elDepth =
            ((el.data ?? {}) as SceneElementData).zLayer ?? "above_map";
          if (elDepth !== depthFilter) return false;
        }
        return true;
      }
      if (layerFilter === "overlay") return el.layer !== "prop";
      return true;
    })
    .sort((a, b) => {
      const za = ((a.data ?? {}) as SceneElementData).zIndex ?? 0;
      const zb = ((b.data ?? {}) as SceneElementData).zIndex ?? 0;
      return za - zb;
    });

  const remotePreviews =
    layerFilter === "prop"
      ? []
      : Object.values(remoteDrawPreviews).filter(
          (p) => p.active && p.sceneId === sceneId
        );

  const selectedTransformable = sceneElements.find((el) => {
    if (el.id !== selectedElementId) return false;
    if (el.is_locked || weatherToolActive) return false;
    if (el.kind !== "image" && el.kind !== "rect") return false;
    return isGm || el.created_by === currentUserId;
  });

  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    if (canSelect && selectedTransformable) {
      const node = nodeRefs.current.get(selectedTransformable.id);
      if (node) {
        tr.nodes([node]);
        tr.getLayer()?.batchDraw();
        return;
      }
    }
    tr.nodes([]);
    tr.getLayer()?.batchDraw();
  }, [canSelect, selectedTransformable, sceneElements]);

  const getAttachmentOffset = (tokenId: string | null): { x: number; y: number } => {
    if (!tokenId) return { x: 0, y: 0 };
    const tok = tokens.find((t) => t.id === tokenId);
    if (!tok) return { x: 0, y: 0 };
    if (localTokenDragPos && localTokenDragPos.tokenId === tokenId) {
      return {
        x: localTokenDragPos.x - tok.pos_x,
        y: localTokenDragPos.y - tok.pos_y,
      };
    }
    const remote = remoteTokenDrags[tokenId];
    if (remote) {
      return {
        x: remote.x - tok.pos_x,
        y: remote.y - tok.pos_y,
      };
    }
    return { x: 0, y: 0 };
  };

  return (
    <Group>
      {sceneElements.map((el) => {
        const data = (el.data ?? {}) as SceneElementData;
        const canEdit =
          canSelect &&
          !weatherToolActive &&
          !el.is_locked &&
          !el.attached_to_token_id &&
          (isGm || el.created_by === currentUserId);
        const shouldListen = canSelect && (!el.is_locked || weatherToolActive);
        const attachDelta = getAttachmentOffset(el.attached_to_token_id);
        const shouldSnapProp =
          el.layer === "prop" && snapEnabled && !altDown && gridSize > 0;

        return (
          <Group
            key={el.id}
            ref={(node) => {
              if (node) {
                nodeRefs.current.set(el.id, node);
              } else {
                nodeRefs.current.delete(el.id);
              }
            }}
            x={el.x + attachDelta.x}
            y={el.y + attachDelta.y}
            rotation={el.rotation}
            opacity={el.is_hidden ? 0.45 : 1}
            draggable={canEdit}
            listening={shouldListen}
            dragBoundFunc={
              shouldSnapProp
                ? (pos) => pos
                : undefined
            }
            onClick={(e) => {
              if (!canSelect) return;
              e.cancelBubble = true;
              onSelectElement(el.id);
            }}
            onTap={(e) => {
              if (!canSelect) return;
              e.cancelBubble = true;
              onSelectElement(el.id);
            }}
            onDragEnd={(e) => {
              const rawPos = { x: e.target.x(), y: e.target.y() };
              const snapped =
                el.layer === "prop"
                  ? snapToGrid(
                      rawPos,
                      gridSize,
                      snapEnabled && !altDown,
                      gridOffsetX,
                      gridOffsetY,
                      gridType
                    )
                  : rawPos;
              e.target.position(snapped);
              onMoveElement(el.id, snapped.x, snapped.y);
            }}
            onTransformEnd={(e) => {
              const node = e.target;
              const scaleX = node.scaleX();
              const scaleY = node.scaleY();
              node.scaleX(1);
              node.scaleY(1);

              const curW = Math.abs(data.width ?? 280);
              const curH = Math.abs(data.height ?? 280);
              let nextW = Math.max(20, Math.round(curW * scaleX));
              let nextH = Math.max(20, Math.round(curH * scaleY));

              if (shouldSnapProp) {
                nextW = Math.max(
                  gridSize,
                  Math.round(nextW / gridSize) * gridSize
                );
                nextH = Math.max(
                  gridSize,
                  Math.round(nextH / gridSize) * gridSize
                );
              }

              const snappedPos = shouldSnapProp
                ? snapToGrid(
                    { x: node.x(), y: node.y() },
                    gridSize,
                    true,
                    gridOffsetX,
                    gridOffsetY,
                    gridType
                  )
                : { x: Math.round(node.x()), y: Math.round(node.y()) };

              node.position(snappedPos);

              onTransformElement?.(el.id, {
                x: snappedPos.x,
                y: snappedPos.y,
                rotation: Math.round(node.rotation() * 10) / 10,
                data: {
                  ...data,
                  width: nextW,
                  height: nextH,
                },
              });
            }}
          >
            {renderShapeGraphic({
              kind: el.kind,
              data,
              isSelected: selectedElementId === el.id,
              isGm,
              weatherToolActive,
            })}
          </Group>
        );
      })}

      {canSelect && selectedTransformable && (
        <Transformer
          ref={trRef}
          rotateEnabled
          keepRatio={!shiftDown}
          anchorFill="#f59e0b"
          anchorStroke="#09090b"
          anchorSize={9}
          borderStroke="#f59e0b"
          borderDash={[6, 4]}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 20 || newBox.height < 20) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}

      {remotePreviews.map((p) => (
        <Group
          key={`preview-${p.userId}`}
          x={p.x}
          y={p.y}
          rotation={p.rotation}
          listening={false}
        >
          {renderShapeGraphic({ kind: p.kind, data: p.data })}
        </Group>
      ))}

      {layerFilter !== "prop" && localDraw && (
        <Group
          x={localDraw.x}
          y={localDraw.y}
          rotation={localDraw.rotation}
          listening={false}
        >
          {renderShapeGraphic({ kind: localDraw.kind, data: localDraw.data })}
        </Group>
      )}
    </Group>
  );
}
