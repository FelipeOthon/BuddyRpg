"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createSceneWallSchema,
  updateSceneEnvironmentSchema,
} from "@/lib/validation/schemas";
import type { Database } from "@/types/database.types";
import type {
  RevealMode,
  Scene,
  SceneWall,
  WallType,
  WeatherPreset,
} from "@/types/domain";

export interface LightingActionResult {
  ok: boolean;
  error?: string;
  scene?: Scene;
  wall?: SceneWall;
}

export async function updateSceneEnvironmentAction(input: {
  sceneId: string;
  campaignId: string;
  ambientLight?: number;
  darknessRevealMode?: RevealMode;
  weatherPreset?: WeatherPreset;
  weatherIntensity?: number;
}): Promise<LightingActionResult> {
  const parsed = updateSceneEnvironmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Configuração de ambiente inválida.",
    };
  }
  const v = parsed.data;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const patch: Database["public"]["Tables"]["scenes"]["Update"] = {};
  if (v.ambientLight !== undefined) patch.ambient_light = v.ambientLight;
  if (v.darknessRevealMode !== undefined)
    patch.darkness_reveal_mode = v.darknessRevealMode;
  if (v.weatherPreset !== undefined) patch.weather_preset = v.weatherPreset;
  if (v.weatherIntensity !== undefined)
    patch.weather_intensity = v.weatherIntensity;

  const { data, error } = await supabase
    .from("scenes")
    .update(patch)
    .eq("id", v.sceneId)
    .select("*")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Não foi possível atualizar o ambiente da cena.",
    };
  }

  return { ok: true, scene: data };
}

export async function createSceneWallAction(input: {
  sceneId: string;
  campaignId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  wallType?: WallType;
}): Promise<LightingActionResult> {
  const parsed = createSceneWallSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Parede inválida.",
    };
  }
  const v = parsed.data;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const { data, error } = await supabase
    .from("scene_walls")
    .insert({
      scene_id: v.sceneId,
      campaign_id: v.campaignId,
      x1: v.x1,
      y1: v.y1,
      x2: v.x2,
      y2: v.y2,
      wall_type: v.wallType ?? "wall",
      is_open: false,
    })
    .select("*")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Não foi possível criar parede/porta.",
    };
  }

  return { ok: true, wall: data };
}

export async function toggleDoorAction(input: {
  wallId: string;
  isOpen: boolean;
}): Promise<LightingActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const { data, error } = await supabase
    .from("scene_walls")
    .update({ is_open: input.isOpen })
    .eq("id", input.wallId)
    .select("*")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Não foi possível abrir/fechar porta.",
    };
  }

  return { ok: true, wall: data };
}

export async function deleteSceneWallAction(input: {
  wallId: string;
}): Promise<LightingActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const { error } = await supabase
    .from("scene_walls")
    .delete()
    .eq("id", input.wallId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function clearSceneWallsAction(input: {
  sceneId: string;
}): Promise<LightingActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const { error } = await supabase
    .from("scene_walls")
    .delete()
    .eq("scene_id", input.sceneId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
