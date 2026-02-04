interface SectionHeaderProps {
  title: React.ReactNode;
  count?: number;
  icon?: React.ReactNode;
  id?: string;
}

export function SectionHeader({ title, count, icon, id }: SectionHeaderProps) {
  return (
    <div id={id} className="flex items-center gap-3 scroll-mt-24">
      {icon && (
        <div className="p-2 bg-gray-100 rounded-lg">
          {icon}
        </div>
      )}
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {typeof count === 'number' && (
        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-sm font-medium rounded-full">
          {count}
        </span>
      )}
    </div>
  );
}
