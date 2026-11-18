"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Dices,
  Loader2,
  LogIn,
  Shield,
  UserPlus,
} from "lucide-react";
import { signInAction, signUpAction } from "@/actions/auth";

export default function LoginForm({
  isConfigured,
}: {
  isConfigured: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") ?? "/dashboard";

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    startTransition(async () => {
      if (mode === "login") {
        const res = await signInAction({ email, password, next: nextUrl });
        if (!res.ok) {
          setError(res.error ?? "Erro ao entrar.");
          return;
        }
        if (res.redirectTo) {
          router.push(res.redirectTo);
          router.refresh();
        }
      } else {
        const res = await signUpAction({
          username,
          email,
          password,
          next: nextUrl,
        });
        if (!res.ok) {
          setError(res.error ?? "Erro ao criar conta.");
          return;
        }
        if (res.redirectTo) {
          router.push(res.redirectTo);
          router.refresh();
          return;
        }
        if (res.message) {
          setInfoMessage(res.message);
        }
      }
    });
  };

  return (
    <div className="fr-card w-full max-w-md rounded-2xl p-8 backdrop-blur">
      <div className="mb-6 flex flex-col items-center text-center">
        <Link href="/" className="mb-3 flex items-center gap-2.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/15 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
            <Dices className="h-6 w-6" />
          </div>
          <span className="font-display text-xl font-bold tracking-wider text-amber-100">
            BUDDY<span className="text-amber-400">RPG</span>
          </span>
        </Link>
        <p className="text-xs text-amber-200/70">
          Portais de Faerûn — Identifique-se para acessar as crônicas e mesas
        </p>
      </div>

      {!isConfigured && (
        <div className="mb-5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-200">
          <p className="font-semibold">Configuração pendente (.env.local)</p>
          <p className="mt-1 text-amber-300/90">
            Configure <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
            <code className="font-mono">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>{" "}
            seguindo <code className="font-mono">docs/MANUAL_INSTALACAO.md</code>.
          </p>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 rounded-xl border border-amber-500/25 bg-zinc-950/90 p-1">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
            setInfoMessage(null);
          }}
          className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition ${
            mode === "login"
              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 shadow"
              : "text-zinc-400 hover:text-amber-200"
          }`}
        >
          <LogIn className="h-3.5 w-3.5" />
          Entrar
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setError(null);
            setInfoMessage(null);
          }}
          className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition ${
            mode === "signup"
              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 shadow"
              : "text-zinc-400 hover:text-amber-200"
          }`}
        >
          <UserPlus className="h-3.5 w-3.5" />
          Novo Registro
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {infoMessage && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <span>{infoMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <div>
            <label
              htmlFor="username"
              className="mb-1.5 block text-xs font-semibold text-amber-200/90"
            >
              Nome de Aventureiro / Mestre
            </label>
            <input
              id="username"
              type="text"
              required
              minLength={3}
              maxLength={24}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ex: elminster_sabio"
              className="w-full rounded-xl border border-amber-500/25 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-amber-400"
            />
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-xs font-semibold text-amber-200/90"
          >
            E-mail
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="aventureiro@faerun.com"
            className="w-full rounded-xl border border-amber-500/25 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-amber-400"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-xs font-semibold text-amber-200/90"
          >
            Palavra-Passe (Senha)
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo de 6 caracteres"
            className="w-full rounded-xl border border-amber-500/25 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-amber-400"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 text-sm font-bold text-zinc-950 shadow-[0_0_20px_rgba(245,158,11,0.25)] transition hover:from-amber-400 hover:to-amber-500 disabled:opacity-60"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Conjurando Portal...
            </>
          ) : mode === "login" ? (
            <>
              <Shield className="h-4 w-4" />
              Entrar no Salão
            </>
          ) : (
            "Inscrever-se na Guilda"
          )}
        </button>
      </form>
    </div>
  );
}
