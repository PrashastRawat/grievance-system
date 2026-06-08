import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import PageHeader from "./PageHeader";
import GlobalSearch from "../shared/GlobalSearch";

export default function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen" style={{ marginLeft: 252 }}>

        {/* Top bar with search */}
        <div className="flex items-center gap-4 px-7 py-3 border-b border-white/5 bg-slate-900">
          <div className="flex-1">
            <GlobalSearch />
          </div>
          <PageHeader />
        </div>

        <main className="flex-1 p-7 animate-fadeUp">
          <Outlet />
        </main>
      </div>
    </div>
  );
}