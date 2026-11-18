"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  BookOpen,
  Check,
  Coins,
  Dices,
  Heart,
  Loader2,
  Lock,
  Save,
  ScrollText,
  Shield,
  ShieldAlert,
  Sparkles,
  Swords,
  Unlock,
  X,
  Zap,
} from "lucide-react";
import {
  toggleCharacterEditLockAction,
  updateCharacterSheetAction,
} from "@/actions/characters";
import { sendChatMessageAction } from "@/actions/chat";
import {
  attributeModifier,
  findAttributeScore,
  normalizeSheetData,
  proficiencyBonusForLevel,
} from "@/lib/validation/sheet";
import type {
  CampaignRole,
  CharacterRow,
  MessageRow,
  RpgSystemId,
  SheetData,
} from "@/types/domain";
import { formatSigned } from "./sheetHelpers";
import SheetAbilitiesTab from "./tabs/SheetAbilitiesTab";
import SheetCombatTab from "./tabs/SheetCombatTab";
import SheetGrimoireTab from "./tabs/SheetGrimoireTab";
import SheetInventoryTab from "./tabs/SheetInventoryTab";

type SheetTab = "abilities" | "combat" | "grimoire" | "inventory";

export default function CharacterSheetModal({
  character,
  campaignId,
  currentUserId,
  role,
  ownerName,
  onClose,
  onUpdateCharacter,
  onRollMessageSent,
}: {
  character: CharacterRow;
  campaignId: string;
  currentUserId: string;
  role: CampaignRole;
  ownerName: string;
  onClose: () => void;
  onUpdateCharacter: (updated: CharacterRow) => void;
  onRollMessageSent?: (msg: MessageRow) => void;
}) {
  const isGm = role === "gm";
  const isOwner = character.owner_id === currentUserId;
  const canEdit = isGm || (isOwner && character.player_can_edit);

  const [activeTab, setActiveTab] = useState<SheetTab>("abilities");
  const [draftId, setDraftId] = useState(character.id);
  const [draftUpdatedAt, setDraftUpdatedAt] = useState(character.updated_at);
  const [name, setName] = useState(character.name);
  const [sheet, setSheet] = useState<SheetData>(() =>
    normalizeSheetData(character.sheet_data)
  );

  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [rollToast, setRollToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (character.id !== draftId || character.updated_at !== draftUpdatedAt) {
    setDraftId(character.id);
    setDraftUpdatedAt(character.updated_at);
    setName(character.name);
    setSheet(normalizeSheetData(character.sheet_data));
  }

  const profBonus = proficiencyBonusForLevel(sheet.level);
  const dexMod = attributeModifier(
    findAttributeScore(sheet.attributes, "des")
  );

  const sendRollCommand = (cmd: string) => {
    setError(null);
    startTransition(async () => {
      const res = await sendChatMessageAction({
        campaignId,
        content: cmd,
      });
      if (!res.ok) {
        setError(res.error ?? "Erro ao rolar dados.");
        return;
      }
      if (res.message) {
        onRollMessageSent?.(res.message);
      }
      setRollToast(`🎲 Rolando no Tabuleiro: ${cmd}`);
      setTimeout(() => setRollToast(null), 2600);
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setError(null);

    startTransition(async () => {
      const res = await updateCharacterSheetAction({
        characterId: character.id,
        campaignId,
        name,
        sheetData: sheet,
      });

      if (!res.ok || !res.character) {
        setError(res.error ?? "Erro ao salvar ficha.");
        return;
      }

      onUpdateCharacter(res.character);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2000);
    });
  };

  const handleToggleLock = () => {
    if (!isGm) return;
    setError(null);
    const nextCanEdit = !character.player_can_edit;

    startTransition(async () => {
      const res = await toggleCharacterEditLockAction({
        characterId: character.id,
        campaignId,
        canEdit: nextCanEdit,
      });

      if (!res.ok) {
        setError(res.error ?? "Erro ao alterar bloqueio da ficha.");
        return;
      }

      if (res.character) {
        onUpdateCharacter(res.character);
      } else {
        onUpdateCharacter({
          ...character,
          player_can_edit: nextCanEdit,
          updated_at: new Date().toISOString(),
        });
      }
    });
  };

  const deathSaves = sheet.deathSaves ?? { successes: 0, failures: 0 };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-5">
      <div className="fr-parchment flex max-h-[93vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl shadow-2xl">
        {/* Top Bar da Ficha (Grimório Forgotten Realms) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/30 bg-zinc-950/90 px-5 py-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <ScrollText className="h-5 w-5 text-amber-400" />
            <h2 className="font-display text-lg font-extrabold tracking-wide text-amber-100">
              {name}
            </h2>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
              Dono: {ownerName}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                character.player_can_edit
                  ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border border-amber-500/40 bg-amber-500/15 text-amber-300"
              }`}
            >
              {character.player_can_edit ? (
                <>
                  <Unlock className="h-3 w-3" />
                  Edição Liberada
                </>
              ) : (
                <>
                  <Lock className="h-3 w-3" />
                  Selada pelo Mestre
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Seletor de Sistema */}
            <select
              disabled={!canEdit}
              value={sheet.system ?? "dnd5e"}
              onChange={(e) =>
                setSheet((prev) => ({
                  ...prev,
                  system: e.target.value as RpgSystemId,
                }))
              }
              className="rounded-xl border border-amber-500/30 bg-zinc-900 px-2.5 py-1.5 text-xs font-semibold text-amber-200"
            >
              <option value="dnd5e">Sistema: D&amp;D 5e (Forgotten Realms)</option>
              <option value="custom">Sistema Livre / Outro RPG</option>
            </select>

            {isGm && (
              <button
                type="button"
                onClick={handleToggleLock}
                disabled={isPending}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                  character.player_can_edit
                    ? "border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
                    : "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                }`}
              >
                {character.player_can_edit ? (
                  <>
                    <Lock className="h-3.5 w-3.5" />
                    Bloquear Ficha
                  </>
                ) : (
                  <>
                    <Unlock className="h-3.5 w-3.5" />
                    Liberar para Jogador
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 transition hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Formulário Principal */}
        <form
          onSubmit={handleSave}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            {!canEdit && (
              <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400" />
                <span>
                  Ficha selada pelo Mestre (somente leitura). Você pode clicar
                  em qualquer botão 🎲 para lançar os dados 3D no tabuleiro!
                </span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {rollToast && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-400/50 bg-amber-500/15 p-3 text-xs font-semibold text-amber-200 shadow">
                <Dices className="h-4 w-4 shrink-0 text-amber-400" />
                <span>{rollToast}</span>
              </div>
            )}

            {/* Identidade do Personagem */}
            <div className="grid gap-3 rounded-2xl border border-amber-500/25 bg-zinc-950/75 p-4 sm:grid-cols-5">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-amber-300/80">
                  Nome do Personagem
                </label>
                <input
                  type="text"
                  required
                  disabled={!canEdit}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="font-display w-full rounded-xl border border-amber-500/25 bg-zinc-900 px-3 py-1.5 text-sm font-bold text-amber-50"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-amber-300/80">
                  Raça / Ancestralidade
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={sheet.ancestryOrRace ?? ""}
                  onChange={(e) =>
                    setSheet((prev) => ({
                      ...prev,
                      ancestryOrRace: e.target.value,
                    }))
                  }
                  placeholder="Ex: Elfo da Lua"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-amber-300/80">
                  Classe / Arquétipo
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={sheet.classOrArchetype ?? ""}
                  onChange={(e) =>
                    setSheet((prev) => ({
                      ...prev,
                      classOrArchetype: e.target.value,
                    }))
                  }
                  placeholder="Ex: Paladino de Tyr"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-amber-300/80">
                    Nível
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    disabled={!canEdit}
                    value={sheet.level}
                    onChange={(e) =>
                      setSheet((prev) => ({
                        ...prev,
                        level: Number(e.target.value) || 1,
                      }))
                    }
                    className="w-full rounded-xl border border-amber-500/30 bg-zinc-900 px-2 py-1.5 text-center font-mono text-sm font-extrabold text-amber-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-amber-300/80">
                    Proficiência
                  </label>
                  <div className="flex h-[34px] items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 font-mono text-sm font-extrabold text-amber-300">
                    +{profBonus}
                  </div>
                </div>
              </div>
            </div>

            {/* Faixa Tática de Combate (Estilo Roll20 / D&D Beyond) */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
              {/* Escudo de CA */}
              <div className="fr-card flex flex-col items-center justify-center rounded-2xl p-3 text-center">
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                  <Shield className="h-3.5 w-3.5 text-amber-400" />
                  Classe Armadura
                </div>
                <input
                  type="number"
                  min={0}
                  max={99}
                  disabled={!canEdit}
                  value={sheet.armorClass ?? 14}
                  onChange={(e) =>
                    setSheet((prev) => ({
                      ...prev,
                      armorClass: Number(e.target.value) || 10,
                    }))
                  }
                  className="font-display mt-1 w-16 rounded-lg border border-amber-500/30 bg-zinc-950 py-1 text-center text-xl font-extrabold text-amber-200"
                />
              </div>

              {/* Pontos de Vida */}
              <div className="fr-card col-span-2 flex flex-col justify-between rounded-2xl p-3">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-rose-300">
                  <span className="inline-flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5 text-rose-400" />
                    Pontos de Vida (PV)
                  </span>
                  <span className="text-zinc-400">Temp</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <input
                    type="number"
                    disabled={!canEdit}
                    value={sheet.hpCurrent ?? 12}
                    onChange={(e) =>
                      setSheet((prev) => ({
                        ...prev,
                        hpCurrent: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-16 rounded-lg border border-rose-500/30 bg-zinc-950 py-1 text-center font-mono text-base font-extrabold text-emerald-300"
                    title="PV Atual"
                  />
                  <span className="font-bold text-zinc-500">/</span>
                  <input
                    type="number"
                    min={1}
                    disabled={!canEdit}
                    value={sheet.hpMax ?? 12}
                    onChange={(e) =>
                      setSheet((prev) => ({
                        ...prev,
                        hpMax: Math.max(Number(e.target.value) || 1, 1),
                      }))
                    }
                    className="w-16 rounded-lg border border-zinc-800 bg-zinc-950 py-1 text-center font-mono text-base font-bold text-zinc-200"
                    title="PV Máximo"
                  />
                  <input
                    type="number"
                    min={0}
                    disabled={!canEdit}
                    value={sheet.hpTemp ?? 0}
                    onChange={(e) =>
                      setSheet((prev) => ({
                        ...prev,
                        hpTemp: Math.max(Number(e.target.value) || 0, 0),
                      }))
                    }
                    className="ml-auto w-14 rounded-lg border border-sky-500/30 bg-zinc-950 py-1 text-center font-mono text-sm font-bold text-sky-300"
                    title="PV Temporário"
                  />
                </div>
              </div>

              {/* Iniciativa Clicável */}
              <div className="fr-card flex flex-col items-center justify-between rounded-2xl p-3 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                  Iniciativa
                </span>
                <button
                  type="button"
                  onClick={() =>
                    sendRollCommand(
                      `/r 1d20${formatSigned(dexMod)} Iniciativa (${name})`
                    )
                  }
                  className="mt-1 inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 font-mono text-base font-extrabold text-amber-300 transition hover:bg-amber-500/25"
                  title="Rolar Iniciativa no Tabuleiro 3D"
                >
                  <Zap className="h-3.5 w-3.5" />
                  {formatSigned(dexMod)}
                </button>
              </div>

              {/* Deslocamento & Dados de Vida */}
              <div className="fr-card flex flex-col justify-between rounded-2xl p-3">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold uppercase text-zinc-400">
                    Desloc.
                  </span>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={sheet.speed ?? "9m"}
                    onChange={(e) =>
                      setSheet((prev) => ({ ...prev, speed: e.target.value }))
                    }
                    className="w-14 rounded border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 text-center font-mono text-xs font-bold text-white"
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold uppercase text-zinc-400">
                    Dado Vida
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      sendRollCommand(
                        `/r ${sheet.hitDice || "1d10"} Dado de Vida (${name})`
                      )
                    }
                    className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-xs font-bold text-amber-300 hover:bg-amber-500/20"
                  >
                    🎲 {sheet.hitDice || "1d10"}
                  </button>
                </div>
              </div>

              {/* Testes contra a Morte */}
              <div className="fr-card flex flex-col justify-between rounded-2xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-zinc-400">
                    Morte
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      sendRollCommand(`/r 1d20 Teste contra a Morte (${name})`)
                    }
                    className="text-[10px] font-bold text-amber-300 hover:underline"
                  >
                    🎲 d20
                  </button>
                </div>
                <div className="mt-1 space-y-1 text-[10px]">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400">Sucesso</span>
                    <div className="flex gap-1">
                      {[1, 2, 3].map((n) => (
                        <button
                          key={`suc-${n}`}
                          type="button"
                          disabled={!canEdit}
                          onClick={() =>
                            setSheet((prev) => ({
                              ...prev,
                              deathSaves: {
                                ...deathSaves,
                                successes:
                                  deathSaves.successes === n ? n - 1 : n,
                              },
                            }))
                          }
                          className={`h-3 w-3 rounded-full border ${
                            deathSaves.successes >= n
                              ? "border-emerald-400 bg-emerald-500"
                              : "border-zinc-700 bg-zinc-950"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-rose-400">Falha</span>
                    <div className="flex gap-1">
                      {[1, 2, 3].map((n) => (
                        <button
                          key={`fail-${n}`}
                          type="button"
                          disabled={!canEdit}
                          onClick={() =>
                            setSheet((prev) => ({
                              ...prev,
                              deathSaves: {
                                ...deathSaves,
                                failures: deathSaves.failures === n ? n - 1 : n,
                              },
                            }))
                          }
                          className={`h-3 w-3 rounded-full border ${
                            deathSaves.failures >= n
                              ? "border-rose-400 bg-rose-500"
                              : "border-zinc-700 bg-zinc-950"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Navegação das 4 Abas da Ficha Roll20 */}
            <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-amber-500/25 bg-zinc-950/90 p-1.5 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => setActiveTab("abilities")}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                  activeTab === "abilities"
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 shadow"
                    : "text-zinc-400 hover:text-amber-200"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Atributos &amp; Perícias
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("combat")}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                  activeTab === "combat"
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 shadow"
                    : "text-zinc-400 hover:text-amber-200"
                }`}
              >
                <Swords className="h-3.5 w-3.5" />
                Combate &amp; Ataques
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("grimoire")}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                  activeTab === "grimoire"
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 shadow"
                    : "text-zinc-400 hover:text-amber-200"
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Grimório &amp; Magias
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("inventory")}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${
                  activeTab === "inventory"
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 shadow"
                    : "text-zinc-400 hover:text-amber-200"
                }`}
              >
                <Coins className="h-3.5 w-3.5" />
                Inventário &amp; História
              </button>
            </div>

            {/* ABA 1: ATRIBUTOS, SAVES E PERÍCIAS */}
            {activeTab === "abilities" && (
              <SheetAbilitiesTab
                sheet={sheet}
                setSheet={setSheet}
                characterName={name}
                canEdit={canEdit}
                onRollCommand={sendRollCommand}
              />
            )}

            {/* ABA 2: COMBATE E ATAQUES */}
            {activeTab === "combat" && (
              <SheetCombatTab
                sheet={sheet}
                setSheet={setSheet}
                characterName={name}
                canEdit={canEdit}
                onRollCommand={sendRollCommand}
              />
            )}

            {/* ABA 3: GRIMÓRIO E MAGIAS */}
            {activeTab === "grimoire" && (
              <SheetGrimoireTab
                sheet={sheet}
                setSheet={setSheet}
                characterName={name}
                canEdit={canEdit}
                onRollCommand={sendRollCommand}
              />
            )}

            {/* ABA 4: INVENTÁRIO, MOEDAS E BIOGRAFIA */}
            {activeTab === "inventory" && (
              <SheetInventoryTab
                sheet={sheet}
                setSheet={setSheet}
                canEdit={canEdit}
              />
            )}
          </div>

          {/* Rodapé Fixo de Salvamento */}
          <div className="flex items-center justify-between border-t border-amber-500/25 bg-zinc-950/95 px-6 py-3.5">
            <span className="text-xs text-zinc-400">
              Dica: clique em qualquer botão{" "}
              <strong className="text-amber-300">🎲</strong> para lançar dados
              3D na mesa.
            </span>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white"
              >
                Fechar
              </button>

              {canEdit && (
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2 text-xs font-bold uppercase tracking-wider text-zinc-950 shadow transition hover:from-amber-400 hover:to-amber-500 disabled:opacity-60"
                >
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : savedNotice ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  {savedNotice ? "Grimório Salvo!" : "Salvar Ficha"}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
