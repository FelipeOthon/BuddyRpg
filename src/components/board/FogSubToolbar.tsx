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
import type { FogMode, RevealMode, Scene } from "@/types/domain";

export default function FogSubToolbar({
  scene,
  isGm,
  polygonPointCount,
  fogIntensity,
  exploredCount,
  darknessExploredCount,
  onFinishPolygon,
  onToggleFogEnabled,
  onChangeFogMode,
  onChangeFogRevealMode,
  onChangeDarknessRevealMode,
  onChangeFogIntensity,
  onChangeAmbientLight,
  onDeleteSelectedShape,
  onResetExplored,
  onCoverAllLayer,
  onClearAllLayer,
}: {
  scene: Scene;
  isGm: boolean;
  polygonPointCount: number;
  fogIntensity: number;
  exploredCount: number;
  darknessExploredCount: number;
  onFinishPolygon: () => void;
  onToggleFogEnabled: (enabled: boolean) => void;
  onChangeFogMode: (mode: FogMode) => void;
  onChangeFogRevealMode: (mode: RevealMode) => void;
  onChangeDarknessRevealMode: (mode: RevealMode) => void;
  onChangeFogIntensity: (opacity: number) => void;
  onChangeAmbientLight: (light: number) => void;
  onDeleteSelectedShape: () => void;
  onResetExplored: (layer: "fog" | "darkness") => void;
  onCoverAllLayer: (layer: "fog" | "darkness") => void;
  onClearAllLayer: (layer: "fog" | "darkness") => void;
}) {
  const {
    tool,
    fogToolConfig,
    setFogToolConfig,
    selectedFogShapeId,
    gmFogOpacity,
    setGmFogOpacity,
    gmPreviewVision,
    setGmPreviewVision,
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

  if (!isGm || (tool !== "fog" && tool !== "darkness")) {
    return null;
  }

  const isDarknessMode = tool === "darkness";
  const activeLayer: "fog" | "darkness" = isDarknessMode ? "darkness" : "fog";
  const isDarknessOn = (scene.ambient_light ?? 1) < 0.99;
  const activeRevealMode: RevealMode = isDarknessMode
    ? (scene.darkness_reveal_mode ?? "vision")
    : (scene.fog_reveal_mode ?? "trail");
  const activeExploredCount = isDarknessMode
    ? darknessExploredCount
    : exploredCount;
  const handleSetRevealMode = (mode: RevealMode) => {
    if (isDarknessMode) {
      onChangeDarknessRevealMode(mode);
    } else {
      onChangeFogRevealMode(mode);
    }
  };

  return (
    <div
      className={`pointer-events-auto absolute top-14 left-1/2 z-20 flex max-w-[92vw] -translate-x-1/2 flex-wrap items-center gap-1 rounded-xl border bg-zinc-950/95 px-2 py-1.5 text-xs shadow-2xl backdrop-blur ${
        isDarknessMode ? "border-indigo-400/45" : "border-amber-500/35"
      }`}
    >
      {isDarknessMode ? (
        <button
          type="button"
          onClick={() => onChangeAmbientLight(isDarknessOn ? 1 : 0.98)}
          title="Ligar ou desligar a camada de Escuridão (global e blocos)"
          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-bold transition ${
            isDarknessOn
              ? "border-indigo-400/60 bg-indigo-500/25 text-indigo-200"
              : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-indigo-200"
          }`}
        >
          <Moon className="h-3.5 w-3.5" />
          Escuridão {isDarknessOn ? "ON" : "OFF"}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onToggleFogEnabled(!scene.fog_enabled)}
          title="Ligar ou desligar a camada de Névoa / Nuvem"
          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-bold transition ${
            scene.fog_enabled
              ? "border-amber-500/50 bg-amber-500/20 text-amber-200"
              : "border-zinc-700 bg-zinc-800 text-zinc-400"
          }`}
        >
          <CloudFog className="h-3.5 w-3.5" />
          Névoa {scene.fog_enabled ? "ON" : "OFF"}
        </button>
      )}

      <div className="mx-0.5 h-4 w-px bg-zinc-800" />

      {/* Modalidade de passagem dos tokens: Some de vez vs Apenas Raio de Visão */}
      <div
        className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900 p-0.5"
        title={
          isDarknessMode
            ? "Comportamento da escuridão quando um personagem passa"
            : "Comportamento da névoa quando um personagem passa"
        }
      >
        <button
          type="button"
          onClick={() => handleSetRevealMode("trail")}
          title="Onde o personagem passa fica visível de vez (não volta a cobrir)"
          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition ${
            activeRevealMode === "trail"
              ? isDarknessMode
                ? "bg-indigo-500 text-white"
                : "bg-amber-500 text-zinc-950"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Some de vez
        </button>
        <button
          type="button"
          onClick={() => handleSetRevealMode("vision")}
          title="Mapa aparece apenas dentro do raio de visão/luz atual do personagem"
          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition ${
            activeRevealMode === "vision"
              ? isDarknessMode
                ? "bg-indigo-500 text-white"
                : "bg-amber-500 text-zinc-950"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Raio de Visão
        </button>
      </div>

      <div className="mx-0.5 h-4 w-px bg-zinc-800" />

      <button
        type="button"
        onClick={() => setFogToolConfig({ operation: "cover" })}
        className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold transition ${
          fogToolConfig.operation === "cover"
            ? isDarknessMode
              ? "bg-indigo-500 text-white"
              : "bg-amber-500 text-zinc-950"
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
          title={
            isDarknessMode
              ? "Excluir bloco de escuridão selecionado (Delete)"
              : "Excluir bloco de névoa selecionado (Delete)"
          }
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

      {activeRevealMode === "trail" && activeExploredCount > 0 && (
        <button
          type="button"
          onClick={() => onResetExplored(activeLayer)}
          title={
            isDarknessMode
              ? "Apagar o rastro de luz já desbravado pelos tokens"
              : "Apagar o rastro das áreas já exploradas pelos tokens"
          }
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] font-medium text-sky-200 hover:bg-zinc-800"
        >
          <Footprints className="h-3 w-3" />
          <span className="hidden md:inline">Rastro</span>
        </button>
      )}

      <button
        type="button"
        onClick={() => onClearAllLayer(activeLayer)}
        title={
          isDarknessMode
            ? "Limpar somente os blocos de escuridão desta cena"
            : "Limpar somente a névoa desta cena"
        }
        className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 font-medium text-rose-300 hover:bg-rose-500/20"
      >
        <Eraser className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Limpar</span>
      </button>

      {/* Popover de Ajustes específico do modo ativo (Névoa OU Escuridão) */}
      <div ref={settingsRef} className="relative">
        <button
          type="button"
          onClick={() => setSettingsOpen((v) => !v)}
          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-semibold transition ${
            settingsOpen
              ? isDarknessMode
                ? "border-indigo-400 bg-zinc-800 text-indigo-200"
                : "border-amber-400 bg-zinc-800 text-amber-200"
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
          <div
            className={`absolute top-full right-0 z-30 mt-2 w-72 space-y-2.5 rounded-2xl border bg-zinc-950/95 p-3 text-xs shadow-2xl backdrop-blur ${
              isDarknessMode ? "border-indigo-400/40" : "border-amber-500/35"
            }`}
          >
            {!isDarknessMode ? (
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
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-400">
                  Preview Visão do Token
                </span>
                <button
                  type="button"
                  onClick={() => setGmPreviewVision(!gmPreviewVision)}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold ${
                    gmPreviewVision
                      ? "border-sky-500/50 bg-sky-500/20 text-sky-200"
                      : "border-zinc-700 bg-zinc-900 text-zinc-400"
                  }`}
                >
                  <Eye className="h-3 w-3" />
                  {gmPreviewVision ? "ON" : "OFF"}
                </button>
              </div>
            )}

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

            {isDarknessMode ? (
              <div className="space-y-1 border-t border-zinc-800/80 pt-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400">Luz Ambiente Global</span>
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
                  onChange={(e) =>
                    onChangeAmbientLight(Number(e.target.value))
                  }
                  className="w-full accent-indigo-400"
                />
                <p className="text-[10px] text-zinc-500">
                  98% = apenas blocos pintados · menor = escurece o mapa todo
                </p>
              </div>
            ) : (
              <div className="space-y-1 border-t border-zinc-800/80 pt-2">
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
                  onChange={(e) =>
                    onChangeFogIntensity(Number(e.target.value))
                  }
                  className="w-full accent-amber-400"
                />
              </div>
            )}

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
                  onCoverAllLayer(activeLayer);
                  setSettingsOpen(false);
                }}
                className={`w-full rounded-xl border py-1.5 text-[11px] font-bold transition ${
                  isDarknessMode
                    ? "border-indigo-400/40 bg-indigo-500/20 text-indigo-200 hover:bg-indigo-500/30"
                    : "border-amber-500/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25"
                }`}
              >
                {isDarknessMode
                  ? "Cobrir Todo o Mapa com Escuridão"
                  : "Cobrir Todo o Mapa com Névoa"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
