import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:5000/api/public";

const STATUS_COLOR = {
  pending:       { bg: "#fef3c7", text: "#92400e", dot: "#f59e0b" },
  assigned:      { bg: "#dbeafe", text: "#1e40af", dot: "#3b82f6" },
  "in-progress": { bg: "#ede9fe", text: "#5b21b6", dot: "#8b5cf6" },
  "work-done":   { bg: "#d1fae5", text: "#065f46", dot: "#10b981" },
  resolved:      { bg: "#bbf7d0", text: "#14532d", dot: "#22c55e" },
  disputed:      { bg: "#fee2e2", text: "#991b1b", dot: "#ef4444" },
  rejected:      { bg: "#f3f4f6", text: "#374151", dot: "#6b7280" },
};

const CAT_ICON = {
  Road: "🛣️", Water: "💧", Electricity: "⚡", Sanitation: "🗑️", Other: "📋",
};

function MiniBar({ value, max, color = "#1a56db", label, sub }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{label}</span>
        <span style={{ fontSize: 13, color: "#6b7280" }}>{sub || value}</span>
      </div>
      <div style={{ height: 8, background: "#e5e7eb", borderRadius: 99 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 0.8s cubic-bezier(.4,0,.2,1)" }} />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, accent = "#1a56db" }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "24px 28px", display: "flex", alignItems: "flex-start", gap: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <div style={{ fontSize: 28, width: 52, height: 52, background: accent + "18", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 800, color: "#111827", lineHeight: 1 }}>{value ?? "—"}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginTop: 4 }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function SectionCard({ title, icon, children, badge }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <div style={{ padding: "18px 24px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{title}</span>
        {badge}
      </div>
      <div style={{ padding: "20px 24px" }}>{children}</div>
    </div>
  );
}

function DonutChart({ data }) {
  if (!data?.length) return <p style={{ color: "#9ca3af", fontSize: 13 }}>No data yet.</p>;
  const total = data.reduce((s, d) => s + d.count, 0);
  const COLORS = ["#1a56db", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#6b7280", "#0ea5e9"];
  const R = 60, CX = 80, CY = 80;
  let cumulative = 0;
  const slices = data.map((d, i) => {
    const pct = d.count / total;
    const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    cumulative += pct;
    const endAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    const x1 = CX + R * Math.cos(startAngle), y1 = CY + R * Math.sin(startAngle);
    const x2 = CX + R * Math.cos(endAngle),   y2 = CY + R * Math.sin(endAngle);
    return {
      d: `M ${x1} ${y1} A ${R} ${R} 0 ${pct > 0.5 ? 1 : 0} 1 ${x2} ${y2}`,
      color: STATUS_COLOR[d._id]?.dot || COLORS[i % COLORS.length],
      label: d._id, count: d.count, pct: Math.round(pct * 100),
    };
  });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
      <svg width={160} height={160} viewBox="0 0 160 160">
        {slices.map((s, i) => (
          <path key={i} d={s.d} fill="none" stroke={s.color} strokeWidth={22} strokeLinecap="butt" />
        ))}
        <text x={CX} y={CY - 6} textAnchor="middle" fontSize={22} fontWeight={800} fill="#111827">{total}</text>
        <text x={CX} y={CY + 12} textAnchor="middle" fontSize={11} fill="#6b7280">total</text>
      </svg>
      <div style={{ flex: 1, minWidth: 140 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 99, background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "#374151", textTransform: "capitalize", flex: 1 }}>{s.label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{s.count} <span style={{ color: "#9ca3af", fontWeight: 400 }}>({s.pct}%)</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Sparkline({ data }) {
  if (!data?.length) return <p style={{ color: "#9ca3af", fontSize: 13 }}>No trend data yet.</p>;
  const W = 520, H = 120, PAD = 16;
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
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block", minWidth: 280 }}>
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#1a56db" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#1a56db" stopOpacity="0"   />
          </linearGradient>
        </defs>
        <polygon points={`${pts[0]} ${polyline} ${areaBottom}`} fill="url(#sparkGrad)" />
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

function WardHealthCard({ ward }) {
  const [expanded, setExpanded] = useState(false);
  const { score, grade, color, emoji, breakdown } = ward;
  const R = 28, C = 2 * Math.PI * R;
  const dash = (score / 100) * C;
  return (
    <div style={{ background: "#fff", border: `1.5px solid ${color}33`, borderRadius: 14, padding: "16px 18px", cursor: "pointer", transition: "box-shadow 0.2s", boxShadow: expanded ? `0 4px 16px ${color}22` : "0 1px 4px rgba(0,0,0,0.06)" }} onClick={() => setExpanded(e => !e)}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <svg width={68} height={68} viewBox="0 0 68 68" style={{ flexShrink: 0 }}>
          <circle cx={34} cy={34} r={R} fill="none" stroke="#f3f4f6" strokeWidth={8} />
          <circle cx={34} cy={34} r={R} fill="none" stroke={color} strokeWidth={8} strokeDasharray={`${dash} ${C}`} strokeLinecap="round" transform="rotate(-90 34 34)" style={{ transition: "stroke-dasharray 1s ease" }} />
          <text x={34} y={30} textAnchor="middle" fontSize={14} fontWeight={800} fill={color}>{score}</text>
          <text x={34} y={43} textAnchor="middle" fontSize={8}  fill="#9ca3af">/ 100</text>
        </svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ward.ward}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: color + "20", color }}>{emoji} {grade}</span>
          </div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{breakdown.resolutionRate}% resolved · {ward.total} total</div>
        </div>
        <span style={{ fontSize: 12, color: "#9ca3af", flexShrink: 0 }}>{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #f3f4f6" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Score Breakdown</div>
          {[
            { label: "Resolution Rate",  score: breakdown.resolutionScore, weight: "40%", detail: `${breakdown.resolutionRate}% resolved` },
            { label: "Speed",            score: breakdown.speedScore,      weight: "25%", detail: breakdown.avgDays ? `~${breakdown.avgDays} days avg` : "No data" },
            { label: "Pending Load",     score: breakdown.loadScore,       weight: "20%", detail: `${breakdown.pendingRate}% pending` },
            { label: "Dispute Rate",     score: breakdown.disputeScore,    weight: "15%", detail: `${breakdown.disputeRate}% disputed` },
          ].map(f => (
            <div key={f.label} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}>{f.label}<span style={{ fontWeight: 400, color: "#9ca3af", marginLeft: 4 }}>({f.weight})</span></span>
                <span style={{ fontSize: 12, color: "#111827", fontWeight: 700 }}>{f.score}/100</span>
              </div>
              <div style={{ height: 5, background: "#f3f4f6", borderRadius: 99, marginBottom: 2 }}>
                <div style={{ height: "100%", borderRadius: 99, width: `${f.score}%`, background: f.score >= 80 ? "#22c55e" : f.score >= 60 ? "#f59e0b" : f.score >= 40 ? "#f97316" : "#ef4444", transition: "width 0.8s ease" }} />
              </div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>{f.detail}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HealthLegend() {
  const grades = [
    { emoji: "🟢", label: "Healthy",         range: "80–100", color: "#22c55e" },
    { emoji: "🟡", label: "Moderate",         range: "60–79",  color: "#f59e0b" },
    { emoji: "🟠", label: "Needs Attention",  range: "40–59",  color: "#f97316" },
    { emoji: "🔴", label: "Critical",         range: "0–39",   color: "#ef4444" },
  ];
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      {grades.map(g => (
        <div key={g.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151" }}>
          <span>{g.emoji}</span>
          <span style={{ fontWeight: 600, color: g.color }}>{g.label}</span>
          <span style={{ color: "#9ca3af" }}>({g.range})</span>
        </div>
      ))}
    </div>
  );
}

export default function PublicDashboard() {
  const [stats,       setStats]       = useState(null);
  const [byCat,       setByCat]       = useState([]);
  const [byWard,      setByWard]      = useState([]);
  const [byStatus,    setByStatus]    = useState([]);
  const [trend,       setTrend]       = useState([]);
  const [topAuth,     setTopAuth]     = useState([]);
  const [recent,      setRecent]      = useState([]);
  const [wardHealth,  setWardHealth]  = useState([]);
  const [healthLoading, setHealthLoading] = useState(true);
  const [loading,     setLoading]     = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  async function fetchAll() {
    try {
      const [s, cat, ward, status, tr, auth, rec] = await Promise.all([
        axios.get(`${API}/stats`),
        axios.get(`${API}/by-category`),
        axios.get(`${API}/by-ward`),
        axios.get(`${API}/by-status`),
        axios.get(`${API}/trend`),
        axios.get(`${API}/top-authorities`),
        axios.get(`${API}/recent`),
      ]);
      setStats(s.data);
      setByCat(cat.data);
      setByWard(ward.data);
      setByStatus(status.data);
      setTrend(tr.data);
      setTopAuth(auth.data);
      setRecent(rec.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("PublicDashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchWardHealth() {
    setHealthLoading(true);
    try {
      const res = await axios.get(`${API}/ward-health`);
      setWardHealth(res.data || []);
    } catch (err) {
      console.error("Ward health fetch error:", err);
      setWardHealth([]);
    } finally {
      setHealthLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
    fetchWardHealth();
    const interval = setInterval(fetchAll, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, border: "4px solid #e5e7eb", borderTop: "4px solid #1a56db", borderRadius: "50%", margin: "0 auto 16px", animation: "spin 0.8s linear infinite" }} />
          <p style={{ color: "#6b7280", fontSize: 14 }}>Loading transparency data…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const maxCat  = Math.max(...byCat.map(c => c.total), 1);
  const maxWard = Math.max(...byWard.map(w => w.total), 1);
  const healthyCnt  = wardHealth.filter(w => w.score >= 80).length;
  const criticalCnt = wardHealth.filter(w => w.score < 40).length;

  return (
    <div style={{ minHeight: "100vh", background: "#66a3e97c", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1b1b1b 0%, #0e0653 100%)", color: "#ffffff", padding: "60px 40px 40px", maxWidth: "100%" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 40, fontWeight: 900, letterSpacing: "-0.5px" }}>🏛️ GrievanceHub</h1>
              <p style={{ margin: "8px 0 0", opacity: 0.85, fontSize: 16 }}>Live transparency data for Dehradun</p>
            </div>
            <div style={{ textAlign: "right", fontSize: 12, opacity: 0.75 }}>
              <div>🔄 Auto-refreshes every minute</div>
              {lastUpdated && <div>Last updated: {lastUpdated.toLocaleTimeString("en-IN")}</div>}
              <div style={{ marginTop: 10 }}>
                <a href="/login" style={{ color: "#fff", textDecoration: "none", background: "rgba(13, 209, 39, 0.95)", padding: "6px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, display: "inline-block" }}>Login →</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "40px 40px" }}>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 40 }}>
          <StatCard  icon="📋" label="Total Complaints"  value={stats?.total}      accent="#1a56db" />
          <StatCard  icon="✅" label="Resolved"           value={stats?.resolved}   sub={`${stats?.resolutionRate}% resolution rate`} accent="#10b981" />
          <StatCard  icon="⚙️" label="In Progress"        value={stats?.inProgress} accent="#8b5cf6" />
          <StatCard  icon="⏳" label="Pending"            value={stats?.pending}    accent="#f59e0b" />
          <StatCard  icon="📅" label="Avg. Resolution"    value={stats?.avgResolutionDays ? `${stats.avgResolutionDays}d` : "—"} sub="average days" accent="#0ea5e9" />
        </div>

        {/* Status donut + trend */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 20, marginBottom: 40, alignItems: "start" }}>
          <SectionCard title="Status Breakdown" icon="🍩">
            <DonutChart data={byStatus} />
          </SectionCard>
          <SectionCard title="30-Day Trend" icon="📈">
            <Sparkline data={trend} />
          </SectionCard>
        </div>

        {/* Ward Health */}
        <div style={{ marginBottom: 40 }}>
          <SectionCard title="Ward Health Scores" icon="🏥" badge={healthyCnt > 0 || criticalCnt > 0 ? (
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              {healthyCnt > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#dcfce7", color: "#166534" }}>🟢 {healthyCnt}</span>}
              {criticalCnt > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#fee2e2", color: "#991b1b" }}>🔴 {criticalCnt}</span>}
            </div>
          ) : null}>
            {healthLoading ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#9ca3af", fontSize: 13 }}>
                <div style={{ width: 16, height: 16, border: "2px solid #e5e7eb", borderTop: "2px solid #1a56db", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                Calculating scores…
              </div>
            ) : wardHealth.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: 13 }}>Not enough data yet.</p>
            ) : (
              <>
                <div style={{ marginBottom: 16 }}>
                  <HealthLegend />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12, marginBottom: 16 }}>
                  {wardHealth.map((w, i) => (
                    <WardHealthCard key={i} ward={w} />
                  ))}
                </div>
                {wardHealth.length > 1 && (() => {
                  const avg = Math.round(wardHealth.reduce((s, w) => s + w.score, 0) / wardHealth.length);
                  const avgColor = avg >= 80 ? "#22c55e" : avg >= 60 ? "#f59e0b" : avg >= 40 ? "#f97316" : "#ef4444";
                  return (
                    <div style={{ padding: "16px 20px", background: "#f9fafb", borderRadius: 10, border: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>🏙️ City Average</span>
                      <span style={{ fontSize: 24, fontWeight: 900, color: avgColor }}>{avg}/100</span>
                    </div>
                  );
                })()}
              </>
            )}
          </SectionCard>
        </div>

        {/* By category + by ward */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 40 }}>
          <SectionCard title="By Category" icon="🗂️">
            {byCat.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: 13 }}>No data yet.</p>
            ) : byCat.map(c => (
              <MiniBar key={c._id} label={`${CAT_ICON[c._id] || "📋"} ${c._id}`} value={c.total} max={maxCat} color="#1a56db" sub={`${c.resolved} resolved`} />
            ))}
          </SectionCard>
          <SectionCard title="Top Wards" icon="📍">
            {byWard.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: 13 }}>No data yet.</p>
            ) : byWard.map(w => (
              <MiniBar key={w._id} label={w._id || "Unknown"} value={w.total} max={maxWard} color="#8b5cf6" sub={`${w.resolved} resolved`} />
            ))}
          </SectionCard>
        </div>

        {/* Authority leaderboard */}
        {topAuth.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <SectionCard title="Authority Leaderboard" icon="🏆">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
                {topAuth.map((a, i) => (
                  <div key={i} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: "16px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: 22, marginBottom: 8 }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "⭐"}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 2 }}>{a.ward}</div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>{a.department}</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: a.rate >= 70 ? "#22c55e" : a.rate >= 40 ? "#f59e0b" : "#ef4444", marginBottom: 6 }}>{a.rate}%</div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>{a.resolved}/{a.total}</div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        )}

        {/* Recently resolved */}
        {recent.length > 0 && (
          <SectionCard title="Recently Resolved" icon="🕐">
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                    {["Title", "Category", "Ward", "Resolved"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "#6b7280", fontSize: 12, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recent.map(c => (
                    <tr key={c._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "12px 16px", color: "#111827", fontWeight: 500 }}>{c.title}</td>
                      <td style={{ padding: "12px 16px", color: "#374151" }}>{CAT_ICON[c.category]} {c.category}</td>
                      <td style={{ padding: "12px 16px", color: "#374151" }}>{c.ward}</td>
                      <td style={{ padding: "12px 16px", color: "#6b7280", fontSize: 12 }}>
                        {new Date(c.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}
      </div>

      {/* Footer */}
      <div style={{ background: "#111827", color: "#fff", padding: "40px", textAlign: "center", fontSize: 13, marginTop: 40 }}>
        GrievanceHub · Dehradun Municipal Grievance System
      </div>
    </div>
  );
}