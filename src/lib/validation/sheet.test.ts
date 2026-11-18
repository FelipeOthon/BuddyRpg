import { describe, expect, it } from "vitest";
import {
  attributeModifier,
  computeSaveBonus,
  computeSkillBonus,
  computeSpellStats,
  createDefaultSheetData,
  normalizeSheetData,
  proficiencyBonusForLevel,
  sheetDataSchema,
} from "./sheet";

describe("sheet validation, D&D 5e rules and V1->V2 migration", () => {
  it("normalizes empty jsonb {} into complete Roll20/D&D 5e sheet", () => {
    const normalized = normalizeSheetData({});
    expect(normalized.level).toBe(1);
    expect(normalized.system).toBe("dnd5e");
    expect(normalized.attributes).toHaveLength(6);
    expect(normalized.skills).toHaveLength(18);
    expect(normalized.spellSlots).toHaveLength(9);
  });

  it("upgrades a legacy V1 sheet without losing existing attributes or items", () => {
    const legacyV1 = {
      level: 5,
      classOrArchetype: "Mago de Thay",
      attributes: [
        { key: "for", label: "Força", value: 8 },
        { key: "des", label: "Destreza", value: 14 },
        { key: "con", label: "Constituição", value: 12 },
        { key: "int", label: "Inteligência", value: 18 },
        { key: "sab", label: "Sabedoria", value: 12 },
        { key: "car", label: "Carisma", value: 10 },
      ],
      inventory: [{ id: "it-9", name: "Cajado Arcano", qty: 1 }],
      notes: "Discípulo de Elminster",
      custom: {},
    };

    const upgraded = normalizeSheetData(legacyV1);
    expect(upgraded.level).toBe(5);
    expect(upgraded.classOrArchetype).toBe("Mago de Thay");
    expect(upgraded.inventory[0]?.name).toBe("Cajado Arcano");
    expect(upgraded.skills).toHaveLength(18);
  });

  it("computes proficiency bonus, skill bonuses (proficient/expertise), saves and spell DC", () => {
    expect(attributeModifier(10)).toBe(0);
    expect(attributeModifier(18)).toBe(4);
    expect(proficiencyBonusForLevel(1)).toBe(2);
    expect(proficiencyBonusForLevel(5)).toBe(3);
    expect(proficiencyBonusForLevel(17)).toBe(6);

    const sheet = createDefaultSheetData();
    sheet.level = 5; // prof = +3
    sheet.attributes = [
      { key: "for", label: "Força", value: 16 }, // +3
      { key: "des", label: "Destreza", value: 14 }, // +2
      { key: "con", label: "Constituição", value: 14 },
      { key: "int", label: "Inteligência", value: 18 }, // +4
      { key: "sab", label: "Sabedoria", value: 12 }, // +1
      { key: "car", label: "Carisma", value: 10 },
    ];
    sheet.saveProficiencies = ["for"];
    sheet.spellcastingAbility = "int";

    expect(computeSaveBonus(sheet, "for")).toBe(6); // +3 mod + 3 prof
    expect(computeSaveBonus(sheet, "des")).toBe(2); // +2 mod

    expect(
      computeSkillBonus(sheet, {
        key: "furtividade",
        label: "Furtividade",
        abilityKey: "des",
        proficiency: "proficient",
      })
    ).toBe(5); // +2 + 3

    expect(
      computeSkillBonus(sheet, {
        key: "furtividade",
        label: "Furtividade",
        abilityKey: "des",
        proficiency: "expertise",
      })
    ).toBe(8); // +2 + 6

    const spellStats = computeSpellStats(sheet);
    expect(spellStats.spellSaveDc).toBe(15); // 8 + 3 + 4
    expect(spellStats.spellAttackBonus).toBe(7); // 3 + 4

    expect(sheetDataSchema.safeParse(sheet).success).toBe(true);
  });
});
