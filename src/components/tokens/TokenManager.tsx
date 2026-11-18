"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Flame,
  Heart,
  ImagePlus,
  Library,
  Loader2,
  Plus,
  Search,
  Skull,
  Sparkles,
  Swords,
  Trash2,
  User,
} from "lucide-react";
import { createSceneElementAction } from "@/actions/elements";
import { createTokenAction, deleteTokenAction } from "@/actions/tokens";
import type { CampaignMemberInfo } from "@/components/campaign/CampaignWorkspaceShell";
import {
  FORGOTTEN_REALMS_BESTIARY,
  type BestiaryCategory,
  type BestiaryEntry,
} from "@/lib/assets/bestiary";
import {
  ICON_CATALOG_TOTAL,
  ICON_CATEGORIES,
  ICON_ITEMS,
  type IconCatalogItem,
} from "@/lib/assets/iconCatalog";
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
    setSelectedElementId,
    upsertToken,
    upsertElement,
    removeToken,
    viewport,
    setViewport,
  } = useBoardStore();

  const [mode, setMode] = useState<"library" | "bestiary" | "custom">("library");
  const [cat, setCat] = useState<BestiaryCategory>(
    isGm ? "monsters" : "heroes"
  );
  const [iconCategory, setIconCategory] = useState<string>("all");
  const [iconQuery, setIconQuery] = useState("");
  const [iconPage, setIconPage] = useState(0);
  const [iconSize, setIconSize] = useState<1 | 2 | 3 | 4>(1);
  const [iconOpensFog, setIconOpensFog] = useState(!isGm);
  const [iconSpawnAsProp, setIconSpawnAsProp] = useState(false);

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
        visionRange: entry.category === "heroes" ? 4.5 : 0,
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
        visionRange:
          characterId || !isGm || ownerId !== currentUserId ? 4.5 : 0,
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

  const ICONS_PER_PAGE = 24;
  const filteredIcons = useMemo(() => {
    const q = iconQuery.trim().toLowerCase();
    return ICON_ITEMS.filter((item) => {
      if (iconCategory !== "all" && item.categoryId !== iconCategory) {
        return false;
      }
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.categoryId.includes(q) ||
        (item.sub && item.sub.toLowerCase().includes(q))
      );
    });
  }, [iconCategory, iconQuery]);

  const totalIconPages = Math.max(
    Math.ceil(filteredIcons.length / ICONS_PER_PAGE),
    1
  );
  const safeIconPage = Math.min(iconPage, totalIconPages - 1);
  const pagedIcons = filteredIcons.slice(
    safeIconPage * ICONS_PER_PAGE,
    (safeIconPage + 1) * ICONS_PER_PAGE
  );

  const handleSpawnCatalogItem = (item: IconCatalogItem) => {
    setError(null);
    const spawnPos = computeNextSpawnPos();

    if (isGm && iconSpawnAsProp) {
      const px = scene.grid_size * iconSize;
      startTransition(async () => {
        const res = await createSceneElementAction({
          sceneId: scene.id,
          campaignId,
          layer: "prop",
          kind: "image",
          x: spawnPos.x,
          y: spawnPos.y,
          data: {
            imageUrl: item.url,
            width: px,
            height: px,
            opacity: 1,
            label: item.name.slice(0, 80),
          },
        });
        if (!res.ok || !res.element) {
          setError(res.error ?? "Erro ao colocar peça no mapa.");
          return;
        }
        upsertElement(res.element);
        setSelectedElementId(res.element.id);
      });
      return;
    }

    startTransition(async () => {
      const res = await createTokenAction({
        sceneId: scene.id,
        campaignId,
        name: item.name.slice(0, 80),
        imageUrl: item.url,
        size: iconSize,
        hpCurrent: 20,
        hpMax: 20,
        ownerId: isGm ? ownerId : currentUserId,
        posX: spawnPos.x,
        posY: spawnPos.y,
        visionRange: iconOpensFog || !isGm ? 4.5 : 0,
      });
      if (!res.ok || !res.token) {
        setError(res.error ?? "Erro ao invocar token.");
        return;
      }
      upsertToken(res.token);
      setSelectedTokenId(res.token.id);
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

      {/* Alternador: Pacote (1.924) vs Bestiário vs Customizado */}
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-amber-500/25 bg-zinc-950 p-1">
        <button
          type="button"
          onClick={() => setMode("library")}
          className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold transition ${
            mode === "library"
              ? "bg-amber-500 text-zinc-950 shadow"
              : "text-zinc-400 hover:text-amber-200"
          }`}
        >
          <Library className="h-3.5 w-3.5" />
          Pacote ({ICON_CATALOG_TOTAL})
        </button>
        <button
          type="button"
          onClick={() => setMode("bestiary")}
          className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold transition ${
            mode === "bestiary"
              ? "bg-amber-500 text-zinc-950 shadow"
              : "text-zinc-400 hover:text-amber-200"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Bestiário
        </button>
        <button
          type="button"
          onClick={() => setMode("custom")}
          className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold transition ${
            mode === "custom"
              ? "bg-amber-500 text-zinc-950 shadow"
              : "text-zinc-400 hover:text-amber-200"
          }`}
        >
          <Plus className="h-3.5 w-3.5" />
          Customizado
        </button>
      </div>

      {/* MODO 0: BIBLIOTECA COMPLETA (1.924 ÍCONES) */}
      {mode === "library" && (
        <div className="fr-card space-y-2.5 rounded-2xl p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <input
              type="search"
              value={iconQuery}
              onChange={(e) => {
                setIconQuery(e.target.value);
                setIconPage(0);
              }}
              placeholder="Buscar (ex: dragon, goblin, elf, paladin)..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-1.5 pr-3 pl-8 text-xs text-white placeholder-zinc-500 outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={iconCategory}
            onChange={(e) => {
              setIconCategory(e.target.value);
              setIconPage(0);
            }}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-amber-500"
          >
            <option value="all">
              Todas as categorias ({ICON_CATALOG_TOTAL})
            </option>
            {ICON_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} ({c.count})
              </option>
            ))}
          </select>

          <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-xl border border-zinc-800/80 bg-zinc-950/70 px-2.5 py-1.5 text-[11px]">
            <label className="flex items-center gap-1 text-zinc-300">
              <span>Tam:</span>
              <select
                value={iconSize}
                onChange={(e) =>
                  setIconSize(Number(e.target.value) as 1 | 2 | 3 | 4)
                }
                className="rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-[11px] text-amber-200"
              >
                <option value={1}>1x1</option>
                <option value={2}>2x2</option>
                <option value={3}>3x3</option>
                <option value={4}>4x4</option>
              </select>
            </label>

            <label
              className="flex cursor-pointer items-center gap-1 text-zinc-300"
              title="Se marcado, este token abre a névoa ao andar"
            >
              <input
                type="checkbox"
                checked={iconOpensFog}
                onChange={(e) => setIconOpensFog(e.target.checked)}
                className="accent-sky-400"
              />
              <span>Abre Névoa</span>
            </label>

            {isGm && (
              <label
                className="flex cursor-pointer items-center gap-1 text-zinc-300"
                title="Colocar como peça/prop no grid ao invés de token"
              >
                <input
                  type="checkbox"
                  checked={iconSpawnAsProp}
                  onChange={(e) => setIconSpawnAsProp(e.target.checked)}
                  className="accent-amber-400"
                />
                <span>Como Peça</span>
              </label>
            )}
          </div>

          <div className="grid max-h-72 grid-cols-3 gap-1.5 overflow-y-auto pr-0.5">
            {pagedIcons.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={isPending}
                onClick={() => handleSpawnCatalogItem(item)}
                title={`Clique para colocar "${item.name}" no mapa`}
                className="group flex flex-col items-center rounded-xl border border-zinc-800/90 bg-zinc-950/80 p-1.5 text-center transition hover:border-amber-500/60 hover:bg-zinc-900 disabled:opacity-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt={item.name}
                  loading="lazy"
                  className="h-14 w-14 rounded-lg object-contain transition-transform group-hover:scale-105"
                />
                <span className="mt-1 line-clamp-2 w-full text-[10px] leading-tight font-medium text-zinc-200 group-hover:text-amber-200">
                  {item.name}
                </span>
              </button>
            ))}
            {pagedIcons.length === 0 && (
              <div className="col-span-3 py-6 text-center text-xs text-zinc-500">
                Nenhum ícone encontrado para &ldquo;{iconQuery}&rdquo;.
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-400">
            <button
              type="button"
              disabled={safeIconPage === 0}
              onClick={() => setIconPage((p) => Math.max(0, p - 1))}
              className="inline-flex items-center gap-0.5 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 hover:border-zinc-700 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Ant.
            </button>
            <span>
              Pág. {safeIconPage + 1} / {totalIconPages} ({filteredIcons.length})
            </span>
            <button
              type="button"
              disabled={safeIconPage >= totalIconPages - 1}
              onClick={() =>
                setIconPage((p) => Math.min(totalIconPages - 1, p + 1))
              }
              className="inline-flex items-center gap-0.5 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 hover:border-zinc-700 disabled:opacity-40"
            >
              Próx.
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

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
