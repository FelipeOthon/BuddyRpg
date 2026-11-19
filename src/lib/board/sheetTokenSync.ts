import {
  createCharacterAction,
  updateCharacterSheetAction,
} from "@/actions/characters";
import { normalizeSheetData } from "@/lib/validation/sheet";
import type { BestiaryAttackPreset } from "@/lib/assets/bestiary";
import type { CharacterRow, SheetData } from "@/types/domain";

export async function createLinkedSheetForEntity(params: {
  campaignId: string;
  name: string;
  ownerId?: string;
  hpMax?: number;
  hpCurrent?: number;
  armorClass?: number;
  classOrArchetype?: string;
  ancestryOrRace?: string;
  speed?: string;
  attacks?: BestiaryAttackPreset[];
}): Promise<{ ok: boolean; character?: CharacterRow; error?: string }> {
  const created = await createCharacterAction({
    campaignId: params.campaignId,
    name: params.name,
    ownerId: params.ownerId,
  });

  if (!created.ok || !created.character) {
    return {
      ok: false,
      error: created.error ?? "Não foi possível criar a ficha.",
    };
  }

  const baseSheet = normalizeSheetData(created.character.sheet_data);
  const maxHp = Math.max(1, Math.round(params.hpMax ?? baseSheet.hpMax ?? 20));
  const curHp = Math.min(
    Math.max(0, Math.round(params.hpCurrent ?? maxHp)),
    maxHp
  );

  const nextSheet: SheetData = {
    ...baseSheet,
    hpMax: maxHp,
    hpCurrent: curHp,
    ...(params.armorClass !== undefined ? { armorClass: params.armorClass } : {}),
    ...(params.classOrArchetype
      ? { classOrArchetype: params.classOrArchetype }
      : {}),
    ...(params.ancestryOrRace ? { ancestryOrRace: params.ancestryOrRace } : {}),
    ...(params.speed ? { speed: params.speed } : {}),
    ...(params.attacks && params.attacks.length > 0
      ? {
          attacks: params.attacks.map((atk, idx) => ({
            id: `preset-${Date.now()}-${idx}`,
            name: atk.name,
            attackBonus: atk.attackBonus,
            damageFormula: atk.damageFormula,
            damageType: atk.damageType,
            ...(atk.rangeOrNotes ? { rangeOrNotes: atk.rangeOrNotes } : {}),
          })),
        }
      : {}),
  };

  const updated = await updateCharacterSheetAction({
    characterId: created.character.id,
    campaignId: params.campaignId,
    name: params.name,
    sheetData: nextSheet,
  });

  if (updated.ok && updated.character) {
    return { ok: true, character: updated.character };
  }

  return { ok: true, character: created.character };
}

export async function syncHpToLinkedCharacter(params: {
  character: CharacterRow;
  campaignId: string;
  hpCurrent: number;
  hpMax?: number;
}): Promise<CharacterRow | null> {
  const curSheet = normalizeSheetData(params.character.sheet_data);
  const nextMax =
    params.hpMax !== undefined
      ? Math.max(1, Math.round(params.hpMax))
      : (curSheet.hpMax ?? 20);
  const nextCur = Math.min(Math.max(0, Math.round(params.hpCurrent)), nextMax);

  if (curSheet.hpCurrent === nextCur && curSheet.hpMax === nextMax) {
    return null;
  }

  const res = await updateCharacterSheetAction({
    characterId: params.character.id,
    campaignId: params.campaignId,
    name: params.character.name,
    sheetData: {
      ...curSheet,
      hpCurrent: nextCur,
      hpMax: nextMax,
    },
  });

  return res.ok && res.character ? res.character : null;
}
