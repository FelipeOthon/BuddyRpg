import Link from "next/link";
import { ArrowLeft, Compass, Dices } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-zinc-950 px-6 py-20 text-center text-zinc-100">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
        <Compass className="h-7 w-7" />
      </div>
      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-amber-400">
        Erro 404 — Mapa Desconhecido
      </p>
      <h1 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">
        Esta sala ou página não foi encontrada
      </h1>
      <p className="mt-2 max-w-md text-sm text-zinc-400">
        Verifique se o endereço está correto ou se você já entrou na campanha
        usando o código de convite do Mestre.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-semibold text-zinc-950 transition hover:bg-amber-400"
        >
          <Dices className="h-4 w-4" />
          Ir para o Dashboard
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-2.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-700 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Página Inicial
        </Link>
      </div>
    </main>
  );
}
