"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { Flame, Plus, Swords, Trash2 } from "lucide-react";
import type { SheetData } from "@/types/domain";
import { formatSigned } from "../sheetHelpers";

export default function SheetCombatTab({
  sheet,
  setSheet,
  characterName,
  canEdit,
  onRollCommand,
}: {
  sheet: SheetData;
  setSheet: Dispatch<SetStateAction<SheetData>>;
  characterName: string;
  canEdit: boolean;
  onRollCommand: (cmd: string) => void;
}) {
  const [atkName, setAtkName] = useState("");
  const [atkBonus, setAtkBonus] = useState(4);
  const [atkFormula, setAtkFormula] = useState("1d8+2");
  const [atkType, setAtkType] = useState("Cortante");

  const addAttack = () => {
    const trimmed = atkName.trim();
    if (!trimmed || !canEdit) return;
    setSheet((prev) => ({
      ...prev,
      attacks: [
        ...(prev.attacks ?? []),
        {
          id: `atk-${Date.now()}`,
          name: trimmed,
          attackBonus: Number(atkBonus) || 0,
          damageFormula: atkFormula.trim() || "1d6",
          damageType: atkType.trim() || "Cortante",
        },
      ],
    }));
    setAtkName("");
  };

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="fr-card grid gap-2.5 rounded-2xl p-4 sm:grid-cols-5">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">
              Arma / Habilidade de Ataque
            </label>
            <input
              type="text"
              value={atkName}
              onChange={(e) => setAtkName(e.target.value)}
              placeholder="Ex: Espada Longa +1 / Arco Longo"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">
              Bônus de Ataque
            </label>
            <input
              type="number"
              value={atkBonus}
              onChange={(e) => setAtkBonus(Number(e.target.value))}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 font-mono text-xs text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">
              Fórmula de Dano
            </label>
            <input
              type="text"
              value={atkFormula}
              onChange={(e) => setAtkFormula(e.target.value)}
              placeholder="Ex: 1d8+4"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 font-mono text-xs text-white"
            />
          </div>
          <div className="flex items-end gap-1.5">
            <div className="flex-1">
              <label className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">
                Tipo
              </label>
              <input
                type="text"
                value={atkType}
                onChange={(e) => setAtkType(e.target.value)}
                placeholder="Cortante"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            <button
              type="button"
              onClick={addAttack}
              className="rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-zinc-950 hover:bg-amber-400"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        {(sheet.attacks ?? []).length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-xs text-zinc-500">
            Nenhum ataque cadastrado ainda.
          </p>
        ) : (
          (sheet.attacks ?? []).map((atk) => {
            const bonusStr = formatSigned(atk.attackBonus);
            return (
              <div
                key={atk.id}
                className="fr-card flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3"
              >
                <div>
                  <p className="font-display text-sm font-bold text-amber-100">
                    {atk.name}
                  </p>
                  <p className="text-xs text-zinc-400">
                    Acerto:{" "}
                    <strong className="font-mono text-amber-300">
                      {bonusStr}
                    </strong>{" "}
                    · Dano:{" "}
                    <strong className="font-mono text-rose-300">
                      {atk.damageFormula}
                    </strong>{" "}
                    ({atk.damageType})
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onRollCommand(
                        `/r 1d20${bonusStr} Ataque: ${atk.name} (${characterName})`
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-200 transition hover:bg-amber-500/30"
                  >
                    <Swords className="h-3.5 w-3.5 text-amber-400" />
                    Rolar Ataque ({bonusStr})
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onRollCommand(
                        `/r ${atk.damageFormula} Dano: ${atk.name} [${atk.damageType}] (${characterName})`
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 text-xs font-bold text-rose-200 transition hover:bg-rose-500/30"
                  >
                    <Flame className="h-3.5 w-3.5 text-rose-400" />
                    Rolar Dano ({atk.damageFormula})
                  </button>

                  {canEdit && (
                    <button
                      type="button"
                      onClick={() =>
                        setSheet((prev) => ({
                          ...prev,
                          attacks: (prev.attacks ?? []).filter(
                            (a) => a.id !== atk.id
                          ),
                        }))
                      }
                      className="rounded-lg p-1.5 text-zinc-500 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
