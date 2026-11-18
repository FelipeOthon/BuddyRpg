"use client";

import dynamic from "next/dynamic";
import type { Point2D } from "@/lib/board/geometry";
import type { CampaignRole, Scene } from "@/types/domain";

const BoardCanvas = dynamic(() => import("./BoardCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-zinc-950 text-xs text-zinc-400">
      Inicializando tabuleiro interativo...
    </div>
  ),
});

export default function BoardClient(props: {
  scene: Scene;
  currentUserId: string;
  role: CampaignRole;
  onTokenDragBroadcast?: (tokenId: string, x: number, y: number) => void;
  onTokenDragCommit?: (tokenId: string, x: number, y: number) => void;
  onRulerBroadcast?: (start: Point2D, end: Point2D, active: boolean) => void;
}) {
  return <BoardCanvas {...props} />;
}
