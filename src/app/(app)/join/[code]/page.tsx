import { Suspense } from "react";
import { redirect } from "next/navigation";
import JoinCampaignCard from "@/components/campaign/JoinCampaignCard";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

async function JoinLoader({
  paramsPromise,
}: {
  paramsPromise: Promise<{ code: string }>;
}) {
  const { code } = await paramsPromise;

  if (!getSupabaseEnv().isConfigured) {
    redirect(`/login?next=${encodeURIComponent(`/join/${code}`)}`);
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/join/${code}`)}`);
  }

  return <JoinCampaignCard code={code} />;
}

export default function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-950 px-4 py-12">
      <Suspense
        fallback={
          <div className="h-72 w-full max-w-md animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/50" />
        }
      >
        <JoinLoader paramsPromise={params} />
      </Suspense>
    </main>
  );
}
