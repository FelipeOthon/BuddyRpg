"use client";

import { Arc, Circle, Group, Line, Rect, Text } from "react-konva";
import type {
  DrawPreviewPayload,
  SceneElement,
  SceneElementData,
  SceneElementKind,
  Token,
} from "@/types/domain";
import type { RemoteDragPosition } from "@/stores/boardStore";

export interface LocalDrawState {
  kind: SceneElementKind;
  x: number;
  y: number;
  rotation: number;
  data: SceneElementData;
}

function renderShapeGraphic(params: {
  kind: SceneElementKind;
  data: SceneElementData;
  isSelected?: boolean;
}) {
  const { kind, data, isSelected } = params;
  const stroke = data.stroke ?? "#f59e0b";
  const fill = data.fill ?? "#f59e0b";
  const strokeWidth = data.strokeWidth ?? 3;
  const opacity = data.opacity ?? 0.35;

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
  selectedElementId,
  onSelectElement,
  onMoveElement,
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
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onMoveElement: (elementId: string, nextX: number, nextY: number) => void;
}) {
  const sceneElements = elements.filter(
    (el) => el.scene_id === sceneId && (isGm || !el.is_hidden)
  );
  const remotePreviews = Object.values(remoteDrawPreviews).filter(
    (p) => p.active && p.sceneId === sceneId
  );

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
        const canDrag =
          canSelect &&
          !el.attached_to_token_id &&
          (isGm || (el.created_by === currentUserId && !el.is_locked));
        const attachDelta = getAttachmentOffset(el.attached_to_token_id);

        return (
          <Group
            key={el.id}
            x={el.x + attachDelta.x}
            y={el.y + attachDelta.y}
            rotation={el.rotation}
            opacity={el.is_hidden ? 0.45 : 1}
            draggable={canDrag}
            listening={canSelect}
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
              onMoveElement(el.id, e.target.x(), e.target.y());
            }}
          >
            {renderShapeGraphic({
              kind: el.kind,
              data,
              isSelected: selectedElementId === el.id,
            })}
          </Group>
        );
      })}

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

      {localDraw && (
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
