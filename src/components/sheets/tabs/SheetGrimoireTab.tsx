"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { Plus, Trash2 } from "lucide-react";
import { computeSpellStats } from "@/lib/validation/sheet";
import type { SheetData } from "@/types/domain";
import { formatSigned } from "../sheetHelpers";

export default function SheetGrimoireTab({
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
  const [spellName, setSpellName] = useState("");
  const [spellLevel, setSpellLevel] = useState(1);
  const [spellDamage, setSpellDamage] = useState("");
  const [spellNotes, setSpellNotes] = useState("");

  const spellStats = computeSpellStats(sheet);

  const addSpell = () => {
    const trimmed = spellName.trim();
    if (!trimmed || !canEdit) return;
    setSheet((prev) => ({
      ...prev,
      spells: [
        ...(prev.spells ?? []),
        {
          id: `sp-${Date.now()}`,
          level: Number(spellLevel) || 0,
          name: trimmed,
          damageFormula: spellDamage.trim() || undefined,
          schoolOrNotes: spellNotes.trim() || undefined,
          prepared: true,
        },
      ],
    }));
    setSpellName("");
    setSpellDamage("");
    setSpellNotes("");
  };

  return (
    <div className="space-y-4">
      <div className="fr-card grid gap-3 rounded-2xl p-4 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase text-amber-300">
            Atributo de Conjuração
          </label>
          <select
            disabled={!canEdit}
            value={sheet.spellcastingAbility ?? "int"}
            onChange={(e) =>
              setSheet((prev) => ({
                ...prev,
                spellcastingAbility: e.target.value,
              }))
            }
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white"
          >
            {sheet.attributes.map((a) => (
              <option key={a.key} value={a.key}>
                {a.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/70 p-2">
          <span className="text-[10px] font-bold uppercase text-zinc-400">
            CD de Resistência
          </span>
          <span className="font-display text-lg font-extrabold text-amber-300">
            {spellStats.spellSaveDc}
          </span>
        </div>

        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/70 p-2">
          <span className="text-[10px] font-bold uppercase text-zinc-400">
            Ataque Mágico
          </span>
          <button
            type="button"
            onClick={() =>
              onRollCommand(
                `/r 1d20${formatSigned(
                  spellStats.spellAttackBonus
                )} Ataque Mágico (${characterName})`
              )
            }
            className="font-mono text-sm font-extrabold text-amber-300 hover:underline"
          >
            🎲 {formatSigned(spellStats.spellAttackBonus)}
          </button>
        </div>

        <div className="flex items-center justify-center">
          {canEdit && (
            <button
              type="button"
              onClick={() =>
                setSheet((prev) => ({
                  ...prev,
                  spellSlots: (prev.spellSlots ?? []).map((sl) => ({
                    ...sl,
                    used: 0,
                  })),
                }))
              }
              className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20"
            >
              ✨ Descanso Longo (Zerar Gastos)
            </button>
          )}
        </div>
      </div>

      {/* Espaços de Magia (Spell Slots 1..9) */}
      <div className="fr-card rounded-2xl p-4">
        <h4 className="font-display mb-3 text-xs font-bold uppercase tracking-wider text-amber-300">
          Espaços de Magia (Círculos 1º ao 9º)
        </h4>
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-9">
          {(sheet.spellSlots ?? []).map((slot, idx) => (
            <div
              key={slot.level}
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-2 text-center"
            >
              <p className="text-[10px] font-bold text-amber-300">
                {slot.level}º Círc.
              </p>
              <div className="mt-1 flex items-center justify-center gap-1 text-xs">
                <input
                  type="number"
                  min={0}
                  max={20}
                  disabled={!canEdit}
                  value={slot.used}
                  onChange={(e) => {
                    const u = Math.max(Number(e.target.value) || 0, 0);
                    setSheet((prev) => ({
                      ...prev,
                      spellSlots: (prev.spellSlots ?? []).map((s, i) =>
                        i === idx ? { ...s, used: u } : s
                      ),
                    }));
                  }}
                  className="w-8 rounded border border-zinc-800 bg-zinc-900 text-center font-mono text-xs text-rose-300"
                  title="Usados"
                />
                <span className="text-zinc-500">/</span>
                <input
                  type="number"
                  min={0}
                  max={20}
                  disabled={!canEdit}
                  value={slot.total}
                  onChange={(e) => {
                    const t = Math.max(Number(e.target.value) || 0, 0);
                    setSheet((prev) => ({
                      ...prev,
                      spellSlots: (prev.spellSlots ?? []).map((s, i) =>
                        i === idx ? { ...s, total: t } : s
                      ),
                    }));
                  }}
                  className="w-8 rounded border border-zinc-800 bg-zinc-900 text-center font-mono text-xs text-emerald-300"
                  title="Total"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Adicionar Magia */}
      {canEdit && (
        <div className="fr-card grid gap-2.5 rounded-2xl p-4 sm:grid-cols-5">
          <div className="sm:col-span-2">
            <input
              type="text"
              value={spellName}
              onChange={(e) => setSpellName(e.target.value)}
              placeholder="Nome da Magia (ex: Bola de Fogo)"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white"
            />
          </div>
          <div>
            <select
              value={spellLevel}
              onChange={(e) => setSpellLevel(Number(e.target.value))}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-white"
            >
              <option value={0}>Truque (0)</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}º Círculo
                </option>
              ))}
            </select>
          </div>
          <div>
            <input
              type="text"
              value={spellDamage}
              onChange={(e) => setSpellDamage(e.target.value)}
              placeholder="Dados (ex: 8d6)"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 font-mono text-xs text-white"
            />
          </div>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={spellNotes}
              onChange={(e) => setSpellNotes(e.target.value)}
              placeholder="Escola / Notas"
              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-white"
            />
            <button
              type="button"
              onClick={addSpell}
              className="rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-zinc-950 hover:bg-amber-400"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Lista de Magias */}
      <div className="space-y-2">
        {(sheet.spells ?? []).map((sp) => (
          <div
            key={sp.id}
            className="fr-card flex items-center justify-between rounded-xl px-4 py-2.5"
          >
            <div>
              <span className="mr-2 rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                {sp.level === 0 ? "Truque" : `${sp.level}º Círculo`}
              </span>
              <span className="font-display text-sm font-bold text-white">
                {sp.name}
              </span>
              {sp.schoolOrNotes && (
                <span className="ml-2 text-xs text-zinc-400">
                  · {sp.schoolOrNotes}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {sp.damageFormula ? (
                <button
                  type="button"
                  onClick={() =>
                    onRollCommand(
                      `/r ${sp.damageFormula} Magia: ${sp.name} (${characterName})`
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-200 hover:bg-amber-500/25"
                >
                  🎲 Conjurar ({sp.damageFormula})
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    onRollCommand(
                      `✨ ${characterName} conjurou ${sp.name}!`
                    )
                  }
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-200 hover:bg-zinc-700"
                >
                  ✨ Anunciar no Chat
                </button>
              )}

              {canEdit && (
                <button
                  type="button"
                  onClick={() =>
                    setSheet((prev) => ({
                      ...prev,
                      spells: (prev.spells ?? []).filter(
                        (s) => s.id !== sp.id
                      ),
                    }))
                  }
                  className="text-zinc-500 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
