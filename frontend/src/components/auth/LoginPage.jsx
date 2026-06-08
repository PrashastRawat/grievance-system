import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import Spinner from "../shared/Spinner";

const DEMO = [
  { label: "👤 User",  email: "user@demo.com",  pass: "user123"  },
  { label: "⚙️ Admin", email: "admin@demo.com", pass: "admin123" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [form, setForm]     = useState({ email: "", password: "" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!form.email || !form.password) { setError("Please fill all fields"); return; }
    setLoading(true);
    try {
      const u = await login(form.email, form.password);
      showToast(`Welcome back, ${u.name.split(" ")[0]}!`, "🎉");
      navigate(u.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "linear-gradient(135deg, #0D0F1A 0%, #1a2744 60%, #0D0F1A 100%)" }}
    >
      {/* Dot grid bg */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="bg-white rounded-2xl p-9 w-full max-w-md shadow-[0_32px_80px_rgba(0,0,0,.35)] relative animate-fadeUp">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-7">
          <div className="w-11 h-11 bg-ink rounded-xl flex items-center justify-center text-xl">🏛️</div>
          <div>
            <div className="font-display font-extrabold text-xl text-ink">GrievanceHub</div>
            <div className="text-xs text-slate-400">Civic Complaint Portal</div>
          </div>
        </div>

        <h2 className="font-display font-bold text-2xl text-ink mb-1">Welcome back</h2>
        <p className="text-sm text-slate-500 mb-6">Sign in to your account to continue</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 text-sm mb-4">
            ⚠️ {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-[13px] font-semibold text-ink mb-1.5">Email</label>
          <input
            className="input-field"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </div>

        <div className="mb-5">
          <label className="block text-[13px] font-semibold text-ink mb-1.5">Password</label>
          <input
            className="input-field"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </div>

        <button className="btn-primary w-full py-3 text-base" onClick={handleSubmit} disabled={loading}>
          {loading ? <><Spinner /> Signing in…</> : "Sign In →"}
        </button>

        {/* Demo credentials */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-5">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">
            Demo Credentials
          </div>
          {DEMO.map(({ label, email, pass }) => (
            <div key={email} className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] text-slate-500">{label}:</span>
              <button
                className="text-[11px] text-blue-500 font-semibold underline cursor-pointer bg-transparent border-none"
                onClick={() => setForm({ email, password: pass })}
              >
                {email} / {pass}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-slate-500 mt-5">
          Don't have an account?{" "}
          <span
            className="text-ink font-semibold cursor-pointer underline"
            onClick={() => navigate("/register")}
          >
            Register
          </span>
        </p>
      </div>
    </div>
  );
}