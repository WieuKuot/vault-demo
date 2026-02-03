"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function TransferForm({
  title,
  warning,
  submitLabel,
  fromAccountId,
  toAccountId,
  transactionType
}: {
  title: string;
  warning?: string;
  submitLabel: string;
  fromAccountId: string;
  toAccountId: string;
  transactionType: "deposit" | "withdraw" | "scheduled";
}) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        amount: Number(amount),
        transaction_type: transactionType
      })
    });

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(data.error ?? "Transfer failed.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">{title}</h1>

      {warning ? <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{warning}</p> : null}

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <label className="block text-sm font-medium text-slate-700">
          Amount
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none ring-vault-accent focus:ring"
          />
        </label>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-vault-accent px-4 py-2 font-medium text-white transition hover:bg-vault-accentDark disabled:opacity-60"
        >
          {loading ? "Processing..." : submitLabel}
        </button>

        <Link href="/dashboard" className="block text-center text-sm text-slate-600 underline">
          Back to dashboard
        </Link>
      </form>
    </div>
  );
}
