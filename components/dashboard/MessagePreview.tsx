"use client";

import ReactMarkdown from "react-markdown";
import type { RecipientRow } from "@/lib/types";

interface MessagePreviewProps {
  title: string;
  previewAsId: string;
  setPreviewAsId: (v: string) => void;
  subject: string;
  body: string;
  recipients: RecipientRow[];
}

function markdownPreserveLineBreaks(text: string) {
  return (text ?? "").replace(/\n/g, "  \n");
}

export function MessagePreview({
  title,
  previewAsId,
  setPreviewAsId,
  subject,
  body,
  recipients,
}: MessagePreviewProps) {
  const r = recipients.find((x) => x.id === previewAsId) ?? null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="text-sm font-medium text-gray-700">{title}</div>

        <select
          className="text-sm bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          value={previewAsId}
          onChange={(e) => setPreviewAsId(e.target.value)}
        >
          <option value="">Preview as…</option>
          {recipients.map((rec) => (
            <option key={rec.id} value={rec.id}>
              {rec.name}
            </option>
          ))}
        </select>
      </div>

      <div className="p-4 space-y-3">
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

        <div className="border-t border-gray-100 pt-3">
          <div className="text-sm text-gray-700 prose prose-sm max-w-none">
            <ReactMarkdown>
              {markdownPreserveLineBreaks(body || "—")}
            </ReactMarkdown>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-400 italic">
            Preview only — message sends when switch triggers
          </p>
        </div>
      </div>
    </div>
  );
}
