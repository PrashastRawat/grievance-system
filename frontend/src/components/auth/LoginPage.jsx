import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import Spinner from "../shared/Spinner";

const DEMO = [
  { label: "Citizen", email: "user@demo.com", pass: "user123" },
  { label: "Admin", email: "admin@demo.com", pass: "admin123" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!form.email || !form.password) { setError("Please fill all fields"); return; }
    setLoading(true);
    try {
      const u = await login(form.email, form.password);
      showToast(`Welcome back, ${u.name.split(" ")[0]}!`, "success");
      navigate(u.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      background: "#f4f6fb",
    }}>
      {/* Left panel */}
      <div style={{
        flex: 1,
        background: "#0f1117",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "48px 56px",
        minWidth: 0,
      }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "#1d9e75",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20,
          }}>🏛️</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>GrievanceHub</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Civic Complaint Portal</div>
          </div>
        </div>

        {/* Hero text */}
        <div>
          <div style={{ fontSize: 38, fontWeight: 800, color: "#fff", lineHeight: 1.25, marginBottom: 16 }}>
            Report issues.<br />Track progress.<br />Drive change.
          </div>
          <div style={{ fontSize: 15, color: "#9ca3af", lineHeight: 1.7, maxWidth: 380 }}>
            A transparent platform connecting citizens with local authorities for faster resolution of civic issues.
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 32 }}>
            {["Ward-based routing", "Real-time tracking", "Verified authorities", "Resolution stats"].map(t => (
              <div key={t} style={{
                padding: "7px 14px", borderRadius: 20,
                background: "#1a1e2a", border: "0.5px solid #2d3244",
                fontSize: 12, color: "#9ca3af",
              }}>{t}</div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 12, color: "#374151" }}>© 2025 GrievanceHub · Dehradun</div>
      </div>

      {/* Right panel */}
      <div style={{
        width: 420,
        background: "#fff",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "56px 48px",
        flexShrink: 0,
      }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: "#111827", marginBottom: 6 }}>Welcome back</div>
          <div style={{ fontSize: 14, color: "#6b7280" }}>Sign in to your account to continue</div>
        </div>

        {error && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca",
            color: "#b91c1c", borderRadius: 10, padding: "12px 16px",
            fontSize: 13, marginBottom: 20,
          }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 7 }}>
            Email address
          </label>
          <input
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            style={{
              width: "100%", padding: "13px 16px", borderRadius: 10,
              border: "1.5px solid #e5e7eb", fontSize: 15,
              fontFamily: "inherit", outline: "none", boxSizing: "border-box",
              color: "#111827", background: "#f9fafb",
              transition: "border-color 0.15s",
            }}
            onFocus={e => e.target.style.borderColor = "#1d9e75"}
            onBlur={e => e.target.style.borderColor = "#e5e7eb"}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Password</label>
            <span style={{ fontSize: 12, color: "#1d9e75", cursor: "pointer" }}>Forgot password?</span>
          </div>
          <input
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            style={{
              width: "100%", padding: "13px 16px", borderRadius: 10,
              border: "1.5px solid #e5e7eb", fontSize: 15,
              fontFamily: "inherit", outline: "none", boxSizing: "border-box",
              color: "#111827", background: "#f9fafb",
            }}
            onFocus={e => e.target.style.borderColor = "#1d9e75"}
            onBlur={e => e.target.style.borderColor = "#e5e7eb"}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%", padding: "14px", borderRadius: 10,
            background: loading ? "#d1d5db" : "#1d9e75",
            color: "#fff", fontSize: 15, fontWeight: 700,
            border: "none", cursor: loading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {loading ? <><Spinner /> Signing in…</> : "Sign in →"}
        </button>

        {/* Demo credentials */}
        <div style={{ marginTop: 28 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10, marginBottom: 14,
          }}>
            <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
            <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Demo accounts
            </span>
            <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
          </div>
          {DEMO.map(({ label, email, pass }) => (
            <button
              key={email}
              onClick={() => setForm({ email, password: pass })}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", borderRadius: 10, marginBottom: 8,
                background: "#f9fafb", border: "1px solid #e5e7eb",
                cursor: "pointer", textAlign: "left",
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{label}</div>
                <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "monospace", marginTop: 2 }}>
                  {email} · {pass}
                </div>
              </div>
              <span style={{ fontSize: 12, color: "#1d9e75" }}>Use →</span>
            </button>
          ))}
        </div>

        <p style={{ textAlign: "center", fontSize: 13, color: "#6b7280", marginTop: 20, marginBottom: 0 }}>
          No account?{" "}
          <span
            onClick={() => navigate("/register")}
            style={{ color: "#1d9e75", fontWeight: 700, cursor: "pointer" }}
          >
            Register here
          </span>
        </p>
      </div>
    </div>
  );
}