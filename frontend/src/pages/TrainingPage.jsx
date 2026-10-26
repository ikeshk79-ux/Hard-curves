import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useMe, useExercises, useWorkouts } from "../lib/api";
import { MUSCLE_GROUPS } from "../lib/constants";
import { ProgrammesSection } from "../components/training/ProgrammesSection";
import { fmtDate, fmtVolume, fmtLoadNum, wUnit, fmtClock } from "../lib/units";
import { PageHeader, SectionTitle, Empty, Loading } from "../components/Bits";

const Library = ({ exercises }) => {
  const [group, setGroup] = useState("All");
  const list = group === "All" ? exercises : exercises.filter((e) => e.muscle === group);
  return (
    <div className="space-y-4">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {["All", ...MUSCLE_GROUPS].map((g) => (
          <button key={g} data-testid={`library-filter-${g.toLowerCase().replace(/[^a-z]+/g, "-")}`} data-active={group === g} onClick={() => setGroup(g)} className="hc-chip shrink-0">{g}</button>
        ))}
      </div>
      <div data-testid="exercise-library" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((e) => (
          <div key={e.id} data-testid={`exercise-card-${e.id}`} className="hc-card overflow-hidden">
            <img src={e.image} alt={`Model 5 performing ${e.name}`} loading="lazy" className="aspect-[16/9] w-full object-cover object-top" />
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold leading-tight">{e.name}</div>
                <span className="shrink-0 rounded-md bg-hc-lime/15 px-2 py-0.5 text-[11px] font-bold uppercase text-hc-lime">{e.muscle}</span>
              </div>
              <div className="mt-1 text-xs text-hc-muted">{e.equipment}</div>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center font-mono text-sm">
                {[["Sets", e.sets], ["Reps", e.reps], ["Rest", fmtClock(e.rest)], ["RIR", e.rir]].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-hc-bg py-2"><div className="text-[10px] uppercase text-hc-muted">{k}</div>{v}</div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const HistoryItem = ({ w, units }) => {
  const [open, setOpen] = useState(false);
  return (
    <div data-testid="workout-history-item" className="hc-card">
      <button data-testid="workout-history-toggle" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 p-4 text-left">
        <div>
          <div className="font-semibold">{w.name}</div>
          <div className="text-xs text-hc-muted">{fmtDate(w.date)} · {w.set_count} {w.set_count === 1 ? "set" : "sets"} · {w.completed ? "Completed" : "Not completed"}</div>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-hc-lime">{fmtVolume(w.volume || 0, units)}</span>
          <ChevronDown className={`h-4 w-4 text-hc-muted transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      {open && (
        <div className="space-y-3 border-t border-hc-line p-4">
          {w.exercises.map((ex, i) => (
            <div key={i}>
              <div className="text-sm font-semibold">{ex.name}</div>
              <div className="mt-1 flex flex-wrap gap-2 font-mono text-xs text-hc-muted">
                {ex.sets.map((s, j) => <span key={j} className="rounded bg-hc-bg px-2 py-1">{fmtLoadNum(s.load, units)}{wUnit(units)} × {s.reps}{s.rir != null ? ` @${s.rir}` : ""}</span>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function TrainingPage() {
  const { data: me } = useMe();
  const { data: exercises } = useExercises();
  const { data: workouts } = useWorkouts();
  if (!me || !exercises || !workouts) return <Loading />;
  return (
    <div className="hc-rise space-y-10">
      <PageHeader eyebrow="Your split" title="Training" />
      <ProgrammesSection exercises={exercises} />
      <section><SectionTitle>Exercise library</SectionTitle><Library exercises={exercises} /></section>
      <section>
        <SectionTitle>Workout history</SectionTitle>
        <div data-testid="workout-history" className="space-y-2">
          {workouts.map((w) => <HistoryItem key={w.id} w={w} units={me.units} />)}
          {!workouts.length && <Empty testId="workout-history-empty">No workouts logged yet.</Empty>}
        </div>
      </section>
    </div>
  );
}
