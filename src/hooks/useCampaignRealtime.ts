"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Point2D } from "@/lib/board/geometry";
import {
  useBoardStore,
  type CombatStatePayload,
} from "@/stores/boardStore";
import type {
  CampaignRole,
  CharacterRow,
  MessageRow,
  RulerBroadcastPayload,
  Scene,
  Token,
  TokenDragPayload,
} from "@/types/domain";

export type RealtimeConnectionStatus = "connecting" | "connected" | "error";

export interface DatabaseBroadcastPayload {
  schema: string;
  table: "tokens" | "scenes" | "messages" | "characters";
  type: "INSERT" | "UPDATE" | "DELETE";
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
}

const RULER_COLORS = [
  "#38bdf8",
  "#a855f7",
  "#10b981",
  "#f43f5e",
  "#eab308",
  "#ec4899",
];

function pickColorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return RULER_COLORS[Math.abs(hash) % RULER_COLORS.length] ?? "#38bdf8";
}

export function useCampaignRealtime(params: {
  campaignId: string;
  currentUserId: string;
  currentUsername: string;
  role: CampaignRole;
  gmUserIds: string[];
  onMessageChange?: (
    op: "INSERT" | "UPDATE" | "DELETE",
    record: MessageRow | null,
    oldRecord: MessageRow | null
  ) => void;
  onCharacterChange?: (
    op: "INSERT" | "UPDATE" | "DELETE",
    record: CharacterRow | null,
    oldRecord: CharacterRow | null
  ) => void;
}) {
  const {
    campaignId,
    currentUserId,
    currentUsername,
    role,
    gmUserIds,
    onMessageChange,
    onCharacterChange,
  } = params;

  const [status, setStatus] = useState<RealtimeConnectionStatus>("connecting");
  const mainChannelRef = useRef<RealtimeChannel | null>(null);
  const gmIdsRef = useRef<Set<string>>(new Set(gmUserIds));
  const onMessageRef = useRef(onMessageChange);
  const onCharacterRef = useRef(onCharacterChange);

  useEffect(() => {
    gmIdsRef.current = new Set(gmUserIds);
  }, [gmUserIds]);

  useEffect(() => {
    onMessageRef.current = onMessageChange;
  }, [onMessageChange]);

  useEffect(() => {
    onCharacterRef.current = onCharacterChange;
  }, [onCharacterChange]);

  const {
    upsertScene,
    removeScene,
    upsertToken,
    removeToken,
    setRemoteTokenDrag,
    setRemoteRuler,
    setCombatState,
  } = useBoardStore();

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    let isUnmounted = false;

    const handleDbBroadcast = async (raw: unknown) => {
      if (!raw || typeof raw !== "object") return;
      const envelope = raw as {
        payload?: DatabaseBroadcastPayload;
        table?: DatabaseBroadcastPayload["table"];
        type?: DatabaseBroadcastPayload["type"];
        record?: Record<string, unknown> | null;
        old_record?: Record<string, unknown> | null;
      };

      const data: DatabaseBroadcastPayload = envelope.payload?.table
        ? envelope.payload
        : {
            schema: "public",
            table: envelope.table as DatabaseBroadcastPayload["table"],
            type: envelope.type as DatabaseBroadcastPayload["type"],
            record: envelope.record ?? null,
            old_record: envelope.old_record ?? null,
          };

      if (!data.table || !data.type) return;

      if (data.table === "tokens") {
        if (data.type === "DELETE") {
          const oldId = data.old_record?.id as string | undefined;
          if (oldId) removeToken(oldId);
        } else if (data.record) {
          upsertToken(data.record as unknown as Token);
        }
      } else if (data.table === "scenes") {
        if (data.type === "DELETE") {
          const oldId = data.old_record?.id as string | undefined;
          if (oldId) removeScene(oldId);
        } else if (data.record) {
          const scene = data.record as unknown as Scene;
          upsertScene(scene);

          // Se a cena acabou de ser ativada, recarrega os tokens dela via REST
          if (scene.is_active) {
            const { data: sceneTokens } = await supabase
              .from("tokens")
              .select("*")
              .eq("scene_id", scene.id);
            if (!isUnmounted && sceneTokens) {
              sceneTokens.forEach((t) => upsertToken(t));
            }
          }
        }
      } else if (data.table === "messages") {
        onMessageRef.current?.(
          data.type,
          (data.record as unknown as MessageRow) ?? null,
          (data.old_record as unknown as MessageRow) ?? null
        );
      } else if (data.table === "characters") {
        onCharacterRef.current?.(
          data.type,
          (data.record as unknown as CharacterRow) ?? null,
          (data.old_record as unknown as CharacterRow) ?? null
        );
      }
    };

    const attachDbEvents = (ch: RealtimeChannel) => {
      ch.on("broadcast", { event: "INSERT" }, handleDbBroadcast)
        .on("broadcast", { event: "UPDATE" }, handleDbBroadcast)
        .on("broadcast", { event: "DELETE" }, handleDbBroadcast);
    };

    // 1. Canal principal da campanha (membros)
    const mainChannel = supabase.channel(`campaign:${campaignId}`, {
      config: {
        private: true,
        broadcast: { self: false },
      },
    });

    attachDbEvents(mainChannel);

    mainChannel
      .on("broadcast", { event: "token:drag" }, (msg) => {
        const p = msg.payload as TokenDragPayload | undefined;
        if (!p || !p.tokenId || p.userId === currentUserId) return;

        // Verifica se o remetente tem permissão de mover o token antes de exibir o drag efêmero
        const token = useBoardStore
          .getState()
          .tokens.find((t) => t.id === p.tokenId);
        if (!token) return;

        const senderIsGm = gmIdsRef.current.has(p.userId);
        const senderIsOwner = token.owner_id === p.userId;
        if (!senderIsGm && !senderIsOwner) return;

        setRemoteTokenDrag(p.tokenId, {
          x: p.x,
          y: p.y,
          userId: p.userId,
          ts: p.ts,
        });
      })
      .on("broadcast", { event: "ruler:move" }, (msg) => {
        const p = msg.payload as RulerBroadcastPayload | undefined;
        if (!p || !p.userId || p.userId === currentUserId) return;
        setRemoteRuler(p);
      })
      .on("broadcast", { event: "combat:state" }, (msg) => {
        const p = msg.payload as CombatStatePayload | undefined;
        if (!p) return;
        setCombatState(p);
      })
      .subscribe((st) => {
        if (isUnmounted) return;
        if (st === "SUBSCRIBED") setStatus("connected");
        else if (st === "CHANNEL_ERROR" || st === "TIMED_OUT")
          setStatus("error");
      });

    mainChannelRef.current = mainChannel;

    // 2. Canal exclusivo do GM (cenas secretas e todas as fichas) ou canal privado de fichas do jogador
    const secondaryTopic =
      role === "gm"
        ? `campaign:${campaignId}:gm`
        : `campaign:${campaignId}:user:${currentUserId}`;

    const secondaryChannel = supabase.channel(secondaryTopic, {
      config: {
        private: true,
        broadcast: { self: false },
      },
    });

    attachDbEvents(secondaryChannel);
    secondaryChannel.subscribe();

    // Mantém o token JWT do WebSocket atualizado quando a sessão renova
    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }
    });

    return () => {
      isUnmounted = true;
      mainChannelRef.current = null;
      authSub.unsubscribe();
      supabase.removeChannel(mainChannel);
      supabase.removeChannel(secondaryChannel);
    };
  }, [
    campaignId,
    currentUserId,
    role,
    upsertScene,
    removeScene,
    upsertToken,
    removeToken,
    setRemoteTokenDrag,
    setRemoteRuler,
    setCombatState,
  ]);

  const lastDragSentRef = useRef(0);
  const lastRulerSentRef = useRef(0);

  const broadcastTokenDrag = useCallback(
    (tokenId: string, sceneId: string, x: number, y: number) => {
      const now = Date.now();
      if (now - lastDragSentRef.current < 45) return;
      lastDragSentRef.current = now;

      const payload: TokenDragPayload = {
        tokenId,
        sceneId,
        x,
        y,
        userId: currentUserId,
        ts: now,
      };
      mainChannelRef.current?.send({
        type: "broadcast",
        event: "token:drag",
        payload,
      });
    },
    [currentUserId]
  );

  const broadcastRuler = useCallback(
    (sceneId: string, start: Point2D, end: Point2D, active: boolean) => {
      const now = Date.now();
      if (active && now - lastRulerSentRef.current < 45) return;
      lastRulerSentRef.current = now;

      const payload: RulerBroadcastPayload = {
        userId: currentUserId,
        username: currentUsername,
        color: pickColorForUser(currentUserId),
        sceneId,
        startX: start.x,
        startY: start.y,
        endX: end.x,
        endY: end.y,
        active,
      };
      mainChannelRef.current?.send({
        type: "broadcast",
        event: "ruler:move",
        payload,
      });
    },
    [currentUserId, currentUsername]
  );

  const broadcastCombatState = useCallback((combat: CombatStatePayload) => {
    mainChannelRef.current?.send({
      type: "broadcast",
      event: "combat:state",
      payload: combat,
    });
  }, []);

  return {
    status,
    broadcastTokenDrag,
    broadcastRuler,
    broadcastCombatState,
  };
}
