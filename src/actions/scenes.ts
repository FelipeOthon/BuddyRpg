"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  combatStateSchema,
  createSceneSchema,
  updateSceneSettingsSchema,
} from "@/lib/validation/schemas";
import type { Json } from "@/types/database.types";
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
  const parsed = createSceneSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados da cena inválidos.",
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

  const { data, error } = await supabase
    .from("scenes")
    .insert({
      campaign_id: v.campaignId,
      name: v.name,
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

  revalidatePath(`/campaign/${v.campaignId}`);
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
  const parsed = updateSceneSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ??
        "Configurações da cena inválidas.",
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

  const { data, error } = await supabase
    .from("scenes")
    .update({
      name: v.name,
      map_url: v.map_url,
      map_width: v.map_width,
      map_height: v.map_height,
      grid_size: v.grid_size,
      grid_opacity: v.grid_opacity,
      snap_to_grid: v.snap_to_grid,
      meters_per_cell: v.meters_per_cell,
      distance_rule: v.distance_rule,
    })
    .eq("id", v.sceneId)
    .select("*")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Não foi possível atualizar a cena.",
    };
  }

  revalidatePath(`/campaign/${v.campaignId}`);
  return { ok: true, scene: data };
}

export async function activateSceneAction(input: {
  sceneId: string;
  campaignId: string;
}): Promise<SceneActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sessão expirada." };
  }

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sessão expirada." };
  }

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

export async function updateSceneCombatStateAction(input: {
  sceneId: string;
  campaignId: string;
  combatState: {
    active: boolean;
    round: number;
    turnIndex: number;
    combatants: Array<{ tokenId: string; name: string; initiative: number }>;
  };
}): Promise<SceneActionResult> {
  const parsed = combatStateSchema.safeParse(input.combatState);
  if (!parsed.success) {
    return { ok: false, error: "Estado de combate inválido." };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sessão expirada." };
  }

  const { data, error } = await supabase
    .from("scenes")
    .update({
      combat_state: parsed.data as unknown as Json,
    })
    .eq("id", input.sceneId)
    .select("*")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Não foi possível salvar o estado de combate.",
    };
  }

  return { ok: true, scene: data };
}
