import { useEffect, useState } from "react";
import axios from "axios";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const API = "http://localhost:5000/api";

const WARD_COORDS = {
  "Rajpur Road":  [30.3753, 78.0322],
  "Patel Nagar":  [30.3165, 78.0322],
  "Dalanwala":    [30.3245, 78.0412],
  "Dehradun":     [30.3165, 78.0322],
  "Unknown Area": [30.3165, 78.0322],
};

const CAT_COLOR = {
  Road:        "#ef4444",
  Water:       "#3b82f6",
  Electricity: "#f59e0b",
  Sanitation:  "#22c55e",
  Other:       "#8b5cf6",
};

const STATUS_COLOR = {
  pending:       "#f59e0b",
  assigned:      "#3b82f6",
  "in-progress": "#8b5cf6",
  "work-done":   "#10b981",
  resolved:      "#22c55e",
  disputed:      "#ef4444",
  rejected:      "#6b7280",
};

export default function ComplaintHeatmap() {
  const [byWard,  setByWard]  = useState([]);
  const [byCat,   setByCat]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [colorBy, setColorBy] = useState("category");
  const [geoPoints, setGeoPoints] = useState([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [wardRes, catRes, geoRes] = await Promise.all([
          axios.get(`${API}/public/by-ward`),
          axios.get(`${API}/public/by-category`),
          axios.get(`${API}/public/geo-points`).catch(() => ({ data: [] })),
        ]);
        setByWard(wardRes.data || []);
        setByCat(catRes.data || []);
        setGeoPoints(geoRes.data || []);
      } catch (err) {
        console.error("Heatmap fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Build display points — real GPS or fallback to ward centroids
  const points = geoPoints.length > 0
    ? geoPoints
    : byWard.flatMap(ward => {
        const center = WARD_COORDS[ward._id] || WARD_COORDS["Dehradun"];
        return Array.from({ length: ward.total }, (_, i) => ({
          lat:      center[0] + (Math.random() - 0.5) * 0.02,
          lng:      center[1] + (Math.random() - 0.5) * 0.02,
          category: "Road",
          status:   i < ward.resolved ? "resolved" : "pending",
          title:    `Complaint in ${ward._id}`,
          ward:     ward._id,
        }));
      });

  const maxWard = Math.max(...byWard.map(w => w.total), 1);
  const total   = byWard.reduce((s, w) => s + w.total, 0);

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: 0 }}>🗺️ Complaint Heatmap</h1>
        <p style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
          Geographic distribution of complaints across Dehradun
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20, alignItems: "start" }}>

        {/* Map card */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          {/* Toolbar */}
          <div style={{ padding: "12px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Color by:</span>
            {["category", "status"].map(opt => (
              <button key={opt} onClick={() => setColorBy(opt)} style={{
                padding: "4px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer",
                textTransform: "capitalize",
                background: colorBy === opt ? "#111827" : "#f9fafb",
                color:      colorBy === opt ? "#fff"    : "#6b7280",
                border:     colorBy === opt ? "2px solid #111827" : "1.5px solid #e5e7eb",
              }}>{opt}</button>
            ))}
            <span style={{ marginLeft: "auto", fontSize: 12, color: "#9ca3af" }}>{total} complaints</span>
          </div>

          {/* Map */}
          {!loading && (
            <MapContainer
              center={[30.3165, 78.0322]}
              zoom={13}
              style={{ height: 460, width: "100%" }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution="© OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {points.map((pt, i) => {
                const color = colorBy === "category"
                  ? (CAT_COLOR[pt.category]  || "#8b5cf6")
                  : (STATUS_COLOR[pt.status] || "#6b7280");
                return (
                  <CircleMarker
                    key={i}
                    center={[pt.lat, pt.lng]}
                    radius={7}
                    pathOptions={{ fillColor: color, color: "#fff", weight: 1.5, fillOpacity: 0.85 }}
                  >
                    <Popup>
                      <div style={{ fontFamily: "system-ui", minWidth: 160 }}>
                        <strong style={{ fontSize: 13 }}>{pt.title || "Complaint"}</strong><br />
                        <span style={{ fontSize: 12, color: "#6b7280" }}>
                          {pt.category} · {pt.ward}<br />
                          Status: <b>{pt.status}</b>
                        </span>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          )}

          {loading && (
            <div style={{ height: 460, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>
              Loading map…
            </div>
          )}

          {/* Legend */}
          <div style={{ padding: "12px 20px", borderTop: "1px solid #f3f4f6" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", marginBottom: 8, letterSpacing: 1 }}>
              LEGEND — {colorBy.toUpperCase()}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {Object.entries(colorBy === "category" ? CAT_COLOR : STATUS_COLOR).map(([k, v]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 99, background: v }} />
                  <span style={{ fontSize: 12, color: "#374151", textTransform: "capitalize" }}>{k}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>📍 By Ward</span>
            </div>
            <div style={{ padding: "12px 16px" }}>
              {loading ? <p style={{ color: "#9ca3af", fontSize: 13 }}>Loading…</p>
                : byWard.length === 0 ? <p style={{ color: "#9ca3af", fontSize: 13 }}>No data yet.</p>
                : byWard.map(w => (
                  <div key={w._id} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{w._id || "Unknown"}</span>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>{w.total}</span>
                    </div>
                    <div style={{ height: 5, background: "#f3f4f6", borderRadius: 99 }}>
                      <div style={{
                        height: "100%", borderRadius: 99,
                        width: `${(w.total / maxWard) * 100}%`,
                        background: "linear-gradient(90deg,#1a56db,#8b5cf6)",
                      }} />
                    </div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{w.resolved} resolved</div>
                  </div>
                ))
              }
            </div>
          </div>

          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>🗂️ By Category</span>
            </div>
            <div style={{ padding: "12px 16px" }}>
              {byCat.map(c => (
                <div key={c._id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 99, background: CAT_COLOR[c._id] || "#8b5cf6", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "#374151", flex: 1 }}>{c._id}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{c.total}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}