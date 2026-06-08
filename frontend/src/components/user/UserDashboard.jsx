import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useComplaints } from "../../hooks/useComplaints";
import StatCard from "../shared/StatCard";
import ComplaintCard from "../shared/ComplaintCard";
import EmptyState from "../shared/EmptyState";
import Spinner from "../shared/Spinner";

export default function UserDashboard() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const { complaints, loading } = useComplaints("mine");

  const stats = {
    total:    complaints.length,
    pending:  complaints.filter((c) => c.status === "Pending").length,
    progress: complaints.filter((c) => c.status === "In Progress").length,
    resolved: complaints.filter((c) => c.status === "Resolved").length,
  };

  const recent = [...complaints]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);

  return (
    <div>
      {/* Welcome banner */}
      <div
        className="rounded-2xl p-7 mb-6 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0D0F1A, #1a2744)" }}
      >
        <div className="absolute -right-5 -top-5 w-36 h-36 rounded-full bg-amber/15" />
        <div className="absolute right-16 -bottom-10 w-20 h-20 rounded-full bg-white/4" />
        <p className="text-[11px] font-bold text-white/40 tracking-widest uppercase mb-2">
          Citizen Portal
        </p>
        <h2 className="font-display font-bold text-2xl text-white mb-1">
          Hello, {user?.name?.split(" ")[0]}! 👋
        </h2>
        <p className="text-sm text-white/60">
          {complaints.length === 0
            ? "No complaints filed yet. Help improve your city!"
            : `You have ${stats.pending} pending and ${stats.progress} in-progress complaints.`}
        </p>
        <button
          className="mt-5 px-5 py-2.5 bg-amber text-ink rounded-lg text-sm font-bold transition hover:brightness-95"
          onClick={() => navigate("/submit")}
        >
          + File New Complaint
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard icon="📁" label="Total Filed"  value={stats.total}    accent="amber" />
        <StatCard icon="⏳" label="Pending"      value={stats.pending}  accent="amber" sub="Awaiting action" />
        <StatCard icon="🔄" label="In Progress"  value={stats.progress} accent="blue"  sub="Being worked on" />
        <StatCard icon="✅" label="Resolved"     value={stats.resolved} accent="green" sub="Completed" />
      </div>

      {/* Recent complaints */}
      <div className="card overflow-hidden">
        <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100">
          <h3 className="font-display font-bold text-base text-ink">Recent Complaints</h3>
          <button className="btn-ghost text-xs" onClick={() => navigate("/my-complaints")}>
            View All →
          </button>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Spinner size={24} color="#0D0F1A" />
            </div>
          ) : recent.length === 0 ? (
            <EmptyState
              icon="📬"
              title="No complaints yet"
              subtitle="File your first complaint to help improve civic services"
              action={
                <button className="btn-primary" onClick={() => navigate("/submit")}>
                  File Complaint
                </button>
              }
            />
          ) : (
            recent.map((c) => <ComplaintCard key={c._id} complaint={c} />)
          )}
        </div>
      </div>
    </div>
  );
}