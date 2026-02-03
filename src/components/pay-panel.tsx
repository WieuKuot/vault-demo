"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Vault = {
  id: string;
  name: string;
  balance: number | string;
  release_date: string;
  destination_type: "bank" | "vendor";
  destination_name: string | null;
  routing_number: string | null;
  account_number: string | null;
};

type GroupVault = {
  id: string;
  title: string;
  release_date: string;
  destination_type: "bank" | "vendor";
  destination_name: string | null;
  leader_name: string | null;
  all_members_approved: boolean;
  total_balance: number | string;
};

type GroupMember = {
  id: string;
  group_vault_id: string;
  member_name: string;
  contribution_balance: number | string;
  is_leader: boolean;
};

async function postJson(path: string, body: Record<string, unknown>) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = (await response.json()) as { error?: string; result?: { fee?: number; early?: boolean }; note?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "Request failed");
  }

  return data;
}

function Modal({
  title,
  text,
  onCancel,
  onConfirm,
  confirmText = "Proceed"
}: {
  title: string;
  text: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-slate-950 p-4 text-slate-100 shadow-2xl">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-slate-300">{text}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={onCancel} className="rounded-xl border border-white/20 px-3 py-2 text-sm">
            Do Not Proceed
          </button>
          <button onClick={onConfirm} className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-medium text-slate-950">
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PayPanel({
  vaults,
  groupVaults,
  groupMembers
}: {
  vaults: Vault[];
  groupVaults: GroupVault[];
  groupMembers: GroupMember[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [pendingWithdraw, setPendingWithdraw] = useState<FormData | null>(null);

  const membersByGroup = useMemo(() => {
    const map = new Map<string, GroupMember[]>();
    groupMembers.forEach((member) => {
      const existing = map.get(member.group_vault_id) ?? [];
      existing.push(member);
      map.set(member.group_vault_id, existing);
    });
    return map;
  }, [groupMembers]);

  async function withStatus(name: string, fn: () => Promise<void>) {
    setLoading(name);
    setError(null);
    setSuccess(null);
    try {
      await fn();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(null);
    }
  }

  async function confirmWithdraw() {
    if (!pendingWithdraw) return;
    await withStatus("withdraw", async () => {
      const result = await postJson("/api/vault/withdraw", {
        vault_id: String(pendingWithdraw.get("vault_id") ?? ""),
        amount: Number(pendingWithdraw.get("amount")),
        destination: String(pendingWithdraw.get("destination") ?? "bank"),
        counterparty: String(pendingWithdraw.get("counterparty") ?? "")
      });

      const fee = Number(result.result?.fee ?? 0);
      setSuccess(fee > 0 ? `Payout complete. Early fee charged: $${fee.toFixed(2)}.` : "Payout complete.");
      setPendingWithdraw(null);
    });
  }

  return (
    <div className="space-y-4">
      {error ? <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p> : null}
      {success ? <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{success}</p> : null}

      <section className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-[0_12px_32px_rgba(2,6,23,0.45)] backdrop-blur">
        <h2 className="font-semibold text-slate-100">Send Cash</h2>
        <form
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            void withStatus("send", async () => {
              await postJson("/api/social/send", {
                amount: Number(formData.get("send_amount")),
                counterparty: String(formData.get("send_to") ?? "")
              });
              setSuccess("Payment sent.");
            });
          }}
          className="mt-3 space-y-2"
        >
          <input name="send_to" required placeholder="Recipient" className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-slate-100" />
          <input name="send_amount" type="number" min="0.01" step="0.01" required placeholder="Amount" className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-slate-100" />
          <button className="w-full rounded-xl bg-emerald-400 px-4 py-2 font-semibold text-slate-950" disabled={loading === "send"}>
            {loading === "send" ? "..." : "Send"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-[0_12px_32px_rgba(2,6,23,0.45)] backdrop-blur">
        <h2 className="font-semibold text-slate-100">Request Cash</h2>
        <form
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            void withStatus("request", async () => {
              await postJson("/api/social/request", {
                amount: Number(formData.get("request_amount")),
                counterparty: String(formData.get("request_from") ?? "")
              });
              setSuccess("Request created.");
            });
          }}
          className="mt-3 space-y-2"
        >
          <input name="request_from" required placeholder="Request from" className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-slate-100" />
          <input name="request_amount" type="number" min="0.01" step="0.01" required placeholder="Amount" className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-slate-100" />
          <button className="w-full rounded-xl border border-white/20 px-4 py-2 text-slate-200" disabled={loading === "request"}>
            {loading === "request" ? "..." : "Request"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-[0_12px_32px_rgba(2,6,23,0.45)] backdrop-blur">
        <h2 className="font-semibold text-slate-100">Group Vault</h2>
        <p className="mt-1 text-xs text-slate-400">Invite people, track contributions, and settle at release date.</p>

        <form
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            void withStatus("group-create", async () => {
              await postJson("/api/group-vault/create", {
                title: String(formData.get("group_title") ?? ""),
                release_date: String(formData.get("group_release_date") ?? ""),
                destination_type: String(formData.get("group_destination_type") ?? "vendor"),
                destination_name: String(formData.get("group_destination_name") ?? ""),
                invite_person: String(formData.get("group_invite_person") ?? "")
              });
              setSuccess("Group Vault created and invite recorded.");
              event.currentTarget.reset();
            });
          }}
          className="mt-3 space-y-2"
        >
          <input name="group_title" required placeholder="Group Vault name" className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-slate-100" />
          <input name="group_invite_person" placeholder="Invite person" className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-slate-100" />
          <input name="group_release_date" type="date" required className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-slate-100" />
          <select name="group_destination_type" className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-slate-100">
            <option value="vendor">Pay vendor</option>
            <option value="bank">Return to bank</option>
          </select>
          <input name="group_destination_name" placeholder="Vendor / bank label" className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-slate-100" />
          <button className="w-full rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-4 py-2 text-cyan-200" disabled={loading === "group-create"}>
            {loading === "group-create" ? "..." : "Create Group Vault"}
          </button>
        </form>

        <div className="mt-4 space-y-3">
          {groupVaults.map((groupVault) => {
            const members = membersByGroup.get(groupVault.id) ?? [];
            return (
              <div key={groupVault.id} className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-100">{groupVault.title}</p>
                  <p className="text-sm font-semibold text-cyan-200">${Number(groupVault.total_balance).toFixed(2)}</p>
                </div>
                <p className="text-xs text-slate-400">
                  Release {new Date(groupVault.release_date).toLocaleDateString()} · Leader: {groupVault.leader_name ?? "None"}
                </p>
                <ul className="mt-2 space-y-1 text-xs text-slate-300">
                  {members.map((member) => (
                    <li key={member.id}>
                      {member.member_name}: ${Number(member.contribution_balance).toFixed(2)} {member.is_leader ? "(leader)" : ""}
                    </li>
                  ))}
                </ul>

                <form
                  onSubmit={(event: FormEvent<HTMLFormElement>) => {
                    event.preventDefault();
                    const fd = new FormData(event.currentTarget);
                    void withStatus(`group-contribute-${groupVault.id}`, async () => {
                      await postJson("/api/group-vault/contribute", {
                        group_vault_id: groupVault.id,
                        member_name: String(fd.get("member_name") ?? "You"),
                        amount: Number(fd.get("contribution_amount"))
                      });
                      setSuccess("Contribution added to Group Vault.");
                    });
                  }}
                  className="mt-3 grid grid-cols-2 gap-2"
                >
                  <input name="member_name" placeholder="Person" className="rounded-lg border border-white/20 bg-black/40 px-2 py-2 text-xs text-slate-100" required />
                  <input name="contribution_amount" type="number" min="0.01" step="0.01" placeholder="Amount" className="rounded-lg border border-white/20 bg-black/40 px-2 py-2 text-xs text-slate-100" required />
                  <button className="col-span-2 rounded-lg border border-white/20 px-3 py-2 text-xs text-slate-200">Add Contribution</button>
                </form>

                <form
                  onSubmit={(event: FormEvent<HTMLFormElement>) => {
                    event.preventDefault();
                    const fd = new FormData(event.currentTarget);
                    void withStatus(`group-leader-${groupVault.id}`, async () => {
                      await postJson("/api/group-vault/set-leader", {
                        group_vault_id: groupVault.id,
                        leader_name: String(fd.get("leader_name") ?? ""),
                        all_members_approved: Boolean(fd.get("all_members_approved"))
                      });
                      setSuccess("Leader assignment updated.");
                    });
                  }}
                  className="mt-2 grid grid-cols-2 gap-2"
                >
                  <input name="leader_name" placeholder="Group leader" className="rounded-lg border border-white/20 bg-black/40 px-2 py-2 text-xs text-slate-100" required />
                  <label className="flex items-center gap-2 rounded-lg border border-white/20 px-2 py-2 text-xs text-slate-300">
                    <input name="all_members_approved" type="checkbox" /> All agree
                  </label>
                  <button className="col-span-2 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-200">Assign Leader</button>
                </form>

                <form
                  onSubmit={(event: FormEvent<HTMLFormElement>) => {
                    event.preventDefault();
                    const fd = new FormData(event.currentTarget);
                    void withStatus(`group-withdraw-${groupVault.id}`, async () => {
                      await postJson("/api/group-vault/withdraw", {
                        group_vault_id: groupVault.id,
                        member_name: String(fd.get("withdraw_member_name") ?? ""),
                        amount: Number(fd.get("withdraw_amount"))
                      });
                      setSuccess("Member withdrawal processed (contribution-limited). ");
                    });
                  }}
                  className="mt-2 grid grid-cols-2 gap-2"
                >
                  <input name="withdraw_member_name" placeholder="Member name" className="rounded-lg border border-white/20 bg-black/40 px-2 py-2 text-xs text-slate-100" required />
                  <input name="withdraw_amount" type="number" min="0.01" step="0.01" placeholder="Withdraw amount" className="rounded-lg border border-white/20 bg-black/40 px-2 py-2 text-xs text-slate-100" required />
                  <button className="col-span-2 rounded-lg border border-white/20 px-3 py-2 text-xs text-slate-200">Withdraw Own Contribution</button>
                </form>

                <button
                  onClick={() => {
                    void withStatus(`group-settle-${groupVault.id}`, async () => {
                      const response = await postJson("/api/group-vault/settle", { group_vault_id: groupVault.id });
                      setSuccess(response.note ?? "Group vault settled.");
                    });
                  }}
                  className="mt-2 w-full rounded-lg bg-emerald-400 px-3 py-2 text-xs font-semibold text-slate-950"
                >
                  Settle Group Vault on Release Date
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-[0_12px_32px_rgba(2,6,23,0.45)] backdrop-blur">
        <h2 className="font-semibold text-slate-100">Vault Payouts</h2>
        <div className="mt-3 space-y-2">
          {vaults.map((vault) => (
            <div key={vault.id} className="rounded-xl border border-white/15 bg-black/30 p-3">
              <p className="font-medium text-slate-100">{vault.name}</p>
              <p className="text-sm text-slate-400">
                Release: {new Date(vault.release_date).toLocaleDateString()} · Balance: ${Number(vault.balance).toFixed(2)}
              </p>
              <p className="text-xs text-slate-500">
                Destination: {vault.destination_type === "bank" ? "Linked Bank" : vault.destination_name ?? "Vendor"} · Routing {vault.routing_number ?? "-"} · Acct {vault.account_number ?? "-"}
              </p>
            </div>
          ))}
        </div>

        <form
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            setPendingWithdraw(new FormData(event.currentTarget));
          }}
          className="mt-3 space-y-2"
        >
          <select name="vault_id" required className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-slate-100">
            {vaults.map((vault) => (
              <option key={vault.id} value={vault.id}>
                {vault.name}
              </option>
            ))}
          </select>
          <input name="amount" type="number" min="0.01" step="0.01" required placeholder="Amount" className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-slate-100" />
          <select name="destination" className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-slate-100">
            <option value="bank">Withdraw to linked bank</option>
            <option value="vendor">Pay vendor directly</option>
          </select>
          <input name="counterparty" placeholder="Vendor / destination label" className="w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-slate-100" />
          <button className="w-full rounded-xl bg-emerald-400 px-4 py-2 font-semibold text-slate-950" disabled={loading === "withdraw"}>
            {loading === "withdraw" ? "..." : "Continue Payout"}
          </button>
        </form>
      </section>

      {pendingWithdraw ? (
        <Modal
          title="Payout Warning"
          text="If this payout is before the vault release date, a 5% fee will be charged whether payout goes to bank or vendor. Proceed?"
          onCancel={() => setPendingWithdraw(null)}
          onConfirm={() => void confirmWithdraw()}
          confirmText="Proceed"
        />
      ) : null}
    </div>
  );
}
