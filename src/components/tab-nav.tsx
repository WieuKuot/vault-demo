"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/dashboard", label: "Money" },
  { href: "/pay", label: "Pay" },
  { href: "/activity", label: "Activity" }
];

export function TabNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-black/80 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-3">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-2 py-3 text-center text-sm font-medium ${active ? "text-emerald-400" : "text-slate-400"}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
