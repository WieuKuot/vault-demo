"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { VaultLogo } from "@/components/vault-logo";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    if (mode === "signin") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setMode("signin");
    setError("Account created. Sign in to continue.");
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/70 p-6 shadow-[0_12px_32px_rgba(2,6,23,0.45)] backdrop-blur">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <VaultLogo />
          <h1 className="text-2xl font-semibold text-slate-100">Vault Demo</h1>
        </div>
        <p className="text-sm text-slate-400">Sign in with email/password to continue.</p>
      </div>

      <label className="block text-sm font-medium text-slate-300">
        Email
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-slate-100 outline-none ring-emerald-400 focus:ring"
        />
      </label>

      <label className="block text-sm font-medium text-slate-300">
        Password
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/20 bg-black/40 px-3 py-2 text-slate-100 outline-none ring-emerald-400 focus:ring"
        />
      </label>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-emerald-400 px-4 py-2 font-medium text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
      >
        {loading ? "Working..." : mode === "signin" ? "Sign in" : "Create account"}
      </button>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
        }}
        className="w-full text-sm text-slate-400 underline"
      >
        {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
      </button>
    </form>
  );
}
