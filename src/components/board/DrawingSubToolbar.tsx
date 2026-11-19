"use client";

import { useRef } from "react";
import {
  ArrowDown,
  ArrowUp,
  Circle,
  CloudRain,
  Eraser,
  ImagePlus,
  Layers,
  Link2,
  Lock,
  Minus,
  Pencil,
  Plus,
  RotateCw,
  Square,
  Trash2,
  Triangle,
  Unlock,
} from "lucide-react";
import { WEATHER_PRESET_OPTIONS } from "@/lib/board/weatherPresets";
import { useBoardStore } from "@/stores/boardStore";
import type {
  ElementDepthLayer,
  SceneElement,
  SceneElementData,
  Token,
  WeatherPreset,
} from "@/types/domain";

const DRAW_COLORS = [
  "#f59e0b",
  "#ef4444",
  "#38bdf8",
  "#10b981",
  "#a855f7",
  "#f4f4f5",
] as const;

export default function DrawingSubToolbar({
  sceneId,
  gridSize,
  sceneTokens,
  selectedElement,
  isGm,
  currentUserId,
  onClearDrawings,
  onDeleteElement,
  onUpdateElement,
  onUploadMapProp,
}: {
  sceneId: string;
  gridSize: number;
  sceneTokens: Token[];
  selectedElement: SceneElement | null;
  isGm: boolean;
  currentUserId: string;
  onClearDrawings: (sceneId: string) => void;
  onDeleteElement: (elementId: string) => void;
  onUpdateElement: (
    elementId: string,
    patch: {
      attachedToTokenId?: string | null;
      isLocked?: boolean;
      rotation?: number;
      data?: SceneElementData;
    }
  ) => void;
  onUploadMapProp?: (file: File) => void;
}) {
  const { tool, drawConfig, setDrawConfig } = useBoardStore();
  const propInputRef = useRef<HTMLInputElement>(null);

  const canEditSelected = Boolean(
    selectedElement &&
      (isGm ||
        (selectedElement.created_by === currentUserId &&
          !selectedElement.is_locked))
  );

  if (tool === "weather" || (tool !== "draw" && !selectedElement)) {
    return null;
  }

  const selectedData = (selectedElement?.data ?? {}) as SceneElementData;
  const isImageProp = selectedElement?.kind === "image";
  const isPropOrWeatherBlock =
    selectedElement?.layer === "prop" &&
    (selectedElement.kind === "image" || selectedElement.kind === "rect");
  const currentZLayer: ElementDepthLayer = selectedData.zLayer ?? "above_map";

  const scaleImagePropBy = (deltaCells: number) => {
    if (!selectedElement || !isImageProp) return;
    const step = Math.max(gridSize || 70, 20);
    const curW = Math.max(selectedData.width ?? step * 4, step);
    const curH = Math.max(selectedData.height ?? step * 4, step);
    const ratio = curH / curW;
    const nextW = Math.max(step, Math.round(curW + deltaCells * step));
    const nextH = Math.max(step, Math.round(nextW * ratio));
    onUpdateElement(selectedElement.id, {
      data: {
        ...selectedData,
        width: nextW,
        height: nextH,
      },
    });
  };

  return (
    <>
      {tool === "draw" && (
        <div className="pointer-events-auto absolute top-14 left-1/2 z-20 flex max-w-[calc(100vw-240px)] -translate-x-1/2 flex-wrap items-center gap-1.5 rounded-xl border border-amber-500/30 bg-zinc-950/95 px-2.5 py-1.5 text-xs shadow-2xl backdrop-blur">
          {(
            [
              { kind: "freehand", label: "Pincel", icon: Pencil },
              { kind: "line", label: "Linha", icon: Minus },
              { kind: "rect", label: "Retângulo", icon: Square },
              { kind: "circle", label: "Círculo / Área", icon: Circle },
              { kind: "cone", label: "Cone Magia", icon: Triangle },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = drawConfig.kind === item.kind;
            return (
              <button
                key={item.kind}
                type="button"
                onClick={() => setDrawConfig({ kind: item.kind })}
                title={item.label}
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium transition ${
                  active
                    ? "bg-amber-500 text-zinc-950"
                    : "text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{item.label}</span>
              </button>
            );
          })}

          <div className="mx-0.5 h-4 w-px bg-zinc-800" />

          <div className="flex items-center gap-1">
            {DRAW_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setDrawConfig({ stroke: c, fill: c })}
                className={`h-4 w-4 rounded-full border transition ${
                  drawConfig.stroke === c
                    ? "scale-110 border-white ring-1 ring-white"
                    : "border-zinc-700"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {isGm && onUploadMapProp && (
            <>
              <div className="mx-0.5 h-4 w-px bg-zinc-800" />
              <button
                type="button"
                onClick={() => propInputRef.current?.click()}
                title="Colocar uma peça de mapa ou cenário particionado no grid"
                className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2 py-1 font-semibold text-amber-200 transition hover:bg-amber-500/25"
              >
                <ImagePlus className="h-3.5 w-3.5" />
                <span>+ Peça Mapa</span>
              </button>
              <input
                ref={propInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) onUploadMapProp(file);
                }}
                className="hidden"
              />
            </>
          )}

          <div className="mx-0.5 h-4 w-px bg-zinc-800" />

          <button
            type="button"
            onClick={() => onClearDrawings(sceneId)}
            title="Limpar todos os desenhos e textos da cena"
            className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-rose-300 hover:bg-rose-500/20"
          >
            <Eraser className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Limpar</span>
          </button>
        </div>
      )}

      {selectedElement && (
        <div className="pointer-events-auto absolute bottom-4 left-1/2 z-30 flex max-w-[94vw] -translate-x-1/2 flex-wrap items-center gap-1.5 rounded-2xl border border-amber-500/35 bg-zinc-950/95 px-3 py-1.5 text-xs shadow-2xl backdrop-blur">
          <span className="whitespace-nowrap font-semibold text-amber-300">
            {isImageProp ? "🗺️ Peça de Mapa" : "Item selecionado"}
          </span>

          {canEditSelected && (
            <>
              {isImageProp && (
                <>
                  <button
                    type="button"
                    onClick={() => scaleImagePropBy(-1)}
                    title="Diminuir 1 quadrado"
                    className="inline-flex items-center gap-0.5 rounded-lg border border-zinc-700 bg-zinc-900 px-1.5 py-1 text-zinc-200 hover:border-amber-500/40 hover:text-amber-200"
                  >
                    <Minus className="h-3 w-3" />
                    <span className="text-[10px]">1q</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => scaleImagePropBy(1)}
                    title="Aumentar 1 quadrado"
                    className="inline-flex items-center gap-0.5 rounded-lg border border-zinc-700 bg-zinc-900 px-1.5 py-1 text-zinc-200 hover:border-amber-500/40 hover:text-amber-200"
                  >
                    <Plus className="h-3 w-3" />
                    <span className="text-[10px]">1q</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateElement(selectedElement.id, {
                        rotation: ((selectedElement.rotation ?? 0) + 90) % 360,
                      })
                    }
                    title="Girar peça em 90°"
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-1.5 py-1 text-zinc-200 hover:border-amber-500/40 hover:text-amber-200"
                  >
                    <RotateCw className="h-3 w-3" />
                    <span className="text-[10px]">90°</span>
                  </button>
                </>
              )}

              {isGm && isImageProp && (
                <div className="flex items-center gap-1">
                  <Layers className="h-3 w-3 text-amber-300" />
                  <select
                    value={currentZLayer}
                    onChange={(e) =>
                      onUpdateElement(selectedElement.id, {
                        data: {
                          ...selectedData,
                          zLayer: e.target.value as ElementDepthLayer,
                        },
                      })
                    }
                    title="Camada do asset/mapa no tabuleiro"
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-1.5 py-1 text-[11px] text-zinc-200"
                  >
                    <option value="under_map">Abaixo do Mapa</option>
                    <option value="above_map">Sobre o Mapa</option>
                    <option value="above_tokens">Por Cima (Teto)</option>
                  </select>
                  <button
                    type="button"
                    title="Descer ordem na camada"
                    onClick={() =>
                      onUpdateElement(selectedElement.id, {
                        data: {
                          ...selectedData,
                          zIndex: (selectedData.zIndex ?? 0) - 1,
                        },
                      })
                    }
                    className="rounded-lg border border-zinc-700 bg-zinc-900 p-1 text-zinc-300 hover:text-white"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    title="Subir ordem na camada"
                    onClick={() =>
                      onUpdateElement(selectedElement.id, {
                        data: {
                          ...selectedData,
                          zIndex: (selectedData.zIndex ?? 0) + 1,
                        },
                      })
                    }
                    className="rounded-lg border border-zinc-700 bg-zinc-900 p-1 text-zinc-300 hover:text-white"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                </div>
              )}

              {isGm && isPropOrWeatherBlock && (
                <div className="flex items-center gap-1">
                  <CloudRain className="h-3 w-3 text-sky-300" />
                  <select
                    value={selectedData.weatherPreset ?? "none"}
                    onChange={(e) =>
                      onUpdateElement(selectedElement.id, {
                        data: {
                          ...selectedData,
                          weatherPreset: e.target.value as WeatherPreset,
                          weatherIntensity: selectedData.weatherIntensity ?? 0.6,
                        },
                      })
                    }
                    title="Aplicar clima apenas sobre este bloco / mapa extra"
                    className="rounded-lg border border-sky-500/30 bg-zinc-900 px-1.5 py-1 text-[11px] text-sky-200"
                  >
                    {WEATHER_PRESET_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {!isImageProp && (
                <div className="flex items-center gap-1">
                  <Link2 className="h-3.5 w-3.5 text-zinc-400" />
                  <select
                    value={selectedElement.attached_to_token_id ?? ""}
                    onChange={(e) =>
                      onUpdateElement(selectedElement.id, {
                        attachedToTokenId: e.target.value || null,
                      })
                    }
                    title="Vincular (Attach) a um token para moverem juntos"
                    className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-200"
                  >
                    <option value="">Sem vínculo (Livre)</option>
                    {sceneTokens.map((t) => (
                      <option key={t.id} value={t.id}>
                        Anexar a: {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {isGm && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdateElement(selectedElement.id, {
                      isLocked: !selectedElement.is_locked,
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-zinc-200 hover:text-white"
                >
                  {selectedElement.is_locked ? (
                    <>
                      <Lock className="h-3.5 w-3.5 text-amber-400" />
                      Travado
                    </>
                  ) : (
                    <>
                      <Unlock className="h-3.5 w-3.5" />
                      Travar
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => onDeleteElement(selectedElement.id)}
                title="Excluir item selecionado (Delete / Backspace)"
                className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-rose-500/40 bg-rose-500/15 px-2.5 py-1 font-semibold text-rose-200 hover:bg-rose-500/25"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir (Del)
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
