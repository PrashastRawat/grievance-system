import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

const API = "http://localhost:5000/api";

function Badge({ status }) {
  const map = {
    disputed:      { bg: "#fee2e2", color: "#991b1b" },
    resolved:      { bg: "#bbf7d0", color: "#14532d" },
    rejected:      { bg: "#f3f4f6", color: "#374151" },
    pending:       { bg: "#fef3c7", color: "#92400e" },
    "in-progress": { bg: "#ede9fe", color: "#5b21b6" },
    "work-done":   { bg: "#d1fae5", color: "#065f46" },
  };
  const s = map[status] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: "2px 10px", borderRadius: 99,
      fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5,
    }}>
      {status}
    </span>
  );
}

function WorkProofModal({ complaint, onClose }) {
  const images = complaint?.workProof?.images || [];
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: 28,
        maxWidth: 640, width: "90%", maxHeight: "80vh", overflowY: "auto",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Work Proof Images</h3>
          <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        {images.length === 0 ? (
          <p style={{ color: "#9ca3af" }}>No images uploaded.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {images.map((img, i) => (
              <img
                key={i}
                src={`http://localhost:5000${img}`}
                alt={`proof-${i}`}
                style={{ width: "100%", borderRadius: 8, objectFit: "cover", aspectRatio: "4/3" }}
              />
            ))}
          </div>
        )}
        {complaint.workProof?.description && (
          <p style={{ marginTop: 16, fontSize: 13, color: "#374151" }}>
            <strong>Note:</strong> {complaint.workProof.description}
          </p>
        )}
      </div>
    </div>
  );
}

export default function AdminDisputes() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [acting,     setActing]     = useState(null); // id of complaint being actioned
  const [proofModal, setProofModal] = useState(null); // complaint to show proof for
  const [filter,     setFilter]     = useState("disputed");
  const [toast,      setToast]      = useState(null);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function fetchDisputes() {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/complaints?status=${filter}&limit=50`, { headers });
      setComplaints(res.data?.complaints || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchDisputes(); }, [filter]);

  async function resolveDispute(id, decision) {
    setActing(id);
    try {
      await axios.patch(
        `${API}/complaints/${id}/resolve-dispute`,
        { decision },
        { headers }
      );
      showToast(`Dispute ${decision === "resolved" ? "resolved ✅" : "rejected ❌"}`);
      fetchDisputes();
    } catch (err) {
      showToast(err.response?.data?.message || "Action failed", "error");
    } finally {
      setActing(null);
    }
  }

  const disputed   = complaints.filter(c => c.status === "disputed").length;
  const resolved   = complaints.filter(c => c.status === "resolved").length;
  const rejected   = complaints.filter(c => c.status === "rejected").length;

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 2000,
          background: toast.type === "error" ? "#fee2e2" : "#bbf7d0",
          color: toast.type === "error" ? "#991b1b" : "#14532d",
          padding: "12px 20px", borderRadius: 10, fontWeight: 600, fontSize: 14,
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        }}>
          {toast.msg}
        </div>
      )}

      {/* Work proof modal */}
      {proofModal && (
        <WorkProofModal complaint={proofModal} onClose={() => setProofModal(null)} />
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: 0 }}>
          ⚖️ Dispute Resolution
        </h1>
        <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
          Review disputed complaints and make final decisions
        </p>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Awaiting Review", value: disputed, color: "#ef4444", bg: "#fee2e2", icon: "⚠️" },
          { label: "Resolved",        value: resolved,  color: "#22c55e", bg: "#bbf7d0", icon: "✅" },
          { label: "Rejected",        value: rejected,  color: "#6b7280", bg: "#f3f4f6", icon: "❌" },
        ].map(k => (
          <div key={k.label} style={{
            background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14,
            padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            display: "flex", alignItems: "center", gap: 16,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10, background: k.bg,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
            }}>{k.icon}</div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.value}</div>
              <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["disputed", "resolved", "rejected"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "7px 18px", borderRadius: 99, fontSize: 13, fontWeight: 600,
            cursor: "pointer", textTransform: "capitalize",
            background: filter === f ? "#111827" : "#fff",
            color:      filter === f ? "#fff"    : "#6b7280",
            border:     filter === f ? "2px solid #111827" : "1.5px solid #e5e7eb",
          }}>
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>Loading…</div>
      ) : complaints.length === 0 ? (
        <div style={{
          background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14,
          padding: 60, textAlign: "center",
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
          <p style={{ fontWeight: 600, color: "#374151" }}>No {filter} complaints</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {complaints.map(c => {
            const lastDispute = c.disputes?.slice(-1)[0];
            return (
              <div key={c._id} style={{
                background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 14,
                padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
              }}>
                {/* Top row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{c.title}</span>
                      <Badge status={c.status} />
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      #{c._id.slice(-6).toUpperCase()} · {c.category} · {c.ward} ·{" "}
                      Submitted by <strong>{c.submittedBy?.name || "Unknown"}</strong>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>
                    {new Date(c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                </div>

                {/* Description */}
                <p style={{ fontSize: 13, color: "#4b5563", margin: "12px 0 0", lineHeight: 1.6 }}>
                  {c.description}
                </p>

                {/* Dispute reason */}
                {lastDispute && (
                  <div style={{
                    marginTop: 14, background: "#fef3c7", border: "1px solid #fde68a",
                    borderRadius: 8, padding: "10px 14px",
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#92400e", marginBottom: 4 }}>
                      DISPUTE REASON
                    </div>
                    <div style={{ fontSize: 13, color: "#78350f" }}>
                      {lastDispute.reason || "No reason provided"}
                    </div>
                  </div>
                )}

                {/* Action row */}
                <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
                  {/* View work proof */}
                  {c.workProof?.images?.length > 0 && (
                    <button
                      onClick={() => setProofModal(c)}
                      style={{
                        padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                        border: "1.5px solid #e5e7eb", background: "#f9fafb", cursor: "pointer", color: "#374151",
                      }}
                    >
                      🖼️ View Work Proof ({c.workProof.images.length})
                    </button>
                  )}

                  {/* Only show resolve/reject on disputed */}
                  {c.status === "disputed" && (
                    <>
                      <button
                        disabled={acting === c._id}
                        onClick={() => resolveDispute(c._id, "resolved")}
                        style={{
                          padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                          background: acting === c._id ? "#e5e7eb" : "#22c55e",
                          color: acting === c._id ? "#9ca3af" : "#fff",
                          border: "none", cursor: acting === c._id ? "not-allowed" : "pointer",
                        }}
                      >
                        ✅ Mark Resolved
                      </button>
                      <button
                        disabled={acting === c._id}
                        onClick={() => resolveDispute(c._id, "rejected")}
                        style={{
                          padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                          background: acting === c._id ? "#e5e7eb" : "#ef4444",
                          color: acting === c._id ? "#9ca3af" : "#fff",
                          border: "none", cursor: acting === c._id ? "not-allowed" : "pointer",
                        }}
                      >
                        ❌ Reject Dispute
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}