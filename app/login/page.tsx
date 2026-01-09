"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    setMsg(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // where to land after OAuth completes
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;

      // Note: signInWithOAuth will redirect away from the page,
      // so no router.push needed here.
    } catch (err: any) {
      setMsg(err?.message ?? "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md border rounded-xl p-6">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="mt-2 text-sm opacity-80">
          Sign in using your Google account.
        </p>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            className="w-full rounded-md border p-3 font-medium"
            onClick={signInWithGoogle}
            disabled={loading}
          >
            {loading ? "Redirecting..." : "Continue with Google"}
          </button>
        </div>

        {msg && <p className="mt-4 text-sm opacity-80">{msg}</p>}
      </div>
    </main>
  );
}
