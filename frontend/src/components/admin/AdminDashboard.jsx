import React from "react";
import { useNavigate } from "react-router-dom";
import { useComplaints } from "../../hooks/useComplaints";
import { CATEGORIES, CAT_META } from "../../utils/constants";
import StatCard from "../shared/StatCard";
import Badge from "../shared/Badge";
import { fmtDate } from "../../utils/helpers";
import Spinner from "../shared/Spinner";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { complaints, loading } = useComplaints("all");

  // DB uses lowercase status values
  const stats = {
    total:    complaints.length,
    pending:  complaints.filter((c) => c.status === "pending").length,
    progress: complaints.filter((c) => c.status === "in-progress").length,
    resolved: complaints.filter((c) => c.status === "resolved").length,
  };

  const resolveRate = stats.total
    ? Math.round((stats.resolved / stats.total) * 100)
    : 0;

  const byCat = CATEGORIES.reduce(
    (acc, cat) => ({ ...acc, [cat]: complaints.filter((c) => c.category === cat).length }),
    {}
  );

  const recent = [...complaints]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  if (loading) return (
    <div className="flex justify-center items-center py-24">
      <Spinner size={32} color="#0D0F1A" />
    </div>
  );

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard icon="📁" label="Total Complaints" value={stats.total}    accent="amber" />
        <StatCard icon="⏳" label="Pending"          value={stats.pending}  accent="amber" sub="Awaiting action" />
        <StatCard icon="🔄" label="In Progress"      value={stats.progress} accent="blue"  sub="Being handled" />
        <StatCard icon="✅" label="Resolved"         value={stats.resolved} accent="green" sub={`${resolveRate}% resolve rate`} />
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Category breakdown */}
        <div className="card p-5">
          <h3 className="font-display font-bold text-base text-ink mb-5">Complaints by Category</h3>
          {CATEGORIES.map((cat) => {
            const count = byCat[cat] || 0;
            const pct   = stats.total ? Math.round((count / stats.total) * 100) : 0;
            const s     = CAT_META[cat];
            return (
              <div key={cat} className="mb-4">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                    <span>{s.icon}</span> {cat}
                  </span>
                  <span className="font-display font-bold text-sm text-ink">{count}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: s.dot }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent activity */}
        <div className="card p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display font-bold text-base text-ink">Recent Activity</h3>
            <button
              className="btn-ghost text-xs"
              onClick={() => navigate("/admin/complaints")}
            >
              View all →
            </button>
          </div>
          {recent.map((c, i) => (
            <div
              key={c._id}
              className="flex gap-3 pb-3 mb-3"
              style={{ borderBottom: i < recent.length - 1 ? "1px solid #F1F5F9" : "none" }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                style={{ background: CAT_META[c.category]?.bg }}
              >
                {CAT_META[c.category]?.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-ink truncate">{c.title}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {c.submittedBy?.name || "Unknown"} · {fmtDate(c.createdAt)}
                </div>
              </div>
              <Badge type="status">{c.status}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}