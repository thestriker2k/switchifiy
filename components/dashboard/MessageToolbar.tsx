"use client";

import { MESSAGE_TOKENS } from "@/lib/constants";

interface MessageToolbarProps {
  onFormat: (kind: "bold" | "italic") => void;
  onInsertToken: (token: string) => void;
  disabled: boolean;
}

export function MessageToolbar({ onFormat, onInsertToken, disabled }: MessageToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold text-gray-600 hover:bg-white hover:shadow-sm transition-all disabled:opacity-40"
          onClick={() => onFormat("bold")}
          disabled={disabled}
          title={disabled ? "Click into Subject or Body first" : "Bold"}
        >
          B
        </button>
        <button
          type="button"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-sm italic text-gray-600 hover:bg-white hover:shadow-sm transition-all disabled:opacity-40"
          onClick={() => onFormat("italic")}
          disabled={disabled}
          title={disabled ? "Click into Subject or Body first" : "Italic"}
        >
          I
        </button>
      </div>

      <div className="h-5 w-px bg-gray-200" />

      <div className="flex flex-wrap gap-1.5">
        {MESSAGE_TOKENS.map((t) => (
          <button
            key={t}
            type="button"
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all disabled:opacity-40"
            onClick={() => onInsertToken(t)}
            disabled={disabled}
            title={disabled ? "Click into Subject or Body first" : `Insert ${t}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="ml-auto text-xs text-gray-400">
        {disabled ? "Click a field to enable" : "Ready"}
      </div>
    </div>
  );
}
