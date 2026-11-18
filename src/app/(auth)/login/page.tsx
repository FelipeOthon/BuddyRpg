import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";
import { getSupabaseEnv } from "@/lib/supabase/env";

export default function LoginPage() {
  const { isConfigured } = getSupabaseEnv();

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-950 px-4 py-12">
      <Suspense
        fallback={
          <div className="h-96 w-full max-w-md animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/50" />
        }
      >
        <LoginForm isConfigured={isConfigured} />
      </Suspense>
    </main>
  );
}
