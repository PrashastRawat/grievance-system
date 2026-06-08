import React from "react";

const ACCENT_MAP = {
  amber:  "#F59E0B",
  blue:   "#3B82F6",
  green:  "#22C55E",
  red:    "#EF4444",
  purple: "#8B5CF6",
};

export default function StatCard({ icon, label, value, sub, accent = "amber" }) {
  const col = ACCENT_MAP[accent] || ACCENT_MAP.amber;

  return (
    <div className="card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-3"
        style={{ background: `${col}18` }}
      >
        {icon}
      </div>
      <div
        className="text-[28px] font-display font-extrabold text-ink leading-none mb-1 "
        style={{ fontFamily: "Syne, sans-serif" }}
      >
        {value}
      </div>
      <div className="text-[20px] text-slate-500 font-medium">{label}</div>
      {sub && (
        <div className="text-[11px] font-semibold mt-1" style={{ color: col }}>
          {sub}
        </div>
      )}
    </div>
  );
}