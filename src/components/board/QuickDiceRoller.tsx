"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";

const QUICK_DICE = [
  { label: "d20", sides: "20", color: "text-amber-300" },
  { label: "d12", sides: "12", color: "text-zinc-200" },
  { label: "d10", sides: "10", color: "text-zinc-200" },
  { label: "d8", sides: "8", color: "text-zinc-200" },
  { label: "d6", sides: "6", color: "text-zinc-200" },
  { label: "d4", sides: "4", color: "text-zinc-200" },
  { label: "d%", sides: "%", color: "text-sky-300" },
] as const;

const MAX_QUICK_DICE = 20;
const COUNT_CHIPS = [1, 2, 3, 4, 5, 6, 8, 10] as const;

export function buildQuickRollCommand(count: number, sides: string): string {
  const safeCount = Math.min(Math.max(Math.trunc(count) || 1, 1), MAX_QUICK_DICE);
  return `/r ${safeCount}d${sides}`;
}

export default function QuickDiceRoller({
  onRoll,
}: {
  onRoll: (cmd: string) => void;
}) {
  const [openSides, setOpenSides] = useState<string | null>(null);
  const [count, setCount] = useState(1);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openSides) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpenSides(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenSides(null);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [openSides]);

  const roll = (sides: string, n: number) => {
    onRoll(buildQuickRollCommand(n, sides));
    setOpenSides(null);
  };

  const open = QUICK_DICE.find((d) => d.sides === openSides) ?? null;

  return (
    <div
      ref={rootRef}
      className="pointer-events-auto relative flex flex-col gap-0.5 rounded-xl border border-zinc-800/90 bg-zinc-950/90 p-1 shadow-xl backdrop-blur"
      title="Rolagem rápida de dados"
    >
      {QUICK_DICE.map((die) => {
        const active = openSides === die.sides;
        return (
          <button
            key={die.label}
            type="button"
            onClick={() => {
              setCount(1);
              setOpenSides(active ? null : die.sides);
            }}
            aria-expanded={active}
            title={`Escolher quantidade de ${die.label}`}
            className={`flex h-7 w-8 items-center justify-center rounded-lg font-mono text-[10px] font-bold transition hover:bg-amber-500/20 hover:text-amber-200 ${
              active ? "bg-amber-500/25 text-amber-200" : die.color
            }`}
          >
            {die.label}
          </button>
        );
      })}

      {open && (
        <div
          className="absolute top-0 left-full z-40 ml-2 w-44 rounded-xl border border-amber-500/40 bg-zinc-950/95 p-2 text-xs shadow-2xl backdrop-blur"
          role="dialog"
          aria-label={`Rolar ${open.label}`}
        >
          <div className="mb-1.5 flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold text-amber-300">
              {count}
              {open.label}
            </span>
            <span className="text-[10px] text-zinc-500">
              máx. {MAX_QUICK_DICE}
            </span>
          </div>

          <div className="mb-2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCount((c) => Math.max(1, c - 1))}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 text-zinc-300 hover:bg-zinc-800"
              aria-label="Diminuir quantidade"
            >
              <Minus className="h-3 w-3" />
            </button>
            <input
              type="number"
              min={1}
              max={MAX_QUICK_DICE}
              value={count}
              onChange={(e) =>
                setCount(
                  Math.min(
                    Math.max(Number.parseInt(e.target.value, 10) || 1, 1),
                    MAX_QUICK_DICE
                  )
                )
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") roll(open.sides, count);
              }}
              className="h-7 w-full min-w-0 rounded-lg border border-zinc-800 bg-zinc-900 text-center font-mono text-xs text-white outline-none focus:border-amber-500"
              aria-label="Quantidade de dados"
            />
            <button
              type="button"
              onClick={() => setCount((c) => Math.min(MAX_QUICK_DICE, c + 1))}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 text-zinc-300 hover:bg-zinc-800"
              aria-label="Aumentar quantidade"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          <div className="mb-2 grid grid-cols-4 gap-1">
            {COUNT_CHIPS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCount(n)}
                className={`rounded-md py-0.5 font-mono text-[10px] font-semibold transition ${
                  count === n
                    ? "bg-amber-500 text-zinc-950"
                    : "bg-zinc-900 text-zinc-400 hover:text-zinc-100"
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => roll(open.sides, count)}
            className="w-full rounded-lg bg-amber-500 py-1.5 text-[11px] font-bold text-zinc-950 transition hover:bg-amber-400"
          >
            Rolar {count}
            {open.label}
          </button>
        </div>
      )}
    </div>
  );
}
