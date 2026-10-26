import { useState } from "react";
import { Target, Trash2, Plus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useApi, useGoals, useInvalidate, errMsg } from "../lib/api";
import { BODY_PARTS, partLabel, defaultSide, sidesFor } from "../lib/constants";
import { displayToCm, fmtLen, lenUnit, fmtDate } from "../lib/units";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { SectionTitle, Empty } from "./Bits";
import { ConfirmAction } from "./ConfirmAction";

const Pick = ({ value, onChange, options, testId, format = (o) => o }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger data-testid={testId} className="h-12 rounded-xl border-hc-line bg-hc-bg text-base"><SelectValue /></SelectTrigger>
    <SelectContent className="border-hc-line bg-hc-card">
      {options.map((o) => <SelectItem key={o} value={o} data-testid={`${testId}-option-${o.toLowerCase()}`}>{format(o)}</SelectItem>)}
    </SelectContent>
  </Select>
);

const Pair = ({ value, onChange, a, b, testId }) => (
  <div className="grid grid-cols-2 gap-2">
    <button type="button" data-testid={`${testId}-on`} data-active={value} onClick={() => onChange(true)} className="hc-chip h-12 justify-center rounded-xl">{a}</button>
    <button type="button" data-testid={`${testId}-off`} data-active={!value} onClick={() => onChange(false)} className="hc-chip h-12 justify-center rounded-xl">{b}</button>
  </div>
);

const GoalForm = ({ units, onDone }) => {
  const api = useApi();
  const invalidate = useInvalidate();
  const [f, setF] = useState({ body_part: "Arms", side: "Right", flexed: true, pumped: false, target: "" });
  const [busy, setBusy] = useState(false);
  const set = (p) => setF({ ...f, ...p });

  const submit = async (e) => {
    e.preventDefault();
    const t = Number(f.target);
    if (!(t > 0)) return toast.error("Enter a target above zero");
    setBusy(true);
    try {
      await api.post("/goals", { body_part: f.body_part, side: f.side, flexed: f.flexed, pumped: f.pumped, target_cm: displayToCm(t, units) });
      await invalidate("goals", "me");
      toast.success("Goal saved");
      onDone();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form data-testid="goal-form" onSubmit={submit} className="hc-card grid gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-5">
      <div><div className="hc-label mb-2">Body part</div><Pick value={f.body_part} onChange={(v) => set({ body_part: v, side: defaultSide(v) })} options={BODY_PARTS} format={partLabel} testId="goal-body-part" /></div>
      <div><div className="hc-label mb-2">Side</div><Pick value={f.side} onChange={(v) => set({ side: v })} options={sidesFor(f.body_part)} testId="goal-side" /></div>
      <div><div className="hc-label mb-2">State</div><Pair value={f.flexed} onChange={(v) => set({ flexed: v })} a="Flexed" b="Unflexed" testId="goal-flexed" /></div>
      <div><div className="hc-label mb-2">Pumped</div><Pair value={f.pumped} onChange={(v) => set({ pumped: v })} a="Yes" b="No" testId="goal-pumped" /></div>
      <div><label htmlFor="goal-target" className="hc-label mb-2 block">Target ({lenUnit(units)})</label>
      <input id="goal-target" data-testid="goal-target-input" type="number" inputMode="decimal" step="0.1" min="0" className="hc-input font-mono" value={f.target}
        onChange={(e) => set({ target: e.target.value })} placeholder="0.0" /></div>
      <button data-testid="goal-save-button" disabled={busy} className="hc-btn sm:col-span-2 lg:col-span-5">{busy ? "Saving…" : "Save goal"}</button>
    </form>
  );
};

const GoalCard = ({ g, units, onDelete }) => {
  const left = g.current_cm != null ? g.target_cm - g.current_cm : null;
  return (
    <div data-testid={`goal-card-${g.id}`} className={`hc-card p-4 sm:p-5 ${g.reached ? "border-hc-lime" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="hc-title text-xl">{partLabel(g.body_part)} · {g.side}</div>
          <div className="text-xs text-hc-muted">{g.flexed ? "Flexed" : "Unflexed"} · {g.pumped ? "Pumped" : "Not pumped"} · {g.entries} matching {g.entries === 1 ? "entry" : "entries"}</div>
        </div>
        <ConfirmAction testId="goal-delete" title="Delete goal?" description="Your measurements stay; only the goal is removed." onConfirm={onDelete}
          trigger={<button data-testid="goal-delete-button" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-hc-line text-hc-muted hover:text-red-400" aria-label="Delete goal"><Trash2 className="h-4 w-4" /></button>} />
      </div>
      <div className="mt-4 flex items-end justify-between font-mono">
        <div><div className="text-[10px] uppercase text-hc-muted">Now</div><span data-testid="goal-current" className="text-2xl font-bold">{g.current_cm != null ? fmtLen(g.current_cm, units) : "—"}</span></div>
        <div className="text-right"><div className="text-[10px] uppercase text-hc-muted">Target</div><span data-testid="goal-target" className="text-2xl font-bold text-hc-lime">{fmtLen(g.target_cm, units)}</span></div>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-hc-bg">
        <div data-testid="goal-progress-bar" className="h-full rounded-full bg-hc-lime transition-[width] duration-700" style={{ width: `${g.reached ? 100 : g.percent}%` }} />
      </div>
      <div data-testid="goal-status" className="mt-2 flex items-center gap-1.5 text-sm text-hc-muted">
        {g.reached ? <><CheckCircle2 className="h-4 w-4 text-hc-lime" /><span className="text-hc-lime">Goal reached</span></>
          : g.current_cm == null ? "Log a matching measurement to start tracking"
          : `${Math.round(g.percent)}% · ${fmtLen(Math.abs(left), units)} to go · last ${fmtDate(g.current_date)}`}
      </div>
    </div>
  );
};

export const GoalsSection = ({ units }) => {
  const api = useApi();
  const invalidate = useInvalidate();
  const { data: goals } = useGoals();
  const [adding, setAdding] = useState(false);

  const remove = async (id) => {
    try {
      await api.delete(`/goals/${id}`);
      await invalidate("goals");
      toast.success("Goal deleted");
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <section>
      <SectionTitle action={
        <button data-testid="goal-add-toggle" onClick={() => setAdding(!adding)} className="hc-btn-ghost h-11 px-4 text-sm">
          {adding ? "Cancel" : <><Plus className="h-4 w-4" />Add goal</>}
        </button>
      }><span className="inline-flex items-center gap-2"><Target className="h-5 w-5 text-hc-lime" />Size goals</span></SectionTitle>
      {adding && <div className="mb-4"><GoalForm units={units} onDone={() => setAdding(false)} /></div>}
      <div data-testid="goals-list" className="grid gap-3 sm:grid-cols-2">
        {(goals || []).map((g) => <GoalCard key={g.id} g={g} units={units} onDelete={() => remove(g.id)} />)}
      </div>
      {goals && !goals.length && !adding && <Empty testId="goals-empty">Set a target arm or thigh size. Progress uses only measurements with the same side, flexed and pumped state, starting from your latest matching entry.</Empty>}
    </section>
  );
};
