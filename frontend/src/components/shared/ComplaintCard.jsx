import React from "react";
import { useNavigate } from "react-router-dom";
import Badge from "./Badge";
import { fmtDate } from "../../utils/helpers";

export default function ComplaintCard({ complaint: c, isAdmin = false }) {
  const navigate = useNavigate();

  const handleClick = () => {
    const path = isAdmin ? `/admin/complaints/${c._id}` : `/complaints/${c._id}`;
    navigate(path);
  };

  // Handle both GeoJSON location object and plain string
  const locationText = c.location?.address || c.ward || "Unknown location";

  return (
    <div
      className="card p-4 mb-3 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
      onClick={handleClick}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-[10px] font-bold text-slate-400 tracking-wide font-mono">
          #{c._id?.slice(-6).toUpperCase()}
        </span>
        <Badge type="cat">{c.category}</Badge>
        <Badge type="status">{c.status}</Badge>
        {c.priority === "urgent" && (
          <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
            🚨 Urgent
          </span>
        )}
        {c.mlConfidence && (
          <span className="text-[10px] text-violet-600 font-semibold bg-violet-50 px-2 py-0.5 rounded-full">
            ML {Math.round(c.mlConfidence * 100)}%
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-[15px] font-semibold text-ink mb-1 font-display leading-snug">
        {c.title}
      </h3>

      {/* Description preview */}
      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{c.description}</p>

      {/* Footer */}
      <div className="flex justify-between items-center mt-3 text-[11px] text-slate-400">
        <span>📍 {locationText}</span>
        <span>📅 {fmtDate(c.createdAt)}</span>
      </div>

      {/* Work done indicator */}
      {c.status === "work-done" && (
        <div className="mt-2 text-[11px] font-semibold text-amber-600 bg-amber-50 rounded-lg px-2 py-1 inline-block">
          ⚡ Action required — confirm or dispute
        </div>
      )}
    </div>
  );
}