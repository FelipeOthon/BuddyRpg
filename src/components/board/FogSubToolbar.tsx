"use client";

import {
  Circle,
  CloudFog,
  Eraser,
  Eye,
  EyeOff,
  Pentagon,
  Scissors,
  Square,
} from "lucide-react";
import { useBoardStore } from "@/stores/boardStore";
import type { FogMode, Scene } from "@/types/domain";

export default function FogSubToolbar({
  scene,
  isGm,
  polygonPointCount,
  onFinishPolygon,
  onToggleFogEnabled,
  onChangeFogMode,
  onCoverAll,
  onClearAll,
}: {
  scene: Scene;
  isGm: boolean;
  polygonPointCount: number;
  onFinishPolygon: () => void;
  onToggleFogEnabled: (enabled: boolean) => void;
  onChangeFogMode: (mode: FogMode) => void;
  onCoverAll: () => void;
  onClearAll: () => void;
}) {
  const { tool, fogToolConfig, setFogToolConfig } = useBoardStore();

  if (!isGm || tool !== "fog") {
    return null;
  }

  return (
    <div className="pointer-events-auto absolute top-14 left-1/2 z-20 flex max-w-[95vw] -translate-x-1/2 flex-wrap items-center gap-1.5 rounded-xl border border-amber-500/35 bg-zinc-950/95 px-2.5 py-1.5 text-xs shadow-2xl backdrop-blur">
      <button
        type="button"
        onClick={() => onToggleFogEnabled(!scene.fog_enabled)}
        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 font-bold transition ${
          scene.fog_enabled
            ? "border-amber-500/50 bg-amber-500/20 text-amber-200"
            : "border-zinc-700 bg-zinc-800 text-zinc-400"
        }`}
      >
        <CloudFog className="h-3.5 w-3.5" />
        Névoa {scene.fog_enabled ? "ON" : "OFF"}
      </button>

      <select
        value={scene.fog_mode ?? "static"}
        onChange={(e) => onChangeFogMode(e.target.value as FogMode)}
        title="Modo da Névoa"
        className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] font-medium text-zinc-200"
      >
        <option value="static">Estática</option>
        <option value="dynamic">Dinâmica (Luz/Paredes)</option>
        <option value="hybrid">Híbrida (Ambas)</option>
      </select>

      <div className="mx-0.5 h-4 w-px bg-zinc-800" />

      <button
        type="button"
        onClick={() => setFogToolConfig({ operation: "cover" })}
        className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold transition ${
          fogToolConfig.operation === "cover"
            ? "bg-amber-500 text-zinc-950"
            : "text-zinc-300 hover:bg-zinc-800"
        }`}
      >
        <EyeOff className="h-3.5 w-3.5" />
        Cobrir
      </button>

      <button
        type="button"
        onClick={() => setFogToolConfig({ operation: "reveal" })}
        className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold transition ${
          fogToolConfig.operation === "reveal"
            ? "bg-emerald-500 text-zinc-950"
            : "text-zinc-300 hover:bg-zinc-800"
        }`}
      >
        <Eye className="h-3.5 w-3.5" />
        Revelar
      </button>

      <div className="mx-0.5 h-4 w-px bg-zinc-800" />

      {(
        [
          { mode: "rect", label: "Retângulo", icon: Square },
          { mode: "circle", label: "Círculo", icon: Circle },
          { mode: "polygon", label: "Polígono", icon: Pentagon },
          { mode: "slice", label: "Slice (Cortar)", icon: Scissors },
        ] as const
      ).map((item) => {
        const Icon = item.icon;
        const active = fogToolConfig.mode === item.mode;
        return (
          <button
            key={item.mode}
            type="button"
            onClick={() => setFogToolConfig({ mode: item.mode })}
            title={item.label}
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium transition ${
              active
                ? "border border-sky-500/50 bg-sky-500/20 text-sky-200"
                : "text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden md:inline">{item.label}</span>
          </button>
        );
      })}

      {fogToolConfig.mode === "polygon" && polygonPointCount >= 6 && (
        <button
          type="button"
          onClick={onFinishPolygon}
          className="rounded-lg bg-emerald-500 px-2.5 py-1 font-bold text-zinc-950 hover:bg-emerald-400"
        >
          Fechar Polígono
        </button>
      )}

      <div className="mx-0.5 h-4 w-px bg-zinc-800" />

      <button
        type="button"
        onClick={onCoverAll}
        className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 font-medium text-amber-200 hover:bg-zinc-800"
      >
        Cobrir Tudo
      </button>

      <button
        type="button"
        onClick={onClearAll}
        className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 font-medium text-rose-300 hover:bg-rose-500/20"
      >
        <Eraser className="h-3.5 w-3.5" />
        Limpar Névoa
      </button>
    </div>
  );
}
