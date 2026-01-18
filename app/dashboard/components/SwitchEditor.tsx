"use client";

import type { AllowedInterval } from "./IntervalButtons";
import IntervalButtons from "./IntervalButtons";
import Toolbar from "./Toolbar";
import MessagePreview, { type PreviewRecipient } from "./MessagePreview";

type RecipientRow = {
  id: string;
  name: string;
  email: string;
};

export default function SwitchEditor({
  // display
  saveNotice,

  // switch fields
  editName,
  onChangeEditName,

  editIntervalDays,
  onChangeEditIntervalDays,

  // recipients
  recipients,
  attachedRecipients,
  attachedRecipientIds,
  selectedRecipientId,
  onChangeSelectedRecipientId,
  onAttachRecipient,
  onRemoveRecipient,

  editNewRecipientName,
  onChangeEditNewRecipientName,
  editNewRecipientEmail,
  onChangeEditNewRecipientEmail,
  addingContactInEditor,
  onAddNewRecipient,

  // message
  messageSubject,
  onChangeMessageSubject,
  messageBody,
  onChangeMessageBody,

  // preview
  previewRecipients,
  editPreviewRecipientId,
  onChangeEditPreviewRecipientId,
  previewSubject,
  previewBody,

  // toolbar
  focusEnabled,
  onFormatBold,
  onFormatItalic,
  onInsertToken,
  onFocusSubject,
  onFocusBody,
  editSubjectRef,
  editBodyRef,

  // actions
  savingSwitch,
  savingMessage,
  savingRecipient,
  deleting,
  onSaveAll,
  onCancel,
  onDelete,
}: {
  saveNotice: string | null;

  editName: string;
  onChangeEditName: (v: string) => void;

  editIntervalDays: AllowedInterval;
  onChangeEditIntervalDays: (v: AllowedInterval) => void;

  recipients: RecipientRow[];
  attachedRecipients: RecipientRow[];
  attachedRecipientIds: Set<string>;
  selectedRecipientId: string;
  onChangeSelectedRecipientId: (v: string) => void;
  onAttachRecipient: (recipientId: string) => Promise<void>;
  onRemoveRecipient: (recipientId: string) => Promise<void>;

  editNewRecipientName: string;
  onChangeEditNewRecipientName: (v: string) => void;
  editNewRecipientEmail: string;
  onChangeEditNewRecipientEmail: (v: string) => void;
  addingContactInEditor: boolean;
  onAddNewRecipient: () => Promise<void>;

  messageSubject: string;
  onChangeMessageSubject: (v: string) => void;
  messageBody: string;
  onChangeMessageBody: (v: string) => void;

  previewRecipients: PreviewRecipient[];
  editPreviewRecipientId: string;
  onChangeEditPreviewRecipientId: (v: string) => void;
  previewSubject: string;
  previewBody: string;

  focusEnabled: boolean;
  onFormatBold: () => void;
  onFormatItalic: () => void;
  onInsertToken: (token: "{recipient_name}" | "{recipient_first_name}") => void;
  onFocusSubject: () => void;
  onFocusBody: () => void;
  editSubjectRef: React.RefObject<HTMLInputElement | null>;
  editBodyRef: React.RefObject<HTMLTextAreaElement | null>;

  savingSwitch: boolean;
  savingMessage: boolean;
  savingRecipient: boolean;
  deleting: boolean;
  onSaveAll: () => Promise<void>;
  onCancel: () => void;
  onDelete: () => Promise<void>;
}) {
  const busy = savingSwitch || savingMessage || savingRecipient || deleting;

  return (
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
          onChange={(e) => onChangeEditName(e.target.value)}
        />
      </div>

      <IntervalButtons
        value={editIntervalDays}
        onChange={onChangeEditIntervalDays}
        disabled={deleting}
        label="Interval"
      />

      {/* Recipients */}
      <div className="border-t pt-4 space-y-3">
        <div className="text-sm font-medium">Recipients</div>

        {attachedRecipients.length === 0 ? (
          <p className="text-sm opacity-80">No recipients attached yet.</p>
        ) : (
          <div className="space-y-2">
            {attachedRecipients.map((r) => (
              <div key={r.id} className="flex items-center justify-between">
                <div className="text-sm opacity-80">
                  {r.name} <span className="opacity-60">({r.email})</span>
                </div>

                <button
                  type="button"
                  className="text-red-600 hover:underline text-sm"
                  disabled={busy}
                  onClick={() => onRemoveRecipient(r.id)}
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
            onChangeSelectedRecipientId(id);
            if (!id) return;

            if (attachedRecipientIds.has(id)) {
              onChangeSelectedRecipientId("");
              return;
            }

            await onAttachRecipient(id);
            onChangeSelectedRecipientId("");
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
            onChange={(e) => onChangeEditNewRecipientName(e.target.value)}
            disabled={deleting || addingContactInEditor}
          />

          <input
            className="w-full border rounded-md p-2 text-sm"
            placeholder="Email"
            value={editNewRecipientEmail}
            onChange={(e) => onChangeEditNewRecipientEmail(e.target.value)}
            disabled={deleting || addingContactInEditor}
          />

          <button
            type="button"
            className="border rounded-md px-3 py-2 text-sm w-full"
            onClick={onAddNewRecipient}
            disabled={deleting || addingContactInEditor}
          >
            {addingContactInEditor ? "Adding..." : "Add contact"}
          </button>

          <div className="text-xs opacity-70">
            This contact will be saved for future switches too.
          </div>
        </div>
      </div>

      {/* Message */}
      <div className="border-t pt-4 space-y-3">
        <div className="text-sm font-medium">Message</div>

        <Toolbar
          focusEnabled={focusEnabled}
          onFormatBold={onFormatBold}
          onFormatItalic={onFormatItalic}
          onInsertToken={onInsertToken}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <input
              ref={editSubjectRef}
              className="w-full border rounded-md p-2"
              placeholder="Subject"
              value={messageSubject}
              onChange={(e) => onChangeMessageSubject(e.target.value)}
              onFocus={onFocusSubject}
              disabled={deleting}
            />

            <textarea
              ref={editBodyRef}
              className="w-full border rounded-md p-2 min-h-[160px]"
              placeholder="Message body..."
              value={messageBody}
              onChange={(e) => onChangeMessageBody(e.target.value)}
              onFocus={onFocusBody}
              disabled={deleting}
            />
          </div>

          <MessagePreview
            title="Preview"
            previewAsId={editPreviewRecipientId}
            onChangePreviewAsId={onChangeEditPreviewRecipientId}
            recipients={previewRecipients}
            subject={previewSubject}
            body={previewBody}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="button"
          className="border rounded-md px-3 py-2 text-sm"
          disabled={busy}
          onClick={onSaveAll}
        >
          {savingSwitch || savingMessage ? "Saving..." : "Save all"}
        </button>

        <button
          type="button"
          className="border rounded-md px-3 py-2 text-sm"
          onClick={onCancel}
          disabled={busy}
        >
          Cancel
        </button>

        <button
          type="button"
          className="border rounded-md px-3 py-2 text-sm text-red-600"
          onClick={onDelete}
          disabled={busy}
        >
          {deleting ? "Deleting..." : "Delete switch"}
        </button>
      </div>
    </div>
  );
}
