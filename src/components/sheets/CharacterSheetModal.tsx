"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  Check,
  Dices,
  Loader2,
  Lock,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
  Unlock,
  X,
} from "lucide-react";
import {
  toggleCharacterEditLockAction,
  updateCharacterSheetAction,
} from "@/actions/characters";
import { sendChatMessageAction } from "@/actions/chat";
import {
  attributeModifier,
  normalizeSheetData,
} from "@/lib/validation/sheet";
import type {
  CampaignRole,
  CharacterRow,
  MessageRow,
  SheetData,
} from "@/types/domain";

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

  const [draftId, setDraftId] = useState(character.id);
  const [draftUpdatedAt, setDraftUpdatedAt] = useState(character.updated_at);
  const [name, setName] = useState(character.name);
  const [sheet, setSheet] = useState<SheetData>(() =>
    normalizeSheetData(character.sheet_data)
  );
  const [newAttrLabel, setNewAttrLabel] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);
  const [rollToast, setRollToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Sincroniza quando chega atualização Realtime mais recente do banco
  if (
    character.id !== draftId ||
    character.updated_at !== draftUpdatedAt
  ) {
    setDraftId(character.id);
    setDraftUpdatedAt(character.updated_at);
    setName(character.name);
    setSheet(normalizeSheetData(character.sheet_data));
  }

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

  const handleRollAttribute = (label: string, value: number) => {
    const mod = attributeModifier(value);
    const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
    const cmd = `/r 1d20${modStr} ${label} (${name})`;

    startTransition(async () => {
      const res = await sendChatMessageAction({
        campaignId,
        content: cmd,
      });
      if (!res.ok) {
        setError(res.error ?? "Erro ao rolar atributo.");
        return;
      }
      if (res.message) {
        onRollMessageSent?.(res.message);
      }
      setRollToast(`Rolagem enviada ao Chat: ${cmd}`);
      setTimeout(() => setRollToast(null), 2500);
    });
  };

  const addAttribute = () => {
    const label = newAttrLabel.trim();
    if (!label || !canEdit) return;
    const key = label
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .slice(0, 16) || `attr_${Date.now()}`;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">{character.name}</h2>
              <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-[11px] font-medium text-zinc-300">
                Dono: {ownerName}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  character.player_can_edit
                    ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border border-amber-500/30 bg-amber-500/10 text-amber-300"
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
                    Bloqueada pelo Mestre
                  </>
                )}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-zinc-400">
              Ficha privada — visível apenas para {ownerName} e o Mestre.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isGm && (
              <button
                type="button"
                onClick={handleToggleLock}
                disabled={isPending}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
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

        {/* Corpo da Ficha */}
        <form
          onSubmit={handleSave}
          className="flex-1 space-y-6 overflow-y-auto p-6"
        >
          {!canEdit && (
            <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200">
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400" />
              <span>
                Esta ficha está bloqueada para edição pelo Mestre. Você pode
                consultar seus dados e clicar nos dados 🎲 para rolar no chat.
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
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
              <Dices className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{rollToast}</span>
            </div>
          )}

          {/* Dados Básicos: Nome, Classe/Arquétipo, Nível */}
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Nome do Personagem
              </label>
              <input
                type="text"
                required
                disabled={!canEdit}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Classe / Conceito
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
                placeholder="Ex: Guerreiro Anão"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white disabled:opacity-60"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Nível
              </label>
              <input
                type="number"
                min={1}
                max={100}
                disabled={!canEdit}
                value={sheet.level}
                onChange={(e) =>
                  setSheet((prev) => ({
                    ...prev,
                    level: Number(e.target.value) || 1,
                  }))
                }
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-bold text-amber-400 disabled:opacity-60"
              />
            </div>
          </div>

          {/* Atributos Dinâmicos */}
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Atributos ({sheet.attributes.length})
              </h3>
              {canEdit && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newAttrLabel}
                    onChange={(e) => setNewAttrLabel(e.target.value)}
                    placeholder="Novo atributo..."
                    className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={addAttribute}
                    className="inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Atributo
                  </button>
                </div>
              )}
            </div>

            <div className="grid gap-2.5 sm:grid-cols-3">
              {sheet.attributes.map((attr, idx) => {
                const mod = attributeModifier(attr.value);
                const modFormatted = mod >= 0 ? `+${mod}` : `${mod}`;

                return (
                  <div
                    key={attr.key}
                    className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/90 p-3"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      {canEdit ? (
                        <input
                          type="text"
                          value={attr.label}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSheet((prev) => ({
                              ...prev,
                              attributes: prev.attributes.map((a, i) =>
                                i === idx ? { ...a, label: val } : a
                              ),
                            }));
                          }}
                          className="w-full bg-transparent text-xs font-semibold text-zinc-200 outline-none focus:text-amber-300"
                        />
                      ) : (
                        <p className="truncate text-xs font-semibold text-zinc-200">
                          {attr.label}
                        </p>
                      )}
                      <p className="font-mono text-xs text-amber-400">
                        Mod: {modFormatted}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
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
                        className="w-14 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-center font-mono text-sm font-bold text-white disabled:opacity-70"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          handleRollAttribute(attr.label, attr.value)
                        }
                        title={`Rolar 1d20${modFormatted} (${attr.label})`}
                        className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-1.5 text-amber-300 transition hover:bg-amber-500/25"
                      >
                        <Dices className="h-4 w-4" />
                      </button>

                      {canEdit && sheet.attributes.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setSheet((prev) => ({
                              ...prev,
                              attributes: prev.attributes.filter(
                                (_, i) => i !== idx
                              ),
                            }))
                          }
                          className="rounded p-1 text-zinc-600 hover:text-red-400"
                          title="Remover atributo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Inventário */}
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Inventário ({sheet.inventory.length})
              </h3>
              {canEdit && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Adicionar item..."
                    className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={addInventoryItem}
                    className="inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Item
                  </button>
                </div>
              )}
            </div>

            {sheet.inventory.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-800 p-4 text-center text-xs text-zinc-500">
                Inventário vazio.
              </p>
            ) : (
              <div className="space-y-1.5">
                {sheet.inventory.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2"
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
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-zinc-500">Qtd:</span>
                      <input
                        type="number"
                        min={0}
                        disabled={!canEdit}
                        value={item.qty}
                        onChange={(e) => {
                          const val = Math.max(Number(e.target.value) || 0, 0);
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
                          className="rounded p-1 text-zinc-500 hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Anotações e Habilidades */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-300">
              Habilidades, Magias e Anotações
            </label>
            <textarea
              rows={4}
              disabled={!canEdit}
              value={sheet.notes}
              onChange={(e) =>
                setSheet((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Descreva talentos, magias preparadas, histórico e anotações da campanha..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs leading-relaxed text-white placeholder-zinc-500 outline-none focus:border-amber-500 disabled:opacity-60"
            />
          </div>

          {/* Rodapé do Modal */}
          <div className="flex items-center justify-end gap-2 border-t border-zinc-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white"
            >
              Fechar
            </button>

            {canEdit && (
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-5 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-60"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : savedNotice ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                {savedNotice ? "Ficha Salva!" : "Salvar Alterações"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
