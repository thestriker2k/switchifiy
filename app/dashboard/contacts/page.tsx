"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type ContactRow = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  created_at: string;
};

export default function ContactsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadContacts() {
    const { data, error } = await supabase
      .from("recipients") // DB table stays recipients
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      return;
    }

    setContacts(data ?? []);
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        return;
      }

      setEmail(data.user.email ?? null);
      await loadContacts();
      setLoading(false);
    })();
  }, [router]);

  async function createContact(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const { error } = await supabase.from("recipients").insert({
      name: contactName.trim(),
      email: contactEmail.trim(),
    });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setContactName("");
    setContactEmail("");
    await loadContacts();
    setSaving(false);
  }
  async function deleteContact(id: string) {
    const confirmed = window.confirm(
      "Delete this contact? This will remove them from all switches."
    );
    if (!confirmed) return;

    setError(null);

    const { error } = await supabase.from("recipients").delete().eq("id", id);

    if (error) {
      setError(error.message);
      return;
    }

    // Update UI immediately
    setContacts((prev) => prev.filter((c) => c.id !== id));
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          <p className="mt-1 text-sm opacity-80">Signed in as: {email}</p>
        </div>
      </div>

      {error && <div className="border rounded-md p-3 text-sm">{error}</div>}

      <form
        onSubmit={createContact}
        className="space-y-3 border rounded-xl p-4"
      >
        <input
          className="w-full border rounded-md p-3"
          placeholder="Contact name"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          required
        />

        <input
          className="w-full border rounded-md p-3"
          placeholder="Contact email"
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          required
        />

        <button
          className="w-full border rounded-md p-3 font-medium"
          disabled={saving}
        >
          {saving ? "Saving..." : "Add Contact"}
        </button>
      </form>

      <div className="space-y-3">
        {contacts.length === 0 ? (
          <p className="text-sm opacity-80">No contacts yet.</p>
        ) : (
          contacts.map((c) => (
            <div
              key={c.id}
              className="border rounded-xl p-4 flex items-start justify-between gap-4"
            >
              <div>
                <div className="font-medium">{c.name}</div>
                <div className="text-sm opacity-80">{c.email}</div>
              </div>

              <button
                type="button"
                className="text-red-600 hover:underline text-sm"
                onClick={() => deleteContact(c.id)}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
