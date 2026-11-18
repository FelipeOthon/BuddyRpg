"use client";

import { Circle, Group, Image as KonvaImage, Rect, Text } from "react-konva";
import useImage from "use-image";
import type { KonvaEventObject } from "konva/lib/Node";
import { snapToGrid } from "@/lib/board/geometry";
import type { Token } from "@/types/domain";

function TokenAvatar({
  url,
  pixelSize,
}: {
  url: string;
  pixelSize: number;
}) {
  const [image] = useImage(url, "anonymous");
  if (!image) return null;
  return (
    <KonvaImage
      image={image}
      x={4}
      y={4}
      width={pixelSize - 8}
      height={pixelSize - 8}
      cornerRadius={(pixelSize - 8) / 2}
      listening={false}
    />
  );
}

export default function TokenNode({
  token,
  displayX,
  displayY,
  gridSize,
  snapEnabled,
  canMove,
  isSelected,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  token: Token;
  displayX: number;
  displayY: number;
  gridSize: number;
  snapEnabled: boolean;
  canMove: boolean;
  isSelected: boolean;
  onSelect: (tokenId: string) => void;
  onDragStart: (tokenId: string) => void;
  onDragMove: (tokenId: string, x: number, y: number) => void;
  onDragEnd: (tokenId: string, x: number, y: number) => void;
}) {
  const cellCount = Math.min(Math.max(token.size || 1, 1), 4);
  const pixelSize = cellCount * gridSize;
  const radius = pixelSize / 2;

  const hpMax = Math.max(token.hp_max || 1, 1);
  const hpCurrent = Math.max(Math.min(token.hp_current ?? hpMax, hpMax), 0);
  const hpRatio = hpCurrent / hpMax;
  const hpColor =
    hpRatio > 0.5 ? "#10b981" : hpRatio > 0.25 ? "#f59e0b" : "#ef4444";

  const initials = token.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const handleDragMove = (e: KonvaEventObject<DragEvent>) => {
    onDragMove(token.id, e.target.x(), e.target.y());
  };

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    const snapped = snapToGrid(
      { x: e.target.x(), y: e.target.y() },
      gridSize,
      snapEnabled
    );
    e.target.position(snapped);
    onDragEnd(token.id, snapped.x, snapped.y);
  };

  return (
    <Group
      x={displayX}
      y={displayY}
      opacity={token.is_hidden ? 0.45 : 1}
      draggable={canMove}
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect(token.id);
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect(token.id);
      }}
      onDragStart={(e) => {
        e.cancelBubble = true;
        onSelect(token.id);
        onDragStart(token.id);
      }}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      {/* Anel de Seleção / Permissão */}
      <Circle
        x={radius}
        y={radius}
        radius={radius - 2}
        fill="#1e293b"
        stroke={isSelected ? "#fbbf24" : canMove ? "#38bdf8" : "#ef4444"}
        strokeWidth={isSelected ? 4 : 2.5}
        dash={token.is_hidden ? [6, 4] : undefined}
        shadowColor="#000000"
        shadowBlur={8}
        shadowOpacity={0.5}
      />

      {/* Avatar ou Iniciais */}
      {token.image_url ? (
        <TokenAvatar url={token.image_url} pixelSize={pixelSize} />
      ) : (
        <Text
          x={0}
          y={radius - 10}
          width={pixelSize}
          align="center"
          text={initials || "?"}
          fontSize={Math.max(Math.round(pixelSize * 0.28), 14)}
          fontStyle="bold"
          fill="#f8fafc"
          listening={false}
        />
      )}

      {/* Barra de HP no topo do Token */}
      <Group x={6} y={-10} listening={false}>
        <Rect
          width={pixelSize - 12}
          height={6}
          cornerRadius={3}
          fill="rgba(9, 9, 11, 0.85)"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth={1}
        />
        <Rect
          width={Math.max((pixelSize - 12) * hpRatio, 0)}
          height={6}
          cornerRadius={3}
          fill={hpColor}
        />
      </Group>

      {/* Rótulo com Nome e HP */}
      <Group x={-10} y={pixelSize + 4} listening={false}>
        <Rect
          width={pixelSize + 20}
          height={18}
          cornerRadius={4}
          fill="rgba(9, 9, 11, 0.82)"
        />
        <Text
          width={pixelSize + 20}
          y={3}
          align="center"
          text={`${token.is_hidden ? "👁‍🗨 " : ""}${token.name} (${hpCurrent}/${hpMax})`}
          fontSize={11}
          fontStyle="bold"
          fill="#f4f4f5"
          ellipsis
          wrap="none"
        />
      </Group>

      {/* Condições ativas */}
      {token.conditions && token.conditions.length > 0 && (
        <Group x={-10} y={pixelSize + 24} listening={false}>
          <Rect
            width={pixelSize + 20}
            height={15}
            cornerRadius={4}
            fill="rgba(127, 29, 29, 0.85)"
          />
          <Text
            width={pixelSize + 20}
            y={2}
            align="center"
            text={token.conditions.slice(0, 3).join(" · ")}
            fontSize={9}
            fontStyle="bold"
            fill="#fecaca"
            ellipsis
            wrap="none"
          />
        </Group>
      )}
    </Group>
  );
}
