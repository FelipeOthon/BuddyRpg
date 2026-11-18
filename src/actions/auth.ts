"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { loginSchema, signUpSchema } from "@/lib/validation/schemas";

export interface AuthActionResult {
  ok: boolean;
  error?: string;
  message?: string;
  redirectTo?: string;
}

export async function signInAction(formData: {
  email: string;
  password: string;
  next?: string;
}): Promise<AuthActionResult> {
  if (!getSupabaseEnv().isConfigured) {
    return {
      ok: false,
      error:
        "Supabase ainda não configurado. Preencha o arquivo .env.local conforme docs/MANUAL_INSTALACAO.md.",
    };
  }

  const parsed = loginSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return {
      ok: false,
      error:
        error.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : error.message,
    };
  }

  const nextUrl =
    formData.next && formData.next.startsWith("/")
      ? formData.next
      : "/dashboard";

  revalidatePath("/", "layout");
  return { ok: true, redirectTo: nextUrl };
}

export async function signUpAction(formData: {
  username: string;
  email: string;
  password: string;
  next?: string;
}): Promise<AuthActionResult> {
  if (!getSupabaseEnv().isConfigured) {
    return {
      ok: false,
      error:
        "Supabase ainda não configurado. Preencha o arquivo .env.local conforme docs/MANUAL_INSTALACAO.md.",
    };
  }

  const parsed = signUpSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const nextPath =
    formData.next && formData.next.startsWith("/")
      ? formData.next
      : "/dashboard";

  // Cria o usuário já confirmado via Admin API (evita o limite de 2 e-mails/hora do plano gratuito do Supabase)
  if (process.env.SUPABASE_SECRET_KEY) {
    const adminSupabase = createAdminSupabaseClient();
    const { error: createErr } = await adminSupabase.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: {
        username: parsed.data.username,
      },
    });

    if (createErr) {
      return {
        ok: false,
        error: createErr.message.includes("already been registered")
          ? "Este e-mail já está cadastrado. Use a aba Entrar."
          : createErr.message,
      };
    }

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (signInErr) {
      return { ok: false, error: signInErr.message };
    }

    revalidatePath("/", "layout");
    return { ok: true, redirectTo: nextPath };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        username: parsed.data.username,
      },
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(
        nextPath
      )}`,
    },
  });

  if (error) {
    return {
      ok: false,
      error: error.message,
    };
  }

  revalidatePath("/", "layout");

  if (data.session) {
    return { ok: true, redirectTo: nextPath };
  }

  return {
    ok: true,
    message:
      "Conta criada! Verifique seu e-mail para confirmar o cadastro (ou desative 'Confirm email' no Supabase para login imediato).",
  };
}

export async function signOutAction(): Promise<void> {
  if (getSupabaseEnv().isConfigured) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/login");
}
