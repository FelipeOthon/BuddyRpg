"use client";

import { useEffect, useState } from "react";
import { Circle, Group, Line, Rect, Text } from "react-konva";
import type { Point2D } from "@/lib/board/geometry";
import type { PointerBroadcastPayload } from "@/types/domain";

function PointerPingGraphic({
  x,
  y,
  color,
  label,
  pulse,
}: {
  x: number;
  y: number;
  color: string;
  label?: string;
  pulse: number;
}) {
  const outerRadius = 14 + pulse * 26;
  const outerOpacity = Math.max(0.85 - pulse * 0.85, 0);
  const tagWidth = label ? Math.max(label.length * 7 + 18, 76) : 0;

  return (
    <Group x={x} y={y} listening={false}>
      {/* Onda expansiva */}
      <Circle
        radius={outerRadius}
        stroke={color}
        strokeWidth={2.5}
        opacity={outerOpacity}
      />
      {/* Halo interno */}
      <Circle
        radius={10}
        fill={color}
        opacity={0.25}
        shadowColor={color}
        shadowBlur={14}
        shadowOpacity={0.9}
      />
      {/* Mira central */}
      <Line points={[-12, 0, -5, 0]} stroke={color} strokeWidth={2} />
      <Line points={[5, 0, 12, 0]} stroke={color} strokeWidth={2} />
      <Line points={[0, -12, 0, -5]} stroke={color} strokeWidth={2} />
      <Line points={[0, 5, 0, 12]} stroke={color} strokeWidth={2} />
      <Circle
        radius={4.5}
        fill="#ffffff"
        stroke={color}
        strokeWidth={2}
      />

      {label && (
        <Group x={-tagWidth / 2} y={20}>
          <Rect
            width={tagWidth}
            height={20}
            cornerRadius={6}
            fill="rgba(9, 9, 11, 0.9)"
            stroke={color}
            strokeWidth={1.2}
          />
          <Text
            width={tagWidth}
            y={4}
            align="center"
            text={label}
            fontSize={11}
            fontStyle="bold"
            fill="#f4f4f5"
          />
        </Group>
      )}
    </Group>
  );
}

export default function PointerLayer({
  localPointer,
  remotePointers,
  sceneId,
  localUsername,
}: {
  localPointer: Point2D | null;
  remotePointers: Record<string, PointerBroadcastPayload>;
  sceneId: string;
  localUsername: string;
}) {
  const remoteList = Object.values(remotePointers).filter(
    (p) => p.active && p.sceneId === sceneId
  );
  const hasAny = Boolean(localPointer) || remoteList.length > 0;
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    if (!hasAny) return;
    let rafId = 0;
    const start = performance.now();

    const tick = (now: number) => {
      setPulse(((now - start) % 900) / 900);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [hasAny]);

  if (!hasAny) return null;

  return (
    <Group listening={false}>
      {remoteList.map((p) => (
        <PointerPingGraphic
          key={p.userId}
          x={p.x}
          y={p.y}
          color={p.color || "#38bdf8"}
          label={p.username}
          pulse={pulse}
        />
      ))}

      {localPointer && (
        <PointerPingGraphic
          x={localPointer.x}
          y={localPointer.y}
          color="#f59e0b"
          label={localUsername}
          pulse={pulse}
        />
      )}
    </Group>
  );
}
