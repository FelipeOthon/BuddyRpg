"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  Compass,
  Dices,
  Globe,
  Loader2,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import {
  buildAiBattlemapUrl,
  canvasToMapFile,
  drawGeneratedMapToCanvas,
  FORGOTTEN_REALMS_PRESETS,
  generateProceduralMap,
  type MapBiome,
  type MapPreset,
} from "@/lib/board/mapGenerator";
import {
  CURATED_BATTLEMAPS,
  type CuratedMapItem,
} from "@/lib/board/curatedAssets";
import { uploadCampaignImage } from "@/lib/utils/storage";
import type { Scene } from "@/types/domain";

type StudioTab = "procedural" | "curated" | "presets" | "ai_url";

export default function MapStudioModal({
  campaignId,
  scene,
  onClose,
  onApplyMap,
}: {
  campaignId: string;
  scene: Scene;
  onClose: () => void;
  onApplyMap: (payload: {
    mapUrl: string;
    width: number;
    height: number;
    sceneName?: string;
  }) => Promise<void>;
}) {
  const [tab, setTab] = useState<StudioTab>("procedural");
  const [biome, setBiome] = useState<MapBiome>("undermountain");
  const [cols, setCols] = useState(24);
  const [rows, setRows] = useState(18);
  const [seed, setSeed] = useState("faerun-undermountain-01");

  // Aba IA / URL
  const [aiPrompt, setAiPrompt] = useState(
    "Ruínas de um templo élfico antigo na Floresta de Cormyr com rio subterrâneo e altar arcano"
  );
  const [externalUrl, setExternalUrl] = useState("");
  const [previewAiUrl, setPreviewAiUrl] = useState<string | null>(null);

  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const mapData = useMemo(
    () =>
      generateProceduralMap({
        biome,
        cols,
        rows,
        seed,
      }),
    [biome, cols, rows, seed]
  );

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    drawGeneratedMapToCanvas(canvas, mapData, 32);
  }, [mapData]);

  const randomizeSeed = () => {
    setSeed(`faerun-${biome}-${Math.floor(Math.random() * 999999)}`);
  };

  const handleSelectPreset = (preset: MapPreset) => {
    setBiome(preset.biome);
    setCols(preset.cols);
    setRows(preset.rows);
    setSeed(preset.seed);
    setTab("procedural");
  };

  const handleApplyCurated = async (item: CuratedMapItem) => {
    setError(null);
    setIsApplying(true);
    try {
      const gridPx = Math.max(scene.grid_size || 70, 20);
      await onApplyMap({
        mapUrl: item.url,
        width: item.cols * gridPx,
        height: item.rows * gridPx,
        sceneName: item.title,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível aplicar o mapa pronto."
      );
    } finally {
      setIsApplying(false);
    }
  };

  const handleApplyProcedural = async () => {
    setError(null);
    setIsApplying(true);
    try {
      const exportCanvas = document.createElement("canvas");
      const cellSize = scene.grid_size || 70;
      drawGeneratedMapToCanvas(exportCanvas, mapData, cellSize);

      const file = await canvasToMapFile(
        exportCanvas,
        `forja-${biome}-${Date.now()}.png`
      );
      const uploaded = await uploadCampaignImage({
        bucket: "maps",
        campaignId,
        file,
      });

      await onApplyMap({
        mapUrl: uploaded.publicUrl,
        width: mapData.cols * cellSize,
        height: mapData.rows * cellSize,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao gerar e enviar mapa."
      );
    } finally {
      setIsApplying(false);
    }
  };

  const handleGenerateAiPreview = () => {
    if (!aiPrompt.trim()) return;
    const url = buildAiBattlemapUrl(
      aiPrompt,
      1400,
      1050,
      String(Date.now())
    );
    setPreviewAiUrl(url);
    setExternalUrl(url);
  };

  const handleApplyExternalUrl = async () => {
    const targetUrl = externalUrl.trim();
    if (!targetUrl.startsWith("http")) {
      setError("Informe uma URL válida começando com http:// ou https://.");
      return;
    }

    setError(null);
    setIsApplying(true);
    try {
      await onApplyMap({
        mapUrl: targetUrl,
        width: (scene.grid_size || 70) * 24,
        height: (scene.grid_size || 70) * 18,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao aplicar URL do mapa."
      );
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="fr-parchment flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl shadow-2xl">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-amber-500/30 bg-zinc-950/90 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Wand2 className="h-5 w-5 text-amber-400" />
            <div>
              <h2 className="font-display text-lg font-extrabold text-amber-100">
                Forja de Mapas de Faerûn — {scene.name}
              </h2>
              <p className="text-xs text-zinc-400">
                Gere masmorras alinhadas à grade, escolha encontros de Forgotten
                Realms ou crie battlemaps por IA
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Abas do Estúdio */}
        <div className="grid grid-cols-2 gap-1.5 border-b border-amber-500/20 bg-zinc-950/70 p-2 sm:grid-cols-4">
          <button
            type="button"
            onClick={() => setTab("procedural")}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
              tab === "procedural"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 shadow"
                : "text-zinc-400 hover:text-amber-200"
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            1. Forja 2D
          </button>
          <button
            type="button"
            onClick={() => setTab("curated")}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
              tab === "curated"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 shadow"
                : "text-zinc-400 hover:text-amber-200"
            }`}
          >
            <Wand2 className="h-3.5 w-3.5" />
            2. Mapas Prontos
          </button>
          <button
            type="button"
            onClick={() => setTab("presets")}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
              tab === "presets"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 shadow"
                : "text-zinc-400 hover:text-amber-200"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            3. Presets Faerûn
          </button>
          <button
            type="button"
            onClick={() => setTab("ai_url")}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
              tab === "ai_url"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 shadow"
                : "text-zinc-400 hover:text-amber-200"
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            4. IA &amp; URL
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {tab === "procedural" && (
            <div className="grid gap-5 lg:grid-cols-12">
              <div className="space-y-3.5 lg:col-span-5">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-amber-300">
                    Bioma de Forgotten Realms
                  </label>
                  <select
                    value={biome}
                    onChange={(e) => setBiome(e.target.value as MapBiome)}
                    className="w-full rounded-xl border border-amber-500/30 bg-zinc-950 px-3 py-2 text-xs font-semibold text-white"
                  >
                    <option value="undermountain">
                      🏰 Masmorra de Pedra (Undermountain)
                    </option>
                    <option value="underdark">
                      🍄 Caverna Subterrânea (Underdark)
                    </option>
                    <option value="cormyr_forest">
                      🌲 Floresta de Cormyr &amp; Estrada
                    </option>
                    <option value="waterdeep_tavern">
                      🍺 Taverna de Águas Profundas (Waterdeep)
                    </option>
                    <option value="dragon_lair">
                      🌋 Covil do Dragão Vermelho (Magma &amp; Tesouro)
                    </option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-zinc-300">
                      Largura (Quadrados)
                    </label>
                    <input
                      type="number"
                      min={12}
                      max={40}
                      value={cols}
                      onChange={(e) => setCols(Number(e.target.value) || 20)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 font-mono text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-zinc-300">
                      Altura (Quadrados)
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={32}
                      value={rows}
                      onChange={(e) => setRows(Number(e.target.value) || 16)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 font-mono text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-zinc-300">
                    Semente Arcana (Seed)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={seed}
                      onChange={(e) => setSeed(e.target.value)}
                      className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 font-mono text-xs text-amber-300"
                    />
                    <button
                      type="button"
                      onClick={randomizeSeed}
                      className="inline-flex items-center gap-1 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-500/25"
                    >
                      <Dices className="h-3.5 w-3.5" />
                      Sortear
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleApplyProcedural}
                  disabled={isApplying}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-950 shadow-lg transition hover:from-amber-400 hover:to-amber-500 disabled:opacity-60"
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Forjando &amp; Enviando ao Supabase...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Aplicar Este Mapa na Cena
                    </>
                  )}
                </button>
              </div>

              {/* Preview ao Vivo do Canvas */}
              <div className="flex flex-col items-center justify-center rounded-2xl border border-amber-500/25 bg-zinc-950 p-3 lg:col-span-7">
                <canvas
                  ref={previewCanvasRef}
                  className="max-h-[340px] w-full rounded-xl object-contain shadow-inner"
                />
                <p className="mt-2 text-[11px] text-zinc-400">
                  Preview ({cols}×{rows} quadrados · Resolução final:{" "}
                  {cols * (scene.grid_size || 70)}×
                  {rows * (scene.grid_size || 70)}px)
                </p>
              </div>
            </div>
          )}

          {tab === "curated" && (
            <div className="grid gap-4 sm:grid-cols-2">
              {CURATED_BATTLEMAPS.map((item) => (
                <div
                  key={item.id}
                  className="fr-card flex flex-col justify-between overflow-hidden rounded-2xl p-3"
                >
                  <div>
                    <div className="relative mb-2.5 h-36 w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.url}
                        alt={item.title}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute top-2 left-2 rounded-md bg-zinc-950/85 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                        {item.category}
                      </span>
                      <span className="absolute right-2 bottom-2 rounded-md bg-zinc-950/85 px-2 py-0.5 font-mono text-[10px] text-zinc-300">
                        {item.cols}×{item.rows}
                      </span>
                    </div>
                    <h3 className="font-display text-sm font-bold text-amber-100">
                      {item.title}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-zinc-400">
                      {item.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isApplying}
                    onClick={() => void handleApplyCurated(item)}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-2 text-xs font-bold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-50"
                  >
                    {isApplying ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Usar na Cena (Grid Alinhado)
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === "presets" && (
            <div className="grid gap-4 sm:grid-cols-2">
              {FORGOTTEN_REALMS_PRESETS.map((preset) => (
                <div
                  key={preset.id}
                  className="fr-card flex flex-col justify-between rounded-2xl p-4"
                >
                  <div>
                    <h3 className="font-display text-base font-bold text-amber-100">
                      {preset.title}
                    </h3>
                    <p className="mt-1 text-xs text-zinc-400">
                      {preset.subtitle}
                    </p>
                    <p className="mt-2 font-mono text-[11px] text-amber-300/80">
                      Dimensões: {preset.cols}×{preset.rows} quadrados
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 py-2 text-xs font-bold text-amber-200 transition hover:bg-amber-500/30"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    Carregar na Forja e Visualizar
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === "ai_url" && (
            <div className="space-y-4">
              <div className="fr-card space-y-3 rounded-2xl p-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-amber-300">
                  Gerar Battlemap Top-Down por Prompt (IA Gratuita)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Descreva o cenário do encontro em Faerûn..."
                    className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateAiPreview}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-400"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Gerar Mapa IA
                  </button>
                </div>
              </div>

              <div className="fr-card space-y-3 rounded-2xl p-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-amber-300">
                  Ou Colar URL Direta de Qualquer Mapa da Internet
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://exemplo.com/meu-battlemap.jpg"
                    className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 font-mono text-xs text-white"
                  />
                  <button
                    type="button"
                    disabled={isApplying || !externalUrl.trim()}
                    onClick={handleApplyExternalUrl}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
                  >
                    {isApplying ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Aplicar na Cena
                  </button>
                </div>

                {previewAiUrl && (
                  <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewAiUrl}
                      alt="Preview do Mapa IA"
                      className="mx-auto max-h-64 rounded-lg object-contain"
                    />
                    <p className="mt-1.5 text-[11px] text-zinc-400">
                      Clique em &ldquo;Aplicar na Cena&rdquo; acima quando a
                      imagem carregar.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
