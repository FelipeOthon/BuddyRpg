"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { Plus } from "lucide-react";
import {
  attributeModifier,
  computeSaveBonus,
  computeSkillBonus,
} from "@/lib/validation/sheet";
import type { SheetData, SheetSkill } from "@/types/domain";
import { formatSigned, nextProficiency } from "../sheetHelpers";

export default function SheetAbilitiesTab({
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
  const [newAttrLabel, setNewAttrLabel] = useState("");
  const [newSkillLabel, setNewSkillLabel] = useState("");
  const [newSkillAbility, setNewSkillAbility] = useState("des");

  const toggleSaveProficiency = (attrKey: string) => {
    if (!canEdit) return;
    setSheet((prev) => {
      const list = prev.saveProficiencies ?? [];
      const exists = list.includes(attrKey);
      return {
        ...prev,
        saveProficiencies: exists
          ? list.filter((k) => k !== attrKey)
          : [...list, attrKey],
      };
    });
  };

  const cycleSkillProficiency = (skillKey: string) => {
    if (!canEdit) return;
    setSheet((prev) => ({
      ...prev,
      skills: (prev.skills ?? []).map((sk) =>
        sk.key === skillKey
          ? { ...sk, proficiency: nextProficiency(sk.proficiency) }
          : sk
      ),
    }));
  };

  const addCustomSkill = () => {
    const label = newSkillLabel.trim();
    if (!label || !canEdit) return;
    const key =
      label
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_")
        .slice(0, 20) + `_${Date.now().toString().slice(-3)}`;

    setSheet((prev) => ({
      ...prev,
      skills: [
        ...(prev.skills ?? []),
        {
          key,
          label,
          abilityKey: newSkillAbility,
          proficiency: "proficient",
        },
      ],
    }));
    setNewSkillLabel("");
  };

  const addAttribute = () => {
    const label = newAttrLabel.trim();
    if (!label || !canEdit) return;
    const key =
      label
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_")
        .slice(0, 14) || `attr_${Date.now()}`;

    setSheet((prev) => ({
      ...prev,
      attributes: [
        ...prev.attributes,
        { key: `${key}_${prev.attributes.length}`, label, value: 10 },
      ],
    }));
    setNewAttrLabel("");
  };

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      {/* Coluna Esquerda: 6 Cards de Atributos + Testes de Resistência */}
      <div className="space-y-4 lg:col-span-5">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {sheet.attributes.map((attr, idx) => {
            const mod = attributeModifier(attr.value);
            const modStr = formatSigned(mod);

            return (
              <div
                key={attr.key}
                className="fr-card flex flex-col items-center justify-between rounded-2xl p-3 text-center"
              >
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-200">
                  {attr.label}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    onRollCommand(
                      `/r 1d20${modStr} ${attr.label} (${characterName})`
                    )
                  }
                  title={`Rolar Teste de ${attr.label}`}
                  className="font-display my-1.5 flex h-12 w-16 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/10 text-xl font-extrabold text-amber-300 transition hover:bg-amber-500/25"
                >
                  {modStr}
                </button>

                <input
                  type="number"
                  disabled={!canEdit}
                  value={attr.value}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 0;
                    setSheet((prev) => ({
                      ...prev,
                      attributes: prev.attributes.map((a, i) =>
                        i === idx ? { ...a, value: val } : a
                      ),
                    }));
                  }}
                  className="w-14 rounded-lg border border-zinc-800 bg-zinc-950 py-0.5 text-center font-mono text-xs font-bold text-white"
                />
              </div>
            );
          })}
        </div>

        {canEdit && sheet.system === "custom" && (
          <div className="flex gap-1.5">
            <input
              type="text"
              value={newAttrLabel}
              onChange={(e) => setNewAttrLabel(e.target.value)}
              placeholder="Atributo extra (outro RPG)..."
              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white"
            />
            <button
              type="button"
              onClick={addAttribute}
              className="rounded-xl bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-zinc-700"
            >
              + Atributo
            </button>
          </div>
        )}

        {/* Testes de Resistência (Saving Throws) */}
        <div className="fr-card rounded-2xl p-4">
          <h4 className="font-display mb-2.5 text-xs font-bold uppercase tracking-wider text-amber-300">
            Testes de Resistência (Saves)
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {sheet.attributes.map((attr) => {
              const isProf = (sheet.saveProficiencies ?? []).includes(attr.key);
              const bonus = computeSaveBonus(sheet, attr.key);
              const bonusStr = formatSigned(bonus);

              return (
                <div
                  key={`save-${attr.key}`}
                  className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/70 px-2.5 py-1.5 text-xs"
                >
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => toggleSaveProficiency(attr.key)}
                    className={`mr-1.5 h-3.5 w-3.5 rounded-full border ${
                      isProf
                        ? "border-amber-400 bg-amber-400"
                        : "border-zinc-600 bg-transparent"
                    }`}
                    title="Marcar proficiência em Resistência"
                  />
                  <span className="truncate font-medium text-zinc-200">
                    {attr.label}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onRollCommand(
                        `/r 1d20${bonusStr} Resistência de ${attr.label} (${characterName})`
                      )
                    }
                    className="ml-auto inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 font-mono font-bold text-amber-300 hover:bg-amber-500/25"
                  >
                    🎲 {bonusStr}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Coluna Direita: Lista Completa de Perícias */}
      <div className="fr-card flex flex-col rounded-2xl p-4 lg:col-span-7">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-display text-xs font-bold uppercase tracking-wider text-amber-300">
            Perícias ({(sheet.skills ?? []).length}) · Clique no círculo para
            Normal / Proficiente / Especialista
          </h4>
        </div>

        <div className="grid max-h-[340px] gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
          {(sheet.skills ?? []).map((sk: SheetSkill) => {
            const bonus = computeSkillBonus(sheet, sk);
            const bonusStr = formatSigned(bonus);

            return (
              <div
                key={sk.key}
                className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/80 px-3 py-1.5 text-xs"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => cycleSkillProficiency(sk.key)}
                    title={`Proficiência: ${sk.proficiency}`}
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                      sk.proficiency === "expertise"
                        ? "border-amber-300 bg-amber-400 text-zinc-950"
                        : sk.proficiency === "proficient"
                          ? "border-emerald-400 bg-emerald-500/30 text-emerald-200"
                          : "border-zinc-700 bg-zinc-900 text-transparent"
                    }`}
                  >
                    {sk.proficiency === "expertise" ? "★" : "●"}
                  </button>
                  <span className="truncate font-medium text-zinc-200">
                    {sk.label}
                  </span>
                  <span className="text-[10px] uppercase text-zinc-500">
                    ({sk.abilityKey})
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onRollCommand(
                      `/r 1d20${bonusStr} ${sk.label} (${characterName})`
                    )
                  }
                  className="ml-2 inline-flex shrink-0 items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-xs font-bold text-amber-300 transition hover:bg-amber-500/25"
                >
                  🎲 {bonusStr}
                </button>
              </div>
            );
          })}
        </div>

        {/* Adicionar Perícia Customizada */}
        {canEdit && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-800 pt-3">
            <input
              type="text"
              value={newSkillLabel}
              onChange={(e) => setNewSkillLabel(e.target.value)}
              placeholder="Nova perícia ou ofício..."
              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white"
            />
            <select
              value={newSkillAbility}
              onChange={(e) => setNewSkillAbility(e.target.value)}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-300"
            >
              {sheet.attributes.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addCustomSkill}
              className="inline-flex items-center gap-1 rounded-xl bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-zinc-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Perícia
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
