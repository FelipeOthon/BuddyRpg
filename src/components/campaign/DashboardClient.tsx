"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  Copy,
  Crown,
  Dices,
  ExternalLink,
  KeyRound,
  Link2,
  Loader2,
  LogOut,
  Plus,
  Scroll,
  Swords,
  Trash2,
} from "lucide-react";
import {
  createCampaignAction,
  joinCampaignByCodeAction,
  leaveOrDeleteCampaignAction,
} from "@/actions/campaigns";
import { signOutAction } from "@/actions/auth";
import type { CampaignRole } from "@/types/domain";

export interface DashboardCampaignItem {
  id: string;
  title: string;
  invite_code: string;
  created_at: string;
  role: CampaignRole;
}

export default function DashboardClient({
  username,
  email,
  campaigns,
}: {
  username: string;
  email: string;
  campaigns: DashboardCampaignItem[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const copyText = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createCampaignAction({ title });
      if (!res.ok) {
        setError(res.error ?? "Erro ao criar campanha.");
        return;
      }
      setTitle("");
      if (res.campaignId) {
        router.push(`/campaign/${res.campaignId}`);
      } else {
        router.refresh();
      }
    });
  };

  const handleJoinCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await joinCampaignByCodeAction({ code: inviteCode });
      if (!res.ok) {
        setError(res.error ?? "Erro ao entrar na campanha.");
        return;
      }
      setInviteCode("");
      if (res.campaignId) {
        router.push(`/campaign/${res.campaignId}`);
      } else {
        router.refresh();
      }
    });
  };

  const handleLeaveOrDelete = (item: DashboardCampaignItem) => {
    const confirmMsg =
      item.role === "gm"
        ? `Tem certeza que deseja excluir permanentemente a crônica "${item.title}"?`
        : `Deseja deixar a companhia "${item.title}"?`;
    if (!window.confirm(confirmMsg)) return;

    setError(null);
    startTransition(async () => {
      const res = await leaveOrDeleteCampaignAction({
        campaignId: item.id,
        isGm: item.role === "gm",
      });
      if (!res.ok) {
        setError(res.error ?? "Operação falhou.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-1 flex-col bg-zinc-950 text-zinc-100">
      <header className="border-b border-amber-500/20 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/15 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Dices className="h-5 w-5" />
            </div>
            <div>
              <span className="font-display text-lg font-bold tracking-wider text-amber-100">
                BUDDY<span className="text-amber-400">RPG</span>
              </span>
              <span className="ml-2 hidden rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-amber-300 sm:inline-block">
                Salão da Guilda
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="font-display text-sm font-bold text-amber-100">
                {username}
              </p>
              <p className="text-xs text-zinc-400">{email}</p>
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl border border-amber-500/25 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-amber-200 transition hover:border-amber-400 hover:text-white"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        {error && (
          <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Card: Criar Nova Campanha */}
          <form
            onSubmit={handleCreateCampaign}
            className="fr-card rounded-2xl p-6"
          >
            <div className="flex items-center gap-2.5 text-amber-400">
              <Crown className="h-5 w-5" />
              <h2 className="font-display text-base font-bold text-amber-100">
                Forjar Nova Crônica (Mestre do Jogo)
              </h2>
            </div>
            <p className="mt-1.5 text-xs text-zinc-400">
              Inicie uma campanha em Faerûn, gere masmorras procedurais, controle
              monstros e convide seu grupo.
            </p>
            <div className="mt-4 flex gap-2.5">
              <input
                type="text"
                required
                minLength={2}
                maxLength={80}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: A Maldição de Strahd / Costa da Espada"
                className="flex-1 rounded-xl border border-amber-500/25 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-950 shadow transition hover:from-amber-400 hover:to-amber-500 disabled:opacity-60"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Criar Mesa
              </button>
            </div>
          </form>

          {/* Card: Entrar com Código */}
          <form
            onSubmit={handleJoinCampaign}
            className="fr-card rounded-2xl p-6"
          >
            <div className="flex items-center gap-2.5 text-emerald-400">
              <KeyRound className="h-5 w-5" />
              <h2 className="font-display text-base font-bold text-amber-100">
                Juntar-se a uma Companhia (Aventureiro)
              </h2>
            </div>
            <p className="mt-1.5 text-xs text-zinc-400">
              Insira o selo de convite de 8 caracteres fornecido pelo seu Mestre
              para abrir o portal da mesa.
            </p>
            <div className="mt-4 flex gap-2.5">
              <input
                type="text"
                required
                minLength={4}
                maxLength={16}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Ex: A1B2C3D4"
                className="flex-1 rounded-xl border border-amber-500/25 bg-zinc-950 px-3.5 py-2.5 font-mono text-sm uppercase tracking-wider text-amber-200 placeholder-zinc-500 outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-60"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Swords className="h-4 w-4" />
                )}
                Entrar
              </button>
            </div>
          </form>
        </div>

        {/* Lista de Campanhas */}
        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display flex items-center gap-2 text-lg font-bold text-amber-100">
              <Scroll className="h-5 w-5 text-amber-400" />
              Crônicas Ativas ({campaigns.length})
            </h2>
          </div>

          {campaigns.length === 0 ? (
            <div className="fr-card rounded-2xl border-dashed p-12 text-center">
              <Dices className="mx-auto h-10 w-10 text-amber-500/40" />
              <p className="font-display mt-3 text-base font-bold text-amber-100">
                Nenhuma crônica registrada em seu grimório
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                Forje uma nova campanha acima ou use o código de convite do seu
                Mestre.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((c) => {
                const isGm = c.role === "gm";
                return (
                  <div
                    key={c.id}
                    className="fr-card flex flex-col justify-between rounded-2xl p-5 transition hover:border-amber-400/60"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            isGm
                              ? "border border-amber-500/40 bg-amber-500/15 text-amber-300"
                              : "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                          }`}
                        >
                          {isGm ? (
                            <>
                              <Crown className="h-3 w-3" />
                              Mestre do Jogo
                            </>
                          ) : (
                            <>
                              <Swords className="h-3 w-3" />
                              Aventureiro
                            </>
                          )}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleLeaveOrDelete(c)}
                          title={
                            isGm ? "Excluir campanha" : "Sair da campanha"
                          }
                          className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <h3 className="font-display mt-3 text-lg font-bold text-amber-50">
                        {c.title}
                      </h3>

                      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/20 bg-zinc-950/90 p-2.5 text-xs">
                        <span className="text-zinc-400">Selo:</span>
                        <code className="font-mono font-bold tracking-wider text-amber-300">
                          {c.invite_code}
                        </code>
                        <div className="ml-auto flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              copyText(`code-${c.id}`, c.invite_code)
                            }
                            title="Copiar código"
                            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-amber-300"
                          >
                            {copiedKey === `code-${c.id}` ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              copyText(
                                `link-${c.id}`,
                                `${window.location.origin}/join/${c.invite_code}`
                              )
                            }
                            title="Copiar link de convite"
                            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-amber-300"
                          >
                            {copiedKey === `link-${c.id}` ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Link2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5">
                      <Link
                        href={`/campaign/${c.id}`}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-zinc-950 shadow transition hover:from-amber-400 hover:to-amber-500"
                      >
                        Entrar na Mesa
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-amber-500/15 bg-zinc-950/80 py-5 text-center text-xs text-zinc-500">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 sm:flex-row">
          <span>
            BuddyRPG · Criado por{" "}
            <span className="font-medium text-amber-300">Felipe Othon</span> &amp;{" "}
            <span className="font-medium text-amber-300">Fabrício Vaz</span>
          </span>
          <div className="flex items-center gap-3 text-zinc-400">
            <Link href="/#historia" className="transition hover:text-amber-300">
              História do Projeto
            </Link>
            <span>·</span>
            <a
              href="https://github.com/FelipeOthon/BuddyRpg"
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:text-amber-300"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
