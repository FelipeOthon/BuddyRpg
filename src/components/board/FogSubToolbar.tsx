"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
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
  SlidersHorizontal,
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!settingsOpen) return;
    const onDown = (e: MouseEvent) => {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(e.target as Node)
      ) {
        setSettingsOpen(false);
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [settingsOpen]);

  if (!isGm || tool !== "fog") {
    return null;
  }

  const isDarknessOn = (scene.ambient_light ?? 1) < 0.85;

  return (
    <div className="pointer-events-auto absolute top-14 left-1/2 z-20 flex max-w-[92vw] -translate-x-1/2 flex-wrap items-center gap-1 rounded-xl border border-amber-500/35 bg-zinc-950/95 px-2 py-1.5 text-xs shadow-2xl backdrop-blur">
      <button
        type="button"
        onClick={() => onToggleFogEnabled(!scene.fog_enabled)}
        className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-bold transition ${
          scene.fog_enabled
            ? "border-amber-500/50 bg-amber-500/20 text-amber-200"
            : "border-zinc-700 bg-zinc-800 text-zinc-400"
        }`}
      >
        <CloudFog className="h-3.5 w-3.5" />
        Névoa {scene.fog_enabled ? "ON" : "OFF"}
      </button>

      <button
        type="button"
        onClick={() => onChangeAmbientLight(isDarknessOn ? 1 : 0.12)}
        title="Ligar ou desligar a Escuridão da cena (respeita áreas reveladas e tochas)"
        className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-bold transition ${
          isDarknessOn
            ? "border-indigo-400/60 bg-indigo-500/25 text-indigo-200"
            : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-indigo-200"
        }`}
      >
        <Moon className="h-3.5 w-3.5" />
        Escuridão {isDarknessOn ? "ON" : "OFF"}
      </button>

      <button
        type="button"
        onClick={onEnableDungeonMode}
        title="Ativa Névoa + Escuridão juntos (Modo Masmorra)"
        className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] font-semibold text-amber-200 transition hover:border-amber-400/50"
      >
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
          { mode: "rect", label: "Blocos", icon: Square },
          { mode: "select", label: "Selecionar", icon: MousePointer },
          { mode: "circle", label: "Círculo", icon: Circle },
          { mode: "polygon", label: "Polígono", icon: Pentagon },
          { mode: "slice", label: "Slice", icon: Scissors },
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

      {selectedFogShapeId && (
        <button
          type="button"
          onClick={onDeleteSelectedShape}
          title="Excluir bloco de névoa selecionado (Delete)"
          className="inline-flex items-center gap-1 rounded-lg border border-rose-500/50 bg-rose-500/20 px-2 py-1 font-bold text-rose-200 hover:bg-rose-500/30"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Excluir
        </button>
      )}

      {fogToolConfig.mode === "polygon" && polygonPointCount >= 6 && (
        <button
          type="button"
          onClick={onFinishPolygon}
          className="rounded-lg bg-emerald-500 px-2.5 py-1 font-bold text-zinc-950 hover:bg-emerald-400"
        >
          Fechar
        </button>
      )}

      {exploredCount > 0 && (
        <button
          type="button"
          onClick={onResetExplored}
          title="Apagar o rastro das áreas já exploradas pelos tokens"
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] font-medium text-sky-200 hover:bg-zinc-800"
        >
          <Footprints className="h-3 w-3" />
          <span className="hidden md:inline">Rastro</span>
        </button>
      )}

      <button
        type="button"
        onClick={onClearAll}
        title="Limpar toda a névoa da cena"
        className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 font-medium text-rose-300 hover:bg-rose-500/20"
      >
        <Eraser className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Limpar</span>
      </button>

      {/* Popover de Ajustes da Névoa & Escuridão */}
      <div ref={settingsRef} className="relative">
        <button
          type="button"
          onClick={() => setSettingsOpen((v) => !v)}
          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-semibold transition ${
            settingsOpen
              ? "border-amber-400 bg-zinc-800 text-amber-200"
              : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-amber-500/40"
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Ajustes</span>
          <ChevronDown
            className={`h-3 w-3 transition-transform ${
              settingsOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {settingsOpen && (
          <div className="absolute top-full right-0 z-30 mt-2 w-72 space-y-2.5 rounded-2xl border border-amber-500/35 bg-zinc-950/95 p-3 text-xs shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-zinc-400">Modo da Névoa</span>
              <select
                value={scene.fog_mode ?? "static"}
                onChange={(e) => onChangeFogMode(e.target.value as FogMode)}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] font-medium text-zinc-200"
              >
                <option value="static">Estática</option>
                <option value="dynamic">Dinâmica (Luz/Paredes)</option>
                <option value="hybrid">Híbrida (Ambas)</option>
              </select>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-zinc-400">
                Encaixar Blocos no Grid
              </span>
              <button
                type="button"
                onClick={() =>
                  setFogToolConfig({ snapToGrid: !fogToolConfig.snapToGrid })
                }
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold ${
                  fogToolConfig.snapToGrid
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                    : "border-zinc-700 bg-zinc-900 text-zinc-400"
                }`}
              >
                <Grid className="h-3 w-3" />
                {fogToolConfig.snapToGrid ? "ON" : "OFF"}
              </button>
            </div>

            <div className="space-y-1 border-t border-zinc-800/80 pt-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">Luz / Escuridão</span>
                <span className="font-mono text-indigo-200">
                  {Math.round((scene.ambient_light ?? 1) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={scene.ambient_light ?? 1}
                onChange={(e) => onChangeAmbientLight(Number(e.target.value))}
                className="w-full accent-indigo-400"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">Intensidade (Mesa)</span>
                <span className="font-mono text-amber-200">
                  {Math.round(fogIntensity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.05}
                max={1}
                step={0.05}
                value={fogIntensity}
                onChange={(e) => onChangeFogIntensity(Number(e.target.value))}
                className="w-full accent-amber-400"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">Visão GM (Sua Tela)</span>
                <span className="font-mono text-sky-200">
                  {Math.round(gmFogOpacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.05}
                max={1}
                step={0.05}
                value={gmFogOpacity}
                onChange={(e) => setGmFogOpacity(Number(e.target.value))}
                className="w-full accent-sky-400"
              />
            </div>

            <div className="border-t border-zinc-800/80 pt-2">
              <button
                type="button"
                onClick={() => {
                  onCoverAll();
                  setSettingsOpen(false);
                }}
                className="w-full rounded-xl border border-amber-500/40 bg-amber-500/15 py-1.5 text-[11px] font-bold text-amber-200 hover:bg-amber-500/25"
              >
                Cobrir Todo o Mapa
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
