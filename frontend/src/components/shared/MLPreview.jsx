import React from "react";
import { CAT_META } from "../../utils/constants";

export default function MLPreview({ result, loading }) {
  if (!result && !loading) return null;
  const s = result ? CAT_META[result.category] || CAT_META.Road : null;

  return (
    <div className="flex items-center gap-3 mt-3 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-lg px-4 py-3">
      <span className="text-[10px] font-bold text-white/60 tracking-widest uppercase whitespace-nowrap">
        ML Auto-Classify
      </span>
      {loading ? (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse2" />
          <span className="text-white/80 text-[13px]">Analysing…</span>
        </div>
      ) : result ? (
        <div className="flex items-center gap-2">
          <span className="text-base">{s.icon}</span>
          <span className="text-white font-bold text-sm">{result.category}</span>
          <span className="bg-white/20 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">
            {result.confidence}% confidence
          </span>
          {result.source === "keyword" && (
            <span className="text-white/50 text-[10px]">(offline model)</span>
          )}
        </div>
      ) : null}
    </div>
  );
}