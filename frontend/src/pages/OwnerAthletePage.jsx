import { useState } from "react";
import { useParams } from "react-router-dom";
import { useOwnerAthlete } from "../lib/api";
import { fmtDate, fmtDateTime, fmtLen, fmtVolume } from "../lib/units";
import { PageHeader, SectionTitle, StatCard, Empty, Loading } from "../components/Bits";
import { OwnerGuard } from "../components/OwnerFrame";
import { AuthImage } from "../components/AuthImage";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../components/ui/dialog";

const Detail = ({ userId }) => {
  const { data, error } = useOwnerAthlete(userId, true);
  const [viewing, setViewing] = useState(null);
  if (error) return <Empty testId="owner-athlete-missing">Athlete not found.</Empty>;
  if (!data) return <Loading />;
  const { athlete: a, stats, measurements, workouts, photos } = data;
  const units = a.units;

  return (
    <div className="hc-rise space-y-8">
      <PageHeader eyebrow={`${a.email} · joined ${fmtDate(a.created_at)} · last active ${fmtDateTime(a.last_active)}`} title={a.display_name} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard testId="athlete-stat-workouts" label="Workouts" value={stats.workouts} />
        <StatCard testId="athlete-stat-completed" label="Completed" value={stats.completed} />
        <StatCard testId="athlete-stat-sets" label="Sets" value={stats.sets} />
        <StatCard testId="athlete-stat-volume" label="Volume" value={fmtVolume(stats.volume, units)} />
        <StatCard testId="athlete-stat-measurements" label="Measures" value={stats.measurements} />
        <StatCard testId="athlete-stat-photos" label="Photos" value={stats.photos} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <SectionTitle>Latest measurements</SectionTitle>
          <div data-testid="athlete-measurements" className="hc-card divide-y divide-hc-line">
            {measurements.map((m) => (
              <div key={m.id} className="flex justify-between px-4 py-3 text-sm">
                <span>{m.body_part} · <span className="text-hc-muted">{m.side} · {fmtDate(m.date)} · {m.flexed ? "Flexed" : "Unflexed"}{m.pumped ? " · Pumped" : ""}</span></span>
                <span className="font-mono font-bold">{fmtLen(m.value_cm, units)}</span>
              </div>
            ))}
            {!measurements.length && <div className="p-4"><Empty>No measurements.</Empty></div>}
          </div>
        </section>
        <section>
          <SectionTitle>Workouts · {a.plan_name}</SectionTitle>
          <div data-testid="athlete-workouts" className="hc-card divide-y divide-hc-line">
            {workouts.map((w) => (
              <div key={w.id} className="flex justify-between px-4 py-3 text-sm">
                <span>{w.name} <span className="text-hc-muted">· {fmtDate(w.date)} · {w.set_count} sets · {w.completed ? "Completed" : "Not completed"}</span></span>
                <span className="font-mono text-hc-lime">{fmtVolume(w.volume || 0, units)}</span>
              </div>
            ))}
            {!workouts.length && <div className="p-4"><Empty>No workouts.</Empty></div>}
          </div>
        </section>
      </div>
      <section>
        <SectionTitle>Progress photos</SectionTitle>
        <div data-testid="athlete-photos" className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {photos.map((p) => (
            <button key={p.id} data-testid="athlete-photo" onClick={() => setViewing(p)} className="hc-card overflow-hidden text-left">
              <AuthImage photoId={p.id} alt={`Progress ${p.date}`} className="aspect-[3/4] w-full" />
              <div className="p-2 text-xs text-hc-muted">{fmtDate(p.date)}</div>
            </button>
          ))}
        </div>
        {!photos.length && <Empty>No photos.</Empty>}
      </section>
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent data-testid="athlete-photo-viewer" className="max-h-[95vh] max-w-3xl overflow-y-auto border-hc-line bg-hc-card p-4">
          <DialogTitle className="hc-title text-xl">{viewing && fmtDate(viewing.date)}</DialogTitle>
          <DialogDescription className="text-hc-muted">{viewing?.note || "No note"}</DialogDescription>
          {viewing && <AuthImage photoId={viewing.id} alt="Full size progress" className="max-h-[75vh] w-full rounded-xl !object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default function OwnerAthletePage() {
  const { userId } = useParams();
  return <OwnerGuard back="/owner" backLabel="All athletes"><Detail userId={userId} /></OwnerGuard>;
}
