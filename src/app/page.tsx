import Link from "next/link";
import {
  ArrowRight,
  Compass,
  Crown,
  Dices,
  ExternalLink,
  Flame,
  Globe,
  Heart,
  History,
  LogIn,
  ScrollText,
  Shield,
  Sparkles,
  Swords,
  Tv,
  Wand2,
} from "lucide-react";

function GithubIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-zinc-950 text-amber-50">
      {/* Brilho Arcano de Fundo */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(217,119,6,0.16),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

      {/* Cabeçalho */}
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

          <nav className="flex items-center gap-2 sm:gap-3">
            <a
              href="#historia"
              className="hidden items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-900 hover:text-amber-300 md:inline-flex"
            >
              <History className="h-3.5 w-3.5 text-amber-400" />
              Nossa História
            </a>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-zinc-900/90 px-3.5 py-2 text-xs font-semibold text-amber-200 transition hover:border-amber-400 hover:bg-zinc-800 hover:text-white"
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

      {/* Hero Principal */}
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

        {/* Recursos em Destaque */}
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

        {/* ============================================================== */}
        {/* SEÇÃO: HISTÓRIA & ORIGEM DO PROJETO                           */}
        {/* ============================================================== */}
        <section
          id="historia"
          className="mt-24 w-full max-w-5xl scroll-mt-20 border-t border-amber-500/20 pt-16 text-left"
        >
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-300">
              <History className="h-3.5 w-3.5 text-amber-400" />
              Origem &amp; História da Forja
            </div>
            <h2 className="font-display mt-4 text-3xl font-extrabold tracking-wide text-amber-50 sm:text-4xl">
              Como Nasceu o{" "}
              <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
                BuddyRPG
              </span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300">
              Da dor de cabeça do compartilhamento contínuo de telas à unificação
              de um ecossistema virtual livre para a comunidade de RPG de mesa.
            </p>
          </div>

          {/* Cards de Evolução / Linha do Tempo */}
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {/* Card 1: PeerBuddy */}
            <div className="fr-card group flex flex-col justify-between rounded-2xl p-6 transition duration-300 hover:border-amber-400/60 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 transition group-hover:scale-105">
                    <Tv className="h-5 w-5" />
                  </div>
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                    A Faísca Local
                  </span>
                </div>

                <div className="mt-4">
                  <h3 className="font-display text-lg font-bold text-amber-100">
                    PeerBuddy
                  </h3>
                  <p className="text-xs font-medium text-amber-400/90">
                    Criado por{" "}
                    <a
                      href="https://github.com/VazFabricio"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-amber-500/50 underline-offset-2 transition hover:text-amber-200"
                    >
                      Fabrício Vaz
                    </a>
                  </p>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-zinc-300/90">
                  O projeto começou localmente pelas mãos de{" "}
                  <a
                    href="https://github.com/VazFabricio"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-amber-200 underline decoration-amber-500/40 underline-offset-2 transition hover:text-white"
                  >
                    Fabrício Vaz
                  </a>
                  , com o objetivo direto de acabar com a dor de cabeça e
                  lentidão de ter que ficar compartilhando telas entre amigos
                  durante as sessões. O PeerBuddy nasceu para sincronizar e
                  espelhar as telas sem que ninguém perdesse o foco da narrativa.
                </p>
              </div>

              <div className="mt-6 border-t border-amber-500/10 pt-4">
                <a
                  href="https://github.com/VazFabricio/PeerBuddy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-zinc-900/80 px-3.5 py-2.5 text-xs font-semibold text-amber-200 transition hover:border-amber-400 hover:bg-zinc-800 hover:text-white"
                >
                  <GithubIcon className="h-3.5 w-3.5 text-amber-400" />
                  <span>VazFabricio / PeerBuddy</span>
                  <ExternalLink className="ml-auto h-3 w-3 opacity-60" />
                </a>
              </div>
            </div>

            {/* Card 2: PeerBuddyRpg */}
            <div className="fr-card group flex flex-col justify-between rounded-2xl p-6 transition duration-300 hover:border-amber-400/60 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 transition group-hover:scale-105">
                    <Flame className="h-5 w-5" />
                  </div>
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                    A Resposta ao Vácuo
                  </span>
                </div>

                <div className="mt-4">
                  <h3 className="font-display text-lg font-bold text-amber-100">
                    PeerBuddyRpg
                  </h3>
                  <p className="text-xs font-medium text-amber-400/90">
                    Criado por{" "}
                    <a
                      href="https://github.com/FelipeOthon"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-amber-500/50 underline-offset-2 transition hover:text-amber-200"
                    >
                      Felipe Othon Santiago
                    </a>
                  </p>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-zinc-300/90">
                  Ao notar o gargalo latente na comunidade de RPG de mesa e o
                  súbito vácuo deixado pelos bloqueios e instabilidades do
                  Discord no Brasil,{" "}
                  <a
                    href="https://github.com/FelipeOthon"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-amber-200 underline decoration-amber-500/40 underline-offset-2 transition hover:text-white"
                  >
                    Felipe Othon
                  </a>{" "}
                  viu a urgência de reunir as ferramentas fundamentais do mestre
                  e dos jogadores em um único refúgio, dando início ao
                  PeerBuddyRpg.
                </p>
              </div>

              <div className="mt-6 border-t border-amber-500/10 pt-4">
                <a
                  href="https://github.com/FelipeOthon/PeerBuddyRpg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-zinc-900/80 px-3.5 py-2.5 text-xs font-semibold text-amber-200 transition hover:border-amber-400 hover:bg-zinc-800 hover:text-white"
                >
                  <GithubIcon className="h-3.5 w-3.5 text-amber-400" />
                  <span>FelipeOthon / PeerBuddyRpg</span>
                  <ExternalLink className="ml-auto h-3 w-3 opacity-60" />
                </a>
              </div>
            </div>

            {/* Card 3: BuddyRPG */}
            <div className="fr-card group flex flex-col justify-between rounded-2xl border-amber-500/50 bg-gradient-to-b from-amber-950/20 to-zinc-900/80 p-6 shadow-[0_0_25px_rgba(245,158,11,0.12)] transition duration-300 hover:border-amber-400 hover:shadow-[0_0_35px_rgba(245,158,11,0.25)]">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-400/40 bg-gradient-to-br from-amber-500/30 to-amber-900/20 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)] transition group-hover:scale-105">
                    <Globe className="h-5 w-5" />
                  </div>
                  <span className="rounded-full border border-amber-400/50 bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                    A Base Online
                  </span>
                </div>

                <div className="mt-4">
                  <h3 className="font-display text-lg font-bold text-amber-100">
                    BuddyRPG (Web &amp; Tempo Real)
                  </h3>
                  <p className="text-xs font-medium text-amber-400/90">
                    Evoluído por{" "}
                    <a
                      href="https://github.com/FelipeOthon"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-amber-500/50 underline-offset-2 transition hover:text-amber-200"
                    >
                      Felipe Othon Santiago
                    </a>
                  </p>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-zinc-300/90">
                  Para que ninguém precisasse instalar dependências pesadas ou
                  configurar redes locais,{" "}
                  <a
                    href="https://github.com/FelipeOthon"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-amber-200 underline decoration-amber-500/40 underline-offset-2 transition hover:text-white"
                  >
                    Felipe
                  </a>{" "}
                  decidiu construir toda a base 100% online no navegador. Nasceu o{" "}
                  <strong className="text-amber-300">BuddyRPG</strong>: um VTT
                  completo em tempo real, com física de dados 3D, névoa e
                  escuridão dinâmicas, forja de masmorras e biblioteca de tokens.
                </p>
              </div>

              <div className="mt-6 border-t border-amber-500/10 pt-4">
                <a
                  href="https://github.com/FelipeOthon/BuddyRpg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-3.5 py-2.5 text-xs font-bold text-zinc-950 shadow-[0_0_15px_rgba(245,158,11,0.25)] transition hover:from-amber-400 hover:to-amber-500"
                >
                  <GithubIcon className="h-3.5 w-3.5" />
                  <span>FelipeOthon / BuddyRpg</span>
                  <ExternalLink className="ml-auto h-3 w-3 opacity-80" />
                </a>
              </div>
            </div>
          </div>

          {/* Destaque Comunitário */}
          <div className="mt-8 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-zinc-900/70 to-amber-500/10 p-6 text-center shadow-[0_0_30px_rgba(245,158,11,0.08)]">
            <p className="text-sm font-medium leading-relaxed text-amber-200">
              ⚔️ Criado de forma colaborativa e aberta por{" "}
              <a
                href="https://github.com/VazFabricio"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-amber-300 underline decoration-amber-500/50 underline-offset-2 transition hover:text-white"
              >
                Fabrício Vaz
              </a>{" "}
              e{" "}
              <a
                href="https://github.com/FelipeOthon"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-amber-300 underline decoration-amber-500/50 underline-offset-2 transition hover:text-white"
              >
                Felipe Othon Santiago
              </a>
              . Construído de mestre para jogador, com tecnologia aberta e sem
              barreiras para unir mesas de RPG onde quer que estejam.
            </p>
          </div>
        </section>
      </main>

      {/* Rodapé */}
      <footer className="relative z-10 border-t border-amber-500/15 bg-zinc-950/95 py-6 text-center text-xs text-zinc-500">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="inline-flex items-center gap-2 text-zinc-400">
            <Shield className="h-3.5 w-3.5 text-amber-500/70" />
            <span>
              BuddyRPG — Forgotten Realms Edition · Criado por{" "}
              <a
                href="https://github.com/FelipeOthon"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-amber-300 transition hover:underline"
              >
                Felipe Othon Santiago
              </a>{" "}
              &amp;{" "}
              <a
                href="https://github.com/VazFabricio"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-amber-300 transition hover:underline"
              >
                Fabrício Vaz
              </a>
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-400">
            <a
              href="https://github.com/VazFabricio/PeerBuddy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-zinc-400 transition hover:text-amber-300"
            >
              <GithubIcon className="h-3 w-3" /> PeerBuddy
            </a>
            <span className="text-zinc-700">·</span>
            <a
              href="https://github.com/FelipeOthon/PeerBuddyRpg"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-zinc-400 transition hover:text-amber-300"
            >
              <GithubIcon className="h-3 w-3" /> PeerBuddyRpg
            </a>
            <span className="text-zinc-700">·</span>
            <a
              href="https://github.com/FelipeOthon/BuddyRpg"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-amber-400 transition hover:text-amber-200"
            >
              <GithubIcon className="h-3 w-3" /> BuddyRpg (Atual)
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
