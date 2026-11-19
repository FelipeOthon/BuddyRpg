"use client";

import { Shape } from "react-konva";
import type { ViewportTransform } from "@/lib/board/geometry";
import type {
  Scene,
  SceneElement,
  SceneElementData,
  Token,
} from "@/types/domain";

export default function GridLayer({
  scene,
  viewport,
  elements = [],
  tokens = [],
}: {
  scene: Scene;
  viewport?: ViewportTransform;
  stageWidth?: number;
  stageHeight?: number;
  elements?: SceneElement[];
  tokens?: Token[];
}) {
  const gridSize = Math.max(scene.grid_size || 70, 10);
  const opacity = scene.grid_opacity ?? 0.4;
  const gridType = scene.grid_type ?? "square";
  const offsetX = scene.grid_offset_x ?? 0;
  const offsetY = scene.grid_offset_y ?? 0;

  if (opacity <= 0.01 || gridType === "none") {
    return null;
  }

  // Tamanho confortável padrão (18×12 quadrados) quando não há mapa principal;
  // expande apenas se o mapa principal, peças/mapas extras ou tokens precisarem.
  const baseWidth = scene.map_url
    ? Math.max(scene.map_width || 1400, gridSize * 6)
    : gridSize * 18;
  const baseHeight = scene.map_url
    ? Math.max(scene.map_height || 980, gridSize * 6)
    : gridSize * 12;

  let minX = 0;
  let minY = 0;
  let maxX = baseWidth;
  let maxY = baseHeight;

  for (const el of elements) {
    if (el.scene_id !== scene.id) continue;
    if (el.kind !== "image" && el.kind !== "rect") continue;
    const d = (el.data ?? {}) as SceneElementData;
    const ew = Math.abs(d.width ?? gridSize * 2);
    const eh = Math.abs(d.height ?? gridSize * 2);
    const ex0 = d.width && d.width < 0 ? el.x + d.width : el.x;
    const ey0 = d.height && d.height < 0 ? el.y + d.height : el.y;
    minX = Math.min(minX, Math.floor((ex0 - gridSize) / gridSize) * gridSize);
    minY = Math.min(minY, Math.floor((ey0 - gridSize) / gridSize) * gridSize);
    maxX = Math.max(
      maxX,
      Math.ceil((ex0 + ew + gridSize) / gridSize) * gridSize
    );
    maxY = Math.max(
      maxY,
      Math.ceil((ey0 + eh + gridSize) / gridSize) * gridSize
    );
  }

  for (const tok of tokens) {
    if (tok.scene_id !== scene.id || tok.id.startsWith("demo-token-")) continue;
    const ts = Math.min(Math.max(tok.size || 1, 1), 4) * gridSize;
    minX = Math.min(
      minX,
      Math.floor((tok.pos_x - gridSize) / gridSize) * gridSize
    );
    minY = Math.min(
      minY,
      Math.floor((tok.pos_y - gridSize) / gridSize) * gridSize
    );
    maxX = Math.max(
      maxX,
      Math.ceil((tok.pos_x + ts + gridSize) / gridSize) * gridSize
    );
    maxY = Math.max(
      maxY,
      Math.ceil((tok.pos_y + ts + gridSize) / gridSize) * gridSize
    );
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const scale = Math.max(viewport?.scale || 1, 0.05);

  return (
    <Shape
      listening={false}
      perfectDrawEnabled={false}
      sceneFunc={(ctx) => {
        ctx.save();
        ctx.beginPath();

        if (gridType === "hex_pointy" || gridType === "hex_flat") {
          const r = gridSize / Math.sqrt(3);

          if (gridType === "hex_pointy") {
            const hexW = Math.sqrt(3) * r;
            const rowStep = 1.5 * r;
            const startRow = Math.floor((minY - offsetY) / rowStep);
            const endRow = Math.ceil((maxY - offsetY) / rowStep);
            const startCol = Math.floor((minX - offsetX) / hexW);
            const endCol = Math.ceil((maxX - offsetX) / hexW);

            for (let row = startRow; row <= endRow; row++) {
              for (let col = startCol; col <= endCol; col++) {
                const cx =
                  offsetX +
                  col * hexW +
                  (Math.abs(row % 2) === 1 ? hexW / 2 : 0);
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
          } else {
            const colStep = 1.5 * r;
            const hexH = Math.sqrt(3) * r;
            const startCol = Math.floor((minX - offsetX) / colStep);
            const endCol = Math.ceil((maxX - offsetX) / colStep);
            const startRow = Math.floor((minY - offsetY) / hexH);
            const endRow = Math.ceil((maxY - offsetY) / hexH);

            for (let col = startCol; col <= endCol; col++) {
              for (let row = startRow; row <= endRow; row++) {
                const cx = offsetX + col * colStep;
                const cy =
                  offsetY +
                  row * hexH +
                  (Math.abs(col % 2) === 1 ? hexH / 2 : 0);
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
          const cols = Math.round(width / gridSize);
          const rows = Math.round(height / gridSize);
          const baseOx = ((offsetX % gridSize) + gridSize) % gridSize;
          const baseOy = ((offsetY % gridSize) + gridSize) % gridSize;
          const startX = minX + (baseOx === 0 ? 0 : baseOx - gridSize);
          const startY = minY + (baseOy === 0 ? 0 : baseOy - gridSize);

          for (let c = 0; c <= cols + 1; c++) {
            const x = startX + c * gridSize;
            if (x < minX || x > maxX) continue;
            ctx.moveTo(x, minY);
            ctx.lineTo(x, maxY);
          }

          for (let r = 0; r <= rows + 1; r++) {
            const y = startY + r * gridSize;
            if (y < minY || y > maxY) continue;
            ctx.moveTo(minX, y);
            ctx.lineTo(maxX, y);
          }
        }

        ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.lineWidth = Math.max(0.35, Math.min(4, 0.9 / scale));
        ctx.stroke();
        ctx.restore();
      }}
    />
  );
}
