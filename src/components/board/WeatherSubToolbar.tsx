"use client";

import { CloudRain, Eraser, MousePointer, Square, Trash2 } from "lucide-react";
import { WEATHER_PRESET_OPTIONS } from "@/lib/board/weatherPresets";
import { useBoardStore } from "@/stores/boardStore";
import type {
  Scene,
  SceneElement,
  SceneElementData,
  WeatherPreset,
} from "@/types/domain";

export default function WeatherSubToolbar({
  scene,
  isGm,
  sceneProps,
  selectedElement,
  onSelectElement,
  onUpdateSceneWeather,
  onUpdateElementWeather,
  onDeleteElement,
}: {
  scene: Scene;
  isGm: boolean;
  sceneProps: SceneElement[];
  selectedElement: SceneElement | null;
  onSelectElement: (id: string | null) => void;
  onUpdateSceneWeather: (patch: {
    weatherPreset?: WeatherPreset;
    weatherIntensity?: number;
  }) => void;
  onUpdateElementWeather: (
    elementId: string,
    patch: { weatherPreset?: WeatherPreset; weatherIntensity?: number }
  ) => void;
  onDeleteElement: (elementId: string) => void;
}) {
  const { tool, weatherToolConfig, setWeatherToolConfig } = useBoardStore();

  if (!isGm || tool !== "weather") {
    return null;
  }

  const targetBlock =
    selectedElement &&
    (selectedElement.kind === "image" || selectedElement.kind === "rect")
      ? selectedElement
      : null;
  const targetData = (targetBlock?.data ?? {}) as SceneElementData;
  const targetPreset = targetData.weatherPreset ?? "none";
  const targetIntensity = targetData.weatherIntensity ?? 0.6;
  const isWeatherOnlyZone =
    targetBlock?.kind === "rect" && targetData.label === "__weather_zone__";

  return (
    <div className="pointer-events-auto absolute top-14 left-1/2 z-20 flex max-w-[95vw] -translate-x-1/2 flex-wrap items-center gap-2 rounded-xl border border-sky-500/40 bg-zinc-950/95 px-3 py-1.5 text-xs shadow-2xl backdrop-blur">
      {/* Clima Global da Cena */}
      <div className="flex items-center gap-1.5" title="Clima Global da Cena">
        <CloudRain className="h-3.5 w-3.5 text-sky-300" />
        <span className="hidden text-[11px] font-semibold text-zinc-400 sm:inline">
          Cena Toda:
        </span>
        <select
          value={scene.weather_preset ?? "none"}
          onChange={(e) =>
            onUpdateSceneWeather({
              weatherPreset: e.target.value as WeatherPreset,
            })
          }
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-200"
        >
          {WEATHER_PRESET_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
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
                onUpdateSceneWeather({
                  weatherIntensity: Number(e.target.value),
                })
              }
              title="Intensidade do Clima Global"
              className="w-16 accent-sky-400"
            />
            <span className="w-8 font-mono text-[10px] text-sky-200">
              {Math.round((scene.weather_intensity ?? 0.5) * 100)}%
            </span>
          </>
        )}
      </div>

      <div className="h-4 w-px bg-zinc-800" />

      {/* Alternar entre Selecionar Peça/Mapa Extra OU Desenhar Bloco de Clima */}
      <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900 p-0.5">
        <button
          type="button"
          onClick={() => setWeatherToolConfig({ mode: "select" })}
          title="Clique em qualquer mapa extra ou peça para escolher o clima só nele"
          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold transition ${
            weatherToolConfig.mode === "select"
              ? "bg-sky-500/25 text-sky-200"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <MousePointer className="h-3 w-3" />
          Escolher Bloco
        </button>
        <button
          type="button"
          onClick={() => setWeatherToolConfig({ mode: "draw" })}
          title="Arraste no grid para criar um novo bloco de clima"
          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold transition ${
            weatherToolConfig.mode === "draw"
              ? "bg-sky-500 text-zinc-950"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Square className="h-3 w-3" />
          Desenhar Bloco
        </button>
      </div>

      {/* Quando está desenhando um novo bloco: escolher clima padrão do pincel */}
      {weatherToolConfig.mode === "draw" && (
        <div className="flex items-center gap-1.5">
          <select
            value={weatherToolConfig.preset}
            onChange={(e) =>
              setWeatherToolConfig({
                preset: e.target.value as WeatherPreset,
              })
            }
            title="Clima aplicado ao novo bloco desenhado"
            className="rounded-lg border border-sky-500/40 bg-zinc-900 px-2 py-1 text-[11px] text-sky-200"
          >
            {WEATHER_PRESET_OPTIONS.filter((o) => o.value !== "none").map(
              (opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              )
            )}
          </select>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={weatherToolConfig.intensity}
            onChange={(e) =>
              setWeatherToolConfig({ intensity: Number(e.target.value) })
            }
            className="w-16 accent-sky-400"
          />
        </div>
      )}

      {/* Seletor rápido dos blocos / mapas extras da cena */}
      {sceneProps.length > 0 && (
        <select
          value={targetBlock?.id ?? ""}
          onChange={(e) => onSelectElement(e.target.value || null)}
          title="Escolha um mapa extra ou bloco de clima desta cena"
          className="max-w-[160px] rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-200"
        >
          <option value="">Selecionar Bloco/Mapa ({sceneProps.length})...</option>
          {sceneProps.map((p, idx) => {
            const pd = (p.data ?? {}) as SceneElementData;
            const name =
              pd.label && pd.label !== "__weather_zone__"
                ? pd.label
                : p.kind === "image"
                  ? `Mapa Extra ${idx + 1}`
                  : `Zona Clima ${idx + 1}`;
            return (
              <option key={p.id} value={p.id}>
                {name}
                {pd.weatherPreset && pd.weatherPreset !== "none" ? " • *" : ""}
              </option>
            );
          })}
        </select>
      )}

      {/* Controles de clima do bloco/mapa extra selecionado */}
      {targetBlock && (
        <div className="flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/10 px-2 py-1">
          <span className="max-w-[110px] truncate text-[11px] font-semibold text-sky-200">
            {targetData.label && targetData.label !== "__weather_zone__"
              ? targetData.label
              : targetBlock.kind === "image"
                ? "Mapa Extra"
                : "Zona Clima"}
            :
          </span>
          <select
            value={targetPreset}
            onChange={(e) =>
              onUpdateElementWeather(targetBlock.id, {
                weatherPreset: e.target.value as WeatherPreset,
                weatherIntensity: targetIntensity,
              })
            }
            className="rounded-md border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-[11px] text-white"
          >
            {WEATHER_PRESET_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {targetPreset !== "none" && (
            <>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={targetIntensity}
                onChange={(e) =>
                  onUpdateElementWeather(targetBlock.id, {
                    weatherPreset: targetPreset,
                    weatherIntensity: Number(e.target.value),
                  })
                }
                className="w-14 accent-sky-400"
              />
              <button
                type="button"
                title="Remover clima deste bloco"
                onClick={() =>
                  onUpdateElementWeather(targetBlock.id, {
                    weatherPreset: "none",
                  })
                }
                className="rounded p-0.5 text-zinc-400 hover:bg-zinc-800 hover:text-rose-300"
              >
                <Eraser className="h-3 w-3" />
              </button>
            </>
          )}
          {isWeatherOnlyZone && (
            <button
              type="button"
              title="Excluir bloco de clima"
              onClick={() => onDeleteElement(targetBlock.id)}
              className="rounded p-0.5 text-rose-300 hover:bg-rose-500/20"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
