"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type SwitchRow = {
  id: string;
  created_at: string;
  user_id: string;
  name: string;
  interval_days: number;
  grace_days: number;
  status: string;
};

export default function DashboardPage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [switches, setSwitches] = useState<SwitchRow[]>([]);
  const [name, setName] = useState("");
  const [intervalDays, setIntervalDays] = useState(30);
  const [graceDays, setGraceDays] = useState(3);

  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadSwitches() {
    const { data, error } = await supabase
      .from("switches")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMsg(error.message);
      return;
    }

    setSwitches((data ?? []) as SwitchRow[]);
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) {
        router.replace("/login");
        return;
      }

      setEmail(user.email ?? null);
      await loadSwitches();
      setLoading(false);
    })();
  }, [router]);

  async function createSwitch(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    const cleanedName = name.trim();
    if (!cleanedName) {
      setMsg("Name is required.");
      setSaving(false);
      return;
    }

    // IMPORTANT: do not send user_id — DB default auth.uid() will set it
    const { error } = await supabase.from("switches").insert({
      name: cleanedName,
      interval_days: intervalDays,
      grace_days: graceDays,
      status: "active",
    });

    if (error) {
      setMsg(error.message);
      setSaving(false);
      return;
    }

    setName("");
    setIntervalDays(30);
    setGraceDays(3);
    await loadSwitches();
    setSaving(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) return <main className="p-6">Loading...</main>;

  return (
    <main className="p-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-1 text-sm opacity-80">Signed in as: {email}</p>
        </div>

        <button className="border rounded-md px-4 py-2" onClick={signOut}>
          Sign out
        </button>
      </div>

      <section className="mt-8 border rounded-xl p-4">
        <h2 className="font-semibold">Create a Switch</h2>

        <form onSubmit={createSwitch} className="mt-4 space-y-3">
          <input
            className="w-full border rounded-md p-3"
            placeholder="Switch name (e.g., Monthly Check-in)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <div className="text-sm opacity-80">Check-in interval (days)</div>
              <input
                className="w-full border rounded-md p-3"
                type="number"
                min={1}
                value={intervalDays}
                onChange={(e) => setIntervalDays(Number(e.target.value))}
                required
              />
            </label>

            <label className="space-y-1">
              <div className="text-sm opacity-80">Grace period (days)</div>
              <input
                className="w-full border rounded-md p-3"
                type="number"
                min={0}
                value={graceDays}
                onChange={(e) => setGraceDays(Number(e.target.value))}
                required
              />
            </label>
          </div>

          <button className="w-full border rounded-md p-3 font-medium" disabled={saving}>
            {saving ? "Saving..." : "Create Switch"}
          </button>

          {msg && <p className="text-sm opacity-80">{msg}</p>}
        </form>
      </section>

      <section className="mt-8">
        <h2 className="font-semibold">Your Switches</h2>

        <div className="mt-3 space-y-3">
          {switches.length === 0 ? (
            <p className="text-sm opacity-80">No switches yet. Create your first one above.</p>
          ) : (
            switches.map((s) => (
              <div key={s.id} className="border rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs opacity-70">{s.status}</div>
                </div>
                <div className="mt-2 text-sm opacity-80">
                  Interval: {s.interval_days} days • Grace: {s.grace_days} days
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
