"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type SwitchRow = {
  id: string;
  name: string;
  status: string;
  interval_days: number;
  grace_days: number;
  created_at: string;
};

type RecipientRow = {
  id: string;
  name: string;
  email: string;
  created_at: string;
};

type SwitchRecipientRow = {
  switch_id: string;
  recipient_id: string;
  created_at: string;
};

const ALLOWED_INTERVALS = [7, 14, 30, 60, 90, 365] as const;
type AllowedInterval = (typeof ALLOWED_INTERVALS)[number];

function addDays(dateIso: string, days: number) {
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateLong(d: Date) {
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

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

export default function DashboardOverviewPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [activeCount, setActiveCount] = useState<number>(0);
  const [inactiveCount, setInactiveCount] = useState<number>(0);

  const [activeSwitches, setActiveSwitches] = useState<SwitchRow[]>([]);
  const [inactiveSwitches, setInactiveSwitches] = useState<SwitchRow[]>([]);

  const [error, setError] = useState<string | null>(null);

  // Recipients + links
  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [switchRecipients, setSwitchRecipients] = useState<
    SwitchRecipientRow[]
  >([]);

  // ---------- CREATE SWITCH ----------
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createIntervalDays, setCreateIntervalDays] =
    useState<AllowedInterval>(30);
  const [createMessageSubject, setCreateMessageSubject] =
    useState("Switch triggered");
  const [createMessageBody, setCreateMessageBody] = useState(
    "If you're receiving this, my Switchifye safety switch has triggered. Here's what you need to know..."
  );

  const [createRecipientIds, setCreateRecipientIds] = useState<Set<string>>(
    new Set()
  );
  const [creating, setCreating] = useState(false);

  // ---------- EDITING ----------
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIntervalDays, setEditIntervalDays] = useState<AllowedInterval>(30);
  const [editGraceDays, setEditGraceDays] = useState(0);
  const [editStatus, setEditStatus] = useState<"active" | "paused">("active");

  const [messageSubject, setMessageSubject] = useState("Switch triggered");
  const [messageBody, setMessageBody] = useState("");

  const [selectedRecipientId, setSelectedRecipientId] = useState<string>("");

  const [savingSwitch, setSavingSwitch] = useState(false);
  const [savingMessage, setSavingMessage] = useState(false);
  const [savingRecipient, setSavingRecipient] = useState(false);

  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [saveNoticeById, setSaveNoticeById] = useState<Record<string, string>>(
    {}
  );

  const isActiveStatus = (status: string) => status === "active";

  async function refreshOverview() {
    setError(null);

    const { count: active, error: countActiveError } = await supabase
      .from("switches")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    if (countActiveError) {
      setError(countActiveError.message);
      return;
    }
    setActiveCount(active ?? 0);

    const { count: inactive, error: countInactiveError } = await supabase
      .from("switches")
      .select("*", { count: "exact", head: true })
      .neq("status", "active");

    if (countInactiveError) {
      setError(countInactiveError.message);
      return;
    }
    setInactiveCount(inactive ?? 0);

    const { data: actData, error: actErr } = await supabase
      .from("switches")
      .select("id,name,status,interval_days,grace_days,created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (actErr) {
      setError(actErr.message);
      return;
    }
    setActiveSwitches((actData ?? []) as SwitchRow[]);

    const { data: inactData, error: inactErr } = await supabase
      .from("switches")
      .select("id,name,status,interval_days,grace_days,created_at")
      .neq("status", "active")
      .order("created_at", { ascending: false });

    if (inactErr) {
      setError(inactErr.message);
      return;
    }
    setInactiveSwitches((inactData ?? []) as SwitchRow[]);
  }

  async function loadRecipients() {
    const { data, error } = await supabase
      .from("recipients")
      .select("id,name,email,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      return;
    }
    setRecipients((data ?? []) as RecipientRow[]);
  }

  async function loadSwitchRecipients() {
    const { data, error } = await supabase
      .from("switch_recipients")
      .select("*");
    if (error) {
      setError(error.message);
      return;
    }
    setSwitchRecipients((data ?? []) as SwitchRecipientRow[]);
  }

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.replace("/login");
        return;
      }

      await Promise.all([
        refreshOverview(),
        loadRecipients(),
        loadSwitchRecipients(),
      ]);

      setLoading(false);
    })();
  }, [router]);

  async function toggleSwitchStatus(switchId: string, makeActive: boolean) {
    setError(null);
    setTogglingId(switchId);

    if (editingId === switchId) setEditingId(null);

    const nextStatus = makeActive ? "active" : "paused";

    const { error } = await supabase
      .from("switches")
      .update({ status: nextStatus })
      .eq("id", switchId);

    if (error) {
      setError(error.message);
      setTogglingId(null);
      return;
    }

    await refreshOverview();
    setTogglingId(null);
  }

  // ---------- CREATE HELPERS ----------
  function toggleCreateRecipient(id: string) {
    setCreateRecipientIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function resetCreateForm() {
    setCreateName("");
    setCreateIntervalDays(30);
    setCreateMessageSubject("Switch triggered");
    setCreateMessageBody(
      "If you're receiving this, my Switchifye safety switch has triggered. Here's what you need to know..."
    );
    setCreateRecipientIds(new Set());
  }

  function validateCreate() {
    const cleaned = createName.trim();
    if (!cleaned) return "Switch name is required.";
    if (!ALLOWED_INTERVALS.includes(createIntervalDays)) {
      return "Interval must be one of: 7, 14, 30, 60, 90, or 365 days.";
    }
    if (!createMessageBody.trim()) return "Message body is required.";
    if (createRecipientIds.size === 0)
      return "Please select at least 1 recipient.";
    return null;
  }

  async function createSwitchFromOverview() {
    setError(null);

    const validation = validateCreate();
    if (validation) {
      setError(validation);
      return;
    }

    setCreating(true);

    const { data: inserted, error: insertError } = await supabase
      .from("switches")
      .insert({
        name: createName.trim(),
        interval_days: createIntervalDays,
        grace_days: 0,
        status: "active",
      })
      .select("id")
      .single();

    if (insertError || !inserted?.id) {
      setError(insertError?.message ?? "Failed to create switch.");
      setCreating(false);
      return;
    }

    const switchId = inserted.id as string;

    const subject = createMessageSubject.trim() || "Switch triggered";
    const body = createMessageBody.trim();

    const { error: msgError } = await supabase
      .from("messages")
      .upsert(
        { switch_id: switchId, subject, body },
        { onConflict: "switch_id" }
      );

    if (msgError) {
      setError(msgError.message);
      setCreating(false);
      return;
    }

    const rows = Array.from(createRecipientIds).map((rid) => ({
      switch_id: switchId,
      recipient_id: rid,
    }));

    const { error: srError } = await supabase
      .from("switch_recipients")
      .insert(rows);

    if (srError) {
      setError(srError.message);
      setCreating(false);
      return;
    }

    await Promise.all([refreshOverview(), loadSwitchRecipients()]);
    setCreating(false);
    setShowCreate(false);
    resetCreateForm();
  }

  // ---------- EDIT HELPERS ----------
  const attachedRecipientsForEditing = useMemo(() => {
    if (!editingId) return [];
    const ids = new Set(
      switchRecipients
        .filter((sr) => sr.switch_id === editingId)
        .map((sr) => sr.recipient_id)
    );
    return recipients.filter((r) => ids.has(r.id));
  }, [editingId, recipients, switchRecipients]);

  const attachedRecipientIds = useMemo(() => {
    if (!editingId) return new Set<string>();
    return new Set(
      switchRecipients
        .filter((sr) => sr.switch_id === editingId)
        .map((sr) => sr.recipient_id)
    );
  }, [editingId, switchRecipients]);

  async function startEdit(s: SwitchRow) {
    setError(null);
    setEditingId(s.id);

    setEditName(s.name);

    const normalized: AllowedInterval = ALLOWED_INTERVALS.includes(
      s.interval_days as AllowedInterval
    )
      ? (s.interval_days as AllowedInterval)
      : 30;

    setEditIntervalDays(normalized);
    setEditGraceDays(s.grace_days ?? 0);
    setEditStatus(isActiveStatus(s.status) ? "active" : "paused");

    setSelectedRecipientId("");

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("switch_id", s.id)
      .maybeSingle();

    if (error) {
      setError(error.message);
      setMessageSubject("Switch triggered");
      setMessageBody("");
      return;
    }

    if (data) {
      setMessageSubject(data.subject ?? "Switch triggered");
      setMessageBody(data.body ?? "");
    } else {
      setMessageSubject("Switch triggered");
      setMessageBody(
        "If you're receiving this, my Switchifye safety switch has triggered. Here's what you need to know..."
      );
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setSelectedRecipientId("");
    setSavingSwitch(false);
    setSavingMessage(false);
    setSavingRecipient(false);
    setError(null);
  }

  function validateSwitchFields() {
    const cleanedName = editName.trim();
    if (!cleanedName) return "Switch name is required.";

    if (!ALLOWED_INTERVALS.includes(editIntervalDays)) {
      return "Interval must be one of: 7, 14, 30, 60, 90, or 365 days.";
    }

    if (editGraceDays < 0) return "Grace period cannot be negative.";
    if (editGraceDays >= editIntervalDays)
      return "Grace period must be less than the interval.";

    return null;
  }

  async function saveAll(switchId: string) {
    setError(null);

    const validationError = validateSwitchFields();
    if (validationError) {
      setError(validationError);
      return;
    }

    const subject = messageSubject.trim() || "Switch triggered";
    const body = messageBody.trim();
    if (!body) {
      setError("Message body is required.");
      return;
    }

    setSavingSwitch(true);
    setSavingMessage(true);

    // IMPORTANT: we select() so if 0 rows update we can detect it (RLS silent block)
    const { data: updated, error: switchError } = await supabase
      .from("switches")
      .update({
        name: editName.trim(),
        interval_days: editIntervalDays,
        grace_days: editGraceDays,
        status: editStatus,
      })
      .eq("id", switchId)
      .select("id")
      .maybeSingle();

    if (switchError) {
      setError(switchError.message);
      setSavingSwitch(false);
      setSavingMessage(false);
      return;
    }

    if (!updated?.id) {
      setError(
        "Save failed (0 rows updated). This is usually an RLS UPDATE policy issue for inactive rows, or the row user_id doesn't match your auth user."
      );
      setSavingSwitch(false);
      setSavingMessage(false);
      return;
    }

    const { error: messageError } = await supabase
      .from("messages")
      .upsert(
        { switch_id: switchId, subject, body },
        { onConflict: "switch_id" }
      );

    if (messageError) {
      setError(messageError.message);
      setSavingSwitch(false);
      setSavingMessage(false);
      return;
    }

    setSavingSwitch(false);
    setSavingMessage(false);

    await refreshOverview();

    setSaveNoticeById((prev) => ({ ...prev, [switchId]: "Saved ✅" }));
    setTimeout(() => {
      setSaveNoticeById((prev) => {
        const next = { ...prev };
        delete next[switchId];
        return next;
      });
    }, 1500);
  }

  async function attachRecipient() {
    if (!editingId) return;
    if (!selectedRecipientId) return;

    if (attachedRecipientIds.has(selectedRecipientId)) {
      setSelectedRecipientId("");
      return;
    }

    setSavingRecipient(true);
    setError(null);

    const { error } = await supabase.from("switch_recipients").insert({
      switch_id: editingId,
      recipient_id: selectedRecipientId,
    });

    if (error) {
      setError(error.message);
      setSavingRecipient(false);
      return;
    }

    await loadSwitchRecipients();
    setSelectedRecipientId("");
    setSavingRecipient(false);
  }

  async function removeRecipient(recipientId: string) {
    if (!editingId) return;

    setSavingRecipient(true);
    setError(null);

    const { error } = await supabase
      .from("switch_recipients")
      .delete()
      .eq("switch_id", editingId)
      .eq("recipient_id", recipientId);

    if (error) {
      setError(error.message);
      setSavingRecipient(false);
      return;
    }

    await loadSwitchRecipients();
    setSavingRecipient(false);
  }

  const renderEditor = (switchId: string) => {
    return (
      <div className="border rounded-xl p-4 space-y-4 mt-3">
        <div className="text-sm font-medium">
          Edit switch (settings, message, recipients)
        </div>

        {saveNoticeById[switchId] && (
          <div className="text-sm opacity-80">{saveNoticeById[switchId]}</div>
        )}

        {/* Settings */}
        <div className="space-y-1">
          <div className="text-sm opacity-80">Name</div>
          <input
            className="w-full border rounded-md p-2"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
        </div>

        {/* Interval */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm opacity-80">Interval</div>
            <div className="text-sm font-medium">{editIntervalDays}d</div>
          </div>

          <div className="flex flex-wrap gap-2">
            {ALLOWED_INTERVALS.map((d) => (
              <button
                key={d}
                type="button"
                className={`border rounded-md px-3 py-2 text-sm ${
                  editIntervalDays === d ? "font-semibold" : ""
                }`}
                onClick={() => setEditIntervalDays(d)}
              >
                {d === 365 ? "1 year" : `${d}d`}
              </button>
            ))}
          </div>

          <select
            className="w-full border rounded-md p-2"
            value={editIntervalDays}
            onChange={(e) =>
              setEditIntervalDays(Number(e.target.value) as AllowedInterval)
            }
          >
            {ALLOWED_INTERVALS.map((d) => (
              <option key={d} value={d}>
                {d === 365 ? "1 year (365 days)" : `${d} days`}
              </option>
            ))}
          </select>
        </div>

        {/* Grace (still included) */}
        <div className="space-y-1">
          <div className="text-sm opacity-80">Grace (days)</div>
          <input
            className="w-full border rounded-md p-2"
            type="number"
            min={0}
            value={editGraceDays}
            onChange={(e) => setEditGraceDays(Number(e.target.value))}
          />
        </div>

        {/* Status */}
        <div className="space-y-1">
          <div className="text-sm opacity-80">Status</div>
          <select
            className="w-full border rounded-md p-2"
            value={editStatus}
            onChange={(e) =>
              setEditStatus(e.target.value as "active" | "paused")
            }
          >
            <option value="active">active</option>
            <option value="paused">paused</option>
          </select>
        </div>

        {/* Message */}
        <div className="border-t pt-4 space-y-2">
          <div className="text-sm font-medium">Message</div>

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
        </div>

        {/* Recipients */}
        <div className="border-t pt-4 space-y-3">
          <div className="text-sm font-medium">Recipients</div>

          {attachedRecipientsForEditing.length === 0 ? (
            <p className="text-sm opacity-80">No recipients attached yet.</p>
          ) : (
            <div className="space-y-2">
              {attachedRecipientsForEditing.map((r) => (
                <div key={r.id} className="flex items-center justify-between">
                  <div className="text-sm opacity-80">
                    {r.name} <span className="opacity-60">({r.email})</span>
                  </div>

                  <button
                    type="button"
                    className="text-red-600 hover:underline text-sm"
                    disabled={savingRecipient}
                    onClick={() => removeRecipient(r.id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <select
              className="border rounded-md p-2 text-sm flex-1"
              value={selectedRecipientId}
              onChange={(e) => setSelectedRecipientId(e.target.value)}
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
              onClick={attachRecipient}
              disabled={!selectedRecipientId || savingRecipient}
            >
              {savingRecipient ? "..." : "Add"}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            className="border rounded-md px-3 py-2 text-sm"
            disabled={savingSwitch || savingMessage || savingRecipient}
            onClick={() => saveAll(switchId)}
          >
            {savingSwitch || savingMessage ? "Saving..." : "Save all"}
          </button>

          <button
            type="button"
            className="border rounded-md px-3 py-2 text-sm"
            disabled={savingSwitch || savingMessage || savingRecipient}
            onClick={cancelEdit}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Overview</h1>

      {error && <div className="border rounded-md p-3 text-sm">{error}</div>}

      {/* Counts card */}
      <div className="border rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-8">
            <div>
              <div className="text-sm opacity-80">Active switches</div>
              <div className="mt-2 text-4xl font-bold">{activeCount}</div>
            </div>

            <div>
              <div className="text-sm opacity-80">Inactive switches</div>
              <div className="mt-2 text-4xl font-bold">{inactiveCount}</div>
            </div>
          </div>

          <button
            type="button"
            className="border rounded-md px-4 py-2 text-sm"
            onClick={() => {
              setEditingId(null);
              setError(null);
              setShowCreate((v) => !v);
            }}
          >
            {showCreate ? "Close" : "Add a switch"}
          </button>
        </div>
      </div>

      {/* CREATE SWITCH PANEL */}
      {showCreate && (
        <section className="border rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Create a switch</h2>
            <button
              type="button"
              className="border rounded-md px-3 py-2 text-sm"
              onClick={() => {
                setShowCreate(false);
                setError(null);
                resetCreateForm();
              }}
            >
              Cancel
            </button>
          </div>

          <div className="space-y-1">
            <div className="text-sm opacity-80">Switch name</div>
            <input
              className="w-full border rounded-md p-2"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="e.g., Monthly check-in"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm opacity-80">Check-in interval</div>
              <div className="text-sm font-medium">{createIntervalDays}d</div>
            </div>

            <div className="flex flex-wrap gap-2">
              {ALLOWED_INTERVALS.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`border rounded-md px-3 py-2 text-sm ${
                    createIntervalDays === d ? "font-semibold" : ""
                  }`}
                  onClick={() => setCreateIntervalDays(d)}
                >
                  {d === 365 ? "1 year" : `${d}d`}
                </button>
              ))}
            </div>

            <select
              className="w-full border rounded-md p-2"
              value={createIntervalDays}
              onChange={(e) =>
                setCreateIntervalDays(Number(e.target.value) as AllowedInterval)
              }
            >
              {ALLOWED_INTERVALS.map((d) => (
                <option key={d} value={d}>
                  {d === 365 ? "1 year (365 days)" : `${d} days`}
                </option>
              ))}
            </select>
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="text-sm font-medium">Message</div>

            <input
              className="w-full border rounded-md p-2"
              placeholder="Message title"
              value={createMessageSubject}
              onChange={(e) => setCreateMessageSubject(e.target.value)}
            />

            <textarea
              className="w-full border rounded-md p-2 min-h-[120px]"
              placeholder="Message..."
              value={createMessageBody}
              onChange={(e) => setCreateMessageBody(e.target.value)}
            />
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="text-sm font-medium">Recipients</div>

            {recipients.length === 0 ? (
              <p className="text-sm opacity-80">
                No contacts yet. Add contacts in the Recipients tab first.
              </p>
            ) : (
              <div className="space-y-2">
                {recipients.map((r) => {
                  const checked = createRecipientIds.has(r.id);
                  return (
                    <label
                      key={r.id}
                      className="flex items-center gap-3 border rounded-md p-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCreateRecipient(r.id)}
                      />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{r.name}</div>
                        <div className="opacity-70 truncate">{r.email}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="text-xs opacity-70">
              Select at least 1 recipient.
            </div>
          </div>

          <button
            type="button"
            className="border rounded-md px-4 py-2 text-sm w-full"
            disabled={creating}
            onClick={createSwitchFromOverview}
          >
            {creating ? "Creating..." : "Create switch"}
          </button>
        </section>
      )}

      {/* Active switches */}
      <section className="space-y-3">
        <h2 className="font-semibold">Your active switches</h2>

        {activeSwitches.length === 0 ? (
          <p className="text-sm opacity-80">No active switches yet.</p>
        ) : (
          <div className="space-y-3">
            {activeSwitches.map((s) => {
              const triggerDate = addDays(s.created_at, s.interval_days);
              const isToggling = togglingId === s.id;

              return (
                <div key={s.id} className="border rounded-xl p-4">
                  <div className="flex items-start gap-4">
                    <div className="pt-1">
                      <Toggle
                        checked={true}
                        disabled={isToggling}
                        onChange={(next) => toggleSwitchStatus(s.id, next)}
                        label="Pause switch"
                      />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{s.name}</div>

                          <div className="mt-1 text-sm opacity-80">
                            This switch is currently set to trigger at:{" "}
                            <span className="font-medium">
                              {triggerDate ? formatDateLong(triggerDate) : "—"}
                            </span>
                          </div>

                          <div className="mt-1 text-xs opacity-70">
                            Interval: {s.interval_days} days
                          </div>
                        </div>

                        <button
                          type="button"
                          className="border rounded-md px-3 py-2 text-sm"
                          onClick={() => {
                            setShowCreate(false);
                            startEdit(s);
                          }}
                        >
                          Edit
                        </button>
                      </div>

                      {editingId === s.id && renderEditor(s.id)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Inactive switches */}
      <section className="space-y-3">
        <h2 className="font-semibold">Inactive switches</h2>

        {inactiveSwitches.length === 0 ? (
          <p className="text-sm opacity-80">No inactive switches.</p>
        ) : (
          <div className="space-y-3">
            {inactiveSwitches.map((s) => {
              const isToggling = togglingId === s.id;

              return (
                <div key={s.id} className="border rounded-xl p-4">
                  <div className="flex items-start gap-4">
                    <div className="pt-1">
                      <Toggle
                        checked={false}
                        disabled={isToggling}
                        onChange={(next) => toggleSwitchStatus(s.id, next)}
                        label="Activate switch"
                      />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{s.name}</div>
                          <div className="mt-1 text-xs opacity-70">
                            Status: {s.status}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="border rounded-md px-3 py-2 text-sm"
                          onClick={() => {
                            setShowCreate(false);
                            startEdit(s);
                          }}
                        >
                          Edit
                        </button>
                      </div>

                      {editingId === s.id && renderEditor(s.id)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
