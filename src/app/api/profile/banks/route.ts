import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { bank_name, account_last4, is_primary } = (await request.json()) as {
      bank_name?: string;
      account_last4?: string;
      is_primary?: boolean;
    };

    if (!bank_name || !account_last4 || account_last4.length !== 4) {
      return NextResponse.json({ error: "Invalid bank payload" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (is_primary) {
      const { error: resetError } = await supabase
        .from("linked_banks")
        .update({ is_primary: false })
        .eq("user_id", user.id);

      if (resetError) {
        throw new Error(resetError.message);
      }
    }

    const { error } = await supabase.from("linked_banks").insert({
      user_id: user.id,
      bank_name,
      account_last4,
      is_primary: Boolean(is_primary)
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bank add failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
