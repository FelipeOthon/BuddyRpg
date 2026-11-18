"use client";

import {
  Circle,
  CloudFog,
  Eraser,
  Eye,
  EyeOff,
  Footprints,
  Grid,
  Moon,
  MousePointer,
  Pentagon,
  Scissors,
  Square,
  Trash2,
} from "lucide-react";
import { useBoardStore } from "@/stores/boardStore";
import type { FogMode, Scene } from "@/types/domain";

export default function FogSubToolbar({
  scene,
  isGm,
  polygonPointCount,
  fogIntensity,
  exploredCount,
  onFinishPolygon,
  onToggleFogEnabled,
  onChangeFogMode,
  onChangeFogIntensity,
  onChangeAmbientLight,
  onEnableDungeonMode,
  onDeleteSelectedShape,
  onResetExplored,
  onCoverAll,
  onClearAll,
}: {
  scene: Scene;
  isGm: boolean;
  polygonPointCount: number;
  fogIntensity: number;
  exploredCount: number;
  onFinishPolygon: () => void;
  onToggleFogEnabled: (enabled: boolean) => void;
  onChangeFogMode: (mode: FogMode) => void;
  onChangeFogIntensity: (opacity: number) => void;
  onChangeAmbientLight: (light: number) => void;
  onEnableDungeonMode: () => void;
  onDeleteSelectedShape: () => void;
  onResetExplored: () => void;
  onCoverAll: () => void;
  onClearAll: () => void;
}) {
  const {
    tool,
    fogToolConfig,
    setFogToolConfig,
    selectedFogShapeId,
    gmFogOpacity,
    setGmFogOpacity,
  } = useBoardStore();

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

      <button
        type="button"
        onClick={onEnableDungeonMode}
        title="Ativa Névoa Híbrida + Escuridão de Masmorra para tochas e visão brilharem"
        className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
          scene.fog_enabled &&
          scene.fog_mode === "hybrid" &&
          (scene.ambient_light ?? 1) <= 0.25
            ? "border-indigo-400/60 bg-indigo-500/25 text-indigo-200"
            : "border-zinc-700 bg-zinc-900 text-indigo-200 hover:border-indigo-400/40"
        }`}
      >
        <Moon className="h-3 w-3" />
        Masmorra
      </button>

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
          { mode: "rect", label: "Blocos/Retângulo", icon: Square },
          { mode: "select", label: "Selecionar Bloco", icon: MousePointer },
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
            <span className="hidden lg:inline">{item.label}</span>
          </button>
        );
      })}

      <button
        type="button"
        onClick={() =>
          setFogToolConfig({ snapToGrid: !fogToolConfig.snapToGrid })
        }
        title="Encaixar blocos de névoa exatamente nos quadrados do grid"
        className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
          fogToolConfig.snapToGrid
            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
            : "border-zinc-700 bg-zinc-900 text-zinc-400"
        }`}
      >
        <Grid className="h-3 w-3" />
        Blocos {fogToolConfig.snapToGrid ? "ON" : "OFF"}
      </button>

      {selectedFogShapeId && (
        <button
          type="button"
          onClick={onDeleteSelectedShape}
          title="Excluir bloco de névoa selecionado (Delete)"
          className="inline-flex items-center gap-1 rounded-lg border border-rose-500/50 bg-rose-500/20 px-2 py-1 font-bold text-rose-200 hover:bg-rose-500/30"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Excluir Bloco
        </button>
      )}

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

      {exploredCount > 0 && (
        <button
          type="button"
          onClick={onResetExplored}
          title="Apagar o rastro das áreas já exploradas pelos tokens"
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] font-medium text-sky-200 hover:bg-zinc-800"
        >
          <Footprints className="h-3 w-3" />
          Resetar Rastro
        </button>
      )}

      <button
        type="button"
        onClick={onClearAll}
        className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 font-medium text-rose-300 hover:bg-rose-500/20"
      >
        <Eraser className="h-3.5 w-3.5" />
        Limpar Névoa
      </button>

      <div className="mx-0.5 h-4 w-px bg-zinc-800" />

      <div
        className="flex items-center gap-1.5"
        title="Luz Ambiente / Escuridão da Cena (0% breu · 100% claro)"
      >
        <Moon className="h-3 w-3 text-indigo-300" />
        <span className="text-[11px] text-zinc-400">Luz:</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={scene.ambient_light ?? 1}
          onChange={(e) => onChangeAmbientLight(Number(e.target.value))}
          className="w-16 accent-indigo-400"
        />
        <span className="w-8 font-mono text-[10px] text-indigo-200">
          {Math.round((scene.ambient_light ?? 1) * 100)}%
        </span>
      </div>

      <div
        className="flex items-center gap-1.5"
        title="Intensidade da Névoa para toda a mesa (5% quase invisível · 100% fechada)"
      >
        <span className="text-[11px] text-zinc-400">Intensidade:</span>
        <input
          type="range"
          min={0.05}
          max={1}
          step={0.05}
          value={fogIntensity}
          onChange={(e) => onChangeFogIntensity(Number(e.target.value))}
          className="w-16 accent-amber-400"
        />
        <span className="w-8 font-mono text-[10px] text-amber-200">
          {Math.round(fogIntensity * 100)}%
        </span>
      </div>

      <div
        className="flex items-center gap-1.5"
        title="Visibilidade da Névoa só para você (Mestre): 5% quase invisível · 100% igual jogador"
      >
        <span className="text-[11px] text-zinc-400">Visão GM:</span>
        <input
          type="range"
          min={0.05}
          max={1}
          step={0.05}
          value={gmFogOpacity}
          onChange={(e) => setGmFogOpacity(Number(e.target.value))}
          className="w-16 accent-sky-400"
        />
        <span className="w-8 font-mono text-[10px] text-sky-200">
          {Math.round(gmFogOpacity * 100)}%
        </span>
      </div>
    </div>
  );
}
