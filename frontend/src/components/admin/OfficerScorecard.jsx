import { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";

function RateBar({ value, color = "#22c55e" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: 8, background: "#f3f4f6", borderRadius: 99 }}>
        <div style={{
          height: "100%", borderRadius: 99, background: color,
          width: `${Math.min(value, 100)}%`, transition: "width 0.8s ease",
        }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color, minWidth: 36 }}>{value}%</span>
    </div>
  );
}

function ScoreRing({ value }) {
  const color = value >= 70 ? "#22c55e" : value >= 40 ? "#f59e0b" : "#ef4444";
  const R = 28, C = 2 * Math.PI * R;
  const dash = (value / 100) * C;
  return (
    <svg width={72} height={72} viewBox="0 0 72 72">
      <circle cx={36} cy={36} r={R} fill="none" stroke="#f3f4f6" strokeWidth={8} />
      <circle cx={36} cy={36} r={R} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${dash} ${C}`} strokeLinecap="round"
        transform="rotate(-90 36 36)" style={{ transition: "stroke-dasharray 0.8s ease" }} />
      <text x={36} y={40} textAnchor="middle" fontSize={14} fontWeight={800} fill={color}>{value}%</text>
    </svg>
  );
}

export default function OfficerScorecard() {
  const [units,   setUnits]   = useState([]);   // ward+department units
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const token   = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    async function fetchScorecard() {
      try {
        // Pull aggregated stats directly from complaints — no officerId needed
        const res = await axios.get(`${API}/admin/scorecard-stats`, { headers });
        setUnits(res.data?.data || []);
      } catch (err) {
        console.error("Scorecard fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchScorecard();
  }, []);

  const completionColor = (rate) =>
    rate >= 70 ? "#22c55e" : rate >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: 0 }}>🏆 Officer Scorecard</h1>
        <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
          Performance metrics by ward &amp; department — based on complaint data
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>Loading…</div>
      ) : units.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
          <p style={{ color: "#6b7280" }}>No complaint data yet. Submit some complaints first.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

          {/* Left: unit list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {units.map((u, i) => {
              const isActive = selected?.key === u.key;
              return (
                <div
                  key={u.key}
                  onClick={() => setSelected(isActive ? null : u)}
                  style={{
                    background: "#fff",
                    border: `2px solid ${isActive ? "#1a56db" : "#e5e7eb"}`,
                    borderRadius: 14, padding: "16px 20px", cursor: "pointer",
                    boxShadow: isActive ? "0 0 0 3px rgba(26,86,219,0.1)" : "0 1px 4px rgba(0,0,0,0.05)",
                    display: "flex", alignItems: "center", gap: 16,
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                >
                  {/* Rank badge */}
                  <div style={{
                    width: 28, height: 28, borderRadius: 99, flexShrink: 0,
                    background: i === 0 ? "#fef3c7" : i === 1 ? "#f3f4f6" : i === 2 ? "#fde8d8" : "#f9fafb",
                    color:      i === 0 ? "#92400e" : i === 1 ? "#374151" : i === 2 ? "#7c2d12" : "#6b7280",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 800,
                  }}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </div>

                  <ScoreRing value={u.completionRate} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {u.ward}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                      {u.department} · {u.total} complaints
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <RateBar value={u.completionRate} color={completionColor(u.completionRate)} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: detail panel */}
          <div style={{
            background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14,
            padding: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            position: "sticky", top: 20, alignSelf: "start",
          }}>
            {!selected ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>👆</div>
                <p>Select a ward to view details</p>
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111827", margin: "0 0 4px" }}>
                  {selected.ward}
                </h2>
                <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 24 }}>
                  {selected.department} Department · Performance breakdown
                </p>

                {/* Big stats */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
                  {[
                    { label: "Total",      value: selected.total,      color: "#3b82f6", icon: "📋" },
                    { label: "Resolved",   value: selected.resolved,   color: "#22c55e", icon: "✅" },
                    { label: "Pending",    value: selected.pending,    color: "#f59e0b", icon: "⏳" },
                    { label: "Disputed",   value: selected.disputed,   color: "#ef4444", icon: "⚠️" },
                  ].map(s => (
                    <div key={s.label} style={{
                      background: "#f9fafb", borderRadius: 10, padding: "14px 16px",
                      border: "1px solid #e5e7eb",
                    }}>
                      <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Rate bars */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                      Completion Rate
                    </div>
                    <RateBar value={selected.completionRate} color={completionColor(selected.completionRate)} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                      Dispute Rate
                    </div>
                    <RateBar value={selected.disputeRate} color="#ef4444" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                      In Progress Rate
                    </div>
                    <RateBar value={selected.inProgressRate} color="#8b5cf6" />
                  </div>

                  {/* Avg resolution time */}
                  <div style={{
                    background: "#f9fafb", borderRadius: 10, padding: "14px 16px",
                    border: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <span style={{ fontSize: 13, color: "#6b7280" }}>⏱️ Avg. Resolution Time</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>
                      {selected.avgResolutionDays ?? "—"} days
                    </span>
                  </div>

                  {/* Performance grade */}
                  {(() => {
                    const rate = selected.completionRate;
                    const grade = rate >= 70 ? { label: "Excellent", color: "#22c55e", bg: "#dcfce7", emoji: "🌟" }
                                : rate >= 40 ? { label: "Average",   color: "#f59e0b", bg: "#fef3c7", emoji: "👍" }
                                :              { label: "Poor",      color: "#ef4444", bg: "#fee2e2", emoji: "⚠️" };
                    return (
                      <div style={{
                        background: grade.bg, borderRadius: 10, padding: "14px 16px",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                      }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: grade.color }}>
                          {grade.emoji} Performance Grade
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: grade.color }}>{grade.label}</span>
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}