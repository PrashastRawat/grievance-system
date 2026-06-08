import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useComplaints } from "../../hooks/useComplaints";
import { updateStatus as apiUpdateStatus } from "../../services/apiService";
import { useToast } from "../../context/ToastContext";
import { CATEGORIES, STATUSES } from "../../utils/constants";
import Badge from "../shared/Badge";
import Spinner from "../shared/Spinner";
import EmptyState from "../shared/EmptyState";
import { fmtDate, initials } from "../../utils/helpers";

const chipStyle = (active) =>
  active
    ? { background: "#0D0F1A", color: "#fff" }
    : { background: "#F1F5F9", color: "#64748B" };

export default function AdminComplaints() {
  const { showToast }  = useToast();
  const navigate       = useNavigate();
  const { complaints, loading, refetch } = useComplaints("all");

  const [search,       setSearch]       = useState("");
  const [catFilter,    setCatFilter]    = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered = complaints.filter((c) => {
    const matchCat    = catFilter    === "All" || c.category === catFilter;
    const matchStatus = statusFilter === "All" || c.status   === statusFilter;
    const q = search.toLowerCase();
    const userName = c.user?.name || "";
    const matchSearch = !search ||
      c.title.toLowerCase().includes(q)    ||
      userName.toLowerCase().includes(q)   ||
      c.location.toLowerCase().includes(q);
    return matchCat && matchStatus && matchSearch;
  });

  const sorted = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const handleStatusChange = async (e, id, newStatus) => {
    e.stopPropagation(); // prevent row click when changing status
    try {
      await apiUpdateStatus(id, newStatus);
      showToast(`Status updated to "${newStatus}"`, "✅");
      refetch();
    } catch {
      showToast("Failed to update status", "❌");
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-ink">All Complaints</h1>
        <p className="text-sm text-slate-500 mt-1">Manage and update complaint statuses</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-amber w-56"
            placeholder="Search title, user, location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {["All", ...CATEGORIES].map((f) => (
            <button
              key={f}
              onClick={() => setCatFilter(f)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer"
              style={chipStyle(catFilter === f)}
            >
              {f}
            </button>
          ))}
          <div className="w-px bg-slate-200 mx-1" />
          {["All", ...STATUSES].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer"
              style={chipStyle(statusFilter === f)}
            >
              {f}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-400 ml-auto flex-shrink-0">
          {sorted.length} result{sorted.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size={28} color="#0D0F1A" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  {["ID", "Title", "Category", "Location", "Filed By", "Date", "Status", "Action"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-3.5 py-3 text-[11px] font-bold tracking-widest uppercase text-slate-500 border-b border-slate-200 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <EmptyState icon="🔍" title="No complaints found" subtitle="Try adjusting your filters" />
                    </td>
                  </tr>
                ) : (
                  sorted.map((c) => (
                    <tr
                      key={c._id}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/admin/complaints/${c._id}`)}
                    >
                      <td className="px-3.5 py-3">
                        <span className="font-mono text-[11px] font-bold text-slate-400">
                          #{c._id?.slice(-6).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 max-w-[200px]">
                        <div className="text-sm font-medium text-ink truncate">{c.title}</div>
                        {c.mlConfidence && (
                          <div className="text-[10px] text-violet-500 mt-0.5">
                            ML: {Math.round(c.mlConfidence * 100)}%
                          </div>
                        )}
                      </td>
                      <td className="px-3.5 py-3">
                        <Badge type="cat">{c.category}</Badge>
                      </td>
                      <td className="px-3.5 py-3 text-xs text-slate-500 whitespace-nowrap">
                        📍 {c.location}
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-ink flex items-center justify-center text-[10px] font-extrabold text-white flex-shrink-0">
                            {initials(c.user?.name || "?")}
                          </div>
                          <span className="text-xs text-slate-600">{c.user?.name || "Unknown"}</span>
                        </div>
                      </td>
                      <td className="px-3.5 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {fmtDate(c.createdAt)}
                      </td>
                      <td className="px-3.5 py-3">
                        <Badge type="status">{c.status}</Badge>
                      </td>
                      <td className="px-3.5 py-3" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={c.status}
                          onChange={(e) => handleStatusChange(e, c._id, e.target.value)}
                          className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white cursor-pointer
                                     font-medium text-slate-700 focus:outline-none focus:border-ink"
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}