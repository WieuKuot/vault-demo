"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Vault = {
  id: string;
  name: string;
  balance: number | string;
  release_date: string;
  destination_type: "bank" | "vendor";
};

type LinkedBank = {
  id: string;
  bank_name: string;
  account_last4: string;
  is_primary: boolean;
};

type FundPayload = {
  vault_id: string;
  amount: number;
  frequency: "one_time" | "weekly" | "biweekly" | "monthly";
  next_run_at: string | null;
};

type CreatePayload = {
  name: string;
  release_date: string;
  destination_type: "bank" | "vendor";
  destination_name: string;
  routing_number?: string;
  account_number?: string;
};

function computeNextDate(frequency: FundPayload["frequency"], baseDate?: string) {
  const base = baseDate ? new Date(baseDate) : new Date();
  if (Number.isNaN(base.getTime())) return "Invalid date";

  const next = new Date(base);
  if (frequency === "weekly") next.setDate(next.getDate() + 7);
  if (frequency === "biweekly") next.setDate(next.getDate() + 14);
  if (frequency === "monthly") next.setMonth(next.getMonth() + 1);

  return next.toLocaleDateString();
}

function Modal({
  title,
  text,
  onCancel,
  onConfirm,
  confirmText = "Proceed",
  children
}: {
  title: string;
  text: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-slate-950 p-4 text-slate-100 shadow-2xl">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-slate-300">{text}</p>
        {children ? <div className="mt-3">{children}</div> : null}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={onCancel} className="rounded-xl border border-white/20 px-3 py-2 text-sm">
            Do Not Proceed
          </button>
          <button onClick={onConfirm} className="rounded-xl bg-emerald-400 px-3 py-2 text-sm font-semibold text-slate-950">
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

async function postJson(path: string, body: Record<string, unknown>) {
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

export function MoneyPanel({ vaults, linkedBanks }: { vaults: Vault[]; linkedBanks: LinkedBank[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [pendingFund, setPendingFund] = useState<FundPayload | null>(null);
  const [pendingCreate, setPendingCreate] = useState<CreatePayload | null>(null);

  const defaultBank = useMemo(
    () => linkedBanks.find((bank) => bank.is_primary) ?? linkedBanks[0],
    [linkedBanks]
  );

  async function withLoading(name: string, fn: () => Promise<void>) {
    setLoading(name);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      {error ? <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p> : null}

      <section className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-[0_12px_32px_rgba(2,6,23,0.45)] backdrop-blur">
        <h2 className="font-semibold text-slate-100">Add Cash From Linked Bank</h2>
        <form
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            void withLoading("topup", async () => {
              await postJson("/api/vault/top-up", { amount: Number(formData.get("topup_amount")) });
            });
          }}
          className="mt-3 flex gap-2"
        >
          <input
            name="topup_amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="Amount"
            className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-slate-100"
          />
          <button className="rounded-xl bg-emerald-400 px-4 py-2 font-semibold text-slate-950" disabled={loading === "topup"}>
            {loading === "topup" ? "..." : "Add"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-[0_12px_32px_rgba(2,6,23,0.45)] backdrop-blur">
        <h2 className="font-semibold text-slate-100">Move Cash Into a Vault</h2>
        <form
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const frequency = String(formData.get("frequency") ?? "one_time") as FundPayload["frequency"];
            setPendingFund({
              vault_id: String(formData.get("vault_id") ?? ""),
              amount: Number(formData.get("amount")),
              frequency,
              next_run_at: String(formData.get("next_run_at") ?? "") || null
            });
          }}
          className="mt-3 space-y-2"
        >
          <select name="vault_id" required className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-slate-100">
            {vaults.map((vault) => (
              <option key={vault.id} value={vault.id}>
                {vault.name} (${Number(vault.balance).toFixed(2)})
              </option>
            ))}
          </select>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="Amount"
            className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-slate-100"
          />
          <select name="frequency" className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-slate-100">
            <option value="one_time">One-time</option>
            <option value="weekly">Weekly recurring</option>
            <option value="biweekly">Every 2 weeks</option>
            <option value="monthly">Monthly recurring</option>
          </select>
          <input name="next_run_at" type="date" className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-slate-100" />
          <button className="w-full rounded-xl bg-emerald-400 px-4 py-2 font-semibold text-slate-950" disabled={loading === "fund"}>
            {loading === "fund" ? "..." : "Fund Vault"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-[0_12px_32px_rgba(2,6,23,0.45)] backdrop-blur">
        <h2 className="font-semibold text-slate-100">Create New Vault</h2>
        <form
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const destinationType = String(formData.get("destination_type") ?? "bank") as "bank" | "vendor";

            const payload: CreatePayload = {
              name: String(formData.get("name") ?? ""),
              release_date: String(formData.get("release_date") ?? ""),
              destination_type: destinationType,
              destination_name:
                destinationType === "bank"
                  ? (() => {
                      const selectedId = String(formData.get("linked_bank_id") ?? "");
                      const selectedBank =
                        linkedBanks.find((bank) => bank.id === selectedId) ?? defaultBank;
                      return `${selectedBank?.bank_name ?? "Linked Bank"} •••• ${selectedBank?.account_last4 ?? ""}`;
                    })()
                  : String(formData.get("destination_name") ?? ""),
              routing_number:
                destinationType === "vendor" ? String(formData.get("routing_number") ?? "") : undefined,
              account_number:
                destinationType === "vendor" ? String(formData.get("account_number") ?? "") : undefined
            };

            setPendingCreate(payload);
          }}
          className="mt-3 space-y-2"
        >
          <input name="name" required placeholder="Vault name (e.g. Licensing)" className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-slate-100" />
          <input name="release_date" type="date" required className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-slate-100" />
          <select name="destination_type" className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-slate-100">
            <option value="bank">Release to linked bank</option>
            <option value="vendor">Pay vendor directly</option>
          </select>
          <select name="linked_bank_id" className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-slate-100">
            {linkedBanks.map((bank) => (
              <option key={bank.id} value={bank.id}>
                {bank.bank_name} •••• {bank.account_last4}
              </option>
            ))}
          </select>
          <input name="destination_name" placeholder="Vendor name" className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-slate-100" />
          <input name="routing_number" placeholder="Vendor routing number" className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-slate-100" />
          <input name="account_number" placeholder="Vendor account number" className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-slate-100" />
          <button className="w-full rounded-xl border border-white/20 px-4 py-2 text-slate-200" disabled={loading === "create"}>
            {loading === "create" ? "..." : "Create Vault"}
          </button>
        </form>
      </section>

      {pendingFund ? (
        <Modal
          title="Confirm Vault Funding"
          text={`Are you sure? Next payment is scheduled for ${computeNextDate(
            pendingFund.frequency,
            pendingFund.next_run_at ?? undefined
          )}.`}
          onCancel={() => setPendingFund(null)}
          onConfirm={() => {
            void withLoading("fund", async () => {
              await postJson("/api/vault/fund", {
                vault_id: pendingFund.vault_id,
                amount: pendingFund.amount,
                frequency: pendingFund.frequency,
                next_run_at: pendingFund.frequency === "one_time" ? null : pendingFund.next_run_at
              });
              setPendingFund(null);
            });
          }}
        />
      ) : null}

      {pendingCreate ? (
        <Modal
          title="Create Vault Warning"
          text={`This vault blocks standard removal until ${new Date(
            pendingCreate.release_date
          ).toLocaleDateString()}. Early withdrawal before that date has a 5% fee. Continue?`}
          onCancel={() => setPendingCreate(null)}
          onConfirm={() => {
            void withLoading("create", async () => {
              if (
                pendingCreate.destination_type === "vendor" &&
                (!pendingCreate.destination_name || !pendingCreate.routing_number || !pendingCreate.account_number)
              ) {
                throw new Error("Vendor name, routing, and account number are required.");
              }
              await postJson("/api/vault/create", pendingCreate);
              setPendingCreate(null);
            });
          }}
        >
          {pendingCreate.destination_type === "vendor" ? (
            <div className="space-y-2">
              <p className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-2 text-xs text-cyan-200">
                Add vendor payout details before you proceed.
              </p>
              <input
                placeholder="Vendor name"
                value={pendingCreate.destination_name}
                onChange={(e) =>
                  setPendingCreate((prev) => (prev ? { ...prev, destination_name: e.target.value } : prev))
                }
                className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-slate-100"
              />
              <input
                placeholder="Routing number"
                value={pendingCreate.routing_number ?? ""}
                onChange={(e) =>
                  setPendingCreate((prev) => (prev ? { ...prev, routing_number: e.target.value } : prev))
                }
                className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-slate-100"
              />
              <input
                placeholder="Account number"
                value={pendingCreate.account_number ?? ""}
                onChange={(e) =>
                  setPendingCreate((prev) => (prev ? { ...prev, account_number: e.target.value } : prev))
                }
                className="w-full rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-sm text-slate-100"
              />
            </div>
          ) : (
            <p className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-2 text-xs text-emerald-200">
              Vault will release to your linked bank.
            </p>
          )}
        </Modal>
      ) : null}
    </div>
  );
}
