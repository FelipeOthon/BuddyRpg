"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  ExternalLink,
  Loader2,
  Lock,
  Plus,
  ScrollText,
  Trash2,
  Unlock,
  User,
} from "lucide-react";
import {
  createCharacterAction,
  deleteCharacterAction,
  toggleCharacterEditLockAction,
} from "@/actions/characters";
import type { CampaignMemberInfo } from "@/components/campaign/CampaignWorkspaceShell";
import { normalizeSheetData } from "@/lib/validation/sheet";
import type { CampaignRole, CharacterRow } from "@/types/domain";

export default function CharactersPanel({
  campaignId,
  currentUserId,
  role,
  characters,
  members,
  onUpsertCharacter,
  onRemoveCharacter,
  onOpenCharacter,
}: {
  campaignId: string;
  currentUserId: string;
  role: CampaignRole;
  characters: CharacterRow[];
  members: CampaignMemberInfo[];
  onUpsertCharacter: (c: CharacterRow) => void;
  onRemoveCharacter: (id: string) => void;
  onOpenCharacter: (c: CharacterRow) => void;
}) {
  const isGm = role === "gm";
  const [name, setName] = useState("");
  const [ownerId, setOwnerId] = useState(currentUserId);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);

    startTransition(async () => {
      const res = await createCharacterAction({
        campaignId,
        name,
        ownerId: isGm ? ownerId : currentUserId,
      });

      if (!res.ok || !res.character) {
        setError(res.error ?? "Erro ao criar ficha.");
        return;
      }

      onUpsertCharacter(res.character);
      setName("");
      onOpenCharacter(res.character);
    });
  };

  const handleToggleLock = (c: CharacterRow) => {
    if (!isGm) return;
    setError(null);
    const nextCanEdit = !c.player_can_edit;

    startTransition(async () => {
      const res = await toggleCharacterEditLockAction({
        characterId: c.id,
        campaignId,
        canEdit: nextCanEdit,
      });

      if (!res.ok) {
        setError(res.error ?? "Erro ao alterar cadeado.");
        return;
      }

      onUpsertCharacter(
        res.character ?? {
          ...c,
          player_can_edit: nextCanEdit,
          updated_at: new Date().toISOString(),
        }
      );
    });
  };

  const handleDelete = (c: CharacterRow) => {
    if (!isGm && c.owner_id !== currentUserId) return;
    if (!window.confirm(`Excluir a ficha "${c.name}" permanentemente?`))
      return;

    startTransition(async () => {
      const res = await deleteCharacterAction({
        characterId: c.id,
        campaignId,
      });
      if (!res.ok) {
        setError(res.error ?? "Erro ao excluir ficha.");
        return;
      }
      onRemoveCharacter(c.id);
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 text-[11px] text-zinc-400">
        <strong className="text-zinc-200">Fichas Privadas:</strong> cada jogador
        enxerga apenas suas próprias fichas. O Mestre visualiza todas e pode
        bloquear (<code className="text-amber-300">🔒</code>) ou liberar (
        <code className="text-emerald-300">🔓</code>) a edição a qualquer
        momento.
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Formulário para Criar Nova Ficha */}
      <form
        onSubmit={handleCreate}
        className="space-y-2.5 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3.5"
      >
        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
          Nova Ficha de Personagem
        </h4>

        <input
          type="text"
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do Personagem..."
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-amber-500"
        />

        {isGm && (
          <div>
            <label className="mb-1 block text-[11px] text-zinc-400">
              Jogador Dono da Ficha
            </label>
            <select
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-white"
            >
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.username} ({m.role === "gm" ? "Mestre" : "Jogador"})
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          Criar e Preencher Ficha
        </button>
      </form>

      {/* Lista de Fichas Visíveis */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          {isGm
            ? `Todas as Fichas (${characters.length})`
            : `Minhas Fichas (${characters.length})`}
        </h4>

        {characters.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-center">
            <ScrollText className="mx-auto h-7 w-7 text-zinc-600" />
            <p className="mt-2 text-xs text-zinc-400">
              Nenhuma ficha criada ainda.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {characters.map((c) => {
              const owner = members.find((m) => m.userId === c.owner_id);
              const sheet = normalizeSheetData(c.sheet_data);

              return (
                <li
                  key={c.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 transition hover:border-zinc-700"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-white">{c.name}</p>
                      <p className="text-[11px] text-zinc-400">
                        Nível {sheet.level} ·{" "}
                        {sheet.classOrArchetype || "Aventureiro"}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-zinc-500">
                        <User className="h-3 w-3" />
                        {owner?.username ?? "Mestre"}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      {isGm ? (
                        <button
                          type="button"
                          onClick={() => handleToggleLock(c)}
                          disabled={isPending}
                          title={
                            c.player_can_edit
                              ? "Edição liberada (Clique para bloquear)"
                              : "Edição bloqueada (Clique para liberar)"
                          }
                          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
                            c.player_can_edit
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                              : "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                          }`}
                        >
                          {c.player_can_edit ? (
                            <>
                              <Unlock className="h-3 w-3" />
                              Liberada
                            </>
                          ) : (
                            <>
                              <Lock className="h-3 w-3" />
                              Bloqueada
                            </>
                          )}
                        </button>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            c.player_can_edit
                              ? "bg-emerald-500/10 text-emerald-300"
                              : "bg-amber-500/10 text-amber-300"
                          }`}
                        >
                          {c.player_can_edit ? (
                            <>
                              <Unlock className="h-2.5 w-2.5" />
                              Editável
                            </>
                          ) : (
                            <>
                              <Lock className="h-2.5 w-2.5" />
                              Bloqueada
                            </>
                          )}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDelete(c)}
                        disabled={isPending}
                        title="Excluir ficha"
                        className="rounded-lg p-1 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenCharacter(c)}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-amber-500/50 hover:text-amber-300"
                  >
                    Abrir Ficha Completa
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
