import React from "react";
import { CAT_META, STATUS_META } from "../../utils/constants";

/**
 * Badge — renders a colored pill for category or status.
 * @param {string} type   - "cat" | "status"
 * @param {string} children - value to display
 */
export default function Badge({ type, children }) {
  const s =
    type === "status"
      ? STATUS_META[children] || STATUS_META.Pending
      : CAT_META[children]   || CAT_META.Road;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide"
      style={{ background: s.bg, color: s.color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: s.dot }}
      />
      {children}
    </span>
  );
}