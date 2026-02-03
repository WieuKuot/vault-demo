"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Settings = {
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

type Bank = {
  id: string;
  bank_name: string;
  account_last4: string;
  is_primary: boolean;
};

const panelTitles = [
  "Personal info",
  "Linked banks",
  "Security",
  "Privacy",
  "Favorites",
  "Promos and invites",
  "Shopping",
  "Limits",
  "Your devices",
  "Notifications",
  "Themes",
  "Documents and statements",
  "Support"
] as const;

async function post(path: string, body: Record<string, unknown> = {}) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = (await response.json()) as { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "Request failed");
  }
}

export function ProfilePanel({ settings, banks }: { settings: Settings; banks: Bank[] }) {
  const router = useRouter();
  const [openPanel, setOpenPanel] = useState<string>("Personal info");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function saveSettings(payload: Record<string, unknown>, message: string) {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await post("/api/profile/settings", payload);
      setSuccess(message);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function addDemoCash() {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await post("/api/profile/demo-cash");
      setSuccess("Added $10,000 to your cash balance.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Add cash failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddBank(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      await post("/api/profile/banks", {
        bank_name: String(formData.get("bank_name") ?? ""),
        account_last4: String(formData.get("account_last4") ?? ""),
        is_primary: Boolean(formData.get("is_primary"))
      });
      setSuccess("Linked bank added.");
      router.refresh();
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Add bank failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-[0_12px_32px_rgba(2,6,23,0.45)] backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-slate-100">Account & Settings</h2>
        <button
          onClick={() => void addDemoCash()}
          className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200"
          disabled={busy}
        >
          +$10,000 Cash
        </button>
      </div>

      {error ? <p className="mb-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-200">{error}</p> : null}
      {success ? <p className="mb-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs text-emerald-200">{success}</p> : null}

      <ul className="space-y-2">
        {panelTitles.map((title) => {
          const open = openPanel === title;
          return (
            <li key={title} className="rounded-xl border border-white/10 bg-black/30">
              <button
                onClick={() => setOpenPanel(open ? "" : title)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-slate-200"
              >
                {title}
                <span>{open ? "−" : "+"}</span>
              </button>

              {open ? (
                <div className="border-t border-white/10 p-3 text-sm text-slate-300">
                  {title === "Personal info" ? (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        const fd = new FormData(event.currentTarget);
                        void saveSettings(
                          {
                            full_name: String(fd.get("full_name") ?? ""),
                            business_name: String(fd.get("business_name") ?? ""),
                            phone: String(fd.get("phone") ?? "")
                          },
                          "Personal info saved."
                        );
                      }}
                      className="space-y-2"
                    >
                      <input name="full_name" defaultValue={settings.full_name ?? ""} placeholder="Full name" className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-slate-100" />
                      <input name="business_name" defaultValue={settings.business_name ?? ""} placeholder="Business name" className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-slate-100" />
                      <input name="phone" defaultValue={settings.phone ?? ""} placeholder="Phone" className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-slate-100" />
                      <button className="rounded-lg bg-emerald-400 px-3 py-2 font-semibold text-slate-950" disabled={busy}>Save</button>
                    </form>
                  ) : null}

                  {title === "Linked banks" ? (
                    <div className="space-y-3">
                      <ul className="space-y-1">
                        {banks.map((bank) => (
                          <li key={bank.id} className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-slate-300">
                            {bank.bank_name} •••• {bank.account_last4} {bank.is_primary ? "(Primary)" : ""}
                          </li>
                        ))}
                      </ul>
                      <form onSubmit={handleAddBank} className="space-y-2">
                        <input name="bank_name" placeholder="Bank name" className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-slate-100" required />
                        <input name="account_last4" placeholder="Last 4 digits" maxLength={4} minLength={4} className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-slate-100" required />
                        <label className="flex items-center gap-2 text-xs text-slate-300"><input name="is_primary" type="checkbox" /> Set as primary</label>
                        <button className="rounded-lg border border-white/20 px-3 py-2 text-slate-200" disabled={busy}>Link Bank</button>
                      </form>
                    </div>
                  ) : null}

                  {title === "Security" ? (
                    <div className="space-y-2">
                      <label className="flex items-center justify-between"><span>Two-factor authentication</span><input type="checkbox" defaultChecked={settings.two_factor_enabled} onChange={(e) => void saveSettings({ two_factor_enabled: e.target.checked }, "Security updated.")} /></label>
                      <label className="flex items-center justify-between"><span>Biometric lock</span><input type="checkbox" defaultChecked={settings.biometric_lock} onChange={(e) => void saveSettings({ biometric_lock: e.target.checked }, "Security updated.")} /></label>
                    </div>
                  ) : null}

                  {title === "Privacy" ? (
                    <label className="flex items-center justify-between"><span>Privacy mode</span><input type="checkbox" defaultChecked={settings.privacy_mode} onChange={(e) => void saveSettings({ privacy_mode: e.target.checked }, "Privacy updated.")} /></label>
                  ) : null}

                  {title === "Favorites" ? (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        const fd = new FormData(event.currentTarget);
                        void saveSettings({ favorite_payee: String(fd.get("favorite_payee") ?? "") }, "Favorite updated.");
                      }}
                      className="space-y-2"
                    >
                      <input name="favorite_payee" defaultValue={settings.favorite_payee ?? ""} placeholder="Favorite payee" className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-slate-100" />
                      <button className="rounded-lg border border-white/20 px-3 py-2 text-slate-200" disabled={busy}>Save Favorite</button>
                    </form>
                  ) : null}

                  {title === "Promos and invites" ? (
                    <label className="flex items-center justify-between"><span>Promotions enabled</span><input type="checkbox" defaultChecked={settings.promos_enabled} onChange={(e) => void saveSettings({ promos_enabled: e.target.checked }, "Promos preference updated.")} /></label>
                  ) : null}

                  {title === "Shopping" ? (
                    <label className="flex items-center justify-between"><span>Shopping features</span><input type="checkbox" defaultChecked={settings.shopping_enabled} onChange={(e) => void saveSettings({ shopping_enabled: e.target.checked }, "Shopping preference updated.")} /></label>
                  ) : null}

                  {title === "Limits" ? (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        const fd = new FormData(event.currentTarget);
                        void saveSettings({ daily_send_limit: Number(fd.get("daily_send_limit")) }, "Limit updated.");
                      }}
                      className="space-y-2"
                    >
                      <input name="daily_send_limit" type="number" step="0.01" defaultValue={Number(settings.daily_send_limit)} className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-slate-100" />
                      <button className="rounded-lg border border-white/20 px-3 py-2 text-slate-200" disabled={busy}>Save Limit</button>
                    </form>
                  ) : null}

                  {title === "Your devices" ? (
                    <div className="space-y-1 text-xs">
                      <p>Current device: Browser session (active)</p>
                      <p>Last login: Just now (demo)</p>
                    </div>
                  ) : null}

                  {title === "Notifications" ? (
                    <div className="space-y-2">
                      <label className="flex items-center justify-between"><span>Push notifications</span><input type="checkbox" defaultChecked={settings.push_notifications} onChange={(e) => void saveSettings({ push_notifications: e.target.checked }, "Notification settings updated.")} /></label>
                      <label className="flex items-center justify-between"><span>Email notifications</span><input type="checkbox" defaultChecked={settings.email_notifications} onChange={(e) => void saveSettings({ email_notifications: e.target.checked }, "Notification settings updated.")} /></label>
                    </div>
                  ) : null}

                  {title === "Themes" ? (
                    <select
                      className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-slate-100"
                      defaultValue={settings.theme}
                      onChange={(e) => void saveSettings({ theme: e.target.value }, "Theme preference saved.")}
                    >
                      <option value="onyx">Onyx Steel</option>
                      <option value="minimal">Minimal Light</option>
                    </select>
                  ) : null}

                  {title === "Documents and statements" ? (
                    <ul className="space-y-1 text-xs">
                      <li>Jan Statement (demo PDF)</li>
                      <li>Discipline Report (demo)</li>
                    </ul>
                  ) : null}

                  {title === "Support" ? (
                    <div className="space-y-2">
                      <p className="text-xs">Need help? Create a support ticket and we will follow up in-app.</p>
                      <button className="rounded-lg border border-white/20 px-3 py-2 text-slate-200" onClick={() => setSuccess("Support request submitted (demo).")}>Contact Support</button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
