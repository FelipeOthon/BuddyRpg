"use client";

import dynamic from "next/dynamic";
import type { Point2D } from "@/lib/board/geometry";
import type {
  CampaignRole,
  DrawPreviewPayload,
  MusicStatePayload,
  PinnedRuler,
  Scene,
} from "@/types/domain";

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
  currentUsername: string;
  role: CampaignRole;
  gmUserIds?: string[];
  onTokenDragBroadcast?: (tokenId: string, x: number, y: number) => void;
  onTokenDragCommit?: (
    tokenId: string,
    x: number,
    y: number,
    prevX: number,
    prevY: number
  ) => void;
  onRulerBroadcast?: (start: Point2D, end: Point2D, active: boolean) => void;
  onRulerPinBroadcast?: (
    action: "add" | "remove" | "clear",
    ruler?: Omit<PinnedRuler, "userId" | "username" | "color">,
    rulerId?: string
  ) => PinnedRuler | null;
  onPointerBroadcast?: (pos: Point2D, active: boolean) => void;
  onDrawPreviewBroadcast?: (
    preview: Omit<DrawPreviewPayload, "userId" | "sceneId">
  ) => void;
  onSyncView?: (x: number, y: number, scale: number) => void;
  onQuickRoll?: (cmd: string) => void;
  onBroadcastMusicState?: (state: Omit<MusicStatePayload, "userId">) => void;
  onOpenSceneManager?: () => void;
}) {
  return <BoardCanvas {...props} />;
}
