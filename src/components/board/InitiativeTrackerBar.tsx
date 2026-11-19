"use client";

import { ChevronRight, Shield, Swords, X } from "lucide-react";
import { updateSceneCombatStateAction } from "@/actions/scenes";
import {
  useBoardStore,
  type CombatStatePayload,
} from "@/stores/boardStore";
import type { CampaignRole, Scene } from "@/types/domain";

export default function InitiativeTrackerBar({
  scene,
  role,
  onBroadcastCombat,
}: {
  scene: Scene;
  role: CampaignRole;
  onBroadcastCombat?: (combat: CombatStatePayload) => void;
}) {
  const isGm = role === "gm";
  const {
    tokens,
    combat,
    setCombatState,
    setSelectedTokenId,
    viewport,
    setViewport,
  } = useBoardStore();

  const sceneTokens = tokens.filter((t) => t.scene_id === scene.id);

  const syncCombat = (next: CombatStatePayload) => {
    setCombatState(next);
    onBroadcastCombat?.(next);
    void updateSceneCombatStateAction({
      sceneId: scene.id,
      campaignId: scene.campaign_id,
      combatState: next,
    });
  };

  const startCombat = () => {
    if (!isGm || sceneTokens.length === 0) return;

    const rolled = sceneTokens
      .map((t) => ({
        tokenId: t.id,
        name: t.name,
        initiative: Math.floor(Math.random() * 20) + 1,
      }))
      .sort((a, b) => b.initiative - a.initiative);

    const next: CombatStatePayload = {
      active: true,
      round: 1,
      turnIndex: 0,
      combatants: rolled,
    };
    syncCombat(next);
  };

  const nextTurn = () => {
    if (!isGm || !combat.active || combat.combatants.length === 0) return;
    const isLast = combat.turnIndex + 1 >= combat.combatants.length;
    const next: CombatStatePayload = {
      ...combat,
      round: isLast ? combat.round + 1 : combat.round,
      turnIndex: isLast ? 0 : combat.turnIndex + 1,
    };
    syncCombat(next);

    const activeTokenId = next.combatants[next.turnIndex]?.tokenId;
    if (activeTokenId) {
      setSelectedTokenId(activeTokenId);
    }
  };

  const endCombat = () => {
    if (!isGm) return;
    const next: CombatStatePayload = {
      active: false,
      round: 1,
      turnIndex: 0,
      combatants: [],
    };
    syncCombat(next);
  };

  if (!combat.active) {
    if (!isGm || sceneTokens.length === 0) return null;
    return (
      <div className="pointer-events-auto absolute top-14 right-3 z-20">
        <button
          type="button"
          onClick={startCombat}
          title="Rolar iniciativa para todos os tokens desta cena"
          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-zinc-950/90 px-3 py-1.5 text-xs font-bold text-amber-300 shadow-xl backdrop-blur transition hover:border-amber-400 hover:bg-amber-500/20"
        >
          <Swords className="h-3.5 w-3.5 text-amber-400" />
          <span>Iniciativa ({sceneTokens.length})</span>
        </button>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto absolute top-14 right-3 z-20 flex w-64 max-w-[90vw] flex-col gap-2 rounded-2xl border border-amber-500/40 bg-zinc-950/95 p-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.85)] backdrop-blur">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-1.5">
        <div className="flex items-center gap-1.5">
          <Swords className="h-3.5 w-3.5 text-amber-400" />
          <span className="font-display text-xs font-extrabold text-amber-200">
            Rodada {combat.round}
          </span>
        </div>

        {isGm ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={nextTurn}
              className="inline-flex items-center gap-0.5 rounded-lg bg-amber-500 px-2 py-1 text-[11px] font-bold text-zinc-950 transition hover:bg-amber-400"
            >
              Turno
              <ChevronRight className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={endCombat}
              title="Encerrar Combate"
              className="rounded-lg p-1 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400">
            <Shield className="h-3 w-3 text-amber-400" />
            Combate
          </span>
        )}
      </div>

      <div className="max-h-52 space-y-1 overflow-y-auto pr-0.5">
        {combat.combatants.map((c, idx) => {
          const isTurn = idx === combat.turnIndex;
          const token = tokens.find((t) => t.id === c.tokenId);

          return (
            <button
              key={c.tokenId}
              type="button"
              onClick={() => {
                setSelectedTokenId(c.tokenId);
                if (token) {
                  setViewport({
                    ...viewport,
                    x: Math.round(380 - token.pos_x * viewport.scale),
                    y: Math.round(280 - token.pos_y * viewport.scale),
                  });
                }
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-xl border px-2 py-1.5 text-xs transition ${
                isTurn
                  ? "border-amber-400 bg-amber-500/20 text-amber-100 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                  : "border-zinc-800/80 bg-zinc-900/70 text-zinc-300 hover:border-zinc-700 hover:text-white"
              }`}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="shrink-0 rounded bg-zinc-950 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-amber-300">
                  {c.initiative}
                </span>
                <span className="truncate font-semibold">
                  {token?.name ?? c.name}
                </span>
              </div>
              {token && (
                <span className="shrink-0 font-mono text-[10px] text-rose-300">
                  {token.hp_current} PV
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
