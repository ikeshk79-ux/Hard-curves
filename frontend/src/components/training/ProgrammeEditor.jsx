import { useEffect, useMemo, useState } from "react";
import { Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { useApi, useInvalidate, errMsg } from "../../lib/api";
import { WEEKDAYS } from "../../lib/constants";
import { DayCard } from "./DayCard";
import { PriorityGrid } from "./PriorityGrid";

const rid = () => `day-${Math.random().toString(36).slice(2, 10)}`;
const snapshot = (p) => JSON.stringify({ name: p.name, schedule: p.schedule, priorities: p.priorities || {}, days: p.days });

const WeekStrip = ({ days }) => (
  <div data-testid="week-strip" className="grid grid-cols-7 gap-1.5">
    {WEEKDAYS.map((w, i) => {
      const d = days.filter((x) => x.weekday === i);
      const rest = d.length > 0 && d.every((x) => x.type === "rest");
      return (
        <div key={w} className={`rounded-lg border p-1.5 text-center ${d.length && !rest ? "border-hc-lime/50 bg-hc-lime/10" : "border-hc-line"}`}>
          <div className="text-[10px] font-semibold uppercase text-hc-muted">{w}</div>
          <div className="mt-0.5 truncate text-[11px]">{d.length ? d.map((x) => (x.type === "rest" ? "Rest" : x.name)).join(", ") : "—"}</div>
        </div>
      );
    })}
  </div>
);

export const ProgrammeEditor = ({ programme, exercises, onDirty }) => {
  const api = useApi();
  const invalidate = useInvalidate();
  const [p, setP] = useState(programme);
  const [saving, setSaving] = useState(false);
  useEffect(() => setP(programme), [programme]);
  const dirty = snapshot(p) !== snapshot(programme);
  useEffect(() => onDirty(dirty), [dirty, onDirty]);
  const exMap = useMemo(() => Object.fromEntries(exercises.map((e) => [e.id, e])), [exercises]);

  const setDay = (i, d) => setP({ ...p, days: p.days.map((x, j) => (j === i ? d : x)) });
  const move = (i, dir) => {
    const days = [...p.days];
    [days[i], days[i + dir]] = [days[i + dir], days[i]];
    setP({ ...p, days });
  };
  const duplicate = (i) => {
    const days = [...p.days];
    days.splice(i + 1, 0, { ...p.days[i], id: rid(), name: `${p.days[i].name} (copy)`.slice(0, 60) });
    setP({ ...p, days });
  };

  const save = async () => {
    if (!p.name.trim() || p.days.some((d) => !d.name.trim())) return toast.error("Programme and day names can't be empty");
    setSaving(true);
    try {
      await api.put(`/programmes/${p.id}`, { name: p.name, schedule: p.schedule, priorities: p.priorities || {}, days: p.days });
      await invalidate("programmes", "plan", "me");
      toast.success("Programme saved");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-testid="programme-editor" className="hc-card space-y-6 p-4 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div>
          <label className="hc-label" htmlFor="programme-name">Programme name</label>
          <input id="programme-name" data-testid="programme-name-input" maxLength={60} className="hc-input mt-2 font-display text-xl font-bold uppercase" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
        </div>
        <div>
          <div className="hc-label mb-2">Schedule</div>
          <div className="grid grid-cols-2 gap-2">
            {[["rotation", "Rotating"], ["weekly", "Weekdays"]].map(([s, l]) => (
              <button key={s} type="button" data-testid={`schedule-${s}`} data-active={p.schedule === s} onClick={() => setP({ ...p, schedule: s })} className="hc-chip h-12 justify-center rounded-xl">{l}</button>
            ))}
          </div>
        </div>
      </div>
      <p className="text-sm text-hc-muted">{p.schedule === "weekly" ? "Pick a weekday for each day. Up next follows today's weekday." : "Days repeat in order. Up next is the day after your last completed session; rest days are skipped."}</p>
      {p.schedule === "weekly" && <WeekStrip days={p.days} />}

      <div className="space-y-3">
        {p.days.map((d, i) => (
          <DayCard key={d.id} day={d} index={i} total={p.days.length} exercises={exercises} exMap={exMap} schedule={p.schedule}
            onChange={(nd) => setDay(i, nd)} onMove={(dir) => move(i, dir)} onDuplicate={() => duplicate(i)}
            onDelete={() => setP({ ...p, days: p.days.filter((_, j) => j !== i) })} />
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <button data-testid="programme-add-day" onClick={() => setP({ ...p, days: [...p.days, { id: rid(), name: `Day ${p.days.length + 1}`, type: "training", muscle_groups: [], exercise_ids: [], weekday: null }] })} className="hc-btn-ghost"><Plus className="h-4 w-4" />Add training day</button>
        <button data-testid="programme-add-rest-day" onClick={() => setP({ ...p, days: [...p.days, { id: rid(), name: "Rest & recovery", type: "rest", muscle_groups: [], exercise_ids: [], weekday: null }] })} className="hc-btn-ghost">Add rest day</button>
      </div>

      <div>
        <div className="hc-title mb-1 text-xl">Muscle priorities</div>
        <p className="mb-3 text-sm text-hc-muted">Tap again to clear. Frequency counts how many training days hit each group.</p>
        <PriorityGrid priorities={p.priorities || {}} days={p.days} onChange={(priorities) => setP({ ...p, priorities })} />
      </div>

      <div className={`${dirty ? "sticky bottom-20 z-30 lg:bottom-4" : ""} flex items-center gap-3 rounded-2xl border border-hc-line bg-hc-card/95 p-3 backdrop-blur-md`}>
        <span data-testid="programme-dirty-state" className="flex-1 text-sm text-hc-muted">{dirty ? "Unsaved changes" : "All changes saved"}</span>
        {dirty && <button data-testid="programme-discard" onClick={() => setP(programme)} className="hc-btn-ghost h-11 text-sm">Discard</button>}
        <button data-testid="programme-save-button" disabled={saving || !dirty} onClick={save} className="hc-btn h-11"><Save className="h-4 w-4" />{saving ? "Saving…" : "Save"}</button>
      </div>
    </div>
  );
};
