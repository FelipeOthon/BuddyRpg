"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Dices, KeyRound, Loader2, UserCheck } from "lucide-react";
import { joinCampaignByCodeAction } from "@/actions/campaigns";

export default function JoinCampaignCard({ code }: { code: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleJoin = () => {
    setError(null);
    startTransition(async () => {
      const res = await joinCampaignByCodeAction({ code });
      if (!res.ok) {
        setError(res.error ?? "Código inválido ou expirado.");
        return;
      }
      if (res.campaignId) {
        router.push(`/campaign/${res.campaignId}`);
      } else {
        router.push("/dashboard");
      }
    });
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 text-center shadow-2xl">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
        <KeyRound className="h-6 w-6" />
      </div>
      <h1 className="text-xl font-bold text-white">Convite para Campanha</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Você foi convidado para entrar em uma mesa no BuddyRPG com o código:
      </p>

      <div className="my-5 rounded-xl border border-zinc-800 bg-zinc-950 py-3 font-mono text-lg font-bold tracking-widest text-amber-400">
        {code.toUpperCase()}
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-left text-xs text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="button"
        onClick={handleJoin}
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-60"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Entrando na mesa...
          </>
        ) : (
          <>
            <UserCheck className="h-4 w-4" />
            Aceitar Convite e Entrar
          </>
        )}
      </button>

      <Link
        href="/dashboard"
        className="mt-4 inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white"
      >
        <Dices className="h-3.5 w-3.5" />
        Voltar para o Dashboard
      </Link>
    </div>
  );
}
