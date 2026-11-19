"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  Eye,
  EyeOff,
  Flame,
  Heart,
  ImagePlus,
  Library,
  Loader2,
  Lock,
  Minus,
  Pencil,
  Plus,
  Save,
  ScrollText,
  Sparkles,
  Trash2,
  Unlock,
  X,
} from "lucide-react";
import {
  createTokenAction,
  deleteTokenAction,
  updateTokenStatsAction,
} from "@/actions/tokens";
import type { CampaignMemberInfo } from "@/components/campaign/CampaignWorkspaceShell";
import {
  createLinkedSheetForEntity,
  syncHpToLinkedCharacter,
} from "@/lib/board/sheetTokenSync";
import { uploadCampaignImage } from "@/lib/utils/storage";
import { normalizeSheetData } from "@/lib/validation/sheet";
import { useBoardStore } from "@/stores/boardStore";
import type {
  CampaignRole,
  CharacterRow,
  FxBurstPreset,
  Token,
} from "@/types/domain";
import CatalogAvatarPicker from "./CatalogAvatarPicker";

const RING_COLORS = [
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#38bdf8",
  "#a855f7",
  "#ec4899",
] as const;

const QUICK_CONDITIONS = [
  "Caído",
  "Envenenado",
  "Atordoado",
  "Concentrando",
  "Invisível",
  "Morto",
] as const;

export default function SelectedTokenHud({
  campaignId,
  sceneId,
  currentUserId,
  role,
  characters = [],
  members = [],
  onOpenCharacter,
  onUpsertCharacter,
  onFxBurst,
  onError,
}: {
  campaignId: string;
  sceneId: string;
  currentUserId: string;
  role: CampaignRole;
  characters?: CharacterRow[];
  members?: CampaignMemberInfo[];
  onOpenCharacter?: (char: CharacterRow) => void;
  onUpsertCharacter?: (char: CharacterRow) => void;
  onFxBurst?: (x: number, y: number, preset: FxBurstPreset, radius?: number) => void;
  onError?: (msg: string) => void;
}) {
  const {
    tokens,
    selectedTokenId,
    setSelectedTokenId,
    upsertToken,
    removeToken,
  } = useBoardStore();
  const [isPending, startTransition] = useTransition();
  const [editorOpen, setEditorOpen] = useState(false);
  const [linkMenuOpen, setLinkMenuOpen] = useState(false);
  const [catalogPickerOpen, setCatalogPickerOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [draftName, setDraftName] = useState("");
  const [draftSize, setDraftSize] = useState<1 | 2 | 3 | 4>(1);
  const [draftHpCur, setDraftHpCur] = useState(20);
  const [draftHpMax, setDraftHpMax] = useState(20);
  const [draftOwnerId, setDraftOwnerId] = useState(currentUserId);
  const [draftCharId, setDraftCharId] = useState("");
  const [draftImageUrl, setDraftImageUrl] = useState<string | null>(null);

  const isDemoSelected = Boolean(
    selectedTokenId && selectedTokenId.startsWith("demo-token-")
  );
  const token: Token | undefined = tokens.find(
    (t) => t.id === selectedTokenId
  );

  const linkedCharacter = token?.character_id
    ? characters.find((c) => c.id === token.character_id)
    : undefined;
  const linkedSheet = linkedCharacter
    ? normalizeSheetData(linkedCharacter.sheet_data)
    : null;

  const canEdit = Boolean(
    token &&
      !token.id.startsWith("demo-token-") &&
      (role === "gm" ||
        (!token.is_locked &&
          (token.owner_id === currentUserId ||
            linkedCharacter?.owner_id === currentUserId)))
  );

  const openQuickEditor = () => {
    if (!token) return;
    setLinkMenuOpen(false);
    setCatalogPickerOpen(false);
    setDraftName(token.name);
    setDraftSize(Math.min(Math.max(token.size || 1, 1), 4) as 1 | 2 | 3 | 4);
    setDraftHpCur(token.hp_current);
    setDraftHpMax(token.hp_max);
    setDraftOwnerId(token.owner_id ?? currentUserId);
    setDraftCharId(token.character_id ?? "");
    setDraftImageUrl(token.image_url);
    setEditorOpen((v) => !v);
  };

  const handleDelete = useCallback(() => {
    if (!token || token.id.startsWith("demo-token-") || !canEdit) return;
    if (!window.confirm(`Remover o token "${token.name}" do tabuleiro?`))
      return;

    const prevToken = token;
    setEditorOpen(false);
    removeToken(token.id);

    startTransition(async () => {
      const res = await deleteTokenAction({
        tokenId: prevToken.id,
        campaignId,
      });
      if (!res.ok) {
        upsertToken(prevToken);
        onError?.(res.error ?? "Erro ao excluir token.");
      }
    });
  }, [token, canEdit, removeToken, campaignId, upsertToken, onError]);

  const toggleLock = useCallback(() => {
    if (!token || role !== "gm") return;
    const nextLocked = !token.is_locked;
    const prevToken = token;

    upsertToken({
      ...token,
      is_locked: nextLocked,
      updated_at: new Date().toISOString(),
    });

    startTransition(async () => {
      const res = await updateTokenStatsAction({
        tokenId: token.id,
        campaignId,
        isLocked: nextLocked,
      });
      if (!res.ok) {
        upsertToken(prevToken);
        onError?.(res.error ?? "Erro ao travar/destravar token.");
      } else if (res.token) {
        upsertToken(res.token);
      }
    });
  }, [token, role, upsertToken, campaignId, onError]);

  useEffect(() => {
    if (!token || token.id.startsWith("demo-token-") || !canEdit) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        handleDelete();
      } else if (e.key.toLowerCase() === "l" && role === "gm") {
        e.preventDefault();
        toggleLock();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [token, canEdit, role, handleDelete, toggleLock]);

  if (isDemoSelected) {
    return (
      <div className="pointer-events-auto absolute bottom-3 left-1/2 z-30 flex max-w-[94vw] -translate-x-1/2 items-center gap-3 rounded-2xl border border-amber-500/40 bg-zinc-900/95 px-4 py-2 text-xs shadow-2xl backdrop-blur sm:bottom-4">
        <span className="font-semibold text-amber-200">
          Token Inicial de Demonstração
        </span>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              const sheetRes = await createLinkedSheetForEntity({
                campaignId,
                name: "Herói",
                ownerId: currentUserId,
                hpMax: 20,
                hpCurrent: 20,
                armorClass: 16,
              });
              if (sheetRes.ok && sheetRes.character) {
                onUpsertCharacter?.(sheetRes.character);
              }
              const res = await createTokenAction({
                sceneId,
                campaignId,
                name: "Herói",
                imageUrl: "/icons/humans/humans-male/contemplative-warrior-in-forest.png",
                size: 1,
                hpCurrent: 20,
                hpMax: 20,
                ownerId: currentUserId,
                characterId: sheetRes.character?.id ?? null,
                posX: 140,
                posY: 140,
                visionRange: 4.5,
              });
              if (res.ok && res.token) {
                upsertToken(res.token);
                setSelectedTokenId(res.token.id);
              } else if (!res.ok) {
                onError?.(res.error ?? "Erro ao criar token real.");
              }
            });
          }}
          className="inline-flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-1.5 font-bold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          Salvar Token + Ficha na Cena
        </button>
        <button
          type="button"
          onClick={() => setSelectedTokenId(null)}
          className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  if (!token) {
    return null;
  }

  const adjustHp = (delta: number) => {
    if (!canEdit) return;
    const nextHp = Math.min(
      Math.max((token.hp_current ?? token.hp_max) + delta, 0),
      token.hp_max
    );
    const prevToken = token;

    upsertToken({
      ...token,
      hp_current: nextHp,
      updated_at: new Date().toISOString(),
    });

    startTransition(async () => {
      const res = await updateTokenStatsAction({
        tokenId: token.id,
        campaignId,
        hpCurrent: nextHp,
      });
      if (!res.ok) {
        upsertToken(prevToken);
        onError?.(res.error ?? "Erro ao atualizar HP.");
        return;
      }
      if (res.token) {
        upsertToken(res.token);
      }
      if (linkedCharacter) {
        const synced = await syncHpToLinkedCharacter({
          character: linkedCharacter,
          campaignId,
          hpCurrent: nextHp,
          hpMax: token.hp_max,
        });
        if (synced) onUpsertCharacter?.(synced);
      }
    });
  };

  const linkExistingCharacter = (charId: string) => {
    if (!canEdit) return;
    const charObj = characters.find((c) => c.id === charId);
    const sheet = charObj ? normalizeSheetData(charObj.sheet_data) : null;
    const nextMax = sheet?.hpMax ?? token.hp_max;
    const nextCur = sheet?.hpCurrent ?? nextMax;

    setLinkMenuOpen(false);
    startTransition(async () => {
      const res = await updateTokenStatsAction({
        tokenId: token.id,
        campaignId,
        characterId: charId || null,
        ...(sheet
          ? {
              hpMax: nextMax,
              hpCurrent: nextCur,
            }
          : {}),
      });
      if (res.ok && res.token) {
        upsertToken(res.token);
      } else if (!res.ok) {
        onError?.(res.error ?? "Não foi possível vincular a ficha.");
      }
    });
  };

  const handleCreateAndLinkSheet = () => {
    if (!canEdit) return;
    setLinkMenuOpen(false);
    startTransition(async () => {
      const sheetRes = await createLinkedSheetForEntity({
        campaignId,
        name: token.name,
        ownerId: token.owner_id ?? currentUserId,
        hpMax: token.hp_max,
        hpCurrent: token.hp_current,
      });
      if (!sheetRes.ok || !sheetRes.character) {
        onError?.(sheetRes.error ?? "Erro ao criar ficha.");
        return;
      }
      onUpsertCharacter?.(sheetRes.character);
      const tokRes = await updateTokenStatsAction({
        tokenId: token.id,
        campaignId,
        characterId: sheetRes.character.id,
      });
      if (tokRes.ok && tokRes.token) {
        upsertToken(tokRes.token);
      }
      onOpenCharacter?.(sheetRes.character);
    });
  };

  const handleSaveEditor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !draftName.trim()) return;
    const cleanMax = Math.max(1, draftHpMax);
    const cleanCur = Math.min(Math.max(0, draftHpCur), cleanMax);

    startTransition(async () => {
      const res = await updateTokenStatsAction({
        tokenId: token.id,
        campaignId,
        name: draftName.trim(),
        imageUrl: draftImageUrl,
        size: draftSize,
        hpMax: cleanMax,
        hpCurrent: cleanCur,
        ...(role === "gm" ? { ownerId: draftOwnerId } : {}),
        characterId: draftCharId || null,
      });
      if (!res.ok || !res.token) {
        onError?.(res.error ?? "Erro ao atualizar token.");
        return;
      }
      upsertToken(res.token);
      if (draftCharId) {
        const linked = characters.find((c) => c.id === draftCharId);
        if (linked) {
          const synced = await syncHpToLinkedCharacter({
            character: linked,
            campaignId,
            hpCurrent: cleanCur,
            hpMax: cleanMax,
          });
          if (synced) onUpsertCharacter?.(synced);
        }
      }
      setEditorOpen(false);
      setCatalogPickerOpen(false);
    });
  };

  const toggleHidden = () => {
    if (role !== "gm") return;
    const nextHidden = !token.is_hidden;
    const prevToken = token;

    upsertToken({
      ...token,
      is_hidden: nextHidden,
      updated_at: new Date().toISOString(),
    });

    startTransition(async () => {
      const res = await updateTokenStatsAction({
        tokenId: token.id,
        campaignId,
        isHidden: nextHidden,
      });
      if (!res.ok) {
        upsertToken(prevToken);
        onError?.(res.error ?? "Erro ao alterar visibilidade.");
      } else if (res.token) {
        upsertToken(res.token);
      }
    });
  };

  const toggleCondition = (cond: string) => {
    if (!canEdit) return;
    const current = token.conditions ?? [];
    const nextConditions = current.includes(cond)
      ? current.filter((c) => c !== cond)
      : [...current, cond];
    const prevToken = token;

    upsertToken({
      ...token,
      conditions: nextConditions,
      updated_at: new Date().toISOString(),
    });

    startTransition(async () => {
      const res = await updateTokenStatsAction({
        tokenId: token.id,
        campaignId,
        conditions: nextConditions,
      });
      if (!res.ok) {
        upsertToken(prevToken);
        onError?.(res.error ?? "Erro ao atualizar condições.");
      } else if (res.token) {
        upsertToken(res.token);
      }
    });
  };

  const setRingColor = (ringColor: string | null) => {
    if (!canEdit) return;
    const prevToken = token;

    upsertToken({
      ...token,
      ring_color: ringColor,
      updated_at: new Date().toISOString(),
    });

    startTransition(async () => {
      const res = await updateTokenStatsAction({
        tokenId: token.id,
        campaignId,
        ringColor,
      });
      if (!res.ok) {
        upsertToken(prevToken);
        onError?.(res.error ?? "Erro ao alterar cor do anel.");
      } else if (res.token) {
        upsertToken(res.token);
      }
    });
  };

  const toggleTorchLight = () => {
    if (!canEdit) return;
    const nextLight = (token.light_radius ?? 0) > 0 ? 0 : 12;
    const prevToken = token;

    upsertToken({
      ...token,
      light_radius: nextLight,
      updated_at: new Date().toISOString(),
    });

    startTransition(async () => {
      const res = await updateTokenStatsAction({
        tokenId: token.id,
        campaignId,
        lightRadius: nextLight,
      });
      if (!res.ok) {
        upsertToken(prevToken);
        onError?.(res.error ?? "Erro ao alternar tocha/luz.");
      } else if (res.token) {
        upsertToken(res.token);
      }
    });
  };

  const cycleFogVision = () => {
    if (!canEdit) return;
    const cur = token.vision_range ?? 0;
    const nextVision =
      cur <= 0 ? 4.5 : cur <= 5 ? 9 : cur <= 10 ? 15 : 0;
    const prevToken = token;

    upsertToken({
      ...token,
      vision_range: nextVision,
      updated_at: new Date().toISOString(),
    });

    startTransition(async () => {
      const res = await updateTokenStatsAction({
        tokenId: token.id,
        campaignId,
        visionRange: nextVision,
      });
      if (!res.ok) {
        upsertToken(prevToken);
        onError?.(res.error ?? "Erro ao ajustar visão na névoa.");
      } else if (res.token) {
        upsertToken(res.token);
      }
    });
  };

  return (
    <div className="pointer-events-none absolute bottom-3 left-1/2 z-30 flex w-fit max-w-[95vw] -translate-x-1/2 flex-col items-center gap-2 sm:bottom-4">
      {/* Popover rápido de edição completa do Token */}
      {editorOpen && canEdit && (
        <form
          onSubmit={handleSaveEditor}
          className="pointer-events-auto w-80 max-w-[92vw] space-y-2 rounded-2xl border border-amber-500/45 bg-zinc-950/95 p-3 text-xs shadow-2xl backdrop-blur"
        >
          <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
            <span className="font-bold text-amber-300">
              Editar Token: {token.name}
            </span>
            <button
              type="button"
              onClick={() => {
                setEditorOpen(false);
                setCatalogPickerOpen(false);
              }}
              className="rounded p-0.5 text-zinc-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {draftImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={draftImageUrl}
                alt={draftName}
                className="h-10 w-10 shrink-0 rounded-full border border-amber-500/50 object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-xs font-bold text-amber-200">
                {draftName.slice(0, 1).toUpperCase() || "?"}
              </div>
            )}
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setCatalogPickerOpen((v) => !v)}
                className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/15 px-2 py-1 text-[11px] font-semibold text-amber-200"
              >
                <Library className="h-3 w-3" />
                Pacote
              </button>
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-200 hover:border-amber-500/40">
                {isUploadingAvatar ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ImagePlus className="h-3 w-3 text-amber-400" />
                )}
                Upload
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={async (ev) => {
                    const file = ev.target.files?.[0];
                    ev.target.value = "";
                    if (!file) return;
                    setIsUploadingAvatar(true);
                    try {
                      const up = await uploadCampaignImage({
                        bucket: "tokens",
                        campaignId,
                        file,
                      });
                      setDraftImageUrl(up.publicUrl);
                    } catch (err) {
                      onError?.(
                        err instanceof Error
                          ? err.message
                          : "Erro ao enviar avatar."
                      );
                    } finally {
                      setIsUploadingAvatar(false);
                    }
                  }}
                />
              </label>
            </div>
          </div>

          {catalogPickerOpen && (
            <CatalogAvatarPicker
              onSelect={(item) => {
                setDraftImageUrl(item.url);
                setCatalogPickerOpen(false);
              }}
              onClose={() => setCatalogPickerOpen(false)}
            />
          )}

          <input
            type="text"
            required
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            placeholder="Nome do Token"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-white"
          />

          <div className="grid grid-cols-3 gap-1.5">
            <div>
              <label className="block text-[10px] text-zinc-400">Tam</label>
              <select
                value={draftSize}
                onChange={(e) =>
                  setDraftSize(Number(e.target.value) as 1 | 2 | 3 | 4)
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
                PV Atual
              </label>
              <input
                type="number"
                min={0}
                max={9999}
                value={draftHpCur}
                onChange={(e) => setDraftHpCur(Number(e.target.value))}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-400">
                PV Máx
              </label>
              <input
                type="number"
                min={1}
                max={9999}
                value={draftHpMax}
                onChange={(e) => setDraftHpMax(Number(e.target.value))}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="block text-[10px] text-zinc-400">Ficha</label>
              <select
                value={draftCharId}
                onChange={(e) => {
                  const cid = e.target.value;
                  setDraftCharId(cid);
                  const found = characters.find((c) => c.id === cid);
                  if (found) {
                    const sh = normalizeSheetData(found.sheet_data);
                    setDraftHpMax(sh.hpMax ?? draftHpMax);
                    setDraftHpCur(sh.hpCurrent ?? sh.hpMax ?? draftHpCur);
                  }
                }}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-1.5 py-1 text-[11px] text-white"
              >
                <option value="">Sem ficha</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {role === "gm" && members.length > 0 && (
              <div>
                <label className="block text-[10px] text-zinc-400">Dono</label>
                <select
                  value={draftOwnerId}
                  onChange={(e) => setDraftOwnerId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-1.5 py-1 text-[11px] text-white"
                >
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.username}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending || isUploadingAvatar}
            className="inline-flex w-full items-center justify-center gap-1 rounded-xl bg-amber-500 py-1.5 font-bold text-zinc-950 hover:bg-amber-400 disabled:opacity-60"
          >
            <Save className="h-3.5 w-3.5" />
            Salvar Token
          </button>
        </form>
      )}

      {/* Popover rápido de Vincular / Criar Ficha */}
      {linkMenuOpen && canEdit && !linkedCharacter && (
        <div className="pointer-events-auto w-64 space-y-2 rounded-2xl border border-amber-500/45 bg-zinc-950/95 p-3 text-xs shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-200">
              Vincular Ficha a {token.name}
            </span>
            <button
              type="button"
              onClick={() => setLinkMenuOpen(false)}
              className="text-zinc-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {characters.length > 0 && (
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) linkExistingCharacter(e.target.value);
              }}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-white"
            >
              <option value="">Escolher ficha existente...</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            disabled={isPending}
            onClick={handleCreateAndLinkSheet}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-1.5 font-bold text-zinc-950 hover:bg-amber-400"
          >
            <Plus className="h-3.5 w-3.5" />
            Criar Ficha Nova p/ {token.name}
          </button>
        </div>
      )}

      {/* Barra Principal Inferior do Token Selecionado */}
      <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-zinc-700/80 bg-zinc-900/95 px-3 py-2 shadow-2xl backdrop-blur sm:gap-2.5 sm:px-4 sm:py-2.5">
        <div className="flex items-center gap-2">
          {token.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={token.image_url}
              alt={token.name}
              className="h-8 w-8 rounded-full border border-amber-500/40 object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-500/40 bg-zinc-800 text-xs font-bold text-amber-300">
              {token.size}x{token.size}
            </div>
          )}
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold text-white">
              <span>{token.name}</span>
              <span className="text-[10px] font-normal text-zinc-400">
                ({token.size}x{token.size})
              </span>
            </p>
            <p className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <span className="inline-flex items-center gap-1">
                <Heart className="h-3 w-3 text-rose-400" />
                HP: <strong className="text-white">{token.hp_current}</strong> /{" "}
                {token.hp_max}
              </span>
              {linkedSheet && (
                <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-amber-200">
                  CA {linkedSheet.armorClass ?? 10} · Nv.{linkedSheet.level}
                </span>
              )}
            </p>
          </div>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={openQuickEditor}
            title="Editar nome, avatar, PV, tamanho ou dono deste token"
            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition ${
              editorOpen
                ? "border-amber-400 bg-amber-500 text-zinc-950"
                : "border-zinc-700 bg-zinc-800 text-zinc-200 hover:border-amber-500/40 hover:text-amber-200"
            }`}
          >
            <Pencil className="h-3 w-3" />
            Editar
          </button>
        )}

        {linkedCharacter && onOpenCharacter ? (
          <button
            type="button"
            onClick={() => onOpenCharacter(linkedCharacter)}
            className="inline-flex items-center gap-1 rounded-lg border border-amber-500/35 bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/25"
            title="Abrir ficha vinculada"
          >
            <ScrollText className="h-3.5 w-3.5" />
            Ficha
          </button>
        ) : (
          canEdit && (
            <button
              type="button"
              onClick={() => {
                setEditorOpen(false);
                setLinkMenuOpen((v) => !v);
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/20"
              title="Vincular ou criar uma Ficha para este Token"
            >
              <ScrollText className="h-3.5 w-3.5" />
              + Ficha
            </button>
          )
        )}

        {canEdit && (
          <>
            <div className="h-6 w-px bg-zinc-800" />
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => adjustHp(-5)}
                disabled={isPending}
                className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
              >
                -5
              </button>
              <button
                type="button"
                onClick={() => adjustHp(-1)}
                disabled={isPending}
                className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-1.5 text-rose-300 transition hover:bg-rose-500/20"
                title="-1 HP"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => adjustHp(1)}
                disabled={isPending}
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-1.5 text-emerald-300 transition hover:bg-emerald-500/20"
                title="+1 HP"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => adjustHp(5)}
                disabled={isPending}
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
              >
                +5
              </button>
            </div>

            {role === "gm" && (
              <>
                <div className="h-6 w-px bg-zinc-800" />
                <button
                  type="button"
                  onClick={toggleHidden}
                  disabled={isPending}
                  title={
                    token.is_hidden
                      ? "Token oculto dos jogadores (clique para revelar)"
                      : "Ocultar token dos jogadores"
                  }
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition ${
                    token.is_hidden
                      ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                      : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-white"
                  }`}
                >
                  {token.is_hidden ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5" />
                      Oculto
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5" />
                      Visível
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={toggleLock}
                  disabled={isPending}
                  title={
                    token.is_locked
                      ? "Token travado (jogadores não podem mover)"
                      : "Travar token contra movimento"
                  }
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition ${
                    token.is_locked
                      ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                      : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-white"
                  }`}
                >
                  {token.is_locked ? (
                    <>
                      <Lock className="h-3.5 w-3.5" />
                      Travado
                    </>
                  ) : (
                    <>
                      <Unlock className="h-3.5 w-3.5" />
                      Livre
                    </>
                  )}
                </button>
              </>
            )}

            <div className="h-6 w-px bg-zinc-800" />
            <div className="flex items-center gap-1" title="Anel colorido do token">
              {RING_COLORS.map((c) => {
                const active = token.ring_color === c;
                return (
                  <button
                    key={c}
                    type="button"
                    disabled={isPending}
                    onClick={() => setRingColor(active ? null : c)}
                    className={`h-4 w-4 rounded-full border transition ${
                      active ? "scale-110 border-white ring-1 ring-white" : "border-zinc-700"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                );
              })}
            </div>

            <div className="h-6 w-px bg-zinc-800" />
            <button
              type="button"
              disabled={isPending}
              onClick={toggleTorchLight}
              title="Acender/Apagar Tocha (12m de luz dinâmica e abre névoa)"
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition ${
                (token.light_radius ?? 0) > 0
                  ? "border-amber-500/50 bg-amber-500/20 text-amber-300"
                  : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              <Flame className="h-3.5 w-3.5" />
              {(token.light_radius ?? 0) > 0 ? "Tocha ON" : "Tocha"}
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={cycleFogVision}
              title="Alcance com que este token abre a Névoa/Escuridão (clique para alternar)"
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition ${
                (token.vision_range ?? 0) > 0
                  ? "border-sky-500/50 bg-sky-500/20 text-sky-200"
                  : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              {(token.vision_range ?? 0) > 0
                ? `Visão ${token.vision_range}m`
                : "Sem Visão"}
            </button>

            {onFxBurst && (
              <button
                type="button"
                onClick={() => {
                  const centerOffset =
                    (Math.min(Math.max(token.size || 1, 1), 4) * 70) / 2;
                  onFxBurst(
                    token.pos_x + centerOffset,
                    token.pos_y + centerOffset,
                    "fire",
                    160
                  );
                }}
                title="Disparar efeito mágico (explosão) neste token"
                className="inline-flex items-center gap-1 rounded-lg border border-purple-500/40 bg-purple-500/15 px-2 py-1 text-xs font-semibold text-purple-200 transition hover:bg-purple-500/25"
              >
                <Sparkles className="h-3.5 w-3.5" />
                VFX
              </button>
            )}

            <div className="h-6 w-px bg-zinc-800" />
            <div className="flex flex-wrap items-center gap-1">
              {QUICK_CONDITIONS.map((cond) => {
                const active = (token.conditions ?? []).includes(cond);
                return (
                  <button
                    key={cond}
                    type="button"
                    disabled={isPending}
                    onClick={() => toggleCondition(cond)}
                    className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold transition ${
                      active
                        ? "border-rose-500/50 bg-rose-500/20 text-rose-200"
                        : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {cond}
                  </button>
                );
              })}
            </div>

            <div className="h-6 w-px bg-zinc-800" />
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              title="Excluir token do tabuleiro (Delete / Backspace)"
              className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Excluir
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => {
            setEditorOpen(false);
            setLinkMenuOpen(false);
            setSelectedTokenId(null);
          }}
          title="Fechar barra"
          className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
