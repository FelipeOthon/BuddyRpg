"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createCampaignSchema,
  joinCampaignSchema,
} from "@/lib/validation/schemas";

export interface CampaignActionResult {
  ok: boolean;
  error?: string;
  campaignId?: string;
}

export async function createCampaignAction(input: {
  title: string;
}): Promise<CampaignActionResult> {
  const parsed = createCampaignSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Título inválido.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sessão expirada. Faça login novamente." };
  }

  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      title: parsed.data.title,
      gm_id: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Não foi possível criar a campanha.",
    };
  }

  revalidatePath("/dashboard");
  return { ok: true, campaignId: data.id };
}

export async function joinCampaignByCodeAction(input: {
  code: string;
}): Promise<CampaignActionResult> {
  const parsed = joinCampaignSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Código inválido.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Você precisa estar logado para entrar." };
  }

  const { data: campaignId, error } = await supabase.rpc("join_campaign", {
    code: parsed.data.code,
  });

  if (error || !campaignId) {
    return {
      ok: false,
      error:
        error?.message?.includes("inválido")
          ? "Código de convite não encontrado."
          : error?.message ?? "Não foi possível entrar na campanha.",
    };
  }

  revalidatePath("/dashboard");
  return { ok: true, campaignId };
}

export async function leaveOrDeleteCampaignAction(input: {
  campaignId: string;
  isGm: boolean;
}): Promise<CampaignActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sessão expirada." };
  }

  if (input.isGm) {
    const { error } = await supabase
      .from("campaigns")
      .delete()
      .eq("id", input.campaignId);
    if (error) {
      return { ok: false, error: error.message };
    }
  } else {
    const { error } = await supabase
      .from("campaign_members")
      .delete()
      .eq("campaign_id", input.campaignId)
      .eq("user_id", user.id);
    if (error) {
      return { ok: false, error: error.message };
    }
  }

  revalidatePath("/dashboard");
  return { ok: true };
}
