import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users, UserPlus, Activity, Dumbbell, Ruler, Camera } from "lucide-react";
import { useMe, useOwnerStats, useOwnerAthletes } from "../lib/api";
import { fmtDateTime } from "../lib/units";
import { PageHeader, StatCard, Empty, Loading } from "../components/Bits";
import { OwnerGuard } from "../components/OwnerFrame";

const OwnerDashboard = () => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const { data: stats } = useOwnerStats(true);
  const { data: athletes, isFetching } = useOwnerAthletes(q, true);
  if (!stats) return <Loading />;
  return (
    <div className="hc-rise space-y-8">
      <PageHeader eyebrow="Owner area · read-only" title="Athletes" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard testId="owner-stat-users" label="Users" value={stats.users} icon={Users} accent />
        <StatCard testId="owner-stat-new" label="New 7d" value={stats.new_7d} icon={UserPlus} />
        <StatCard testId="owner-stat-active" label="Active 7d" value={stats.active_7d} icon={Activity} />
        <StatCard testId="owner-stat-workouts" label="Workouts" value={stats.workouts} icon={Dumbbell} />
        <StatCard testId="owner-stat-measurements" label="Measures" value={stats.measurements} icon={Ruler} />
        <StatCard testId="owner-stat-photos" label="Photos" value={stats.photos} icon={Camera} />
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-hc-muted" />
        <input data-testid="owner-search-input" className="hc-input pl-11" placeholder="Search by name or email" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div data-testid="owner-athletes-list" className="hc-card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-hc-line text-[11px] uppercase tracking-wider text-hc-muted">
            <tr>{["Athlete", "Workouts", "Measures", "Photos", "Last active"].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-hc-line">
            {(athletes || []).map((a) => (
              <tr key={a.user_id} data-testid="owner-athlete-row" onClick={() => navigate(`/owner/athletes/${a.user_id}`)} className="cursor-pointer transition-colors hover:bg-hc-raised">
                <td className="px-4 py-3">
                  <div className="font-semibold">{a.display_name}{a.role === "admin" && <span className="ml-2 rounded bg-hc-lime/15 px-1.5 text-[10px] font-bold uppercase text-hc-lime">Owner</span>}</div>
                  <div className="text-xs text-hc-muted">{a.email}</div>
                </td>
                <td className="px-4 py-3 font-mono">{a.workouts}</td>
                <td className="px-4 py-3 font-mono">{a.measurements}</td>
                <td className="px-4 py-3 font-mono">{a.photos}</td>
                <td className="px-4 py-3 text-hc-muted">{fmtDateTime(a.last_active)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {athletes && !athletes.length && !isFetching && <div className="p-4"><Empty testId="owner-athletes-empty">No athletes match.</Empty></div>}
      </div>
    </div>
  );
};

export default function OwnerPage() {
  useMe();
  return <OwnerGuard><OwnerDashboard /></OwnerGuard>;
}
