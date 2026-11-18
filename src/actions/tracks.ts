"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createCampaignTrackSchema } from "@/lib/validation/schemas";
import type { CampaignTrack } from "@/types/domain";

export interface TrackActionResult {
  ok: boolean;
  error?: string;
  track?: CampaignTrack;
}

export async function createCampaignTrackAction(input: {
  campaignId: string;
  title: string;
  url: string;
}): Promise<TrackActionResult> {
  const parsed = createCampaignTrackSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados da música inválidos.",
    };
  }
  const v = parsed.data;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const { data, error } = await supabase
    .from("campaign_tracks")
    .insert({
      campaign_id: v.campaignId,
      title: v.title,
      url: v.url,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Não foi possível salvar a música.",
    };
  }

  revalidatePath(`/campaign/${v.campaignId}`);
  return { ok: true, track: data };
}

export async function deleteCampaignTrackAction(input: {
  trackId: string;
  campaignId: string;
}): Promise<TrackActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const { error } = await supabase
    .from("campaign_tracks")
    .delete()
    .eq("id", input.trackId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/campaign/${input.campaignId}`);
  return { ok: true };
}
