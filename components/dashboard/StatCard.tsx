interface StatCardProps {
  title: string;
  value: string | number;
  footer?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export function StatCard({ title, value, footer, icon, onClick }: StatCardProps) {
  const Component = onClick ? 'button' : 'div';
  
  return (
    <Component
      onClick={onClick}
      className={`bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all text-left w-full ${
        onClick ? 'cursor-pointer hover:border-gray-200' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 tracking-tight">{value}</p>
          {footer && <p className="text-xs text-gray-400">{footer}</p>}
        </div>
        {icon && (
          <div className="p-2 bg-gray-50 rounded-xl">
            {icon}
          </div>
        )}
      </div>
    </Component>
  );
}
