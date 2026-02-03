import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MoneyPanel } from "@/components/money-panel";
import { createClient } from "@/lib/supabase/server";

type WalletRow = {
  cash_balance: number | string;
};

type VaultRow = {
  id: string;
  name: string;
  balance: number | string;
  release_date: string;
  destination_type: "bank" | "vendor";
};

type LinkedBankRow = {
  id: string;
  bank_name: string;
  account_last4: string;
  is_primary: boolean;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: wallet }, { data: vaults }, { data: linkedBanks }] = await Promise.all([
    supabase.from("vault_wallets").select("cash_balance").eq("user_id", user.id).single(),
    supabase
      .from("vaults")
      .select("id, name, balance, release_date, destination_type")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("linked_banks")
      .select("id, bank_name, account_last4, is_primary")
      .eq("user_id", user.id)
      .order("is_primary", { ascending: false })
  ]);

  const walletBalance = Number((wallet as WalletRow | null)?.cash_balance ?? 0);
  const typedVaults = (vaults ?? []) as VaultRow[];
  const totalVaultBalance = typedVaults.reduce((sum, vault) => sum + Number(vault.balance), 0);

  return (
    <AppShell title="Money">
      <section className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 shadow-[0_12px_32px_rgba(2,6,23,0.45)] backdrop-blur">
        <p className="text-sm text-slate-400">Cash Balance</p>
        <p className="text-4xl font-semibold text-slate-100">${walletBalance.toFixed(2)}</p>
        <p className="mt-4 text-sm text-slate-400">Total Across Vaults</p>
        <p className="text-2xl font-semibold text-cyan-200">${totalVaultBalance.toFixed(2)}</p>
      </section>

      <section className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-[0_12px_32px_rgba(2,6,23,0.45)] backdrop-blur">
        <h2 className="font-semibold text-slate-100">Your Vaults</h2>
        <div className="mt-3 space-y-2">
          {typedVaults.map((vault) => (
            <div key={vault.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-100">{vault.name}</p>
                <p className="font-semibold text-cyan-200">${Number(vault.balance).toFixed(2)}</p>
              </div>
              <p className="text-xs text-slate-400">
                Release: {new Date(vault.release_date).toLocaleDateString()} · {vault.destination_type}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-4">
        <MoneyPanel vaults={typedVaults} linkedBanks={(linkedBanks ?? []) as LinkedBankRow[]} />
      </div>
    </AppShell>
  );
}
