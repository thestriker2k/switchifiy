"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";

type SwitchRow = {
  id: string;
  name: string;
  status: string;
  interval_days: number;
  grace_days: number;
  created_at: string;

  // from schema
  last_checkin_at: string | null;
  timezone: string | null;
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

const ALLOWED_INTERVALS = [1, 7, 14, 30, 60, 90, 365] as const;
type AllowedInterval = (typeof ALLOWED_INTERVALS)[number];

const TOKENS = ["{recipient_name}", "{recipient_first_name}"] as const;

function addDays(dateIso: string, days: number) {
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateShort(d: Date) {
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(d: Date, timeZone?: string | null) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timeZone ?? undefined,
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
  } catch {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
  }
}

function getBrowserTimeZone(fallback: string = "UTC") {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || fallback;
  } catch {
    return fallback;
  }
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

function IntervalButtons({
  value,
  onChange,
  disabled,
  label = "Interval",
}: {
  value: AllowedInterval;
  onChange: (next: AllowedInterval) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">{label}</div>
        <div className="text-sm font-medium text-gray-900">
          {value === 1 ? "24 hours" : value === 365 ? "1 year" : `${value}d`}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {ALLOWED_INTERVALS.map((d) => {
          const active = value === d;
          return (
            <button
              key={d}
              type="button"
              disabled={disabled}
              onClick={() => onChange(d)}
              className={[
                "border rounded-lg px-3 py-2 text-sm transition",
                active ? "bg-black text-white border-black" : "bg-white",
                disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50",
              ].join(" ")}
            >
              {d === 1 ? "24 hours" : d === 365 ? "1 year" : `${d}d`}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function renderWithTokens({
  subject,
  body,
  previewRecipient,
}: {
  subject: string;
  body: string;
  switchName: string;
  intervalDays: number;
  createdAtIso: string | null;
  previewRecipient: { name: string; email: string } | null;
}) {
  const fullName = (previewRecipient?.name ?? "Recipient Name").trim();
  const firstName = fullName.split(/\s+/).filter(Boolean)[0] || "Recipient";

  const tokenMap: Record<string, string> = {
    "{recipient_name}": fullName,
    "{recipient_first_name}": firstName,
  };

  const apply = (text: string) => {
    let out = text ?? "";
    for (const [token, value] of Object.entries(tokenMap)) {
      out = out.split(token).join(value);
    }
    return out;
  };

  return {
    subject: apply(subject),
    body: apply(body),
  };
}

function insertTokenAtCursor(
  el: HTMLInputElement | HTMLTextAreaElement,
  current: string,
  token: string
) {
  const start = el.selectionStart ?? current.length;
  const end = el.selectionEnd ?? current.length;
  const next = current.slice(0, start) + token + current.slice(end);

  requestAnimationFrame(() => {
    try {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    } catch {
      // ignore
    }
  });

  return next;
}

function wrapSelectionWith(
  el: HTMLInputElement | HTMLTextAreaElement,
  current: string,
  left: string,
  right: string
) {
  const start = el.selectionStart ?? current.length;
  const end = el.selectionEnd ?? current.length;

  const selected = current.slice(start, end);
  const insert = left + selected + right;

  const next = current.slice(0, start) + insert + current.slice(end);

  requestAnimationFrame(() => {
    try {
      el.focus();
      if (selected.length === 0) {
        const pos = start + left.length;
        el.setSelectionRange(pos, pos);
      } else {
        const selStart = start + left.length;
        const selEnd = selStart + selected.length;
        el.setSelectionRange(selStart, selEnd);
      }
    } catch {
      // ignore
    }
  });

  return next;
}

function markdownPreserveLineBreaks(text: string) {
  return (text ?? "").replace(/\n/g, "  \n");
}

export default function DashboardOverviewPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  const [activeSwitches, setActiveSwitches] = useState<SwitchRow[]>([]);
  const [inactiveSwitches, setInactiveSwitches] = useState<SwitchRow[]>([]);
  const [completedSwitches, setCompletedSwitches] = useState<SwitchRow[]>([]);

  const [error, setError] = useState<string | null>(null);

  // Header stat
  const [lastCheckInAt, setLastCheckInAt] = useState<string | null>(null);

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

  const [createSelectedRecipientId, setCreateSelectedRecipientId] =
    useState("");
  const [newRecipientName, setNewRecipientName] = useState("");
  const [newRecipientEmail, setNewRecipientEmail] = useState("");
  const [addingContact, setAddingContact] = useState(false);

  const [creating, setCreating] = useState(false);

  // Preview-as for CREATE
  const [createPreviewRecipientId, setCreatePreviewRecipientId] = useState("");

  // ---------- EDITING ----------
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIntervalDays, setEditIntervalDays] = useState<AllowedInterval>(30);

  const [messageSubject, setMessageSubject] = useState("Switch triggered");
  const [messageBody, setMessageBody] = useState("");

  const [selectedRecipientId, setSelectedRecipientId] = useState("");

  const [editNewRecipientName, setEditNewRecipientName] = useState("");
  const [editNewRecipientEmail, setEditNewRecipientEmail] = useState("");
  const [addingContactInEditor, setAddingContactInEditor] = useState(false);

  const [savingSwitch, setSavingSwitch] = useState(false);
  const [savingMessage, setSavingMessage] = useState(false);
  const [savingRecipient, setSavingRecipient] = useState(false);

  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Preview-as for EDIT
  const [editPreviewRecipientId, setEditPreviewRecipientId] = useState("");

  // --- toolbar focus + refs ---
  type FocusTarget =
    | { mode: "create"; field: "subject" | "body" }
    | { mode: "edit"; field: "subject" | "body" }
    | null;

  const [focusTarget, setFocusTarget] = useState<FocusTarget>(null);

  const createSubjectRef = useRef<HTMLInputElement | null>(null);
  const createBodyRef = useRef<HTMLTextAreaElement | null>(null);
  const editSubjectRef = useRef<HTMLInputElement | null>(null);
  const editBodyRef = useRef<HTMLTextAreaElement | null>(null);

  const intervalLabel = (days: number) =>
    days === 1 ? "24 hours" : `${days} days`;

  const browserTZ = useMemo(() => getBrowserTimeZone("UTC"), []);

  // Prevent double-run in dev Strict Mode
  const didCheckInRef = useRef(false);

  async function markCheckInNow() {
    const nowIso = new Date().toISOString();

    // Only ACTIVE switches update on refresh/login
    const { error } = await supabase
      .from("switches")
      .update({ last_checkin_at: nowIso })
      .eq("status", "active");

    if (error) {
      setError(error.message);
      return;
    }

    // Update header instantly
    setLastCheckInAt(nowIso);
  }

  // ---------- LOADERS ----------
  async function refreshOverview() {
    setError(null);

    const [
      { count: active, error: activeErr },
      { count: inactive, error: inErr },
      { count: completed, error: compErr },
    ] = await Promise.all([
      supabase
        .from("switches")
        .select("*", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("switches")
        .select("*", { count: "exact", head: true })
        .eq("status", "paused"),
      supabase
        .from("switches")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed"),
    ]);

    if (activeErr) return setError(activeErr.message);
    if (inErr) return setError(inErr.message);
    if (compErr) return setError(compErr.message);

    setActiveCount(active ?? 0);
    setInactiveCount(inactive ?? 0);
    setCompletedCount(completed ?? 0);

    const [
      { data: actData, error: actListErr },
      { data: inData, error: inListErr },
      { data: compData, error: compListErr },
    ] = await Promise.all([
      supabase
        .from("switches")
        .select(
          "id,name,status,interval_days,grace_days,created_at,last_checkin_at,timezone"
        )
        .eq("status", "active")
        .order("created_at", { ascending: false }),
      supabase
        .from("switches")
        .select(
          "id,name,status,interval_days,grace_days,created_at,last_checkin_at,timezone"
        )
        .eq("status", "paused")
        .order("created_at", { ascending: false }),
      supabase
        .from("switches")
        .select(
          "id,name,status,interval_days,grace_days,created_at,last_checkin_at,timezone"
        )
        .eq("status", "completed")
        .order("created_at", { ascending: false }),
    ]);

    if (actListErr) return setError(actListErr.message);
    if (inListErr) return setError(inListErr.message);
    if (compListErr) return setError(compListErr.message);

    setActiveSwitches((actData ?? []) as SwitchRow[]);
    setInactiveSwitches((inData ?? []) as SwitchRow[]);
    setCompletedSwitches((compData ?? []) as SwitchRow[]);

    // Compute latest check-in across ACTIVE switches only
    const all = (actData ?? []) as SwitchRow[];
    let maxIso: string | null = null;

    for (const s of all) {
      const iso = s.last_checkin_at;
      if (!iso) continue;
      const t = new Date(iso).getTime();
      if (Number.isNaN(t)) continue;

      if (!maxIso) maxIso = iso;
      else {
        const cur = new Date(maxIso).getTime();
        if (t > cur) maxIso = iso;
      }
    }

    setLastCheckInAt((prev) => prev ?? maxIso);
  }

  async function loadRecipients() {
    const { data, error } = await supabase
      .from("recipients")
      .select("id,name,email,created_at")
      .order("created_at", { ascending: false });

    if (error) return setError(error.message);
    setRecipients((data ?? []) as RecipientRow[]);
  }

  async function loadSwitchRecipients() {
    const { data, error } = await supabase
      .from("switch_recipients")
      .select("*");
    if (error) return setError(error.message);
    setSwitchRecipients((data ?? []) as SwitchRecipientRow[]);
  }

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.replace("/login");
        return;
      }

      // login/refresh counts as check-in (ACTIVE only)
      if (!didCheckInRef.current) {
        didCheckInRef.current = true;
        await markCheckInNow();
      }

      await Promise.all([
        refreshOverview(),
        loadRecipients(),
        loadSwitchRecipients(),
      ]);
      setLoading(false);
    })();
  }, [router]);

  // ---------- CREATE ----------
  function toggleCreateRecipient(id: string) {
    setCreateRecipientIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addCreateRecipient(recipientId: string) {
    if (!recipientId) return;
    setCreateRecipientIds((prev) => {
      const next = new Set(prev);
      next.add(recipientId);
      return next;
    });
    setCreateSelectedRecipientId("");
  }

  function resetCreateForm() {
    setCreateName("");
    setCreateIntervalDays(30);
    setCreateMessageSubject("Switch triggered");
    setCreateMessageBody(
      "If you're receiving this, my Switchifye safety switch has triggered. Here's what you need to know..."
    );
    setCreateRecipientIds(new Set());

    setCreateSelectedRecipientId("");
    setNewRecipientName("");
    setNewRecipientEmail("");
    setAddingContact(false);

    setCreatePreviewRecipientId("");
    setFocusTarget(null);
  }

  function getNextDefaultSwitchName() {
    const base = "Default Switch Name";
    const all = [...activeSwitches, ...inactiveSwitches, ...completedSwitches];

    let maxN = 0;
    for (const s of all) {
      const name = (s.name ?? "").trim();
      if (!name) continue;

      if (name === base) {
        maxN = Math.max(maxN, 1);
        continue;
      }

      const m = name.match(new RegExp(`^${base}\\s+(\\d+)$`));
      if (m) {
        const n = Number(m[1]);
        if (!Number.isNaN(n)) maxN = Math.max(maxN, n);
      }
    }

    if (maxN === 0) return base;
    return `${base} ${maxN + 1}`;
  }

  function validateCreate() {
    if (!ALLOWED_INTERVALS.includes(createIntervalDays)) {
      return "Interval must be one of: 24 hours, 7, 14, 30, 60, 90, or 365 days.";
    }
    if (!createMessageBody.trim()) return "Message body is required.";
    if (createRecipientIds.size === 0)
      return "Please select at least 1 recipient.";
    return null;
  }

  function validateNewRecipient(name: string, emailRaw: string) {
    if (!name.trim()) return "Recipient name is required.";
    if (!emailRaw.trim()) return "Recipient email is required.";
    const email = emailRaw.trim().toLowerCase();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!ok) return "Please enter a valid email address.";
    return null;
  }

  async function createRecipientAndMaybeSelect({
    name,
    email,
    mode,
  }: {
    name: string;
    email: string;
    mode: "create" | "edit";
  }) {
    setError(null);

    const validation = validateNewRecipient(name, email);
    if (validation) return setError(validation);

    if (mode === "create") setAddingContact(true);
    else setAddingContactInEditor(true);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    const existing = recipients.find(
      (r) => r.email.trim().toLowerCase() === cleanEmail
    );
    if (existing) {
      if (mode === "create") {
        setCreateRecipientIds((prev) => {
          const next = new Set(prev);
          next.add(existing.id);
          return next;
        });
        setNewRecipientName("");
        setNewRecipientEmail("");
        setAddingContact(false);
      } else {
        if (editingId) {
          await attachRecipientToSwitch(editingId, existing.id);
        }
        setEditNewRecipientName("");
        setEditNewRecipientEmail("");
        setAddingContactInEditor(false);
      }
      return;
    }

    const { data, error } = await supabase
      .from("recipients")
      .insert({ name: cleanName, email: cleanEmail })
      .select("id,name,email,created_at")
      .single();

    if (error || !data) {
      if (mode === "create") setAddingContact(false);
      else setAddingContactInEditor(false);
      return setError(error?.message ?? "Failed to create recipient.");
    }

    await loadRecipients();

    if (mode === "create") {
      setCreateRecipientIds((prev) => {
        const next = new Set(prev);
        next.add(data.id);
        return next;
      });
      setNewRecipientName("");
      setNewRecipientEmail("");
      setAddingContact(false);
    } else {
      if (editingId) {
        await attachRecipientToSwitch(editingId, data.id);
      }
      setEditNewRecipientName("");
      setEditNewRecipientEmail("");
      setAddingContactInEditor(false);
    }
  }

  async function createSwitchFromOverview() {
    setError(null);

    const validation = validateCreate();
    if (validation) return setError(validation);

    setCreating(true);

    const finalName = createName.trim() || getNextDefaultSwitchName();
    const tz = browserTZ;
    const nowIso = new Date().toISOString();

    const { data: inserted, error: insertError } = await supabase
      .from("switches")
      .insert({
        name: finalName,
        interval_days: createIntervalDays,
        grace_days: 0,
        status: "active",
        last_checkin_at: nowIso,
        timezone: tz,
      })
      .select("id")
      .single();

    if (insertError || !inserted?.id) {
      setCreating(false);
      return setError(insertError?.message ?? "Failed to create switch.");
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
      setCreating(false);
      return setError(msgError.message);
    }

    const rows = Array.from(createRecipientIds).map((rid) => ({
      switch_id: switchId,
      recipient_id: rid,
    }));

    const { error: srError } = await supabase
      .from("switch_recipients")
      .insert(rows);

    if (srError) {
      setCreating(false);
      return setError(srError.message);
    }

    await Promise.all([refreshOverview(), loadSwitchRecipients()]);
    setCreating(false);
    setShowCreate(false);
    resetCreateForm();
  }

  // ---------- EDITING ----------
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

  const editingSwitch = useMemo(() => {
    if (!editingId) return null;
    return (
      activeSwitches.find((s) => s.id === editingId) ??
      inactiveSwitches.find((s) => s.id === editingId) ??
      completedSwitches.find((s) => s.id === editingId) ??
      null
    );
  }, [editingId, activeSwitches, inactiveSwitches, completedSwitches]);

  async function startEdit(s: SwitchRow) {
    setError(null);
    setSaveNotice(null);
    setEditingId(s.id);

    setEditName(s.name);

    const normalized: AllowedInterval = ALLOWED_INTERVALS.includes(
      s.interval_days as AllowedInterval
    )
      ? (s.interval_days as AllowedInterval)
      : 30;

    setEditIntervalDays(normalized);

    setSelectedRecipientId("");
    setEditNewRecipientName("");
    setEditNewRecipientEmail("");
    setAddingContactInEditor(false);

    setEditPreviewRecipientId("");
    setFocusTarget(null);

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("switch_id", s.id)
      .maybeSingle();

    if (error) {
      setMessageSubject("Switch triggered");
      setMessageBody("");
      return setError(error.message);
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
    setDeleting(false);
    setSaveNotice(null);
    setError(null);

    setEditNewRecipientName("");
    setEditNewRecipientEmail("");
    setAddingContactInEditor(false);

    setEditPreviewRecipientId("");
    setFocusTarget(null);
  }

  function validateSwitchFields() {
    if (!editName.trim()) return "Switch name is required.";
    if (!ALLOWED_INTERVALS.includes(editIntervalDays)) {
      return "Interval must be one of: 24 hours, 7, 14, 30, 60, 90, or 365 days.";
    }
    return null;
  }

  async function saveAll() {
    if (!editingId) return;

    setError(null);
    setSaveNotice(null);

    const validationError = validateSwitchFields();
    if (validationError) return setError(validationError);

    const subject = messageSubject.trim() || "Switch triggered";
    const body = messageBody.trim();
    if (!body) return setError("Message body is required.");

    setSavingSwitch(true);
    setSavingMessage(true);

    const tz = editingSwitch?.timezone || browserTZ;

    const { error: switchError } = await supabase
      .from("switches")
      .update({
        name: editName.trim(),
        interval_days: editIntervalDays,
        timezone: tz,
      })
      .eq("id", editingId);

    if (switchError) {
      setSavingSwitch(false);
      setSavingMessage(false);
      return setError(switchError.message);
    }

    const { error: messageError } = await supabase
      .from("messages")
      .upsert(
        { switch_id: editingId, subject, body },
        { onConflict: "switch_id" }
      );

    if (messageError) {
      setSavingSwitch(false);
      setSavingMessage(false);
      return setError(messageError.message);
    }

    setSavingSwitch(false);
    setSavingMessage(false);

    await refreshOverview();
    setSaveNotice("Saved ✅");
    setTimeout(() => setSaveNotice(null), 1500);
  }

  async function attachRecipientToSwitch(
    switchId: string,
    recipientId: string
  ) {
    const already = switchRecipients.some(
      (sr) => sr.switch_id === switchId && sr.recipient_id === recipientId
    );
    if (already) return;

    setSavingRecipient(true);
    setError(null);

    const { error } = await supabase.from("switch_recipients").insert({
      switch_id: switchId,
      recipient_id: recipientId,
    });

    if (error) {
      setSavingRecipient(false);
      setError(error.message);
      return;
    }

    await loadSwitchRecipients();
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
      setSavingRecipient(false);
      return setError(error.message);
    }

    await loadSwitchRecipients();
    setSavingRecipient(false);
  }

  async function toggleSwitchStatus(switchId: string, makeActive: boolean) {
    setError(null);
    setTogglingId(switchId);

    if (editingId === switchId) setEditingId(null);

    if (makeActive) {
      const nowIso = new Date().toISOString();
      const checkInIso = lastCheckInAt ?? nowIso;

      const { error } = await supabase
        .from("switches")
        .update({
          status: "active",
          last_checkin_at: checkInIso,
          timezone: browserTZ,
        })
        .eq("id", switchId);

      if (error) {
        setTogglingId(null);
        return setError(error.message);
      }
    } else {
      const { error } = await supabase
        .from("switches")
        .update({ status: "paused" })
        .eq("id", switchId);

      if (error) {
        setTogglingId(null);
        return setError(error.message);
      }
    }

    await refreshOverview();
    setTogglingId(null);
  }

  async function deleteSwitchFromEditor() {
    if (!editingId) return;

    const confirmed = window.confirm(
      "Delete this switch? This cannot be undone."
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    setSaveNotice(null);

    const switchId = editingId;

    const { error: srErr } = await supabase
      .from("switch_recipients")
      .delete()
      .eq("switch_id", switchId);
    if (srErr) {
      setDeleting(false);
      return setError(srErr.message);
    }

    const { error: msgErr } = await supabase
      .from("messages")
      .delete()
      .eq("switch_id", switchId);
    if (msgErr) {
      setDeleting(false);
      return setError(msgErr.message);
    }

    const { error: swErr } = await supabase
      .from("switches")
      .delete()
      .eq("id", switchId);
    if (swErr) {
      setDeleting(false);
      return setError(swErr.message);
    }

    setEditingId(null);
    await Promise.all([refreshOverview(), loadSwitchRecipients()]);
    setDeleting(false);
  }

  // ---------- PREVIEW HELPERS ----------
  const createPreviewRecipient =
    recipients.find((r) => r.id === createPreviewRecipientId) ?? null;

  const editPreviewRecipient =
    recipients.find((r) => r.id === editPreviewRecipientId) ?? null;

  const createPreview = renderWithTokens({
    subject: createMessageSubject,
    body: createMessageBody,
    switchName: createName.trim() || "Switch Name",
    intervalDays: createIntervalDays,
    createdAtIso: new Date().toISOString(),
    previewRecipient: createPreviewRecipient
      ? {
          name: createPreviewRecipient.name,
          email: createPreviewRecipient.email,
        }
      : null,
  });

  const editPreview = renderWithTokens({
    subject: messageSubject,
    body: messageBody,
    switchName: editName.trim() || "Switch Name",
    intervalDays: editIntervalDays,
    createdAtIso: editingSwitch?.created_at ?? null,
    previewRecipient: editPreviewRecipient
      ? { name: editPreviewRecipient.name, email: editPreviewRecipient.email }
      : null,
  });

  function handleInsertToken(token: (typeof TOKENS)[number]) {
    if (!focusTarget) return;

    if (focusTarget.mode === "create") {
      if (focusTarget.field === "subject") {
        const el = createSubjectRef.current;
        if (!el) return;
        setCreateMessageSubject((prev) => insertTokenAtCursor(el, prev, token));
      } else {
        const el = createBodyRef.current;
        if (!el) return;
        setCreateMessageBody((prev) => insertTokenAtCursor(el, prev, token));
      }
    } else {
      if (focusTarget.field === "subject") {
        const el = editSubjectRef.current;
        if (!el) return;
        setMessageSubject((prev) => insertTokenAtCursor(el, prev, token));
      } else {
        const el = editBodyRef.current;
        if (!el) return;
        setMessageBody((prev) => insertTokenAtCursor(el, prev, token));
      }
    }
  }

  function handleFormat(kind: "bold" | "italic") {
    if (!focusTarget) return;

    const applyTo = (
      el: HTMLInputElement | HTMLTextAreaElement | null,
      setter: React.Dispatch<React.SetStateAction<string>>
    ) => {
      if (!el) return;

      setter((prev) => {
        if (kind === "bold") return wrapSelectionWith(el, prev, "**", "**");
        return wrapSelectionWith(el, prev, "*", "*");
      });
    };

    if (focusTarget.mode === "create") {
      if (focusTarget.field === "subject") {
        applyTo(createSubjectRef.current, setCreateMessageSubject);
      } else {
        applyTo(createBodyRef.current, setCreateMessageBody);
      }
    } else {
      if (focusTarget.field === "subject") {
        applyTo(editSubjectRef.current, setMessageSubject);
      } else {
        applyTo(editBodyRef.current, setMessageBody);
      }
    }
  }

  const Toolbar = () => (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="border rounded-md px-2 py-1 text-xs font-medium hover:bg-gray-50"
          onClick={() => handleFormat("bold")}
          disabled={!focusTarget}
          title={!focusTarget ? "Click into Subject or Body first" : "Bold"}
        >
          B
        </button>
        <button
          type="button"
          className="border rounded-md px-2 py-1 text-xs italic hover:bg-gray-50"
          onClick={() => handleFormat("italic")}
          disabled={!focusTarget}
          title={!focusTarget ? "Click into Subject or Body first" : "Italic"}
        >
          I
        </button>
      </div>

      <div className="h-4 w-px bg-gray-200 mx-1" />

      <div className="flex flex-wrap gap-2">
        {TOKENS.map((t) => (
          <button
            key={t}
            type="button"
            className="border rounded-full px-3 py-1 text-xs hover:bg-gray-50"
            onClick={() => handleInsertToken(t)}
            disabled={!focusTarget}
            title={
              !focusTarget ? "Click into Subject or Body first" : `Insert ${t}`
            }
          >
            {t}
          </button>
        ))}
      </div>

      <div className="text-xs text-gray-500">
        {!focusTarget
          ? "Click into Subject or Body to insert/format."
          : "Inserts/wraps at selection."}
      </div>
    </div>
  );

  const renderMessagePreview = ({
    title,
    previewAsId,
    setPreviewAsId,
    subject,
    body,
  }: {
    title: string;
    previewAsId: string;
    setPreviewAsId: (v: string) => void;
    subject: string;
    body: string;
  }) => {
    const r = recipients.find((x) => x.id === previewAsId) ?? null;

    return (
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium text-gray-900">{title}</div>

          <select
            className="border rounded-md p-2 text-sm bg-white"
            value={previewAsId}
            onChange={(e) => setPreviewAsId(e.target.value)}
          >
            <option value="">Preview as…</option>
            {recipients.map((rec) => (
              <option key={rec.id} value={rec.id}>
                {rec.name} — {rec.email}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 border rounded-xl p-3 space-y-2 bg-white">
          <div className="text-xs text-gray-500">
            To:{" "}
            <span className="font-medium text-gray-900">
              {r
                ? `${r.name} <${r.email}>`
                : "Recipient Name <recipient@email.com>"}
            </span>
          </div>

          <div className="text-xs text-gray-500">
            Subject:{" "}
            <span className="font-medium text-gray-900">{subject || "—"}</span>
          </div>

          <div className="border-t pt-3">
            <div className="text-sm text-gray-900">
              <ReactMarkdown>
                {markdownPreserveLineBreaks(body || "—")}
              </ReactMarkdown>
            </div>
          </div>

          <div className="border-t pt-2 text-xs text-gray-500">
            (Preview only — message sends when the switch triggers)
          </div>
        </div>
      </Card>
    );
  };

  const renderEditor = () => {
    const isCompleted = editingSwitch?.status === "completed";

    return (
      <Card className="p-5 mt-4 bg-gray-50 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium text-gray-900">
            {isCompleted
              ? "View switch details"
              : "Edit switch (settings, message, recipients)"}
          </div>
          {saveNotice && (
            <div className="text-sm text-gray-700">{saveNotice}</div>
          )}
        </div>

        {/* Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm text-gray-600">Name</div>
            <input
              className="w-full border rounded-md p-2 bg-white"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              disabled={deleting || isCompleted}
            />
          </div>

          <div className="space-y-2">
            <IntervalButtons
              value={editIntervalDays}
              onChange={setEditIntervalDays}
              disabled={deleting || isCompleted}
              label="Interval"
            />
          </div>
        </div>

        {/* Recipients */}
        <div className="border-t pt-4 space-y-3">
          <div className="text-sm font-medium text-gray-900">Recipients</div>

          {attachedRecipientsForEditing.length === 0 ? (
            <p className="text-sm text-gray-600">No recipients attached yet.</p>
          ) : (
            <div className="space-y-2">
              {attachedRecipientsForEditing.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="text-sm text-gray-800">
                    {r.name} <span className="text-gray-500">({r.email})</span>
                  </div>

                  {!isCompleted && (
                    <button
                      type="button"
                      className="text-red-600 hover:underline text-sm"
                      disabled={savingRecipient || deleting}
                      onClick={() => removeRecipient(r.id)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {!isCompleted && (
            <>
              <select
                className="border rounded-md p-2 text-sm w-full bg-white"
                value={selectedRecipientId}
                onChange={async (e) => {
                  const id = e.target.value;
                  setSelectedRecipientId(id);
                  if (!id || !editingId) return;

                  if (attachedRecipientIds.has(id)) {
                    setSelectedRecipientId("");
                    return;
                  }

                  await attachRecipientToSwitch(editingId, id);
                  setSelectedRecipientId("");
                }}
                disabled={deleting}
              >
                <option value="">Select contact…</option>
                {recipients.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} — {r.email}
                  </option>
                ))}
              </select>

              <Card className="p-4 space-y-2 bg-white">
                <div className="text-sm font-medium text-gray-900">
                  Add a new contact
                </div>

                <input
                  className="w-full border rounded-md p-2 text-sm bg-white"
                  placeholder="Name"
                  value={editNewRecipientName}
                  onChange={(e) => setEditNewRecipientName(e.target.value)}
                  disabled={deleting || addingContactInEditor}
                />

                <input
                  className="w-full border rounded-md p-2 text-sm bg-white"
                  placeholder="Email"
                  value={editNewRecipientEmail}
                  onChange={(e) => setEditNewRecipientEmail(e.target.value)}
                  disabled={deleting || addingContactInEditor}
                />

                <Button
                  type="button"
                  onClick={() =>
                    createRecipientAndMaybeSelect({
                      name: editNewRecipientName,
                      email: editNewRecipientEmail,
                      mode: "edit",
                    })
                  }
                  disabled={deleting || addingContactInEditor}
                  className="w-full"
                >
                  {addingContactInEditor ? "Adding..." : "Add contact"}
                </Button>

                <div className="text-xs text-gray-500">
                  This contact will be saved for future switches too.
                </div>
              </Card>
            </>
          )}
        </div>

        {/* Message */}
        <div className="border-t pt-4 space-y-3">
          <div className="text-sm font-medium text-gray-900">Message</div>

          {!isCompleted && <Toolbar />}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <input
                ref={editSubjectRef}
                className="w-full border rounded-md p-2 bg-white"
                placeholder="Subject"
                value={messageSubject}
                onChange={(e) => setMessageSubject(e.target.value)}
                onFocus={() =>
                  setFocusTarget({ mode: "edit", field: "subject" })
                }
                disabled={deleting || isCompleted}
              />

              <textarea
                ref={editBodyRef}
                className="w-full border rounded-md p-2 min-h-[160px] bg-white"
                placeholder="Message body..."
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                onFocus={() => setFocusTarget({ mode: "edit", field: "body" })}
                disabled={deleting || isCompleted}
              />
            </div>

            {renderMessagePreview({
              title: "Preview",
              previewAsId: editPreviewRecipientId,
              setPreviewAsId: setEditPreviewRecipientId,
              subject: editPreview.subject,
              body: editPreview.body,
            })}
          </div>
        </div>

        {/* Save row */}
        <div className="flex flex-wrap gap-2 pt-2">
          {!isCompleted && (
            <Button
              type="button"
              className="border-gray-900"
              disabled={
                savingSwitch || savingMessage || savingRecipient || deleting
              }
              onClick={saveAll}
            >
              {savingSwitch || savingMessage ? "Saving..." : "Save all"}
            </Button>
          )}

          <Button
            type="button"
            onClick={cancelEdit}
            disabled={
              savingSwitch || savingMessage || savingRecipient || deleting
            }
          >
            {isCompleted ? "Close" : "Cancel"}
          </Button>

          <Button
            type="button"
            className="text-red-600"
            onClick={deleteSwitchFromEditor}
            disabled={
              savingSwitch || savingMessage || savingRecipient || deleting
            }
          >
            {deleting ? "Deleting..." : "Delete switch"}
          </Button>
        </div>
      </Card>
    );
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Overview
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Your switches and check-ins, at a glance.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => {
            setEditingId(null);
            setError(null);
            setShowCreate((v) => !v);
            setFocusTarget(null);
          }}
        >
          {showCreate ? "Close" : "Add a switch"}
        </Button>
      </div>

      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="text-sm text-red-700">{error}</div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <StatCard title="Active switches" value={activeCount} />
        <StatCard title="Inactive switches" value={inactiveCount} />
        <StatCard title="Completed switches" value={completedCount} />
        <StatCard
          title="Last check-in"
          value={
            lastCheckInAt
              ? formatDateTime(new Date(lastCheckInAt), browserTZ)
              : "—"
          }
          footer={browserTZ}
        />
      </div>

      {/* CREATE SWITCH PANEL */}
      {showCreate && (
        <Card className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Create a switch</h2>
            <Button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setError(null);
                resetCreateForm();
              }}
            >
              Cancel
            </Button>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-gray-600">Switch name</div>
            <input
              className="w-full border rounded-md p-2 bg-white"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Enter the name of your Switch"
              disabled={creating}
            />
          </div>

          <IntervalButtons
            value={createIntervalDays}
            onChange={setCreateIntervalDays}
            disabled={creating}
            label="Check-in interval"
          />

          {/* Recipients */}
          <div className="border-t pt-4 space-y-3">
            <div className="text-sm font-medium text-gray-900">Recipients</div>

            {recipients.length === 0 ? (
              <p className="text-sm text-gray-600">
                No contacts yet. Add one below.
              </p>
            ) : (
              <select
                className="border rounded-md p-2 text-sm w-full bg-white"
                value={createSelectedRecipientId}
                onChange={(e) => {
                  const id = e.target.value;
                  setCreateSelectedRecipientId(id);
                  if (!id) return;
                  addCreateRecipient(id);
                }}
                disabled={creating}
              >
                <option value="">Select existing contact…</option>
                {recipients.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} — {r.email}
                  </option>
                ))}
              </select>
            )}

            {createRecipientIds.size === 0 ? (
              <div className="text-xs text-gray-500">
                Select at least 1 recipient.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Array.from(createRecipientIds).map((id) => {
                  const r = recipients.find((x) => x.id === id);
                  return (
                    <div
                      key={id}
                      className="flex items-center gap-2 border rounded-full px-3 py-1 text-sm bg-white"
                    >
                      <span className="max-w-[220px] truncate">
                        {r ? `${r.name} (${r.email})` : id}
                      </span>
                      <button
                        type="button"
                        className="opacity-60 hover:opacity-100"
                        onClick={() => toggleCreateRecipient(id)}
                        disabled={creating}
                        aria-label="Remove recipient"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <Card className="p-4 space-y-2 bg-white">
              <div className="text-sm font-medium text-gray-900">
                Add a new contact
              </div>

              <input
                className="w-full border rounded-md p-2 text-sm bg-white"
                placeholder="Name"
                value={newRecipientName}
                onChange={(e) => setNewRecipientName(e.target.value)}
                disabled={creating || addingContact}
              />

              <input
                className="w-full border rounded-md p-2 text-sm bg-white"
                placeholder="Email"
                value={newRecipientEmail}
                onChange={(e) => setNewRecipientEmail(e.target.value)}
                disabled={creating || addingContact}
              />

              <Button
                type="button"
                className="w-full"
                onClick={() =>
                  createRecipientAndMaybeSelect({
                    name: newRecipientName,
                    email: newRecipientEmail,
                    mode: "create",
                  })
                }
                disabled={creating || addingContact}
              >
                {addingContact ? "Adding..." : "Add contact"}
              </Button>

              <div className="text-xs text-gray-500">
                This contact will be saved for future switches too.
              </div>
            </Card>
          </div>

          {/* Message */}
          <div className="border-t pt-4 space-y-3">
            <div className="text-sm font-medium text-gray-900">Message</div>

            <Toolbar />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <input
                  ref={createSubjectRef}
                  className="w-full border rounded-md p-2 bg-white"
                  placeholder="Message title"
                  value={createMessageSubject}
                  onChange={(e) => setCreateMessageSubject(e.target.value)}
                  onFocus={() =>
                    setFocusTarget({ mode: "create", field: "subject" })
                  }
                  disabled={creating}
                />

                <textarea
                  ref={createBodyRef}
                  className="w-full border rounded-md p-2 min-h-[160px] bg-white"
                  placeholder="Message..."
                  value={createMessageBody}
                  onChange={(e) => setCreateMessageBody(e.target.value)}
                  onFocus={() =>
                    setFocusTarget({ mode: "create", field: "body" })
                  }
                  disabled={creating}
                />
              </div>

              {renderMessagePreview({
                title: "Preview",
                previewAsId: createPreviewRecipientId,
                setPreviewAsId: setCreatePreviewRecipientId,
                subject: createPreview.subject,
                body: createPreview.body,
              })}
            </div>
          </div>

          <Button
            type="button"
            className="w-full border-gray-900"
            disabled={creating}
            onClick={createSwitchFromOverview}
          >
            {creating ? "Creating..." : "Create switch"}
          </Button>
        </Card>
      )}

      {/* Active switches */}
      <section className="space-y-3">
        <h2 className="font-semibold text-gray-900">Your active switches</h2>

        {activeSwitches.length === 0 ? (
          <p className="text-sm text-gray-600">No active switches yet.</p>
        ) : (
          <div className="space-y-3">
            {activeSwitches.map((s) => {
              const baseIso = s.last_checkin_at ?? s.created_at;
              const totalDays = (s.interval_days ?? 0) + (s.grace_days ?? 0);
              const triggerDate = addDays(baseIso, totalDays);

              const createdDate = new Date(s.created_at);
              const isToggling = togglingId === s.id;
              const isOpen = editingId === s.id;

              const tz = s.timezone || browserTZ;

              return (
                <Card key={s.id} className="p-5">
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
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="font-semibold text-gray-900 truncate">
                              {s.name}
                            </div>
                            <Badge tone="active">Active</Badge>
                          </div>

                          <div className="mt-2 text-sm text-gray-700">
                            This switch is currently set to trigger on:{" "}
                            <span className="font-medium text-gray-900">
                              {triggerDate
                                ? formatDateTime(triggerDate, tz)
                                : "—"}
                            </span>
                            <span className="text-gray-500"> ({tz})</span>
                          </div>

                          <div className="mt-2 text-xs text-gray-500">
                            Interval: {intervalLabel(s.interval_days)} •
                            Created:{" "}
                            {Number.isNaN(createdDate.getTime())
                              ? "—"
                              : formatDateShort(createdDate)}
                          </div>
                        </div>

                        <Button
                          type="button"
                          onClick={() => {
                            setShowCreate(false);
                            if (isOpen) cancelEdit();
                            else startEdit(s);
                          }}
                        >
                          {isOpen ? "Close" : "Edit"}
                        </Button>
                      </div>

                      {isOpen && renderEditor()}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Inactive switches */}
      <section className="space-y-3">
        <h2 className="font-semibold text-gray-900">Inactive switches</h2>

        {inactiveSwitches.length === 0 ? (
          <p className="text-sm text-gray-600">No inactive switches.</p>
        ) : (
          <div className="space-y-3">
            {inactiveSwitches.map((s) => {
              const createdDate = new Date(s.created_at);
              const isToggling = togglingId === s.id;
              const isOpen = editingId === s.id;

              return (
                <Card key={s.id} className="p-5">
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
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="font-semibold text-gray-900 truncate">
                              {s.name}
                            </div>
                            <Badge tone="neutral">{s.status}</Badge>
                          </div>

                          <div className="mt-2 text-xs text-gray-500">
                            Interval: {intervalLabel(s.interval_days)} •
                            Created:{" "}
                            {Number.isNaN(createdDate.getTime())
                              ? "—"
                              : formatDateShort(createdDate)}
                          </div>
                        </div>

                        <Button
                          type="button"
                          onClick={() => {
                            setShowCreate(false);
                            if (isOpen) cancelEdit();
                            else startEdit(s);
                          }}
                        >
                          {isOpen ? "Close" : "Edit"}
                        </Button>
                      </div>

                      {isOpen && renderEditor()}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Completed switches */}
      <section className="space-y-3">
        <h2 className="font-semibold text-gray-900">Completed switches</h2>

        {completedSwitches.length === 0 ? (
          <p className="text-sm text-gray-600">No completed switches.</p>
        ) : (
          <div className="space-y-3">
            {completedSwitches.map((s) => {
              const createdDate = new Date(s.created_at);
              const isOpen = editingId === s.id;

              return (
                <Card key={s.id} className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="pt-1">
                      <div className="h-6 w-11 flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="font-semibold text-gray-900 truncate">
                              {s.name}
                            </div>
                            <Badge tone="success">Completed</Badge>
                          </div>

                          <div className="mt-2 text-sm text-gray-700">
                            This switch has triggered and notifications were
                            sent.
                          </div>

                          <div className="mt-2 text-xs text-gray-500">
                            Interval: {intervalLabel(s.interval_days)} •
                            Created:{" "}
                            {Number.isNaN(createdDate.getTime())
                              ? "—"
                              : formatDateShort(createdDate)}
                          </div>
                        </div>

                        <Button
                          type="button"
                          onClick={() => {
                            setShowCreate(false);
                            if (isOpen) cancelEdit();
                            else startEdit(s);
                          }}
                        >
                          {isOpen ? "Close" : "View"}
                        </Button>
                      </div>

                      {isOpen && renderEditor()}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
