// app/dashboard/components/MessagePreview.tsx
"use client";

import ReactMarkdown from "react-markdown";

function markdownPreserveLineBreaks(text: string) {
  // ReactMarkdown treats single newlines as spaces; force hard breaks.
  return (text ?? "").replace(/\n/g, "  \n");
}

export type PreviewRecipient = {
  id: string;
  name: string;
  email: string;
};

export default function MessagePreview({
  title,
  previewAsId,
  onChangePreviewAsId,
  recipients,
  subject,
  body,
}: {
  title: string;
  previewAsId: string;
  onChangePreviewAsId: (v: string) => void;
  recipients: PreviewRecipient[];
  subject: string;
  body: string;
}) {
  const r = recipients.find((x) => x.id === previewAsId) ?? null;

  return (
    <div className="border rounded-xl p-3 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium">{title}</div>

        <select
          className="border rounded-md p-2 text-sm"
          value={previewAsId}
          onChange={(e) => onChangePreviewAsId(e.target.value)}
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
}
