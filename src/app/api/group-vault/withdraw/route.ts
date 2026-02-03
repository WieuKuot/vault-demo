import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { group_vault_id, member_name, amount } = (await request.json()) as {
      group_vault_id?: string;
      member_name?: string;
      amount?: number;
    };

    if (!group_vault_id || !member_name || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: member, error: memberError } = await supabase
      .from("group_vault_members")
      .select("id, contribution_balance")
      .eq("group_vault_id", group_vault_id)
      .eq("member_name", member_name)
      .single();

    if (memberError || !member) {
      throw new Error(memberError?.message ?? "Member not found");
    }

    if (Number(member.contribution_balance) < amount) {
      throw new Error("Members can only withdraw up to their own contribution");
    }

    const { data: wallet, error: walletError } = await supabase
      .from("vault_wallets")
      .select("id, cash_balance")
      .eq("user_id", user.id)
      .single();

    if (walletError || !wallet) {
      throw new Error(walletError?.message ?? "Wallet not found");
    }

    const { error: memberUpdateError } = await supabase
      .from("group_vault_members")
      .update({ contribution_balance: Number(member.contribution_balance) - amount })
      .eq("id", member.id);

    if (memberUpdateError) {
      throw new Error(memberUpdateError.message);
    }

    const { data: groupVault, error: vaultReadError } = await supabase
      .from("group_vaults")
      .select("total_balance")
      .eq("id", group_vault_id)
      .single();

    if (vaultReadError || !groupVault) {
      throw new Error(vaultReadError?.message ?? "Group vault not found");
    }

    const { error: vaultUpdateError } = await supabase
      .from("group_vaults")
      .update({ total_balance: Number(groupVault.total_balance) - amount })
      .eq("id", group_vault_id);

    if (vaultUpdateError) {
      throw new Error(vaultUpdateError.message);
    }

    const { error: walletUpdateError } = await supabase
      .from("vault_wallets")
      .update({ cash_balance: Number(wallet.cash_balance) + amount })
      .eq("id", wallet.id);

    if (walletUpdateError) {
      throw new Error(walletUpdateError.message);
    }

    await supabase.from("vault_activity").insert({
      user_id: user.id,
      activity_type: "group_vault_withdraw",
      direction: "in",
      amount,
      counterparty: member_name,
      note: "Withdrew member contribution from group vault"
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Group withdrawal failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
