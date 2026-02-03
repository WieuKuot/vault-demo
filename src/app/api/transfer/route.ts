import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type TransferPayload = {
  from_account_id: string;
  to_account_id: string;
  amount: number;
  transaction_type: "deposit" | "withdraw" | "scheduled";
};

async function transferFunds(payload: TransferPayload) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: ownedAccounts, error: accountError } = await supabase
    .from("accounts")
    .select("id")
    .eq("user_id", user.id)
    .in("id", [payload.from_account_id, payload.to_account_id]);

  if (accountError) {
    throw new Error(accountError.message);
  }

  if (!ownedAccounts || ownedAccounts.length !== 2) {
    throw new Error("Invalid accounts");
  }

  const { data, error } = await supabase.rpc("transfer_funds", {
    p_from_account_id: payload.from_account_id,
    p_to_account_id: payload.to_account_id,
    p_amount: payload.amount,
    p_transaction_type: payload.transaction_type
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<TransferPayload>;
    const validTypes = new Set(["deposit", "withdraw", "scheduled"]);

    if (
      !body.from_account_id ||
      !body.to_account_id ||
      typeof body.amount !== "number" ||
      body.amount <= 0 ||
      !body.transaction_type ||
      !validTypes.has(body.transaction_type)
    ) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (body.from_account_id === body.to_account_id) {
      return NextResponse.json({ error: "Accounts must be different" }, { status: 400 });
    }

    await transferFunds(body as TransferPayload);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transfer failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
