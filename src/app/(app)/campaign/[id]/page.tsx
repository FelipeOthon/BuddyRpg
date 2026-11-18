import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import CampaignWorkspaceShell, {
  type CampaignMemberInfo,
} from "@/components/campaign/CampaignWorkspaceShell";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

async function CampaignRoomLoader({
  paramsPromise,
}: {
  paramsPromise: Promise<{ id: string }>;
}) {
  const { id } = await paramsPromise;

  if (!getSupabaseEnv().isConfigured) {
    redirect("/login");
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/campaign/${id}`)}`);
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!campaign) {
    notFound();
  }

  const { data: myMembership } = await supabase
    .from("campaign_members")
    .select("role")
    .eq("campaign_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!myMembership) {
    notFound();
  }

  const [
    { data: scenes },
    { data: tokens },
    { data: rawMembers },
    { data: recentMessages },
  ] = await Promise.all([
    supabase
      .from("scenes")
      .select("*")
      .eq("campaign_id", id)
      .order("created_at", { ascending: true }),
    supabase.from("tokens").select("*").eq("campaign_id", id),
    supabase
      .from("campaign_members")
      .select(
        `
        user_id,
        role,
        profiles (
          username
        )
      `
      )
      .eq("campaign_id", id)
      .order("joined_at", { ascending: true }),
    supabase
      .from("messages")
      .select("*")
      .eq("campaign_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const members: CampaignMemberInfo[] = (rawMembers ?? []).map((m) => {
    const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    return {
      userId: m.user_id,
      username: p?.username ?? `user_${m.user_id.slice(0, 6)}`,
      role: m.role,
    };
  });

  const chronologicalMessages = [...(recentMessages ?? [])].reverse();

  return (
    <CampaignWorkspaceShell
      campaign={campaign}
      currentUserId={user.id}
      role={myMembership.role}
      initialScenes={scenes ?? []}
      initialTokens={tokens ?? []}
      initialMessages={chronologicalMessages}
      members={members}
    />
  );
}

export default function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-sm text-zinc-400">
          Carregando mesa de RPG...
        </div>
      }
    >
      <CampaignRoomLoader paramsPromise={params} />
    </Suspense>
  );
}
