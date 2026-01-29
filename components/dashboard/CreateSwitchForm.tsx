"use client";

import { useState, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import type { RecipientRow, FocusTarget } from "@/lib/types";
import type { AllowedInterval } from "@/lib/constants";
import { ALLOWED_INTERVALS, DEFAULT_MESSAGE_SUBJECT, DEFAULT_MESSAGE_BODY } from "@/lib/constants";
import { renderWithTokens, insertTokenAtCursor, wrapSelectionWith, getBrowserTimeZone } from "@/lib/utils";

import { IntervalButtons } from "./IntervalButtons";
import { MessageToolbar } from "./MessageToolbar";
import { MessagePreview } from "./MessagePreview";
import { Icons } from "./Icons";

interface CreateSwitchFormProps {
  recipients: RecipientRow[];
  onClose: () => void;
  onSuccess: () => Promise<void>;
  onError: (error: string) => void;
  canCreateSwitch: boolean;
  canAddRecipient: boolean;
  planName: string;
  maxSwitches: number;
  maxRecipients: number;
  getNextDefaultSwitchName: () => string;
  onCreateRecipient: (name: string, email: string) => Promise<{ data: RecipientRow | null; error: string | null; isExisting: boolean }>;
  refreshUsage: () => Promise<void>;
}

export function CreateSwitchForm({
  recipients,
  onClose,
  onSuccess,
  onError,
  canCreateSwitch,
  canAddRecipient,
  planName,
  maxSwitches,
  maxRecipients,
  getNextDefaultSwitchName,
  onCreateRecipient,
  refreshUsage,
}: CreateSwitchFormProps) {
  const browserTZ = useMemo(() => getBrowserTimeZone("UTC"), []);

  const [createName, setCreateName] = useState("");
  const [createIntervalDays, setCreateIntervalDays] = useState<AllowedInterval>(30);
  const [createMessageSubject, setCreateMessageSubject] = useState(DEFAULT_MESSAGE_SUBJECT);
  const [createMessageBody, setCreateMessageBody] = useState(DEFAULT_MESSAGE_BODY);

  const [createRecipientIds, setCreateRecipientIds] = useState<Set<string>>(new Set());
  const [createSelectedRecipientId, setCreateSelectedRecipientId] = useState("");
  const [newRecipientName, setNewRecipientName] = useState("");
  const [newRecipientEmail, setNewRecipientEmail] = useState("");
  const [addingContact, setAddingContact] = useState(false);

  const [creating, setCreating] = useState(false);
  const [recipientError, setRecipientError] = useState<string | null>(null);

  const [createPreviewRecipientId, setCreatePreviewRecipientId] = useState("");
  const [focusTarget, setFocusTarget] = useState<FocusTarget>(null);

  const createSubjectRef = useRef<HTMLInputElement | null>(null);
  const createBodyRef = useRef<HTMLTextAreaElement | null>(null);

  // Preview
  const createPreviewRecipient = recipients.find((r) => r.id === createPreviewRecipientId) ?? null;
  const createPreview = renderWithTokens({
    subject: createMessageSubject,
    body: createMessageBody,
    switchName: createName.trim() || "Switch Name",
    intervalDays: createIntervalDays,
    createdAtIso: new Date().toISOString(),
    previewRecipient: createPreviewRecipient
      ? { name: createPreviewRecipient.name, email: createPreviewRecipient.email }
      : null,
  });

  function toggleCreateRecipient(id: string) {
    setCreateRecipientIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setRecipientError(null);
  }

  function addCreateRecipient(recipientId: string) {
    if (!recipientId) return;
    setCreateRecipientIds((prev) => {
      const next = new Set(prev);
      next.add(recipientId);
      return next;
    });
    setCreateSelectedRecipientId("");
    setRecipientError(null);
  }

  function handleInsertToken(token: string) {
    if (!focusTarget || focusTarget.mode !== "create") return;

    if (focusTarget.field === "subject") {
      const el = createSubjectRef.current;
      if (!el) return;
      setCreateMessageSubject((prev) => insertTokenAtCursor(el, prev, token));
    } else {
      const el = createBodyRef.current;
      if (!el) return;
      setCreateMessageBody((prev) => insertTokenAtCursor(el, prev, token));
    }
  }

  function handleFormat(kind: "bold" | "italic") {
    if (!focusTarget || focusTarget.mode !== "create") return;

    const applyTo = (
      el: HTMLInputElement | HTMLTextAreaElement | null,
      setter: React.Dispatch<React.SetStateAction<string>>,
    ) => {
      if (!el) return;
      setter((prev) => {
        if (kind === "bold") return wrapSelectionWith(el, prev, "**", "**");
        return wrapSelectionWith(el, prev, "*", "*");
      });
    };

    if (focusTarget.field === "subject") {
      applyTo(createSubjectRef.current, setCreateMessageSubject);
    } else {
      applyTo(createBodyRef.current, setCreateMessageBody);
    }
  }

  async function handleAddNewRecipient() {
    if (!canAddRecipient) {
      onError(`You've reached your ${planName} plan limit of ${maxRecipients} recipients. Please upgrade to add more.`);
      return;
    }

    setAddingContact(true);

    const result = await onCreateRecipient(newRecipientName, newRecipientEmail);

    if (result.error) {
      setAddingContact(false);
      onError(result.error);
      return;
    }

    if (result.data) {
      setCreateRecipientIds((prev) => {
        const next = new Set(prev);
        next.add(result.data!.id);
        return next;
      });
      if (!result.isExisting) {
        await refreshUsage();
      }
      setRecipientError(null);
    }

    setNewRecipientName("");
    setNewRecipientEmail("");
    setAddingContact(false);
  }

  async function handleCreateSwitch() {
    if (!canCreateSwitch) {
      onError(`You've reached your ${planName} plan limit of ${maxSwitches} switch${maxSwitches === 1 ? "" : "es"}. Please upgrade to create more.`);
      return;
    }

    if (!ALLOWED_INTERVALS.includes(createIntervalDays)) {
      onError("Interval must be one of: 24 hours, 7, 14, 30, 60, 90, or 365 days.");
      return;
    }
    if (!createMessageBody.trim()) {
      onError("Message body is required.");
      return;
    }
    if (createRecipientIds.size === 0) {
      setRecipientError("At least one recipient must be selected.");
      return;
    }

    setCreating(true);
    setRecipientError(null);

    const finalName = createName.trim() || getNextDefaultSwitchName();
    const nowIso = new Date().toISOString();

    const { data: inserted, error: insertError } = await supabase
      .from("switches")
      .insert({
        name: finalName,
        interval_days: createIntervalDays,
        grace_days: 0,
        status: "active",
        last_checkin_at: nowIso,
        timezone: browserTZ,
      })
      .select("id")
      .single();

    if (insertError || !inserted?.id) {
      setCreating(false);
      onError(insertError?.message ?? "Failed to create switch.");
      return;
    }

    const switchId = inserted.id as string;

    const subject = createMessageSubject.trim() || DEFAULT_MESSAGE_SUBJECT;
    const body = createMessageBody.trim();

    const { error: msgError } = await supabase
      .from("messages")
      .upsert(
        { switch_id: switchId, subject, body },
        { onConflict: "switch_id" },
      );

    if (msgError) {
      setCreating(false);
      onError(msgError.message);
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
      setCreating(false);
      onError(srError.message);
      return;
    }

    await onSuccess();
    await refreshUsage();
    setCreating(false);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Create a Switch</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {Icons.close}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Name + Interval */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Switch name</label>
            <input
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="e.g. Daily check-in, Weekly wellness..."
              disabled={creating}
            />
          </div>

          <IntervalButtons
            value={createIntervalDays}
            onChange={setCreateIntervalDays}
            disabled={creating}
            label="Check-in interval"
          />
        </div>

        {/* Recipients */}
        <div className="pt-4 border-t border-gray-100 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Recipients</h3>

          {createRecipientIds.size === 0 ? (
            <p className="text-sm text-gray-500">Select at least 1 recipient below.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {Array.from(createRecipientIds).map((id) => {
                const r = recipients.find((x) => x.id === id);
                return (
                  <div
                    key={id}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white text-xs font-medium">
                      {r?.name[0]?.toUpperCase() ?? "?"}
                    </div>
                    <span className="text-gray-700 max-w-[180px] truncate">
                      {r ? r.name : id}
                    </span>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      onClick={() => toggleCreateRecipient(id)}
                      disabled={creating}
                      aria-label="Remove recipient"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {recipients.length > 0 && (
              <select
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                value={createSelectedRecipientId}
                onChange={(e) => {
                  const id = e.target.value;
                  setCreateSelectedRecipientId(id);
                  if (!id) return;
                  addCreateRecipient(id);
                }}
                disabled={creating}
              >
                <option value="">Add existing contact…</option>
                {recipients.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} — {r.email}
                  </option>
                ))}
              </select>
            )}

            <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-3">
              <p className="text-sm font-medium text-gray-700">Or add new contact</p>
              <div className="flex gap-2">
                <input
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                  placeholder="Name"
                  value={newRecipientName}
                  onChange={(e) => setNewRecipientName(e.target.value)}
                  disabled={creating || addingContact}
                />
                <input
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                  placeholder="Email"
                  value={newRecipientEmail}
                  onChange={(e) => setNewRecipientEmail(e.target.value)}
                  disabled={creating || addingContact}
                />
                <button
                  type="button"
                  onClick={handleAddNewRecipient}
                  disabled={creating || addingContact}
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {addingContact ? "..." : "Add"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="pt-4 border-t border-gray-100 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Message</h3>

          <MessageToolbar
            onFormat={handleFormat}
            onInsertToken={handleInsertToken}
            disabled={!focusTarget || focusTarget.mode !== "create"}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              <input
                ref={createSubjectRef}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                placeholder="Subject line"
                value={createMessageSubject}
                onChange={(e) => setCreateMessageSubject(e.target.value)}
                onFocus={() => setFocusTarget({ mode: "create", field: "subject" })}
                disabled={creating}
              />

              <textarea
                ref={createBodyRef}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm min-h-[180px] resize-none focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                placeholder="Write your message here..."
                value={createMessageBody}
                onChange={(e) => setCreateMessageBody(e.target.value)}
                onFocus={() => setFocusTarget({ mode: "create", field: "body" })}
                disabled={creating}
              />
            </div>

            <MessagePreview
              title="Preview"
              previewAsId={createPreviewRecipientId}
              setPreviewAsId={setCreatePreviewRecipientId}
              subject={createPreview.subject}
              body={createPreview.body}
              recipients={recipients}
            />
          </div>
        </div>

        {/* Recipient Error */}
        {recipientError && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {recipientError}
          </div>
        )}

        {/* Create Button */}
        <button
          type="button"
          className="w-full py-3.5 bg-gradient-to-r from-gray-900 to-gray-800 text-white text-sm font-semibold rounded-xl hover:from-gray-800 hover:to-gray-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50"
          disabled={creating}
          onClick={handleCreateSwitch}
        >
          {creating ? "Creating..." : "Create Switch"}
        </button>
      </div>
    </div>
  );
}
