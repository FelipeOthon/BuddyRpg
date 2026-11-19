"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  Check,
  Crosshair,
  Eye,
  ImagePlus,
  Loader2,
  Lock,
  LockOpen,
  Minus,
  MousePointer,
  Plus,
  Radio,
  Save,
  Trash2,
  Wand2,
} from "lucide-react";
import {
  createSceneElementAction,
  deleteSceneElementAction,
  updateSceneElementAction,
} from "@/actions/elements";
import {
  activateSceneAction,
  createSceneAction,
  deleteSceneAction,
  toggleScenePlayerVisibilityAction,
  updateSceneSettingsAction,
} from "@/actions/scenes";
import { screenToWorld, snapToGrid as snapPointToGrid } from "@/lib/board/geometry";
import { WEATHER_PRESET_OPTIONS } from "@/lib/board/weatherPresets";
import { uploadCampaignImage } from "@/lib/utils/storage";
import { useBoardStore } from "@/stores/boardStore";
import type {
  DistanceRule,
  ElementDepthLayer,
  GridType,
  Scene,
  SceneElement,
  SceneElementData,
  WeatherPreset,
} from "@/types/domain";
import MapAlignmentModal from "./MapAlignmentModal";
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
    elements,
    upsertElement,
    removeElement,
    setSelectedElementId,
    setTool,
    viewport,
    setViewport,
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
  const [isUploadingProps, setIsUploadingProps] = useState(false);
  const [isMapStudioOpen, setIsMapStudioOpen] = useState(false);
  const [isAlignmentOpen, setIsAlignmentOpen] = useState(false);
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
  const [gridType, setGridType] = useState<GridType>(
    currentScene?.grid_type ?? "square"
  );
  const [gridOffsetX, setGridOffsetX] = useState(
    currentScene?.grid_offset_x ?? 0
  );
  const [gridOffsetY, setGridOffsetY] = useState(
    currentScene?.grid_offset_y ?? 0
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
    setGridType(s.grid_type ?? "square");
    setGridOffsetX(s.grid_offset_x ?? 0);
    setGridOffsetY(s.grid_offset_y ?? 0);
  };

  if (currentScene && draftId !== currentScene.id) {
    loadSceneIntoForm(currentScene);
  }

  const handleCreateScene = (e: React.FormEvent) => {
    e.preventDefault();
    const targetName =
      newSceneName.trim() || `Cena ${scenes.length + 1}`;
    setError(null);

    startTransition(async () => {
      const res = await createSceneAction({
        campaignId,
        name: targetName,
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
      grid_type: gridType,
      grid_offset_x: gridOffsetX,
      grid_offset_y: gridOffsetY,
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
        grid_type: gridType,
        grid_offset_x: gridOffsetX,
        grid_offset_y: gridOffsetY,
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
        upsertScene({
          ...s,
          is_active: s.id === sceneId,
          ...(s.id === sceneId ? { is_player_visible: true } : {}),
        });
      });
      setViewedSceneId(sceneId);
    });
  };

  const handleTogglePlayerVisibility = (scene: Scene) => {
    setError(null);
    const nextVisible = !(scene.is_player_visible || scene.is_active);
    startTransition(async () => {
      const res = await toggleScenePlayerVisibilityAction({
        sceneId: scene.id,
        campaignId,
        isPlayerVisible: nextVisible,
      });
      if (!res.ok) {
        setError(res.error ?? "Erro ao atualizar acesso dos jogadores.");
        return;
      }
      upsertScene({
        ...scene,
        is_player_visible: nextVisible,
        is_active: nextVisible ? scene.is_active : false,
      });
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
          Nova Cena (Secreta até liberar ou ativar)
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
                  <button
                    type="button"
                    onClick={() => handleTogglePlayerVisibility(s)}
                    disabled={isPending}
                    title={
                      s.is_player_visible || s.is_active
                        ? "Liberada para jogadores (clique para bloquear)"
                        : "Secreta — só o Mestre vê (clique para liberar)"
                    }
                    className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold transition ${
                      s.is_player_visible || s.is_active
                        ? "border-emerald-500/35 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                        : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-amber-500/40 hover:text-amber-200"
                    }`}
                  >
                    {s.is_player_visible || s.is_active ? (
                      <LockOpen className="h-3 w-3" />
                    ) : (
                      <Lock className="h-3 w-3" />
                    )}
                    {s.is_player_visible || s.is_active
                      ? "Liberada"
                      : "Secreta"}
                  </button>
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
                        className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-[10px] font-semibold text-sky-300 transition hover:bg-sky-500/20"
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

            {mapUrl && (
              <button
                type="button"
                onClick={() => setIsAlignmentOpen(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-amber-300 transition hover:border-amber-500/50 hover:bg-zinc-800"
              >
                <Crosshair className="h-3.5 w-3.5" />
                Alinhar Grade do Mapa (3 Passos / Hex)
              </button>
            )}
          </div>

          {/* Dimensões do Mapa de Fundo (somente quando há imagem principal; o quadriculado é infinito) */}
          {mapUrl && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[11px] text-zinc-400">
                  Largura do Mapa (px)
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
                  Altura do Mapa (px)
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
          )}

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

      {/* Mapas e Peças Encaixáveis nesta Cena */}
      {currentScene && (
        <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Mapas & Peças na Cena
              </h4>
              <p className="mt-0.5 text-[11px] text-zinc-400">
                Suba várias imagens, encaixe uma ao lado da outra e redimensione.
              </p>
            </div>
          </div>

          <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200 transition hover:border-amber-400 hover:bg-amber-500/20">
            {isUploadingProps ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Enviando peças...
              </>
            ) : (
              <>
                <ImagePlus className="h-3.5 w-3.5 text-amber-400" />
                + Adicionar Mapas / Peças (vários)
              </>
            )}
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/gif"
              disabled={isUploadingProps}
              onChange={async (e) => {
                const list = e.target.files ? Array.from(e.target.files) : [];
                e.target.value = "";
                if (list.length === 0 || !currentScene) return;
                setError(null);
                setIsUploadingProps(true);
                try {
                  const g = Math.max(currentScene.grid_size || 70, 20);
                  const ox = currentScene.grid_offset_x ?? 0;
                  const oy = currentScene.grid_offset_y ?? 0;
                  const gType = currentScene.grid_type ?? "square";
                  const center = screenToWorld(
                    {
                      x:
                        typeof window !== "undefined"
                          ? window.innerWidth * 0.42
                          : 500,
                      y:
                        typeof window !== "undefined"
                          ? window.innerHeight * 0.45
                          : 400,
                    },
                    viewport
                  );
                  let cursorX = snapPointToGrid(
                    { x: center.x - g * 3, y: center.y - g * 3 },
                    g,
                    currentScene.snap_to_grid,
                    ox,
                    oy,
                    gType
                  ).x;
                  const baseY = snapPointToGrid(
                    { x: center.x - g * 3, y: center.y - g * 3 },
                    g,
                    currentScene.snap_to_grid,
                    ox,
                    oy,
                    gType
                  ).y;

                  for (const file of list) {
                    if (!file.type.startsWith("image/")) continue;
                    const uploaded = await uploadCampaignImage({
                      bucket: "maps",
                      campaignId,
                      file,
                    });
                    const cellsW = Math.min(
                      Math.max(Math.round(uploaded.width / g), 2),
                      16
                    );
                    const propW = cellsW * g;
                    const ratio = uploaded.height / Math.max(uploaded.width, 1);
                    const propH = Math.max(
                      g,
                      Math.round((propW * ratio) / g) * g
                    );
                    const res = await createSceneElementAction({
                      sceneId: currentScene.id,
                      campaignId,
                      layer: "prop",
                      kind: "image",
                      x: cursorX,
                      y: baseY,
                      data: {
                        imageUrl: uploaded.publicUrl,
                        width: propW,
                        height: propH,
                        opacity: 1,
                        label: file.name.replace(/\.[^.]+$/, "").slice(0, 40),
                      },
                    });
                    if (res.ok && res.element) {
                      upsertElement(res.element);
                      setTool("select");
                      setSelectedElementId(res.element.id);
                    }
                    cursorX += propW;
                  }
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : "Falha ao subir mapa/peça."
                  );
                } finally {
                  setIsUploadingProps(false);
                }
              }}
              className="hidden"
            />
          </label>

          {(() => {
            const sceneProps = elements.filter(
              (el) =>
                el.scene_id === currentScene.id &&
                el.layer === "prop" &&
                el.kind === "image"
            );
            const g = Math.max(currentScene.grid_size || 70, 20);

            if (sceneProps.length === 0) {
              return (
                <p className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-3 py-2 text-[11px] text-zinc-500">
                  Nenhuma peça/mapa solto nesta cena ainda. Use o botão acima para
                  montar mapas encaixados!
                </p>
              );
            }

            const resizePropCells = (
              el: SceneElement,
              deltaW: number,
              deltaH: number
            ) => {
              const d = (el.data ?? {}) as SceneElementData;
              const curCellsW = Math.max(1, Math.round((d.width ?? g * 2) / g));
              const curCellsH = Math.max(1, Math.round((d.height ?? g * 2) / g));
              const nextCellsW = Math.min(Math.max(curCellsW + deltaW, 1), 40);
              const nextCellsH = Math.min(Math.max(curCellsH + deltaH, 1), 40);
              const nextData: SceneElementData = {
                ...d,
                width: nextCellsW * g,
                height: nextCellsH * g,
              };
              upsertElement({
                ...el,
                data: nextData as unknown as SceneElement["data"],
              });
              void updateSceneElementAction({
                elementId: el.id,
                campaignId,
                data: nextData,
              });
            };

            const allLocked = sceneProps.every((p) => p.is_locked);

            const toggleLockProp = (el: SceneElement, locked: boolean) => {
              upsertElement({ ...el, is_locked: locked });
              void updateSceneElementAction({
                elementId: el.id,
                campaignId,
                isLocked: locked,
              });
            };

            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-zinc-400">
                    {sceneProps.length}{" "}
                    {sceneProps.length === 1 ? "item colocado" : "itens colocados"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextLocked = !allLocked;
                      for (const p of sceneProps) {
                        toggleLockProp(p, nextLocked);
                      }
                    }}
                    title={
                      allLocked
                        ? "Destravar todas as peças para poder mover no mapa"
                        : "Travar todas as peças para não arrastá-las sem querer"
                    }
                    className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold transition ${
                      allLocked
                        ? "border-amber-500/50 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30"
                        : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-amber-500/40 hover:text-amber-200"
                    }`}
                  >
                    {allLocked ? (
                      <>
                        <LockOpen className="h-3 w-3" />
                        Destravar Tudo
                      </>
                    ) : (
                      <>
                        <Lock className="h-3 w-3 text-amber-400" />
                        Travar Tudo
                      </>
                    )}
                  </button>
                </div>

                <div className="max-h-60 space-y-2 overflow-y-auto pr-0.5">
                  {sceneProps.map((el, idx) => {
                    const d = (el.data ?? {}) as SceneElementData;
                    const cellsW = Math.max(1, Math.round((d.width ?? g * 2) / g));
                    const cellsH = Math.max(1, Math.round((d.height ?? g * 2) / g));
                    return (
                      <div
                        key={el.id}
                        className={`rounded-xl border p-2 text-[11px] ${
                          el.is_locked
                            ? "border-amber-500/35 bg-amber-500/5"
                            : "border-zinc-800 bg-zinc-900/70"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {d.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={d.imageUrl}
                              alt={d.label ?? `Peça ${idx + 1}`}
                              className="h-9 w-9 shrink-0 rounded-lg border border-zinc-700 object-cover"
                            />
                          ) : (
                            <div className="h-9 w-9 shrink-0 rounded-lg bg-zinc-800" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-zinc-100">
                              {d.label || `Mapa / Peça ${idx + 1}`}
                            </p>
                            <p className="text-[10px] text-zinc-400">
                              {cellsW}q × {cellsH}q ({cellsW * g}×{cellsH * g}px)
                              {el.is_locked ? " · 🔒 Travado" : ""}
                            </p>
                          </div>
                          <button
                            type="button"
                            title={
                              el.is_locked
                                ? "Destravar para mover/redimensionar no tabuleiro"
                                : "Bloquear no lugar para não mover sem querer"
                            }
                            onClick={() => toggleLockProp(el, !el.is_locked)}
                            className={`rounded-lg border p-1.5 transition ${
                              el.is_locked
                                ? "border-amber-500/50 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30"
                                : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-amber-500/40 hover:text-amber-200"
                            }`}
                          >
                            {el.is_locked ? (
                              <Lock className="h-3 w-3" />
                            ) : (
                              <LockOpen className="h-3 w-3" />
                            )}
                          </button>
                          <button
                            type="button"
                            title="Selecionar peça no tabuleiro (destrava se estiver travada)"
                            onClick={() => {
                              if (el.is_locked) toggleLockProp(el, false);
                              setTool("select");
                              setSelectedElementId(el.id);
                              if (typeof window !== "undefined") {
                                const cx = el.x + (d.width ?? g * 2) / 2;
                                const cy = el.y + (d.height ?? g * 2) / 2;
                                setViewport({
                                  ...viewport,
                                  x: window.innerWidth * 0.42 - cx * viewport.scale,
                                  y: window.innerHeight * 0.48 - cy * viewport.scale,
                                });
                              }
                            }}
                            className="rounded-lg border border-zinc-700 bg-zinc-800 p-1.5 text-zinc-200 transition hover:border-amber-500/50 hover:text-amber-200"
                          >
                            <MousePointer className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            title="Excluir peça"
                            onClick={() => {
                              removeElement(el.id);
                              void deleteSceneElementAction({ elementId: el.id });
                            }}
                            className="rounded-lg border border-red-500/20 bg-red-500/10 p-1.5 text-red-300 transition hover:bg-red-500/20"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>

                      <div className="mt-2 space-y-1.5 border-t border-zinc-800/80 pt-1.5 text-[10px] text-zinc-300">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-zinc-400">Larg:</span>
                            <button
                              type="button"
                              onClick={() => resizePropCells(el, -1, 0)}
                              className="rounded bg-zinc-800 p-1 hover:bg-zinc-700"
                              title="Diminuir largura em 1 quadrado"
                            >
                              <Minus className="h-2.5 w-2.5" />
                            </button>
                            <span className="min-w-[26px] text-center font-mono font-semibold text-amber-200">
                              {cellsW}q
                            </span>
                            <button
                              type="button"
                              onClick={() => resizePropCells(el, 1, 0)}
                              className="rounded bg-zinc-800 p-1 hover:bg-zinc-700"
                              title="Aumentar largura em 1 quadrado"
                            >
                              <Plus className="h-2.5 w-2.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-zinc-400">Alt:</span>
                            <button
                              type="button"
                              onClick={() => resizePropCells(el, 0, -1)}
                              className="rounded bg-zinc-800 p-1 hover:bg-zinc-700"
                              title="Diminuir altura em 1 quadrado"
                            >
                              <Minus className="h-2.5 w-2.5" />
                            </button>
                            <span className="min-w-[26px] text-center font-mono font-semibold text-amber-200">
                              {cellsH}q
                            </span>
                            <button
                              type="button"
                              onClick={() => resizePropCells(el, 0, 1)}
                              className="rounded bg-zinc-800 p-1 hover:bg-zinc-700"
                              title="Aumentar altura em 1 quadrado"
                            >
                              <Plus className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          <select
                            value={d.zLayer ?? "above_map"}
                            onChange={(e) => {
                              const nextData: SceneElementData = {
                                ...d,
                                zLayer: e.target.value as ElementDepthLayer,
                              };
                              upsertElement({
                                ...el,
                                data: nextData as unknown as SceneElement["data"],
                              });
                              void updateSceneElementAction({
                                elementId: el.id,
                                campaignId,
                                data: nextData,
                              });
                            }}
                            title="Camada de profundidade da peça/asset"
                            className="w-full rounded border border-zinc-700 bg-zinc-800 px-1.5 py-1 text-[10px] text-zinc-200"
                          >
                            <option value="under_map">Abaixo Mapa</option>
                            <option value="above_map">Sobre Mapa</option>
                            <option value="above_tokens">Por Cima (Teto)</option>
                          </select>

                          <select
                            value={d.weatherPreset ?? "none"}
                            onChange={(e) => {
                              const nextData: SceneElementData = {
                                ...d,
                                weatherPreset: e.target.value as WeatherPreset,
                                weatherIntensity: d.weatherIntensity ?? 0.6,
                              };
                              upsertElement({
                                ...el,
                                data: nextData as unknown as SceneElement["data"],
                              });
                              void updateSceneElementAction({
                                elementId: el.id,
                                campaignId,
                                data: nextData,
                              });
                            }}
                            title="Clima localizado nesta peça/mapa"
                            className="w-full rounded border border-sky-500/30 bg-zinc-800 px-1.5 py-1 text-[10px] text-sky-200"
                          >
                            {WEATHER_PRESET_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            );
          })()}
        </div>
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

      {isAlignmentOpen && currentScene && (
        <MapAlignmentModal
          scene={{
            ...currentScene,
            map_url: mapUrl,
            map_width: mapWidth,
            map_height: mapHeight,
            grid_size: gridSize,
            grid_type: gridType,
            grid_offset_x: gridOffsetX,
            grid_offset_y: gridOffsetY,
          }}
          onClose={() => setIsAlignmentOpen(false)}
          onApply={async (patch) => {
            setGridSize(patch.grid_size);
            setGridOffsetX(patch.grid_offset_x);
            setGridOffsetY(patch.grid_offset_y);
            setGridType(patch.grid_type);
            upsertScene({
              ...currentScene,
              ...patch,
            });
            const res = await updateSceneSettingsAction({
              sceneId: currentScene.id,
              campaignId,
              name,
              map_url: mapUrl,
              map_width: mapWidth,
              map_height: mapHeight,
              grid_size: patch.grid_size,
              grid_opacity: gridOpacity,
              grid_type: patch.grid_type,
              grid_offset_x: patch.grid_offset_x,
              grid_offset_y: patch.grid_offset_y,
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
