import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

const API = "http://localhost:5000/api";

const WARDS = ["Rajpur Road", "Patel Nagar", "Dalanwala", "Dehradun", "Unknown Area"];
const DEPARTMENTS = ["Road", "Water", "Electricity", "Sanitation"];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step,    setStep]    = useState(1); // 1 = basic info, 2 = authority details
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name:       "",
    email:      "",
    password:   "",
    confirm:    "",
    role:       "user",
    ward:       "",
    department: "",
  });

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }
    if (form.role === "authority" && (!form.ward || !form.department)) {
      setError("Please select your ward and department");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name:     form.name,
        email:    form.email,
        password: form.password,
        role:     form.role,
      };
      if (form.role === "authority") {
        payload.ward       = form.ward;
        payload.department = form.department;
      }

      await axios.post(`${API}/auth/register`, payload);
      navigate("/login", { state: { registered: true } });
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%", padding: "10px 14px", borderRadius: 8, fontSize: 14,
    border: "1.5px solid #e5e7eb", outline: "none", boxSizing: "border-box",
    fontFamily: "inherit",
  };
  const labelStyle = { fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 };

  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(135deg,#f0f4ff 0%,#f0fdf4 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Segoe UI', system-ui, sans-serif", padding: 20,
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, padding: "40px 36px",
        width: "100%", maxWidth: 440,
        boxShadow: "0 4px 32px rgba(0,0,0,0.10)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>🏛️</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#111827" }}>GrievanceHub</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>Create your account</p>
        </div>

        {/* Role selector */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {[
            { value: "user",      label: "👤 Citizen" },
            { value: "authority", label: "🏛️ Authority" },
          ].map(r => (
            <button
              key={r.value}
              type="button"
              onClick={() => { set("role", r.value); setStep(1); }}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 13, fontWeight: 700,
                cursor: "pointer",
                background: form.role === r.value ? "#111827" : "#f9fafb",
                color:      form.role === r.value ? "#fff"    : "#6b7280",
                border:     form.role === r.value ? "2px solid #111827" : "1.5px solid #e5e7eb",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: Basic info */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelStyle}>Full Name</label>
              <input
                style={inputStyle} required
                placeholder="Enter your full name"
                value={form.name}
                onChange={e => set("name", e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                style={inputStyle} type="email" required
                placeholder="Enter your email"
                value={form.email}
                onChange={e => set("email", e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input
                style={inputStyle} type="password" required minLength={6}
                placeholder="Min 6 characters"
                value={form.password}
                onChange={e => set("password", e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Confirm Password</label>
              <input
                style={inputStyle} type="password" required
                placeholder="Re-enter password"
                value={form.confirm}
                onChange={e => set("confirm", e.target.value)}
              />
            </div>

            {/* Authority-specific fields */}
            {form.role === "authority" && (
              <>
                <div style={{
                  background: "#eff6ff", border: "1px solid #bfdbfe",
                  borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "#1e40af",
                }}>
                  🔔 Authority accounts are reviewed by admin before activation.
                </div>
                <div>
                  <label style={labelStyle}>Ward</label>
                  <select
                    style={{ ...inputStyle, background: "#fff" }}
                    required
                    value={form.ward}
                    onChange={e => set("ward", e.target.value)}
                  >
                    <option value="">Select your ward</option>
                    {WARDS.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Department</label>
                  <select
                    style={{ ...inputStyle, background: "#fff" }}
                    required
                    value={form.department}
                    onChange={e => set("department", e.target.value)}
                  >
                    <option value="">Select your department</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>

          {error && (
            <div style={{
              marginTop: 16, background: "#fee2e2", color: "#991b1b",
              padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", marginTop: 24, padding: "12px 0", borderRadius: 10,
              fontSize: 14, fontWeight: 700, border: "none", cursor: loading ? "not-allowed" : "pointer",
              background: loading ? "#e5e7eb" : "linear-gradient(135deg,#1a56db,#0e9f6e)",
              color: loading ? "#9ca3af" : "#fff",
            }}
          >
            {loading ? "Creating account…" : `Create ${form.role === "authority" ? "Authority" : "Citizen"} Account`}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#6b7280" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#1a56db", fontWeight: 600, textDecoration: "none" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}