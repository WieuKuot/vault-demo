import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk"
});

export const metadata: Metadata = {
  title: "Vault Demo",
  description: "Demo-only Vault app with cash balance, multi-vault controls, and activity."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={spaceGrotesk.variable}>
        <main className="mx-auto min-h-screen max-w-md px-4 py-8">{children}</main>
        <footer className="border-t border-white/10 bg-black/70 px-4 py-3 text-center text-sm text-slate-300 backdrop-blur">
          Demo only. No real money. Balances are simulated.
        </footer>
      </body>
    </html>
  );
}
