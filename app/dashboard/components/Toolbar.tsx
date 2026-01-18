// app/dashboard/components/Toolbar.tsx
"use client";

const TOKENS = ["{recipient_name}", "{recipient_first_name}"] as const;
export type Token = (typeof TOKENS)[number];

export default function Toolbar({
  focusEnabled,
  onFormatBold,
  onFormatItalic,
  onInsertToken,
}: {
  focusEnabled: boolean;
  onFormatBold: () => void;
  onFormatItalic: () => void;
  onInsertToken: (token: Token) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="border rounded-md px-2 py-1 text-xs font-medium"
          onClick={onFormatBold}
          disabled={!focusEnabled}
          title={!focusEnabled ? "Click into Subject or Body first" : "Bold"}
        >
          B
        </button>

        <button
          type="button"
          className="border rounded-md px-2 py-1 text-xs italic"
          onClick={onFormatItalic}
          disabled={!focusEnabled}
          title={!focusEnabled ? "Click into Subject or Body first" : "Italic"}
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
            onClick={() => onInsertToken(t)}
            disabled={!focusEnabled}
            title={
              !focusEnabled ? "Click into Subject or Body first" : `Insert ${t}`
            }
          >
            {t}
          </button>
        ))}
      </div>

      <div className="text-xs opacity-60">
        {!focusEnabled
          ? "Click into Subject or Body to insert/format."
          : "Inserts/wraps at selection."}
      </div>
    </div>
  );
}
