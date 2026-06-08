import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import DashboardLayout    from "./components/layout/DashboardLayout";
import LoginPage          from "./components/auth/LoginPage";
import RegisterPage       from "./components/auth/RegisterPage";
import UserDashboard      from "./components/user/UserDashboard";
import SubmitComplaint    from "./components/user/SubmitComplaint";
import MyComplaints       from "./components/user/MyComplaints";
import AdminDashboard     from "./components/admin/AdminDashboard";
import AdminComplaints    from "./components/admin/AdminComplaints";
import AdminUsers         from "./components/admin/AdminUsers";
import AdminDisputes      from "./components/admin/AdminDisputes";
import AdminAnalytics     from "./components/admin/AdminAnalytics";
import OfficerScorecard   from "./components/admin/OfficerScorecard";
import ComplaintDetail    from "./components/shared/ComplaintDetail";
import ComplaintHeatmap   from "./components/shared/ComplaintHeatmap";
import AuthorityDashboard from "./components/authority/AuthorityDashboard";
import PublicDashboard    from "./components/public/PublicDashboard";

function RequireAuth({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}

function AlreadyAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    if (user.role === "admin")     return <Navigate to="/admin" replace />;
    if (user.role === "authority") return <Navigate to="/authority" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function RequireAuthority({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "authority" && user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}

const SPIN_CSS = `@keyframes spin { to { transform: rotate(360deg); } }`;

export default function App() {
  return (
    <>
      <style>{SPIN_CSS}</style>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="/"             element={<PublicDashboard />} />
              <Route path="/transparency" element={<PublicDashboard />} />
              <Route path="/login"        element={<AlreadyAuth><LoginPage /></AlreadyAuth>} />
              <Route path="/register"     element={<AlreadyAuth><RegisterPage /></AlreadyAuth>} />

              <Route element={<RequireAuth><DashboardLayout /></RequireAuth>}>
                <Route path="/dashboard"      element={<UserDashboard />} />
                <Route path="/submit"         element={<SubmitComplaint />} />
                <Route path="/my-complaints"  element={<MyComplaints />} />
                <Route path="/complaints/:id" element={<ComplaintDetail />} />
                <Route path="/heatmap"        element={<ComplaintHeatmap />} />
              </Route>

              <Route element={<RequireAuth adminOnly><DashboardLayout /></RequireAuth>}>
                <Route path="/admin"                element={<AdminDashboard />} />
                <Route path="/admin/complaints"     element={<AdminComplaints />} />
                <Route path="/admin/complaints/:id" element={<ComplaintDetail />} />
                <Route path="/admin/users"          element={<AdminUsers />} />
                <Route path="/admin/disputes"       element={<AdminDisputes />} />
                <Route path="/admin/heatmap"        element={<ComplaintHeatmap />} />
                <Route path="/admin/analytics"      element={<AdminAnalytics />} />
                <Route path="/admin/scorecard"      element={<OfficerScorecard />} />
              </Route>

              <Route element={<RequireAuthority><DashboardLayout /></RequireAuthority>}>
                <Route path="/authority"                element={<AuthorityDashboard />} />
                <Route path="/authority/complaints/:id" element={<ComplaintDetail />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </>
  );
}