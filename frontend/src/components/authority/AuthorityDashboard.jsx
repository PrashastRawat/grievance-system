import { useEffect, useState } from "react";
import { getMyAssignedComplaints, getAuthorityStats } from "../../services/apiService";
import AuthorityComplaintCard from "./AuthorityComplaintCard";
import Spinner from "../shared/Spinner";
import { useAuth } from "../../context/AuthContext";

const FILTERS = ["all", "pending", "assigned", "in-progress", "work-done", "resolved", "disputed"];

const STAT_CONFIG = [
  { key: "totalAssigned", label: "Total Assigned", icon: "📋", color: "#3B82F6" },
  { key: "pending",       label: "Pending",        icon: "⏳", color: "#F59E0B" },
  { key: "completed",     label: "Completed",      icon: "✅", color: "#22C55E" },
  { key: "disputed",      label: "Disputed",       icon: "⚠️", color: "#EF4444" },
];

export default function AuthorityDashboard() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [stats,      setStats]      = useState(null);
  const [filter,     setFilter]     = useState("all");
  const [loading,    setLoading]    = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const cRes = await getMyAssignedComplaints();
      const list = cRes.data?.data || cRes.data || [];
      setComplaints(list);

      // Get the Authority document _id from the first complaint's assignedTo field
      // This is the correct ID for the stats route — NOT user._id
      const authorityDocId = list[0]?.assignedTo?._id || list[0]?.assignedTo;

      if (authorityDocId) {
        try {
          const sRes = await getAuthorityStats(authorityDocId);
          setStats(sRes.data?.data || null);
        } catch {
          // Stats unavailable — not critical
        }
      }
    } catch (err) {
      console.error("Authority dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = filter === "all"
    ? complaints
    : complaints.filter(c => c.status === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Authority Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage complaints assigned to your department
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STAT_CONFIG.map(({ key, label, icon, color }) => (
            <div key={key} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">{icon}</span>
                <span className="text-2xl font-bold" style={{ color }}>
                  {stats[key] ?? 0}
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Performance bar */}
      {stats && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Completion Rate</span>
            <span className="text-sm font-bold text-green-600">{stats.completionRate ?? 0}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${stats.completionRate ?? 0}%` }}
            />
          </div>
          <div className="flex justify-between mt-3">
            <span className="text-xs text-gray-400">
              Avg resolution: <span className="font-medium text-gray-600">{stats.avgCompletionDays ?? 0} days</span>
            </span>
            <span className="text-xs text-gray-400">
              Dispute rate: <span className="font-medium text-red-500">{stats.disputeRate ?? 0}%</span>
            </span>
          </div>
        </div>
      )}

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => {
          const count = f === "all" ? complaints.length : complaints.filter(c => c.status === f).length;
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all capitalize"
              style={{
                background: active ? "#0D0F1A" : "white",
                color:      active ? "white"   : "#64748B",
                border:     active ? "2px solid #0D0F1A" : "1.5px solid #E2E8F0",
              }}
            >
              {f === "all" ? "All" : f.replace("-", " ")} ({count})
            </button>
          );
        })}
      </div>

      {/* Complaints list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size={28} color="#0D0F1A" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">📭</div>
          <h3 className="font-semibold text-gray-700">No complaints found</h3>
          <p className="text-sm text-gray-400 mt-1">
            {filter === "all" ? "No complaints assigned to your department yet." : `No ${filter} complaints.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <AuthorityComplaintCard key={c._id} complaint={c} onUpdate={fetchData} />
          ))}
        </div>
      )}
    </div>
  );
}