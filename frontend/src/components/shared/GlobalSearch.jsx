import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

const API = "http://localhost:5000/api";

const STATUS_COLOR = {
  pending:       "#f59e0b",
  assigned:      "#3b82f6",
  "in-progress": "#8b5cf6",
  "work-done":   "#10b981",
  resolved:      "#22c55e",
  disputed:      "#ef4444",
  rejected:      "#6b7280",
};

export default function GlobalSearch() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState([]);
  const [open,     setOpen]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const wrapRef    = useRef(null);
  const debounce   = useRef(null);

  const token   = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function search(q) {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const endpoint = user?.role === "admin"
        ? `${API}/complaints?search=${encodeURIComponent(q)}&limit=8`
        : `${API}/complaints/mine?search=${encodeURIComponent(q)}&limit=8`;
      const res = await axios.get(endpoint, { headers });
      const list = res.data?.complaints || res.data?.data || [];
      setResults(list);
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => search(val), 350);
  }

  function goTo(complaint) {
    const base = user?.role === "admin" ? "/admin/complaints" :
                 user?.role === "authority" ? "/authority/complaints" : "/complaints";
    navigate(`${base}/${complaint._id}`);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%", maxWidth: 400 }}>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#9ca3af" }}>🔍</span>
        <input
          value={query}
          onChange={handleChange}
          onFocus={() => query && setOpen(true)}
          placeholder="Search complaints…"
          style={{
            width: "100%", padding: "8px 14px 8px 34px",
            border: "1.5px solid #e5e7eb", borderRadius: 10,
            fontSize: 13, outline: "none", fontFamily: "inherit",
            boxSizing: "border-box", background: "#f9fafb",
          }}
        />
        {loading && (
          <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#9ca3af" }}>…</span>
        )}
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
          background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 12,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 1000, overflow: "hidden",
        }}>
          {results.length === 0 ? (
            <div style={{ padding: "16px 18px", fontSize: 13, color: "#9ca3af" }}>No complaints found</div>
          ) : results.map(c => (
            <div
              key={c._id}
              onClick={() => goTo(c)}
              style={{
                padding: "12px 16px", cursor: "pointer", borderBottom: "1px solid #f3f4f6",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{c.title}</div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                  {c.category} · {c.ward} · #{c._id.slice(-6).toUpperCase()}
                </div>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                background: STATUS_COLOR[c.status] + "22",
                color: STATUS_COLOR[c.status],
                textTransform: "uppercase", whiteSpace: "nowrap",
              }}>
                {c.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}