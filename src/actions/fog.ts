"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createFogShapeSchema,
  updateSceneFogSettingsSchema,
} from "@/lib/validation/schemas";
import type { Json } from "@/types/database.types";
import type {
  FogMode,
  FogOperation,
  FogShapeData,
  FogShapeKind,
  Scene,
  SceneFogShape,
} from "@/types/domain";

export interface FogActionResult {
  ok: boolean;
  error?: string;
  shape?: SceneFogShape;
  shapes?: SceneFogShape[];
  scene?: Scene;
}

export async function updateSceneFogSettingsAction(input: {
  sceneId: string;
  campaignId: string;
  fogEnabled: boolean;
  fogMode?: FogMode;
  fogColor?: string;
}): Promise<FogActionResult> {
  const parsed = updateSceneFogSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Configuração de névoa inválida.",
    };
  }
  const v = parsed.data;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const { data, error } = await supabase
    .from("scenes")
    .update({
      fog_enabled: v.fogEnabled,
      ...(v.fogMode !== undefined ? { fog_mode: v.fogMode } : {}),
      ...(v.fogColor !== undefined ? { fog_color: v.fogColor } : {}),
    })
    .eq("id", v.sceneId)
    .select("*")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Não foi possível atualizar a névoa da cena.",
    };
  }

  return { ok: true, scene: data };
}

export async function createFogShapeAction(input: {
  sceneId: string;
  campaignId: string;
  operation: FogOperation;
  shapeKind: FogShapeKind;
  data: FogShapeData;
}): Promise<FogActionResult> {
  const parsed = createFogShapeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Forma de névoa inválida.",
    };
  }
  const v = parsed.data;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const { data, error } = await supabase
    .from("scene_fog_shapes")
    .insert({
      scene_id: v.sceneId,
      campaign_id: v.campaignId,
      operation: v.operation,
      shape_kind: v.shapeKind,
      data: v.data as unknown as Json,
    })
    .select("*")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Erro ao criar forma de névoa.",
    };
  }

  return { ok: true, shape: data };
}

export async function replaceFogShapesAction(input: {
  sceneId: string;
  campaignId: string;
  deleteIds: string[];
  newShapes: Array<{
    operation: FogOperation;
    shapeKind: FogShapeKind;
    data: FogShapeData;
  }>;
}): Promise<FogActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  if (input.deleteIds.length > 0) {
    const { error: delErr } = await supabase
      .from("scene_fog_shapes")
      .delete()
      .in("id", input.deleteIds);
    if (delErr) return { ok: false, error: delErr.message };
  }

  if (input.newShapes.length === 0) {
    return { ok: true, shapes: [] };
  }

  const rows = input.newShapes.map((s) => ({
    scene_id: input.sceneId,
    campaign_id: input.campaignId,
    operation: s.operation,
    shape_kind: s.shapeKind,
    data: s.data as unknown as Json,
  }));

  const { data, error } = await supabase
    .from("scene_fog_shapes")
    .insert(rows)
    .select("*");

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Erro ao atualizar névoa." };
  }

  return { ok: true, shapes: data };
}

export async function clearSceneFogAction(input: {
  sceneId: string;
}): Promise<FogActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const { error } = await supabase
    .from("scene_fog_shapes")
    .delete()
    .eq("scene_id", input.sceneId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function deleteFogShapeAction(input: {
  shapeId: string;
}): Promise<FogActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const { error } = await supabase
    .from("scene_fog_shapes")
    .delete()
    .eq("id", input.shapeId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
