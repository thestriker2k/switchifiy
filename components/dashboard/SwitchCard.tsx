"use client";

import type { SwitchRow, RecipientRow, SwitchRecipientRow } from "@/lib/types";
import { addDays, formatDateShort, formatDateTime, intervalLabel, getBrowserTimeZone } from "@/lib/utils";

import { Toggle } from "./Toggle";
import { Badge } from "./Badge";
import { SwitchEditor } from "./SwitchEditor";

interface SwitchCardProps {
  switchData: SwitchRow;
  recipients: RecipientRow[];
  switchRecipients: SwitchRecipientRow[];
  isOpen: boolean;
  isToggling: boolean;
  onToggle: (makeActive: boolean) => void;
  onEdit: () => void;
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

export function SwitchCard({
  switchData,
  recipients,
  switchRecipients,
  isOpen,
  isToggling,
  onToggle,
  onEdit,
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
}: SwitchCardProps) {
  const browserTZ = getBrowserTimeZone("UTC");
  const isActive = switchData.status === "active";
  const isCompleted = switchData.status === "completed";

  const baseIso = switchData.last_checkin_at ?? switchData.created_at;
  const totalDays = (switchData.interval_days ?? 0) + (switchData.grace_days ?? 0);
  const triggerDate = addDays(baseIso, totalDays);
  const createdDate = new Date(switchData.created_at);
  const tz = switchData.timezone || browserTZ;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className="pt-0.5">
            {isCompleted ? (
              <div className="h-6 w-11 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-emerald-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
            ) : (
              <Toggle
                checked={isActive}
                disabled={isToggling}
                onChange={onToggle}
                label={isActive ? "Pause switch" : "Activate switch"}
              />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {switchData.name}
                  </h3>
                  <Badge tone={isActive ? "active" : isCompleted ? "success" : "neutral"}>
                    {isActive ? "Active" : isCompleted ? "Completed" : "Paused"}
                  </Badge>
                </div>

                {isActive && (
                  <p className="mt-2 text-sm text-gray-600">
                    Triggers on{" "}
                    <span className="font-medium text-gray-900">
                      {triggerDate ? formatDateTime(triggerDate, tz) : "—"}
                    </span>
                    <span className="text-gray-400 ml-1">({tz})</span>
                  </p>
                )}

                {isCompleted && (
                  <p className="mt-2 text-sm text-gray-600">
                    This switch has triggered and notifications were sent.
                  </p>
                )}

                <p className="mt-1.5 text-xs text-gray-400">
                  {intervalLabel(switchData.interval_days)} interval • Created{" "}
                  {Number.isNaN(createdDate.getTime()) ? "—" : formatDateShort(createdDate)}
                </p>
              </div>

              <button
                type="button"
                onClick={isOpen ? onClose : onEdit}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all"
              >
                {isOpen ? "Close" : isCompleted ? "View" : "Edit"}
              </button>
            </div>

            {isOpen && (
              <SwitchEditor
                switchData={switchData}
                recipients={recipients}
                switchRecipients={switchRecipients}
                onClose={onClose}
                onSave={onSave}
                onDelete={onDelete}
                onRecipientsChange={onRecipientsChange}
                onError={onError}
                canAddRecipient={canAddRecipient}
                planName={planName}
                maxRecipients={maxRecipients}
                onCreateRecipient={onCreateRecipient}
                refreshUsage={refreshUsage}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
