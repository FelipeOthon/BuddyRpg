"use client";

import { Group, Image as KonvaImage, Rect } from "react-konva";
import useImage from "use-image";
import type { Scene } from "@/types/domain";

function LoadedMapImage({
  url,
  width,
  height,
}: {
  url: string;
  width: number;
  height: number;
}) {
  const [image] = useImage(url, "anonymous");
  if (!image) return null;
  return (
    <KonvaImage
      image={image}
      x={0}
      y={0}
      width={width}
      height={height}
      listening={false}
    />
  );
}

export default function MapLayer({ scene }: { scene: Scene }) {
  const width = scene.map_width || 2000;
  const height = scene.map_height || 2000;

  return (
    <Group listening={false}>
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="#13151a"
        stroke="#27272a"
        strokeWidth={2}
        listening={false}
      />
      {scene.map_url && (
        <LoadedMapImage
          url={scene.map_url}
          width={width}
          height={height}
        />
      )}
    </Group>
  );
}
