"use client";

import {
  Circle,
  Eraser,
  Link2,
  Lock,
  Minus,
  Pencil,
  Square,
  Trash2,
  Triangle,
  Unlock,
} from "lucide-react";
import { useBoardStore } from "@/stores/boardStore";
import type { SceneElement, Token } from "@/types/domain";

const DRAW_COLORS = [
  "#f59e0b",
  "#ef4444",
  "#38bdf8",
  "#10b981",
  "#a855f7",
  "#f4f4f5",
] as const;

export default function DrawingSubToolbar({
  sceneId,
  sceneTokens,
  selectedElement,
  isGm,
  currentUserId,
  onClearDrawings,
  onDeleteElement,
  onUpdateElement,
}: {
  sceneId: string;
  sceneTokens: Token[];
  selectedElement: SceneElement | null;
  isGm: boolean;
  currentUserId: string;
  onClearDrawings: (sceneId: string) => void;
  onDeleteElement: (elementId: string) => void;
  onUpdateElement: (
    elementId: string,
    patch: { attachedToTokenId?: string | null; isLocked?: boolean }
  ) => void;
}) {
  const { tool, drawConfig, setDrawConfig } = useBoardStore();

  const canEditSelected = Boolean(
    selectedElement &&
      (isGm ||
        (selectedElement.created_by === currentUserId &&
          !selectedElement.is_locked))
  );

  if (tool !== "draw" && !selectedElement) {
    return null;
  }

  return (
    <div className="pointer-events-auto absolute top-14 left-1/2 z-20 flex max-w-[94vw] -translate-x-1/2 flex-wrap items-center gap-1.5 rounded-xl border border-amber-500/30 bg-zinc-950/95 px-2.5 py-1.5 text-xs shadow-2xl backdrop-blur">
      {tool === "draw" && (
        <>
          {(
            [
              { kind: "freehand", label: "Pincel", icon: Pencil },
              { kind: "line", label: "Linha", icon: Minus },
              { kind: "rect", label: "Retângulo", icon: Square },
              { kind: "circle", label: "Círculo / Área", icon: Circle },
              { kind: "cone", label: "Cone Magia", icon: Triangle },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = drawConfig.kind === item.kind;
            return (
              <button
                key={item.kind}
                type="button"
                onClick={() => setDrawConfig({ kind: item.kind })}
                title={item.label}
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium transition ${
                  active
                    ? "bg-amber-500 text-zinc-950"
                    : "text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{item.label}</span>
              </button>
            );
          })}

          <div className="mx-0.5 h-4 w-px bg-zinc-800" />

          <div className="flex items-center gap-1">
            {DRAW_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setDrawConfig({ stroke: c, fill: c })}
                className={`h-4 w-4 rounded-full border transition ${
                  drawConfig.stroke === c
                    ? "scale-110 border-white ring-1 ring-white"
                    : "border-zinc-700"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <div className="mx-0.5 h-4 w-px bg-zinc-800" />

          <button
            type="button"
            onClick={() => onClearDrawings(sceneId)}
            title="Limpar todos os desenhos e textos da cena"
            className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-rose-300 hover:bg-rose-500/20"
          >
            <Eraser className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Limpar</span>
          </button>
        </>
      )}

      {selectedElement && (
        <>
          {tool === "draw" && <div className="mx-0.5 h-4 w-px bg-zinc-800" />}
          <span className="font-semibold text-amber-300">
            Item selecionado
          </span>

          {canEditSelected && (
            <>
              <div className="flex items-center gap-1">
                <Link2 className="h-3.5 w-3.5 text-zinc-400" />
                <select
                  value={selectedElement.attached_to_token_id ?? ""}
                  onChange={(e) =>
                    onUpdateElement(selectedElement.id, {
                      attachedToTokenId: e.target.value || null,
                    })
                  }
                  title="Vincular (Attach) a um token para moverem juntos"
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-200"
                >
                  <option value="">Sem vínculo (Livre)</option>
                  {sceneTokens.map((t) => (
                    <option key={t.id} value={t.id}>
                      Anexar a: {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {isGm && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdateElement(selectedElement.id, {
                      isLocked: !selectedElement.is_locked,
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-zinc-200 hover:text-white"
                >
                  {selectedElement.is_locked ? (
                    <>
                      <Lock className="h-3.5 w-3.5 text-amber-400" />
                      Travado
                    </>
                  ) : (
                    <>
                      <Unlock className="h-3.5 w-3.5" />
                      Travar
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => onDeleteElement(selectedElement.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-rose-300 hover:bg-rose-500/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
