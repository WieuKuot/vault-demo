import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PayPanel } from "@/components/pay-panel";
import { createClient } from "@/lib/supabase/server";

type VaultRow = {
  id: string;
  name: string;
  balance: number | string;
  release_date: string;
  destination_type: "bank" | "vendor";
  destination_name: string | null;
  routing_number: string | null;
  account_number: string | null;
};

type GroupVaultRow = {
  id: string;
  title: string;
  release_date: string;
  destination_type: "bank" | "vendor";
  destination_name: string | null;
  leader_name: string | null;
  all_members_approved: boolean;
  total_balance: number | string;
};

type GroupMemberRow = {
  id: string;
  group_vault_id: string;
  member_name: string;
  contribution_balance: number | string;
  is_leader: boolean;
};

export default async function PayPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: vaults }, { data: groupVaults }, { data: groupMembers }] = await Promise.all([
    supabase
      .from("vaults")
      .select("id, name, balance, release_date, destination_type, destination_name, routing_number, account_number")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("group_vaults")
      .select("id, title, release_date, destination_type, destination_name, leader_name, all_members_approved, total_balance")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("group_vault_members")
      .select("id, group_vault_id, member_name, contribution_balance, is_leader")
      .order("created_at", { ascending: true })
  ]);

  return (
    <AppShell title="Pay">
      <PayPanel
        vaults={(vaults ?? []) as VaultRow[]}
        groupVaults={(groupVaults ?? []) as GroupVaultRow[]}
        groupMembers={(groupMembers ?? []) as GroupMemberRow[]}
      />
    </AppShell>
  );
}
