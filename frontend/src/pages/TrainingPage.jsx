import { useEffect, useState } from "react";
import { Plus, Trash2, Save, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useApi, useMe, usePlan, useExercises, useWorkouts, useInvalidate, errMsg } from "../lib/api";
import { fmtDate, fmtVolume, fmtLoadNum, wUnit, fmtClock } from "../lib/units";
import { PageHeader, SectionTitle, Empty, Loading } from "../components/Bits";

const DayEditor = ({ day, index, exercises, onChange, onRemove }) => {
  const toggle = (id) => onChange({ ...day, exercise_ids: day.exercise_ids.includes(id) ? day.exercise_ids.filter((x) => x !== id) : [...day.exercise_ids, id] });
  return (
    <div data-testid={`plan-day-${index}`} className="rounded-xl border border-hc-line bg-hc-bg p-4">
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm text-hc-lime">D{index + 1}</span>
        <input data-testid={`plan-day-name-input-${index}`} className="hc-input h-11 flex-1" value={day.name} onChange={(e) => onChange({ ...day, name: e.target.value })} placeholder="Day name" />
        <button data-testid={`plan-day-remove-${index}`} onClick={onRemove} className="grid h-11 w-11 place-items-center rounded-xl border border-hc-line text-hc-muted hover:text-red-400" aria-label="Remove day"><Trash2 className="h-4 w-4" /></button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {exercises.map((e) => (
          <button key={e.id} data-testid={`plan-day-${index}-ex-${e.id}`} data-active={day.exercise_ids.includes(e.id)} onClick={() => toggle(e.id)} className="hc-chip h-8 px-3 text-xs">{e.name}</button>
        ))}
      </div>
    </div>
  );
};

const PlanEditor = ({ plan, exercises }) => {
  const api = useApi();
  const invalidate = useInvalidate();
  const [name, setName] = useState(plan.name);
  const [days, setDays] = useState(plan.days);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setName(plan.name); setDays(plan.days); }, [plan]);

  const save = async () => {
    if (!name.trim() || days.some((d) => !d.name.trim())) return toast.error("Plan and day names can't be empty");
    if (!days.length) return toast.error("Keep at least one training day");
    setSaving(true);
    try {
      await api.put("/plan", { name, days });
      await invalidate("plan", "me");
      toast.success("Plan saved");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-testid="plan-editor" className="hc-card p-4 sm:p-6">
      <label className="hc-label" htmlFor="plan-name">Plan name</label>
      <input id="plan-name" data-testid="plan-name-input" className="hc-input mt-2 font-display text-xl font-bold uppercase" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="mt-5 space-y-3">
        {days.map((d, i) => (
          <DayEditor key={d.id || i} day={d} index={i} exercises={exercises}
            onChange={(nd) => setDays(days.map((x, j) => (j === i ? nd : x)))}
            onRemove={() => setDays(days.filter((_, j) => j !== i))} />
        ))}
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button data-testid="plan-add-day-button" onClick={() => setDays([...days, { id: `day-${Math.random().toString(36).slice(2, 10)}`, name: `Day ${days.length + 1}`, exercise_ids: [] }])} className="hc-btn-ghost"><Plus className="h-4 w-4" />Add day</button>
        <button data-testid="plan-save-button" disabled={saving} onClick={save} className="hc-btn sm:ml-auto"><Save className="h-4 w-4" />{saving ? "Saving…" : "Save plan"}</button>
      </div>
    </div>
  );
};

const Library = ({ exercises }) => (
  <div data-testid="exercise-library" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {exercises.map((e) => (
      <div key={e.id} data-testid={`exercise-card-${e.id}`} className="hc-card p-4">
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
    ))}
  </div>
);

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
  const { data: plan } = usePlan();
  const { data: exercises } = useExercises();
  const { data: workouts } = useWorkouts();
  if (!me || !plan || !exercises || !workouts) return <Loading />;
  return (
    <div className="hc-rise space-y-10">
      <PageHeader eyebrow="Your split" title="Training" />
      <section><SectionTitle>Plan & training days</SectionTitle><PlanEditor plan={plan} exercises={exercises} /></section>
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
