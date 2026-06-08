import React, { useState } from "react";
import { useComplaints } from "../../hooks/useComplaints";
import { STATUSES } from "../../utils/constants";
import ComplaintCard from "../shared/ComplaintCard";
import EmptyState from "../shared/EmptyState";
import Spinner from "../shared/Spinner";
import { useNavigate } from "react-router-dom";

export default function MyComplaints() {
  const navigate = useNavigate();
  const { complaints, loading } = useComplaints("mine");
  const [filter, setFilter] = useState("All");

  const filtered =
    filter === "All" ? complaints : complaints.filter((c) => c.status === filter);
  const sorted = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div>
      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap mb-5">
        {["All", ...STATUSES].map((s) => {
          const count = s === "All" ? complaints.length : complaints.filter((c) => c.status === s).length;
          const active = filter === s;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-150 cursor-pointer"
              style={{
                background: active ? "#0D0F1A" : "white",
                color:      active ? "white" : "#64748B",
                border:     active ? "2px solid #0D0F1A" : "1.5px solid #E2E8F0",
              }}
            >
              {s} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size={28} color="#0D0F1A" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="📭"
            title="No complaints found"
            subtitle={
              filter === "All"
                ? "You haven't filed any complaints yet."
                : `No ${filter} complaints.`
            }
            action={
              filter === "All" ? (
                <button className="btn-primary" onClick={() => navigate("/submit")}>
                  File First Complaint
                </button>
              ) : null
            }
          />
        </div>
      ) : (
        sorted.map((c) => <ComplaintCard key={c._id} complaint={c} />)
      )}
    </div>
  );
}