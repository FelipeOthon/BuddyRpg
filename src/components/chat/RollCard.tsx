"use client";

import { Dices, Sparkles, Skull } from "lucide-react";
import type { RollResult } from "@/types/domain";

export default function RollCard({ roll }: { roll: RollResult }) {
  // Verifica se há 20 natural ou 1 natural em dados d20 mantidos
  let hasNat20 = false;
  let hasNat1 = false;

  for (const term of roll.terms) {
    if (term.type === "dice" && term.sides === 20) {
      for (const r of term.rolls) {
        if (r.kept && r.v === 20) hasNat20 = true;
        if (r.kept && r.v === 1) hasNat1 = true;
      }
    }
  }

  const borderClass = hasNat20
    ? "border-emerald-500/50 bg-emerald-950/30"
    : hasNat1
      ? "border-rose-500/50 bg-rose-950/30"
      : "border-amber-500/30 bg-zinc-900/90";

  return (
    <div className={`mt-1.5 rounded-xl border p-3 shadow-md ${borderClass}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Dices className="h-4 w-4 text-amber-400" />
          <code className="font-mono text-xs font-bold text-amber-300">
            {roll.expression}
          </code>
          {roll.label && (
            <span className="truncate rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] font-medium text-zinc-200">
              {roll.label}
            </span>
          )}
        </div>

        {hasNat20 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
            <Sparkles className="h-3 w-3" />
            20 Natural!
          </span>
        )}
        {!hasNat20 && hasNat1 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300">
            <Skull className="h-3 w-3" />
            1 Natural!
          </span>
        )}
      </div>

      {/* Dados individuais e modificadores */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {roll.terms.map((term, termIdx) => {
          if (term.type === "mod") {
            return (
              <span
                key={`mod-${termIdx}`}
                className="rounded-md border border-zinc-700 bg-zinc-800/80 px-2 py-0.5 font-mono text-xs font-semibold text-zinc-300"
              >
                {term.sign === -1 ? `-${term.value}` : `+${term.value}`}
              </span>
            );
          }

          return (
            <div
              key={`dice-${termIdx}`}
              className="flex flex-wrap items-center gap-1"
            >
              {termIdx > 0 && (
                <span className="font-mono text-xs font-bold text-zinc-500">
                  {term.sign === -1 ? "-" : "+"}
                </span>
              )}
              {term.rolls.map((r, rIdx) => {
                const isCrit = r.kept && term.sides === 20 && r.v === 20;
                const isFumble = r.kept && term.sides === 20 && r.v === 1;

                return (
                  <span
                    key={`die-${termIdx}-${rIdx}`}
                    title={`d${term.sides}: ${r.v}${
                      r.kept ? "" : " (descartado)"
                    }`}
                    className={`inline-flex h-6 min-w-[26px] items-center justify-center rounded-md border px-1.5 font-mono text-xs font-bold ${
                      !r.kept
                        ? "border-zinc-800 bg-zinc-950/60 text-zinc-500 line-through opacity-50"
                        : isCrit
                          ? "border-emerald-400 bg-emerald-500/25 text-emerald-200"
                          : isFumble
                            ? "border-rose-400 bg-rose-500/25 text-rose-200"
                            : "border-zinc-700 bg-zinc-800 text-zinc-100"
                    }`}
                  >
                    {r.v}
                  </span>
                );
              })}
            </div>
          );
        })}

        {/* Total em Destaque */}
        <div className="ml-auto flex items-baseline gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-300/80">
            Total
          </span>
          <span className="font-mono text-lg font-extrabold text-amber-300">
            {roll.total}
          </span>
        </div>
      </div>
    </div>
  );
}
