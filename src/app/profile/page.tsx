import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { ProfilePanel } from "@/components/profile-panel";
import { VaultLogo } from "@/components/vault-logo";

type ProfileSettings = {
  full_name: string | null;
  business_name: string | null;
  phone: string | null;
  daily_send_limit: number | string;
  two_factor_enabled: boolean;
  biometric_lock: boolean;
  privacy_mode: boolean;
  promos_enabled: boolean;
  shopping_enabled: boolean;
  push_notifications: boolean;
  email_notifications: boolean;
  favorite_payee: string | null;
  theme: string;
};

type LinkedBank = {
  id: string;
  bank_name: string;
  account_last4: string;
  is_primary: boolean;
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: activity }, { data: settings }, { data: banks }] = await Promise.all([
    supabase.from("vault_activity").select("activity_type").eq("user_id", user.id),
    supabase.from("profile_settings").select("*").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("linked_banks")
      .select("id, bank_name, account_last4, is_primary")
      .eq("user_id", user.id)
      .order("is_primary", { ascending: false })
  ]);

  const rows = activity ?? [];
  const feeCount = rows.filter((r) => r.activity_type === "vault_early_fee").length;
  const withdrawCount = rows.filter((r) => r.activity_type === "vault_withdraw_bank").length;
  const disciplineScore = Math.max(0, Math.round((1 - feeCount / Math.max(withdrawCount, 1)) * 100));

  const initialSettings: ProfileSettings = {
    full_name: settings?.full_name ?? null,
    business_name: settings?.business_name ?? null,
    phone: settings?.phone ?? null,
    daily_send_limit: settings?.daily_send_limit ?? 2500,
    two_factor_enabled: settings?.two_factor_enabled ?? false,
    biometric_lock: settings?.biometric_lock ?? false,
    privacy_mode: settings?.privacy_mode ?? false,
    promos_enabled: settings?.promos_enabled ?? true,
    shopping_enabled: settings?.shopping_enabled ?? false,
    push_notifications: settings?.push_notifications ?? true,
    email_notifications: settings?.email_notifications ?? true,
    favorite_payee: settings?.favorite_payee ?? null,
    theme: settings?.theme ?? "onyx"
  };

  return (
    <div className="pb-20">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <VaultLogo />
          <h1 className="text-2xl font-semibold text-slate-100">Profile</h1>
        </div>
        <SignOutButton />
      </header>

      <section className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-[0_12px_32px_rgba(2,6,23,0.45)] backdrop-blur">
        <p className="text-sm text-slate-400">Vault Momentum</p>
        <p className="text-3xl font-semibold text-slate-100">{disciplineScore}% on-plan</p>
        <p className="mt-2 text-sm text-slate-400">
          You protected {Math.max(0, withdrawCount - feeCount)} planned payouts. Keep compounding consistency.
        </p>
      </section>

      <ProfilePanel settings={initialSettings} banks={(banks ?? []) as LinkedBank[]} />

      <div className="mt-4">
        <Link href="/dashboard" className="text-sm text-slate-300 underline">
          Back to Money
        </Link>
      </div>
    </div>
  );
}
