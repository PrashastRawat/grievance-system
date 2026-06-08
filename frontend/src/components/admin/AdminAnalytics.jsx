import { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";

const CAT_COLOR = {
  Road: "#ef4444", Water: "#3b82f6", Electricity: "#f59e0b",
  Sanitation: "#22c55e", Other: "#8b5cf6",
};

function MiniBar({ label, value, max, color, sub }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{label}</span>
        <span style={{ fontSize: 12, color: "#6b7280" }}>{sub || value}</span>
      </div>
      <div style={{ height: 7, background: "#f3f4f6", borderRadius: 99 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 0.8s ease" }} />
      </div>
    </div>
  );
}

function Sparkline({ data }) {
  if (!data?.length) return <p style={{ color: "#9ca3af", fontSize: 13 }}>No trend data yet.</p>;
  const W = 480, H = 100, PAD = 12;
  const counts = data.map(d => d.count);
  const maxV   = Math.max(...counts, 1);
  const pts    = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1 || 1)) * (W - PAD * 2);
    const y = H - PAD - (d.count / maxV) * (H - PAD * 2);
    return `${x},${y}`;
  });
  const polyline   = pts.join(" ");
  const areaBottom = `${W - PAD},${H - PAD} ${PAD},${H - PAD}`;
  return (
    <div style={{ overflowX: "auto" }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block", minWidth: 260 }}>
        <defs>
          <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a56db" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#1a56db" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`${pts[0]} ${polyline} ${areaBottom}`} fill="url(#ag)" />
        <polyline points={polyline} fill="none" stroke="#1a56db" strokeWidth="2.5" strokeLinejoin="round" />
        {data.map((d, i) => {
          const [x, y] = pts[i].split(",").map(Number);
          return <circle key={i} cx={x} cy={y} r="3.5" fill="#1a56db" stroke="#fff" strokeWidth="1.5"><title>{`${d._id}: ${d.count}`}</title></circle>;
        })}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 11, color: "#9ca3af" }}>{data[0]?._id}</span>
        <span style={{ fontSize: 11, color: "#9ca3af" }}>{data[data.length - 1]?._id}</span>
      </div>
    </div>
  );
}

function Card({ title, icon, children }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div style={{ padding: "16px 22px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{title}</span>
      </div>
      <div style={{ padding: "18px 22px" }}>{children}</div>
    </div>
  );
}

export default function AdminAnalytics() {
  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [aiReport,     setAiReport]     = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError,  setReportError]  = useState(null);

  const token   = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await axios.get(`${API}/admin/stats`, { headers });
        setData(res.data?.data || null);
      } catch (err) {
        console.error("Analytics fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const generateReport = async () => {
    setReportLoading(true);
    setReportError(null);
    setAiReport(null);
    try {
      const res = await axios.get(`${API}/admin/weekly-report`, { headers });
      setAiReport(res.data?.report || "No report generated.");
    } catch (err) {
      setReportError("Failed to generate report. Make sure the ML service is running.");
    } finally {
      setReportLoading(false);
    }
  };

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>Loading analytics…</div>;
  if (!data)   return <div style={{ textAlign: "center", padding: 60, color: "#ef4444" }}>Failed to load analytics.</div>;

  const resolveRate = data.total > 0 ? Math.round((data.resolved / data.total) * 100) : 0;
  const maxCat  = Math.max(...(data.byCat  || []).map(c => c.total), 1);
  const maxWard = Math.max(...(data.byWard || []).map(w => w.total), 1);

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: 0 }}>📊 Analytics</h1>
        <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>City-wide complaint analytics — last 30 days</p>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total",       value: data.total,      color: "#1a56db", icon: "📋" },
          { label: "Resolved",    value: data.resolved,   color: "#22c55e", icon: "✅", sub: `${resolveRate}% rate` },
          { label: "In Progress", value: data.inProgress, color: "#8b5cf6", icon: "⚙️" },
          { label: "Pending",     value: data.pending,    color: "#f59e0b", icon: "⏳" },
          { label: "Disputed",    value: data.disputed,   color: "#ef4444", icon: "⚠️" },
        ].map(k => (
          <div key={k.label} style={{
            background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14,
            padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{k.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{k.label}</div>
            {k.sub && <div style={{ fontSize: 11, color: "#9ca3af" }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* ── AI Weekly Report ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          background: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
          border: "1px solid #c4b5fd", borderRadius: 16,
          overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        }}>
          <div style={{ padding: "16px 22px", borderBottom: "1px solid #ddd6fe", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>🤖</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#4c1d95" }}>AI Weekly Report</span>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, background: "#7c3aed", color: "#fff", fontWeight: 600 }}>
                Powered by Llama 3.3
              </span>
            </div>
            <button
              onClick={generateReport}
              disabled={reportLoading}
              style={{
                padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                border: "none", cursor: reportLoading ? "not-allowed" : "pointer",
                background: reportLoading ? "#ddd6fe" : "#7c3aed",
                color: reportLoading ? "#7c3aed" : "#fff",
                transition: "all 0.2s",
              }}
            >
              {reportLoading ? "⏳ Generating…" : aiReport ? "🔄 Regenerate" : "✨ Generate Report"}
            </button>
          </div>
          <div style={{ padding: "18px 22px" }}>
            {!aiReport && !reportLoading && !reportError && (
              <p style={{ color: "#7c3aed", fontSize: 13, margin: 0, opacity: 0.7 }}>
                Click "Generate Report" to get an AI-powered summary of this week's performance, trends, and recommendations.
              </p>
            )}
            {reportLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#7c3aed", fontSize: 13 }}>
                <svg style={{ animation: "spin 1s linear infinite", width: 16, height: 16 }} viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25"/>
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                </svg>
                Analyzing data and generating report…
              </div>
            )}
            {reportError && (
              <p style={{ color: "#ef4444", fontSize: 13, margin: 0 }}>⚠️ {reportError}</p>
            )}
            {aiReport && !reportLoading && (
              <div style={{
                background: "#fff", border: "1px solid #ddd6fe", borderRadius: 10,
                padding: "16px 18px",
              }}>
                <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>
                  {aiReport}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trend */}
      <div style={{ marginBottom: 20 }}>
        <Card title="Complaint Submissions — Last 30 Days" icon="📈">
          <Sparkline data={data.trend} />
        </Card>
      </div>

      {/* Category + Ward */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <Card title="By Category" icon="🗂️">
          {(data.byCat || []).map(c => (
            <MiniBar
              key={c._id} label={c._id} value={c.total} max={maxCat}
              color={CAT_COLOR[c._id] || "#8b5cf6"}
              sub={`${c.total} total · ${c.resolved} resolved`}
            />
          ))}
        </Card>
        <Card title="Top Wards" icon="📍">
          {(data.byWard || []).map(w => (
            <MiniBar
              key={w._id} label={w._id || "Unknown"} value={w.total}
              max={maxWard} color="#1a56db"
              sub={`${w.total} complaints`}
            />
          ))}
        </Card>
      </div>

      {/* Resolution gauge */}
      <Card title="Overall Resolution Health" icon="🎯">
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <svg width={120} height={120} viewBox="0 0 120 120">
            {(() => {
              const R = 44, C = 2 * Math.PI * R;
              const dash  = (resolveRate / 100) * C;
              const color = resolveRate >= 70 ? "#22c55e" : resolveRate >= 40 ? "#f59e0b" : "#ef4444";
              return <>
                <circle cx={60} cy={60} r={R} fill="none" stroke="#f3f4f6" strokeWidth={12} />
                <circle cx={60} cy={60} r={R} fill="none" stroke={color} strokeWidth={12}
                  strokeDasharray={`${dash} ${C}`} strokeLinecap="round" transform="rotate(-90 60 60)" />
                <text x={60} y={56} textAnchor="middle" fontSize={22} fontWeight={800} fill={color}>{resolveRate}%</text>
                <text x={60} y={72} textAnchor="middle" fontSize={11} fill="#9ca3af">resolved</text>
              </>;
            })()}
          </svg>
          <div style={{ flex: 1 }}>
            {[
              { label: "Resolved",    value: data.resolved,   color: "#22c55e" },
              { label: "Active",      value: data.inProgress, color: "#8b5cf6" },
              { label: "Pending",     value: data.pending,    color: "#f59e0b" },
              { label: "Disputed",    value: data.disputed,   color: "#ef4444" },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: 99, background: s.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "#374151", flex: 1 }}>{s.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}