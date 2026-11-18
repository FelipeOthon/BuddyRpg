"use client";

import { Circle, Group, Line, Text } from "react-konva";
import type { Point2D } from "@/lib/board/geometry";
import type { SceneWall, WallType } from "@/types/domain";

export interface LocalWallPreview {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  wallType: WallType;
}

export default function WallsLayer({
  walls,
  localWall,
  sceneId,
  isGm,
  isWallToolActive,
  onToggleDoor,
  onDeleteWall,
}: {
  walls: SceneWall[];
  localWall: LocalWallPreview | null;
  sceneId: string;
  isGm: boolean;
  isWallToolActive: boolean;
  onToggleDoor: (wall: SceneWall) => void;
  onDeleteWall: (wallId: string) => void;
}) {
  if (!isGm) return null;

  const sceneWalls = walls.filter((w) => w.scene_id === sceneId);

  return (
    <Group>
      {sceneWalls.map((w) => {
        const mid: Point2D = {
          x: (w.x1 + w.x2) / 2,
          y: (w.y1 + w.y2) / 2,
        };
        const isDoor = w.wall_type === "door";
        const isWindow = w.wall_type === "window";
        const color = isDoor
          ? w.is_open
            ? "#10b981"
            : "#f97316"
          : isWindow
            ? "#38bdf8"
            : "#ef4444";

        return (
          <Group key={w.id}>
            <Line
              points={[w.x1, w.y1, w.x2, w.y2]}
              stroke={color}
              strokeWidth={isDoor ? 5 : 3.5}
              dash={isWindow || (isDoor && w.is_open) ? [8, 6] : undefined}
              lineCap="round"
              listening={false}
            />

            {/* Botão rápido para abrir/fechar porta (sempre clicável pelo GM) */}
            {isDoor && (
              <Group
                x={mid.x}
                y={mid.y}
                onClick={(e) => {
                  e.cancelBubble = true;
                  onToggleDoor(w);
                }}
                onTap={(e) => {
                  e.cancelBubble = true;
                  onToggleDoor(w);
                }}
              >
                <Circle
                  radius={11}
                  fill="#09090b"
                  stroke={color}
                  strokeWidth={2}
                />
                <Text
                  x={-8}
                  y={-6}
                  width={16}
                  align="center"
                  text={w.is_open ? "🔓" : "🚪"}
                  fontSize={11}
                />
              </Group>
            )}

            {/* Botão de excluir segmento quando a ferramenta Parede está ativa */}
            {isWallToolActive && !isDoor && (
              <Group
                x={mid.x}
                y={mid.y}
                onClick={(e) => {
                  e.cancelBubble = true;
                  onDeleteWall(w.id);
                }}
                onTap={(e) => {
                  e.cancelBubble = true;
                  onDeleteWall(w.id);
                }}
              >
                <Circle
                  radius={8}
                  fill="rgba(9, 9, 11, 0.9)"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                />
                <Text
                  x={-6}
                  y={-5}
                  width={12}
                  align="center"
                  text="×"
                  fontSize={11}
                  fontStyle="bold"
                  fill="#fca5a5"
                />
              </Group>
            )}
          </Group>
        );
      })}

      {localWall && (
        <Line
          points={[localWall.x1, localWall.y1, localWall.x2, localWall.y2]}
          stroke={
            localWall.wallType === "door"
              ? "#f97316"
              : localWall.wallType === "window"
                ? "#38bdf8"
                : "#ef4444"
          }
          strokeWidth={4}
          dash={[6, 4]}
          lineCap="round"
          listening={false}
        />
      )}
    </Group>
  );
}
