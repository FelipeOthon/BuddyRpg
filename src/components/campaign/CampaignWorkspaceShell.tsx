"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  Crown,
  Grid,
  Layers,
  Link2,
  MessageSquare,
  ScrollText,
  UserCheck,
  Users,
} from "lucide-react";
import BoardClient from "@/components/board/BoardClient";
import SceneManager from "@/components/scenes/SceneManager";
import { useBoardStore } from "@/stores/boardStore";
import type { Campaign, CampaignRole, Scene, Token } from "@/types/domain";

export interface CampaignMemberInfo {
  userId: string;
  username: string;
  role: CampaignRole;
}

type SidebarTab = "chat" | "sheets" | "scenes" | "members";

export default function CampaignWorkspaceShell({
  campaign,
  currentUserId,
  role,
  initialScenes,
  initialTokens,
  members,
}: {
  campaign: Campaign;
  currentUserId: string;
  role: CampaignRole;
  initialScenes: Scene[];
  initialTokens: Token[];
  members: CampaignMemberInfo[];
}) {
  const isGm = role === "gm";
  const [activeTab, setActiveTab] = useState<SidebarTab>(
    isGm ? "scenes" : "members"
  );
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const { scenes, viewedSceneId, hydrateBoard } = useBoardStore();

  useEffect(() => {
    hydrateBoard({
      scenes: initialScenes,
      tokens: initialTokens,
    });
  }, [initialScenes, initialTokens, hydrateBoard]);

  const effectiveScenes = scenes.length > 0 ? scenes : initialScenes;
  const viewedScene =
    (isGm
      ? effectiveScenes.find((s) => s.id === viewedSceneId)
      : undefined) ??
    effectiveScenes.find((s) => s.is_active) ??
    effectiveScenes[0] ??
    null;

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
      <header className="flex h-13 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900/90 px-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-700 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </Link>
          <div className="h-4 w-px bg-zinc-800" />
          <h1 className="truncate text-sm font-bold text-white sm:text-base">
            {campaign.title}
          </h1>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
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

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs sm:flex">
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
        </div>
      </header>

      {/* Corpo: Tabuleiro Konva à esquerda + Sidebar à direita */}
      <div className="flex flex-1 overflow-hidden">
        <section className="relative flex flex-1 overflow-hidden bg-zinc-950">
          {viewedScene ? (
            <BoardClient
              scene={viewedScene}
              currentUserId={currentUserId}
              role={role}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
              <Grid className="h-8 w-8 text-zinc-600" />
              <p className="mt-2 text-sm font-medium text-zinc-300">
                Nenhuma cena ativa no momento
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {isGm
                  ? "Crie ou ative uma cena na aba Cenas ao lado."
                  : "Aguarde o Mestre ativar uma cena."}
              </p>
            </div>
          )}
        </section>

        {/* Sidebar Lateral */}
        <aside className="flex w-80 shrink-0 flex-col border-l border-zinc-800 bg-zinc-900/80 sm:w-96">
          <nav
            className={`grid ${
              isGm ? "grid-cols-4" : "grid-cols-3"
            } border-b border-zinc-800 bg-zinc-950/60 p-1`}
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
              Membros ({members.length})
            </button>
          </nav>

          <div className="flex-1 overflow-y-auto p-4">
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
                  Participantes ({members.length})
                </h3>
                <ul className="space-y-2">
                  {members.map((m) => (
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

            {activeTab === "chat" && (
              <p className="text-xs text-zinc-400">
                O chat persistente e o rolador de dados (
                <code className="font-mono">/roll</code>) serão ativados na Fase
                5.
              </p>
            )}

            {activeTab === "sheets" && (
              <p className="text-xs text-zinc-400">
                As fichas privadas em JSONB (com cadeado do Mestre 🔒) serão
                ativadas na Fase 6.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
