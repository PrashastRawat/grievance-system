import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getComplaintById, updateStatus, confirmWorkDone, raiseDispute } from "../../services/apiService";
import Badge from "../shared/Badge";
import Spinner from "../shared/Spinner";
import ComplaintMap from "../shared/ComplaintMap";
import { STATUSES, CAT_META } from "../../utils/constants";
import ComplaintComments from "./ComplaintComments";

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const fmtDateTime = (d) =>
  new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const CONFIDENCE_COLOR = {
  high:   { bg: "#dcfce7", text: "#166534", label: "High confidence" },
  medium: { bg: "#fef9c3", text: "#854d0e", label: "Medium confidence" },
  low:    { bg: "#fee2e2", text: "#991b1b", label: "Low confidence"   },
};

export default function ComplaintDetail() {
  const { id }   = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin  = user?.role === "admin";
  const isUser   = user?.role === "user";

  const [complaint,     setComplaint]     = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [updating,      setUpdating]      = useState(false);
  const [newStatus,     setNewStatus]     = useState("");
  const [toast,         setToast]         = useState(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [showDispute,   setShowDispute]   = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getComplaintById(id);
        setComplaint(data.data);
        setNewStatus(data.data.status);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load complaint");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleStatusUpdate = async () => {
    if (newStatus === complaint.status) return;
    setUpdating(true);
    try {
      const { data } = await updateStatus(id, newStatus);
      setComplaint(data.data);
      showToast(`Status updated to "${newStatus}"`);
    } catch {
      showToast("Failed to update status", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirm = async () => {
    setUpdating(true);
    try {
      await confirmWorkDone(id);
      showToast("Complaint marked as resolved! ✅");
      setTimeout(() => navigate("/my-complaints"), 1500);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to confirm", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleDispute = async () => {
    if (!disputeReason.trim()) return showToast("Please enter a reason", "error");
    setUpdating(true);
    try {
      await raiseDispute(id, disputeReason);
      showToast("Dispute raised. Admin will review.");
      setShowDispute(false);
      const { data } = await getComplaintById(id);
      setComplaint(data.data);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to raise dispute", "error");
    } finally {
      setUpdating(false);
    }
  };

  const backPath = isAdmin ? "/admin/complaints" : "/my-complaints";

  if (loading) return (
    <div className="flex justify-center items-center py-24">
      <Spinner size={32} color="#0D0F1A" />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center py-24 gap-4">
      <span className="text-4xl">⚠️</span>
      <p className="text-slate-500 text-sm">{error}</p>
      <button className="btn-ghost" onClick={() => navigate(backPath)}>← Go Back</button>
    </div>
  );

  const c   = complaint;
  const cat = CAT_META[c.category] || CAT_META.Road;
  const locationText = c.location?.address || c.ward || "Unknown location";
  const isWorkDone   = c.status === "work-done";
  const isDisputed   = c.status === "disputed";
  const isResolved   = c.status === "resolved";

  // Resolution time display
  const hasETA = c.estimatedResolutionDays != null;
  const etaStyle = CONFIDENCE_COLOR[c.resolutionConfidence] || CONFIDENCE_COLOR.low;

  return (
    <div className="max-w-2xl mx-auto">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-pop
          ${toast.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {toast.type === "success" ? "✅" : "❌"} {toast.msg}
        </div>
      )}

      {/* Back */}
      <button
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-ink transition mb-5 font-medium"
        onClick={() => navigate(backPath)}
      >
        ← Back to {isAdmin ? "All Complaints" : "My Complaints"}
      </button>

      {/* Header card */}
      <div className="card p-6 mb-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: cat.bg }}
            >
              {cat.icon}
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase font-mono mb-0.5">
                #{c._id?.slice(-6).toUpperCase()}
              </p>
              <h1 className="font-display font-bold text-lg text-ink leading-snug">{c.title}</h1>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Badge type="cat">{c.category}</Badge>
            <Badge type="status">{c.status}</Badge>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-4 text-xs text-slate-500 mb-5 pb-5 border-b border-slate-100">
          <span>📍 {locationText}</span>
          <span>📅 Filed {fmtDate(c.createdAt)}</span>
          {isAdmin && c.submittedBy && (
            <span>👤 {c.submittedBy.name} ({c.submittedBy.email})</span>
          )}
          {c.mlConfidence && (
            <span className="text-violet-600 font-semibold">
              🤖 ML {Math.round(c.mlConfidence * 100)}% confidence
            </span>
          )}
        </div>

        {/* ── AI Estimated Resolution Time ── */}
        {hasETA && !isResolved && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5 border"
            style={{ background: etaStyle.bg, borderColor: etaStyle.text + "33" }}
          >
            <span className="text-lg">⏱️</span>
            <div>
              <p className="text-xs font-bold" style={{ color: etaStyle.text }}>
                AI Estimated Resolution Time
              </p>
              <p className="text-sm font-semibold" style={{ color: etaStyle.text }}>
                ~{c.estimatedResolutionDays} day{c.estimatedResolutionDays !== 1 ? "s" : ""}
                <span className="ml-2 text-xs font-normal opacity-70">
                  ({etaStyle.label})
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Description */}
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Description</h2>
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{c.description}</p>

        {/* Image */}
        {c.imageUrl && (
          <div className="mt-5">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Attached Photo</h2>
            <img
              src={`http://localhost:5000${c.imageUrl}`}
              alt="Complaint"
              className="rounded-xl max-h-64 object-cover border border-slate-100"
            />
          </div>
        )}

        {/* Location Map */}
        {c.location?.coordinates && (
          <div className="mt-5">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Location</h2>
            <ComplaintMap
              location={{
                lat: c.location.coordinates[1],
                lng: c.location.coordinates[0],
                address: c.location.address,
              }}
              title={c.title}
            />
          </div>
        )}
      </div>

      {/* Work Proof */}
      {c.workProof && (
        <div className="card p-5 mb-4">
          <h2 className="font-display font-bold text-sm text-ink mb-3">🔧 Work Proof</h2>
          <p className="text-sm text-slate-600 mb-3">{c.workProof.description}</p>
          {c.workProof.images?.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {c.workProof.images.map((img, i) => (
                <a key={i} href={`http://localhost:5000${img}`} target="_blank" rel="noreferrer">
                  <img
                    src={`http://localhost:5000${img}`}
                    alt={`proof-${i}`}
                    className="h-20 w-20 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition"
                  />
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* User: Confirm or Dispute */}
      {isUser && isWorkDone && (
        <div className="card p-5 mb-4 border-2 border-amber/30 bg-amber-50/30">
          <h2 className="font-display font-bold text-sm text-ink mb-1">Work has been completed</h2>
          <p className="text-xs text-slate-500 mb-4">
            The authority has marked this complaint as work done. Please confirm if the issue is resolved or raise a dispute.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleConfirm} disabled={updating}
              className="flex-1 py-2.5 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50 transition"
            >
              ✅ Confirm Resolved
            </button>
            <button
              onClick={() => setShowDispute(d => !d)} disabled={updating}
              className="flex-1 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-bold hover:bg-red-100 disabled:opacity-50 transition"
            >
              ❌ Raise Dispute
            </button>
          </div>
          {showDispute && (
            <div className="mt-4 space-y-3">
              <textarea
                value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)}
                placeholder="Explain why the work is not satisfactory..."
                rows={3}
                className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
              />
              <button
                onClick={handleDispute} disabled={updating}
                className="w-full py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition"
              >
                {updating ? "Submitting…" : "Submit Dispute"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Resolved banner */}
      {isResolved && (
        <div className="card p-5 mb-4 bg-green-50 border border-green-200">
          <p className="text-sm font-semibold text-green-700">✅ This complaint has been resolved.</p>
        </div>
      )}

      {/* Disputed banner */}
      {isDisputed && (
        <div className="card p-5 mb-4 bg-red-50 border border-red-200">
          <p className="text-sm font-semibold text-red-700">⚠️ This complaint is under dispute. Admin is reviewing.</p>
        </div>
      )}

      {/* Admin: Status update */}
      {isAdmin && (
        <div className="card p-5 mb-4">
          <h2 className="font-display font-bold text-sm text-ink mb-3">Update Status</h2>
          <div className="flex gap-3">
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-amber"
            >
              {["pending","assigned","in-progress","work-done","resolved","disputed","rejected"].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              onClick={handleStatusUpdate}
              disabled={updating || newStatus === complaint.status}
              className="px-5 py-2 bg-ink text-white rounded-lg text-sm font-bold transition hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {updating ? "Saving…" : "Update"}
            </button>
          </div>
        </div>
      )}

      {/* Status history */}
      {c.statusHistory?.length > 0 && (
        <div className="card p-5 mb-4">
          <h2 className="font-display font-bold text-sm text-ink mb-4">Status History</h2>
          <div className="space-y-3">
            {[...c.statusHistory].reverse().map((h, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-amber flex-shrink-0" />
                <Badge type="status">{h.status}</Badge>
                <span className="text-xs text-slate-400">{fmtDateTime(h.changedAt || c.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      <ComplaintComments complaintId={complaint._id} />
    </div>
  );
}