"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Sun } from "lucide-react";
import {
  WEATHER_EFFECT_OPTIONS,
  formatWeatherBadge,
  parseWeatherEffects,
  toggleWeatherEffect,
} from "@/lib/board/weatherPresets";
import type { WeatherPreset } from "@/types/domain";

export default function WeatherMultiPicker({
  value,
  onChange,
  title,
  compact = false,
  align = "left",
}: {
  value: WeatherPreset | undefined;
  onChange: (next: WeatherPreset) => void;
  title?: string;
  compact?: boolean;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const activeEffects = parseWeatherEffects(value);
  const hasAny = activeEffects.length > 0;

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={title ?? "Escolher um ou mais climas simultâneos"}
        className={`inline-flex items-center justify-between gap-1.5 rounded-lg border font-medium transition ${
          compact ? "px-2 py-0.5 text-[10px]" : "px-2 py-1 text-[11px]"
        } ${
          hasAny
            ? "border-sky-400/50 bg-sky-500/15 text-sky-100 hover:border-sky-300"
            : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700"
        }`}
      >
        <span className="truncate">{formatWeatherBadge(value)}</span>
        <ChevronDown
          className={`h-3 w-3 shrink-0 text-zinc-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute top-full z-40 mt-1.5 w-52 rounded-xl border border-sky-500/40 bg-zinc-950/95 p-1.5 text-xs shadow-2xl backdrop-blur ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="mb-1 flex items-center justify-between px-1.5 py-0.5 text-[10px] font-semibold text-zinc-400">
            <span>Combinar climas</span>
            {hasAny && (
              <button
                type="button"
                onClick={() => {
                  onChange("none");
                  setOpen(false);
                }}
                className="inline-flex items-center gap-1 text-amber-300 hover:underline"
              >
                <Sun className="h-2.5 w-2.5" />
                Limpar
              </button>
            )}
          </div>

          <div className="space-y-0.5">
            {WEATHER_EFFECT_OPTIONS.map((opt) => {
              const checked = activeEffects.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange(toggleWeatherEffect(value, opt.value))}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] font-medium transition ${
                    checked
                      ? "bg-sky-500/20 text-sky-100"
                      : "text-zinc-300 hover:bg-zinc-900"
                  }`}
                >
                  <span
                    className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                      checked
                        ? "border-sky-400 bg-sky-500 text-zinc-950"
                        : "border-zinc-600 text-transparent"
                    }`}
                  >
                    <Check className="h-2.5 w-2.5" />
                  </span>
                  <span className="flex-1">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
