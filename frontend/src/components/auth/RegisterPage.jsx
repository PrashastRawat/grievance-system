import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

const API = "http://localhost:5000/api";
const WARDS = ["Rajpur Road", "Patel Nagar", "Dalanwala", "Dehradun", "Unknown Area"];
const DEPARTMENTS = ["Road", "Water", "Electricity", "Sanitation"];

const inputStyle = {
  width: "100%", padding: "13px 16px", borderRadius: 10,
  border: "1.5px solid #e5e7eb", fontSize: 15,
  fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  color: "#111827", background: "#f9fafb",
};

const labelStyle = {
  display: "block", fontSize: 13, fontWeight: 600,
  color: "#374151", marginBottom: 7,
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirm: "",
    role: "user", ward: "", department: "",
  });

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) { setError("Passwords do not match"); return; }
    if (form.role === "authority" && (!form.ward || !form.department)) {
      setError("Please select your ward and department"); return;
    }
    setLoading(true);
    try {
      const payload = { name: form.name, email: form.email, password: form.password, role: form.role };
      if (form.role === "authority") { payload.ward = form.ward; payload.department = form.department; }
      await axios.post(`${API}/auth/register`, payload);
      navigate("/login", { state: { registered: true } });
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  const isAuthority = form.role === "authority";

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#f4f6fb", fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", padding: 24,
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, width: "100%", maxWidth: 480,
        border: "1px solid #e5e7eb", overflow: "hidden",
      }}>
        {/* Header stripe */}
        <div style={{
          background: "#0f1117", padding: "28px 40px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: "#1d9e75",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
          }}>🏛️</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>GrievanceHub</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Create your account</div>
          </div>
        </div>

        <div style={{ padding: "36px 40px" }}>
          {/* Role toggle */}
          <div style={{
            display: "flex", background: "#f3f4f6", borderRadius: 10,
            padding: 4, gap: 4, marginBottom: 28,
          }}>
            {[
              { value: "user", label: "👤 Citizen" },
              { value: "authority", label: "🏛️ Authority" },
            ].map(r => (
              <button
                key={r.value}
                type="button"
                onClick={() => set("role", r.value)}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 8, fontSize: 13, fontWeight: 700,
                  cursor: "pointer", border: "none", transition: "all 0.15s",
                  background: form.role === r.value ? "#fff" : "transparent",
                  color: form.role === r.value ? "#111827" : "#6b7280",
                  boxShadow: form.role === r.value ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                }}
              >
                {r.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label style={labelStyle}>Full name</label>
                <input
                  style={inputStyle} required placeholder="Enter your full name"
                  value={form.name} onChange={e => set("name", e.target.value)}
                  onFocus={e => e.target.style.borderColor = "#1d9e75"}
                  onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                />
              </div>

              <div>
                <label style={labelStyle}>Email address</label>
                <input
                  style={inputStyle} type="email" required placeholder="you@example.com"
                  value={form.email} onChange={e => set("email", e.target.value)}
                  onFocus={e => e.target.style.borderColor = "#1d9e75"}
                  onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Password</label>
                  <input
                    style={inputStyle} type="password" required minLength={6}
                    placeholder="Min 6 characters"
                    value={form.password} onChange={e => set("password", e.target.value)}
                    onFocus={e => e.target.style.borderColor = "#1d9e75"}
                    onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Confirm</label>
                  <input
                    style={inputStyle} type="password" required
                    placeholder="Re-enter"
                    value={form.confirm} onChange={e => set("confirm", e.target.value)}
                    onFocus={e => e.target.style.borderColor = "#1d9e75"}
                    onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                  />
                </div>
              </div>

              {isAuthority && (
                <>
                  <div style={{
                    background: "#eff6ff", border: "1px solid #bfdbfe",
                    borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#1e40af",
                  }}>
                    🔔 Authority accounts are reviewed by admin before activation.
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div>
                      <label style={labelStyle}>Ward</label>
                      <select
                        style={{ ...inputStyle, background: "#f9fafb" }}
                        required value={form.ward} onChange={e => set("ward", e.target.value)}
                      >
                        <option value="">Select ward</option>
                        {WARDS.map(w => <option key={w} value={w}>{w}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Department</label>
                      <select
                        style={{ ...inputStyle, background: "#f9fafb" }}
                        required value={form.department} onChange={e => set("department", e.target.value)}
                      >
                        <option value="">Select dept.</option>
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>

            {error && (
              <div style={{
                marginTop: 18, background: "#fef2f2", border: "1px solid #fecaca",
                color: "#b91c1c", padding: "12px 16px", borderRadius: 10, fontSize: 13,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", marginTop: 24, padding: "14px", borderRadius: 10,
                fontSize: 15, fontWeight: 700, border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                background: loading ? "#d1d5db" : "#1d9e75",
                color: loading ? "#9ca3af" : "#fff",
              }}
            >
              {loading ? "Creating account…" : `Create ${isAuthority ? "authority" : "citizen"} account →`}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: 22, fontSize: 13, color: "#6b7280" }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "#1d9e75", fontWeight: 700, textDecoration: "none" }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}