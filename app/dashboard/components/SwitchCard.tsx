// app/dashboard/components/SwitchCard.tsx
"use client";

import Toggle from "./Toggle";
import { addDays, formatDateShort, formatDateTime } from "./date";

export type SwitchCardData = {
  id: string;
  name: string;
  status: string;
  interval_days: number;
  grace_days: number;
  created_at: string;
  last_checkin_at: string | null;
  timezone: string | null;
};

export default function SwitchCard({
  s,
  isActive,
  isOpen,
  isToggling,
  browserTZ,
  onToggle,
  onEdit,
  children,
}: {
  s: SwitchCardData;
  isActive: boolean;
  isOpen: boolean;
  isToggling: boolean;
  browserTZ: string;
  onToggle: (next: boolean) => void;
  onEdit: () => void;
  children?: React.ReactNode;
}) {
  const baseIso = s.last_checkin_at ?? s.created_at;
  const totalDays = (s.interval_days ?? 0) + (s.grace_days ?? 0);
  const triggerDate = addDays(baseIso, totalDays);

  const createdDate = new Date(s.created_at);
  const tz = s.timezone || browserTZ;

  return (
    <div className="border rounded-xl p-4">
      <div className="flex items-start gap-4">
        <div className="pt-1">
          <Toggle
            checked={isActive}
            disabled={isToggling}
            onChange={onToggle}
            label={isActive ? "Pause switch" : "Activate switch"}
          />
        </div>

        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-medium truncate">{s.name}</div>

              {isActive ? (
                <div className="mt-1 text-sm opacity-80">
                  This switch is currently set to trigger on:{" "}
                  <span className="font-medium">
                    {triggerDate ? formatDateTime(triggerDate, tz) : "—"}
                  </span>
                </div>
              ) : (
                <div className="mt-1 text-xs opacity-70">
                  Status: {s.status}
                </div>
              )}

              <div className="mt-1 text-xs opacity-70">
                Interval:{" "}
                {s.interval_days === 1 ? "24 hours" : `${s.interval_days} days`}{" "}
                • Created:{" "}
                {Number.isNaN(createdDate.getTime())
                  ? "—"
                  : formatDateShort(createdDate)}
              </div>
            </div>

            <button
              type="button"
              className="border rounded-md px-3 py-2 text-sm"
              onClick={onEdit}
            >
              {isOpen ? "Close" : "Edit"}
            </button>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
