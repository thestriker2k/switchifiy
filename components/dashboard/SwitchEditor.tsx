"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import type { SwitchRow, RecipientRow, SwitchRecipientRow, FocusTarget } from "@/lib/types";
import type { AllowedInterval } from "@/lib/constants";
import { ALLOWED_INTERVALS, DEFAULT_MESSAGE_SUBJECT, DEFAULT_MESSAGE_BODY } from "@/lib/constants";
import { renderWithTokens, insertTokenAtCursor, wrapSelectionWith, getBrowserTimeZone } from "@/lib/utils";

import { IntervalButtons } from "./IntervalButtons";
import { MessageComposer } from "./MessageComposer";
import { MessagePreview } from "./MessagePreview";

interface SwitchEditorProps {
  switchData: SwitchRow;
  recipients: RecipientRow[];
  switchRecipients: SwitchRecipientRow[];
  onClose: () => void;
  onSave: () => Promise<void>;
  onDelete: () => Promise<void>;
  onRecipientsChange: () => Promise<void>;
  onError: (error: string) => void;
  canAddRecipient: boolean;
  planName: string;
  maxRecipients: number;
  onCreateRecipient: (name: string, email: string) => Promise<{ data: RecipientRow | null; error: string | null; isExisting: boolean }>;
  refreshUsage: () => Promise<void>;
}

export function SwitchEditor({
  switchData,
  recipients,
  switchRecipients,
  onClose,
  onSave,
  onDelete,
  onRecipientsChange,
  onError,
  canAddRecipient,
  planName,
  maxRecipients,
  onCreateRecipient,
  refreshUsage,
}: SwitchEditorProps) {
  const isCompleted = switchData.status === "completed";
  const browserTZ = useMemo(() => getBrowserTimeZone("UTC"), []);

  // Form state
  const [editName, setEditName] = useState(switchData.name);
  const [editIntervalDays, setEditIntervalDays] = useState<AllowedInterval>(() => {
    return ALLOWED_INTERVALS.includes(switchData.interval_days as AllowedInterval)
      ? (switchData.interval_days as AllowedInterval)
      : 30;
  });

  const [messageSubject, setMessageSubject] = useState(DEFAULT_MESSAGE_SUBJECT);
  const [messageBody, setMessageBody] = useState("");

  const [selectedRecipientId, setSelectedRecipientId] = useState("");
  const [editNewRecipientName, setEditNewRecipientName] = useState("");
  const [editNewRecipientEmail, setEditNewRecipientEmail] = useState("");
  const [addingContactInEditor, setAddingContactInEditor] = useState(false);

  const [savingSwitch, setSavingSwitch] = useState(false);
  const [savingMessage, setSavingMessage] = useState(false);
  const [savingRecipient, setSavingRecipient] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [recipientError, setRecipientError] = useState<string | null>(null);

  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const [focusTarget, setFocusTarget] = useState<FocusTarget>(null);
  const [editPreviewRecipientId, setEditPreviewRecipientId] = useState("");

  const editSubjectRef = useRef<HTMLInputElement | null>(null);
  const editBodyRef = useRef<HTMLTextAreaElement | null>(null);

  // Attached recipients
  const attachedRecipientsForEditing = useMemo(() => {
    const ids = new Set(
      switchRecipients
        .filter((sr) => sr.switch_id === switchData.id)
        .map((sr) => sr.recipient_id),
    );
    return recipients.filter((r) => ids.has(r.id));
  }, [recipients, switchRecipients, switchData.id]);

  const attachedRecipientIds = useMemo(() => {
    return new Set(
      switchRecipients
        .filter((sr) => sr.switch_id === switchData.id)
        .map((sr) => sr.recipient_id),
    );
  }, [switchRecipients, switchData.id]);

  // Load message on mount
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("switch_id", switchData.id)
        .maybeSingle();

      if (error) {
        setMessageSubject(DEFAULT_MESSAGE_SUBJECT);
        setMessageBody("");
        onError(error.message);
        return;
      }

      if (data) {
        setMessageSubject(data.subject ?? DEFAULT_MESSAGE_SUBJECT);
        setMessageBody(data.body ?? "");
      } else {
        setMessageSubject(DEFAULT_MESSAGE_SUBJECT);
        setMessageBody(DEFAULT_MESSAGE_BODY);
      }
    })();
  }, [switchData.id, onError]);

  // Preview
  const editPreviewRecipient = recipients.find((r) => r.id === editPreviewRecipientId) ?? null;
  const editPreview = renderWithTokens({
    subject: messageSubject,
    body: messageBody,
    switchName: editName.trim() || "Switch Name",
    intervalDays: editIntervalDays,
    createdAtIso: switchData.created_at ?? null,
    previewRecipient: editPreviewRecipient
      ? { name: editPreviewRecipient.name, email: editPreviewRecipient.email }
      : null,
  });

  // Handlers
  function handleInsertToken(token: string) {
    if (!focusTarget || focusTarget.mode !== "edit") return;

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

  function handleFormat(kind: "bold" | "italic") {
    if (!focusTarget || focusTarget.mode !== "edit") return;

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
      applyTo(editSubjectRef.current, setMessageSubject);
    } else {
      applyTo(editBodyRef.current, setMessageBody);
    }
  }

  async function handleSaveAll() {
    if (!editName.trim()) {
      onError("Switch name is required.");
      return;
    }
    if (!ALLOWED_INTERVALS.includes(editIntervalDays)) {
      onError("Interval must be one of: 24 hours, 7, 14, 30, 60, 90, or 365 days.");
      return;
    }
    if (attachedRecipientsForEditing.length === 0) {
      onError("At least one recipient is required.");
      return;
    }

    const subject = messageSubject.trim() || DEFAULT_MESSAGE_SUBJECT;
    const body = messageBody.trim();
    if (!body) {
      onError("Message body is required.");
      return;
    }

    setSavingSwitch(true);
    setSavingMessage(true);

    const tz = switchData.timezone || browserTZ;

    const { error: switchError } = await supabase
      .from("switches")
      .update({
        name: editName.trim(),
        interval_days: editIntervalDays,
        timezone: tz,
      })
      .eq("id", switchData.id);

    if (switchError) {
      setSavingSwitch(false);
      setSavingMessage(false);
      onError(switchError.message);
      return;
    }

    const { error: messageError } = await supabase
      .from("messages")
      .upsert(
        { switch_id: switchData.id, subject, body },
        { onConflict: "switch_id" },
      );

    if (messageError) {
      setSavingSwitch(false);
      setSavingMessage(false);
      onError(messageError.message);
      return;
    }

    setSavingSwitch(false);
    setSavingMessage(false);

    await onSave();
    setSaveNotice("Saved");
    setTimeout(() => setSaveNotice(null), 1500);
  }

  async function attachRecipientToSwitch(recipientId: string) {
    if (attachedRecipientIds.has(recipientId)) return;

    setSavingRecipient(true);

    const { error } = await supabase.from("switch_recipients").insert({
      switch_id: switchData.id,
      recipient_id: recipientId,
    });

    if (error) {
      setSavingRecipient(false);
      onError(error.message);
      return;
    }

    await onRecipientsChange();
    setSavingRecipient(false);
  }

  async function removeRecipient(recipientId: string) {
    // Prevent removing the last recipient
    if (attachedRecipientsForEditing.length <= 1) {
      setRecipientError("At least one recipient is required.");
      setTimeout(() => setRecipientError(null), 3000);
      return;
    }

    setRecipientError(null);
    setSavingRecipient(true);

    const { error } = await supabase
      .from("switch_recipients")
      .delete()
      .eq("switch_id", switchData.id)
      .eq("recipient_id", recipientId);

    if (error) {
      setSavingRecipient(false);
      onError(error.message);
      return;
    }

    await onRecipientsChange();
    setSavingRecipient(false);
  }

  async function handleAddNewRecipient() {
    if (!canAddRecipient) {
      onError(`You've reached your ${planName} plan limit of ${maxRecipients} recipients. Please upgrade to add more.`);
      return;
    }

    setAddingContactInEditor(true);

    const result = await onCreateRecipient(editNewRecipientName, editNewRecipientEmail);

    if (result.error) {
      setAddingContactInEditor(false);
      onError(result.error);
      return;
    }

    if (result.data) {
      await attachRecipientToSwitch(result.data.id);
      if (!result.isExisting) {
        await refreshUsage();
      }
    }

    setEditNewRecipientName("");
    setEditNewRecipientEmail("");
    setAddingContactInEditor(false);
  }

  function openDeleteModal() {
    setShowDeleteModal(true);
  }

  function closeDeleteModal() {
    setShowDeleteModal(false);
  }

  async function confirmDelete() {
    setDeleting(true);

    const { error: srErr } = await supabase
      .from("switch_recipients")
      .delete()
      .eq("switch_id", switchData.id);
    if (srErr) {
      setDeleting(false);
      onError(srErr.message);
      return;
    }

    const { error: msgErr } = await supabase
      .from("messages")
      .delete()
      .eq("switch_id", switchData.id);
    if (msgErr) {
      setDeleting(false);
      onError(msgErr.message);
      return;
    }

    const { error: swErr } = await supabase
      .from("switches")
      .delete()
      .eq("id", switchData.id);
    if (swErr) {
      setDeleting(false);
      onError(swErr.message);
      return;
    }

    setDeleting(false);
    setShowDeleteModal(false);
    await onDelete();
  }

  return (
    <div className="mt-4 p-4 sm:p-6 bg-gray-50/80 rounded-2xl border border-gray-100 space-y-5 sm:space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">
          {isCompleted ? "Switch Details" : "Edit Switch"}
        </h3>
        {saveNotice && (
          <span className="text-xs sm:text-sm font-medium text-emerald-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {saveNotice}
          </span>
        )}
      </div>

      {/* Settings */}
      <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Name</label>
          <input
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-all"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            disabled={deleting || isCompleted}
          />
        </div>

        <IntervalButtons
          value={editIntervalDays}
          onChange={setEditIntervalDays}
          disabled={deleting || isCompleted}
          label="Interval"
        />
      </div>

      {/* Recipients */}
      <div className="pt-4 sm:pt-5 border-t border-gray-200 space-y-3 sm:space-y-4">
        <h4 className="text-sm font-semibold text-gray-900">Recipients</h4>

        {recipientError && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {recipientError}
          </div>
        )}

        {attachedRecipientsForEditing.length === 0 ? (
          <p className="text-sm text-gray-500">No recipients attached yet.</p>
        ) : (
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
            {attachedRecipientsForEditing.map((r) => (
              <div
                key={r.id}
                className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                  {r.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-gray-700 block truncate">{r.name}</span>
                  <span className="text-gray-400 text-xs block truncate sm:hidden">{r.email}</span>
                </div>
                <span className="text-gray-400 text-xs hidden sm:inline">({r.email})</span>

                {!isCompleted && (
                  <button
                    type="button"
                    className="ml-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 p-1 -m-1"
                    disabled={savingRecipient || deleting}
                    onClick={() => removeRecipient(r.id)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {!isCompleted && (
          <div className="space-y-3 sm:grid sm:grid-cols-1 lg:grid-cols-2 sm:gap-4 sm:space-y-0">
            <select
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              value={selectedRecipientId}
              onChange={async (e) => {
                const id = e.target.value;
                setSelectedRecipientId(id);
                if (!id) return;

                if (attachedRecipientIds.has(id)) {
                  setSelectedRecipientId("");
                  return;
                }

                await attachRecipientToSwitch(id);
                setSelectedRecipientId("");
              }}
              disabled={deleting}
            >
              <option value="">Add existing contact...</option>
              {recipients.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} - {r.email}
                </option>
              ))}
            </select>

            <div className="p-3 sm:p-4 bg-white border border-gray-200 rounded-xl space-y-2 sm:space-y-3">
              <p className="text-sm font-medium text-gray-700">Or add new contact</p>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    className="flex-1 min-w-0 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                    placeholder="Name"
                    value={editNewRecipientName}
                    onChange={(e) => setEditNewRecipientName(e.target.value)}
                    disabled={deleting || addingContactInEditor}
                  />
                  <input
                    className="flex-1 min-w-0 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                    placeholder="Email"
                    value={editNewRecipientEmail}
                    onChange={(e) => setEditNewRecipientEmail(e.target.value)}
                    disabled={deleting || addingContactInEditor}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddNewRecipient}
                  disabled={deleting || addingContactInEditor}
                  className="w-full sm:w-auto px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {addingContactInEditor ? "Adding..." : "Add Contact"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Message */}
      <div className="pt-4 sm:pt-5 border-t border-gray-200 space-y-3 sm:space-y-4">
        <h4 className="text-sm font-semibold text-gray-900">Message</h4>

        <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
          {isCompleted ? (
            // Read-only view for completed switches
            <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 space-y-3">
              <div className="text-xs text-gray-500">
                Subject: <span className="font-medium text-gray-900">{messageSubject}</span>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{messageBody}</p>
              </div>
            </div>
          ) : (
            <MessageComposer
              subject={messageSubject}
              setSubject={setMessageSubject}
              body={messageBody}
              setBody={setMessageBody}
              disabled={deleting}
              focusTarget={focusTarget}
              setFocusTarget={setFocusTarget}
              subjectRef={editSubjectRef}
              bodyRef={editBodyRef}
              onInsertToken={handleInsertToken}
              onFormat={handleFormat}
              mode="edit"
            />
          )}

          <MessagePreview
            title="Preview"
            previewAsId={editPreviewRecipientId}
            setPreviewAsId={setEditPreviewRecipientId}
            subject={editPreview.subject}
            body={editPreview.body}
            recipients={attachedRecipientsForEditing}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 pt-4 border-t border-gray-200">
        {!isCompleted && (
          <button
            type="button"
            className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 order-1"
            disabled={savingSwitch || savingMessage || savingRecipient || deleting}
            onClick={handleSaveAll}
          >
            {savingSwitch || savingMessage ? "Saving..." : "Save Changes"}
          </button>
        )}

        <button
          type="button"
          className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors order-2"
          onClick={onClose}
          disabled={savingSwitch || savingMessage || savingRecipient || deleting}
        >
          {isCompleted ? "Close" : "Cancel"}
        </button>

        <button
          type="button"
          className="sm:ml-auto px-5 py-2.5 text-red-600 text-sm font-medium rounded-xl hover:bg-red-50 transition-colors border border-transparent sm:border-transparent order-3 mt-2 sm:mt-0"
          onClick={openDeleteModal}
          disabled={savingSwitch || savingMessage || savingRecipient || deleting}
        >
          Delete Switch
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeDeleteModal}
            aria-hidden="true"
          />

          {/* Modal */}
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl">
            {/* Drag handle for mobile */}
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 rounded-xl">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                    Delete Switch
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500">
                    This action cannot be undone
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 sm:p-6">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-gray-900">{switchData.name}</span>? 
                This will permanently delete the switch and cannot be undone.
              </p>
            </div>

            {/* Actions */}
            <div className="p-5 sm:p-6 border-t border-gray-100 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={closeDeleteModal}
                disabled={deleting}
                className="flex-1 px-4 py-3 sm:py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 px-4 py-3 sm:py-2.5 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Switch"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
