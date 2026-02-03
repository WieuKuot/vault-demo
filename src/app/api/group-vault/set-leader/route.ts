import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { group_vault_id, leader_name, all_members_approved } = (await request.json()) as {
      group_vault_id?: string;
      leader_name?: string;
      all_members_approved?: boolean;
    };

    if (!group_vault_id || !leader_name) {
      return NextResponse.json({ error: "Group vault and leader are required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error: resetError } = await supabase
      .from("group_vault_members")
      .update({ is_leader: false })
      .eq("group_vault_id", group_vault_id);

    if (resetError) {
      throw new Error(resetError.message);
    }

    const { error: leaderError } = await supabase
      .from("group_vault_members")
      .update({ is_leader: true })
      .eq("group_vault_id", group_vault_id)
      .eq("member_name", leader_name);

    if (leaderError) {
      throw new Error(leaderError.message);
    }

    const { error: vaultError } = await supabase
      .from("group_vaults")
      .update({ leader_name, all_members_approved: Boolean(all_members_approved) })
      .eq("id", group_vault_id)
      .eq("user_id", user.id);

    if (vaultError) {
      throw new Error(vaultError.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Set leader failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
