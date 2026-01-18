import React from "react";

export function Button({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <button
      {...props}
      className={[
        "rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium shadow-sm",
        "hover:bg-gray-50 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}
