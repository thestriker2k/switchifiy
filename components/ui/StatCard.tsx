import React from "react";
import { Card } from "./Card";

export function StatCard({
  title,
  value,
  footer,
}: {
  title: string;
  value: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="text-xs uppercase tracking-wide text-gray-500">
        {title}
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">
        {value}
      </div>
      {footer ? (
        <div className="mt-1 text-xs text-gray-500">{footer}</div>
      ) : null}
    </Card>
  );
}
