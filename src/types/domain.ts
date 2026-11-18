import type {
  CampaignRole,
  Database,
  DistanceRule,
  FogMode,
  FogOperation,
  FogShapeKind,
  GridType,
  SceneElementKind,
  SceneElementLayer,
} from "./database.types";

export type {
  CampaignRole,
  DistanceRule,
  FogMode,
  FogOperation,
  FogShapeKind,
  GridType,
  SceneElementKind,
  SceneElementLayer,
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Campaign = Database["public"]["Tables"]["campaigns"]["Row"];
export type CampaignMember =
  Database["public"]["Tables"]["campaign_members"]["Row"];
export type Scene = Database["public"]["Tables"]["scenes"]["Row"];
export type SceneElement =
  Database["public"]["Tables"]["scene_elements"]["Row"];
export type SceneFogShape =
  Database["public"]["Tables"]["scene_fog_shapes"]["Row"];
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

export type RpgSystemId = "dnd5e" | "custom";
export type SkillProficiency = "none" | "proficient" | "expertise";

export interface SheetAttribute {
  key: string;
  label: string;
  value: number;
}

export interface SheetSkill {
  key: string;
  label: string;
  abilityKey: string;
  proficiency: SkillProficiency;
}

export interface SheetAttack {
  id: string;
  name: string;
  attackBonus: number;
  damageFormula: string;
  damageType: string;
  rangeOrNotes?: string;
}

export interface SheetSpellSlotLevel {
  level: number;
  total: number;
  used: number;
}

export interface SheetSpell {
  id: string;
  level: number;
  name: string;
  schoolOrNotes?: string;
  damageFormula?: string;
  prepared: boolean;
}

export interface SheetCoins {
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
}

export interface SheetInventoryItem {
  id: string;
  name: string;
  qty: number;
  notes?: string;
}

export interface SheetData {
  system?: RpgSystemId;
  level: number;
  classOrArchetype?: string;
  ancestryOrRace?: string;
  backgroundOrFaction?: string;
  armorClass?: number;
  hpCurrent?: number;
  hpMax?: number;
  hpTemp?: number;
  speed?: string;
  hitDice?: string;
  deathSaves?: {
    successes: number;
    failures: number;
  };
  saveProficiencies?: string[];
  attributes: SheetAttribute[];
  skills?: SheetSkill[];
  attacks?: SheetAttack[];
  spellcastingAbility?: string;
  spellSlots?: SheetSpellSlotLevel[];
  spells?: SheetSpell[];
  coins?: SheetCoins;
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

export interface PinnedRuler {
  id: string;
  userId: string;
  username: string;
  color: string;
  sceneId: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface PinnedRulerBroadcastPayload {
  action: "add" | "remove" | "clear";
  ruler?: PinnedRuler;
  rulerId?: string;
  sceneId: string;
  userId: string;
}

export interface PointerBroadcastPayload {
  userId: string;
  username: string;
  color: string;
  sceneId: string;
  x: number;
  y: number;
  active: boolean;
  ts: number;
}

export interface ViewportSyncPayload {
  userId: string;
  sceneId: string;
  x: number;
  y: number;
  scale: number;
}

export interface SceneElementData {
  points?: number[];
  width?: number;
  height?: number;
  radius?: number;
  angle?: number;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  opacity?: number;
  text?: string;
  fontSize?: number;
  imageUrl?: string;
  label?: string;
}

export interface DrawPreviewPayload {
  userId: string;
  sceneId: string;
  kind: SceneElementKind;
  x: number;
  y: number;
  rotation: number;
  data: SceneElementData;
  active: boolean;
}

export interface FogShapeData {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  points?: number[];
}
