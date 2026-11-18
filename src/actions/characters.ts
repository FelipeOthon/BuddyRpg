"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createDefaultSheetData,
  sheetDataSchema,
} from "@/lib/validation/sheet";
import type { Json } from "@/types/database.types";
import type { CharacterRow, SheetData } from "@/types/domain";

export interface CharacterActionResult {
  ok: boolean;
  error?: string;
  character?: CharacterRow;
}

export async function createCharacterAction(input: {
  campaignId: string;
  name: string;
  ownerId?: string;
}): Promise<CharacterActionResult> {
  const name = input.name.trim();
  if (name.length < 1 || name.length > 80) {
    return {
      ok: false,
      error: "O nome do personagem deve ter entre 1 e 80 caracteres.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sessão expirada." };
  }

  const { data: membership } = await supabase
    .from("campaign_members")
    .select("role")
    .eq("campaign_id", input.campaignId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return { ok: false, error: "Você não faz parte desta campanha." };
  }

  const isGm = membership.role === "gm";
  const finalOwnerId = isGm ? input.ownerId ?? user.id : user.id;
  const initialSheet = createDefaultSheetData();

  const { data, error } = await supabase
    .from("characters")
    .insert({
      campaign_id: input.campaignId,
      owner_id: finalOwnerId,
      name,
      sheet_data: initialSheet as unknown as Json,
      player_can_edit: true,
    })
    .select("*")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Não foi possível criar a ficha.",
    };
  }

  revalidatePath(`/campaign/${input.campaignId}`);
  return { ok: true, character: data };
}

export async function updateCharacterSheetAction(input: {
  characterId: string;
  campaignId: string;
  name: string;
  sheetData: SheetData;
}): Promise<CharacterActionResult> {
  const trimmedName = input.name.trim();
  if (trimmedName.length < 1 || trimmedName.length > 80) {
    return {
      ok: false,
      error: "O nome do personagem deve ter entre 1 e 80 caracteres.",
    };
  }

  const parsed = sheetDataSchema.safeParse(input.sheetData);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados da ficha inválidos.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("characters")
    .update({
      name: trimmedName,
      sheet_data: parsed.data as unknown as Json,
    })
    .eq("id", input.characterId)
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      error:
        error?.message ??
        "Edição bloqueada pelo Mestre ou sem permissão para alterar esta ficha.",
    };
  }

  return { ok: true, character: data };
}

export async function toggleCharacterEditLockAction(input: {
  characterId: string;
  campaignId: string;
  canEdit: boolean;
}): Promise<CharacterActionResult> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("set_character_edit_lock", {
    target_character_id: input.characterId,
    can_edit: input.canEdit,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const { data } = await supabase
    .from("characters")
    .select("*")
    .eq("id", input.characterId)
    .maybeSingle();

  revalidatePath(`/campaign/${input.campaignId}`);
  return { ok: true, ...(data ? { character: data } : {}) };
}

export async function deleteCharacterAction(input: {
  characterId: string;
  campaignId: string;
}): Promise<CharacterActionResult> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("characters")
    .delete()
    .eq("id", input.characterId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/campaign/${input.campaignId}`);
  return { ok: true };
}
