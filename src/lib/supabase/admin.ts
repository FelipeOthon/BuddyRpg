import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getSupabaseEnv } from "./env";

export function createAdminSupabaseClient() {
  const { url } = getSupabaseEnv();
  const secretKey = process.env.SUPABASE_SECRET_KEY ?? "";

  if (!url || !secretKey) {
    throw new Error(
      "SUPABASE_SECRET_KEY ou NEXT_PUBLIC_SUPABASE_URL não configurada no servidor."
    );
  }

  return createClient<Database>(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
