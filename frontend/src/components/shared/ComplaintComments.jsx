import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

const API = "http://localhost:5000/api";

const ROLE_COLOR = {
  admin:     { bg: "#fef3c7", color: "#92400e", label: "Admin" },
  authority: { bg: "#dbeafe", color: "#1e40af", label: "Authority" },
  user:      { bg: "#f3f4f6", color: "#374151", label: "Citizen"  },
};

const SENTIMENT_BADGE = {
  NEGATIVE: { bg: "#fee2e2", color: "#991b1b", icon: "😠", label: "Frustrated" },
  POSITIVE: { bg: "#dcfce7", color: "#166534", icon: "😊", label: "Positive"   },
};

export default function ComplaintComments({ complaintId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [text,     setText]     = useState("");
  const [loading,  setLoading]  = useState(true);
  const [posting,  setPosting]  = useState(false);

  const token   = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!complaintId) return;
    async function fetchComments() {
      try {
        const res = await axios.get(`${API}/complaints/${complaintId}/comments`, { headers });
        setComments(res.data?.data || []);
      } catch { setComments([]); }
      finally  { setLoading(false); }
    }
    fetchComments();
  }, [complaintId]);

  async function postComment(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setPosting(true);
    try {
      const res = await axios.post(
        `${API}/complaints/${complaintId}/comments`,
        { text },
        { headers }
      );
      setComments(prev => [...prev, res.data.data]);
      setText("");
    } catch (err) {
      console.error("Comment post error:", err);
    } finally {
      setPosting(false);
    }
  }

  const flaggedCount = comments.filter(c => c.flaggedForAdmin).length;

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        💬 Comments
        <span style={{ fontSize: 12, fontWeight: 500, color: "#9ca3af" }}>({comments.length})</span>
        {/* Admin: show flagged count badge */}
        {isAdmin && flaggedCount > 0 && (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
            background: "#fee2e2", color: "#991b1b",
          }}>
            ⚠️ {flaggedCount} frustrated
          </span>
        )}
      </div>

      {/* Comment list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
        {loading ? (
          <p style={{ color: "#9ca3af", fontSize: 13 }}>Loading comments…</p>
        ) : comments.length === 0 ? (
          <p style={{ color: "#9ca3af", fontSize: 13 }}>No comments yet. Be the first to add one.</p>
        ) : comments.map((c, i) => {
          const role      = c.authorRole || c.author?.role || "user";
          const roleStyle = ROLE_COLOR[role] || ROLE_COLOR.user;
          const isMe      = c.author?._id === user?._id || c.author === user?._id;
          const sentStyle = c.sentiment ? SENTIMENT_BADGE[c.sentiment] : null;
          const isFlagged = c.flaggedForAdmin && isAdmin;

          return (
            <div key={i} style={{
              background: isFlagged ? "#fff7f7" : isMe ? "#eff6ff" : "#f9fafb",
              border: `1px solid ${isFlagged ? "#fca5a5" : isMe ? "#bfdbfe" : "#e5e7eb"}`,
              borderRadius: 10, padding: "12px 16px",
              position: "relative",
            }}>
              {/* Flagged admin indicator */}
              {isFlagged && (
                <div style={{
                  position: "absolute", top: -1, right: 12,
                  fontSize: 10, fontWeight: 700, padding: "2px 8px",
                  background: "#fca5a5", color: "#7f1d1d",
                  borderRadius: "0 0 6px 6px",
                }}>
                  ⚠️ Needs attention
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                    {c.author?.name || "Unknown"}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
                    background: roleStyle.bg, color: roleStyle.color, textTransform: "uppercase",
                  }}>
                    {roleStyle.label}
                  </span>
                  {isMe && <span style={{ fontSize: 10, color: "#9ca3af" }}>You</span>}
                  {/* Sentiment badge — visible to admin only */}
                  {isAdmin && sentStyle && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
                      background: sentStyle.bg, color: sentStyle.color,
                    }}>
                      {sentStyle.icon} {sentStyle.label}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 11, color: "#9ca3af" }}>
                  {new Date(c.createdAt).toLocaleString("en-IN", {
                    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: "#374151", lineHeight: 1.5 }}>{c.text}</p>
            </div>
          );
        })}
      </div>

      {/* Post comment */}
      <form onSubmit={postComment} style={{ display: "flex", gap: 10 }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Add a comment…"
          style={{
            flex: 1, padding: "10px 14px", border: "1.5px solid #e5e7eb",
            borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "inherit",
          }}
        />
        <button
          type="submit"
          disabled={posting || !text.trim()}
          style={{
            padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700,
            border: "none", cursor: posting || !text.trim() ? "not-allowed" : "pointer",
            background: posting || !text.trim() ? "#e5e7eb" : "#1a56db",
            color:      posting || !text.trim() ? "#9ca3af" : "#fff",
          }}
        >
          {posting ? "…" : "Post"}
        </button>
      </form>
    </div>
  );
}