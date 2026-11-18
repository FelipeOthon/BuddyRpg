import { describe, expect, it } from "vitest";
import {
  attributeModifier,
  createDefaultSheetData,
  normalizeSheetData,
  sheetDataSchema,
} from "./sheet";

describe("sheet validation and normalization", () => {
  it("normalizes empty jsonb {} into default 6-attribute RPG sheet", () => {
    const normalized = normalizeSheetData({});
    expect(normalized.level).toBe(1);
    expect(normalized.attributes).toHaveLength(6);
    expect(normalized.attributes[0]?.label).toBe("Força");
  });

  it("validates custom attributes and inventory items", () => {
    const sheet = createDefaultSheetData();
    sheet.level = 5;
    sheet.classOrArchetype = "Paladino";
    sheet.notes = "Juramento de Devoção";

    const parsed = sheetDataSchema.safeParse(sheet);
    expect(parsed.success).toBe(true);
  });

  it("computes standard D&D attribute modifiers", () => {
    expect(attributeModifier(10)).toBe(0);
    expect(attributeModifier(16)).toBe(3);
    expect(attributeModifier(8)).toBe(-1);
  });
});
