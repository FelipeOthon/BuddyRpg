"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { SheetCoins, SheetData } from "@/types/domain";

export default function SheetInventoryTab({
  sheet,
  setSheet,
  canEdit,
}: {
  sheet: SheetData;
  setSheet: Dispatch<SetStateAction<SheetData>>;
  canEdit: boolean;
}) {
  const [newItemName, setNewItemName] = useState("");

  const coins: SheetCoins = sheet.coins ?? {
    cp: 0,
    sp: 0,
    ep: 0,
    gp: 0,
    pp: 0,
  };

  const addInventoryItem = () => {
    const trimmed = newItemName.trim();
    if (!trimmed || !canEdit) return;
    setSheet((prev) => ({
      ...prev,
      inventory: [
        ...prev.inventory,
        { id: `item-${Date.now()}`, name: trimmed, qty: 1 },
      ],
    }));
    setNewItemName("");
  };

  return (
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
                  const val = Math.max(Number(e.target.value) || 0, 0);
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
                      inventory: prev.inventory.filter((_, i) => i !== idx),
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
  );
}
