"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  Check,
  Eye,
  ImagePlus,
  Loader2,
  Plus,
  Radio,
  Save,
  Trash2,
  Wand2,
} from "lucide-react";
import {
  activateSceneAction,
  createSceneAction,
  deleteSceneAction,
  updateSceneSettingsAction,
} from "@/actions/scenes";
import { uploadCampaignImage } from "@/lib/utils/storage";
import { useBoardStore } from "@/stores/boardStore";
import type { DistanceRule, Scene } from "@/types/domain";
import MapStudioModal from "./MapStudioModal";

export default function SceneManager({
  campaignId,
}: {
  campaignId: string;
}) {
  const {
    scenes,
    viewedSceneId,
    setViewedSceneId,
    upsertScene,
    removeScene,
  } = useBoardStore();

  const currentScene =
    scenes.find((s) => s.id === viewedSceneId) ??
    scenes.find((s) => s.is_active) ??
    scenes[0] ??
    null;

  const [newSceneName, setNewSceneName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isMapStudioOpen, setIsMapStudioOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Estado local do formulário sincronizado com a cena selecionada
  const [draftId, setDraftId] = useState<string | null>(
    currentScene?.id ?? null
  );
  const [name, setName] = useState(currentScene?.name ?? "");
  const [mapUrl, setMapUrl] = useState<string | null>(
    currentScene?.map_url ?? null
  );
  const [mapWidth, setMapWidth] = useState(currentScene?.map_width ?? 2000);
  const [mapHeight, setMapHeight] = useState(currentScene?.map_height ?? 2000);
  const [gridSize, setGridSize] = useState(currentScene?.grid_size ?? 70);
  const [gridOpacity, setGridOpacity] = useState(
    currentScene?.grid_opacity ?? 0.4
  );
  const [snapToGrid, setSnapToGrid] = useState(
    currentScene?.snap_to_grid ?? true
  );
  const [metersPerCell, setMetersPerCell] = useState(
    currentScene?.meters_per_cell ?? 1.5
  );
  const [distanceRule, setDistanceRule] = useState<DistanceRule>(
    currentScene?.distance_rule ?? "chebyshev"
  );

  const loadSceneIntoForm = (s: Scene) => {
    setDraftId(s.id);
    setName(s.name);
    setMapUrl(s.map_url);
    setMapWidth(s.map_width);
    setMapHeight(s.map_height);
    setGridSize(s.grid_size);
    setGridOpacity(s.grid_opacity);
    setSnapToGrid(s.snap_to_grid);
    setMetersPerCell(s.meters_per_cell);
    setDistanceRule(s.distance_rule);
  };

  if (currentScene && draftId !== currentScene.id) {
    loadSceneIntoForm(currentScene);
  }

  const handleCreateScene = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSceneName.trim()) return;
    setError(null);

    startTransition(async () => {
      const res = await createSceneAction({
        campaignId,
        name: newSceneName,
      });
      if (!res.ok || !res.scene) {
        setError(res.error ?? "Erro ao criar cena.");
        return;
      }
      setNewSceneName("");
      upsertScene(res.scene);
      setViewedSceneId(res.scene.id);
      loadSceneIntoForm(res.scene);
    });
  };

  const handleMapFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !currentScene) return;

    setError(null);
    setIsUploading(true);
    try {
      const uploaded = await uploadCampaignImage({
        bucket: "maps",
        campaignId,
        file,
      });
      setMapUrl(uploaded.publicUrl);
      setMapWidth(uploaded.width);
      setMapHeight(uploaded.height);

      // Atualiza imediatamente no store local para preview instantâneo no canvas
      upsertScene({
        ...currentScene,
        map_url: uploaded.publicUrl,
        map_width: uploaded.width,
        map_height: uploaded.height,
      });

      // Persiste automaticamente no banco para não perder o mapa ao invocar tokens ou recarregar
      const res = await updateSceneSettingsAction({
        sceneId: currentScene.id,
        campaignId,
        name,
        map_url: uploaded.publicUrl,
        map_width: uploaded.width,
        map_height: uploaded.height,
        grid_size: gridSize,
        grid_opacity: gridOpacity,
        snap_to_grid: snapToGrid,
        meters_per_cell: metersPerCell,
        distance_rule: distanceRule,
      });

      if (!res.ok) {
        setError(
          res.error ??
            "Mapa enviado, mas não foi possível salvar na cena. Clique em Salvar Cena."
        );
      } else if (res.scene) {
        upsertScene(res.scene);
        setSavedNotice(true);
        setTimeout(() => setSavedNotice(false), 2000);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha no upload do mapa."
      );
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentScene) return;
    setError(null);

    // Preview otimista no store local
    const optimistic: Scene = {
      ...currentScene,
      name,
      map_url: mapUrl,
      map_width: mapWidth,
      map_height: mapHeight,
      grid_size: gridSize,
      grid_opacity: gridOpacity,
      snap_to_grid: snapToGrid,
      meters_per_cell: metersPerCell,
      distance_rule: distanceRule,
    };
    upsertScene(optimistic);

    startTransition(async () => {
      const res = await updateSceneSettingsAction({
        sceneId: currentScene.id,
        campaignId,
        name,
        map_url: mapUrl,
        map_width: mapWidth,
        map_height: mapHeight,
        grid_size: gridSize,
        grid_opacity: gridOpacity,
        snap_to_grid: snapToGrid,
        meters_per_cell: metersPerCell,
        distance_rule: distanceRule,
      });

      if (!res.ok) {
        setError(res.error ?? "Erro ao salvar configurações da cena.");
        return;
      }
      if (res.scene) {
        upsertScene(res.scene);
      }
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2000);
    });
  };

  const handleActivateScene = (sceneId: string) => {
    setError(null);
    startTransition(async () => {
      const res = await activateSceneAction({ sceneId, campaignId });
      if (!res.ok) {
        setError(res.error ?? "Erro ao ativar cena.");
        return;
      }
      scenes.forEach((s) => {
        upsertScene({ ...s, is_active: s.id === sceneId });
      });
      setViewedSceneId(sceneId);
    });
  };

  const handleDeleteScene = (scene: Scene) => {
    if (scene.is_active) {
      setError("Ative outra cena antes de excluir a cena ativa.");
      return;
    }
    if (!window.confirm(`Excluir a cena "${scene.name}"?`)) return;

    setError(null);
    startTransition(async () => {
      const res = await deleteSceneAction({
        sceneId: scene.id,
        campaignId,
      });
      if (!res.ok) {
        setError(res.error ?? "Erro ao excluir cena.");
        return;
      }
      removeScene(scene.id);
    });
  };

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Criar Nova Cena Secreta */}
      <form onSubmit={handleCreateScene} className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Nova Cena (Secreta até ativar)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newSceneName}
            onChange={(e) => setNewSceneName(e.target.value)}
            placeholder="Ex: Caverna dos Goblins"
            className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-60"
          >
            <Plus className="h-3.5 w-3.5" />
            Criar
          </button>
        </div>
      </form>

      {/* Lista de Cenas */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Cenas ({scenes.length})
        </h3>
        <div className="space-y-1.5">
          {scenes.map((s) => {
            const isViewed = currentScene?.id === s.id;
            return (
              <div
                key={s.id}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 transition ${
                  isViewed
                    ? "border-amber-500/50 bg-amber-500/10"
                    : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setViewedSceneId(s.id);
                    loadSceneIntoForm(s);
                  }}
                  className="flex flex-1 items-center gap-2 text-left"
                >
                  <Eye
                    className={`h-3.5 w-3.5 ${
                      isViewed ? "text-amber-400" : "text-zinc-500"
                    }`}
                  />
                  <div>
                    <p className="text-xs font-semibold text-white">
                      {s.name}
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      {s.grid_size}px · {s.meters_per_cell}m
                    </p>
                  </div>
                </button>

                <div className="flex items-center gap-1.5">
                  {s.is_active ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                      <Radio className="h-2.5 w-2.5" />
                      Ativa
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleActivateScene(s.id)}
                        disabled={isPending}
                        className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
                      >
                        Ativar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteScene(s)}
                        disabled={isPending}
                        className="rounded-lg p-1 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
                        title="Excluir cena"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Formulário de Configuração da Cena Selecionada */}
      {currentScene && (
        <form
          onSubmit={handleSaveSettings}
          className="space-y-3.5 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Configurar: {currentScene.name}
            </h4>
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-300">
              Nome da Cena
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
            />
          </div>

          {/* Upload de Mapa e Forja Procedural */}
          <div className="space-y-2">
            <label className="block text-xs text-zinc-300">
              Mapa da Cena (Forja de Faerûn ou Upload)
            </label>

            <button
              type="button"
              onClick={() => setIsMapStudioOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-amber-600/15 px-3 py-2.5 text-xs font-bold text-amber-200 shadow transition hover:border-amber-400 hover:bg-amber-500/30"
            >
              <Wand2 className="h-4 w-4 text-amber-400" />
              ✨ Abrir Forja / Gerador de Mapas
            </button>

            <div className="flex items-center gap-2">
              <label className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/70 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-amber-500 hover:text-amber-300">
                {isUploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Enviando mapa...
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-3.5 w-3.5 text-amber-400" />
                    {mapUrl ? "Trocar Mapa" : "Enviar Mapa (PNG/JPG/WebP)"}
                  </>
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleMapFileChange}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>

              {mapUrl && (
                <button
                  type="button"
                  onClick={() => setMapUrl(null)}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-xs text-zinc-400 hover:text-red-400"
                >
                  Remover
                </button>
              )}
            </div>
          </div>

          {/* Dimensões do Tabuleiro */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] text-zinc-400">
                Largura (px)
              </label>
              <input
                type="number"
                min={200}
                max={10000}
                value={mapWidth}
                onChange={(e) => setMapWidth(Number(e.target.value))}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-zinc-400">
                Altura (px)
              </label>
              <input
                type="number"
                min={200}
                max={10000}
                value={mapHeight}
                onChange={(e) => setMapHeight(Number(e.target.value))}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-white"
              />
            </div>
          </div>

          {/* Tamanho da Célula e Opacidade da Grade */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] text-zinc-400">
                Célula da Grade ({gridSize}px)
              </label>
              <input
                type="range"
                min={20}
                max={200}
                step={5}
                value={gridSize}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setGridSize(v);
                  upsertScene({ ...currentScene, grid_size: v });
                }}
                className="w-full accent-amber-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] text-zinc-400">
                Opacidade ({Math.round(gridOpacity * 100)}%)
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={gridOpacity}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setGridOpacity(v);
                  upsertScene({ ...currentScene, grid_opacity: v });
                }}
                className="w-full accent-amber-500"
              />
            </div>
          </div>

          {/* Escala em Metros e Regra de Distância */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] text-zinc-400">
                Metros / Quadrado
              </label>
              <input
                type="number"
                step="0.5"
                min={0.5}
                max={100}
                value={metersPerCell}
                onChange={(e) => setMetersPerCell(Number(e.target.value))}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] text-zinc-400">
                Regra da Régua
              </label>
              <select
                value={distanceRule}
                onChange={(e) =>
                  setDistanceRule(e.target.value as DistanceRule)
                }
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-white"
              >
                <option value="chebyshev">D&D 5e (Chebyshev)</option>
                <option value="alternating">Alternada (1-2-1)</option>
                <option value="euclidean">Euclidiana (Real)</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-zinc-300">
            <input
              type="checkbox"
              checked={snapToGrid}
              onChange={(e) => {
                setSnapToGrid(e.target.checked);
                upsertScene({
                  ...currentScene,
                  snap_to_grid: e.target.checked,
                });
              }}
              className="rounded accent-amber-500"
            />
            Encaixar tokens automaticamente na grade (Snap to Grid)
          </label>

          <button
            type="submit"
            disabled={isPending}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : savedNotice ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {savedNotice ? "Configurações Salvas!" : "Salvar Cena"}
          </button>
        </form>
      )}

      {isMapStudioOpen && currentScene && (
        <MapStudioModal
          campaignId={campaignId}
          scene={currentScene}
          onClose={() => setIsMapStudioOpen(false)}
          onApplyMap={async ({ mapUrl: newUrl, width, height }) => {
            setMapUrl(newUrl);
            setMapWidth(width);
            setMapHeight(height);
            upsertScene({
              ...currentScene,
              map_url: newUrl,
              map_width: width,
              map_height: height,
            });
            const res = await updateSceneSettingsAction({
              sceneId: currentScene.id,
              campaignId,
              name,
              map_url: newUrl,
              map_width: width,
              map_height: height,
              grid_size: gridSize,
              grid_opacity: gridOpacity,
              snap_to_grid: snapToGrid,
              meters_per_cell: metersPerCell,
              distance_rule: distanceRule,
            });
            if (res.scene) {
              upsertScene(res.scene);
            }
          }}
        />
      )}
    </div>
  );
}
