export type TransactionRow = {
  id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number | string;
  created_at: string;
};

export function TransactionList({
  transactions,
  mainAccountId,
  vaultAccountId
}: {
  transactions: TransactionRow[];
  mainAccountId: string;
  vaultAccountId: string;
}) {
  return (
    <section className="mt-6 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">Transaction History</h2>
      {transactions.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">No transactions yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {transactions.map((tx) => {
            const direction =
              tx.from_account_id === mainAccountId && tx.to_account_id === vaultAccountId
                ? "Main → Vault"
                : "Vault → Main";

            return (
              <li key={tx.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
                <div>
                  <p className="text-sm font-medium">{direction}</p>
                  <p className="text-xs text-slate-500">{new Date(tx.created_at).toLocaleString()}</p>
                </div>
                <p className="font-semibold">${Number(tx.amount).toFixed(2)}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
