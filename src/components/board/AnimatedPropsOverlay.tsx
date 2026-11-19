"use client";

import { useBoardStore } from "@/stores/boardStore";
import type { SceneElement, SceneElementData } from "@/types/domain";

export default function AnimatedPropsOverlay({
  sceneId,
  elements,
  isGm,
}: {
  sceneId: string;
  elements: SceneElement[];
  isGm: boolean;
}) {
  const viewport = useBoardStore((s) => s.viewport);

  const animatedProps = elements.filter((el) => {
    if (el.scene_id !== sceneId) return false;
    if (!isGm && el.is_hidden) return false;
    if (el.kind !== "image") return false;
    const data = (el.data ?? {}) as SceneElementData;
    return Boolean(data.imageUrl && data.imageUrl.toLowerCase().endsWith(".webm"));
  });

  if (animatedProps.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
      <div
        style={{
          transformOrigin: "0 0",
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
        }}
      >
        {animatedProps.map((el) => {
          const data = (el.data ?? {}) as SceneElementData;
          const w = Math.max(data.width ?? 140, 20);
          const h = Math.max(data.height ?? 140, 20);
          const opacity = data.opacity ?? 1;

          return (
            <video
              key={el.id}
              src={data.imageUrl}
              autoPlay
              loop
              muted
              playsInline
              style={{
                position: "absolute",
                left: el.x,
                top: el.y,
                width: w,
                height: h,
                opacity,
                objectFit: "contain",
                transformOrigin: "0 0",
                transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                pointerEvents: "none",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
