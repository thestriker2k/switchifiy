"use client";

import { ALLOWED_INTERVALS, FREE_INTERVALS, getIntervalLabel, type AllowedInterval } from "@/lib/constants";

interface IntervalButtonsProps {
  value: AllowedInterval;
  onChange: (next: AllowedInterval) => void;
  disabled?: boolean;
  label?: string;
  planName?: string; // Add plan name to determine restrictions
}

export function IntervalButtons({
  value,
  onChange,
  disabled,
  label = "Interval",
  planName = "Free",
}: IntervalButtonsProps) {
  const isFree = planName === "Free";
  
  // Check if an interval is locked for free users
  const isLocked = (interval: AllowedInterval) => {
    if (!isFree) return false;
    return !(FREE_INTERVALS as readonly number[]).includes(interval);
  };

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
          const locked = isLocked(d);
          
          return (
            <button
              key={d}
              type="button"
              disabled={disabled || locked}
              onClick={() => !locked && onChange(d)}
              title={locked ? "Upgrade to unlock daily & weekly check-ins" : undefined}
              className={[
                "relative rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200",
                active 
                  ? "bg-gray-900 text-white shadow-md" 
                  : locked
                    ? "bg-gray-50 border border-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-white border border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50",
                disabled && !locked ? "opacity-50 cursor-not-allowed" : "",
              ].join(" ")}
            >
              <span className={locked ? "opacity-50" : ""}>
                {getIntervalLabel(d)}
              </span>
              
              {/* Lock icon for restricted intervals */}
              {locked && (
                <svg 
                  className="absolute -top-1 -right-1 w-4 h-4 text-gray-400" 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path 
                    fillRule="evenodd" 
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" 
                    clipRule="evenodd" 
                  />
                </svg>
              )}
            </button>
          );
        })}
      </div>
      
      {/* Upgrade hint for free users */}
      {isFree && (
        <p className="text-xs text-gray-500">
          <svg className="inline w-3 h-3 mr-1 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          Daily & weekly check-ins available on paid plans
        </p>
      )}
    </div>
  );
}
