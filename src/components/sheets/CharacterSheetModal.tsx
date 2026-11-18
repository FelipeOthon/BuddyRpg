"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  BookOpen,
  Check,
  Coins,
  Dices,
  Flame,
  Heart,
  Loader2,
  Lock,
  Plus,
  Save,
  ScrollText,
  Shield,
  ShieldAlert,
  Sparkles,
  Swords,
  Trash2,
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
  computeSaveBonus,
  computeSkillBonus,
  computeSpellStats,
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
  SheetSkill,
  SkillProficiency,
} from "@/types/domain";

type SheetTab = "abilities" | "combat" | "grimoire" | "inventory";

function formatSigned(val: number): string {
  return val >= 0 ? `+${val}` : `${val}`;
}

function nextProficiency(current: SkillProficiency): SkillProficiency {
  if (current === "none") return "proficient";
  if (current === "proficient") return "expertise";
  return "none";
}

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

  // Inputs auxiliares de adição
  const [newAttrLabel, setNewAttrLabel] = useState("");
  const [newSkillLabel, setNewSkillLabel] = useState("");
  const [newSkillAbility, setNewSkillAbility] = useState("des");
  const [newItemName, setNewItemName] = useState("");

  // Novo ataque
  const [atkName, setAtkName] = useState("");
  const [atkBonus, setAtkBonus] = useState(4);
  const [atkFormula, setAtkFormula] = useState("1d8+2");
  const [atkType, setAtkType] = useState("Cortante");

  // Nova magia
  const [spellName, setSpellName] = useState("");
  const [spellLevel, setSpellLevel] = useState(1);
  const [spellDamage, setSpellDamage] = useState("");
  const [spellNotes, setSpellNotes] = useState("");

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
  const spellStats = computeSpellStats(sheet);

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

  const addInventoryItem = () => {
    const itemName = newItemName.trim();
    if (!itemName || !canEdit) return;
    setSheet((prev) => ({
      ...prev,
      inventory: [
        ...prev.inventory,
        {
          id: `item-${Date.now()}`,
          name: itemName,
          qty: 1,
        },
      ],
    }));
    setNewItemName("");
  };

  const coins = sheet.coins ?? { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
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
                              sendRollCommand(
                                `/r 1d20${modStr} ${attr.label} (${name})`
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
                        const isProf = (sheet.saveProficiencies ?? []).includes(
                          attr.key
                        );
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
                                sendRollCommand(
                                  `/r 1d20${bonusStr} Resistência de ${attr.label} (${name})`
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
                      Perícias ({(sheet.skills ?? []).length}) · Clique no círculo
                      para Normal / Proficiente / Especialista
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
                              sendRollCommand(
                                `/r 1d20${bonusStr} ${sk.label} (${name})`
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

                  {/* Adicionar Perícia Customizada (Para outros RPGs ou Perícias de Ferramenta) */}
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
            )}

            {/* ABA 2: COMBATE E ATAQUES */}
            {activeTab === "combat" && (
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
                                sendRollCommand(
                                  `/r 1d20${bonusStr} Ataque: ${atk.name} (${name})`
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
                                sendRollCommand(
                                  `/r ${atk.damageFormula} Dano: ${atk.name} [${atk.damageType}] (${name})`
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
            )}

            {/* ABA 3: GRIMÓRIO E MAGIAS */}
            {activeTab === "grimoire" && (
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
                        sendRollCommand(
                          `/r 1d20${formatSigned(
                            spellStats.spellAttackBonus
                          )} Ataque Mágico (${name})`
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
                                spellSlots: (prev.spellSlots ?? []).map(
                                  (s, i) => (i === idx ? { ...s, used: u } : s)
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
                                spellSlots: (prev.spellSlots ?? []).map(
                                  (s, i) => (i === idx ? { ...s, total: t } : s)
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
                              sendRollCommand(
                                `/r ${sp.damageFormula} Magia: ${sp.name} (${name})`
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
                              sendRollCommand(
                                `✨ ${name} conjurou ${sp.name}!`
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
            )}

            {/* ABA 4: INVENTÁRIO, MOEDAS E BIOGRAFIA */}
            {activeTab === "inventory" && (
              <div className="space-y-5">
                {/* Bolsa de Moedas de Faerûn */}
                <div className="fr-card rounded-2xl p-4">
                  <h4 className="font-display mb-3 text-xs font-bold uppercase tracking-wider text-amber-300">
                    Tesouro &amp; Moedas (PC / PP / PE / PO / PL)
                  </h4>
                  <div className="grid grid-cols-5 gap-2.5">
                    {(
                      [
                        { key: "cp", label: "PC (Cobre)", color: "text-orange-300" },
                        { key: "sp", label: "PP (Prata)", color: "text-zinc-200" },
                        { key: "ep", label: "PE (Electro)", color: "text-teal-300" },
                        { key: "gp", label: "PO (Ouro)", color: "text-amber-300" },
                        { key: "pp", label: "PL (Platina)", color: "text-indigo-200" },
                      ] as const
                    ).map((c) => (
                      <div
                        key={c.key}
                        className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-center"
                      >
                        <label
                          className={`block text-[10px] font-bold uppercase ${c.color}`}
                        >
                          {c.label}
                        </label>
                        <input
                          type="number"
                          min={0}
                          disabled={!canEdit}
                          value={coins[c.key]}
                          onChange={(e) => {
                            const val = Math.max(
                              Number(e.target.value) || 0,
                              0
                            );
                            setSheet((prev) => ({
                              ...prev,
                              coins: {
                                ...coins,
                                [c.key]: val,
                              },
                            }));
                          }}
                          className="mt-1 w-full rounded border border-zinc-800 bg-zinc-900 py-1 text-center font-mono text-sm font-bold text-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lista de Equipamentos */}
                <div className="fr-card rounded-2xl p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-display text-xs font-bold uppercase tracking-wider text-amber-300">
                      Equipamentos &amp; Mochila ({sheet.inventory.length})
                    </h4>
                    {canEdit && (
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          placeholder="Adicionar item..."
                          className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-white"
                        />
                        <button
                          type="button"
                          onClick={addInventoryItem}
                          className="inline-flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-1 text-xs font-bold text-zinc-950"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Item
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {sheet.inventory.map((item, idx) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2"
                      >
                        <input
                          type="text"
                          disabled={!canEdit}
                          value={item.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSheet((prev) => ({
                              ...prev,
                              inventory: prev.inventory.map((it, i) =>
                                i === idx ? { ...it, name: val } : it
                              ),
                            }));
                          }}
                          className="flex-1 bg-transparent text-xs font-medium text-white outline-none"
                        />
                        <span className="text-[11px] text-zinc-500">Qtd:</span>
                        <input
                          type="number"
                          min={0}
                          disabled={!canEdit}
                          value={item.qty}
                          onChange={(e) => {
                            const val = Math.max(
                              Number(e.target.value) || 0,
                              0
                            );
                            setSheet((prev) => ({
                              ...prev,
                              inventory: prev.inventory.map((it, i) =>
                                i === idx ? { ...it, qty: val } : it
                              ),
                            }));
                          }}
                          className="w-16 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-center font-mono text-xs text-white"
                        />
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() =>
                              setSheet((prev) => ({
                                ...prev,
                                inventory: prev.inventory.filter(
                                  (_, i) => i !== idx
                                ),
                              }))
                            }
                            className="text-zinc-500 hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Biografia, Facções e Anotações */}
                <div className="fr-card rounded-2xl p-4">
                  <div className="mb-2 grid gap-2 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase text-amber-300">
                        Antecedente / Facção em Faerûn
                      </label>
                      <input
                        type="text"
                        disabled={!canEdit}
                        value={sheet.backgroundOrFaction ?? ""}
                        onChange={(e) =>
                          setSheet((prev) => ({
                            ...prev,
                            backgroundOrFaction: e.target.value,
                          }))
                        }
                        placeholder="Ex: Harpistas / Zhentarim / Sábio"
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase text-amber-300">
                    Talentos, Características de Classe e Crônicas Pessoais
                  </label>
                  <textarea
                    rows={5}
                    disabled={!canEdit}
                    value={sheet.notes}
                    onChange={(e) =>
                      setSheet((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Registre talentos, aliados em Águas Profundas, pactos e anotações da aventura..."
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs leading-relaxed text-white placeholder-zinc-500 outline-none focus:border-amber-500"
                  />
                </div>
              </div>
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
