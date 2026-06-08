import React from "react";
import { useComplaints } from "../../hooks/useComplaints";
import { initials } from "../../utils/helpers";
import Spinner from "../shared/Spinner";

export default function AdminUsers() {
  const { complaints, loading } = useComplaints("all");

  // Aggregate by userId from complaint data
  const userMap = {};
  complaints.forEach((c) => {
    if (!userMap[c.userId]) {
      userMap[c.userId] = { id: c.userId, name: c.userName, count: 0, resolved: 0 };
    }
    userMap[c.userId].count++;
    if (c.status === "Resolved") userMap[c.userId].resolved++;
  });
  const users = Object.values(userMap);

  return (
    <div className="card overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="font-display font-bold text-base text-ink">Registered Citizens</h3>
        <p className="text-xs text-slate-400 mt-0.5">{users.length} active users</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size={28} color="#0D0F1A" />
        </div>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50">
              {["User", "Total Filed", "Resolved", "Pending", "Resolve Rate"].map((h) => (
                <th
                  key={h}
                  className="text-left px-5 py-3 text-[11px] font-bold tracking-widest uppercase text-slate-500 border-b border-slate-200"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-sm text-slate-400">
                  No user data yet
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const pct = u.count ? Math.round((u.resolved / u.count) * 100) : 0;
                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-amber flex items-center justify-center font-display font-extrabold text-xs text-ink">
                          {initials(u.name)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-ink">{u.name}</div>
                          <div className="text-[11px] text-slate-400">Citizen</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-display font-extrabold text-lg text-ink">{u.count}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-green-600 font-semibold text-sm">{u.resolved}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-amber-dark font-semibold text-sm">{u.count - u.resolved}</span>
                    </td>
                    <td className="px-5 py-4 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-green-500 transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500 min-w-[28px]">
                          {pct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}