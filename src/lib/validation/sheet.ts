import { z } from "zod";
import type { SheetData } from "@/types/domain";

export const sheetAttributeSchema = z.object({
  key: z.string().trim().min(1).max(32),
  label: z.string().trim().min(1).max(40),
  value: z.number().int().min(-100).max(999),
});

export const sheetInventoryItemSchema = z.object({
  id: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(80),
  qty: z.number().int().min(0).max(99999),
  notes: z.string().max(200).optional(),
});

export const sheetDataSchema = z.object({
  level: z.number().int().min(1).max(100),
  classOrArchetype: z.string().max(80).optional(),
  attributes: z.array(sheetAttributeSchema).max(30),
  inventory: z.array(sheetInventoryItemSchema).max(100),
  notes: z.string().max(5000),
  custom: z.record(z.string(), z.union([z.string(), z.number()])),
});

export function createDefaultSheetData(): SheetData {
  return {
    level: 1,
    classOrArchetype: "Aventureiro",
    attributes: [
      { key: "for", label: "Força", value: 10 },
      { key: "des", label: "Destreza", value: 10 },
      { key: "con", label: "Constituição", value: 10 },
      { key: "int", label: "Inteligência", value: 10 },
      { key: "sab", label: "Sabedoria", value: 10 },
      { key: "car", label: "Carisma", value: 10 },
    ],
    inventory: [
      { id: "item-1", name: "Mochila de Aventureiro", qty: 1 },
      { id: "item-2", name: "Poção de Cura", qty: 2 },
    ],
    notes: "",
    custom: {},
  };
}

export function normalizeSheetData(raw: unknown): SheetData {
  const defaults = createDefaultSheetData();
  if (!raw || typeof raw !== "object") {
    return defaults;
  }

  const parsed = sheetDataSchema.safeParse({
    ...defaults,
    ...(raw as Record<string, unknown>),
  });

  if (parsed.success) {
    return parsed.data;
  }

  return defaults;
}

export function attributeModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}
