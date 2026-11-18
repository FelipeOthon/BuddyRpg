"use client";

import { Circle, Group, Line, Rect, Text } from "react-konva";
import { measureDistance, type Point2D } from "@/lib/board/geometry";
import type { DistanceRule, RulerBroadcastPayload } from "@/types/domain";

export interface LocalRulerState {
  start: Point2D;
  end: Point2D;
}

function RulerGraphic({
  start,
  end,
  color,
  author,
  gridSize,
  metersPerCell,
  rule,
}: {
  start: Point2D;
  end: Point2D;
  color: string;
  author?: string;
  gridSize: number;
  metersPerCell: number;
  rule: DistanceRule;
}) {
  const measurement = measureDistance({
    start,
    end,
    gridSize,
    metersPerCell,
    rule,
  });

  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const labelText = author
    ? `${author}: ${measurement.formatted}`
    : measurement.formatted;
  const labelWidth = Math.max(labelText.length * 7.5 + 20, 115);

  return (
    <Group listening={false}>
      <Line
        points={[start.x, start.y, end.x, end.y]}
        stroke={color}
        strokeWidth={3}
        dash={[10, 6]}
        lineCap="round"
      />
      <Circle x={start.x} y={start.y} radius={6} fill={color} />
      <Circle x={end.x} y={end.y} radius={6} fill={color} />

      <Group x={midX - labelWidth / 2} y={midY - 30}>
        <Rect
          width={labelWidth}
          height={24}
          cornerRadius={6}
          fill="rgba(9, 9, 11, 0.92)"
          stroke={color}
          strokeWidth={1.5}
        />
        <Text
          width={labelWidth}
          y={6}
          align="center"
          text={labelText}
          fontSize={12}
          fontStyle="bold"
          fill="#fef08a"
        />
      </Group>
    </Group>
  );
}

export default function RulerLayer({
  localRuler,
  remoteRulers,
  sceneId,
  gridSize,
  metersPerCell,
  rule,
}: {
  localRuler: LocalRulerState | null;
  remoteRulers: Record<string, RulerBroadcastPayload>;
  sceneId: string;
  gridSize: number;
  metersPerCell: number;
  rule: DistanceRule;
}) {
  const remoteList = Object.values(remoteRulers).filter(
    (r) => r.active && r.sceneId === sceneId
  );

  return (
    <Group listening={false}>
      {remoteList.map((r) => (
        <RulerGraphic
          key={r.userId}
          start={{ x: r.startX, y: r.startY }}
          end={{ x: r.endX, y: r.endY }}
          color={r.color || "#38bdf8"}
          author={r.username}
          gridSize={gridSize}
          metersPerCell={metersPerCell}
          rule={rule}
        />
      ))}

      {localRuler && (
        <RulerGraphic
          start={localRuler.start}
          end={localRuler.end}
          color="#f59e0b"
          gridSize={gridSize}
          metersPerCell={metersPerCell}
          rule={rule}
        />
      )}
    </Group>
  );
}
