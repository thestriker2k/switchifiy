import React from "react";

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "active" | "neutral" | "success";
  className?: string;
}) {
  const tones = {
    active: "border-emerald-200 bg-emerald-50 text-emerald-700",
    neutral: "border-gray-200 bg-gray-50 text-gray-700",
    success: "border-green-200 bg-green-50 text-green-700",
  };

  return (
    <span
      className={[
        "shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
