import { Suspense } from "react";
import { redirect } from "next/navigation";
import DashboardClient, {
  type DashboardCampaignItem,
} from "@/components/campaign/DashboardClient";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

async function DashboardLoader() {
  if (!getSupabaseEnv().isConfigured) {
    redirect("/login");
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  const { data: memberships } = await supabase
    .from("campaign_members")
    .select(
      `
      role,
      campaigns (
        id,
        title,
        invite_code,
        created_at
      )
    `
    )
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  const campaigns: DashboardCampaignItem[] = (memberships ?? []).flatMap(
    (m) => {
      const c = Array.isArray(m.campaigns) ? m.campaigns[0] : m.campaigns;
      if (!c) return [];
      return [
        {
          id: c.id,
          title: c.title,
          invite_code: c.invite_code,
          created_at: c.created_at,
          role: m.role,
        },
      ];
    }
  );

  const username =
    profile?.username ??
    (user.user_metadata?.username as string | undefined) ??
    user.email?.split("@")[0] ??
    "Aventureiro";

  return (
    <DashboardClient
      username={username}
      email={user.email ?? ""}
      campaigns={campaigns}
    />
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center bg-zinc-950 text-sm text-zinc-400">
          Carregando suas campanhas...
        </div>
      }
    >
      <DashboardLoader />
    </Suspense>
  );
}
