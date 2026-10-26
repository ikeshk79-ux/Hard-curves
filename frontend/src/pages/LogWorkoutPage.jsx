import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, Plus, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useApi, useMe, usePlan, useExercises, useRecords, useInvalidate, errMsg } from "../lib/api";
import { displayToKg, fmtLoad, fmtClock, wUnit, todayISO, isValidPastDate } from "../lib/units";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { PageHeader, Empty, Loading } from "../components/Bits";
import { RestTimer, useRestTimer } from "../components/RestTimer";
import { PRCardDialog } from "../components/PRCardDialog";

const DRAFT_KEY = "hc-workout-draft";
const blankSet = (load = "") => ({ load, reps: "", rir: "", done: false });
const NumCell = ({ value, onChange, testId, placeholder }) => (
  <input data-testid={testId} type="number" inputMode="decimal" min="0" value={value} placeholder={placeholder}
    onFocus={(e) => e.target.select()} onChange={(e) => onChange(e.target.value)}
    className="h-12 w-full rounded-lg border border-hc-line bg-hc-bg px-2 text-center font-mono text-lg focus:border-hc-lime focus:outline-none" />
);

const ExerciseBlock = ({ block, bi, ex, best, units, update, remove, onDone }) => {
  const setSet = (si, patch) => update({ ...block, sets: block.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) });
  const toggleDone = (si) => {
    const done = !block.sets[si].done;
    setSet(si, { done });
    if (done) onDone(ex.rest, ex.name);
  };
  return (
    <div data-testid={`log-exercise-${bi}`} className="hc-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="hc-title text-2xl">{ex.name}</div>
          <div className="mt-1 text-xs text-hc-muted">{ex.sets} × {ex.reps} · RIR {ex.rir} · Rest {fmtClock(ex.rest)}{best ? ` · Best ${fmtLoad(best.load, units)} × ${best.reps}` : ""}</div>
        </div>
        <button data-testid={`log-exercise-remove-${bi}`} onClick={remove} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-hc-line text-hc-muted hover:text-red-400" aria-label="Remove exercise"><X className="h-4 w-4" /></button>
      </div>
      <div className="mt-4 grid grid-cols-[28px_1fr_1fr_1fr_52px_32px] items-center gap-2 text-center">
        {["#", `Load ${wUnit(units)}`, "Reps", "RIR", "Done", ""].map((h) => <div key={h} className="text-[10px] font-semibold uppercase tracking-wider text-hc-muted">{h}</div>)}
        {block.sets.map((s, si) => (
          <div key={si} className="contents">
            <div className="font-mono text-sm text-hc-muted">{si + 1}</div>
            <NumCell testId={`set-load-${bi}-${si}`} value={s.load} onChange={(v) => setSet(si, { load: v })} placeholder="0" />
            <NumCell testId={`set-reps-${bi}-${si}`} value={s.reps} onChange={(v) => setSet(si, { reps: v })} placeholder="0" />
            <NumCell testId={`set-rir-${bi}-${si}`} value={s.rir} onChange={(v) => setSet(si, { rir: v })} placeholder="–" />
            <button data-testid={`set-done-${bi}-${si}`} onClick={() => toggleDone(si)} aria-pressed={s.done}
              className={`grid h-12 w-[52px] place-items-center rounded-lg border transition-colors ${s.done ? "border-hc-lime bg-hc-lime text-hc-ink" : "border-hc-line bg-hc-raised text-hc-muted"}`}>
              <Check className="h-5 w-5" strokeWidth={3} />
            </button>
            <button data-testid={`set-remove-${bi}-${si}`} disabled={block.sets.length === 1} onClick={() => update({ ...block, sets: block.sets.filter((_, j) => j !== si) })} className="grid h-8 w-8 place-items-center text-hc-muted hover:text-red-400 disabled:opacity-30" aria-label="Remove set"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
      <button data-testid={`add-set-${bi}`} onClick={() => update({ ...block, sets: [...block.sets, blankSet(block.sets.at(-1)?.load ?? "")] })} className="hc-btn-ghost mt-3 h-11 w-full text-sm"><Plus className="h-4 w-4" />Add set</button>
    </div>
  );
};

const fromDay = (day, exMap) => ({
  name: day.name, date: todayISO(), completed: true, day_id: day.id,
  blocks: day.exercise_ids.filter((id) => exMap[id]).map((id) => ({ exercise_id: id, sets: Array.from({ length: exMap[id].sets }, () => blankSet()) })),
});
const emptyDraft = () => ({ name: "", date: todayISO(), completed: true, day_id: null, blocks: [] });

export default function LogWorkoutPage() {
  const api = useApi();
  const navigate = useNavigate();
  const invalidate = useInvalidate();
  const [params, setParams] = useSearchParams();
  const { data: me } = useMe();
  const { data: plan } = usePlan();
  const { data: exercises } = useExercises();
  const { data: records } = useRecords();
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [prs, setPrs] = useState(null);
  const rest = useRestTimer();
  const exMap = useMemo(() => Object.fromEntries((exercises || []).map((e) => [e.id, e])), [exercises]);
  const bestMap = useMemo(() => Object.fromEntries((records || []).map((r) => [r.exercise_id, r])), [records]);

  useEffect(() => {
    if (!plan || !exercises || draft) return;
    const day = plan.days.find((d) => d.id === params.get("day"));
    const saved = localStorage.getItem(DRAFT_KEY);
    if (day) setDraft(fromDay(day, exMap));
    else if (saved) setDraft(JSON.parse(saved));
    else setDraft(emptyDraft());
  }, [plan, exercises, params, draft, exMap]);

  useEffect(() => { if (draft) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); }, [draft]);

  if (!me || !draft) return <Loading />;
  const units = me.units;
  const patch = (p) => setDraft({ ...draft, ...p });
  const available = exercises.filter((e) => !draft.blocks.some((b) => b.exercise_id === e.id));

  const discard = () => { localStorage.removeItem(DRAFT_KEY); setParams({}); setDraft(emptyDraft()); rest.stop(); };

  const save = async () => {
    if (!draft.name.trim()) return toast.error("Give the session a name");
    const dateErr = isValidPastDate(draft.date);
    if (dateErr) return toast.error(dateErr);
    if (!draft.blocks.length) return toast.error("Add at least one exercise");
    const hasWork = draft.blocks.some((b) => b.sets.some((s) => Number(s.reps) > 0));
    if (!hasWork) return toast.error("Enter reps for at least one set");
    setSaving(true);
    try {
      const body = {
        name: draft.name, date: draft.date, completed: draft.completed, day_id: draft.day_id,
        exercises: draft.blocks.map((b) => ({
          exercise_id: b.exercise_id,
          sets: b.sets.map((s) => ({ load: displayToKg(Number(s.load) || 0, units), reps: Math.round(Number(s.reps) || 0), rir: s.rir === "" ? null : Number(s.rir), done: s.done })),
        })),
      };
      const { data } = await api.post("/workouts", body);
      localStorage.removeItem(DRAFT_KEY);
      rest.stop();
      await invalidate("workouts", "records", "me");
      toast.success("Workout saved");
      if (data.prs.length) setPrs(data.prs);
      else navigate("/");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="hc-rise space-y-6">
      <PageHeader eyebrow="Session" title="Log workout">
        <button data-testid="log-discard-button" onClick={discard} className="hc-btn-ghost h-11 text-sm">Clear</button>
      </PageHeader>

      <div className="hc-card grid gap-4 p-4 sm:grid-cols-[2fr_1fr] sm:p-5">
        <div>
          <label className="hc-label" htmlFor="session-name">Session name</label>
          <input id="session-name" data-testid="session-name-input" className="hc-input mt-2" value={draft.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. Chest & Triceps" />
        </div>
        <div>
          <label className="hc-label" htmlFor="session-date">Date</label>
          <input id="session-date" data-testid="session-date-input" type="date" max={todayISO()} className="hc-input mt-2" value={draft.date} onChange={(e) => patch({ date: e.target.value })} />
        </div>
        {plan.days.length > 0 && (
          <div className="sm:col-span-2">
            <div className="hc-label mb-2">Load a plan day</div>
            <div className="flex flex-wrap gap-2">
              {plan.days.map((d) => (
                <button key={d.id} data-testid={`log-load-day-${d.id}`} data-active={draft.day_id === d.id} onClick={() => setDraft(fromDay(d, exMap))} className="hc-chip">{d.name}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {draft.blocks.map((b, bi) => (
          <ExerciseBlock key={b.exercise_id} block={b} bi={bi} ex={exMap[b.exercise_id]} best={bestMap[b.exercise_id]} units={units}
            update={(nb) => patch({ blocks: draft.blocks.map((x, j) => (j === bi ? nb : x)) })}
            remove={() => patch({ blocks: draft.blocks.filter((_, j) => j !== bi) })}
            onDone={(secs, label) => rest.start(secs, label)} />
        ))}
        {!draft.blocks.length && <Empty testId="log-empty">Pick exercises below or load a plan day.</Empty>}
      </div>

      {available.length > 0 && (
        <Select value="" onValueChange={(id) => patch({ blocks: [...draft.blocks, { exercise_id: id, sets: Array.from({ length: exMap[id].sets }, () => blankSet()) }] })}>
          <SelectTrigger data-testid="add-exercise-select" className="h-12 rounded-xl border-dashed border-hc-line bg-transparent text-base">
            <SelectValue placeholder="+ Add exercise" />
          </SelectTrigger>
          <SelectContent className="border-hc-line bg-hc-card">
            {available.map((e) => <SelectItem key={e.id} value={e.id} data-testid={`add-exercise-option-${e.id}`}>{e.name} · {e.muscle}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      <div className="hc-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <label className="flex items-center gap-3">
          <Switch data-testid="session-completed-switch" checked={draft.completed} onCheckedChange={(v) => patch({ completed: v })} />
          <span className="font-semibold">Mark session completed</span>
        </label>
        <button data-testid="save-workout-button" disabled={saving} onClick={save} className="hc-btn h-14 px-8 text-lg"><Save className="h-5 w-5" />{saving ? "Saving…" : "Save workout"}</button>
      </div>

      <RestTimer timer={rest.timer} adjust={rest.adjust} stop={rest.stop} />
      <PRCardDialog pr={prs?.[0]} extra={prs?.slice(1) || []} open={!!prs} units={units} athlete={me.display_name}
        onOpenChange={(o) => { if (!o) { setPrs(null); navigate("/"); } }} />
    </div>
  );
}
