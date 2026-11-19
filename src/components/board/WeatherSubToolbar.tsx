"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  CloudRain,
  Eraser,
  Layers,
  MousePointer,
  Square,
  Trash2,
} from "lucide-react";
import {
  formatWeatherBadge,
  hasActiveWeather,
} from "@/lib/board/weatherPresets";
import { useBoardStore } from "@/stores/boardStore";
import WeatherMultiPicker from "./WeatherMultiPicker";
import type {
  Scene,
  SceneElement,
  SceneElementData,
  WeatherPreset,
} from "@/types/domain";

function getBlockDisplayName(p: SceneElement, idx: number): string {
  const pd = (p.data ?? {}) as SceneElementData;
  if (pd.label && pd.label !== "__weather_zone__") return pd.label;
  return p.kind === "image" ? `Mapa Extra ${idx + 1}` : `Zona Clima ${idx + 1}`;
}

export default function WeatherSubToolbar({
  scene,
  isGm,
  sceneProps,
  selectedElement,
  onSelectElement,
  onUpdateSceneWeather,
  onUpdateElementsWeather,
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
  onUpdateElementsWeather: (
    elementIds: string[],
    patch: { weatherPreset?: WeatherPreset; weatherIntensity?: number }
  ) => void;
  onDeleteElement: (elementId: string) => void;
}) {
  const {
    tool,
    weatherToolConfig,
    setWeatherToolConfig,
    weatherSelectedIds,
    setWeatherSelectedIds,
    toggleWeatherSelectedId,
  } = useBoardStore();
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [pickerOpen]);

  if (!isGm || tool !== "weather") {
    return null;
  }

  const validSelectedIds = weatherSelectedIds.filter((id) =>
    sceneProps.some((p) => p.id === id)
  );
  const effectiveIds =
    validSelectedIds.length > 0
      ? validSelectedIds
      : selectedElement &&
          (selectedElement.kind === "image" || selectedElement.kind === "rect")
        ? [selectedElement.id]
        : [];
  const selectedBlocks = sceneProps.filter((p) => effectiveIds.includes(p.id));
  const primaryBlock = selectedBlocks[0] ?? null;
  const primaryData = (primaryBlock?.data ?? {}) as SceneElementData;
  const targetPreset = primaryData.weatherPreset ?? "none";
  const targetIntensity = primaryData.weatherIntensity ?? 0.6;
  const isSingleWeatherZone =
    selectedBlocks.length === 1 &&
    primaryBlock?.kind === "rect" &&
    primaryData.label === "__weather_zone__";

  return (
    <div className="pointer-events-auto absolute top-14 left-1/2 z-20 flex max-w-[95vw] -translate-x-1/2 flex-wrap items-center gap-2 rounded-xl border border-sky-500/40 bg-zinc-950/95 px-3 py-1.5 text-xs shadow-2xl backdrop-blur">
      {/* Clima Global da Cena */}
      <div className="flex items-center gap-1.5" title="Clima Global da Cena">
        <CloudRain className="h-3.5 w-3.5 text-sky-300" />
        <span className="hidden text-[11px] font-semibold text-zinc-400 sm:inline">
          Cena Toda:
        </span>
        <WeatherMultiPicker
          value={scene.weather_preset ?? "none"}
          onChange={(nextPreset) =>
            onUpdateSceneWeather({
              weatherPreset: nextPreset,
            })
          }
          title="Escolher um ou mais climas simultâneos para a cena toda"
        />
        {hasActiveWeather(scene.weather_preset) && (
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

      {/* Alternar entre Escolher Mapas/Blocos OU Desenhar Bloco de Clima */}
      <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-900 p-0.5">
        <button
          type="button"
          onClick={() => setWeatherToolConfig({ mode: "select" })}
          title="Clique em um mapa ou use Shift+Clique para marcar vários mapas no tabuleiro"
          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold transition ${
            weatherToolConfig.mode === "select"
              ? "bg-sky-500/25 text-sky-200"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <MousePointer className="h-3 w-3" />
          Escolher Mapas
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

      {/* Quando está desenhando um novo bloco */}
      {weatherToolConfig.mode === "draw" && (
        <div className="flex items-center gap-1.5">
          <WeatherMultiPicker
            value={weatherToolConfig.preset}
            onChange={(nextPreset) =>
              setWeatherToolConfig({
                preset: nextPreset === "none" ? "rain" : nextPreset,
              })
            }
            title="Climas aplicados ao novo bloco desenhado"
          />
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

      {/* Popover Multi-Seleção de Mapas Extras & Blocos */}
      {sceneProps.length > 0 && (
        <div ref={pickerRef} className="relative">
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
              selectedBlocks.length > 0
                ? "border-sky-400/60 bg-sky-500/20 text-sky-200"
                : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-sky-500/40"
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-sky-300" />
            <span>
              {selectedBlocks.length > 0
                ? `${selectedBlocks.length} selecionado${selectedBlocks.length > 1 ? "s" : ""}`
                : `Mapas / Blocos (${sceneProps.length})`}
            </span>
            <ChevronDown
              className={`h-3 w-3 transition-transform ${
                pickerOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {pickerOpen && (
            <div className="absolute top-full left-0 z-30 mt-2 w-72 rounded-2xl border border-sky-500/35 bg-zinc-950/95 p-2.5 text-xs shadow-2xl backdrop-blur">
              <div className="mb-2 flex items-center justify-between border-b border-zinc-800 pb-1.5 text-[11px]">
                <span className="font-semibold text-sky-200">
                  Marcar vários mapas / blocos
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = sceneProps.map((p) => p.id);
                      setWeatherSelectedIds(allIds);
                      onSelectElement(allIds[0] ?? null);
                    }}
                    className="text-[10px] font-semibold text-amber-300 hover:underline"
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWeatherSelectedIds([]);
                      onSelectElement(null);
                    }}
                    className="text-[10px] text-zinc-400 hover:text-zinc-200"
                  >
                    Limpar
                  </button>
                </div>
              </div>

              <div className="max-h-52 space-y-1 overflow-y-auto pr-0.5">
                {sceneProps.map((p, idx) => {
                  const checked = effectiveIds.includes(p.id);
                  const pd = (p.data ?? {}) as SceneElementData;
                  const activeWeather = hasActiveWeather(pd.weatherPreset)
                    ? formatWeatherBadge(pd.weatherPreset)
                    : null;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        if (
                          validSelectedIds.length === 0 &&
                          selectedElement &&
                          selectedElement.id !== p.id &&
                          effectiveIds.includes(selectedElement.id)
                        ) {
                          setWeatherSelectedIds([selectedElement.id, p.id]);
                        } else {
                          toggleWeatherSelectedId(p.id);
                        }
                        onSelectElement(p.id);
                      }}
                      className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-[11px] transition ${
                        checked
                          ? "border-sky-400/60 bg-sky-500/15 text-white"
                          : "border-zinc-800 bg-zinc-900/70 text-zinc-300 hover:border-zinc-700"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          checked
                            ? "border-sky-400 bg-sky-500 text-zinc-950"
                            : "border-zinc-600 text-transparent"
                        }`}
                      >
                        <Check className="h-3 w-3" />
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {getBlockDisplayName(p, idx)}
                      </span>
                      {activeWeather && (
                        <span className="shrink-0 rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] text-sky-200">
                          {activeWeather}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="mt-2 border-t border-zinc-800/80 pt-1.5 text-[10px] text-zinc-500">
                Dica: também pode segurar <strong className="text-zinc-300">Shift + Clique</strong> direto nos mapas do tabuleiro.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Controles em lote para 1 ou vários blocos/mapas selecionados */}
      {selectedBlocks.length > 0 && (
        <div className="flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/10 px-2 py-1">
          <span className="max-w-[130px] truncate text-[11px] font-semibold text-sky-200">
            {selectedBlocks.length > 1
              ? `${selectedBlocks.length} mapas:`
              : `${getBlockDisplayName(selectedBlocks[0]!, 0)}:`}
          </span>
          <WeatherMultiPicker
            value={targetPreset}
            onChange={(nextPreset) =>
              onUpdateElementsWeather(effectiveIds, {
                weatherPreset: nextPreset,
                weatherIntensity: targetIntensity,
              })
            }
            title="Aplicar ou combinar vários climas nos blocos/mapas selecionados"
            align="right"
          />
          {hasActiveWeather(targetPreset) && (
            <>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={targetIntensity}
                onChange={(e) =>
                  onUpdateElementsWeather(effectiveIds, {
                    weatherPreset: targetPreset,
                    weatherIntensity: Number(e.target.value),
                  })
                }
                className="w-14 accent-sky-400"
              />
              <button
                type="button"
                title="Remover clima dos mapas selecionados"
                onClick={() =>
                  onUpdateElementsWeather(effectiveIds, {
                    weatherPreset: "none",
                  })
                }
                className="rounded p-0.5 text-zinc-400 hover:bg-zinc-800 hover:text-rose-300"
              >
                <Eraser className="h-3 w-3" />
              </button>
            </>
          )}
          {isSingleWeatherZone && primaryBlock && (
            <button
              type="button"
              title="Excluir bloco de clima"
              onClick={() => onDeleteElement(primaryBlock.id)}
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
