interface EmptyStateProps {
  message: React.ReactNode;
  icon?: React.ReactNode;
}

export function EmptyState({ message, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
      {icon && (
        <div className="p-3 bg-gray-100 rounded-full mb-3">
          {icon}
        </div>
      )}
      <p className="text-sm text-gray-500 text-center">{message}</p>
    </div>
  );
}
