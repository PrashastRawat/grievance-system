import React from "react";
import { useLocation } from "react-router-dom";

const META = {
  "/dashboard":         { title: "My Dashboard",   sub: "Track your civic complaints" },
  "/submit":            { title: "New Complaint",  sub: "File a complaint — ML will auto-classify" },
  "/my-complaints":     { title: "My Complaints",  sub: "All complaints you've submitted" },
  "/admin":             { title: "Admin Overview", sub: "City-wide complaint analytics" },
  "/admin/complaints":  { title: "All Complaints", sub: "Manage and update complaint statuses" },
  "/admin/users":       { title: "Users",          sub: "Registered citizens and their activity" },
};

export default function PageHeader() {
  const { pathname } = useLocation();
  const meta = META[pathname];
  if (!meta) return null;

  return (
    <header className="bg-white border-b border-slate-200 px-7 py-4 sticky top-0 z-40">
      <h1 className="font-display font-extrabold text-xl text-ink leading-tight">{meta.title}</h1>
      <p className="text-xs text-slate-400 mt-0.5">{meta.sub}</p>
    </header>
  );
}