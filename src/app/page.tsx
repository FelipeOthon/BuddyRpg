import Link from "next/link";
import {
  ArrowRight,
  Compass,
  Crown,
  Dices,
  LogIn,
  ScrollText,
  Shield,
  Sparkles,
  Swords,
  Wand2,
} from "lucide-react";

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-zinc-950 text-amber-50">
      {/* Brilho Arcano de Fundo */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(217,119,6,0.16),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

      <header className="relative z-10 border-b border-amber-500/20 bg-zinc-950/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-500/25 to-amber-900/20 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Dices className="h-5 w-5" />
            </div>
            <div>
              <span className="font-display text-lg font-bold tracking-wider text-amber-100">
                BUDDY<span className="text-amber-400">RPG</span>
              </span>
              <span className="ml-2 hidden rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-amber-300 sm:inline-block">
                Forgotten Realms Edition
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-zinc-900/90 px-4 py-2 text-xs font-semibold text-amber-200 transition hover:border-amber-400 hover:bg-zinc-800 hover:text-white"
            >
              <LogIn className="h-3.5 w-3.5 text-amber-400" />
              Entrar na Taverna
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-bold text-zinc-950 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition hover:from-amber-400 hover:to-amber-500"
            >
              Salão de Campanhas
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex flex-1 max-w-6xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.15)]">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          De Águas Profundas à Costa da Espada — Seu Tabuleiro Virtual em Tempo Real
        </div>

        <h1 className="font-display max-w-4xl text-4xl font-extrabold tracking-wide text-amber-50 sm:text-6xl">
          Forje Lendas nas Terras de{" "}
          <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-orange-500 bg-clip-text text-transparent">
            Faerûn
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-300/90 sm:text-lg">
          Dados 3D arremessados sobre o mapa em tempo real, fichas completas no
          estilo Roll20 para <strong className="text-amber-300">D&amp;D 5e</strong> e
          outros sistemas, e uma Forja Procedural de Masmorras integrada para o
          Mestre.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 px-7 py-3.5 text-sm font-bold text-zinc-950 shadow-[0_0_30px_rgba(245,158,11,0.35)] transition hover:brightness-110"
          >
            <Crown className="h-4 w-4" />
            Abrir Crônicas &amp; Mesas
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl border border-amber-500/35 bg-zinc-900/80 px-7 py-3.5 text-sm font-semibold text-amber-100 transition hover:border-amber-400 hover:bg-zinc-800"
          >
            <Swords className="h-4 w-4 text-amber-400" />
            Criar Conta de Aventureiro
          </Link>
        </div>

        <div className="mt-16 grid w-full max-w-5xl gap-5 text-left sm:grid-cols-2 lg:grid-cols-4">
          <div className="fr-card rounded-2xl p-5 transition hover:border-amber-400/60">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <Dices className="h-5 w-5" />
            </div>
            <h2 className="font-display mt-3.5 text-base font-bold text-amber-100">
              Dados 3D no Tabuleiro
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
              Poliedros 3D (d4 ao d20) rolam e quicam em cima do mapa na tela de
              todos os jogadores, com explosão dourada no 20 Natural.
            </p>
          </div>

          <div className="fr-card rounded-2xl p-5 transition hover:border-amber-400/60">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <ScrollText className="h-5 w-5" />
            </div>
            <h2 className="font-display mt-3.5 text-base font-bold text-amber-100">
              Fichas D&amp;D 5e &amp; Roll20
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
              CA, PV, 18 Perícias, Testes de Resistência, Ataques, Grimório com
              Spell Slots e suporte multi-sistema com rolagem em 1 clique.
            </p>
          </div>

          <div className="fr-card rounded-2xl p-5 transition hover:border-amber-400/60">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <Wand2 className="h-5 w-5" />
            </div>
            <h2 className="font-display mt-3.5 text-base font-bold text-amber-100">
              Forja de Mapas do Mestre
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
              Gere masmorras de Undermountain, cavernas do Underdark, florestas
              de Cormyr e tavernas de Waterdeep alinhadas à grade.
            </p>
          </div>

          <div className="fr-card rounded-2xl p-5 transition hover:border-amber-400/60">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <Compass className="h-5 w-5" />
            </div>
            <h2 className="font-display mt-3.5 text-base font-bold text-amber-100">
              Tática &amp; Segredos do GM
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
              Cenas ocultas preparadas pelo Mestre, régua compartilhada em
              metros/quadrados e fichas privadas com cadeado arcano 🔒.
            </p>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-amber-500/15 bg-zinc-950/90 py-4 text-center text-xs text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-amber-500/70" />
          BuddyRPG V2 — Forgotten Realms Edition · Custo Zero &amp; Tempo Real
        </span>
      </footer>
    </div>
  );
}
