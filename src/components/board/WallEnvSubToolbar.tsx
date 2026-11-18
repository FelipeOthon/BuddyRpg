"use client";

import {
  BrickWall,
  CloudRain,
  DoorClosed,
  Eye,
  Flame,
  Sun,
  Trash2,
} from "lucide-react";
import { useBoardStore } from "@/stores/boardStore";
import type { Scene, WallType, WeatherPreset } from "@/types/domain";

export default function WallEnvSubToolbar({
  scene,
  isGm,
  onClearWalls,
  onUpdateEnvironment,
}: {
  scene: Scene;
  isGm: boolean;
  onClearWalls: () => void;
  onUpdateEnvironment: (patch: {
    ambientLight?: number;
    weatherPreset?: WeatherPreset;
    weatherIntensity?: number;
  }) => void;
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

      <div className="flex items-center gap-1.5" title="Luz Ambiente da Cena">
        <Sun className="h-3.5 w-3.5 text-amber-300" />
        <span className="text-[11px] text-zinc-400">Luz:</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={scene.ambient_light ?? 1}
          onChange={(e) =>
            onUpdateEnvironment({ ambientLight: Number(e.target.value) })
          }
          className="w-20 accent-amber-400"
        />
        <span className="w-8 font-mono text-[10px] text-amber-200">
          {Math.round((scene.ambient_light ?? 1) * 100)}%
        </span>
      </div>

      <div className="h-4 w-px bg-zinc-800" />

      <div className="flex items-center gap-1.5" title="Clima & Partículas VFX">
        <CloudRain className="h-3.5 w-3.5 text-sky-300" />
        <select
          value={scene.weather_preset ?? "none"}
          onChange={(e) =>
            onUpdateEnvironment({
              weatherPreset: e.target.value as WeatherPreset,
            })
          }
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-200"
        >
          <option value="none">Sem Clima</option>
          <option value="rain">🌧️ Chuva</option>
          <option value="snow">❄️ Neve</option>
          <option value="fog_mist">🌫️ Neblina</option>
          <option value="embers">🔥 Brasas (Embers)</option>
          <option value="ash">🌋 Cinzas</option>
        </select>
        {scene.weather_preset && scene.weather_preset !== "none" && (
          <>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={scene.weather_intensity ?? 0.5}
              onChange={(e) =>
                onUpdateEnvironment({
                  weatherIntensity: Number(e.target.value),
                })
              }
              title="Intensidade do Clima"
              className="w-16 accent-sky-400"
            />
            <span className="w-8 font-mono text-[10px] text-sky-200">
              {Math.round((scene.weather_intensity ?? 0.5) * 100)}%
            </span>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => setGmPreviewVision(!gmPreviewVision)}
        title="Simular exatamente o que o token selecionado enxerga"
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
      </button>
    </div>
  );
}
