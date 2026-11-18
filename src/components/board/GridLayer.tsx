"use client";

import { Shape } from "react-konva";
import type { Scene } from "@/types/domain";

export default function GridLayer({ scene }: { scene: Scene }) {
  const width = scene.map_width || 2000;
  const height = scene.map_height || 2000;
  const gridSize = Math.max(scene.grid_size || 70, 10);
  const opacity = scene.grid_opacity ?? 0.4;
  const gridType = scene.grid_type ?? "square";
  const offsetX = scene.grid_offset_x ?? 0;
  const offsetY = scene.grid_offset_y ?? 0;

  if (opacity <= 0.01 || gridType === "none") {
    return null;
  }

  return (
    <Shape
      listening={false}
      perfectDrawEnabled={false}
      sceneFunc={(ctx) => {
        ctx.save();
        ctx.beginPath();

        if (gridType === "hex_pointy" || gridType === "hex_flat") {
          const r = gridSize / Math.sqrt(3);
          const ox = ((offsetX % gridSize) + gridSize) % gridSize;
          const oy = ((offsetY % gridSize) + gridSize) % gridSize;

          if (gridType === "hex_pointy") {
            const hexW = Math.sqrt(3) * r;
            const rowStep = 1.5 * r;
            const cols = Math.ceil(width / hexW) + 2;
            const rows = Math.ceil(height / rowStep) + 2;

            for (let row = -1; row < rows; row++) {
              for (let col = -1; col < cols; col++) {
                const cx = ox + col * hexW + (row % 2 !== 0 ? hexW / 2 : 0);
                const cy = oy + row * rowStep;
                for (let i = 0; i < 6; i++) {
                  const angle = (Math.PI / 180) * (60 * i - 30);
                  const vx = cx + r * Math.cos(angle);
                  const vy = cy + r * Math.sin(angle);
                  if (i === 0) ctx.moveTo(vx, vy);
                  else ctx.lineTo(vx, vy);
                }
                ctx.closePath();
              }
            }
          } else {
            const colStep = 1.5 * r;
            const hexH = Math.sqrt(3) * r;
            const cols = Math.ceil(width / colStep) + 2;
            const rows = Math.ceil(height / hexH) + 2;

            for (let col = -1; col < cols; col++) {
              for (let row = -1; row < rows; row++) {
                const cx = ox + col * colStep;
                const cy = oy + row * hexH + (col % 2 !== 0 ? hexH / 2 : 0);
                for (let i = 0; i < 6; i++) {
                  const angle = (Math.PI / 180) * (60 * i);
                  const vx = cx + r * Math.cos(angle);
                  const vy = cy + r * Math.sin(angle);
                  if (i === 0) ctx.moveTo(vx, vy);
                  else ctx.lineTo(vx, vy);
                }
                ctx.closePath();
              }
            }
          }
        } else {
          const startX = ((offsetX % gridSize) + gridSize) % gridSize - gridSize;
          const startY = ((offsetY % gridSize) + gridSize) % gridSize - gridSize;

          for (let x = startX; x <= width; x += gridSize) {
            if (x < 0) continue;
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
          }

          for (let y = startY; y <= height; y += gridSize) {
            if (y < 0) continue;
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
          }
        }

        ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }}
    />
  );
}
