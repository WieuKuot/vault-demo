import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Payload = {
  name?: string;
  release_date?: string;
  destination_type?: "bank" | "vendor";
  destination_name?: string;
  routing_number?: string;
  account_number?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Payload;

    if (!body.name || !body.release_date || !body.destination_type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (
      body.destination_type === "vendor" &&
      (!body.destination_name || !body.routing_number || !body.account_number)
    ) {
      return NextResponse.json(
        { error: "Vendor name, routing number, and account number are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("vault_create", {
      p_name: body.name,
      p_release_date: body.release_date,
      p_destination_type: body.destination_type,
      p_destination_name: body.destination_name ?? null,
      p_routing_number: body.routing_number ?? null,
      p_account_number: body.account_number ?? null
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Create vault failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
