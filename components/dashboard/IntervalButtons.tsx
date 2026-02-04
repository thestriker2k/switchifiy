"use client";

import { ALLOWED_INTERVALS, type AllowedInterval } from "@/lib/constants";

interface IntervalButtonsProps {
  value: AllowedInterval;
  onChange: (next: AllowedInterval) => void;
  disabled?: boolean;
  label?: string;
}

export function IntervalButtons({
  value,
  onChange,
  disabled,
  label = "Interval",
}: IntervalButtonsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-700">{label}</div>
        <div className="text-sm font-semibold text-gray-900">
          {value === 1 ? "24 hours" : value === 365 ? "1 year" : `${value} days`}
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
                "rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
                active 
                  ? "bg-gray-900 text-white shadow-md" 
                  : "bg-white border border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50",
                disabled ? "opacity-50 cursor-not-allowed" : "",
              ].join(" ")}
            >
              {d === 1 ? "24h" : d === 365 ? "1yr" : `${d}d`}
            </button>
          );
        })}
      </div>
    </div>
  );
}
