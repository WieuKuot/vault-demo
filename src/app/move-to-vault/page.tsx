import { TransferForm } from "@/components/transfer-form";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type SearchParams = {
  from?: string;
  to?: string;
};

export default async function MoveToVaultPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;

  if (!params.from || !params.to) {
    return <p className="text-sm text-rose-600">Missing account IDs. Go back to dashboard.</p>;
  }

  return (
    <TransferForm
      title="Move to Vault"
      submitLabel="Submit"
      fromAccountId={params.from}
      toAccountId={params.to}
      transactionType="deposit"
    />
  );
}
