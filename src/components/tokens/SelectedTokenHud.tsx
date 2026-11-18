"use client";

import { useCallback, useEffect, useTransition } from "react";
import {
  Eye,
  EyeOff,
  Heart,
  Loader2,
  Minus,
  Plus,
  ScrollText,
  Trash2,
  X,
} from "lucide-react";

const QUICK_CONDITIONS = [
  "Caído",
  "Envenenado",
  "Atordoado",
  "Concentrando",
  "Invisível",
  "Morto",
] as const;
import { deleteTokenAction, updateTokenStatsAction } from "@/actions/tokens";
import { useBoardStore } from "@/stores/boardStore";
import type { CampaignRole, CharacterRow, Token } from "@/types/domain";

export default function SelectedTokenHud({
  campaignId,
  currentUserId,
  role,
  characters = [],
  onOpenCharacter,
  onError,
}: {
  campaignId: string;
  currentUserId: string;
  role: CampaignRole;
  characters?: CharacterRow[];
  onOpenCharacter?: (char: CharacterRow) => void;
  onError?: (msg: string) => void;
}) {
  const {
    tokens,
    selectedTokenId,
    setSelectedTokenId,
    upsertToken,
    removeToken,
  } = useBoardStore();
  const [isPending, startTransition] = useTransition();

  const token: Token | undefined = tokens.find(
    (t) => t.id === selectedTokenId
  );

  const linkedCharacter = token?.character_id
    ? characters.find((c) => c.id === token.character_id)
    : undefined;

  const canEdit = Boolean(
    token &&
      !token.id.startsWith("demo-token-") &&
      (role === "gm" ||
        token.owner_id === currentUserId ||
        linkedCharacter?.owner_id === currentUserId)
  );

  const handleDelete = useCallback(() => {
    if (!token || token.id.startsWith("demo-token-") || !canEdit) return;
    if (!window.confirm(`Remover o token "${token.name}" do tabuleiro?`))
      return;

    const prevToken = token;
    removeToken(token.id);

    startTransition(async () => {
      const res = await deleteTokenAction({
        tokenId: prevToken.id,
        campaignId,
      });
      if (!res.ok) {
        upsertToken(prevToken);
        onError?.(res.error ?? "Erro ao excluir token.");
      }
    });
  }, [token, canEdit, removeToken, campaignId, upsertToken, onError]);

  useEffect(() => {
    if (!token || token.id.startsWith("demo-token-") || !canEdit) return;

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
      if (e.key === "Delete") {
        e.preventDefault();
        handleDelete();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [token, canEdit, handleDelete]);

  if (!token || token.id.startsWith("demo-token-")) {
    return null;
  }

  const adjustHp = (delta: number) => {
    if (!canEdit) return;
    const nextHp = Math.min(
      Math.max((token.hp_current ?? token.hp_max) + delta, 0),
      token.hp_max
    );
    const prevToken = token;

    upsertToken({
      ...token,
      hp_current: nextHp,
      updated_at: new Date().toISOString(),
    });

    startTransition(async () => {
      const res = await updateTokenStatsAction({
        tokenId: token.id,
        campaignId,
        hpCurrent: nextHp,
      });
      if (!res.ok) {
        upsertToken(prevToken);
        onError?.(res.error ?? "Erro ao atualizar HP.");
      } else if (res.token) {
        upsertToken(res.token);
      }
    });
  };

  const toggleHidden = () => {
    if (role !== "gm") return;
    const nextHidden = !token.is_hidden;
    const prevToken = token;

    upsertToken({
      ...token,
      is_hidden: nextHidden,
      updated_at: new Date().toISOString(),
    });

    startTransition(async () => {
      const res = await updateTokenStatsAction({
        tokenId: token.id,
        campaignId,
        isHidden: nextHidden,
      });
      if (!res.ok) {
        upsertToken(prevToken);
        onError?.(res.error ?? "Erro ao alterar visibilidade.");
      } else if (res.token) {
        upsertToken(res.token);
      }
    });
  };

  const toggleCondition = (cond: string) => {
    if (!canEdit) return;
    const current = token.conditions ?? [];
    const nextConditions = current.includes(cond)
      ? current.filter((c) => c !== cond)
      : [...current, cond];
    const prevToken = token;

    upsertToken({
      ...token,
      conditions: nextConditions,
      updated_at: new Date().toISOString(),
    });

    startTransition(async () => {
      const res = await updateTokenStatsAction({
        tokenId: token.id,
        campaignId,
        conditions: nextConditions,
      });
      if (!res.ok) {
        upsertToken(prevToken);
        onError?.(res.error ?? "Erro ao atualizar condições.");
      } else if (res.token) {
        upsertToken(res.token);
      }
    });
  };

  return (
    <div className="pointer-events-auto absolute bottom-3 left-1/2 z-20 flex max-w-[94vw] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-2xl border border-zinc-700/80 bg-zinc-900/95 px-3 py-2 shadow-2xl backdrop-blur sm:bottom-4 sm:gap-3 sm:px-4 sm:py-2.5">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-500/40 bg-zinc-800 text-xs font-bold text-amber-300">
          {token.size}x{token.size}
        </div>
        <div>
          <p className="text-xs font-bold text-white">{token.name}</p>
          <p className="flex items-center gap-1 text-[11px] text-zinc-400">
            <Heart className="h-3 w-3 text-rose-400" />
            <span>
              HP: <strong className="text-white">{token.hp_current}</strong> /{" "}
              {token.hp_max}
            </span>
          </p>
        </div>
      </div>

      {linkedCharacter && onOpenCharacter && (
        <>
          <div className="h-6 w-px bg-zinc-800" />
          <button
            type="button"
            onClick={() => onOpenCharacter(linkedCharacter)}
            className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20"
            title="Abrir ficha vinculada"
          >
            <ScrollText className="h-3.5 w-3.5" />
            Ficha
          </button>
        </>
      )}

      {canEdit && (
        <>
          <div className="h-6 w-px bg-zinc-800" />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => adjustHp(-5)}
              disabled={isPending}
              className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
            >
              -5
            </button>
            <button
              type="button"
              onClick={() => adjustHp(-1)}
              disabled={isPending}
              className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-1.5 text-rose-300 transition hover:bg-rose-500/20"
              title="-1 HP"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => adjustHp(1)}
              disabled={isPending}
              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-1.5 text-emerald-300 transition hover:bg-emerald-500/20"
              title="+1 HP"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => adjustHp(5)}
              disabled={isPending}
              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
            >
              +5
            </button>
          </div>

          {role === "gm" && (
            <>
              <div className="h-6 w-px bg-zinc-800" />
              <button
                type="button"
                onClick={toggleHidden}
                disabled={isPending}
                title={
                  token.is_hidden
                    ? "Token oculto dos jogadores (clique para revelar)"
                    : "Ocultar token dos jogadores"
                }
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition ${
                  token.is_hidden
                    ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                    : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-white"
                }`}
              >
                {token.is_hidden ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5" />
                    Oculto
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" />
                    Visível
                  </>
                )}
              </button>
            </>
          )}

          <div className="h-6 w-px bg-zinc-800" />
          <div className="flex flex-wrap items-center gap-1">
            {QUICK_CONDITIONS.map((cond) => {
              const active = (token.conditions ?? []).includes(cond);
              return (
                <button
                  key={cond}
                  type="button"
                  disabled={isPending}
                  onClick={() => toggleCondition(cond)}
                  className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold transition ${
                    active
                      ? "border-rose-500/50 bg-rose-500/20 text-rose-200"
                      : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {cond}
                </button>
              );
            })}
          </div>

          <div className="h-6 w-px bg-zinc-800" />
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            title="Excluir token (Delete)"
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-red-500/10 hover:text-red-400"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </>
      )}

      <button
        type="button"
        onClick={() => setSelectedTokenId(null)}
        title="Fechar seleção"
        className="rounded-lg p-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
