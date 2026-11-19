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
  Pencil,
  Plus,
  RotateCcw,
  Save,
  ScrollText,
  Search,
  Skull,
  Sparkles,
  Swords,
  Trash2,
  User,
  X,
} from "lucide-react";
import { createSceneElementAction } from "@/actions/elements";
import {
  createTokenAction,
  deleteTokenAction,
  updateTokenStatsAction,
} from "@/actions/tokens";
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
import {
  createLinkedSheetForEntity,
  syncHpToLinkedCharacter,
} from "@/lib/board/sheetTokenSync";
import { uploadCampaignImage } from "@/lib/utils/storage";
import { normalizeSheetData } from "@/lib/validation/sheet";
import { useBoardStore } from "@/stores/boardStore";
import type { CampaignRole, CharacterRow, Scene, Token } from "@/types/domain";
import CatalogAvatarPicker from "./CatalogAvatarPicker";

interface StoredBestiaryState {
  overrides: Record<string, BestiaryEntry>;
  custom: BestiaryEntry[];
}

const DEFAULT_STORED_BESTIARY: StoredBestiaryState = {
  overrides: {},
  custom: [],
};

function readStoredBestiary(storageKey: string): StoredBestiaryState {
  if (typeof window === "undefined") return DEFAULT_STORED_BESTIARY;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return DEFAULT_STORED_BESTIARY;
    const parsed = JSON.parse(raw) as Partial<StoredBestiaryState>;
    return {
      overrides: parsed.overrides ?? {},
      custom: Array.isArray(parsed.custom) ? parsed.custom : [],
    };
  } catch {
    return DEFAULT_STORED_BESTIARY;
  }
}

export default function TokenManager({
  campaignId,
  scene,
  currentUserId,
  role,
  members,
  characters = [],
  onUpsertCharacter,
  onOpenCharacter,
}: {
  campaignId: string;
  scene: Scene;
  currentUserId: string;
  role: CampaignRole;
  members: CampaignMemberInfo[];
  characters?: CharacterRow[];
  onUpsertCharacter?: (char: CharacterRow) => void;
  onOpenCharacter?: (char: CharacterRow) => void;
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

  // Bestiário editável & customizado (persistido por campanha no navegador)
  const bestiaryStorageKey = `buddyrpg:bestiary:${campaignId}`;
  const [storedBestiary, setStoredBestiary] = useState<StoredBestiaryState>(
    () => readStoredBestiary(bestiaryStorageKey)
  );
  const [spawnWithSheet, setSpawnWithSheet] = useState(true);
  const [editingBestiary, setEditingBestiary] = useState<BestiaryEntry | null>(
    null
  );
  const [bestiaryAvatarPickerOpen, setBestiaryAvatarPickerOpen] =
    useState(false);

  // Formulário Customizado
  const [name, setName] = useState("");
  const [size, setSize] = useState(1);
  const [hpCurrent, setHpCurrent] = useState(20);
  const [hpMax, setHpMax] = useState(20);
  const [ownerId, setOwnerId] = useState(currentUserId);
  const [characterId, setCharacterId] = useState<string>("");
  const [createSheetOnCustom, setCreateSheetOnCustom] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [customAvatarPickerOpen, setCustomAvatarPickerOpen] = useState(false);

  // Edição inline de Tokens na Cena
  const [editingTokenId, setEditingTokenId] = useState<string | null>(null);
  const [editTokenName, setEditTokenName] = useState("");
  const [editTokenSize, setEditTokenSize] = useState<1 | 2 | 3 | 4>(1);
  const [editTokenHpCur, setEditTokenHpCur] = useState(20);
  const [editTokenHpMax, setEditTokenHpMax] = useState(20);
  const [editTokenVision, setEditTokenVision] = useState(4.5);
  const [editTokenOwnerId, setEditTokenOwnerId] = useState(currentUserId);
  const [editTokenCharId, setEditTokenCharId] = useState("");
  const [editTokenImageUrl, setEditTokenImageUrl] = useState<string | null>(
    null
  );
  const [editTokenAvatarPickerOpen, setEditTokenAvatarPickerOpen] =
    useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const persistBestiary = (next: StoredBestiaryState) => {
    setStoredBestiary(next);
    try {
      window.localStorage.setItem(bestiaryStorageKey, JSON.stringify(next));
    } catch {
      // ignora erro de quota
    }
  };

  const mergedBestiary = useMemo(() => {
    const builtins = FORGOTTEN_REALMS_BESTIARY.map(
      (entry) => storedBestiary.overrides[entry.id] ?? entry
    );
    return [...storedBestiary.custom, ...builtins];
  }, [storedBestiary]);

  const sceneTokens = tokens.filter((t) => t.scene_id === scene.id);

  const computeNextSpawnPos = () =>
    snapToGrid(
      {
        x: scene.grid_size * (2 + (sceneTokens.length % 6)),
        y: scene.grid_size * (2 + Math.floor(sceneTokens.length / 6)),
      },
      scene.grid_size,
      scene.snap_to_grid,
      scene.grid_offset_x ?? 0,
      scene.grid_offset_y ?? 0,
      scene.grid_type ?? "square"
    );

  const uploadAvatarFile = async (
    file: File,
    onDone: (url: string) => void
  ) => {
    setError(null);
    setIsUploading(true);
    try {
      const uploaded = await uploadCampaignImage({
        bucket: "tokens",
        campaignId,
        file,
      });
      onDone(uploaded.publicUrl);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro no upload do avatar."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleSpawnBestiaryEntry = (
    entry: BestiaryEntry,
    forceWithSheet?: boolean
  ) => {
    setError(null);
    const spawnPos = computeNextSpawnPos();
    const shouldCreateSheet =
      (forceWithSheet ?? spawnWithSheet) && entry.category !== "spells_props";

    startTransition(async () => {
      let linkedCharId: string | null = null;
      let createdChar: CharacterRow | undefined;

      if (shouldCreateSheet) {
        const sheetRes = await createLinkedSheetForEntity({
          campaignId,
          name: entry.name,
          ownerId: isGm ? ownerId : currentUserId,
          hpMax: entry.hpMax,
          hpCurrent: entry.hpMax,
          armorClass: entry.armorClass,
          classOrArchetype: entry.classOrArchetype,
          ancestryOrRace: entry.ancestryOrRace,
          speed: entry.speed,
          attacks: entry.attacks,
        });
        if (sheetRes.ok && sheetRes.character) {
          createdChar = sheetRes.character;
          linkedCharId = sheetRes.character.id;
          onUpsertCharacter?.(sheetRes.character);
        }
      }

      const res = await createTokenAction({
        sceneId: scene.id,
        campaignId,
        name: entry.name,
        imageUrl: entry.avatarUrl,
        size: entry.size,
        hpCurrent: entry.hpMax,
        hpMax: entry.hpMax,
        ownerId: isGm ? ownerId : currentUserId,
        characterId: linkedCharId,
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
      if (forceWithSheet && createdChar) {
        onOpenCharacter?.(createdChar);
      }
    });
  };

  const handleSaveBestiaryEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBestiary || !editingBestiary.name.trim()) return;

    const cleanEntry: BestiaryEntry = {
      ...editingBestiary,
      name: editingBestiary.name.trim(),
      subtitle:
        editingBestiary.subtitle.trim() ||
        `CA ${editingBestiary.armorClass} · ${editingBestiary.hpMax} PV`,
    };

    const isBuiltin = FORGOTTEN_REALMS_BESTIARY.some(
      (b) => b.id === cleanEntry.id
    );
    if (isBuiltin) {
      persistBestiary({
        ...storedBestiary,
        overrides: {
          ...storedBestiary.overrides,
          [cleanEntry.id]: cleanEntry,
        },
      });
    } else {
      const exists = storedBestiary.custom.some((c) => c.id === cleanEntry.id);
      persistBestiary({
        ...storedBestiary,
        custom: exists
          ? storedBestiary.custom.map((c) =>
              c.id === cleanEntry.id ? cleanEntry : c
            )
          : [{ ...cleanEntry, isCustom: true }, ...storedBestiary.custom],
      });
    }

    setCat(cleanEntry.category);
    setEditingBestiary(null);
    setBestiaryAvatarPickerOpen(false);
  };

  const handleCreateCustomToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);

    const spawnPos = computeNextSpawnPos();

    startTransition(async () => {
      let linkedCharId = characterId || null;

      if (!linkedCharId && createSheetOnCustom) {
        const sheetRes = await createLinkedSheetForEntity({
          campaignId,
          name: name.trim(),
          ownerId: isGm ? ownerId : currentUserId,
          hpMax,
          hpCurrent,
        });
        if (sheetRes.ok && sheetRes.character) {
          linkedCharId = sheetRes.character.id;
          onUpsertCharacter?.(sheetRes.character);
        }
      }

      const res = await createTokenAction({
        sceneId: scene.id,
        campaignId,
        name,
        imageUrl,
        size,
        hpCurrent,
        hpMax,
        ownerId: isGm ? ownerId : currentUserId,
        characterId: linkedCharId,
        posX: spawnPos.x,
        posY: spawnPos.y,
        visionRange:
          linkedCharId || !isGm || ownerId !== currentUserId ? 4.5 : 0,
      });

      if (!res.ok || !res.token) {
        setError(res.error ?? "Erro ao criar token.");
        return;
      }

      upsertToken(res.token);
      setSelectedTokenId(res.token.id);
      setName("");
      setImageUrl(null);
      setCustomAvatarPickerOpen(false);
    });
  };

  const openTokenEditor = (t: Token) => {
    setEditingTokenId(t.id);
    setEditTokenName(t.name);
    setEditTokenSize(
      Math.min(Math.max(t.size || 1, 1), 4) as 1 | 2 | 3 | 4
    );
    setEditTokenHpCur(t.hp_current);
    setEditTokenHpMax(t.hp_max);
    setEditTokenVision(t.vision_range ?? 4.5);
    setEditTokenOwnerId(t.owner_id ?? currentUserId);
    setEditTokenCharId(t.character_id ?? "");
    setEditTokenImageUrl(t.image_url);
    setEditTokenAvatarPickerOpen(false);
  };

  const handleSaveTokenEdits = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTokenId || !editTokenName.trim()) return;
    setError(null);
    const target = tokens.find((x) => x.id === editingTokenId);
    if (!target) return;

    const cleanMax = Math.max(1, editTokenHpMax);
    const cleanCur = Math.min(Math.max(0, editTokenHpCur), cleanMax);

    startTransition(async () => {
      const res = await updateTokenStatsAction({
        tokenId: target.id,
        campaignId,
        name: editTokenName.trim(),
        imageUrl: editTokenImageUrl,
        size: editTokenSize,
        hpMax: cleanMax,
        hpCurrent: cleanCur,
        visionRange: editTokenVision,
        ...(isGm ? { ownerId: editTokenOwnerId } : {}),
        characterId: editTokenCharId || null,
      });

      if (!res.ok || !res.token) {
        setError(res.error ?? "Não foi possível salvar o token.");
        return;
      }

      upsertToken(res.token);

      if (editTokenCharId) {
        const linked = characters.find((c) => c.id === editTokenCharId);
        if (linked) {
          const syncedChar = await syncHpToLinkedCharacter({
            character: linked,
            campaignId,
            hpCurrent: cleanCur,
            hpMax: cleanMax,
          });
          if (syncedChar) onUpsertCharacter?.(syncedChar);
        }
      }

      setEditingTokenId(null);
      setEditTokenAvatarPickerOpen(false);
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
    if (editingTokenId === token.id) setEditingTokenId(null);
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

  const filteredBestiary = mergedBestiary.filter((b) => b.category === cat);

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

      {/* MODO 1: BESTIÁRIO EDITÁVEL + FICHAS + AVATARES CORRESPONDENTES */}
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

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-2.5 py-1.5 text-[11px]">
            <label
              className="flex cursor-pointer items-center gap-1.5 text-zinc-200"
              title="Cria e vincula automaticamente uma ficha de personagem com CA, PV e ataque ao invocar"
            >
              <input
                type="checkbox"
                checked={spawnWithSheet}
                onChange={(e) => setSpawnWithSheet(e.target.checked)}
                className="accent-amber-500"
              />
              <ScrollText className="h-3.5 w-3.5 text-amber-400" />
              <span>Criar Ficha ao Invocar</span>
            </label>

            <button
              type="button"
              onClick={() => {
                setBestiaryAvatarPickerOpen(false);
                setEditingBestiary({
                  id: `custom-${Date.now()}`,
                  category: cat,
                  name: "",
                  subtitle: "",
                  size: 1,
                  hpMax: cat === "heroes" ? 28 : 22,
                  armorClass: 14,
                  avatarUrl:
                    cat === "heroes"
                      ? "/icons/humans/humans-male/contemplative-warrior-in-forest.png"
                      : "/icons/goblins-goblinoids/goblin-1.png",
                  classOrArchetype: cat === "heroes" ? "Aventureiro" : "Monstro",
                  ancestryOrRace: cat === "heroes" ? "Humano" : "Criatura",
                  speed: "9m",
                  isCustom: true,
                });
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2 py-1 text-[10px] font-bold text-amber-200 hover:bg-amber-500/25"
            >
              <Plus className="h-3 w-3" />
              Criar no Bestiário
            </button>
          </div>

          {editingBestiary && (
            <form
              onSubmit={handleSaveBestiaryEntry}
              className="space-y-2 rounded-xl border border-amber-500/40 bg-zinc-950/90 p-2.5 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-300">
                  {FORGOTTEN_REALMS_BESTIARY.some(
                    (b) => b.id === editingBestiary.id
                  )
                    ? "Editar Entrada do Bestiário"
                    : "Nova Criatura / Herói no Bestiário"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingBestiary(null);
                    setBestiaryAvatarPickerOpen(false);
                  }}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={editingBestiary.avatarUrl}
                  alt="Avatar"
                  className="h-12 w-12 shrink-0 rounded-full border border-amber-500/50 object-cover"
                />
                <div className="flex flex-1 flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setBestiaryAvatarPickerOpen((v) => !v)
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2 py-1 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/25"
                  >
                    <Library className="h-3 w-3" />
                    Pacote ({ICON_CATALOG_TOTAL})
                  </button>
                  <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-200 hover:border-amber-500/40">
                    <ImagePlus className="h-3 w-3 text-amber-400" />
                    Enviar PNG
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={(ev) => {
                        const file = ev.target.files?.[0];
                        ev.target.value = "";
                        if (!file) return;
                        void uploadAvatarFile(file, (url) =>
                          setEditingBestiary((prev) =>
                            prev ? { ...prev, avatarUrl: url } : null
                          )
                        );
                      }}
                    />
                  </label>
                </div>
              </div>

              {bestiaryAvatarPickerOpen && (
                <CatalogAvatarPicker
                  onSelect={(item) => {
                    setEditingBestiary((prev) =>
                      prev
                        ? {
                            ...prev,
                            avatarUrl: item.url,
                            name: prev.name || item.name,
                          }
                        : null
                    );
                    setBestiaryAvatarPickerOpen(false);
                  }}
                  onClose={() => setBestiaryAvatarPickerOpen(false)}
                />
              )}

              <div className="grid grid-cols-2 gap-1.5">
                <select
                  value={editingBestiary.category}
                  onChange={(e) =>
                    setEditingBestiary({
                      ...editingBestiary,
                      category: e.target.value as BestiaryCategory,
                    })
                  }
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-white"
                >
                  <option value="heroes">Herói</option>
                  <option value="monsters">Monstro</option>
                  <option value="spells_props">Magia / Prop</option>
                </select>
                <select
                  value={editingBestiary.size}
                  onChange={(e) =>
                    setEditingBestiary({
                      ...editingBestiary,
                      size: Number(e.target.value) as 1 | 2 | 3 | 4,
                    })
                  }
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-white"
                >
                  <option value={1}>1x1 (Médio)</option>
                  <option value={2}>2x2 (Grande)</option>
                  <option value={3}>3x3 (Imenso)</option>
                  <option value={4}>4x4 (Colossal)</option>
                </select>
              </div>

              <input
                type="text"
                required
                placeholder="Nome (ex: Dragão Negro / Elara Paladina)"
                value={editingBestiary.name}
                onChange={(e) =>
                  setEditingBestiary({
                    ...editingBestiary,
                    name: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-[11px] text-white"
              />

              <input
                type="text"
                placeholder="Subtítulo (ex: ND 5 · Morto-Vivo · Sopro)"
                value={editingBestiary.subtitle}
                onChange={(e) =>
                  setEditingBestiary({
                    ...editingBestiary,
                    subtitle: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-[11px] text-white"
              />

              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <label className="block text-[10px] text-zinc-400">
                    PV Máx
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={9999}
                    value={editingBestiary.hpMax}
                    onChange={(e) =>
                      setEditingBestiary({
                        ...editingBestiary,
                        hpMax: Math.max(1, Number(e.target.value)),
                      })
                    }
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-400">CA</label>
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={editingBestiary.armorClass}
                    onChange={(e) =>
                      setEditingBestiary({
                        ...editingBestiary,
                        armorClass: Math.max(1, Number(e.target.value)),
                      })
                    }
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-400">
                    Desl.
                  </label>
                  <input
                    type="text"
                    value={editingBestiary.speed ?? "9m"}
                    onChange={(e) =>
                      setEditingBestiary({
                        ...editingBestiary,
                        speed: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-1.5 pt-1">
                <button
                  type="submit"
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-amber-500 py-1.5 text-[11px] font-bold text-zinc-950 hover:bg-amber-400"
                >
                  <Save className="h-3.5 w-3.5" />
                  Salvar no Bestiário
                </button>
                {storedBestiary.overrides[editingBestiary.id] && (
                  <button
                    type="button"
                    title="Restaurar padrão original"
                    onClick={() => {
                      const nextOv = { ...storedBestiary.overrides };
                      delete nextOv[editingBestiary.id];
                      persistBestiary({ ...storedBestiary, overrides: nextOv });
                      setEditingBestiary(null);
                    }}
                    className="rounded-lg border border-zinc-700 bg-zinc-900 p-1.5 text-zinc-300 hover:text-amber-200"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
                {editingBestiary.isCustom &&
                  storedBestiary.custom.some(
                    (c) => c.id === editingBestiary.id
                  ) && (
                    <button
                      type="button"
                      title="Excluir do Bestiário"
                      onClick={() => {
                        persistBestiary({
                          ...storedBestiary,
                          custom: storedBestiary.custom.filter(
                            (c) => c.id !== editingBestiary.id
                          ),
                        });
                        setEditingBestiary(null);
                      }}
                      className="rounded-lg border border-rose-500/30 bg-rose-500/15 p-1.5 text-rose-300 hover:bg-rose-500/25"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
              </div>
            </form>
          )}

          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {filteredBestiary.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-1.5 rounded-xl border border-zinc-800/90 bg-zinc-950/85 p-2 transition hover:border-amber-500/40"
              >
                <div className="flex min-w-0 items-center gap-2">
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

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    title="Editar avatar, PV, CA ou nome no Bestiário"
                    onClick={() => {
                      setBestiaryAvatarPickerOpen(false);
                      setEditingBestiary(entry);
                    }}
                    className="rounded-lg border border-zinc-700 bg-zinc-900 p-1.5 text-zinc-300 hover:border-amber-500/40 hover:text-amber-200"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  {entry.category !== "spells_props" && (
                    <button
                      type="button"
                      disabled={isPending}
                      title="Invocar token já criando e abrindo uma Ficha vinculada"
                      onClick={() => handleSpawnBestiaryEntry(entry, true)}
                      className="rounded-lg border border-amber-500/40 bg-amber-500/15 p-1.5 text-amber-200 hover:bg-amber-500/25 disabled:opacity-50"
                    >
                      <ScrollText className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleSpawnBestiaryEntry(entry)}
                    className="rounded-xl bg-amber-500 px-2.5 py-1.5 text-[11px] font-bold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-50"
                  >
                    + Invocar
                  </button>
                </div>
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

          <div>
            <label className="mb-1 block text-[11px] text-zinc-400">
              Vincular Ficha de Personagem
            </label>
            <select
              value={characterId}
              onChange={(e) => {
                const cid = e.target.value;
                setCharacterId(cid);
                const found = characters.find((c) => c.id === cid);
                if (found) {
                  if (!name.trim()) setName(found.name);
                  const sh = normalizeSheetData(found.sheet_data);
                  setHpMax(sh.hpMax ?? 20);
                  setHpCurrent(sh.hpCurrent ?? sh.hpMax ?? 20);
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
            {!characterId && (
              <label className="mt-1.5 flex cursor-pointer items-center gap-1.5 text-[11px] text-zinc-300">
                <input
                  type="checkbox"
                  checked={createSheetOnCustom}
                  onChange={(e) => setCreateSheetOnCustom(e.target.checked)}
                  className="accent-amber-500"
                />
                <span>Criar automaticamente uma Ficha nova para este Token</span>
              </label>
            )}
          </div>

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
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt="Preview avatar"
                className="h-9 w-9 shrink-0 rounded-full border border-amber-500/40 object-cover"
              />
            )}
            <button
              type="button"
              onClick={() => setCustomAvatarPickerOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-xl border border-amber-500/40 bg-amber-500/15 px-2.5 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/25"
            >
              <Library className="h-3.5 w-3.5" />
              Pacote
            </button>
            <label className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/70 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-amber-500 hover:text-amber-300">
              {isUploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <ImagePlus className="h-3.5 w-3.5 text-amber-400" />
                  {imageUrl ? "Trocar PNG" : "Upload PC"}
                </>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(ev) => {
                  const file = ev.target.files?.[0];
                  ev.target.value = "";
                  if (file) {
                    void uploadAvatarFile(file, (url) => setImageUrl(url));
                  }
                }}
                disabled={isUploading}
                className="hidden"
              />
            </label>
          </div>

          {customAvatarPickerOpen && (
            <CatalogAvatarPicker
              onSelect={(item) => {
                setImageUrl(item.url);
                if (!name.trim()) setName(item.name);
                setCustomAvatarPickerOpen(false);
              }}
              onClose={() => setCustomAvatarPickerOpen(false)}
            />
          )}

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

      {/* Lista de Tokens na Cena + Edição completa & Sinergia com Ficha */}
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
          <ul className="space-y-2">
            {sceneTokens.map((t) => {
              const owner = members.find((m) => m.userId === t.owner_id);
              const linkedChar = t.character_id
                ? characters.find((c) => c.id === t.character_id)
                : undefined;
              const canEdit =
                isGm ||
                t.owner_id === currentUserId ||
                linkedChar?.owner_id === currentUserId;
              const isSelected = selectedTokenId === t.id;
              const isEditingThis = editingTokenId === t.id;

              return (
                <li
                  key={t.id}
                  className={`rounded-xl border p-2.5 transition ${
                    isSelected || isEditingThis
                      ? "border-amber-500/50 bg-amber-500/10"
                      : "border-zinc-800 bg-zinc-950/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => focusToken(t)}
                      className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                    >
                      {t.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={t.image_url}
                          alt={t.name}
                          className="h-9 w-9 shrink-0 rounded-full border border-zinc-700 object-cover"
                        />
                      ) : (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-500/40 bg-zinc-800 text-xs font-bold text-amber-200">
                          {t.name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1 truncate text-xs font-semibold text-white">
                          <Crosshair
                            className={`h-3 w-3 shrink-0 ${
                              isSelected ? "text-amber-400" : "text-zinc-500"
                            }`}
                          />
                          <span className="truncate">{t.name}</span>
                          <span className="shrink-0 text-[10px] text-zinc-400">
                            ({t.size}x{t.size})
                          </span>
                        </p>
                        <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400">
                          <span className="inline-flex items-center gap-0.5 text-rose-300">
                            <Heart className="h-2.5 w-2.5" />
                            {t.hp_current}/{t.hp_max}
                          </span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-0.5">
                            <User className="h-2.5 w-2.5" />
                            {owner?.username ?? "Mestre"}
                          </span>
                          {linkedChar && (
                            <span className="rounded bg-amber-500/15 px-1 text-[10px] text-amber-300">
                              📜 Ficha
                            </span>
                          )}
                        </p>
                      </div>
                    </button>

                    <div className="flex shrink-0 items-center gap-1">
                      {linkedChar && onOpenCharacter && (
                        <button
                          type="button"
                          onClick={() => onOpenCharacter(linkedChar)}
                          className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-1.5 text-amber-300 hover:bg-amber-500/20"
                          title={`Abrir ficha de ${linkedChar.name}`}
                        >
                          <ScrollText className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canEdit && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              isEditingThis
                                ? setEditingTokenId(null)
                                : openTokenEditor(t)
                            }
                            className={`rounded-lg border p-1.5 transition ${
                              isEditingThis
                                ? "border-amber-400 bg-amber-500 text-zinc-950"
                                : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-amber-500/40 hover:text-amber-200"
                            }`}
                            title="Editar nome, avatar, HP, tamanho e ficha deste token"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteToken(t)}
                            className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
                            title="Remover token"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Painel de Edição Completa do Token Selecionado */}
                  {isEditingThis && canEdit && (
                    <form
                      onSubmit={handleSaveTokenEdits}
                      className="mt-2.5 space-y-2 border-t border-zinc-800/80 pt-2.5 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {editTokenImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={editTokenImageUrl}
                            alt={editTokenName}
                            className="h-10 w-10 shrink-0 rounded-full border border-amber-500/40 object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-xs font-bold text-amber-300">
                            {editTokenName.slice(0, 1).toUpperCase() || "?"}
                          </div>
                        )}
                        <div className="flex flex-1 flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setEditTokenAvatarPickerOpen((v) => !v)
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2 py-1 text-[10px] font-semibold text-amber-200"
                          >
                            <Library className="h-3 w-3" />
                            Pacote
                          </button>
                          <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-200 hover:border-amber-500/40">
                            <ImagePlus className="h-3 w-3 text-amber-400" />
                            Upload
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/gif"
                              className="hidden"
                              onChange={(ev) => {
                                const file = ev.target.files?.[0];
                                ev.target.value = "";
                                if (file) {
                                  void uploadAvatarFile(file, (url) =>
                                    setEditTokenImageUrl(url)
                                  );
                                }
                              }}
                            />
                          </label>
                          {editTokenImageUrl && (
                            <button
                              type="button"
                              onClick={() => setEditTokenImageUrl(null)}
                              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-400 hover:text-rose-300"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                      </div>

                      {editTokenAvatarPickerOpen && (
                        <CatalogAvatarPicker
                          onSelect={(item) => {
                            setEditTokenImageUrl(item.url);
                            setEditTokenAvatarPickerOpen(false);
                          }}
                          onClose={() => setEditTokenAvatarPickerOpen(false)}
                        />
                      )}

                      <input
                        type="text"
                        required
                        value={editTokenName}
                        onChange={(e) => setEditTokenName(e.target.value)}
                        placeholder="Nome do Token"
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-[11px] text-white"
                      />

                      <div className="grid grid-cols-4 gap-1.5">
                        <div>
                          <label className="block text-[10px] text-zinc-400">
                            Tam
                          </label>
                          <select
                            value={editTokenSize}
                            onChange={(e) =>
                              setEditTokenSize(
                                Number(e.target.value) as 1 | 2 | 3 | 4
                              )
                            }
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-1.5 py-1 text-[11px] text-white"
                          >
                            <option value={1}>1x1</option>
                            <option value={2}>2x2</option>
                            <option value={3}>3x3</option>
                            <option value={4}>4x4</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-zinc-400">
                            PV
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={9999}
                            value={editTokenHpCur}
                            onChange={(e) =>
                              setEditTokenHpCur(Number(e.target.value))
                            }
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-zinc-400">
                            Máx
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={9999}
                            value={editTokenHpMax}
                            onChange={(e) =>
                              setEditTokenHpMax(Number(e.target.value))
                            }
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-zinc-400">
                            Visão(m)
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            min={0}
                            max={120}
                            value={editTokenVision}
                            onChange={(e) =>
                              setEditTokenVision(Number(e.target.value))
                            }
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-1.5 py-1 text-[11px] text-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] text-zinc-400">
                          Ficha Vinculada
                        </label>
                        <div className="flex items-center gap-1.5">
                          <select
                            value={editTokenCharId}
                            onChange={(e) => {
                              const cid = e.target.value;
                              setEditTokenCharId(cid);
                              const found = characters.find(
                                (c) => c.id === cid
                              );
                              if (found) {
                                const sh = normalizeSheetData(found.sheet_data);
                                setEditTokenHpMax(sh.hpMax ?? editTokenHpMax);
                                setEditTokenHpCur(
                                  sh.hpCurrent ?? sh.hpMax ?? editTokenHpCur
                                );
                              }
                            }}
                            className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-white"
                          >
                            <option value="">Sem ficha vinculada</option>
                            {characters.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                          {!editTokenCharId && (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => {
                                startTransition(async () => {
                                  const res =
                                    await createLinkedSheetForEntity({
                                      campaignId,
                                      name: editTokenName.trim() || t.name,
                                      ownerId: editTokenOwnerId,
                                      hpMax: editTokenHpMax,
                                      hpCurrent: editTokenHpCur,
                                    });
                                  if (res.ok && res.character) {
                                    onUpsertCharacter?.(res.character);
                                    setEditTokenCharId(res.character.id);
                                  }
                                });
                              }}
                              className="shrink-0 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2 py-1 text-[10px] font-semibold text-amber-200 hover:bg-amber-500/25"
                            >
                              + Ficha
                            </button>
                          )}
                        </div>
                      </div>

                      {isGm && (
                        <div>
                          <label className="block text-[10px] text-zinc-400">
                            Dono / Jogador
                          </label>
                          <select
                            value={editTokenOwnerId}
                            onChange={(e) =>
                              setEditTokenOwnerId(e.target.value)
                            }
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-white"
                          >
                            {members.map((m) => (
                              <option key={m.userId} value={m.userId}>
                                {m.username} (
                                {m.role === "gm" ? "Mestre" : "Jogador"})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          type="submit"
                          disabled={isPending || isUploading}
                          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-amber-500 py-1.5 text-[11px] font-bold text-zinc-950 hover:bg-amber-400 disabled:opacity-60"
                        >
                          <Save className="h-3.5 w-3.5" />
                          Salvar Token
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTokenId(null)}
                          className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-[11px] text-zinc-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
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
