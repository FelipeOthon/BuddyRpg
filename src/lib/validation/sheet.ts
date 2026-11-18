import { z } from "zod";
import type {
  SheetAttribute,
  SheetData,
  SheetSkill,
  SheetSpellSlotLevel,
} from "@/types/domain";

export const sheetAttributeSchema = z.object({
  key: z.string().trim().min(1).max(32),
  label: z.string().trim().min(1).max(40),
  value: z.number().int().min(-100).max(999),
});

export const sheetSkillSchema = z.object({
  key: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(60),
  abilityKey: z.string().trim().min(1).max(32),
  proficiency: z.enum(["none", "proficient", "expertise"]),
});

export const sheetAttackSchema = z.object({
  id: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(80),
  attackBonus: z.number().int().min(-50).max(100),
  damageFormula: z.string().trim().min(1).max(60),
  damageType: z.string().trim().max(40),
  rangeOrNotes: z.string().max(120).optional(),
});

export const sheetSpellSlotSchema = z.object({
  level: z.number().int().min(1).max(9),
  total: z.number().int().min(0).max(20),
  used: z.number().int().min(0).max(20),
});

export const sheetSpellSchema = z.object({
  id: z.string().trim().min(1).max(64),
  level: z.number().int().min(0).max(9),
  name: z.string().trim().min(1).max(80),
  schoolOrNotes: z.string().max(200).optional(),
  damageFormula: z.string().max(60).optional(),
  prepared: z.boolean(),
});

export const sheetCoinsSchema = z.object({
  cp: z.number().int().min(0).max(9999999),
  sp: z.number().int().min(0).max(9999999),
  ep: z.number().int().min(0).max(9999999),
  gp: z.number().int().min(0).max(9999999),
  pp: z.number().int().min(0).max(9999999),
});

export const sheetInventoryItemSchema = z.object({
  id: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(80),
  qty: z.number().int().min(0).max(99999),
  notes: z.string().max(200).optional(),
});

export const sheetDataSchema = z.object({
  system: z.enum(["dnd5e", "custom"]).optional(),
  level: z.number().int().min(1).max(100),
  classOrArchetype: z.string().max(80).optional(),
  ancestryOrRace: z.string().max(80).optional(),
  backgroundOrFaction: z.string().max(80).optional(),
  armorClass: z.number().int().min(0).max(99).optional(),
  hpCurrent: z.number().int().min(0).max(9999).optional(),
  hpMax: z.number().int().min(1).max(9999).optional(),
  hpTemp: z.number().int().min(0).max(9999).optional(),
  speed: z.string().max(30).optional(),
  hitDice: z.string().max(30).optional(),
  deathSaves: z
    .object({
      successes: z.number().int().min(0).max(3),
      failures: z.number().int().min(0).max(3),
    })
    .optional(),
  saveProficiencies: z.array(z.string()).max(30).optional(),
  attributes: z.array(sheetAttributeSchema).max(30),
  skills: z.array(sheetSkillSchema).max(60).optional(),
  attacks: z.array(sheetAttackSchema).max(40).optional(),
  spellcastingAbility: z.string().max(32).optional(),
  spellSlots: z.array(sheetSpellSlotSchema).max(9).optional(),
  spells: z.array(sheetSpellSchema).max(100).optional(),
  coins: sheetCoinsSchema.optional(),
  inventory: z.array(sheetInventoryItemSchema).max(100),
  notes: z.string().max(5000),
  custom: z.record(z.string(), z.union([z.string(), z.number()])),
});

export function createDefaultDnd5eSkills(): SheetSkill[] {
  return [
    { key: "acrobacia", label: "Acrobacia", abilityKey: "des", proficiency: "none" },
    { key: "arcanismo", label: "Arcanismo", abilityKey: "int", proficiency: "none" },
    { key: "atletismo", label: "Atletismo", abilityKey: "for", proficiency: "none" },
    { key: "atuacao", label: "Atuação", abilityKey: "car", proficiency: "none" },
    { key: "enganacao", label: "Enganação", abilityKey: "car", proficiency: "none" },
    { key: "furtividade", label: "Furtividade", abilityKey: "des", proficiency: "none" },
    { key: "historia", label: "História", abilityKey: "int", proficiency: "none" },
    { key: "intimidacao", label: "Intimidação", abilityKey: "car", proficiency: "none" },
    { key: "intuicao", label: "Intuição", abilityKey: "sab", proficiency: "none" },
    { key: "investigacao", label: "Investigação", abilityKey: "int", proficiency: "none" },
    { key: "lidar_animais", label: "Lidar com Animais", abilityKey: "sab", proficiency: "none" },
    { key: "medicina", label: "Medicina", abilityKey: "sab", proficiency: "none" },
    { key: "natureza", label: "Natureza", abilityKey: "int", proficiency: "none" },
    { key: "percepcao", label: "Percepção", abilityKey: "sab", proficiency: "none" },
    { key: "persuasao", label: "Persuasão", abilityKey: "car", proficiency: "none" },
    { key: "prestidigitacao", label: "Prestidigitação", abilityKey: "des", proficiency: "none" },
    { key: "religiao", label: "Religião", abilityKey: "int", proficiency: "none" },
    { key: "sobrevivencia", label: "Sobrevivência", abilityKey: "sab", proficiency: "none" },
  ];
}

export function createDefaultSpellSlots(): SheetSpellSlotLevel[] {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => ({
    level,
    total: level === 1 ? 2 : 0,
    used: 0,
  }));
}

export function createDefaultSheetData(): SheetData {
  return {
    system: "dnd5e",
    level: 1,
    classOrArchetype: "Guerreiro",
    ancestryOrRace: "Humano (Costa da Espada)",
    backgroundOrFaction: "Aliança dos Lordes",
    armorClass: 16,
    hpCurrent: 12,
    hpMax: 12,
    hpTemp: 0,
    speed: "9m",
    hitDice: "1d10",
    deathSaves: { successes: 0, failures: 0 },
    saveProficiencies: ["for", "con"],
    attributes: [
      { key: "for", label: "Força", value: 15 },
      { key: "des", label: "Destreza", value: 13 },
      { key: "con", label: "Constituição", value: 14 },
      { key: "int", label: "Inteligência", value: 10 },
      { key: "sab", label: "Sabedoria", value: 12 },
      { key: "car", label: "Carisma", value: 8 },
    ],
    skills: createDefaultDnd5eSkills(),
    attacks: [
      {
        id: "atk-1",
        name: "Espada Longa",
        attackBonus: 4,
        damageFormula: "1d8+2",
        damageType: "Cortante",
        rangeOrNotes: "Corpo a corpo (Versátil 1d10)",
      },
    ],
    spellcastingAbility: "int",
    spellSlots: createDefaultSpellSlots(),
    spells: [],
    coins: { cp: 0, sp: 15, ep: 0, gp: 25, pp: 0 },
    inventory: [
      { id: "item-1", name: "Cota de Malha & Escudo", qty: 1 },
      { id: "item-2", name: "Poção de Cura", qty: 2 },
      { id: "item-3", name: "Tocha & Pederneira", qty: 5 },
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

  const candidate = {
    ...defaults,
    ...(raw as Record<string, unknown>),
  };

  const parsed = sheetDataSchema.safeParse(candidate);
  if (parsed.success) {
    return {
      ...defaults,
      ...parsed.data,
      skills:
        parsed.data.skills && parsed.data.skills.length > 0
          ? parsed.data.skills
          : defaults.skills,
      spellSlots:
        parsed.data.spellSlots && parsed.data.spellSlots.length > 0
          ? parsed.data.spellSlots
          : defaults.spellSlots,
      coins: parsed.data.coins ?? defaults.coins,
      deathSaves: parsed.data.deathSaves ?? defaults.deathSaves,
      saveProficiencies:
        parsed.data.saveProficiencies ?? defaults.saveProficiencies,
      attacks: parsed.data.attacks ?? defaults.attacks,
      spells: parsed.data.spells ?? defaults.spells,
    };
  }

  return defaults;
}

export function attributeModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function proficiencyBonusForLevel(level: number): number {
  const safeLevel = Math.min(Math.max(Math.round(level || 1), 1), 30);
  return Math.floor((safeLevel - 1) / 4) + 2;
}

export function findAttributeScore(
  attributes: SheetAttribute[],
  key: string
): number {
  return attributes.find((a) => a.key === key)?.value ?? 10;
}

export function computeSaveBonus(sheet: SheetData, attrKey: string): number {
  const score = findAttributeScore(sheet.attributes, attrKey);
  const mod = attributeModifier(score);
  const isProficient = (sheet.saveProficiencies ?? []).includes(attrKey);
  const prof = isProficient ? proficiencyBonusForLevel(sheet.level) : 0;
  return mod + prof;
}

export function computeSkillBonus(
  sheet: SheetData,
  skill: SheetSkill
): number {
  const score = findAttributeScore(sheet.attributes, skill.abilityKey);
  const mod = attributeModifier(score);
  const prof = proficiencyBonusForLevel(sheet.level);
  if (skill.proficiency === "expertise") {
    return mod + prof * 2;
  }
  if (skill.proficiency === "proficient") {
    return mod + prof;
  }
  return mod;
}

export function computeSpellStats(sheet: SheetData): {
  spellSaveDc: number;
  spellAttackBonus: number;
} {
  const abilityKey = sheet.spellcastingAbility || "int";
  const score = findAttributeScore(sheet.attributes, abilityKey);
  const mod = attributeModifier(score);
  const prof = proficiencyBonusForLevel(sheet.level);
  return {
    spellSaveDc: 8 + prof + mod,
    spellAttackBonus: prof + mod,
  };
}
