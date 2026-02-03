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

    const { data: wallet, error: walletError } = await supabase
      .from("vault_wallets")
      .select("id, cash_balance")
      .eq("user_id", user.id)
      .single();

    if (walletError || !wallet) {
      throw new Error(walletError?.message ?? "Wallet not found");
    }

    if (Number(wallet.cash_balance) < amount) {
      throw new Error("Insufficient cash balance");
    }

    const { data: member, error: memberError } = await supabase
      .from("group_vault_members")
      .select("id, contribution_balance, group_vault_id")
      .eq("group_vault_id", group_vault_id)
      .eq("member_name", member_name)
      .maybeSingle();

    if (memberError) {
      throw new Error(memberError.message);
    }

    if (!member) {
      const { error: addMemberError } = await supabase.from("group_vault_members").insert({
        group_vault_id,
        member_name,
        contribution_balance: 0
      });

      if (addMemberError) {
        throw new Error(addMemberError.message);
      }
    }

    const { error: walletUpdateError } = await supabase
      .from("vault_wallets")
      .update({ cash_balance: Number(wallet.cash_balance) - amount })
      .eq("id", wallet.id);

    if (walletUpdateError) {
      throw new Error(walletUpdateError.message);
    }

    const priorBalance = Number(member?.contribution_balance ?? 0);
    const { error: memberUpdateError } = await supabase
      .from("group_vault_members")
      .update({ contribution_balance: priorBalance + amount })
      .eq("group_vault_id", group_vault_id)
      .eq("member_name", member_name);

    if (memberUpdateError) {
      throw new Error(memberUpdateError.message);
    }

    const { data: groupVault, error: vaultReadError } = await supabase
      .from("group_vaults")
      .select("total_balance")
      .eq("id", group_vault_id)
      .single();

    if (vaultReadError) {
      throw new Error(vaultReadError.message);
    }

    const { error: vaultUpdateError } = await supabase
      .from("group_vaults")
      .update({ total_balance: Number(groupVault.total_balance) + amount })
      .eq("id", group_vault_id)
      .eq("user_id", user.id);

    if (vaultUpdateError) {
      throw new Error(vaultUpdateError.message);
    }

    await supabase.from("vault_activity").insert({
      user_id: user.id,
      activity_type: "group_vault_contribution",
      direction: "out",
      amount,
      counterparty: member_name,
      note: "Added contribution to group vault"
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Contribution failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
