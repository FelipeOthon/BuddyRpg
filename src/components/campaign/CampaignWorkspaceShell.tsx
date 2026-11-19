"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  Crown,
  Grid,
  Layers,
  Link2,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
  ScrollText,
  Shield,
  UserCheck,
  Users,
  Wifi,
} from "lucide-react";
import { loadOlderMessagesAction, sendChatMessageAction } from "@/actions/chat";
import { createSceneAction } from "@/actions/scenes";
import { updateTokenStatsAction } from "@/actions/tokens";
import BoardClient from "@/components/board/BoardClient";
import Dice3DOverlay from "@/components/board/Dice3DOverlay";
import InitiativeTrackerBar from "@/components/board/InitiativeTrackerBar";
import ChatPanel from "@/components/chat/ChatPanel";
import SceneManager from "@/components/scenes/SceneManager";
import CharacterSheetModal from "@/components/sheets/CharacterSheetModal";
import CharactersPanel from "@/components/sheets/CharactersPanel";
import SelectedTokenHud from "@/components/tokens/SelectedTokenHud";
import TokenManager from "@/components/tokens/TokenManager";
import { useCampaignRealtime } from "@/hooks/useCampaignRealtime";
import {
  applyMusicPlayback,
  stopMusicEngine,
  unlockAudioPlayback,
} from "@/lib/audio/soundEngine";
import type { Point2D } from "@/lib/board/geometry";
import { normalizeSheetData } from "@/lib/validation/sheet";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useBoardStore } from "@/stores/boardStore";
import type {
  Campaign,
  CampaignRole,
  CampaignTrack,
  CharacterRow,
  DrawPreviewPayload,
  FxBurstPreset,
  MessageRow,
  MusicStatePayload,
  PinnedRuler,
  RollResult,
  Scene,
  SceneElement,
  SceneFogShape,
  SceneWall,
  Token,
} from "@/types/domain";

export interface CampaignMemberInfo {
  userId: string;
  username: string;
  role: CampaignRole;
}

type SidebarTab = "tokens" | "chat" | "sheets" | "scenes" | "members";

export default function CampaignWorkspaceShell({
  campaign,
  currentUserId,
  role,
  initialScenes,
  initialTokens,
  initialElements = [],
  initialFogShapes = [],
  initialWalls = [],
  initialTracks = [],
  initialMessages,
  initialCharacters,
  members,
}: {
  campaign: Campaign;
  currentUserId: string;
  role: CampaignRole;
  initialScenes: Scene[];
  initialTokens: Token[];
  initialElements?: SceneElement[];
  initialFogShapes?: SceneFogShape[];
  initialWalls?: SceneWall[];
  initialTracks?: CampaignTrack[];
  initialMessages: MessageRow[];
  initialCharacters: CharacterRow[];
  members: CampaignMemberInfo[];
}) {
  const isGm = role === "gm";
  const [activeTab, setActiveTab] = useState<SidebarTab>("chat");
  // null = automático (aberto no PC >= 768px, fechado no mobile < 768px)
  const [sidebarOpen, setSidebarOpen] = useState<boolean | null>(null);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages);
  const [hasMoreMessages, setHasMoreMessages] = useState(
    initialMessages.length >= 100
  );
  const [membersList, setMembersList] =
    useState<CampaignMemberInfo[]>(members);
  const [characters, setCharacters] =
    useState<CharacterRow[]>(initialCharacters);
  const [openCharacterId, setOpenCharacterId] = useState<string | null>(null);
  const lastMemberRefreshRef = useRef(0);

  const refreshMembers = useCallback(async () => {
    const now = Date.now();
    if (now - lastMemberRefreshRef.current < 3000) return;
    lastMemberRefreshRef.current = now;

    const supabase = createBrowserSupabaseClient();
    const { data: rawMembers } = await supabase
      .from("campaign_members")
      .select("user_id, role, profiles ( username )")
      .eq("campaign_id", campaign.id)
      .order("joined_at", { ascending: true });

    if (!rawMembers) return;
    setMembersList(
      rawMembers.map((m) => {
        const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
        return {
          userId: m.user_id,
          username: p?.username ?? `user_${m.user_id.slice(0, 6)}`,
          role: m.role,
        };
      })
    );
  }, [campaign.id]);

  const {
    scenes,
    viewedSceneId,
    uiHidden,
    musicState,
    localMusicVolume,
    soundMuted,
    audioAutoplayBlocked,
    setAudioAutoplayBlocked,
    hydrateBoard,
    upsertScene,
    setViewedSceneId,
    upsertToken,
    triggerDice3dRoll,
  } = useBoardStore();
  const autoCreatedSceneRef = useRef(false);

  useEffect(() => {
    hydrateBoard({
      scenes: initialScenes,
      tokens: initialTokens,
      elements: initialElements,
      fogShapes: initialFogShapes,
      walls: initialWalls,
      tracks: initialTracks,
    });
  }, [
    initialScenes,
    initialTokens,
    initialElements,
    initialFogShapes,
    initialWalls,
    initialTracks,
    hydrateBoard,
  ]);

  useEffect(() => {
    if (
      !isGm ||
      initialScenes.length > 0 ||
      scenes.length > 0 ||
      autoCreatedSceneRef.current
    ) {
      return;
    }
    autoCreatedSceneRef.current = true;
    void createSceneAction({
      campaignId: campaign.id,
      name: "Cena 1",
      onlyIfEmpty: true,
    }).then((res) => {
      if (res.ok && res.scene) {
        upsertScene(res.scene);
        setViewedSceneId(res.scene.id);
      } else {
        autoCreatedSceneRef.current = false;
      }
    });
  }, [
    isGm,
    initialScenes.length,
    scenes.length,
    campaign.id,
    upsertScene,
    setViewedSceneId,
  ]);

  useEffect(() => {
    applyMusicPlayback(
      musicState,
      soundMuted ? 0 : localMusicVolume,
      setAudioAutoplayBlocked
    );
  }, [musicState, localMusicVolume, soundMuted, setAudioAutoplayBlocked]);

  useEffect(() => {
    return () => {
      stopMusicEngine();
    };
  }, []);

  const showError = useCallback((msg: string) => {
    setToastError(msg);
    setTimeout(() => setToastError(null), 4000);
  }, []);

  const lastAnimatedMsgIdRef = useRef<number | null>(null);

  const appendOrDedupeMessage = useCallback(
    (msg: MessageRow) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });

      if (
        msg.user_id &&
        !membersList.some((m) => m.userId === msg.user_id)
      ) {
        void refreshMembers();
      }

      if (msg.roll_result && lastAnimatedMsgIdRef.current !== msg.id) {
        lastAnimatedMsgIdRef.current = msg.id;
        const author =
          membersList.find((m) => m.userId === msg.user_id)?.username ??
          "Aventureiro";
        triggerDice3dRoll({
          id: `roll-${msg.id}-${Date.now()}`,
          author,
          roll: msg.roll_result as unknown as RollResult,
          ts: Date.now(),
        });
      }
    },
    [membersList, refreshMembers, triggerDice3dRoll]
  );

  const handleLoadOlderMessages = useCallback(async () => {
    const oldest = messages[0];
    if (!oldest) {
      setHasMoreMessages(false);
      return;
    }

    const res = await loadOlderMessagesAction({
      campaignId: campaign.id,
      beforeCreatedAt: oldest.created_at,
    });

    if (!res.ok) {
      showError(res.error ?? "Erro ao carregar histórico.");
      return;
    }

    const older = res.messages ?? [];
    setHasMoreMessages(Boolean(res.hasMore));
    if (older.length > 0) {
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const uniqueOlder = older.filter((m) => !existingIds.has(m.id));
        return [...uniqueOlder, ...prev];
      });
    }
  }, [campaign.id, messages, showError]);

  const upsertCharacter = useCallback((char: CharacterRow) => {
    setCharacters((prev) => {
      const exists = prev.some((c) => c.id === char.id);
      if (!exists) return [...prev, char];
      return prev.map((c) => (c.id === char.id ? char : c));
    });

    // Sinergia Ficha -> Token: sincroniza PV e nome em tokens vinculados
    const sh = normalizeSheetData(char.sheet_data);
    const curTokens = useBoardStore.getState().tokens;
    const upsertTok = useBoardStore.getState().upsertToken;
    for (const tok of curTokens) {
      if (tok.character_id !== char.id) continue;
      const nextMax = sh.hpMax ?? tok.hp_max;
      const nextCur = Math.min(Math.max(0, sh.hpCurrent ?? tok.hp_current), nextMax);
      if (
        tok.name !== char.name ||
        tok.hp_max !== nextMax ||
        tok.hp_current !== nextCur
      ) {
        upsertTok({
          ...tok,
          name: char.name,
          hp_max: nextMax,
          hp_current: nextCur,
          updated_at: new Date().toISOString(),
        });
        void updateTokenStatsAction({
          tokenId: tok.id,
          campaignId: campaign.id,
          name: char.name,
          hpMax: nextMax,
          hpCurrent: nextCur,
        });
      }
    }
  }, [campaign.id]);

  const removeCharacter = useCallback((charId: string) => {
    setCharacters((prev) => prev.filter((c) => c.id !== charId));
    setOpenCharacterId((prev) => (prev === charId ? null : prev));
  }, []);

  const handleMessageChange = useCallback(
    (
      op: "INSERT" | "UPDATE" | "DELETE",
      record: MessageRow | null,
      oldRecord: MessageRow | null
    ) => {
      if (op === "INSERT" && record) {
        appendOrDedupeMessage(record);
      } else if (op === "DELETE" && oldRecord) {
        setMessages((prev) => prev.filter((m) => m.id !== oldRecord.id));
      }
    },
    [appendOrDedupeMessage]
  );

  const handleCharacterChange = useCallback(
    (
      op: "INSERT" | "UPDATE" | "DELETE",
      record: CharacterRow | null,
      oldRecord: CharacterRow | null
    ) => {
      if ((op === "INSERT" || op === "UPDATE") && record) {
        // Garante privacidade no cliente caso chegue apenas para dono ou GM
        if (isGm || record.owner_id === currentUserId) {
          upsertCharacter(record);
        }
      } else if (op === "DELETE" && oldRecord) {
        removeCharacter(oldRecord.id);
      }
    },
    [isGm, currentUserId, upsertCharacter, removeCharacter]
  );

  const currentUsername = useMemo(() => {
    return (
      membersList.find((m) => m.userId === currentUserId)?.username ??
      "Aventureiro"
    );
  }, [membersList, currentUserId]);

  const gmUserIds = useMemo(
    () => membersList.filter((m) => m.role === "gm").map((m) => m.userId),
    [membersList]
  );

  const {
    status,
    broadcastTokenDrag,
    broadcastRuler,
    broadcastRulerPin,
    broadcastPointer,
    broadcastViewportSync,
    broadcastDrawPreview,
    broadcastFxBurst,
    broadcastCombatState,
    broadcastMusicState,
  } = useCampaignRealtime({
    campaignId: campaign.id,
    currentUserId,
    currentUsername,
    role,
    gmUserIds,
    onMessageChange: handleMessageChange,
    onCharacterChange: handleCharacterChange,
  });

  const effectiveScenes = scenes.length > 0 ? scenes : initialScenes;
  const visibleScenes = useMemo(
    () =>
      isGm
        ? effectiveScenes
        : effectiveScenes.filter((s) => s.is_player_visible || s.is_active),
    [isGm, effectiveScenes]
  );
  const viewedScene =
    visibleScenes.find((s) => s.id === viewedSceneId) ??
    visibleScenes.find((s) => s.is_active) ??
    visibleScenes[0] ??
    null;

  const openCharacter = useMemo(
    () => characters.find((c) => c.id === openCharacterId) ?? null,
    [characters, openCharacterId]
  );

  const handleTokenDragBroadcast = useCallback(
    (tokenId: string, x: number, y: number) => {
      if (!viewedScene) return;
      broadcastTokenDrag(tokenId, viewedScene.id, x, y);
    },
    [viewedScene, broadcastTokenDrag]
  );

  const handleTokenDragCommit = useCallback(
    async (
      tokenId: string,
      x: number,
      y: number,
      prevX: number,
      prevY: number
    ) => {
      const current = useBoardStore
        .getState()
        .tokens.find((t) => t.id === tokenId);
      const supabase = createBrowserSupabaseClient();

      const { data, error } = await supabase
        .from("tokens")
        .update({
          pos_x: x,
          pos_y: y,
        })
        .eq("id", tokenId)
        .select("*")
        .maybeSingle();

      if (error || !data) {
        if (current) {
          upsertToken({
            ...current,
            pos_x: prevX,
            pos_y: prevY,
            updated_at: new Date().toISOString(),
          });
        }
        showError(
          error?.message ??
            "Você não tem permissão para mover este token."
        );
        return;
      }

      upsertToken(data);
    },
    [upsertToken, showError]
  );

  const handleRulerBroadcast = useCallback(
    (start: Point2D, end: Point2D, active: boolean) => {
      if (!viewedScene) return;
      broadcastRuler(viewedScene.id, start, end, active);
    },
    [viewedScene, broadcastRuler]
  );

  const handleRulerPinBroadcast = useCallback(
    (
      action: "add" | "remove" | "clear",
      ruler?: Omit<PinnedRuler, "userId" | "username" | "color">,
      rulerId?: string
    ) => {
      if (!viewedScene) return null;
      return broadcastRulerPin(action, viewedScene.id, ruler, rulerId);
    },
    [viewedScene, broadcastRulerPin]
  );

  const handlePointerBroadcast = useCallback(
    (pos: Point2D, active: boolean) => {
      if (!viewedScene) return;
      broadcastPointer(viewedScene.id, pos, active);
    },
    [viewedScene, broadcastPointer]
  );

  const handleSyncView = useCallback(
    (x: number, y: number, scale: number) => {
      if (!viewedScene || !isGm) return;
      broadcastViewportSync(viewedScene.id, x, y, scale);
    },
    [viewedScene, isGm, broadcastViewportSync]
  );

  const handleDrawPreviewBroadcast = useCallback(
    (preview: Omit<DrawPreviewPayload, "userId" | "sceneId">) => {
      if (!viewedScene) return;
      broadcastDrawPreview(viewedScene.id, preview);
    },
    [viewedScene, broadcastDrawPreview]
  );

  const handleFxBurst = useCallback(
    (x: number, y: number, preset: FxBurstPreset, radius?: number) => {
      if (!viewedScene) return;
      broadcastFxBurst(viewedScene.id, x, y, preset, radius);
    },
    [viewedScene, broadcastFxBurst]
  );

  const toggleSidebar = () => {
    setSidebarOpen((prev) =>
      prev === null ? window.innerWidth < 768 : !prev
    );
  };

  const copyInvite = async (type: "code" | "link") => {
    const value =
      type === "code"
        ? campaign.invite_code
        : `${window.location.origin}/join/${campaign.invite_code}`;
    await navigator.clipboard.writeText(value);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Top Bar da Mesa */}
      {!uiHidden && (
        <header className="flex h-13 shrink-0 items-center justify-between gap-2 border-b border-amber-500/20 bg-zinc-900/95 px-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link
            href="/dashboard"
            title="Voltar ao Dashboard"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-700 hover:text-white sm:px-2.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <div className="hidden h-4 w-px bg-zinc-800 sm:block" />
          <h1 className="truncate text-sm font-bold text-white sm:text-base">
            {campaign.title}
          </h1>
          <span
            className={`hidden shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium sm:inline-flex ${
              isGm
                ? "border border-amber-500/30 bg-amber-500/10 text-amber-300"
                : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            }`}
          >
            {isGm ? (
              <>
                <Crown className="h-3 w-3" />
                Mestre
              </>
            ) : (
              <>
                <UserCheck className="h-3 w-3" />
                Jogador
              </>
            )}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          {/* Status do Canal Privado Realtime */}
          <div
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-medium sm:px-2.5 ${
              status === "connected"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : status === "error"
                  ? "border-red-500/30 bg-red-500/10 text-red-300"
                  : "border-zinc-700 bg-zinc-800 text-zinc-400"
            }`}
            title={
              status === "connected"
                ? "Tempo Real Ativo"
                : status === "error"
                  ? "Realtime Offline"
                  : "Conectando..."
            }
          >
            <Wifi className="h-3 w-3" />
            <span className="hidden md:inline">
              {status === "connected"
                ? "Tempo Real Ativo"
                : status === "error"
                  ? "Realtime Offline"
                  : "Conectando..."}
            </span>
          </div>

          <div className="hidden items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs md:flex">
            <span className="text-zinc-400">Convite:</span>
            <code className="font-mono font-semibold text-amber-300">
              {campaign.invite_code}
            </code>
            <button
              type="button"
              onClick={() => copyInvite("code")}
              title="Copiar código"
              className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              {copied === "code" ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => copyInvite("link")}
              title="Copiar link de convite"
              className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              {copied === "link" ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Link2 className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {/* Botão Esconder / Mostrar Menu Lateral (PC & Mobile) */}
          <button
            type="button"
            onClick={toggleSidebar}
            title={
              sidebarOpen === false
                ? "Abrir menu lateral"
                : "Alternar menu lateral"
            }
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
              sidebarOpen !== false
                ? "border-amber-500/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25"
                : "border-zinc-700 bg-zinc-800 text-zinc-200 hover:border-amber-500/40 hover:text-amber-200"
            }`}
          >
            {sidebarOpen === true ? (
              <>
                <PanelRightClose className="h-4 w-4" />
                <span className="hidden sm:inline">Esconder Menu</span>
              </>
            ) : sidebarOpen === false ? (
              <>
                <PanelRightOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Abrir Menu</span>
              </>
            ) : (
              <>
                <PanelRightOpen className="h-4 w-4 md:hidden" />
                <PanelRightClose className="hidden h-4 w-4 md:block" />
                <span className="hidden sm:inline md:hidden">Abrir Menu</span>
                <span className="hidden md:inline">Esconder Menu</span>
              </>
            )}
          </button>
        </div>
        </header>
      )}

      {/* Corpo: Tabuleiro Konva à esquerda + Sidebar à direita (Drawer no Mobile / Colapsável no PC) */}
      <div className="relative flex flex-1 overflow-hidden">
        <section className="relative flex flex-1 overflow-hidden bg-zinc-950">
          {/* Botão flutuante para reabrir o menu quando escondido */}
          {!uiHidden && sidebarOpen !== true && (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              title="Abrir Menu Lateral"
              className={`${
                sidebarOpen === null ? "flex md:hidden" : "flex"
              } pointer-events-auto absolute right-3 bottom-4 z-30 items-center gap-1.5 rounded-xl border border-amber-500/40 bg-zinc-950/95 px-3 py-2 text-xs font-bold text-amber-200 shadow-2xl backdrop-blur transition hover:border-amber-400 hover:bg-amber-500/20`}
            >
              <PanelRightOpen className="h-4 w-4 text-amber-400" />
              <span>Menu</span>
            </button>
          )}
          {toastError && (
            <div className="pointer-events-auto absolute top-16 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-red-500/40 bg-zinc-900/95 px-4 py-2.5 text-xs text-red-200 shadow-2xl">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <span>{toastError}</span>
            </div>
          )}

          {audioAutoplayBlocked && musicState.playing && !soundMuted && (
            <button
              type="button"
              onClick={() => {
                void unlockAudioPlayback().then((ok) => {
                  if (ok) setAudioAutoplayBlocked(false);
                });
              }}
              className="pointer-events-auto absolute top-16 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-amber-500/50 bg-zinc-950/95 px-4 py-2 text-xs font-semibold text-amber-200 shadow-2xl backdrop-blur transition hover:bg-zinc-900"
            >
              <span>🔊 Clique para liberar a música da mesa</span>
              {musicState.title && (
                <span className="text-amber-400">({musicState.title})</span>
              )}
            </button>
          )}

          {viewedScene ? (
            <>
              <BoardClient
                scene={viewedScene}
                currentUserId={currentUserId}
                currentUsername={currentUsername}
                role={role}
                gmUserIds={gmUserIds}
                onTokenDragBroadcast={handleTokenDragBroadcast}
                onTokenDragCommit={handleTokenDragCommit}
                onRulerBroadcast={handleRulerBroadcast}
                onRulerPinBroadcast={handleRulerPinBroadcast}
                onPointerBroadcast={handlePointerBroadcast}
                onDrawPreviewBroadcast={handleDrawPreviewBroadcast}
                onSyncView={handleSyncView}
                onQuickRoll={(cmd) => {
                  void sendChatMessageAction({
                    campaignId: campaign.id,
                    content: cmd,
                  }).then((res) => {
                    if (!res.ok) {
                      showError(res.error ?? "Erro ao rolar dado.");
                    } else if (res.message) {
                      appendOrDedupeMessage(res.message);
                    }
                  });
                }}
                onBroadcastMusicState={(st: Omit<MusicStatePayload, "userId">) =>
                  broadcastMusicState(st)
                }
                onOpenSceneManager={
                  isGm
                    ? () => {
                        setSidebarOpen(true);
                        setActiveTab("scenes");
                      }
                    : undefined
                }
              />
              {!uiHidden && (
                <InitiativeTrackerBar
                  scene={viewedScene}
                  role={role}
                  onBroadcastCombat={broadcastCombatState}
                />
              )}
              <Dice3DOverlay />
              {!uiHidden && (
                <SelectedTokenHud
                  campaignId={campaign.id}
                  sceneId={viewedScene.id}
                  currentUserId={currentUserId}
                  role={role}
                  characters={characters}
                  members={membersList}
                  onOpenCharacter={(c) => setOpenCharacterId(c.id)}
                  onUpsertCharacter={upsertCharacter}
                  onFxBurst={handleFxBurst}
                  onError={showError}
                />
              )}
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
              <Grid className="h-8 w-8 text-zinc-600" />
              <p className="mt-2 text-sm font-medium text-zinc-300">
                {isGm
                  ? "Preparando quadriculado da cena..."
                  : "Nenhuma cena liberada pelo Mestre"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {isGm
                  ? "Você pode criar uma cena imediatamente abaixo ou na aba Cenas."
                  : "Aguarde o Mestre liberar ou ativar uma cena."}
              </p>
              {isGm && (
                <button
                  type="button"
                  onClick={() => {
                    void createSceneAction({
                      campaignId: campaign.id,
                      name: `Cena ${scenes.length + 1}`,
                    }).then((res) => {
                      if (res.ok && res.scene) {
                        upsertScene(res.scene);
                        setViewedSceneId(res.scene.id);
                      } else if (!res.ok) {
                        showError(res.error ?? "Erro ao criar cena.");
                      }
                    });
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-zinc-950 transition hover:bg-amber-400"
                >
                  + Criar Quadriculado Agora
                </button>
              )}
            </div>
          )}
        </section>

        {/* Backdrop escuro no Mobile quando a Sidebar está aberta */}
        {!uiHidden && sidebarOpen === true && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-x-0 top-13 bottom-0 z-30 bg-black/60 backdrop-blur-[1px] md:hidden"
          />
        )}

        {/* Sidebar Lateral (Drawer no Mobile, Painel Colapsável no PC) */}
        <aside
          className={`${
            uiHidden
              ? "hidden"
              : sidebarOpen === true
                ? "fixed top-13 right-0 bottom-0 z-40 flex w-[88vw] max-w-sm shadow-2xl md:static md:w-96 md:shadow-none"
                : sidebarOpen === null
                  ? "hidden md:static md:flex md:w-96"
                  : "hidden"
          } shrink-0 flex-col border-l border-amber-500/20 bg-zinc-900/95 backdrop-blur`}
        >
          <div className="flex items-center border-b border-zinc-800 bg-zinc-950/60 p-1">
            <nav
              className={`grid flex-1 ${
                isGm ? "grid-cols-5" : "grid-cols-4"
              }`}
            >
            <button
              type="button"
              onClick={() => setActiveTab("chat")}
              className={`flex flex-col items-center gap-1 rounded-lg py-2 text-[11px] font-medium transition ${
                activeTab === "chat"
                  ? "bg-zinc-800 text-amber-400"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              Chat
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tokens")}
              className={`flex flex-col items-center gap-1 rounded-lg py-2 text-[11px] font-medium transition ${
                activeTab === "tokens"
                  ? "bg-zinc-800 text-amber-400"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Shield className="h-4 w-4" />
              Tokens
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("sheets")}
              className={`flex flex-col items-center gap-1 rounded-lg py-2 text-[11px] font-medium transition ${
                activeTab === "sheets"
                  ? "bg-zinc-800 text-amber-400"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <ScrollText className="h-4 w-4" />
              Fichas
            </button>
            {isGm && (
              <button
                type="button"
                onClick={() => setActiveTab("scenes")}
                className={`flex flex-col items-center gap-1 rounded-lg py-2 text-[11px] font-medium transition ${
                  activeTab === "scenes"
                    ? "bg-zinc-800 text-amber-400"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Layers className="h-4 w-4" />
                Cenas
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab("members")}
              className={`flex flex-col items-center gap-1 rounded-lg py-2 text-[11px] font-medium transition ${
                activeTab === "members"
                  ? "bg-zinc-800 text-amber-400"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Users className="h-4 w-4" />
              Mesa ({membersList.length})
            </button>
            </nav>

            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              title="Esconder menu lateral"
              className="ml-1 flex h-10 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 transition hover:border-amber-500/40 hover:text-amber-300"
            >
              <PanelRightClose className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === "chat" && (
              <ChatPanel
                campaignId={campaign.id}
                currentUserId={currentUserId}
                messages={messages}
                members={membersList}
                hasMoreMessages={hasMoreMessages}
                onLoadOlderMessages={handleLoadOlderMessages}
                onAppendMessage={appendOrDedupeMessage}
              />
            )}

            {activeTab === "tokens" && viewedScene && (
              <TokenManager
                campaignId={campaign.id}
                scene={viewedScene}
                currentUserId={currentUserId}
                role={role}
                members={membersList}
                characters={characters}
                onUpsertCharacter={upsertCharacter}
                onOpenCharacter={(c) => setOpenCharacterId(c.id)}
              />
            )}

            {activeTab === "sheets" && (
              <CharactersPanel
                campaignId={campaign.id}
                currentUserId={currentUserId}
                role={role}
                characters={characters}
                members={membersList}
                onUpsertCharacter={upsertCharacter}
                onRemoveCharacter={removeCharacter}
                onOpenCharacter={(c) => setOpenCharacterId(c.id)}
              />
            )}

            {activeTab === "scenes" && isGm && (
              <SceneManager campaignId={campaign.id} />
            )}

            {activeTab === "members" && (
              <div className="space-y-3">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                  <p className="text-xs font-medium text-zinc-300">
                    Convidar para esta mesa
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <code className="rounded bg-zinc-900 px-2.5 py-1 font-mono text-sm font-bold text-amber-400">
                      {campaign.invite_code}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyInvite("link")}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-amber-400"
                    >
                      {copied === "link" ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Link2 className="h-3.5 w-3.5" />
                          Copiar Link
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <h3 className="pt-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Participantes ({membersList.length})
                </h3>
                <ul className="space-y-2">
                  {membersList.map((m) => (
                    <li
                      key={m.userId}
                      className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-3.5 py-2.5"
                    >
                      <span className="text-sm font-medium text-white">
                        {m.username}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          m.role === "gm"
                            ? "bg-amber-500/10 text-amber-300"
                            : "bg-emerald-500/10 text-emerald-300"
                        }`}
                      >
                        {m.role === "gm" ? "Mestre" : "Jogador"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Modal de Ficha de Personagem */}
      {openCharacter && (
        <CharacterSheetModal
          character={openCharacter}
          campaignId={campaign.id}
          currentUserId={currentUserId}
          role={role}
          ownerName={
            membersList.find((m) => m.userId === openCharacter.owner_id)
              ?.username ?? "Mestre"
          }
          onClose={() => setOpenCharacterId(null)}
          onUpdateCharacter={upsertCharacter}
          onRollMessageSent={appendOrDedupeMessage}
        />
      )}
    </div>
  );
}
