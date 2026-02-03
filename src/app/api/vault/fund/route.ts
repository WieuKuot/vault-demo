import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Payload = {
  vault_id?: string;
  amount?: number;
  frequency?: "one_time" | "weekly" | "biweekly" | "monthly";
  next_run_at?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Payload;

    if (!body.vault_id || typeof body.amount !== "number" || body.amount <= 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("vault_fund", {
      p_vault_id: body.vault_id,
      p_amount: body.amount,
      p_frequency: body.frequency ?? "one_time",
      p_next_run_at: body.next_run_at && body.next_run_at.trim() ? body.next_run_at : null
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fund vault failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
