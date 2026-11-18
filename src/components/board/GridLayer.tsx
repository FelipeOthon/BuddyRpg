"use client";

import { Shape } from "react-konva";
import type { Scene } from "@/types/domain";

export default function GridLayer({ scene }: { scene: Scene }) {
  const width = scene.map_width || 2000;
  const height = scene.map_height || 2000;
  const gridSize = Math.max(scene.grid_size || 70, 10);
  const opacity = scene.grid_opacity ?? 0.4;

  if (opacity <= 0.01) {
    return null;
  }

  return (
    <Shape
      listening={false}
      perfectDrawEnabled={false}
      sceneFunc={(ctx) => {
        ctx.save();
        ctx.beginPath();

        for (let x = 0; x <= width; x += gridSize) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
        }

        for (let y = 0; y <= height; y += gridSize) {
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
        }

        ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }}
    />
  );
}
