"use client";

import { useEffect } from "react";
import {
  Grid,
  Hand,
  Magnet,
  MousePointer,
  RotateCcw,
  Ruler,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { clamp } from "@/lib/board/geometry";
import { useBoardStore, type BoardTool } from "@/stores/boardStore";
import type { Scene } from "@/types/domain";

export default function BoardToolbar({
  scene,
  isGm,
}: {
  scene: Scene;
  isGm: boolean;
}) {
  const { tool, setTool, viewport, setViewport, resetViewport } =
    useBoardStore();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === "v") setTool("select");
      else if (key === "h") setTool("pan");
      else if (key === "r") setTool("ruler");
      else if (key === "0") resetViewport();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setTool, resetViewport]);

  const zoomBy = (factor: number) => {
    const nextScale = clamp(
      Math.round(viewport.scale * factor * 100) / 100,
      0.15,
      4
    );
    setViewport({ ...viewport, scale: nextScale });
  };

  const tools: Array<{
    id: BoardTool;
    label: string;
    shortcut: string;
    icon: typeof MousePointer;
  }> = [
    { id: "select", label: "Selecionar / Mover Token", shortcut: "V", icon: MousePointer },
    { id: "pan", label: "Mover Mapa (ou segure Espaço)", shortcut: "H", icon: Hand },
    { id: "ruler", label: "Régua de Distância", shortcut: "R", icon: Ruler },
  ];

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex flex-wrap items-center justify-between gap-2 px-4">
      {/* Ferramentas do Tabuleiro */}
      <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/90 p-1 shadow-xl backdrop-blur">
        {tools.map((t) => {
          const Icon = t.icon;
          const active = tool === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTool(t.id)}
              title={`${t.label} (${t.shortcut})`}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                active
                  ? "bg-amber-500 text-zinc-950 shadow"
                  : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.label.split(" ")[0]}</span>
              <kbd
                className={`rounded px-1 text-[10px] ${
                  active
                    ? "bg-amber-600/30 text-zinc-950"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {t.shortcut}
              </kbd>
            </button>
          );
        })}
      </div>

      {/* Informações da Cena */}
      <div className="pointer-events-auto hidden items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 text-xs text-zinc-300 shadow-xl backdrop-blur md:flex">
        <Grid className="h-3.5 w-3.5 text-amber-400" />
        <span className="font-semibold text-white">{scene.name}</span>
        {!scene.is_active && isGm && (
          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
            Inativa (Só GM vê)
          </span>
        )}
        <span className="text-zinc-500">·</span>
        <span>{scene.grid_size}px</span>
        <span className="text-zinc-500">·</span>
        <span>{scene.meters_per_cell}m/q</span>
        <span className="text-zinc-500">·</span>
        <span className="inline-flex items-center gap-1 text-zinc-400">
          <Magnet className="h-3 w-3 text-emerald-400" />
          {scene.snap_to_grid ? "Snap ON" : "Snap OFF"}
        </span>
      </div>

      {/* Controles de Zoom */}
      <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/90 p-1 shadow-xl backdrop-blur">
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.15)}
          title="Afastar (-)"
          className="rounded-lg p-1.5 text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={resetViewport}
          title="Resetar Zoom (0)"
          className="min-w-[52px] rounded-lg px-2 py-1 text-center font-mono text-xs font-semibold text-zinc-200 transition hover:bg-zinc-800"
        >
          {Math.round(viewport.scale * 100)}%
        </button>
        <button
          type="button"
          onClick={() => zoomBy(1.15)}
          title="Aproximar (+)"
          className="rounded-lg p-1.5 text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={resetViewport}
          title="Centralizar visão"
          className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
