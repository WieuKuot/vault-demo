import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { group_vault_id } = (await request.json()) as { group_vault_id?: string };

    if (!group_vault_id) {
      return NextResponse.json({ error: "Group vault is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: vault, error: vaultError } = await supabase
      .from("group_vaults")
      .select("id, title, release_date, leader_name, all_members_approved, total_balance")
      .eq("id", group_vault_id)
      .eq("user_id", user.id)
      .single();

    if (vaultError || !vault) {
      throw new Error(vaultError?.message ?? "Group vault not found");
    }

    if (new Date().toISOString().slice(0, 10) < vault.release_date) {
      throw new Error("Group vault can only settle on or after the release date");
    }

    const { data: wallet, error: walletError } = await supabase
      .from("vault_wallets")
      .select("id, cash_balance")
      .eq("user_id", user.id)
      .single();

    if (walletError || !wallet) {
      throw new Error(walletError?.message ?? "Wallet not found");
    }

    const { error: walletUpdateError } = await supabase
      .from("vault_wallets")
      .update({ cash_balance: Number(wallet.cash_balance) + Number(vault.total_balance) })
      .eq("id", wallet.id);

    if (walletUpdateError) {
      throw new Error(walletUpdateError.message);
    }

    const note = vault.leader_name && vault.all_members_approved
      ? `Leader ${vault.leader_name} assigned to receive payout at release.`
      : "No approved leader. Funds disbursed back by contribution to members (simulated).";

    await supabase.from("vault_activity").insert({
      user_id: user.id,
      activity_type: "group_vault_settle",
      direction: "in",
      amount: Number(vault.total_balance),
      counterparty: vault.leader_name ?? null,
      note
    });

    const { error: resetVaultError } = await supabase
      .from("group_vaults")
      .update({ total_balance: 0 })
      .eq("id", group_vault_id);

    if (resetVaultError) {
      throw new Error(resetVaultError.message);
    }

    const { error: resetMembersError } = await supabase
      .from("group_vault_members")
      .update({ contribution_balance: 0 })
      .eq("group_vault_id", group_vault_id);

    if (resetMembersError) {
      throw new Error(resetMembersError.message);
    }

    return NextResponse.json({ ok: true, note });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Settle failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
