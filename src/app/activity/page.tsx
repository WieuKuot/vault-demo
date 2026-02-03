import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";

type ActivityRow = {
  id: string;
  activity_type: string;
  direction: "in" | "out" | "info";
  amount: number | string;
  counterparty: string | null;
  note: string | null;
  occurred_at: string;
  vaults: { name: string } | null;
};

function labelFor(type: string) {
  const map: Record<string, string> = {
    wallet_top_up: "Added Cash",
    vault_fund: "Funded Vault",
    vault_withdraw_bank: "Vault Withdrawal to Bank",
    vault_pay_vendor: "Paid Vendor",
    vault_early_fee: "Early Withdrawal Fee",
    p2p_send: "Sent Payment",
    p2p_request: "Requested Payment",
    pool_create: "Created Group Vault",
    group_vault_create: "Created Group Vault",
    group_vault_contribution: "Group Vault Contribution",
    group_vault_withdraw: "Group Vault Member Withdrawal",
    group_vault_settle: "Group Vault Settlement"
  };

  return map[type] ?? type;
}

export default async function ActivityPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: rows } = await supabase
    .from("vault_activity")
    .select("id, activity_type, direction, amount, counterparty, note, occurred_at, vaults(name)")
    .eq("user_id", user.id)
    .order("occurred_at", { ascending: false })
    .limit(100);

  return (
    <AppShell title="Activity">
      <section className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-[0_12px_32px_rgba(2,6,23,0.45)] backdrop-blur">
        <h2 className="font-semibold text-slate-100">Recent Activity</h2>
        <ul className="mt-3 space-y-2">
          {((rows ?? []) as ActivityRow[]).map((row) => (
            <li key={row.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-100">{labelFor(row.activity_type)}</p>
                  <p className="text-xs text-slate-400">
                    {row.vaults?.name ? `${row.vaults.name} · ` : ""}
                    {row.counterparty ?? "-"}
                  </p>
                </div>
                <p className={`font-semibold ${row.direction === "out" ? "text-rose-300" : row.direction === "in" ? "text-emerald-300" : "text-slate-300"}`}>
                  {row.direction === "out" ? "-" : row.direction === "in" ? "+" : ""}${Number(row.amount).toFixed(2)}
                </p>
              </div>
              <p className="mt-1 text-xs text-slate-500">{new Date(row.occurred_at).toLocaleString()}</p>
              {row.note ? <p className="mt-1 text-xs text-slate-400">{row.note}</p> : null}
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
