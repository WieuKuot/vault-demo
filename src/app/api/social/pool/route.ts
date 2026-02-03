import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { amount, title } = (await request.json()) as {
      amount?: number;
      title?: string;
    };

    if (typeof amount !== "number" || amount <= 0 || !title) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("vault_create_pool", {
      p_amount: amount,
      p_title: title
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pool creation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
