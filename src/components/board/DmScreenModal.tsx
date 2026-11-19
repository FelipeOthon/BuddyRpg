"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Shield, X, ZoomIn, ZoomOut } from "lucide-react";
import { DM_SCREEN_PAGES } from "@/lib/board/curatedAssets";

export default function DmScreenModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [pageIdx, setPageIdx] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") {
        setPageIdx((i) => Math.min(DM_SCREEN_PAGES.length - 1, i + 1));
      } else if (e.key === "ArrowLeft") {
        setPageIdx((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const currentUrl = DM_SCREEN_PAGES[pageIdx] ?? DM_SCREEN_PAGES[0]!;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-label="Escudo do Mestre 5e"
    >
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-amber-500/40 bg-zinc-950 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-bold text-amber-200">
              Escudo do Mestre (D&amp;D 5e)
            </h3>
            <span className="text-xs text-zinc-400">
              Página {pageIdx + 1} de {DM_SCREEN_PAGES.length}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {DM_SCREEN_PAGES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setPageIdx(idx)}
                className={`h-7 min-w-[28px] rounded-lg px-2 text-xs font-bold transition ${
                  pageIdx === idx
                    ? "bg-amber-500 text-zinc-950"
                    : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                }`}
              >
                {idx + 1}
              </button>
            ))}

            <div className="mx-1 h-4 w-px bg-zinc-800" />

            <button
              type="button"
              onClick={() => setZoomed((z) => !z)}
              title={zoomed ? "Ajustar à tela" : "Ampliar leitura"}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:border-amber-500/50"
            >
              {zoomed ? (
                <>
                  <ZoomOut className="h-3.5 w-3.5" /> Ajustar
                </>
              ) : (
                <>
                  <ZoomIn className="h-3.5 w-3.5" /> Ampliar
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar Escudo do Mestre"
              className="ml-1 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="relative flex-1 overflow-auto bg-zinc-900/70 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentUrl}
            alt={`Escudo do Mestre 5e - Página ${pageIdx + 1}`}
            className={`mx-auto rounded-xl border border-zinc-800 shadow-xl ${
              zoomed ? "w-[1350px] max-w-none" : "max-h-[76vh] w-auto object-contain"
            }`}
          />
        </div>

        <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-2 text-xs text-zinc-400">
          <button
            type="button"
            disabled={pageIdx === 0}
            onClick={() => setPageIdx((i) => Math.max(0, i - 1))}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1 font-medium text-zinc-200 disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Anterior
          </button>
          <span>Use as setas ← / → para navegar</span>
          <button
            type="button"
            disabled={pageIdx === DM_SCREEN_PAGES.length - 1}
            onClick={() =>
              setPageIdx((i) => Math.min(DM_SCREEN_PAGES.length - 1, i + 1))
            }
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1 font-medium text-zinc-200 disabled:opacity-40"
          >
            Próxima
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
