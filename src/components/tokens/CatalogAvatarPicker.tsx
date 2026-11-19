"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import {
  ICON_CATEGORIES,
  ICON_ITEMS,
  type IconCatalogItem,
} from "@/lib/assets/iconCatalog";

export default function CatalogAvatarPicker({
  onSelect,
  onClose,
}: {
  onSelect: (item: IconCatalogItem) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ICON_ITEMS.filter((item) => {
      if (category !== "all" && item.categoryId !== category) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.categoryId.includes(q) ||
        (item.sub && item.sub.toLowerCase().includes(q))
      );
    });
  }, [category, query]);

  const PAGE_SIZE = 18;
  const totalPages = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1);
  const safePage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(
    safePage * PAGE_SIZE,
    (safePage + 1) * PAGE_SIZE
  );

  return (
    <div className="space-y-2 rounded-xl border border-amber-500/40 bg-zinc-950/95 p-2.5 text-xs shadow-2xl">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-amber-200">
          Escolher Avatar do Pacote
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-0.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Buscar..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 py-1 pr-2 pl-6 text-[11px] text-white outline-none focus:border-amber-500"
          />
        </div>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(0);
          }}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-1.5 py-1 text-[11px] text-zinc-200"
        >
          <option value="all">Todas ({ICON_ITEMS.length})</option>
          {ICON_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid max-h-44 grid-cols-6 gap-1 overflow-y-auto pr-0.5">
        {paged.map((item) => (
          <button
            key={item.id}
            type="button"
            title={item.name}
            onClick={() => onSelect(item)}
            className="flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/80 p-1 transition hover:border-amber-400 hover:bg-zinc-800"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.url}
              alt={item.name}
              loading="lazy"
              className="h-9 w-9 rounded object-contain"
            />
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between text-[10px] text-zinc-400">
        <button
          type="button"
          disabled={safePage === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          className="inline-flex items-center gap-0.5 rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 disabled:opacity-40"
        >
          <ChevronLeft className="h-3 w-3" />
          Ant.
        </button>
        <span>
          Pág. {safePage + 1}/{totalPages}
        </span>
        <button
          type="button"
          disabled={safePage >= totalPages - 1}
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          className="inline-flex items-center gap-0.5 rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 disabled:opacity-40"
        >
          Próx.
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
