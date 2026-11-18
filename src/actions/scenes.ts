"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DistanceRule, Scene } from "@/types/domain";

export interface SceneActionResult {
  ok: boolean;
  error?: string;
  scene?: Scene;
}

export async function createSceneAction(input: {
  campaignId: string;
  name: string;
}): Promise<SceneActionResult> {
  const name = input.name.trim();
  if (name.length < 1 || name.length > 80) {
    return { ok: false, error: "O nome da cena deve ter entre 1 e 80 caracteres." };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("scenes")
    .insert({
      campaign_id: input.campaignId,
      name,
      is_active: false,
    })
    .select("*")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Não foi possível criar a cena.",
    };
  }

  revalidatePath(`/campaign/${input.campaignId}`);
  return { ok: true, scene: data };
}

export async function updateSceneSettingsAction(input: {
  sceneId: string;
  campaignId: string;
  name: string;
  map_url: string | null;
  map_width: number;
  map_height: number;
  grid_size: number;
  grid_opacity: number;
  snap_to_grid: boolean;
  meters_per_cell: number;
  distance_rule: DistanceRule;
}): Promise<SceneActionResult> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("scenes")
    .update({
      name: input.name.trim(),
      map_url: input.map_url,
      map_width: Math.min(Math.max(Math.round(input.map_width), 200), 10000),
      map_height: Math.min(Math.max(Math.round(input.map_height), 200), 10000),
      grid_size: Math.min(Math.max(Math.round(input.grid_size), 10), 300),
      grid_opacity: Math.min(Math.max(input.grid_opacity, 0), 1),
      snap_to_grid: input.snap_to_grid,
      meters_per_cell: Math.max(input.meters_per_cell, 0.1),
      distance_rule: input.distance_rule,
    })
    .eq("id", input.sceneId)
    .select("*")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Não foi possível atualizar a cena.",
    };
  }

  revalidatePath(`/campaign/${input.campaignId}`);
  return { ok: true, scene: data };
}

export async function activateSceneAction(input: {
  sceneId: string;
  campaignId: string;
}): Promise<SceneActionResult> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("set_active_scene", {
    target_scene_id: input.sceneId,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/campaign/${input.campaignId}`);
  return { ok: true };
}

export async function deleteSceneAction(input: {
  sceneId: string;
  campaignId: string;
}): Promise<SceneActionResult> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("scenes")
    .delete()
    .eq("id", input.sceneId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/campaign/${input.campaignId}`);
  return { ok: true };
}
