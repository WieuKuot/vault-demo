import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { title, release_date, destination_type, destination_name, invite_person } = (await request.json()) as {
      title?: string;
      release_date?: string;
      destination_type?: "bank" | "vendor";
      destination_name?: string;
      invite_person?: string;
    };

    if (!title || !release_date) {
      return NextResponse.json({ error: "Title and release date are required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: groupVault, error: createError } = await supabase
      .from("group_vaults")
      .insert({
        user_id: user.id,
        title,
        release_date,
        destination_type: destination_type ?? "vendor",
        destination_name: destination_name ?? null
      })
      .select("id")
      .single();

    if (createError) {
      throw new Error(createError.message);
    }

    const members = [
      { group_vault_id: groupVault.id, member_name: "You", contribution_balance: 0, is_leader: false }
    ];

    if (invite_person && invite_person.trim()) {
      members.push({
        group_vault_id: groupVault.id,
        member_name: invite_person.trim(),
        contribution_balance: 0,
        is_leader: false
      });
    }

    const { error: memberError } = await supabase.from("group_vault_members").insert(members);

    if (memberError) {
      throw new Error(memberError.message);
    }

    await supabase.from("vault_activity").insert({
      user_id: user.id,
      activity_type: "group_vault_create",
      direction: "info",
      amount: 0,
      counterparty: invite_person?.trim() || null,
      note: `Created group vault: ${title}`
    });

    return NextResponse.json({ ok: true, group_vault_id: groupVault.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Create group vault failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
