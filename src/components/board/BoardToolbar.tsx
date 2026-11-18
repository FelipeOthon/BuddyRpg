"use client";

import { useEffect, useState } from "react";
import {
  Crosshair,
  Dices,
  EyeOff,
  Grid,
  Hand,
  Magnet,
  MousePointer,
  Pin,
  Radio,
  RotateCcw,
  Ruler,
  Trash2,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { clamp } from "@/lib/board/geometry";
import {
  setAmbientSoundscape,
  setSoundEnabled,
  type AmbiencePreset,
} from "@/lib/audio/soundEngine";
import { useBoardStore, type BoardTool } from "@/stores/boardStore";
import type { Scene } from "@/types/domain";

export default function BoardToolbar({
  scene,
  isGm,
  onSyncView,
  onClearPinnedRulers,
}: {
  scene: Scene;
  isGm: boolean;
  onSyncView?: (x: number, y: number, scale: number) => void;
  onClearPinnedRulers?: () => void;
}) {
  const {
    tool,
    setTool,
    viewport,
    setViewport,
    resetViewport,
    rulerPinMode,
    setRulerPinMode,
    pinnedRulers,
    uiHidden,
    setUiHidden,
    dice3dEnabled,
    setDice3dEnabled,
  } = useBoardStore();
  const [audioOn, setAudioOn] = useState(true);
  const [ambience, setAmbience] = useState<AmbiencePreset>("none");
  const scenePinnedCount = pinnedRulers.filter(
    (r) => r.sceneId === scene.id
  ).length;

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

      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        setUiHidden(!uiHidden);
        return;
      }

      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === "s" && isGm) {
        e.preventDefault();
        onSyncView?.(viewport.x, viewport.y, viewport.scale);
        return;
      }

      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        resetViewport();
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key === "v" || key === "s") setTool("select");
      else if (key === "h" || key === "w") setTool("pan");
      else if (key === "r" || key === "m") setTool("ruler");
      else if (key === "q") setTool("pointer");
      else if (key === "0") resetViewport();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setTool, resetViewport, uiHidden, setUiHidden, isGm, onSyncView, viewport]);

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
    {
      id: "select",
      label: "Selecionar / Mover Token",
      shortcut: "V",
      icon: MousePointer,
    },
    {
      id: "pan",
      label: "Mover Mapa (ou segure Espaço)",
      shortcut: "H",
      icon: Hand,
    },
    {
      id: "ruler",
      label: "Régua de Distância",
      shortcut: "R",
      icon: Ruler,
    },
    {
      id: "pointer",
      label: "Ponteiro Laser (ou Botão Direito)",
      shortcut: "Q",
      icon: Crosshair,
    },
  ];

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex flex-wrap items-center justify-between gap-2 px-4">
      {/* Ferramentas do Tabuleiro */}
      <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-amber-500/30 bg-zinc-950/90 p-1 shadow-xl backdrop-blur">
        {tools.map((t) => {
          const Icon = t.icon;
          const active = tool === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTool(t.id)}
              title={`${t.label} (${t.shortcut})`}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                active
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 shadow"
                  : "text-zinc-300 hover:bg-zinc-800 hover:text-amber-200"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.label.split(" ")[0]}</span>
              <kbd
                className={`rounded px-1 text-[10px] ${
                  active
                    ? "bg-amber-700/30 text-zinc-950"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {t.shortcut}
              </kbd>
            </button>
          );
        })}

        <div className="mx-1 h-4 w-px bg-zinc-800" />

        {tool === "ruler" && (
          <button
            type="button"
            onClick={() => setRulerPinMode(!rulerPinMode)}
            title="Fixar réguas no mapa ao soltar (ou segure Shift)"
            className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
              rulerPinMode
                ? "border border-purple-500/40 bg-purple-500/20 text-purple-200"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }`}
          >
            <Pin className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Fixar</span>
          </button>
        )}

        {scenePinnedCount > 0 && onClearPinnedRulers && (
          <button
            type="button"
            onClick={onClearPinnedRulers}
            title="Limpar réguas fixadas nesta cena"
            className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Réguas ({scenePinnedCount})</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setDice3dEnabled(!dice3dEnabled)}
          title="Ativar/Desativar Dados 3D rolando no tabuleiro"
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
            dice3dEnabled
              ? "border border-amber-500/40 bg-amber-500/15 text-amber-300"
              : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          }`}
        >
          <Dices className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            3D {dice3dEnabled ? "ON" : "OFF"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            const next = !audioOn;
            setAudioOn(next);
            setSoundEnabled(next);
          }}
          title="Ativar/Desativar efeitos sonoros dos dados e ambiência"
          className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
            audioOn
              ? "text-emerald-300 hover:bg-zinc-800"
              : "text-zinc-500 hover:bg-zinc-800"
          }`}
        >
          {audioOn ? (
            <Volume2 className="h-3.5 w-3.5" />
          ) : (
            <VolumeX className="h-3.5 w-3.5" />
          )}
        </button>

        <select
          value={ambience}
          onChange={(e) => {
            const val = e.target.value as AmbiencePreset;
            setAmbience(val);
            setAmbientSoundscape(val);
          }}
          title="Som Ambiente da Mesa"
          className="hidden rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] font-medium text-amber-200 lg:block"
        >
          <option value="none">🎵 Ambiência: Silêncio</option>
          <option value="tavern_fire">🍺 Taverna (Lareira)</option>
          <option value="sword_coast_rain">🌧️ Chuva na Costa da Espada</option>
          <option value="undermountain_dungeon">🕯️ Masmorra Profunda</option>
        </select>
      </div>

      {/* Informações da Cena */}
      <div className="pointer-events-auto hidden items-center gap-2 rounded-xl border border-amber-500/30 bg-zinc-950/90 px-3.5 py-1.5 text-xs text-zinc-300 shadow-xl backdrop-blur md:flex">
        <Grid className="h-3.5 w-3.5 text-amber-400" />
        <span className="font-display font-bold text-amber-100">
          {scene.name}
        </span>
        {!scene.is_active && isGm && (
          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
            Secreta (Só GM)
          </span>
        )}
        <span className="text-zinc-600">·</span>
        <span>{scene.grid_size}px</span>
        <span className="text-zinc-600">·</span>
        <span>{scene.meters_per_cell}m/q</span>
        <span className="text-zinc-600">·</span>
        <span className="inline-flex items-center gap-1 text-zinc-400">
          <Magnet className="h-3 w-3 text-emerald-400" />
          {scene.snap_to_grid ? "Snap ON" : "Snap OFF"}
        </span>
      </div>

      {/* Controles de Zoom */}
      <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-amber-500/30 bg-zinc-950/90 p-1 shadow-xl backdrop-blur">
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.15)}
          title="Afastar (-)"
          className="rounded-lg p-1.5 text-zinc-300 transition hover:bg-zinc-800 hover:text-amber-200"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={resetViewport}
          title="Resetar Zoom (0)"
          className="min-w-[52px] rounded-lg px-2 py-1 text-center font-mono text-xs font-semibold text-amber-200 transition hover:bg-zinc-800"
        >
          {Math.round(viewport.scale * 100)}%
        </button>
        <button
          type="button"
          onClick={() => zoomBy(1.15)}
          title="Aproximar (+)"
          className="rounded-lg p-1.5 text-zinc-300 transition hover:bg-zinc-800 hover:text-amber-200"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={resetViewport}
          title="Centralizar visão (Ctrl+Alt+R)"
          className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-amber-200"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>

        {isGm && onSyncView && (
          <button
            type="button"
            onClick={() =>
              onSyncView(viewport.x, viewport.y, viewport.scale)
            }
            title="Sincronizar câmera de todos os jogadores com a sua (Ctrl+Alt+S)"
            className="rounded-lg p-1.5 text-amber-300 transition hover:bg-amber-500/15"
          >
            <Radio className="h-3.5 w-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={() => setUiHidden(true)}
          title="Modo Foco: Ocultar menus (Ctrl+Shift+H)"
          className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
        >
          <EyeOff className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
