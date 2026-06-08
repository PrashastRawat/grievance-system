import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { initials } from "../../utils/helpers";

const USER_NAV = [
  { path: "/dashboard",     icon: "🏠", label: "My Dashboard" },
  { path: "/submit",        icon: "➕", label: "New Complaint" },
  { path: "/my-complaints", icon: "📄", label: "My Complaints" },
  { path: "/heatmap",       icon: "🗺️", label: "Complaint Map" },
];

const ADMIN_NAV = [
  { path: "/admin",            icon: "📊", label: "Overview" },
  { path: "/admin/complaints", icon: "📋", label: "All Complaints" },
  { path: "/admin/disputes",   icon: "⚖️", label: "Disputes" },
  { path: "/admin/analytics",  icon: "📈", label: "Analytics" },
  { path: "/admin/scorecard",  icon: "🏆", label: "Officer Scorecard" },
  { path: "/admin/heatmap",    icon: "🗺️", label: "Complaint Map" },
  { path: "/admin/users",      icon: "👥", label: "Users" },
];

const AUTHORITY_NAV = [
  { path: "/authority", icon: "🏛️", label: "Assigned Complaints" },
];

const NAV_LABEL = {
  admin: "Administration", authority: "Authority Panel", user: "Navigation",
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const navItems =
    user?.role === "admin"     ? ADMIN_NAV     :
    user?.role === "authority" ? AUTHORITY_NAV :
    USER_NAV;
    

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-50 flex flex-col overflow-y-auto" style={{ width: 252, background: "#0D0F1A" }}>
      <div className="px-5 py-6 border-b border-white/7">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber rounded-lg flex items-center justify-center text-lg flex-shrink-0">🏛️</div>
          <div>
            <div className="font-display font-extrabold text-[13px] text-white leading-tight">GrievanceHub</div>
            <div className="text-[10px] text-white/30 tracking-wide mt-0.5">Civic Complaint Portal</div>
          </div>
        </div>
      </div>

      <nav className="flex flex-col flex-1 px-2.5 py-4 space-y-1">
        <div className="text-[9px] font-bold tracking-widest uppercase text-white/60 px-2.5 mb-2">
          {NAV_LABEL[user?.role] || "Navigation"}
        </div>
        {navItems.map((item) => {
          const active =
            location.pathname === item.path ||
            (item.path !== "/admin" && location.pathname.startsWith(item.path + "/"));
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-md text-left transition ${active ? "bg-white/15" : "hover:bg-white/10"}`}
            >
              <span className="w-7 h-7 flex items-center justify-center rounded-md text-sm"
                style={{ background: active ? "rgba(255,255,255,.15)" : "rgba(255,255,255,.08)" }}>
                {item.icon}
              </span>
              <span className="text-white text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="px-2.5 pb-4 border-t border-white/7 pt-3">
        <div className="flex items-center gap-2.5 bg-white/5 rounded-lg px-3 py-2.5">
          <div className="w-8 h-8 rounded-full bg-amber flex items-center justify-center font-display font-extrabold text-xs text-ink flex-shrink-0">
            {initials(user?.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-white truncate">{user?.name}</div>
            <div className="text-[10px] text-white/30 uppercase tracking-wide">{user?.role}</div>
          </div>
          <button onClick={logout} className="text-white/25 hover:text-white/60 transition-colors text-base px-1" title="Logout">↩</button>
        </div>
      </div>
    </aside>
  );
}