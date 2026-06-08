import { useState, useRef } from "react";
import { updateStatus, uploadWorkProof } from "../../services/apiService";
import { useToast } from "../../context/ToastContext";

const STATUS_COLORS = {
  "pending":    { bg: "#FFFBEB", color: "#92400E", dot: "#F59E0B" },
  "assigned":   { bg: "#EFF6FF", color: "#1E40AF", dot: "#3B82F6" },
  "in-progress":{ bg: "#F0F9FF", color: "#0C4A6E", dot: "#0EA5E9" },
  "work-done":  { bg: "#F0FDF4", color: "#166534", dot: "#22C55E" },
  "resolved":   { bg: "#F0FDF4", color: "#166534", dot: "#16A34A" },
  "disputed":   { bg: "#FEF2F2", color: "#991B1B", dot: "#EF4444" },
};

const NEXT_STATUSES = {
  "pending":     ["assigned", "in-progress"],
  "assigned":    ["in-progress"],
  "in-progress": ["work-done"],
  "work-done":   [],
  "resolved":    [],
  "disputed":    ["in-progress"],
};

export default function AuthorityComplaintCard({ complaint, onUpdate }) {
  const { showToast } = useToast();
  const [expanded,      setExpanded]      = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofDesc,      setProofDesc]      = useState("");
  const [proofFiles,     setProofFiles]     = useState([]);
  const [showProofForm,  setShowProofForm]  = useState(false);
  const fileInputRef = useRef(null);

  const meta   = STATUS_COLORS[complaint.status] || STATUS_COLORS["pending"];
  const nexts  = NEXT_STATUSES[complaint.status] || [];
  const canUploadProof = complaint.status === "in-progress";

  async function handleStatusUpdate(newStatus) {
    setUpdatingStatus(true);
    try {
      await updateStatus(complaint._id, newStatus);
      showToast(`Status updated to ${newStatus}`, "success");
      onUpdate();
    } catch (err) {
      showToast(err.message || "Update failed", "error");
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleWorkProofSubmit() {
    if (!proofDesc.trim()) return showToast("Please add a description", "error");
    if (proofFiles.length === 0) return showToast("Please upload at least one image", "error");

    setUploadingProof(true);
    try {
      const formData = new FormData();
      formData.append("description", proofDesc);
      proofFiles.forEach(f => formData.append("images", f));
      await uploadWorkProof(complaint._id, formData);
      showToast("Work proof uploaded successfully!", "success");
      setShowProofForm(false);
      setProofDesc("");
      setProofFiles([]);
      onUpdate();
    } catch (err) {
      showToast(err.message || "Upload failed", "error");
    } finally {
      setUploadingProof(false);
    }
  }

  function formatDate(d) {
    return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Card header */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {/* Status badge */}
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
                style={{ background: meta.bg, color: meta.color }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.dot }} />
                {complaint.status.replace("-", " ")}
              </span>
              {/* Category badge */}
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                {complaint.category}
              </span>
              {/* Priority badge */}
              {complaint.priority === "urgent" && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600">
                  🚨 Urgent
                </span>
              )}
            </div>
            <h3 className="font-semibold text-gray-900 truncate">{complaint.title}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Filed by <span className="text-gray-600">{complaint.submittedBy?.name || "Unknown"}</span>
              {" · "}{formatDate(complaint.createdAt)}
            </p>
          </div>
          <svg
            className={`h-4 w-4 text-gray-400 shrink-0 mt-1 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {/* Description */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
            <p className="text-sm text-gray-700">{complaint.description}</p>
          </div>

          {/* Location */}
          {complaint.location?.address && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Location</p>
              <p className="text-sm text-gray-700 flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                {complaint.location.address}
              </p>
            </div>
          )}

          {/* Existing work proof */}
          {complaint.workProof && (
            <div className="rounded-lg bg-green-50 border border-green-100 p-3">
              <p className="text-xs font-semibold text-green-700 mb-1">✅ Work Proof Uploaded</p>
              <p className="text-xs text-green-600">{complaint.workProof.description}</p>
              {complaint.workProof.images?.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {complaint.workProof.images.map((img, i) => (
                    <a key={i} href={`http://localhost:5000${img}`} target="_blank" rel="noreferrer">
                      <img
                        src={`http://localhost:5000${img}`}
                        alt={`proof-${i}`}
                        className="h-16 w-16 object-cover rounded border border-green-200"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Status update buttons */}
          {nexts.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Update Status</p>
              <div className="flex gap-2 flex-wrap">
                {nexts.map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusUpdate(s)}
                    disabled={updatingStatus}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 transition-colors capitalize"
                  >
                    {updatingStatus ? "Updating…" : `→ ${s.replace("-", " ")}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Upload work proof */}
          {canUploadProof && (
            <div>
              {!showProofForm ? (
                <button
                  onClick={() => setShowProofForm(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-blue-300 text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Upload Work Proof
                </button>
              ) : (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
                  <p className="text-xs font-semibold text-blue-700">Upload Work Completion Proof</p>

                  <textarea
                    value={proofDesc}
                    onChange={e => setProofDesc(e.target.value)}
                    placeholder="Describe the work completed..."
                    rows={2}
                    className="w-full text-sm border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white resize-none"
                  />

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-blue-300 rounded-lg p-4 text-center cursor-pointer hover:bg-blue-100 transition-colors"
                  >
                    <p className="text-xs text-blue-500">
                      {proofFiles.length > 0
                        ? `${proofFiles.length} file(s) selected`
                        : "Click to upload images (max 5)"}
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={e => setProofFiles(Array.from(e.target.files).slice(0, 5))}
                    />
                  </div>

                  {proofFiles.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {proofFiles.map((f, i) => (
                        <div key={i} className="relative">
                          <img
                            src={URL.createObjectURL(f)}
                            alt={`preview-${i}`}
                            className="h-14 w-14 object-cover rounded border border-blue-200"
                          />
                          <button
                            onClick={() => setProofFiles(prev => prev.filter((_, j) => j !== i))}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center"
                          >×</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleWorkProofSubmit}
                      disabled={uploadingProof}
                      className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {uploadingProof ? "Uploading…" : "Submit Proof"}
                    </button>
                    <button
                      onClick={() => { setShowProofForm(false); setProofFiles([]); setProofDesc(""); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}