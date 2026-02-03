import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { amount } = (await request.json()) as { amount?: number };

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("vault_top_up_wallet", { p_amount: amount });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Top up failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
