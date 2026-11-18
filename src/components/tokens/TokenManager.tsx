"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  Crosshair,
  Heart,
  ImagePlus,
  Loader2,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import { createTokenAction, deleteTokenAction } from "@/actions/tokens";
import type { CampaignMemberInfo } from "@/components/campaign/CampaignWorkspaceShell";
import { snapToGrid } from "@/lib/board/geometry";
import { uploadCampaignImage } from "@/lib/utils/storage";
import { useBoardStore } from "@/stores/boardStore";
import type { CampaignRole, CharacterRow, Scene, Token } from "@/types/domain";

export default function TokenManager({
  campaignId,
  scene,
  currentUserId,
  role,
  members,
  characters = [],
}: {
  campaignId: string;
  scene: Scene;
  currentUserId: string;
  role: CampaignRole;
  members: CampaignMemberInfo[];
  characters?: CharacterRow[];
}) {
  const isGm = role === "gm";
  const {
    tokens,
    selectedTokenId,
    setSelectedTokenId,
    upsertToken,
    removeToken,
    viewport,
    setViewport,
  } = useBoardStore();

  const [name, setName] = useState("");
  const [size, setSize] = useState(1);
  const [hpCurrent, setHpCurrent] = useState(20);
  const [hpMax, setHpMax] = useState(20);
  const [ownerId, setOwnerId] = useState(currentUserId);
  const [characterId, setCharacterId] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sceneTokens = tokens.filter((t) => t.scene_id === scene.id);

  const handleAvatarUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);
    try {
      const uploaded = await uploadCampaignImage({
        bucket: "tokens",
        campaignId,
        file,
      });
      setImageUrl(uploaded.publicUrl);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro no upload do avatar."
      );
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleCreateToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);

    const spawnPos = snapToGrid(
      {
        x: scene.grid_size * (2 + (sceneTokens.length % 5)),
        y: scene.grid_size * (2 + Math.floor(sceneTokens.length / 5)),
      },
      scene.grid_size,
      scene.snap_to_grid
    );

    startTransition(async () => {
      const res = await createTokenAction({
        sceneId: scene.id,
        campaignId,
        name,
        imageUrl,
        size,
        hpCurrent,
        hpMax,
        ownerId: isGm ? ownerId : currentUserId,
        characterId: characterId || null,
        posX: spawnPos.x,
        posY: spawnPos.y,
      });

      if (!res.ok || !res.token) {
        setError(res.error ?? "Erro ao criar token.");
        return;
      }

      upsertToken(res.token);
      setSelectedTokenId(res.token.id);
      setName("");
      setImageUrl(null);
    });
  };

  const focusToken = (token: Token) => {
    setSelectedTokenId(token.id);
    setViewport({
      ...viewport,
      x: Math.round(350 - token.pos_x * viewport.scale),
      y: Math.round(280 - token.pos_y * viewport.scale),
    });
  };

  const handleDeleteToken = (token: Token) => {
    if (!isGm && token.owner_id !== currentUserId) return;
    if (!window.confirm(`Remover o token "${token.name}"?`)) return;

    removeToken(token.id);
    startTransition(async () => {
      const res = await deleteTokenAction({
        tokenId: token.id,
        campaignId,
      });
      if (!res.ok) {
        upsertToken(token);
        setError(res.error ?? "Erro ao remover token.");
      }
    });
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Formulário para Criar Novo Token */}
      <form
        onSubmit={handleCreateToken}
        className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3.5"
      >
        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
          Adicionar Token em {scene.name}
        </h4>

        <div>
          <label className="mb-1 block text-[11px] text-zinc-400">
            Nome do Token / Criatura
          </label>
          <input
            type="text"
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Guerreiro Thorin / Goblin Arqueiro"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-amber-500"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="mb-1 block text-[11px] text-zinc-400">
              Tamanho
            </label>
            <select
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-white"
            >
              <option value={1}>1x1 (Médio)</option>
              <option value={2}>2x2 (Grande)</option>
              <option value={3}>3x3 (Enorme)</option>
              <option value={4}>4x4 (Imenso)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-zinc-400">
              HP Atual
            </label>
            <input
              type="number"
              min={0}
              max={9999}
              value={hpCurrent}
              onChange={(e) => setHpCurrent(Number(e.target.value))}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-zinc-400">
              HP Máximo
            </label>
            <input
              type="number"
              min={1}
              max={9999}
              value={hpMax}
              onChange={(e) => {
                const v = Number(e.target.value);
                setHpMax(v);
                if (hpCurrent > v) setHpCurrent(v);
              }}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-white"
            />
          </div>
        </div>

        {characters.length > 0 && (
          <div>
            <label className="mb-1 block text-[11px] text-zinc-400">
              Vincular Ficha de Personagem (Opcional)
            </label>
            <select
              value={characterId}
              onChange={(e) => {
                const cid = e.target.value;
                setCharacterId(cid);
                const found = characters.find((c) => c.id === cid);
                if (found) {
                  if (!name.trim()) setName(found.name);
                  if (isGm && found.owner_id) setOwnerId(found.owner_id);
                }
              }}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-white"
            >
              <option value="">Sem ficha vinculada</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {isGm && (
          <div>
            <label className="mb-1 block text-[11px] text-zinc-400">
              Controlado por (Dono do Token)
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

        <div className="flex items-center gap-2">
          <label className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/70 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-amber-500 hover:text-amber-300">
            {isUploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <ImagePlus className="h-3.5 w-3.5 text-amber-400" />
                {imageUrl ? "Avatar Pronto (Trocar)" : "Avatar Opcional (Max 2MB)"}
              </>
            )}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleAvatarUpload}
              disabled={isUploading}
              className="hidden"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={isPending || isUploading}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          Colocar Token no Tabuleiro
        </button>
      </form>

      {/* Lista de Tokens na Cena */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Tokens na Cena ({sceneTokens.length})
        </h4>
        {sceneTokens.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-800 p-4 text-center text-xs text-zinc-500">
            Nenhum token criado ainda (o tabuleiro exibe um token de
            demonstração local até você criar o primeiro token).
          </p>
        ) : (
          <ul className="space-y-1.5">
            {sceneTokens.map((t) => {
              const owner = members.find((m) => m.userId === t.owner_id);
              const canEdit = isGm || t.owner_id === currentUserId;
              const isSelected = selectedTokenId === t.id;

              return (
                <li
                  key={t.id}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2 transition ${
                    isSelected
                      ? "border-amber-500/50 bg-amber-500/10"
                      : "border-zinc-800 bg-zinc-950/60"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => focusToken(t)}
                    className="flex flex-1 items-center gap-2.5 text-left"
                  >
                    <Crosshair
                      className={`h-3.5 w-3.5 ${
                        isSelected ? "text-amber-400" : "text-zinc-500"
                      }`}
                    />
                    <div>
                      <p className="text-xs font-semibold text-white">
                        {t.name}{" "}
                        <span className="text-[10px] text-zinc-400">
                          ({t.size}x{t.size})
                        </span>
                      </p>
                      <p className="flex items-center gap-2 text-[11px] text-zinc-400">
                        <span className="inline-flex items-center gap-0.5 text-rose-300">
                          <Heart className="h-2.5 w-2.5" />
                          {t.hp_current}/{t.hp_max}
                        </span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-0.5">
                          <User className="h-2.5 w-2.5" />
                          {owner?.username ?? "Mestre"}
                        </span>
                      </p>
                    </div>
                  </button>

                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleDeleteToken(t)}
                      className="rounded-lg p-1 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
                      title="Remover token"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
