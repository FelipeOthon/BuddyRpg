"use client";

import { useEffect, useRef, useState } from "react";
import {
  BrickWall,
  Check,
  ChevronDown,
  CloudFog,
  CloudRain,
  Crosshair,
  Dices,
  EyeOff,
  Grid,
  Hand,
  Layers,
  Link2,
  Lock,
  LockOpen,
  Magnet,
  Moon,
  MousePointer,
  Music,
  Pause,
  Pencil,
  Pin,
  Play,
  Plus,
  Radio,
  Repeat,
  RotateCcw,
  Ruler,
  Settings2,
  Square,
  Trash2,
  Type,
  Upload,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  activateSceneAction,
  createSceneAction,
  toggleScenePlayerVisibilityAction,
} from "@/actions/scenes";
import {
  createCampaignTrackAction,
  deleteCampaignTrackAction,
} from "@/actions/tracks";
import { clamp } from "@/lib/board/geometry";
import { uploadCampaignAudio } from "@/lib/utils/storage";
import {
  MUSIC_PRESETS,
  setSoundEnabled,
  unlockAudioPlayback,
} from "@/lib/audio/soundEngine";
import { useBoardStore, type BoardTool } from "@/stores/boardStore";
import QuickDiceRoller from "./QuickDiceRoller";
import type { MusicPreset, MusicStatePayload, Scene } from "@/types/domain";

function buildMusicPayload(
  current: MusicStatePayload,
  patch: Partial<Omit<MusicStatePayload, "userId">>
): Omit<MusicStatePayload, "userId"> {
  return {
    playing: patch.playing ?? current.playing,
    kind: patch.kind ?? current.kind,
    preset: patch.preset ?? current.preset,
    trackUrl: patch.trackUrl ?? current.trackUrl,
    title: patch.title ?? current.title,
    volume: patch.volume ?? current.volume,
    loop: patch.loop ?? current.loop,
    ts: Date.now(),
  };
}

export default function BoardToolbar({
  scene,
  isGm,
  onSyncView,
  onQuickRoll,
  onClearPinnedRulers,
  onBroadcastMusicState,
  onOpenSceneManager,
  onUploadMapProps,
}: {
  scene: Scene;
  isGm: boolean;
  onSyncView?: (x: number, y: number, scale: number) => void;
  onQuickRoll?: (cmd: string) => void;
  onClearPinnedRulers?: () => void;
  onBroadcastMusicState?: (state: Omit<MusicStatePayload, "userId">) => void;
  onOpenSceneManager?: () => void;
  onUploadMapProps?: (files: File[]) => void;
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
    scenes,
    setViewedSceneId,
    upsertScene,
    tracks,
    upsertTrack,
    removeTrack,
    musicState,
    setMusicState,
    localMusicVolume,
    setLocalMusicVolume,
    soundMuted,
    setSoundMuted,
    setAudioAutoplayBlocked,
  } = useBoardStore();
  const [sceneMenuOpen, setSceneMenuOpen] = useState(false);
  const [newSceneName, setNewSceneName] = useState("");
  const [sceneBusy, setSceneBusy] = useState(false);
  const [sceneMenuError, setSceneMenuError] = useState<string | null>(null);
  const sceneMenuRef = useRef<HTMLDivElement>(null);
  const mapPropsInputRef = useRef<HTMLInputElement>(null);

  const [musicMenuOpen, setMusicMenuOpen] = useState(false);
  const [musicUploading, setMusicUploading] = useState(false);
  const [trackTitle, setTrackTitle] = useState("");
  const [trackUrlInput, setTrackUrlInput] = useState("");
  const [musicError, setMusicError] = useState<string | null>(null);
  const musicMenuRef = useRef<HTMLDivElement>(null);
  const musicFileRef = useRef<HTMLInputElement>(null);

  const availableScenes = isGm
    ? scenes
    : scenes.filter((s) => s.is_player_visible || s.is_active);
  const scenePinnedCount = pinnedRulers.filter(
    (r) => r.sceneId === scene.id
  ).length;

  useEffect(() => {
    if (!sceneMenuOpen && !musicMenuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (
        sceneMenuOpen &&
        sceneMenuRef.current &&
        !sceneMenuRef.current.contains(e.target as Node)
      ) {
        setSceneMenuOpen(false);
      }
      if (
        musicMenuOpen &&
        musicMenuRef.current &&
        !musicMenuRef.current.contains(e.target as Node)
      ) {
        setMusicMenuOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSceneMenuOpen(false);
        setMusicMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onEsc);
    };
  }, [sceneMenuOpen, musicMenuOpen]);

  const emitMusic = (patch: Partial<Omit<MusicStatePayload, "userId">>) => {
    if (!isGm) return;
    const next = buildMusicPayload(musicState, patch);
    void unlockAudioPlayback().then((ok) => {
      if (ok) setAudioAutoplayBlocked(false);
    });
    setMusicState(next);
    onBroadcastMusicState?.(next);
  };

  const handlePlayPreset = (presetId: Exclude<MusicPreset, "none">, label: string) => {
    const isSamePlaying =
      musicState.playing &&
      musicState.kind === "preset" &&
      musicState.preset === presetId;
    if (isSamePlaying) {
      emitMusic({ playing: false });
      return;
    }
    emitMusic({
      playing: true,
      kind: "preset",
      preset: presetId,
      trackUrl: undefined,
      title: label,
    });
  };

  const handlePlayCustomUrl = (url: string, title: string) => {
    const isSamePlaying =
      musicState.playing &&
      musicState.kind === "url" &&
      musicState.trackUrl === url;
    if (isSamePlaying) {
      emitMusic({ playing: false });
      return;
    }
    emitMusic({
      playing: true,
      kind: "url",
      preset: "none",
      trackUrl: url,
      title,
    });
  };

  const handleMusicFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !isGm) return;
    setMusicError(null);
    setMusicUploading(true);
    try {
      const uploaded = await uploadCampaignAudio({
        campaignId: scene.campaign_id,
        file,
      });
      const res = await createCampaignTrackAction({
        campaignId: scene.campaign_id,
        title: uploaded.title,
        url: uploaded.publicUrl,
      });
      if (!res.ok || !res.track) {
        setMusicError(res.error ?? "Erro ao salvar música.");
        return;
      }
      upsertTrack(res.track);
      handlePlayCustomUrl(res.track.url, res.track.title);
    } catch (err) {
      setMusicError(
        err instanceof Error ? err.message : "Erro ao enviar áudio."
      );
    } finally {
      setMusicUploading(false);
    }
  };

  const handleAddTrackUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isGm || !trackUrlInput.trim()) return;
    setMusicError(null);
    setMusicUploading(true);
    const res = await createCampaignTrackAction({
      campaignId: scene.campaign_id,
      title: trackTitle.trim() || "Faixa Externa",
      url: trackUrlInput.trim(),
    });
    setMusicUploading(false);
    if (!res.ok || !res.track) {
      setMusicError(res.error ?? "URL de áudio inválida.");
      return;
    }
    setTrackTitle("");
    setTrackUrlInput("");
    upsertTrack(res.track);
    handlePlayCustomUrl(res.track.url, res.track.title);
  };

  const handleDeleteTrack = async (trackId: string, url: string) => {
    if (!isGm) return;
    if (musicState.playing && musicState.kind === "url" && musicState.trackUrl === url) {
      emitMusic({ playing: false });
    }
    removeTrack(trackId);
    await deleteCampaignTrackAction({
      trackId,
      campaignId: scene.campaign_id,
    });
  };

  const handleToggleSceneAccess = async (target: Scene) => {
    if (!isGm || sceneBusy) return;
    setSceneMenuError(null);
    const nextVisible = !(target.is_player_visible || target.is_active);
    upsertScene({
      ...target,
      is_player_visible: nextVisible,
      is_active: nextVisible ? target.is_active : false,
    });
    setSceneBusy(true);
    const res = await toggleScenePlayerVisibilityAction({
      sceneId: target.id,
      campaignId: target.campaign_id,
      isPlayerVisible: nextVisible,
    });
    setSceneBusy(false);
    if (!res.ok) {
      upsertScene(target);
      setSceneMenuError(res.error ?? "Erro ao alterar acesso da cena.");
    }
  };

  const handleActivateScene = async (target: Scene) => {
    if (!isGm || sceneBusy) return;
    setSceneMenuError(null);
    const previous = scenes;
    scenes.forEach((sc) => {
      upsertScene({
        ...sc,
        is_active: sc.id === target.id,
        ...(sc.id === target.id ? { is_player_visible: true } : {}),
      });
    });
    setViewedSceneId(target.id);
    setSceneBusy(true);
    const res = await activateSceneAction({
      sceneId: target.id,
      campaignId: target.campaign_id,
    });
    setSceneBusy(false);
    if (!res.ok) {
      previous.forEach((sc) => upsertScene(sc));
      setSceneMenuError(res.error ?? "Erro ao ativar cena.");
    }
  };

  const handleCreateQuickScene = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isGm || sceneBusy) return;
    const targetName = newSceneName.trim() || `Cena ${scenes.length + 1}`;
    setSceneMenuError(null);
    setSceneBusy(true);
    const res = await createSceneAction({
      campaignId: scene.campaign_id,
      name: targetName,
    });
    setSceneBusy(false);
    if (!res.ok || !res.scene) {
      setSceneMenuError(res.error ?? "Erro ao criar cena.");
      return;
    }
    setNewSceneName("");
    upsertScene(res.scene);
    setViewedSceneId(res.scene.id);
  };

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
      else if (key === "d") setTool("draw");
      else if (key === "t") setTool("text");
      else if (key === "f" && isGm) setTool("fog");
      else if (key === "e" && isGm) setTool("darkness");
      else if (key === "c" && isGm) setTool("weather");
      else if (key === "p" && isGm) setTool("wall");
      else if (key === "0") resetViewport();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setTool, resetViewport, uiHidden, setUiHidden, isGm, onSyncView, viewport]);

  const zoomBy = (factor: number) => {
    const nextScale = clamp(
      Math.round(viewport.scale * factor * 100) / 100,
      0.1,
      10
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
    {
      id: "draw",
      label: "Desenhar / Magias",
      shortcut: "D",
      icon: Pencil,
    },
    {
      id: "text",
      label: "Texto no Mapa",
      shortcut: "T",
      icon: Type,
    },
    ...(isGm
      ? [
          {
            id: "fog" as BoardTool,
            label: "Névoa / Nuvens",
            shortcut: "F",
            icon: CloudFog,
          },
          {
            id: "darkness" as BoardTool,
            label: "Escuridão",
            shortcut: "E",
            icon: Moon,
          },
          {
            id: "weather" as BoardTool,
            label: "Clima & Efeitos",
            shortcut: "C",
            icon: CloudRain,
          },
          {
            id: "wall" as BoardTool,
            label: "Paredes & Portas",
            shortcut: "P",
            icon: BrickWall,
          },
        ]
      : []),
  ];

  return (
    <>
      {/* Barra Superior Limpa (Áudio/Músicas · Cena · Zoom) */}
      <div className="pointer-events-none absolute inset-x-0 top-3 z-40 flex items-center justify-between gap-2 px-3">
        <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-amber-500/30 bg-zinc-950/90 p-1 shadow-xl backdrop-blur">
          <button
            type="button"
            onClick={() => setDice3dEnabled(!dice3dEnabled)}
            title="Ativar/Desativar Dados 3D rolando no tabuleiro"
            className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
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
            const nextMuted = !soundMuted;
            setSoundMuted(nextMuted);
            setSoundEnabled(!nextMuted);
            if (!nextMuted) {
              void unlockAudioPlayback();
            }
          }}
          title="Silenciar/Ativar áudio dos dados e músicas no seu dispositivo"
          className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
            !soundMuted
              ? "text-emerald-300 hover:bg-zinc-800"
              : "text-zinc-500 hover:bg-zinc-800"
          }`}
        >
          {!soundMuted ? (
            <Volume2 className="h-3.5 w-3.5" />
          ) : (
            <VolumeX className="h-3.5 w-3.5" />
          )}
        </button>

        {/* Jukebox / Músicas da Mesa */}
        <div ref={musicMenuRef} className="relative">
          <button
            type="button"
            onClick={() => {
              void unlockAudioPlayback();
              setMusicMenuOpen((v) => !v);
            }}
            title="Músicas & Trilha Sonora da Mesa"
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
              musicState.playing && !soundMuted
                ? "border-purple-500/50 bg-purple-500/20 text-purple-200"
                : musicMenuOpen
                  ? "border-amber-500/50 bg-zinc-800 text-amber-200"
                  : "border-zinc-800 bg-zinc-900/90 text-zinc-300 hover:border-zinc-700 hover:text-amber-200"
            }`}
          >
            <Music className="h-3.5 w-3.5" />
            <span className="max-w-[110px] truncate">
              {musicState.playing
                ? musicState.title || "Tocando"
                : "Músicas"}
            </span>
            <ChevronDown
              className={`h-3 w-3 transition-transform ${
                musicMenuOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {musicMenuOpen && (
            <div className="absolute top-full left-0 z-40 mt-2 w-80 max-w-[92vw] rounded-2xl border border-purple-500/35 bg-zinc-950/95 p-3 text-xs shadow-2xl backdrop-blur">
              <div className="mb-2 flex items-center justify-between border-b border-zinc-800/80 pb-2">
                <div className="flex items-center gap-1.5 font-semibold text-purple-200">
                  <Music className="h-3.5 w-3.5 text-purple-400" />
                  <span>Jukebox da Mesa</span>
                </div>
                {isGm && musicState.playing && (
                  <button
                    type="button"
                    onClick={() => emitMusic({ playing: false })}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-200 hover:bg-rose-500/25"
                  >
                    <Square className="h-2.5 w-2.5" />
                    Parar
                  </button>
                )}
              </div>

              {/* Controle de Volume Local (todos) e Volume da Mesa (GM) */}
              <div className="mb-2.5 space-y-1.5 rounded-xl border border-zinc-800/80 bg-zinc-900/70 p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-zinc-400">Seu Volume:</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={soundMuted ? 0 : localMusicVolume}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val > 0 && soundMuted) {
                        setSoundMuted(false);
                        setSoundEnabled(true);
                      }
                      setLocalMusicVolume(val);
                    }}
                    className="w-28 accent-purple-400"
                  />
                  <span className="w-8 text-right font-mono text-[10px] text-purple-200">
                    {Math.round((soundMuted ? 0 : localMusicVolume) * 100)}%
                  </span>
                </div>

                {isGm && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-zinc-400">
                      Vol. Mesa:
                    </span>
                    <input
                      type="range"
                      min={0.05}
                      max={1}
                      step={0.05}
                      value={musicState.volume}
                      onChange={(e) =>
                        emitMusic({ volume: Number(e.target.value) })
                      }
                      className="w-28 accent-amber-400"
                    />
                    <span className="w-8 text-right font-mono text-[10px] text-amber-200">
                      {Math.round(musicState.volume * 100)}%
                    </span>
                  </div>
                )}
              </div>

              {!isGm ? (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-2.5 text-[11px] text-zinc-300">
                  {musicState.playing ? (
                    <p>
                      Tocando agora:{" "}
                      <strong className="text-purple-200">
                        {musicState.title || "Trilha do Mestre"}
                      </strong>
                    </p>
                  ) : (
                    <p className="text-zinc-500">
                      Nenhuma música tocando no momento. O Mestre controla a
                      trilha sonora da mesa.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {musicError && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-200">
                      {musicError}
                    </div>
                  )}

                  <div>
                    <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                      <span>Trilhas RPG Prontas (Sincronizadas)</span>
                      <button
                        type="button"
                        onClick={() => emitMusic({ loop: !musicState.loop })}
                        title="Repetir em loop"
                        className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] ${
                          musicState.loop
                            ? "bg-purple-500/20 text-purple-200"
                            : "text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        <Repeat className="h-2.5 w-2.5" />
                        Loop
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-1">
                      {MUSIC_PRESETS.map((p) => {
                        const isPlayingThis =
                          musicState.playing &&
                          musicState.kind === "preset" &&
                          musicState.preset === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handlePlayPreset(p.id, p.label)}
                            className={`flex items-center justify-between rounded-xl border px-2.5 py-1.5 text-left transition ${
                              isPlayingThis
                                ? "border-purple-500/60 bg-purple-500/20 text-white"
                                : "border-zinc-800 bg-zinc-900/70 text-zinc-300 hover:border-zinc-700"
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <p className="truncate text-[11px] font-semibold">
                                {p.emoji} {p.label}
                              </p>
                              <p className="truncate text-[10px] text-zinc-500">
                                {p.subtitle}
                              </p>
                            </div>
                            {isPlayingThis ? (
                              <Pause className="h-3.5 w-3.5 shrink-0 text-purple-300" />
                            ) : (
                              <Play className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Músicas da Campanha (MP3 / Link) */}
                  <div className="border-t border-zinc-800/80 pt-2">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                        Suas Músicas ({tracks.length})
                      </span>
                      <button
                        type="button"
                        disabled={musicUploading}
                        onClick={() => musicFileRef.current?.click()}
                        className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2 py-1 text-[10px] font-semibold text-amber-200 transition hover:bg-amber-500/25 disabled:opacity-50"
                      >
                        <Upload className="h-3 w-3" />
                        {musicUploading ? "Enviando..." : "Subir MP3/OGG"}
                      </button>
                      <input
                        ref={musicFileRef}
                        type="file"
                        accept="audio/*"
                        onChange={(e) => void handleMusicFileChange(e)}
                        className="hidden"
                      />
                    </div>

                    {tracks.length > 0 && (
                      <div className="mb-2 max-h-28 space-y-1 overflow-y-auto">
                        {tracks.map((tr) => {
                          const active =
                            musicState.playing &&
                            musicState.kind === "url" &&
                            musicState.trackUrl === tr.url;
                          return (
                            <div
                              key={tr.id}
                              className={`flex items-center justify-between gap-1.5 rounded-lg border px-2 py-1 ${
                                active
                                  ? "border-purple-500/60 bg-purple-500/15"
                                  : "border-zinc-800 bg-zinc-900/60"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  handlePlayCustomUrl(tr.url, tr.title)
                                }
                                className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                              >
                                {active ? (
                                  <Pause className="h-3 w-3 shrink-0 text-purple-300" />
                                ) : (
                                  <Play className="h-3 w-3 shrink-0 text-zinc-400" />
                                )}
                                <span className="truncate text-[11px] font-medium text-zinc-200">
                                  {tr.title}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleDeleteTrack(tr.id, tr.url)
                                }
                                title="Remover música"
                                className="rounded p-1 text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <form
                      onSubmit={(e) => void handleAddTrackUrl(e)}
                      className="space-y-1"
                    >
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={trackTitle}
                          onChange={(e) => setTrackTitle(e.target.value)}
                          placeholder="Nome"
                          className="w-24 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-white placeholder-zinc-500 outline-none focus:border-purple-500"
                        />
                        <div className="relative flex min-w-0 flex-1 items-center">
                          <Link2 className="pointer-events-none absolute left-2 h-3 w-3 text-zinc-500" />
                          <input
                            type="url"
                            value={trackUrlInput}
                            onChange={(e) => setTrackUrlInput(e.target.value)}
                            placeholder="Link direto .mp3/.ogg"
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-1 pr-2 pl-6 text-[11px] text-white placeholder-zinc-500 outline-none focus:border-purple-500"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={musicUploading || !trackUrlInput.trim()}
                          className="shrink-0 rounded-lg bg-purple-500 px-2 py-1 text-[11px] font-bold text-white hover:bg-purple-400 disabled:opacity-50"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Aba / Seletor Rápido de Cenas */}
      <div ref={sceneMenuRef} className="pointer-events-auto relative">
        <button
          type="button"
          onClick={() => setSceneMenuOpen((v) => !v)}
          title="Trocar de cena ou gerenciar acesso dos jogadores"
          className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs text-zinc-200 shadow-xl backdrop-blur transition ${
            sceneMenuOpen
              ? "border-amber-400 bg-zinc-900 text-amber-100"
              : "border-amber-500/30 bg-zinc-950/90 hover:border-amber-400/60"
          }`}
        >
          <Grid className="h-3.5 w-3.5 text-amber-400" />
          <span className="max-w-[140px] truncate font-display font-bold text-amber-100">
            {scene.name}
          </span>
          {isGm && (
            <span
              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                scene.is_player_visible || scene.is_active
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-amber-500/20 text-amber-300"
              }`}
            >
              {scene.is_player_visible || scene.is_active ? (
                <>
                  <LockOpen className="h-2.5 w-2.5" />
                  Liberada
                </>
              ) : (
                <>
                  <Lock className="h-2.5 w-2.5" />
                  Só GM
                </>
              )}
            </span>
          )}
          <span className="hidden items-center gap-2 text-zinc-300 lg:inline-flex">
            <span className="text-zinc-600">·</span>
            <span>{scene.grid_size}px</span>
            <span className="text-zinc-600">·</span>
            <span>{scene.meters_per_cell}m/q</span>
            <span className="text-zinc-600">·</span>
            <span className="inline-flex items-center gap-1 text-zinc-400">
              <Magnet className="h-3 w-3 text-emerald-400" />
              {scene.snap_to_grid ? "Snap ON" : "Snap OFF"}
            </span>
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${
              sceneMenuOpen ? "rotate-180 text-amber-300" : ""
            }`}
          />
        </button>

        {sceneMenuOpen && (
          <div className="absolute top-full left-1/2 z-50 mt-2 w-80 max-w-[92vw] -translate-x-1/2 rounded-2xl border border-amber-500/35 bg-zinc-950/95 p-3 text-xs shadow-2xl backdrop-blur">
            <div className="mb-2 flex items-center justify-between border-b border-zinc-800/80 pb-2">
              <div className="flex items-center gap-1.5 font-semibold text-amber-200">
                <Layers className="h-3.5 w-3.5 text-amber-400" />
                <span>Cenas ({availableScenes.length})</span>
              </div>
              {isGm && onOpenSceneManager && (
                <button
                  type="button"
                  onClick={() => {
                    setSceneMenuOpen(false);
                    onOpenSceneManager();
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] font-medium text-zinc-300 transition hover:border-amber-500/40 hover:text-amber-200"
                >
                  <Settings2 className="h-3 w-3" />
                  Configurar Mapa
                </button>
              )}
            </div>

            {sceneMenuError && (
              <div className="mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-200">
                {sceneMenuError}
              </div>
            )}

            <div className="max-h-64 space-y-1.5 overflow-y-auto pr-0.5">
              {availableScenes.map((s) => {
                const isViewing = s.id === scene.id;
                const unlocked = Boolean(s.is_player_visible || s.is_active);
                return (
                  <div
                    key={s.id}
                    className={`flex items-center justify-between gap-2 rounded-xl border px-2.5 py-2 transition ${
                      isViewing
                        ? "border-amber-500/60 bg-amber-500/15"
                        : "border-zinc-800/90 bg-zinc-900/70 hover:border-zinc-700"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setViewedSceneId(s.id);
                        if (!isGm) setSceneMenuOpen(false);
                      }}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                          isViewing
                            ? "border-amber-400 bg-amber-400/20 text-amber-300"
                            : "border-zinc-700 text-transparent"
                        }`}
                      >
                        <Check className="h-2.5 w-2.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-white">
                          {s.name}
                        </p>
                        <p className="text-[10px] text-zinc-400">
                          {s.grid_size}px · {s.meters_per_cell}m
                          {s.is_active ? " · Principal" : ""}
                        </p>
                      </div>
                    </button>

                    {isGm ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          disabled={sceneBusy}
                          onClick={() => void handleToggleSceneAccess(s)}
                          title={
                            unlocked
                              ? "Liberada para jogadores (clique para bloquear)"
                              : "Secreta — só o Mestre vê (clique para liberar aos jogadores)"
                          }
                          className={`inline-flex items-center gap-1 rounded-lg border px-1.5 py-1 text-[10px] font-semibold transition ${
                            unlocked
                              ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                              : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-amber-500/40 hover:text-amber-200"
                          }`}
                        >
                          {unlocked ? (
                            <LockOpen className="h-3 w-3" />
                          ) : (
                            <Lock className="h-3 w-3" />
                          )}
                          <span>{unlocked ? "Liberada" : "Secreta"}</span>
                        </button>

                        {s.is_active ? (
                          <span
                            title="Cena principal ativa para a mesa"
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 px-1.5 py-1 text-[10px] font-bold text-emerald-300"
                          >
                            <Radio className="h-2.5 w-2.5" />
                            Ativa
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={sceneBusy}
                            onClick={() => void handleActivateScene(s)}
                            title="Ativar cena e puxar jogadores para ela"
                            className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-1.5 py-1 text-[10px] font-semibold text-sky-300 transition hover:bg-sky-500/20"
                          >
                            Ativar
                          </button>
                        )}
                      </div>
                    ) : (
                      s.is_active && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                          <Radio className="h-2.5 w-2.5" />
                          Principal
                        </span>
                      )
                    )}
                  </div>
                );
              })}
            </div>

            {isGm && (
              <div className="mt-2.5 space-y-2 border-t border-zinc-800/80 pt-2.5">
                {onUploadMapProps && (
                  <>
                    <input
                      ref={mapPropsInputRef}
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => {
                        const list = e.target.files
                          ? Array.from(e.target.files)
                          : [];
                        e.target.value = "";
                        if (list.length > 0) {
                          setSceneMenuOpen(false);
                          onUploadMapProps(list);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => mapPropsInputRef.current?.click()}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-amber-200 transition hover:bg-amber-500/20"
                    >
                      <Upload className="h-3.5 w-3.5 text-amber-400" />
                      Subir Mapas / Peças (vários)
                    </button>
                  </>
                )}
                <form
                  onSubmit={(e) => void handleCreateQuickScene(e)}
                  className="flex items-center gap-1.5"
                >
                  <input
                    type="text"
                    value={newSceneName}
                    onChange={(e) => setNewSceneName(e.target.value)}
                    placeholder="Nova cena (nasce secreta)..."
                    className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-[11px] text-white placeholder-zinc-500 outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    disabled={sceneBusy}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1.5 text-[11px] font-bold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Criar
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
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

      {/* Dock Vertical Esquerda (Ferramentas VTT + Dados Rápidos) */}
      <div className="pointer-events-none absolute top-14 left-3 z-20 flex flex-col items-start gap-2">
        <div className="pointer-events-auto flex flex-col gap-1 rounded-xl border border-amber-500/30 bg-zinc-950/90 p-1 shadow-xl backdrop-blur">
          {tools.map((t) => {
            const Icon = t.icon;
            const active = tool === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTool(t.id)}
                title={`${t.label} (${t.shortcut})`}
                className={`relative flex h-8 w-8 items-center justify-center rounded-lg transition ${
                  active
                    ? "bg-gradient-to-br from-amber-400 to-amber-600 text-zinc-950 shadow"
                    : "text-zinc-300 hover:bg-zinc-800 hover:text-amber-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span
                  className={`pointer-events-none absolute right-0.5 bottom-0 text-[8px] font-bold ${
                    active ? "text-zinc-950/80" : "text-zinc-500"
                  }`}
                >
                  {t.shortcut}
                </span>
              </button>
            );
          })}

          {tool === "ruler" && (
            <button
              type="button"
              onClick={() => setRulerPinMode(!rulerPinMode)}
              title="Fixar réguas no mapa ao soltar (ou segure Shift)"
              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                rulerPinMode
                  ? "border-purple-500/50 bg-purple-500/25 text-purple-200"
                  : "border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              <Pin className="h-3.5 w-3.5" />
            </button>
          )}

          {scenePinnedCount > 0 && onClearPinnedRulers && (
            <button
              type="button"
              onClick={onClearPinnedRulers}
              title={`Limpar ${scenePinnedCount} régua(s) fixada(s)`}
              className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/15 text-rose-300 transition hover:bg-rose-500/25"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="absolute -top-1 -right-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[9px] font-bold text-white">
                {scenePinnedCount}
              </span>
            </button>
          )}
        </div>

        {onQuickRoll && <QuickDiceRoller onRoll={onQuickRoll} />}
      </div>
    </>
  );
}
