import Link from "next/link";
import { Dices, Map, Shield, Sparkles, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Dices className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              Buddy<span className="text-amber-400">RPG</span>
            </span>
          </div>
          <nav className="flex items-center gap-3">
            <Link
              href="/api/health"
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-medium text-zinc-300 transition hover:border-zinc-700 hover:text-white"
            >
              Status da API
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex flex-1 max-w-6xl flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-medium text-amber-300">
          <Sparkles className="h-3.5 w-3.5" />
          Virtual Tabletop Minimalista em Tempo Real
        </div>

        <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
          Sua mesa de RPG online,{" "}
          <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            rápida e sem complicação
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
          Mapas interativos com grade configurável, tokens sincronizados em tempo
          real, rolador de dados integrado no chat e fichas flexíveis com
          controle do Mestre.
        </p>

        <div className="mt-14 grid w-full max-w-4xl gap-4 text-left sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-5">
            <Map className="h-6 w-6 text-amber-400" />
            <h2 className="mt-3 text-base font-semibold text-white">
              Tabuleiro Fluido
            </h2>
            <p className="mt-1.5 text-sm text-zinc-400">
              Canvas HTML5 com zoom, pan, régua em metros/quadrados e encaixe
              automático na grade.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-5">
            <Users className="h-6 w-6 text-amber-400" />
            <h2 className="mt-3 text-base font-semibold text-white">
              Tokens em Tempo Real
            </h2>
            <p className="mt-1.5 text-sm text-zinc-400">
              Arraste suave via WebSocket Broadcast e permissões por jogador e
              Mestre.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-5">
            <Shield className="h-6 w-6 text-amber-400" />
            <h2 className="mt-3 text-base font-semibold text-white">
              Dados & Fichas Seguras
            </h2>
            <p className="mt-1.5 text-sm text-zinc-400">
              Rolagens auditadas no servidor e fichas privadas liberadas pelo
              Mestre quando necessário.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
