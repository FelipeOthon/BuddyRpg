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
      <div className="pointer-events-auto absolute top-14 left-4 z-20">
        <button
          type="button"
          onClick={startCombat}
          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-zinc-950/90 px-3 py-1.5 text-xs font-bold text-amber-300 shadow-xl backdrop-blur transition hover:border-amber-400 hover:bg-amber-500/20"
        >
          <Swords className="h-3.5 w-3.5 text-amber-400" />
          ⚔️ Rolar Iniciativa ({sceneTokens.length} tokens)
        </button>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto absolute top-14 left-1/2 z-20 flex max-w-[92%] -translate-x-1/2 items-center gap-2 overflow-x-auto rounded-2xl border border-amber-500/45 bg-zinc-950/95 px-3.5 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur">
      <div className="flex shrink-0 items-center gap-1.5 border-r border-zinc-800 pr-2.5">
        <Swords className="h-4 w-4 text-amber-400" />
        <span className="font-display text-xs font-extrabold text-amber-200">
          Rodada {combat.round}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
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
              className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs transition ${
                isTurn
                  ? "border-amber-400 bg-amber-500/25 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.35)]"
                  : "border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-white"
              }`}
            >
              <span className="rounded bg-zinc-950 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-amber-300">
                {c.initiative}
              </span>
              <span className="max-w-[90px] truncate font-semibold">
                {token?.name ?? c.name}
              </span>
              {token && (
                <span className="text-[10px] text-rose-300">
                  {token.hp_current}PV
                </span>
              )}
            </button>
          );
        })}
      </div>

      {isGm && (
        <div className="flex shrink-0 items-center gap-1 border-l border-zinc-800 pl-2">
          <button
            type="button"
            onClick={nextTurn}
            className="inline-flex items-center gap-1 rounded-xl bg-amber-500 px-2.5 py-1 text-xs font-bold text-zinc-950 transition hover:bg-amber-400"
          >
            Turno
            <ChevronRight className="h-3.5 w-3.5" />
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
      )}

      {!isGm && (
        <span className="inline-flex items-center gap-1 pl-1 text-[10px] text-zinc-500">
          <Shield className="h-3 w-3 text-amber-400" />
          Combate Ativo
        </span>
      )}
    </div>
  );
}
