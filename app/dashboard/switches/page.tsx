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

type RecipientRow = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  created_at: string;
};

type SwitchRecipientRow = {
  switch_id: string;
  recipient_id: string;
  created_at: string;
};

export default function SwitchesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  const [switches, setSwitches] = useState<SwitchRow[]>([]);
  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [switchRecipients, setSwitchRecipients] = useState<
    SwitchRecipientRow[]
  >([]);

  const [name, setName] = useState("");
  const [intervalDays, setIntervalDays] = useState(30);
  const [graceDays, setGraceDays] = useState(3);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // Message editor (one open at a time)
  const [editingMessageFor, setEditingMessageFor] = useState<string | null>(
    null
  );
  const [messageSubject, setMessageSubject] = useState("Switch triggered");
  const [messageBody, setMessageBody] = useState("");
  const [savingMessage, setSavingMessage] = useState(false);

  const [selectedRecipientBySwitch, setSelectedRecipientBySwitch] = useState<
    Record<string, string>
  >({});

  async function loadSwitches() {
    const { data, error } = await supabase
      .from("switches")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return setError(error.message);
    setSwitches(data ?? []);
  }

  async function loadRecipients() {
    const { data, error } = await supabase
      .from("recipients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return setError(error.message);
    setRecipients(data ?? []);
  }

  async function loadSwitchRecipients() {
    const { data, error } = await supabase
      .from("switch_recipients")
      .select("*");
    if (error) return setError(error.message);
    setSwitchRecipients(data ?? []);
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setEmail(data.user.email ?? null);

      await loadSwitches();
      await loadRecipients();
      await loadSwitchRecipients();

      setLoading(false);
    })();
  }, [router]);

  async function createSwitch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const cleanedName = name.trim();
    if (!cleanedName) {
      setError("Switch name is required.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("switches").insert({
      name: cleanedName,
      interval_days: intervalDays,
      grace_days: graceDays,
      status: "active",
    });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setName("");
    setIntervalDays(30);
    setGraceDays(3);

    await loadSwitches();
    setSaving(false);
  }

  async function deleteSwitch(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this switch?"
    );
    if (!confirmed) return;

    const { error } = await supabase.from("switches").delete().eq("id", id);

    if (error) {
      alert(`Delete failed: ${error.message}`);
      return;
    }

    setSwitches((prev) => prev.filter((s) => s.id !== id));
    // Switch recipients are cascade-deleted in DB, but refresh to keep UI accurate:
    await loadSwitchRecipients();
  }

  async function loadMessageForSwitch(switchId: string) {
    setError(null);

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("switch_id", switchId)
      .maybeSingle();

    if (error) return setError(error.message);

    if (data) {
      setMessageSubject(data.subject);
      setMessageBody(data.body);
    } else {
      setMessageSubject("Switch triggered");
      setMessageBody(
        "If you're receiving this, my Switchifye safety switch has triggered. Here's what you need to know..."
      );
    }
  }

  async function saveMessageForSwitch(switchId: string) {
    setSavingMessage(true);
    setError(null);

    const subject = messageSubject.trim() || "Switch triggered";
    const body = messageBody.trim();

    if (!body) {
      setError("Message body is required.");
      setSavingMessage(false);
      return;
    }

    const { error } = await supabase
      .from("messages")
      .upsert(
        { switch_id: switchId, subject, body },
        { onConflict: "switch_id" }
      );

    if (error) {
      setError(error.message);
      setSavingMessage(false);
      return;
    }

    setSavingMessage(false);
    setEditingMessageFor(null);
  }

  async function attachRecipientToSwitch(switchId: string) {
    const recipientId = selectedRecipientBySwitch[switchId];
    if (!recipientId) return;

    setError(null);

    const { error } = await supabase.from("switch_recipients").insert({
      switch_id: switchId,
      recipient_id: recipientId,
    });

    if (error) return setError(error.message);

    await loadSwitchRecipients();
    setSelectedRecipientBySwitch((prev) => ({ ...prev, [switchId]: "" }));
  }

  async function removeRecipientFromSwitch(
    switchId: string,
    recipientId: string
  ) {
    setError(null);

    const { error } = await supabase
      .from("switch_recipients")
      .delete()
      .eq("switch_id", switchId)
      .eq("recipient_id", recipientId);

    if (error) return setError(error.message);

    await loadSwitchRecipients();
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Switches</h1>
          <p className="mt-1 text-sm opacity-80">Signed in as: {email}</p>
        </div>
      </div>

      {error && <div className="border rounded-md p-3 text-sm">{error}</div>}

      <section className="border rounded-xl p-4">
        <h2 className="font-semibold">Create a Switch</h2>

        <form onSubmit={createSwitch} className="mt-4 space-y-3">
          <input
            className="w-full border rounded-md p-3"
            placeholder="Switch name"
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
              />
            </label>
          </div>

          <button
            className="w-full border rounded-md p-3 font-medium"
            disabled={saving}
          >
            {saving ? "Saving..." : "Create Switch"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-semibold">Your Switches</h2>

        <div className="mt-3 space-y-3">
          {switches.length === 0 ? (
            <p className="text-sm opacity-80">No switches yet.</p>
          ) : (
            switches.map((s) => (
              <div key={s.id} className="border rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-sm opacity-80">
                      Interval: {s.interval_days} days • Grace: {s.grace_days}{" "}
                      days
                    </div>
                  </div>

                  <button
                    onClick={() => deleteSwitch(s.id)}
                    className="text-red-600 hover:underline text-sm"
                    type="button"
                  >
                    Delete
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    className="border rounded-md px-3 py-2 text-sm"
                    type="button"
                    onClick={async () => {
                      setEditingMessageFor(s.id);
                      await loadMessageForSwitch(s.id);
                    }}
                  >
                    Edit message
                  </button>

                  {editingMessageFor === s.id && (
                    <button
                      className="border rounded-md px-3 py-2 text-sm"
                      type="button"
                      onClick={() => setEditingMessageFor(null)}
                    >
                      Close
                    </button>
                  )}
                </div>

                {editingMessageFor === s.id && (
                  <div className="border rounded-xl p-3 space-y-2">
                    <div className="text-sm font-medium">
                      Message to send if triggered
                    </div>

                    <input
                      className="w-full border rounded-md p-2"
                      placeholder="Subject"
                      value={messageSubject}
                      onChange={(e) => setMessageSubject(e.target.value)}
                    />

                    <textarea
                      className="w-full border rounded-md p-2 min-h-[120px]"
                      placeholder="Message body..."
                      value={messageBody}
                      onChange={(e) => setMessageBody(e.target.value)}
                    />

                    <button
                      className="border rounded-md px-3 py-2 text-sm"
                      disabled={savingMessage}
                      onClick={() => saveMessageForSwitch(s.id)}
                      type="button"
                    >
                      {savingMessage ? "Saving..." : "Save message"}
                    </button>

                    <div className="border-t pt-4">
                      <div className="text-sm font-medium">Recipients</div>

                      <div className="mt-2 space-y-2">
                        {switchRecipients
                          .filter((sr) => sr.switch_id === s.id)
                          .map((sr) => {
                            const r = recipients.find(
                              (x) => x.id === sr.recipient_id
                            );
                            if (!r) return null;

                            return (
                              <div
                                key={sr.recipient_id}
                                className="flex items-center justify-between"
                              >
                                <div className="text-sm opacity-80">
                                  {r.name}{" "}
                                  <span className="opacity-60">
                                    ({r.email})
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  className="text-red-600 hover:underline text-sm"
                                  onClick={() =>
                                    removeRecipientFromSwitch(s.id, r.id)
                                  }
                                >
                                  Remove
                                </button>
                              </div>
                            );
                          })}
                      </div>

                      <div className="mt-3 flex gap-2">
                        <select
                          className="border rounded-md p-2 text-sm flex-1"
                          value={selectedRecipientBySwitch[s.id] ?? ""}
                          onChange={(e) =>
                            setSelectedRecipientBySwitch((prev) => ({
                              ...prev,
                              [s.id]: e.target.value,
                            }))
                          }
                        >
                          <option value="">Select contact…</option>
                          {recipients.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name} — {r.email}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          className="border rounded-md px-3 py-2 text-sm"
                          onClick={() => attachRecipientToSwitch(s.id)}
                          disabled={!selectedRecipientBySwitch[s.id]}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
