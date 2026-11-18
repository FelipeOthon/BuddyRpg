import type { Database, DistanceRule, CampaignRole } from "./database.types";

export type { DistanceRule, CampaignRole };

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Campaign = Database["public"]["Tables"]["campaigns"]["Row"];
export type CampaignMember =
  Database["public"]["Tables"]["campaign_members"]["Row"];
export type Scene = Database["public"]["Tables"]["scenes"]["Row"];
export type Token = Database["public"]["Tables"]["tokens"]["Row"];
export type CharacterRow = Database["public"]["Tables"]["characters"]["Row"];
export type MessageRow = Database["public"]["Tables"]["messages"]["Row"];

export type KeepMode = "kh" | "kl" | "dh" | "dl";

export interface DiceRollSingle {
  v: number;
  kept: boolean;
}

export interface DiceTermResult {
  type: "dice";
  sign: 1 | -1;
  count: number;
  sides: number;
  keep?: {
    mode: KeepMode;
    n: number;
  };
  rolls: DiceRollSingle[];
  subtotal: number;
}

export interface ModifierTermResult {
  type: "mod";
  sign: 1 | -1;
  value: number;
}

export type RollTermResult = DiceTermResult | ModifierTermResult;

export interface RollResult {
  expression: string;
  label?: string;
  terms: RollTermResult[];
  total: number;
}

export interface SheetAttribute {
  key: string;
  label: string;
  value: number;
}

export interface SheetInventoryItem {
  id: string;
  name: string;
  qty: number;
  notes?: string;
}

export interface SheetData {
  level: number;
  classOrArchetype?: string;
  attributes: SheetAttribute[];
  inventory: SheetInventoryItem[];
  notes: string;
  custom: Record<string, string | number>;
}

export interface TokenDragPayload {
  tokenId: string;
  sceneId: string;
  x: number;
  y: number;
  userId: string;
  ts: number;
}

export interface RulerBroadcastPayload {
  userId: string;
  username: string;
  color: string;
  sceneId: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  active: boolean;
}
