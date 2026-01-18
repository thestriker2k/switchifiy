"use client";

import React, { useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const TOKENS = ["{recipient_name}", "{recipient_first_name}"] as const;

type RecipientRow = {
  id: string;
  name: string;
  email: string;
};

type AllowedInterval = number;

const ALLOWED_INTERVALS = [1, 7, 14, 30, 60, 90, 365] as const;

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
    } catch {}
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
    } catch {}
  });

  return next;
}

function markdownPreserveLineBreaks(text: string) {
  return (text ?? "").replace(/\n/g, "  \n");
}

function renderWithTokens({
  subject,
  body,
  previewRecipient,
}: {
  subject: string;
  body: string;
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

export default function CreateSwitchPanel({
  // visibility / actions
  onCancel,
  onCreateSwitch,

  // create switch fields
  creating,
  createName,
  setCreateName,
  createIntervalDays,
  setCreateIntervalDays,

  // recipients
  recipients,
  createRecipientIds,
  toggleCreateRecipient,
  addCreateRecipient,
  createSelectedRecipientId,
  setCreateSelectedRecipientId,

  // add new contact
  newRecipientName,
  setNewRecipientName,
  newRecipientEmail,
  setNewRecipientEmail,
  addingContact,
  onAddNewRecipient,

  // message
  createMessageSubject,
  setCreateMessageSubject,
  createMessageBody,
  setCreateMessageBody,

  // preview-as
  createPreviewRecipientId,
  setCreatePreviewRecipientId,
}: {
  onCancel: () => void;
  onCreateSwitch: () => void | Promise<void>;

  creating: boolean;
  createName: string;
  setCreateName: (v: string) => void;
  createIntervalDays: AllowedInterval;
  setCreateIntervalDays: (v: AllowedInterval) => void;

  recipients: RecipientRow[];
  createRecipientIds: Set<string>;
  toggleCreateRecipient: (id: string) => void;
  addCreateRecipient: (id: string) => void;
  createSelectedRecipientId: string;
  setCreateSelectedRecipientId: (v: string) => void;

  newRecipientName: string;
  setNewRecipientName: (v: string) => void;
  newRecipientEmail: string;
  setNewRecipientEmail: (v: string) => void;
  addingContact: boolean;
  onAddNewRecipient: () => void | Promise<void>;

  createMessageSubject: string;
  setCreateMessageSubject: (v: string) => void;
  createMessageBody: string;
  setCreateMessageBody: (v: string) => void;

  createPreviewRecipientId: string;
  setCreatePreviewRecipientId: (v: string) => void;
}) {
  type FocusField = "subject" | "body" | null;
  const [focusField, setFocusField] = useState<FocusField>(null);

  const createSubjectRef = useRef<HTMLInputElement | null>(null);
  const createBodyRef = useRef<HTMLTextAreaElement | null>(null);

  const previewRecipient =
    recipients.find((r) => r.id === createPreviewRecipientId) ?? null;

  const preview = useMemo(() => {
    return renderWithTokens({
      subject: createMessageSubject,
      body: createMessageBody,
      previewRecipient: previewRecipient
        ? { name: previewRecipient.name, email: previewRecipient.email }
        : null,
    });
  }, [createMessageSubject, createMessageBody, previewRecipient]);

  function handleInsertToken(token: (typeof TOKENS)[number]) {
    if (!focusField) return;

    if (focusField === "subject") {
      const el = createSubjectRef.current;
      if (!el) return;
      setCreateMessageSubject(
        insertTokenAtCursor(el, createMessageSubject, token)
      );
    } else {
      const el = createBodyRef.current;
      if (!el) return;
      setCreateMessageBody(insertTokenAtCursor(el, createMessageBody, token));
    }
  }

  function handleFormat(kind: "bold" | "italic") {
    if (!focusField) return;

    const applyTo = (
      el: HTMLInputElement | HTMLTextAreaElement | null,
      current: string,
      setter: (v: string) => void
    ) => {
      if (!el) return;
      if (kind === "bold") setter(wrapSelectionWith(el, current, "**", "**"));
      else setter(wrapSelectionWith(el, current, "*", "*"));
    };

    if (focusField === "subject") {
      applyTo(
        createSubjectRef.current,
        createMessageSubject,
        setCreateMessageSubject
      );
    } else {
      applyTo(createBodyRef.current, createMessageBody, setCreateMessageBody);
    }
  }

  const EditorToolbar = () => (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="border rounded-md px-2 py-1 text-xs font-medium hover:bg-gray-50"
          onClick={() => handleFormat("bold")}
          disabled={!focusField}
          title={!focusField ? "Click into Subject or Body first" : "Bold"}
        >
          B
        </button>
        <button
          type="button"
          className="border rounded-md px-2 py-1 text-xs italic hover:bg-gray-50"
          onClick={() => handleFormat("italic")}
          disabled={!focusField}
          title={!focusField ? "Click into Subject or Body first" : "Italic"}
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
            disabled={!focusField}
            title={
              !focusField ? "Click into Subject or Body first" : `Insert ${t}`
            }
          >
            {t}
          </button>
        ))}
      </div>

      <div className="text-xs text-gray-500">
        {!focusField
          ? "Click into Subject or Body to insert/format."
          : "Inserts/wraps at selection."}
      </div>
    </div>
  );

  return (
    <Card className="p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Create a switch</h2>
        <Button type="button" onClick={onCancel}>
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
            onClick={onAddNewRecipient}
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

        <EditorToolbar />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <input
              ref={createSubjectRef}
              className="w-full border rounded-md p-2 bg-white"
              placeholder="Message title"
              value={createMessageSubject}
              onChange={(e) => setCreateMessageSubject(e.target.value)}
              onFocus={() => setFocusField("subject")}
              disabled={creating}
            />

            <textarea
              ref={createBodyRef}
              className="w-full border rounded-md p-2 min-h-[160px] bg-white"
              placeholder="Message..."
              value={createMessageBody}
              onChange={(e) => setCreateMessageBody(e.target.value)}
              onFocus={() => setFocusField("body")}
              disabled={creating}
            />
          </div>

          <Card className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium text-gray-900">Preview</div>

              <select
                className="border rounded-md p-2 text-sm bg-white"
                value={createPreviewRecipientId}
                onChange={(e) => setCreatePreviewRecipientId(e.target.value)}
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
                  {previewRecipient
                    ? `${previewRecipient.name} <${previewRecipient.email}>`
                    : "Recipient Name <recipient@email.com>"}
                </span>
              </div>

              <div className="text-xs text-gray-500">
                Subject:{" "}
                <span className="font-medium text-gray-900">
                  {preview.subject || "—"}
                </span>
              </div>

              <div className="border-t pt-3">
                <div className="text-sm text-gray-900">
                  <ReactMarkdown>
                    {markdownPreserveLineBreaks(preview.body || "—")}
                  </ReactMarkdown>
                </div>
              </div>

              <div className="border-t pt-2 text-xs text-gray-500">
                (Preview only — message sends when the switch triggers)
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Button
        type="button"
        className="w-full border-gray-900"
        disabled={creating}
        onClick={onCreateSwitch}
      >
        {creating ? "Creating..." : "Create switch"}
      </Button>
    </Card>
  );
}
