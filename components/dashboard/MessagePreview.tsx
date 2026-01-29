"use client";

import { useEffect } from "react";
import type { RecipientRow } from "@/lib/types";

interface MessagePreviewProps {
  title: string;
  previewAsId: string;
  setPreviewAsId: (v: string) => void;
  subject: string;
  body: string;
  recipients: RecipientRow[];
}

export function MessagePreview({
  title,
  previewAsId,
  setPreviewAsId,
  subject,
  body,
  recipients,
}: MessagePreviewProps) {
  const r =
    recipients.find((x) => x.id === previewAsId) ?? recipients[0] ?? null;

  // Auto-select first recipient if none selected
  useEffect(() => {
    if (!previewAsId && recipients.length > 0 && recipients[0]) {
      setPreviewAsId(recipients[0].id);
    }
  }, [previewAsId, recipients, setPreviewAsId]);

  function renderBody(text: string) {
    if (!text)
      return <span className="text-gray-400 italic">No message content</span>;

    const processMarkdown = (str: string) => {
      return str
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>");
    };

    const processed = processMarkdown(text);

    return (
      <span
        dangerouslySetInnerHTML={{
          __html: processed.replace(/\n/g, "<br />"),
        }}
      />
    );
  }

  return (
    <div className="bg-gradient-to-b from-gray-50 to-gray-100 rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Window chrome */}
      <div className="px-4 py-2.5 bg-gradient-to-b from-gray-100 to-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <span className="text-xs font-medium text-gray-500 ml-2">
              {title}
            </span>
          </div>

          {/* Recipient dropdown */}
          {recipients.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400">View as:</span>
              <select
                value={previewAsId || r?.id || ""}
                onChange={(e) => setPreviewAsId(e.target.value)}
                className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 cursor-pointer"
              >
                {recipients.map((rec) => (
                  <option key={rec.id} value={rec.id}>
                    {rec.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Email content */}
      <div className="bg-white m-2 rounded-xl border border-gray-100 shadow-sm">
        {/* Email header */}
        <div className="px-4 py-3 border-b border-gray-100 space-y-2">
          <div className="flex items-start gap-3">
            {/* Sender avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 shadow-sm">
              S
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-gray-900 text-sm">
                  Switchifye Alerts
                </div>
                <div className="text-xs text-gray-400 flex-shrink-0">
                  Just now
                </div>
              </div>
              <div className="text-xs text-gray-500 truncate">
                to{" "}
                {r ? (
                  r.name
                ) : (
                  <span className="italic text-gray-400">
                    select a recipient above
                  </span>
                )}
                {r && <span className="text-gray-400"> &lt;{r.email}&gt;</span>}
              </div>
            </div>
          </div>

          {/* Subject line */}
          <div className="pl-[52px]">
            <h3 className="font-semibold text-gray-900">
              {subject || (
                <span className="text-gray-400 font-normal italic">
                  No subject
                </span>
              )}
            </h3>
          </div>
        </div>

        {/* Email body */}
        <div className="px-4 py-4 pl-[68px]">
          <div className="text-sm text-gray-700 leading-relaxed">
            {renderBody(body)}
          </div>
        </div>

        {/* Email footer */}
        <div className="px-4 py-3 pl-[68px] border-t border-gray-50 bg-gray-50/50">
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-1.5">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <span>via Switchifye</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-gray-300" />
            <span>Preview only</span>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs text-gray-500">
            Sends when switch triggers
          </span>
        </div>
        {r && (
          <span className="text-xs text-gray-400">Viewing as {r.name}</span>
        )}
      </div>
    </div>
  );
}
