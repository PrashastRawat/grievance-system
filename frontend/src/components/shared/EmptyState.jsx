import React from "react";

export default function EmptyState({ icon = "📭", title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="font-display text-lg font-semibold text-slate-600 mb-1">{title}</h3>
      {subtitle && <p className="text-sm text-slate-400 mb-5">{subtitle}</p>}
      {action && action}
    </div>
  );
}