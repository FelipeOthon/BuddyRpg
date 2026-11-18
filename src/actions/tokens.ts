"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createTokenSchema,
  updateTokenStatsSchema,
} from "@/lib/validation/schemas";
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
  const parsed = createTokenSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados do token inválidos.",
    };
  }
  const v = parsed.data;

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
    .eq("campaign_id", v.campaignId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return { ok: false, error: "Você não faz parte desta campanha." };
  }

  const isGm = membership.role === "gm";
  const finalOwnerId = isGm ? v.ownerId ?? user.id : user.id;
  const hpMax = v.hpMax;
  const hpCurrent = Math.min(
    Math.max(Math.round(v.hpCurrent ?? hpMax), 0),
    hpMax
  );

  const { data, error } = await supabase
    .from("tokens")
    .insert({
      scene_id: v.sceneId,
      campaign_id: v.campaignId,
      owner_id: finalOwnerId,
      character_id: v.characterId ?? null,
      name: v.name,
      image_url: v.imageUrl ?? null,
      pos_x: v.posX ?? 140,
      pos_y: v.posY ?? 140,
      size: v.size,
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

  revalidatePath(`/campaign/${v.campaignId}`);
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
  isHidden?: boolean;
  conditions?: string[];
}): Promise<TokenActionResult> {
  const parsed = updateTokenStatsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados do token inválidos.",
    };
  }
  const v = parsed.data;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sessão expirada." };
  }

  const patch: Database["public"]["Tables"]["tokens"]["Update"] = {};
  if (v.name !== undefined) patch.name = v.name;
  if (v.hpMax !== undefined) patch.hp_max = v.hpMax;
  if (v.hpCurrent !== undefined) patch.hp_current = v.hpCurrent;
  if (v.size !== undefined) patch.size = v.size;
  if (v.ownerId !== undefined) patch.owner_id = v.ownerId;
  if (v.characterId !== undefined) patch.character_id = v.characterId;
  if (v.conditions !== undefined) patch.conditions = v.conditions;
  if (v.isHidden !== undefined) {
    const { data: membership } = await supabase
      .from("campaign_members")
      .select("role")
      .eq("campaign_id", v.campaignId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membership?.role !== "gm") {
      return {
        ok: false,
        error: "Apenas o Mestre pode ocultar ou revelar tokens.",
      };
    }
    patch.is_hidden = v.isHidden;
  }

  const { data, error } = await supabase
    .from("tokens")
    .update(patch)
    .eq("id", v.tokenId)
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sessão expirada." };
  }

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
