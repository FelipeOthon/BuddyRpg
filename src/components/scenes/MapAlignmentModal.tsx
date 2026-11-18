"use client";

import { useRef, useState } from "react";
import { Check, Crosshair, Grid, Move, Sliders, X } from "lucide-react";
import type { GridType, Scene } from "@/types/domain";

export default function MapAlignmentModal({
  scene,
  onClose,
  onApply,
}: {
  scene: Scene;
  onClose: () => void;
  onApply: (patch: {
    grid_size: number;
    grid_offset_x: number;
    grid_offset_y: number;
    grid_type: GridType;
  }) => Promise<void>;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [gridSize, setGridSize] = useState(scene.grid_size || 70);
  const [offsetX, setOffsetX] = useState(scene.grid_offset_x ?? 0);
  const [offsetY, setOffsetY] = useState(scene.grid_offset_y ?? 0);
  const [gridType, setGridType] = useState<GridType>(
    scene.grid_type ?? "square"
  );
  const [saving, setSaving] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);
  const [boxStart, setBoxStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [boxEnd, setBoxEnd] = useState<{ x: number; y: number } | null>(null);

  const mapWidth = scene.map_width || 2000;
  const mapHeight = scene.map_height || 2000;
  const previewScale = Math.min(640 / mapWidth, 380 / mapHeight, 1);

  const toWorld = (clientX: number, clientY: number) => {
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: Math.round((clientX - rect.left) / previewScale),
      y: Math.round((clientY - rect.top) / previewScale),
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pt = toWorld(e.clientX, e.clientY);
    if (step === 1) {
      setOffsetX(pt.x % Math.max(gridSize, 10));
      setOffsetY(pt.y % Math.max(gridSize, 10));
    } else if (step === 2) {
      setBoxStart(pt);
      setBoxEnd(pt);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (step === 2 && boxStart) {
      setBoxEnd(toWorld(e.clientX, e.clientY));
    }
  };

  const handleMouseUp = () => {
    if (step === 2 && boxStart && boxEnd) {
      const w = Math.abs(boxEnd.x - boxStart.x);
      const h = Math.abs(boxEnd.y - boxStart.y);
      const avg = (w + h) / 2;
      if (avg >= 30) {
        const computed = Math.min(Math.max(Math.round(avg / 3), 15), 300);
        setGridSize(computed);
      }
      setBoxStart(null);
      setBoxEnd(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await onApply({
      grid_size: gridSize,
      grid_offset_x: offsetX,
      grid_offset_y: offsetY,
      grid_type: gridType,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-amber-500/30 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Grid className="h-4 w-4 text-amber-400" />
            <h3 className="font-display text-sm font-bold text-white">
              Alinhamento de Grade em 3 Passos
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Passos */}
        <div className="grid grid-cols-3 border-b border-zinc-800 bg-zinc-950/60 text-xs">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex items-center justify-center gap-1.5 py-2.5 font-semibold ${
              step === 1
                ? "border-b-2 border-amber-400 text-amber-300"
                : "text-zinc-400"
            }`}
          >
            <Crosshair className="h-3.5 w-3.5" />
            1. Offset (Cruzamento)
          </button>
          <button
            type="button"
            onClick={() => setStep(2)}
            className={`flex items-center justify-center gap-1.5 py-2.5 font-semibold ${
              step === 2
                ? "border-b-2 border-amber-400 text-amber-300"
                : "text-zinc-400"
            }`}
          >
            <Move className="h-3.5 w-3.5" />
            2. Medir 3×3 Células
          </button>
          <button
            type="button"
            onClick={() => setStep(3)}
            className={`flex items-center justify-center gap-1.5 py-2.5 font-semibold ${
              step === 3
                ? "border-b-2 border-amber-400 text-amber-300"
                : "text-zinc-400"
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            3. Refino &amp; Tipo
          </button>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-xs text-zinc-300">
            {step === 1 &&
              "Clique exatamente em um cruzamento de linhas da grade desenhada no seu mapa para alinhar a origem."}
            {step === 2 &&
              "Arraste um quadrado cobrindo exatamente 3×3 células do seu mapa para calcular o tamanho (px) automático."}
            {step === 3 &&
              "Ajuste fino de pixel e escolha o formato da grade (Quadrada ou Hexagonal)."}
          </p>

          {/* Preview interativo */}
          <div className="flex justify-center overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <div
              ref={previewRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="relative cursor-crosshair select-none overflow-hidden border border-zinc-700"
              style={{
                width: Math.round(mapWidth * previewScale),
                height: Math.round(mapHeight * previewScale),
                backgroundImage: scene.map_url
                  ? `url(${scene.map_url})`
                  : undefined,
                backgroundSize: "100% 100%",
              }}
            >
              {/* Overlay visual de grade quadrada para alinhamento */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(245,158,11,0.55) 1px, transparent 1px), linear-gradient(to bottom, rgba(245,158,11,0.55) 1px, transparent 1px)",
                  backgroundSize: `${gridSize * previewScale}px ${gridSize * previewScale}px`,
                  backgroundPosition: `${offsetX * previewScale}px ${offsetY * previewScale}px`,
                }}
              />

              {boxStart && boxEnd && (
                <div
                  className="pointer-events-none absolute border-2 border-sky-400 bg-sky-400/20"
                  style={{
                    left: Math.min(boxStart.x, boxEnd.x) * previewScale,
                    top: Math.min(boxStart.y, boxEnd.y) * previewScale,
                    width: Math.abs(boxEnd.x - boxStart.x) * previewScale,
                    height: Math.abs(boxEnd.y - boxStart.y) * previewScale,
                  }}
                />
              )}
            </div>
          </div>

          {/* Controles finos */}
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5">
              <label className="block text-[10px] font-bold uppercase text-zinc-400">
                Tamanho (px)
              </label>
              <div className="mt-1 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setGridSize((g) => Math.max(g - 1, 10))}
                  className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-white"
                >
                  -1
                </button>
                <input
                  type="number"
                  value={gridSize}
                  onChange={(e) => setGridSize(Number(e.target.value) || 70)}
                  className="w-full bg-transparent text-center font-mono text-xs font-bold text-amber-300"
                />
                <button
                  type="button"
                  onClick={() => setGridSize((g) => Math.min(g + 1, 300))}
                  className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-white"
                >
                  +1
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5">
              <label className="block text-[10px] font-bold uppercase text-zinc-400">
                Offset X (px)
              </label>
              <div className="mt-1 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setOffsetX((x) => x - 1)}
                  className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-white"
                >
                  -1
                </button>
                <input
                  type="number"
                  value={offsetX}
                  onChange={(e) => setOffsetX(Number(e.target.value) || 0)}
                  className="w-full bg-transparent text-center font-mono text-xs font-bold text-white"
                />
                <button
                  type="button"
                  onClick={() => setOffsetX((x) => x + 1)}
                  className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-white"
                >
                  +1
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5">
              <label className="block text-[10px] font-bold uppercase text-zinc-400">
                Offset Y (px)
              </label>
              <div className="mt-1 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setOffsetY((y) => y - 1)}
                  className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-white"
                >
                  -1
                </button>
                <input
                  type="number"
                  value={offsetY}
                  onChange={(e) => setOffsetY(Number(e.target.value) || 0)}
                  className="w-full bg-transparent text-center font-mono text-xs font-bold text-white"
                />
                <button
                  type="button"
                  onClick={() => setOffsetY((y) => y + 1)}
                  className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-white"
                >
                  +1
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5">
              <label className="block text-[10px] font-bold uppercase text-zinc-400">
                Tipo de Grade
              </label>
              <select
                value={gridType}
                onChange={(e) => setGridType(e.target.value as GridType)}
                className="mt-1 w-full rounded bg-zinc-900 px-2 py-1 text-xs text-white"
              >
                <option value="square">Quadrada</option>
                <option value="hex_pointy">Hexagonal (Ponta)</option>
                <option value="hex_flat">Hexagonal (Plana)</option>
                <option value="none">Sem Grade</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-800 bg-zinc-950/70 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-400 disabled:opacity-60"
          >
            <Check className="h-3.5 w-3.5" />
            {saving ? "Aplicando..." : "Aplicar Alinhamento"}
          </button>
        </div>
      </div>
    </div>
  );
}
