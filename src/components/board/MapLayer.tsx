"use client";

import { Group, Image as KonvaImage } from "react-konva";
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

export default function MapLayer({
  scene,
  mode = "full",
}: {
  scene: Scene;
  mode?: "full" | "backdrop" | "image";
}) {
  const width = scene.map_width || 2000;
  const height = scene.map_height || 2000;
  const showImage = mode === "full" || mode === "image";

  if (!showImage || !scene.map_url) {
    return null;
  }

  return (
    <Group listening={false}>
      <LoadedMapImage
        url={scene.map_url}
        width={width}
        height={height}
      />
    </Group>
  );
}
