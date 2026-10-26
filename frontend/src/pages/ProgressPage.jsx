import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Trophy, Share2 } from "lucide-react";
import { useMe, useWorkouts, useMeasurements, useRecords } from "../lib/api";
import { cmToDisplay, kgToDisplay, lenUnit, wUnit, fmtLoad, fmtDate } from "../lib/units";
import { BODY_PARTS, SIDES } from "../lib/constants";
import { PageHeader, SectionTitle, StatCard, Empty, Loading } from "../components/Bits";
import { PRCardDialog } from "../components/PRCardDialog";

const tooltipStyle = { background: "#181A1E", border: "1px solid #2B2E34", borderRadius: 12, color: "#F3F4F6" };
const shortDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });

const Chips = ({ options, value, onChange, prefix }) => (
  <div className="flex flex-wrap gap-2">
    {options.map(([v, label]) => (
      <button key={String(v)} data-testid={`${prefix}-${String(label).toLowerCase()}`} data-active={value === v} onClick={() => onChange(v)} className="hc-chip h-9 px-3 text-xs">{label}</button>
    ))}
  </div>
);

const MeasurementChart = ({ measurements, units }) => {
  const [part, setPart] = useState("Arms");
  const [side, setSide] = useState("Right");
  const [flexed, setFlexed] = useState(true);
  const [pumped, setPumped] = useState(false);
  const data = measurements
    .filter((m) => m.body_part === part && m.side === side && m.flexed === flexed && m.pumped === pumped)
    .sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at))
    .map((m) => ({ date: shortDate(m.date), value: Number(cmToDisplay(m.value_cm, units).toFixed(1)) }));

  return (
    <div data-testid="measurement-chart-card" className="hc-card space-y-4 p-4 sm:p-6">
      <Chips prefix="chart-part" value={part} onChange={setPart} options={BODY_PARTS.map((p) => [p, p])} />
      <div className="flex flex-wrap gap-4">
        <Chips prefix="chart-side" value={side} onChange={setSide} options={SIDES.map((s) => [s, s])} />
        <Chips prefix="chart-flexed" value={flexed} onChange={setFlexed} options={[[true, "Flexed"], [false, "Unflexed"]]} />
        <Chips prefix="chart-pumped" value={pumped} onChange={setPumped} options={[[true, "Pumped"], [false, "Not-pumped"]]} />
      </div>
      {data.length >= 2 ? (
        <div data-testid="measurement-chart" className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid stroke="#2B2E34" vertical={false} />
              <XAxis dataKey="date" stroke="#8E949E" fontSize={12} tickLine={false} />
              <YAxis stroke="#8E949E" fontSize={12} tickLine={false} domain={[0, "auto"]} unit={` ${lenUnit(units)}`} width={64} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#22252B" }} formatter={(v) => [`${v} ${lenUnit(units)}`, part]} />
              <Bar dataKey="value" fill="#C8F169" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <Empty testId="measurement-chart-empty">Log at least 2 {part.toLowerCase()} entries that match these filters to see the trend.</Empty>
      )}
    </div>
  );
};

const VolumeChart = ({ workouts, units }) => {
  const data = workouts.filter((w) => w.completed).slice().reverse().map((w) => ({ date: shortDate(w.date), name: w.name, value: Math.round(kgToDisplay(w.volume || 0, units)) }));
  return (
    <div data-testid="volume-chart-card" className="hc-card p-4 sm:p-6">
      {data.length ? (
        <div data-testid="volume-chart" className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid stroke="#2B2E34" vertical={false} />
              <XAxis dataKey="date" stroke="#8E949E" fontSize={12} tickLine={false} />
              <YAxis stroke="#8E949E" fontSize={12} tickLine={false} width={64} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#22252B" }} formatter={(v, _, p) => [`${v.toLocaleString()} ${wUnit(units)}`, p.payload.name]} />
              <Bar dataKey="value" fill="#C8F169" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : <Empty testId="volume-chart-empty">Complete a session to see volume per workout.</Empty>}
    </div>
  );
};

export default function ProgressPage() {
  const { data: me } = useMe();
  const { data: workouts } = useWorkouts();
  const { data: measurements } = useMeasurements();
  const { data: records } = useRecords();
  const [share, setShare] = useState(null);
  const stats = useMemo(() => workouts && measurements && ({
    workouts: workouts.length,
    sets: workouts.reduce((a, w) => a + (w.set_count || 0), 0),
    entries: measurements.length,
    muscles: new Set(measurements.map((m) => m.body_part)).size,
  }), [workouts, measurements]);
  if (!me || !stats || !records) return <Loading />;

  return (
    <div className="hc-rise space-y-10">
      <PageHeader eyebrow="The numbers" title="Progress" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard testId="progress-stat-workouts" label="Workouts" value={stats.workouts} />
        <StatCard testId="progress-stat-sets" label="Sets" value={stats.sets} />
        <StatCard testId="progress-stat-entries" label="Measurements" value={stats.entries} />
        <StatCard testId="progress-stat-muscles" label="Muscles tracked" value={stats.muscles} />
      </div>
      <section><SectionTitle>Measurements, like for like</SectionTitle><MeasurementChart measurements={measurements} units={me.units} /></section>
      <section><SectionTitle>Volume per session</SectionTitle><VolumeChart workouts={workouts} units={me.units} /></section>
      <section>
        <SectionTitle>Records</SectionTitle>
        <div data-testid="records-list" className="grid gap-3 sm:grid-cols-2">
          {records.map((r) => (
            <div key={r.exercise_id} data-testid={`record-${r.exercise_id}`} className="hc-card flex items-center gap-4 p-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-hc-lime/15 text-hc-lime"><Trophy className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{r.exercise_name}</div>
                <div className="font-mono text-sm text-hc-muted"><span className="text-hc-text">{fmtLoad(r.load, me.units)}</span> × {r.reps} · {fmtDate(r.date)}</div>
              </div>
              <button data-testid={`record-share-${r.exercise_id}`} onClick={() => setShare(r)} className="hc-btn-ghost h-11 px-3 text-sm"><Share2 className="h-4 w-4" /><span className="hidden sm:inline">Share PR</span></button>
            </div>
          ))}
          {!records.length && <Empty testId="records-empty">Complete sessions with loads to set your records.</Empty>}
        </div>
      </section>
      <PRCardDialog pr={share} open={!!share} onOpenChange={(o) => !o && setShare(null)} units={me.units} athlete={me.display_name} />
    </div>
  );
}
