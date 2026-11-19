"use client";

import { Shape } from "react-konva";
import type { ViewportTransform } from "@/lib/board/geometry";
import type { Scene } from "@/types/domain";

export default function GridLayer({
  scene,
  viewport,
  stageWidth,
  stageHeight,
}: {
  scene: Scene;
  viewport: ViewportTransform;
  stageWidth: number;
  stageHeight: number;
}) {
  const mapWidth = scene.map_width || 2000;
  const mapHeight = scene.map_height || 2000;
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
        const scale = Math.max(viewport.scale || 1, 0.05);
        const pad = gridSize * 2;
        const viewMinX = -viewport.x / scale - pad;
        const viewMinY = -viewport.y / scale - pad;
        const viewMaxX = (stageWidth - viewport.x) / scale + pad;
        const viewMaxY = (stageHeight - viewport.y) / scale + pad;

        const minX = Math.min(0, viewMinX);
        const minY = Math.min(0, viewMinY);
        const maxX = Math.max(mapWidth, viewMaxX);
        const maxY = Math.max(mapHeight, viewMaxY);

        ctx.save();
        ctx.beginPath();

        if (gridType === "hex_pointy" || gridType === "hex_flat") {
          const r = gridSize / Math.sqrt(3);

          if (gridType === "hex_pointy") {
            const hexW = Math.sqrt(3) * r;
            const rowStep = 1.5 * r;
            const startRow = Math.floor((minY - offsetY) / rowStep) - 1;
            const endRow = Math.ceil((maxY - offsetY) / rowStep) + 1;
            const startCol = Math.floor((minX - offsetX) / hexW) - 1;
            const endCol = Math.ceil((maxX - offsetX) / hexW) + 1;

            const totalHex = (endRow - startRow) * (endCol - startCol);
            if (totalHex <= 3600) {
              for (let row = startRow; row <= endRow; row++) {
                for (let col = startCol; col <= endCol; col++) {
                  const cx =
                    offsetX + col * hexW + (Math.abs(row % 2) === 1 ? hexW / 2 : 0);
                  const cy = offsetY + row * rowStep;
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
            }
          } else {
            const colStep = 1.5 * r;
            const hexH = Math.sqrt(3) * r;
            const startCol = Math.floor((minX - offsetX) / colStep) - 1;
            const endCol = Math.ceil((maxX - offsetX) / colStep) + 1;
            const startRow = Math.floor((minY - offsetY) / hexH) - 1;
            const endRow = Math.ceil((maxY - offsetY) / hexH) + 1;

            const totalHex = (endRow - startRow) * (endCol - startCol);
            if (totalHex <= 3600) {
              for (let col = startCol; col <= endCol; col++) {
                for (let row = startRow; row <= endRow; row++) {
                  const cx = offsetX + col * colStep;
                  const cy =
                    offsetY + row * hexH + (Math.abs(col % 2) === 1 ? hexH / 2 : 0);
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
          }
        } else {
          // Malha infinita por toda a área visível do tabuleiro e além dos mapas extras
          const firstCol = Math.floor((minX - offsetX) / gridSize);
          const lastCol = Math.ceil((maxX - offsetX) / gridSize);
          const firstRow = Math.floor((minY - offsetY) / gridSize);
          const lastRow = Math.ceil((maxY - offsetY) / gridSize);

          for (let col = firstCol; col <= lastCol; col++) {
            const x = offsetX + col * gridSize;
            ctx.moveTo(x, minY);
            ctx.lineTo(x, maxY);
          }

          for (let row = firstRow; row <= lastRow; row++) {
            const y = offsetY + row * gridSize;
            ctx.moveTo(minX, y);
            ctx.lineTo(maxX, y);
          }
        }

        ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.lineWidth = Math.max(0.35, Math.min(5, 0.9 / scale));
        ctx.stroke();
        ctx.restore();
      }}
    />
  );
}
