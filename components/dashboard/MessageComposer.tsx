"use client";

import { useRef, useState } from "react";
import type { FocusTarget } from "@/lib/types";

interface MessageComposerProps {
  subject: string;
  setSubject: (v: string) => void;
  body: string;
  setBody: (v: string) => void;
  disabled?: boolean;
  focusTarget: FocusTarget;
  setFocusTarget: (v: FocusTarget) => void;
  subjectRef: React.RefObject<HTMLInputElement | null>;
  bodyRef: React.RefObject<HTMLTextAreaElement | null>;
  onInsertToken: (token: string) => void;
  onFormat: (kind: "bold" | "italic") => void;
  mode: "create" | "edit";
}

const TOKENS = [
  {
    token: "{recipient_name}",
    label: "Full Name",
    description: "Recipient's full name",
    example: "John Smith",
  },
  {
    token: "{recipient_first_name}",
    label: "First Name",
    description: "Recipient's first name only",
    example: "John",
  },
];

export function MessageComposer({
  subject,
  setSubject,
  body,
  setBody,
  disabled = false,
  focusTarget,
  setFocusTarget,
  subjectRef,
  bodyRef,
  onInsertToken,
  onFormat,
  mode,
}: MessageComposerProps) {
  const [showTokenMenu, setShowTokenMenu] = useState(false);
  const tokenButtonRef = useRef<HTMLButtonElement>(null);

  const isActive = focusTarget?.mode === mode;
  const activeField = isActive ? focusTarget?.field : null;

  const handleTokenSelect = (token: string) => {
    onInsertToken(token);
    setShowTokenMenu(false);
    if (activeField === "subject") {
      subjectRef.current?.focus();
    } else {
      bodyRef.current?.focus();
    }
  };

  return (
    <div className="bg-gradient-to-b from-gray-50 to-gray-100 rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Window chrome */}
      <div className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-b from-gray-100 to-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <span className="text-xs font-medium text-gray-500 sm:ml-2">
              Compose
            </span>
          </div>

          {/* Formatting toolbar */}
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5 p-1 bg-white rounded-lg border border-gray-200 shadow-sm">
              <button
                type="button"
                onClick={() => onFormat("bold")}
                disabled={disabled || !isActive}
                className={`
                  w-7 h-7 flex items-center justify-center rounded-md text-sm font-bold transition-all
                  ${
                    !isActive || disabled
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200"
                  }
                `}
                title={
                  !isActive ? "Click into a field first" : "Bold (**text**)"
                }
              >
                B
              </button>
              <button
                type="button"
                onClick={() => onFormat("italic")}
                disabled={disabled || !isActive}
                className={`
                  w-7 h-7 flex items-center justify-center rounded-md text-sm italic transition-all
                  ${
                    !isActive || disabled
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200"
                  }
                `}
                title={
                  !isActive ? "Click into a field first" : "Italic (*text*)"
                }
              >
                I
              </button>
            </div>

            {/* Token dropdown */}
            <div className="relative">
              <button
                ref={tokenButtonRef}
                type="button"
                onClick={() => setShowTokenMenu(!showTokenMenu)}
                disabled={disabled || !isActive}
                className={`
                  h-7 px-2 sm:px-2.5 flex items-center gap-1 sm:gap-1.5 rounded-lg text-xs font-medium transition-all border shadow-sm
                  ${
                    !isActive || disabled
                      ? "bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-900 active:bg-gray-50"
                  }
                `}
                title={
                  !isActive
                    ? "Click into a field first"
                    : "Insert personalization"
                }
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <span className="hidden sm:inline">Personalize</span>
                <svg
                  className={`w-3 h-3 transition-transform ${showTokenMenu ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {showTokenMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10 bg-black/20 sm:bg-transparent"
                    onClick={() => setShowTokenMenu(false)}
                  />
                  {/* Bottom sheet on mobile, dropdown on desktop */}
                  <div className="fixed inset-x-0 bottom-0 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-1 z-20 sm:w-64 bg-white rounded-t-2xl sm:rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                    {/* Drag handle for mobile */}
                    <div className="sm:hidden flex justify-center pt-3 pb-1">
                      <div className="w-10 h-1 bg-gray-300 rounded-full" />
                    </div>
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                      <p className="text-xs font-medium text-gray-500">
                        Insert recipient info
                      </p>
                    </div>
                    <div className="p-1.5">
                      {TOKENS.map((t) => (
                        <button
                          key={t.token}
                          type="button"
                          onClick={() => handleTokenSelect(t.token)}
                          className="w-full px-3 py-3 sm:py-2.5 flex items-center justify-between gap-3 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors text-left group"
                        >
                          <div>
                            <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                              {t.label}
                            </div>
                            <div className="text-xs text-gray-500">
                              {t.description}
                            </div>
                          </div>
                          <div className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-500 font-mono group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors flex-shrink-0">
                            {t.example}
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
                      <p className="text-xs text-gray-400">
                        Tokens are replaced with actual values when sent
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Email compose area */}
      <div className="bg-white m-1.5 sm:m-2 rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Subject field */}
        <div
          className={`
            flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 border-b transition-colors
            ${activeField === "subject" ? "border-blue-200 bg-blue-50/30" : "border-gray-100"}
          `}
        >
          <span className="text-xs font-medium text-gray-400 w-12 sm:w-14 flex-shrink-0">
            Subject
          </span>
          <input
            ref={subjectRef}
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onFocus={() => setFocusTarget({ mode, field: "subject" })}
            disabled={disabled}
            placeholder="Enter a subject line..."
            className="flex-1 min-w-0 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none disabled:opacity-50"
          />
        </div>

        {/* Body field */}
        <div
          className={`
            transition-colors
            ${activeField === "body" ? "bg-blue-50/30" : ""}
          `}
        >
          <textarea
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onFocus={() => setFocusTarget({ mode, field: "body" })}
            disabled={disabled}
            placeholder="Write your message here...

You can use **bold** and *italic* formatting.
Tap the person icon to insert recipient names."
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none resize-none disabled:opacity-50 min-h-[160px] sm:min-h-[200px]"
          />
        </div>
      </div>

      {/* Status bar */}
      <div className="px-3 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-400">
          <span>{body.length} chars</span>
          <div className="hidden sm:block w-1 h-1 rounded-full bg-gray-300" />
          <span className="hidden sm:inline">Supports **bold** and *italic*</span>
        </div>
        {activeField && (
          <div className="flex items-center gap-1.5 text-xs text-blue-500">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span>Editing {activeField}</span>
          </div>
        )}
      </div>
    </div>
  );
}
