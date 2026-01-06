"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";

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

const ALLOWED_INTERVALS = [1, 7, 14, 30, 60, 90, 365] as const;
type AllowedInterval = (typeof ALLOWED_INTERVALS)[number];

const TOKENS = ["{recipient_name}", "{recipient_first_name}"] as const;

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

function formatDateShort(d: Date) {
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
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
        <div className="text-sm opacity-80">{label}</div>
        <div className="text-sm font-medium">
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
                "border rounded-md px-3 py-2 text-sm transition",
                active ? "bg-black text-white border-black" : "",
                disabled ? "opacity-50 cursor-not-allowed" : "",
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
  switchName,
  intervalDays,
  createdAtIso,
  previewRecipient,
}: {
  subject: string;
  body: string;
  switchName: string;
  intervalDays: number;
  createdAtIso: string | null;
  previewRecipient: { name: string; email: string } | null;
}) {
  const createdDate =
    createdAtIso && !Number.isNaN(new Date(createdAtIso).getTime())
      ? new Date(createdAtIso)
      : null;

  const triggerDate =
    createdAtIso && createdDate ? addDays(createdAtIso, intervalDays) : null;

  const intervalLabel =
    intervalDays === 1 ? "24 hours" : `${intervalDays} days`;

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

  // keep unused params (switchName/intervalDays/etc) untouched — leaving your structure the same
  void switchName;
  void intervalLabel;
  void triggerDate;
  void createdDate;

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
  // ReactMarkdown treats single newlines as spaces; force hard breaks.
  // This keeps your existing "plain text feel" while enabling markdown features.
  return (text ?? "").replace(/\n/g, "  \n");
}

export default function DashboardOverviewPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);

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

  // ---------- LOADERS ----------
  async function refreshOverview() {
    setError(null);

    const [
      { count: active, error: activeErr },
      { count: inactive, error: inErr },
    ] = await Promise.all([
      supabase
        .from("switches")
        .select("*", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("switches")
        .select("*", { count: "exact", head: true })
        .neq("status", "active"),
    ]);

    if (activeErr) return setError(activeErr.message);
    if (inErr) return setError(inErr.message);

    setActiveCount(active ?? 0);
    setInactiveCount(inactive ?? 0);

    const [
      { data: actData, error: actListErr },
      { data: inData, error: inListErr },
    ] = await Promise.all([
      supabase
        .from("switches")
        .select("id,name,status,interval_days,grace_days,created_at")
        .eq("status", "active")
        .order("created_at", { ascending: false }),
      supabase
        .from("switches")
        .select("id,name,status,interval_days,grace_days,created_at")
        .neq("status", "active")
        .order("created_at", { ascending: false }),
    ]);

    if (actListErr) return setError(actListErr.message);
    if (inListErr) return setError(inListErr.message);

    setActiveSwitches((actData ?? []) as SwitchRow[]);
    setInactiveSwitches((inData ?? []) as SwitchRow[]);
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
    const all = [...activeSwitches, ...inactiveSwitches];

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

    const { data: inserted, error: insertError } = await supabase
      .from("switches")
      .insert({
        name: finalName,
        interval_days: createIntervalDays,
        grace_days: 0,
        status: "active",
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
      null
    );
  }, [editingId, activeSwitches, inactiveSwitches]);

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

    const { error: switchError } = await supabase
      .from("switches")
      .update({
        name: editName.trim(),
        interval_days: editIntervalDays,
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

    const nextStatus = makeActive ? "active" : "paused";

    const { error } = await supabase
      .from("switches")
      .update({ status: nextStatus })
      .eq("id", switchId);

    if (error) {
      setTogglingId(null);
      return setError(error.message);
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

  // ---------- UI ----------
  const Toolbar = () => (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="border rounded-md px-2 py-1 text-xs font-medium"
          onClick={() => handleFormat("bold")}
          disabled={!focusTarget}
          title={!focusTarget ? "Click into Subject or Body first" : "Bold"}
        >
          B
        </button>
        <button
          type="button"
          className="border rounded-md px-2 py-1 text-xs italic"
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
            className="border rounded-full px-3 py-1 text-xs"
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

      <div className="text-xs opacity-60">
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
      <div className="border rounded-xl p-3 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium">{title}</div>

          <select
            className="border rounded-md p-2 text-sm"
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

        <div className="border rounded-lg p-3 space-y-2 bg-white">
          <div className="text-xs opacity-70">
            To:{" "}
            <span className="font-medium">
              {r
                ? `${r.name} <${r.email}>`
                : "Recipient Name <recipient@email.com>"}
            </span>
          </div>

          <div className="text-xs opacity-70">
            Subject: <span className="font-medium">{subject || "—"}</span>
          </div>

          <div className="border-t pt-3">
            <div className="text-sm">
              <ReactMarkdown>
                {markdownPreserveLineBreaks(body || "—")}
              </ReactMarkdown>
            </div>
          </div>

          <div className="border-t pt-2 text-xs opacity-60">
            (Preview only — message sends when the switch triggers)
          </div>
        </div>
      </div>
    );
  };

  const renderEditor = () => (
    <div className="border rounded-xl p-4 space-y-4 mt-3">
      <div className="text-sm font-medium">
        Edit switch (settings, message, recipients)
      </div>

      {saveNotice && <div className="text-sm opacity-80">{saveNotice}</div>}

      <div className="space-y-1">
        <div className="text-sm opacity-80">Name</div>
        <input
          className="w-full border rounded-md p-2"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
        />
      </div>

      <IntervalButtons
        value={editIntervalDays}
        onChange={setEditIntervalDays}
        disabled={deleting}
        label="Interval"
      />

      {/* Recipients FIRST */}
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
                  disabled={savingRecipient || deleting}
                  onClick={() => removeRecipient(r.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <select
          className="border rounded-md p-2 text-sm w-full"
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

        <div className="border rounded-xl p-3 space-y-2">
          <div className="text-sm font-medium">Add a new contact</div>

          <input
            className="w-full border rounded-md p-2 text-sm"
            placeholder="Name"
            value={editNewRecipientName}
            onChange={(e) => setEditNewRecipientName(e.target.value)}
            disabled={deleting || addingContactInEditor}
          />

          <input
            className="w-full border rounded-md p-2 text-sm"
            placeholder="Email"
            value={editNewRecipientEmail}
            onChange={(e) => setEditNewRecipientEmail(e.target.value)}
            disabled={deleting || addingContactInEditor}
          />

          <button
            type="button"
            className="border rounded-md px-3 py-2 text-sm w-full"
            onClick={() =>
              createRecipientAndMaybeSelect({
                name: editNewRecipientName,
                email: editNewRecipientEmail,
                mode: "edit",
              })
            }
            disabled={deleting || addingContactInEditor}
          >
            {addingContactInEditor ? "Adding..." : "Add contact"}
          </button>

          <div className="text-xs opacity-70">
            This contact will be saved for future switches too.
          </div>
        </div>
      </div>

      {/* Message RIGHT ABOVE SAVE */}
      <div className="border-t pt-4 space-y-3">
        <div className="text-sm font-medium">Message</div>

        <Toolbar />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <input
              ref={editSubjectRef}
              className="w-full border rounded-md p-2"
              placeholder="Subject"
              value={messageSubject}
              onChange={(e) => setMessageSubject(e.target.value)}
              onFocus={() => setFocusTarget({ mode: "edit", field: "subject" })}
              disabled={deleting}
            />

            <textarea
              ref={editBodyRef}
              className="w-full border rounded-md p-2 min-h-[160px]"
              placeholder="Message body..."
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              onFocus={() => setFocusTarget({ mode: "edit", field: "body" })}
              disabled={deleting}
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
        <button
          type="button"
          className="border rounded-md px-3 py-2 text-sm"
          disabled={
            savingSwitch || savingMessage || savingRecipient || deleting
          }
          onClick={saveAll}
        >
          {savingSwitch || savingMessage ? "Saving..." : "Save all"}
        </button>

        <button
          type="button"
          className="border rounded-md px-3 py-2 text-sm"
          onClick={cancelEdit}
          disabled={
            savingSwitch || savingMessage || savingRecipient || deleting
          }
        >
          Cancel
        </button>

        <button
          type="button"
          className="border rounded-md px-3 py-2 text-sm text-red-600"
          onClick={deleteSwitchFromEditor}
          disabled={
            savingSwitch || savingMessage || savingRecipient || deleting
          }
        >
          {deleting ? "Deleting..." : "Delete switch"}
        </button>
      </div>
    </div>
  );

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Overview</h1>

      {error && <div className="border rounded-md p-3 text-sm">{error}</div>}

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
              setFocusTarget(null);
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

          {/* Recipients FIRST */}
          <div className="border-t pt-4 space-y-3">
            <div className="text-sm font-medium">Recipients</div>

            {recipients.length === 0 ? (
              <p className="text-sm opacity-80">
                No contacts yet. Add one below.
              </p>
            ) : (
              <select
                className="border rounded-md p-2 text-sm w-full"
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
              <div className="text-xs opacity-70">
                Select at least 1 recipient.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Array.from(createRecipientIds).map((id) => {
                  const r = recipients.find((x) => x.id === id);
                  return (
                    <div
                      key={id}
                      className="flex items-center gap-2 border rounded-full px-3 py-1 text-sm"
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

            <div className="border rounded-xl p-3 space-y-2">
              <div className="text-sm font-medium">Add a new contact</div>

              <input
                className="w-full border rounded-md p-2 text-sm"
                placeholder="Name"
                value={newRecipientName}
                onChange={(e) => setNewRecipientName(e.target.value)}
                disabled={creating || addingContact}
              />

              <input
                className="w-full border rounded-md p-2 text-sm"
                placeholder="Email"
                value={newRecipientEmail}
                onChange={(e) => setNewRecipientEmail(e.target.value)}
                disabled={creating || addingContact}
              />

              <button
                type="button"
                className="border rounded-md px-3 py-2 text-sm w-full"
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
              </button>

              <div className="text-xs opacity-70">
                This contact will be saved for future switches too.
              </div>
            </div>
          </div>

          {/* Message RIGHT ABOVE CREATE */}
          <div className="border-t pt-4 space-y-3">
            <div className="text-sm font-medium">Message</div>

            <Toolbar />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <input
                  ref={createSubjectRef}
                  className="w-full border rounded-md p-2"
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
                  className="w-full border rounded-md p-2 min-h-[160px]"
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
              const createdDate = new Date(s.created_at);
              const isToggling = togglingId === s.id;
              const isOpen = editingId === s.id;

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
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{s.name}</div>

                          <div className="mt-1 text-sm opacity-80">
                            This switch is currently set to trigger at:{" "}
                            <span className="font-medium">
                              {triggerDate ? formatDateLong(triggerDate) : "—"}
                            </span>
                          </div>

                          <div className="mt-1 text-xs opacity-70">
                            Interval: {intervalLabel(s.interval_days)} •
                            Created:{" "}
                            {Number.isNaN(createdDate.getTime())
                              ? "—"
                              : formatDateShort(createdDate)}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="border rounded-md px-3 py-2 text-sm"
                          onClick={() => {
                            setShowCreate(false);
                            if (isOpen) cancelEdit();
                            else startEdit(s);
                          }}
                        >
                          {isOpen ? "Close" : "Edit"}
                        </button>
                      </div>

                      {isOpen && renderEditor()}
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
              const createdDate = new Date(s.created_at);
              const isToggling = togglingId === s.id;
              const isOpen = editingId === s.id;

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
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{s.name}</div>

                          <div className="mt-1 text-xs opacity-70">
                            Interval: {intervalLabel(s.interval_days)} •
                            Created:{" "}
                            {Number.isNaN(createdDate.getTime())
                              ? "—"
                              : formatDateShort(createdDate)}
                          </div>

                          <div className="mt-1 text-xs opacity-70">
                            Status: {s.status}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="border rounded-md px-3 py-2 text-sm"
                          onClick={() => {
                            setShowCreate(false);
                            if (isOpen) cancelEdit();
                            else startEdit(s);
                          }}
                        >
                          {isOpen ? "Close" : "Edit"}
                        </button>
                      </div>

                      {isOpen && renderEditor()}
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
