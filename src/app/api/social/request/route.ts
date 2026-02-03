import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { amount, counterparty } = (await request.json()) as {
      amount?: number;
      counterparty?: string;
    };

    if (typeof amount !== "number" || amount <= 0 || !counterparty) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("vault_request_payment", {
      p_amount: amount,
      p_counterparty: counterparty
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
