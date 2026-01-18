// app/dashboard/components/IntervalButtons.tsx
"use client";

const ALLOWED_INTERVALS = [1, 7, 14, 30, 60, 90, 365] as const;
export type AllowedInterval = (typeof ALLOWED_INTERVALS)[number];

export default function IntervalButtons({
  value,
  onChange,
  disabled,
  label = "Interval",
}: {
  value: AllowedInterval;
  onChange: (next: AllowedInterval) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm opacity-80">{label}</div>
        <div className="text-sm font-medium">
          {value === 1 ? "24 hours" : value === 365 ? "1 year" : `${value}d`}
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
                "border rounded-md px-3 py-2 text-sm transition",
                active ? "bg-black text-white border-black" : "",
                disabled ? "opacity-50 cursor-not-allowed" : "",
              ].join(" ")}
            >
              {d === 1 ? "24 hours" : d === 365 ? "1 year" : `${d}d`}
            </button>
          );
        })}
      </div>
    </div>
  );
}
