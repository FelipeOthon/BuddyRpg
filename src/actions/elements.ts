"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createSceneElementSchema,
  updateSceneElementSchema,
} from "@/lib/validation/schemas";
import type { Database, Json } from "@/types/database.types";
import type {
  SceneElement,
  SceneElementData,
  SceneElementKind,
  SceneElementLayer,
} from "@/types/domain";

export interface SceneElementActionResult {
  ok: boolean;
  error?: string;
  element?: SceneElement;
}

export async function createSceneElementAction(input: {
  sceneId: string;
  campaignId: string;
  layer?: SceneElementLayer;
  kind: SceneElementKind;
  attachedToTokenId?: string | null;
  x?: number;
  y?: number;
  rotation?: number;
  data: SceneElementData;
  isHidden?: boolean;
}): Promise<SceneElementActionResult> {
  const parsed = createSceneElementSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Elemento inválido.",
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
    .from("scene_elements")
    .insert({
      scene_id: v.sceneId,
      campaign_id: v.campaignId,
      created_by: user.id,
      layer: v.layer ?? "drawing",
      kind: v.kind,
      attached_to_token_id: v.attachedToTokenId ?? null,
      x: v.x ?? 0,
      y: v.y ?? 0,
      rotation: v.rotation ?? 0,
      data: v.data as unknown as Json,
      is_hidden: v.isHidden ?? false,
    })
    .select("*")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Não foi possível criar elemento no tabuleiro.",
    };
  }

  return { ok: true, element: data };
}

export async function updateSceneElementAction(input: {
  elementId: string;
  campaignId: string;
  x?: number;
  y?: number;
  rotation?: number;
  attachedToTokenId?: string | null;
  data?: SceneElementData;
  isLocked?: boolean;
  isHidden?: boolean;
}): Promise<SceneElementActionResult> {
  const parsed = updateSceneElementSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Atualização inválida.",
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

  const patch: Database["public"]["Tables"]["scene_elements"]["Update"] = {};
  if (v.x !== undefined) patch.x = v.x;
  if (v.y !== undefined) patch.y = v.y;
  if (v.rotation !== undefined) patch.rotation = v.rotation;
  if (v.attachedToTokenId !== undefined)
    patch.attached_to_token_id = v.attachedToTokenId;
  if (v.data !== undefined) patch.data = v.data as unknown as Json;
  if (v.isLocked !== undefined) patch.is_locked = v.isLocked;
  if (v.isHidden !== undefined) patch.is_hidden = v.isHidden;

  const { data, error } = await supabase
    .from("scene_elements")
    .update(patch)
    .eq("id", v.elementId)
    .select("*")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Sem permissão ou elemento não encontrado.",
    };
  }

  return { ok: true, element: data };
}

export async function deleteSceneElementAction(input: {
  elementId: string;
}): Promise<SceneElementActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sessão expirada." };
  }

  const { error } = await supabase
    .from("scene_elements")
    .delete()
    .eq("id", input.elementId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function clearSceneDrawingsAction(input: {
  sceneId: string;
}): Promise<SceneElementActionResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sessão expirada." };
  }

  const { error } = await supabase
    .from("scene_elements")
    .delete()
    .eq("scene_id", input.sceneId)
    .in("layer", ["drawing", "text"]);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
