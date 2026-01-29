interface BadgeProps {
  children: React.ReactNode;
  tone?: "active" | "neutral" | "success" | "warning";
}

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  const tones = {
    active: "bg-gradient-to-r from-blue-500/10 to-teal-500/10 text-teal-700 border border-teal-200",
    neutral: "bg-gray-100 text-gray-600 border border-gray-200",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border border-amber-200",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
