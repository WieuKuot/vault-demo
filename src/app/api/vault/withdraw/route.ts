import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Payload = {
  vault_id?: string;
  amount?: number;
  destination?: "bank" | "vendor";
  counterparty?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Payload;

    if (
      !body.vault_id ||
      typeof body.amount !== "number" ||
      body.amount <= 0 ||
      !body.destination
    ) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("vault_withdraw", {
      p_vault_id: body.vault_id,
      p_amount: body.amount,
      p_destination: body.destination,
      p_counterparty: body.counterparty ?? null
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true, result: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Withdraw failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
