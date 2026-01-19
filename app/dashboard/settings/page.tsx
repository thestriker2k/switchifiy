"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

import { Card } from "@/components/ui/Card";

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      aria-label={label ?? (checked ? "On" : "Off")}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-6 w-11 items-center rounded-full border transition",
        checked ? "bg-black" : "bg-gray-200",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-5 w-5 transform rounded-full bg-white transition",
          checked ? "translate-x-5" : "translate-x-0.5",
        ].join(" ")}
      />
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [reminderEnabled, setReminderEnabled] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.replace("/login");
        return;
      }

      setUserId(auth.user.id);

      // Load existing settings
      const { data, error } = await supabase
        .from("user_settings")
        .select("reminder_enabled")
        .eq("user_id", auth.user.id)
        .maybeSingle();

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (data) {
        setReminderEnabled(data.reminder_enabled ?? true);
      }

      setLoading(false);
    })();
  }, [router]);

  async function handleToggle(next: boolean) {
    if (!userId) return;

    setReminderEnabled(next);
    setError(null);
    setSaveNotice(null);
    setSaving(true);

    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: userId,
        reminder_enabled: next,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSaveNotice("Saved ✅");
    setTimeout(() => setSaveNotice(null), 1500);
  }

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Settings
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account preferences.
        </p>
      </div>

      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="text-sm text-red-700">{error}</div>
        </Card>
      )}

      {/* Notifications Section */}
      <Card className="p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-900">Notifications</h2>
          <p className="mt-1 text-sm text-gray-500">
            Configure how and when you receive reminders.
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 pt-2">
          <div>
            <div className="text-sm font-medium text-gray-900">
              Check-in reminders
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Receive email reminders at 50% and 90% of your switch interval
              before it triggers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {saveNotice && (
              <span className="text-sm text-gray-500">{saveNotice}</span>
            )}
            <Toggle
              checked={reminderEnabled}
              onChange={handleToggle}
              disabled={saving}
              label="Toggle check-in reminders"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
