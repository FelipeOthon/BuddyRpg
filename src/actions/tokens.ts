"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import type { Token } from "@/types/domain";

export interface TokenActionResult {
  ok: boolean;
  error?: string;
  token?: Token;
}

export async function createTokenAction(input: {
  sceneId: string;
  campaignId: string;
  name: string;
  imageUrl?: string | null;
  size: number;
  hpCurrent: number;
  hpMax: number;
  ownerId?: string | null;
  characterId?: string | null;
  posX?: number;
  posY?: number;
}): Promise<TokenActionResult> {
  const name = input.name.trim();
  if (name.length < 1 || name.length > 80) {
    return {
      ok: false,
      error: "O nome do token deve ter entre 1 e 80 caracteres.",
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
  const hpMax = Math.max(Math.round(input.hpMax || 10), 1);
  const hpCurrent = Math.min(Math.max(Math.round(input.hpCurrent ?? hpMax), 0), hpMax);
  const size = Math.min(Math.max(Math.round(input.size || 1), 1), 4);

  const { data, error } = await supabase
    .from("tokens")
    .insert({
      scene_id: input.sceneId,
      campaign_id: input.campaignId,
      owner_id: finalOwnerId,
      character_id: input.characterId ?? null,
      name,
      image_url: input.imageUrl ?? null,
      pos_x: input.posX ?? 140,
      pos_y: input.posY ?? 140,
      size,
      hp_current: hpCurrent,
      hp_max: hpMax,
    })
    .select("*")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Não foi possível criar o token.",
    };
  }

  revalidatePath(`/campaign/${input.campaignId}`);
  return { ok: true, token: data };
}

export async function updateTokenStatsAction(input: {
  tokenId: string;
  campaignId: string;
  name?: string;
  hpCurrent?: number;
  hpMax?: number;
  size?: number;
  ownerId?: string | null;
  characterId?: string | null;
}): Promise<TokenActionResult> {
  const supabase = await createServerSupabaseClient();

  const patch: Database["public"]["Tables"]["tokens"]["Update"] = {};
  if (input.name !== undefined) {
    const trimmed = input.name.trim();
    if (trimmed.length < 1 || trimmed.length > 80) {
      return { ok: false, error: "Nome inválido." };
    }
    patch.name = trimmed;
  }
  if (input.hpMax !== undefined) {
    patch.hp_max = Math.max(Math.round(input.hpMax), 1);
  }
  if (input.hpCurrent !== undefined) {
    patch.hp_current = Math.max(Math.round(input.hpCurrent), 0);
  }
  if (input.size !== undefined) {
    patch.size = Math.min(Math.max(Math.round(input.size), 1), 4);
  }
  if (input.ownerId !== undefined) {
    patch.owner_id = input.ownerId;
  }
  if (input.characterId !== undefined) {
    patch.character_id = input.characterId;
  }

  const { data, error } = await supabase
    .from("tokens")
    .update(patch)
    .eq("id", input.tokenId)
    .select("*")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error:
        error?.message ??
        "Permissão negada ou token não encontrado.",
    };
  }

  return { ok: true, token: data };
}

export async function deleteTokenAction(input: {
  tokenId: string;
  campaignId: string;
}): Promise<TokenActionResult> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("tokens")
    .delete()
    .eq("id", input.tokenId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/campaign/${input.campaignId}`);
  return { ok: true };
}
