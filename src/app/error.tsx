"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-zinc-950 px-6 py-20 text-center text-zinc-100">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h1 className="text-2xl font-extrabold text-white">
        Algo deu errado na aventura
      </h1>
      <p className="mt-2 max-w-md text-xs text-zinc-400">
        {error.message || "Ocorreu um erro inesperado ao processar esta rota."}
      </p>
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-semibold text-zinc-950 transition hover:bg-amber-400"
        >
          <RotateCcw className="h-4 w-4" />
          Tentar Novamente
        </button>
        <Link
          href="/dashboard"
          className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-2.5 text-xs font-medium text-zinc-300 transition hover:text-white"
        >
          Voltar ao Dashboard
        </Link>
      </div>
    </main>
  );
}
