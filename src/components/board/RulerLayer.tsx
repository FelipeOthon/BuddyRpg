"use client";

import { Circle, Group, Line, Rect, Text } from "react-konva";
import { measureDistance, type Point2D } from "@/lib/board/geometry";
import type {
  DistanceRule,
  PinnedRuler,
  RulerBroadcastPayload,
} from "@/types/domain";

export interface LocalRulerState {
  start: Point2D;
  end: Point2D;
}

function RulerGraphic({
  start,
  end,
  color,
  author,
  pinned = false,
  onRemove,
  gridSize,
  metersPerCell,
  rule,
}: {
  start: Point2D;
  end: Point2D;
  color: string;
  author?: string;
  pinned?: boolean;
  onRemove?: () => void;
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
  const labelWidth = Math.max(labelText.length * 7.5 + (pinned ? 36 : 20), 120);

  return (
    <Group listening={Boolean(pinned && onRemove)}>
      <Line
        points={[start.x, start.y, end.x, end.y]}
        stroke={color}
        strokeWidth={pinned ? 3.5 : 3}
        dash={pinned ? undefined : [10, 6]}
        lineCap="round"
        listening={false}
      />
      <Circle x={start.x} y={start.y} radius={6} fill={color} listening={false} />
      <Circle x={end.x} y={end.y} radius={6} fill={color} listening={false} />

      <Group x={midX - labelWidth / 2} y={midY - 30}>
        <Rect
          width={labelWidth}
          height={24}
          cornerRadius={6}
          fill="rgba(9, 9, 11, 0.92)"
          stroke={color}
          strokeWidth={1.5}
          listening={false}
        />
        <Text
          width={pinned ? labelWidth - 20 : labelWidth}
          y={6}
          align="center"
          text={labelText}
          fontSize={12}
          fontStyle="bold"
          fill="#fef08a"
          listening={false}
        />
        {pinned && onRemove && (
          <Group
            x={labelWidth - 20}
            y={2}
            onClick={(e) => {
              e.cancelBubble = true;
              onRemove();
            }}
            onTap={(e) => {
              e.cancelBubble = true;
              onRemove();
            }}
          >
            <Rect width={18} height={20} cornerRadius={4} fill="transparent" />
            <Text
              width={18}
              y={4}
              align="center"
              text="×"
              fontSize={13}
              fontStyle="bold"
              fill="#f87171"
            />
          </Group>
        )}
      </Group>
    </Group>
  );
}

export default function RulerLayer({
  localRuler,
  tokenDragRuler,
  remoteRulers,
  pinnedRulers = [],
  onRemovePinnedRuler,
  sceneId,
  gridSize,
  metersPerCell,
  rule,
}: {
  localRuler: LocalRulerState | null;
  tokenDragRuler?: LocalRulerState | null;
  remoteRulers: Record<string, RulerBroadcastPayload>;
  pinnedRulers?: PinnedRuler[];
  onRemovePinnedRuler?: (rulerId: string) => void;
  sceneId: string;
  gridSize: number;
  metersPerCell: number;
  rule: DistanceRule;
}) {
  const remoteList = Object.values(remoteRulers).filter(
    (r) => r.active && r.sceneId === sceneId
  );
  const pinnedList = pinnedRulers.filter((r) => r.sceneId === sceneId);

  return (
    <Group>
      {pinnedList.map((r) => (
        <RulerGraphic
          key={r.id}
          start={{ x: r.startX, y: r.startY }}
          end={{ x: r.endX, y: r.endY }}
          color={r.color || "#a855f7"}
          author={r.username}
          pinned
          onRemove={
            onRemovePinnedRuler ? () => onRemovePinnedRuler(r.id) : undefined
          }
          gridSize={gridSize}
          metersPerCell={metersPerCell}
          rule={rule}
        />
      ))}

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

      {tokenDragRuler && (
        <RulerGraphic
          start={tokenDragRuler.start}
          end={tokenDragRuler.end}
          color="#38bdf8"
          gridSize={gridSize}
          metersPerCell={metersPerCell}
          rule={rule}
        />
      )}

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
