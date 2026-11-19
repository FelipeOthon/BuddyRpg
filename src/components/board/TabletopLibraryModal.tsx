"use client";

import { useEffect, useState } from "react";
import {
  Armchair,
  Check,
  Layers,
  Map as MapIcon,
  Maximize2,
  Minimize2,
  Plus,
  Sparkles,
  UserPlus,
  Wand2,
  X,
} from "lucide-react";
import SceneManager from "../scenes/SceneManager";
import {
  CURATED_ADVENTURE_ITEMS,
  CURATED_BATTLEMAPS,
  CURATED_CREATURE_TOKENS,
  CURATED_VFX_ANIMATIONS,
  type CuratedMapItem,
} from "@/lib/board/curatedAssets";
import {
  CURATED_HERO_TOKENS,
  FURNITURE_PACK,
} from "@/lib/board/furniturePack";
import {
  buildAiBattlemapUrl,
  buildAiPropUrl,
  buildAiTokenUrl,
} from "@/lib/board/mapGenerator";

export type LibraryTab =
  | "maps"
  | "furniture"
  | "tokens"
  | "vfx"
  | "ai"
  | "scenes";
type AiMode = "map" | "token" | "item";

export default function TabletopLibraryModal({
  campaignId,
  initialTab = "furniture",
  onClose,
  onPlaceProp,
  onPlaceMapPiece,
  onPlaceToken,
}: {
  campaignId: string;
  initialTab?: LibraryTab;
  onClose: () => void;
  onPlaceProp: (payload: {
    imageUrl: string;
    label: string;
    cols: number;
    rows: number;
    zLayer?: "above_map" | "above_tokens";
  }) => void;
  onPlaceMapPiece: (item: {
    url: string;
    title: string;
    cols: number;
    rows: number;
  }) => void;
  onPlaceToken: (payload: {
    name: string;
    imageUrl: string;
    size: number;
  }) => void;
}) {
  const [tab, setTab] = useState<LibraryTab>(initialTab);
  const [expanded, setExpanded] = useState(false);
  const [mapCat, setMapCat] = useState<string>("Todos");
  const [vfxCat, setVfxCat] = useState<string>("Todos");
  const [propCat, setPropCat] = useState<string>("Todos");

  // Estúdio IA
  const [aiMode, setAiMode] = useState<AiMode>("map");
  const [aiName, setAiName] = useState("");
  const [aiPrompt, setAiPrompt] = useState(
    "Taverna medieval com lareira central, mesas de madeira e barris"
  );
  const [aiPreviewUrl, setAiPreviewUrl] = useState<string | null>(null);
  const [addedToast, setAddedToast] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const notifyAdded = (label: string) => {
    setAddedToast(label);
    window.setTimeout(() => {
      setAddedToast((cur) => (cur === label ? null : cur));
    }, 1800);
  };

  const handleGenerateAi = () => {
    const p = aiPrompt.trim();
    if (!p) return;
    const seed = String(Date.now());
    const url =
      aiMode === "map"
        ? buildAiBattlemapUrl(p, 1400, 1050, seed)
        : aiMode === "token"
          ? buildAiTokenUrl(p, seed)
          : buildAiPropUrl(p, seed);
    setAiPreviewUrl(url);
  };

  const handleInsertAi = () => {
    if (!aiPreviewUrl) return;
    const title = aiName.trim() || aiPrompt.trim().slice(0, 32) || "Criação IA";
    if (aiMode === "map") {
      onPlaceMapPiece({
        url: aiPreviewUrl,
        title,
        cols: 20,
        rows: 15,
      });
      notifyAdded(`Mapa "${title}"`);
    } else if (aiMode === "token") {
      onPlaceToken({
        name: title,
        imageUrl: aiPreviewUrl,
        size: 1,
      });
      notifyAdded(`Token "${title}"`);
    } else {
      onPlaceProp({
        imageUrl: aiPreviewUrl,
        label: title,
        cols: 2,
        rows: 2,
        zLayer: "above_map",
      });
      notifyAdded(`Item "${title}"`);
    }
  };

  const mapCategories = [
    "Todos",
    "Sala Modular",
    "Taverna",
    "Santuário",
    "Montanha",
    "Trem & Selva",
  ];
  const filteredMaps =
    mapCat === "Todos"
      ? CURATED_BATTLEMAPS
      : CURATED_BATTLEMAPS.filter((m) => m.category === mapCat);

  const vfxCategories = [
    "Todos",
    "Fogo & Braseiros",
    "Magia & Brilhos",
    "Vagalumes & Natureza",
    "Água & Atmosfera",
  ];
  const filteredVfx =
    vfxCat === "Todos"
      ? CURATED_VFX_ANIMATIONS
      : CURATED_VFX_ANIMATIONS.filter((v) => v.category === vfxCat);

  const propItems = [
    ...FURNITURE_PACK.map((f) => ({
      id: f.id,
      label: f.label,
      category: f.category as string,
      url: f.imageUrl,
      cols: f.cols,
      rows: f.rows,
    })),
    ...CURATED_ADVENTURE_ITEMS.map((i) => ({
      id: i.id,
      label: i.label,
      category: "Aventura",
      url: i.url,
      cols: i.cols,
      rows: i.rows,
    })),
  ];
  const propCategories = ["Todos", "Mobília", "Decoração", "Tesouro", "Aventura"];
  const filteredProps =
    propCat === "Todos"
      ? propItems
      : propItems.filter((p) => p.category === propCat);

  return (
    <div
      onWheel={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className={
        expanded
          ? "pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-5"
          : "pointer-events-auto fixed top-16 left-3 z-50 flex max-h-[82vh] w-[min(94vw,680px)] flex-col sm:left-14"
      }
      role="dialog"
      aria-label="Biblioteca da Mesa"
    >
      <div
        className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border border-amber-500/40 bg-zinc-950/95 shadow-2xl backdrop-blur ${
          expanded ? "max-h-[92vh] w-full max-w-5xl" : "max-h-[82vh] w-full"
        }`}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <div>
            <h2 className="font-display text-base font-extrabold text-amber-100">
              🎒 Biblioteca, Cenas &amp; Estúdio
            </h2>
            <p className="text-[11px] text-zinc-400">
              Janela flutuante: clique para inserir e arraste direto no mapa ao lado
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {addedToast && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
                <Check className="h-3 w-3" /> {addedToast}
              </span>
            )}
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? "Modo flutuante (ver mapa)" : "Expandir tela cheia"}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:text-amber-200"
            >
              {expanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar Biblioteca"
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="grid grid-cols-3 gap-1.5 border-b border-zinc-800 bg-zinc-950/90 p-2 sm:grid-cols-6">
          {(
            [
              { id: "furniture", label: "Móveis & Itens", icon: Armchair },
              { id: "tokens", label: "Personagens", icon: UserPlus },
              { id: "maps", label: `Mapas (${CURATED_BATTLEMAPS.length})`, icon: MapIcon },
              { id: "vfx", label: `VFX (${CURATED_VFX_ANIMATIONS.length})`, icon: Sparkles },
              { id: "ai", label: "Criar IA", icon: Wand2 },
              { id: "scenes", label: "Cenas", icon: Layers },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${
                  active
                    ? "bg-amber-500 text-zinc-950 shadow"
                    : "bg-zinc-900/60 text-zinc-300 hover:bg-zinc-800 hover:text-amber-200"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Conteúdo */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {tab === "furniture" && (
            <>
              <div className="flex flex-wrap gap-1.5">
                {propCategories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setPropCat(c)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                      propCat === c
                        ? "bg-amber-500/25 text-amber-200 border border-amber-500/40"
                        : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {filteredProps.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onPlaceProp({
                        imageUrl: item.url,
                        label: item.label,
                        cols: item.cols,
                        rows: item.rows,
                        zLayer: "above_map",
                      });
                      notifyAdded(item.label);
                    }}
                    className="group flex flex-col items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 text-center transition hover:border-amber-500/50 hover:bg-zinc-900"
                  >
                    <div className="mb-2 flex h-16 w-full items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.url}
                        alt={item.label}
                        className="max-h-14 max-w-full object-contain transition group-hover:scale-105"
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-200">
                      {item.label}
                    </span>
                    <span className="mt-0.5 text-[10px] text-zinc-500">
                      {item.cols}×{item.rows} · {item.category}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {tab === "tokens" && (
            <div className="space-y-5">
              <div>
                <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-amber-300">
                  Heróis &amp; NPCs Prontos
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
                  {CURATED_HERO_TOKENS.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => {
                        onPlaceToken({
                          name: h.name,
                          imageUrl: h.imageUrl,
                          size: 1,
                        });
                        notifyAdded(h.name);
                      }}
                      className="group flex flex-col items-center rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 text-center transition hover:border-amber-500/50 hover:bg-zinc-900"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={h.imageUrl}
                        alt={h.name}
                        className="mb-2 h-14 w-14 rounded-full object-cover transition group-hover:scale-105"
                      />
                      <span className="text-xs font-bold text-white">
                        {h.name}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {h.role}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wider text-rose-300">
                  Criaturas &amp; Chefes (Tokens Ilustrados)
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
                  {CURATED_CREATURE_TOKENS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onPlaceToken({
                          name: c.name,
                          imageUrl: c.url,
                          size: c.size,
                        });
                        notifyAdded(c.name);
                      }}
                      className="group flex flex-col items-center rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 text-center transition hover:border-rose-500/50 hover:bg-zinc-900"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={c.url}
                        alt={c.name}
                        className="mb-2 h-16 w-16 object-contain transition group-hover:scale-105"
                      />
                      <span className="text-xs font-bold text-white">
                        {c.name}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        Tamanho {c.size}×{c.size}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "maps" && (
            <>
              <div className="flex flex-wrap gap-1.5">
                {mapCategories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setMapCat(c)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                      mapCat === c
                        ? "border border-amber-500/40 bg-amber-500/25 text-amber-200"
                        : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredMaps.map((m: CuratedMapItem) => (
                  <div
                    key={m.id}
                    className="flex flex-col justify-between overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/70 p-2.5"
                  >
                    <div>
                      <div className="relative mb-2 h-32 w-full overflow-hidden rounded-lg bg-zinc-950">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={m.url}
                          alt={m.title}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                        <span className="absolute top-1.5 left-1.5 rounded bg-zinc-950/85 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                          {m.category}
                        </span>
                        <span className="absolute right-1.5 bottom-1.5 rounded bg-zinc-950/85 px-1.5 py-0.5 font-mono text-[10px] text-zinc-200">
                          {m.cols}×{m.rows}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-amber-100">
                        {m.title}
                      </h4>
                      <p className="mt-0.5 text-[10px] text-zinc-400">
                        {m.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onPlaceMapPiece(m);
                        notifyAdded(m.title);
                      }}
                      className="mt-2.5 flex w-full items-center justify-center gap-1 rounded-lg bg-amber-500 py-1.5 text-[11px] font-bold text-zinc-950 hover:bg-amber-400"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Encaixar no Mapa
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === "vfx" && (
            <>
              <div className="flex flex-wrap gap-1.5">
                {vfxCategories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setVfxCat(c)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                      vfxCat === c
                        ? "border border-amber-500/40 bg-amber-500/25 text-amber-200"
                        : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {filteredVfx.map((vfx) => (
                  <button
                    key={vfx.id}
                    type="button"
                    onClick={() => {
                      onPlaceProp({
                        imageUrl: vfx.url,
                        label: vfx.label,
                        cols: vfx.defaultCells,
                        rows: vfx.defaultCells,
                        zLayer: "above_tokens",
                      });
                      notifyAdded(vfx.label);
                    }}
                    className="group flex flex-col items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/70 p-2.5 text-center transition hover:border-amber-500/50 hover:bg-zinc-900"
                  >
                    <div className="mb-2 flex h-20 w-full items-center justify-center overflow-hidden rounded-lg bg-zinc-950">
                      <video
                        src={vfx.url}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-100">
                      {vfx.label}
                    </span>
                    <span className="mt-0.5 text-[10px] text-zinc-500">
                      {vfx.category} · {vfx.defaultCells}×{vfx.defaultCells}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {tab === "ai" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    {
                      id: "map",
                      label: "🗺️ Mapa Top-Down (Planta Baixa)",
                      placeholder:
                        "Ex: Masmorra de pedra alagada com ponte quebrada e altar arcano",
                    },
                    {
                      id: "token",
                      label: "🎭 Personagem / Monstro (Token)",
                      placeholder:
                        "Ex: Paladino anão com armadura dourada e martelo runico",
                    },
                    {
                      id: "item",
                      label: "🪑 Item / Móvel / Objeto",
                      placeholder:
                        "Ex: Sofá vitoriano bordô ou baú de tesouro ornamentado",
                    },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setAiMode(m.id);
                      setAiPreviewUrl(null);
                      setAiPrompt(m.placeholder.replace(/^Ex:\s*/, ""));
                    }}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                      aiMode === m.id
                        ? "border-amber-400 bg-amber-500/20 text-amber-200"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  type="text"
                  value={aiName}
                  onChange={(e) => setAiName(e.target.value)}
                  placeholder="Nome opcional (ex: Sir Thorne, Sofá Real)"
                  className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                />
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Descreva o que deseja gerar..."
                  className="sm:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateAi}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-400"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Gerar Prévia com IA
                </button>
                {aiPreviewUrl && (
                  <button
                    type="button"
                    onClick={handleInsertAi}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-emerald-400"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {aiMode === "token"
                      ? "Invocar como Token na Cena"
                      : aiMode === "item"
                        ? "Colocar Item no Tabuleiro"
                        : "Encaixar Mapa no Tabuleiro"}
                  </button>
                )}
              </div>

              {aiPreviewUrl && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={aiPreviewUrl}
                    alt="Prévia gerada por IA"
                    className="mx-auto max-h-72 rounded-lg object-contain"
                  />
                </div>
              )}
            </div>
          )}

          {tab === "scenes" && <SceneManager campaignId={campaignId} />}
        </div>
      </div>
    </div>
  );
}
