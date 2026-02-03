import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const allowedFields = new Set([
  "full_name",
  "business_name",
  "phone",
  "daily_send_limit",
  "two_factor_enabled",
  "biometric_lock",
  "privacy_mode",
  "promos_enabled",
  "shopping_enabled",
  "push_notifications",
  "email_notifications",
  "favorite_payee",
  "theme"
]);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const updatePayload = Object.fromEntries(
      Object.entries(body).filter(([key]) => allowedFields.has(key))
    );

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("profile_settings")
      .upsert({ user_id: user.id, ...updatePayload, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
