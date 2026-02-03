import Link from "next/link";
import { TabNav } from "@/components/tab-nav";
import { VaultLogo } from "@/components/vault-logo";

export function AppShell({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pb-20">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <VaultLogo />
          <h1 className="text-2xl font-semibold text-slate-100">{title}</h1>
        </div>
        <Link
          href="/profile"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-slate-900 text-lg text-slate-200"
          aria-label="Profile and settings"
        >
          👤
        </Link>
      </header>
      {children}
      <TabNav />
    </div>
  );
}
