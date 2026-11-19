"use client";

import { BrickWall, DoorClosed, Eye, Flame, Trash2 } from "lucide-react";
import { useBoardStore } from "@/stores/boardStore";
import type { WallType } from "@/types/domain";

export default function WallEnvSubToolbar({
  isGm,
  onClearWalls,
}: {
  isGm: boolean;
  onClearWalls: () => void;
}) {
  const {
    tool,
    wallToolType,
    setWallToolType,
    gmPreviewVision,
    setGmPreviewVision,
  } = useBoardStore();

  if (!isGm || tool !== "wall") {
    return null;
  }

  return (
    <div className="pointer-events-auto absolute top-14 left-1/2 z-20 flex max-w-[95vw] -translate-x-1/2 flex-wrap items-center gap-2 rounded-xl border border-amber-500/35 bg-zinc-950/95 px-3 py-1.5 text-xs shadow-2xl backdrop-blur">
      {(
        [
          { type: "wall" as WallType, label: "Parede", icon: BrickWall },
          { type: "door" as WallType, label: "Porta", icon: DoorClosed },
          { type: "window" as WallType, label: "Janela", icon: Eye },
        ] as const
      ).map((item) => {
        const Icon = item.icon;
        const active = wallToolType === item.type;
        return (
          <button
            key={item.type}
            type="button"
            onClick={() => setWallToolType(item.type)}
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold transition ${
              active
                ? "bg-amber-500 text-zinc-950"
                : "text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{item.label}</span>
          </button>
        );
      })}

      <div className="h-4 w-px bg-zinc-800" />

      <button
        type="button"
        onClick={() => setGmPreviewVision(!gmPreviewVision)}
        title="Simular exatamente o que o token selecionado enxerga com estas paredes"
        className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
          gmPreviewVision
            ? "border-sky-500/50 bg-sky-500/20 text-sky-200"
            : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white"
        }`}
      >
        <Flame className="h-3.5 w-3.5" />
        Preview Visão
      </button>

      <button
        type="button"
        onClick={onClearWalls}
        title="Limpar todas as paredes desta cena"
        className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-rose-300 hover:bg-rose-500/20"
      >
        <Trash2 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Limpar Paredes</span>
      </button>
    </div>
  );
}
