"use server";

import { randomInt } from "node:crypto";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  isDiceCommand,
  parseChatDiceCommand,
} from "@/lib/dice/parser";
import { rollParsedCommand } from "@/lib/dice/roller";
import type { Json } from "@/types/database.types";
import type { MessageRow } from "@/types/domain";

export interface ChatActionResult {
  ok: boolean;
  error?: string;
  message?: MessageRow;
}

export async function sendChatMessageAction(input: {
  campaignId: string;
  content: string;
}): Promise<ChatActionResult> {
  const trimmed = input.content.trim();
  if (trimmed.length < 1 || trimmed.length > 2000) {
    return {
      ok: false,
      error: "A mensagem deve ter entre 1 e 2000 caracteres.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sessão expirada. Faça login novamente." };
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

  // Se for comando /r ou /roll, processa no servidor com RNG criptográfico e grava com SUPABASE_SECRET_KEY
  if (isDiceCommand(trimmed)) {
    const parsed = parseChatDiceCommand(trimmed);
    if (!parsed.ok) {
      return { ok: false, error: parsed.error };
    }

    const rollResult = rollParsedCommand(parsed.value, (sides) =>
      randomInt(1, sides + 1)
    );

    try {
      const adminSupabase = createAdminSupabaseClient();
      const { data, error } = await adminSupabase
        .from("messages")
        .insert({
          campaign_id: input.campaignId,
          user_id: user.id,
          content: trimmed,
          roll_result: rollResult as unknown as Json,
        })
        .select("*")
        .single();

      if (error || !data) {
        return {
          ok: false,
          error: error?.message ?? "Não foi possível registrar a rolagem.",
        };
      }

      return { ok: true, message: data };
    } catch (err) {
      return {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "Configure SUPABASE_SECRET_KEY no servidor para habilitar rolagens auditadas.",
      };
    }
  }

  // Mensagem de texto comum: usa o client autenticado do usuário (roll_result = null)
  const { data, error } = await supabase
    .from("messages")
    .insert({
      campaign_id: input.campaignId,
      user_id: user.id,
      content: trimmed,
    })
    .select("*")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Não foi possível enviar a mensagem.",
    };
  }

  return { ok: true, message: data };
}

export async function loadOlderMessagesAction(input: {
  campaignId: string;
  beforeCreatedAt: string;
}): Promise<{
  ok: boolean;
  error?: string;
  messages?: MessageRow[];
  hasMore?: boolean;
}> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sessão expirada." };
  }

  const limit = 50;
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("campaign_id", input.campaignId)
    .lt("created_at", input.beforeCreatedAt)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Não foi possível carregar mensagens.",
    };
  }

  const hasMore = data.length > limit;
  const page = data.slice(0, limit).reverse();

  return { ok: true, messages: page, hasMore };
}
