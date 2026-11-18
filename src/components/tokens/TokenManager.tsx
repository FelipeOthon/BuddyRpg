"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  Crosshair,
  Flame,
  Heart,
  ImagePlus,
  Loader2,
  Plus,
  Skull,
  Sparkles,
  Swords,
  Trash2,
  User,
} from "lucide-react";
import { createTokenAction, deleteTokenAction } from "@/actions/tokens";
import type { CampaignMemberInfo } from "@/components/campaign/CampaignWorkspaceShell";
import {
  FORGOTTEN_REALMS_BESTIARY,
  type BestiaryCategory,
  type BestiaryEntry,
} from "@/lib/assets/bestiary";
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

  const [mode, setMode] = useState<"bestiary" | "custom">("bestiary");
  const [cat, setCat] = useState<BestiaryCategory>(
    isGm ? "monsters" : "heroes"
  );

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

  const computeNextSpawnPos = () =>
    snapToGrid(
      {
        x: scene.grid_size * (2 + (sceneTokens.length % 6)),
        y: scene.grid_size * (2 + Math.floor(sceneTokens.length / 6)),
      },
      scene.grid_size,
      scene.snap_to_grid
    );

  const handleSpawnBestiaryEntry = (entry: BestiaryEntry) => {
    setError(null);
    const spawnPos = computeNextSpawnPos();

    startTransition(async () => {
      const res = await createTokenAction({
        sceneId: scene.id,
        campaignId,
        name: entry.name,
        imageUrl: entry.avatarUrl,
        size: entry.size,
        hpCurrent: entry.hpMax,
        hpMax: entry.hpMax,
        ownerId: isGm ? ownerId : currentUserId,
        posX: spawnPos.x,
        posY: spawnPos.y,
      });

      if (!res.ok || !res.token) {
        setError(res.error ?? "Erro ao invocar token.");
        return;
      }

      upsertToken(res.token);
      setSelectedTokenId(res.token.id);
    });
  };

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

  const handleCreateCustomToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);

    const spawnPos = computeNextSpawnPos();

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

  const filteredBestiary = FORGOTTEN_REALMS_BESTIARY.filter(
    (b) => b.category === cat
  );

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Alternador: Catálogo Ilustrado vs Criar Customizado */}
      <div className="grid grid-cols-2 rounded-xl border border-amber-500/25 bg-zinc-950 p-1">
        <button
          type="button"
          onClick={() => setMode("bestiary")}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition ${
            mode === "bestiary"
              ? "bg-amber-500 text-zinc-950 shadow"
              : "text-zinc-400 hover:text-amber-200"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Bestiário &amp; Assets
        </button>
        <button
          type="button"
          onClick={() => setMode("custom")}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition ${
            mode === "custom"
              ? "bg-amber-500 text-zinc-950 shadow"
              : "text-zinc-400 hover:text-amber-200"
          }`}
        >
          <Plus className="h-3.5 w-3.5" />
          Token Customizado
        </button>
      </div>

      {/* MODO 1: BESTIÁRIO & GALERIA DE ASSETS EM 1 CLIQUE */}
      {mode === "bestiary" && (
        <div className="fr-card space-y-3 rounded-2xl p-3.5">
          <div className="grid grid-cols-3 gap-1 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
            <button
              type="button"
              onClick={() => setCat("heroes")}
              className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold transition ${
                cat === "heroes"
                  ? "bg-zinc-800 text-amber-300"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Swords className="h-3 w-3" />
              Heróis
            </button>
            <button
              type="button"
              onClick={() => setCat("monsters")}
              className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold transition ${
                cat === "monsters"
                  ? "bg-zinc-800 text-rose-300"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Skull className="h-3 w-3" />
              Monstros
            </button>
            <button
              type="button"
              onClick={() => setCat("spells_props")}
              className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold transition ${
                cat === "spells_props"
                  ? "bg-zinc-800 text-sky-300"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Flame className="h-3 w-3" />
              Magias/Props
            </button>
          </div>

          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {filteredBestiary.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-zinc-800/90 bg-zinc-950/85 p-2 transition hover:border-amber-500/40"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={entry.avatarUrl}
                    alt={entry.name}
                    className="h-10 w-10 shrink-0 rounded-full object-cover shadow"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-amber-100">
                      {entry.name}
                    </p>
                    <p className="truncate text-[10px] text-zinc-400">
                      {entry.subtitle}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleSpawnBestiaryEntry(entry)}
                  className="shrink-0 rounded-xl bg-amber-500 px-2.5 py-1.5 text-[11px] font-bold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-50"
                >
                  + Invocar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODO 2: FORMULÁRIO DE TOKEN CUSTOMIZADO */}
      {mode === "custom" && (
        <form
          onSubmit={handleCreateCustomToken}
          className="fr-card space-y-3 rounded-2xl p-3.5"
        >
          <h4 className="font-display text-xs font-bold uppercase tracking-wider text-amber-300">
            Criar Token em {scene.name}
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
              placeholder="Ex: Drizzt Do'Urden / Guarda de Waterdeep"
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
                  {imageUrl
                    ? "Avatar Pronto (Trocar)"
                    : "Enviar Avatar do PC (Max 2MB)"}
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
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Colocar Token no Tabuleiro
          </button>
        </form>
      )}

      {/* Lista de Tokens na Cena */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Tokens na Cena ({sceneTokens.length})
        </h4>
        {sceneTokens.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-800 p-4 text-center text-xs text-zinc-500">
            Nenhum token criado ainda (escolha um Herói ou Monstro acima para
            invocar no mapa!).
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
