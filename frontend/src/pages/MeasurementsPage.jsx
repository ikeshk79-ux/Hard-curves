import { useState } from "react";
import { Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { useApi, useMe, useMeasurements, useInvalidate, errMsg } from "../lib/api";
import { displayToCm, fmtLen, lenUnit, fmtDate, todayISO, isValidPastDate } from "../lib/units";
import { BODY_PARTS, CONDITIONS, FULL_SET, partLabel, defaultSide, sidesFor } from "../lib/constants";
import { MeasurementSetForm, keyOf } from "../components/MeasurementSetForm";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { PageHeader, SectionTitle, Empty, Loading } from "../components/Bits";
import { ConfirmAction } from "../components/ConfirmAction";

const Pick = ({ label, value, onChange, options, testId, format = (o) => o }) => (
  <div>
    <div className="hc-label mb-2">{label}</div>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger data-testid={testId} className="h-12 rounded-xl border-hc-line bg-hc-bg text-base"><SelectValue /></SelectTrigger>
      <SelectContent className="border-hc-line bg-hc-card">
        {options.map((o) => <SelectItem key={o} value={o} data-testid={`${testId}-option-${o.toLowerCase()}`}>{format(o)}</SelectItem>)}
      </SelectContent>
    </Select>
  </div>
);

const Toggle2 = ({ label, value, onChange, a, b, testId }) => (
  <div>
    <div className="hc-label mb-2">{label}</div>
    <div className="grid grid-cols-2 gap-2">
      <button type="button" data-testid={`${testId}-on`} data-active={value} onClick={() => onChange(true)} className="hc-chip h-12 justify-center rounded-xl">{a}</button>
      <button type="button" data-testid={`${testId}-off`} data-active={!value} onClick={() => onChange(false)} className="hc-chip h-12 justify-center rounded-xl">{b}</button>
    </div>
  </div>
);

const initial = () => ({ body_part: "Arms", side: "Right", value: "", date: todayISO(), flexed: true, pumped: false, notes: "" });

const MeasurementForm = ({ units }) => {
  const api = useApi();
  const invalidate = useInvalidate();
  const [f, setF] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = (p) => setF({ ...f, ...p });

  const submit = async (e) => {
    e.preventDefault();
    const v = Number(f.value);
    if (!(v > 0)) return toast.error("Enter a measurement above zero");
    const dateErr = isValidPastDate(f.date);
    if (dateErr) return toast.error(dateErr);
    setSaving(true);
    try {
      await api.post("/measurements", { body_part: f.body_part, side: f.side, value_cm: displayToCm(v, units), date: f.date, flexed: f.flexed, pumped: f.pumped, notes: f.notes });
      await invalidate("measurements", "me", "goals");
      toast.success("Measurement saved");
      setF({ ...initial(), body_part: f.body_part, side: f.side, flexed: f.flexed, pumped: f.pumped });
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form data-testid="measurement-form" onSubmit={submit} className="hc-card grid gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
      <Pick label="Body part" value={f.body_part} onChange={(v) => set({ body_part: v, side: defaultSide(v) })} options={BODY_PARTS} format={partLabel} testId="measurement-body-part" />
      <Pick label="Side" value={f.side} onChange={(v) => set({ side: v })} options={sidesFor(f.body_part)} testId="measurement-side" />
      <div>
        <label className="hc-label mb-2 block" htmlFor="m-value">Value ({lenUnit(units)})</label>
        <input id="m-value" data-testid="measurement-value-input" type="number" inputMode="decimal" step="0.1" min="0" className="hc-input font-mono text-lg" value={f.value} onChange={(e) => set({ value: e.target.value })} placeholder="0.0" />
      </div>
      <div>
        <label className="hc-label mb-2 block" htmlFor="m-date">Date</label>
        <input id="m-date" data-testid="measurement-date-input" type="date" max={todayISO()} className="hc-input" value={f.date} onChange={(e) => set({ date: e.target.value })} />
      </div>
      <Toggle2 label="State" value={f.flexed} onChange={(v) => set({ flexed: v })} a="Flexed" b="Unflexed" testId="measurement-flexed" />
      <Toggle2 label="Pumped" value={f.pumped} onChange={(v) => set({ pumped: v })} a="Yes" b="No" testId="measurement-pumped" />
      <div className="sm:col-span-2">
        <label className="hc-label mb-2 block" htmlFor="m-notes">Notes</label>
        <input id="m-notes" data-testid="measurement-notes-input" className="hc-input" maxLength={500} value={f.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Optional — e.g. morning, after cardio" />
      </div>
      <button data-testid="measurement-save-button" disabled={saving} className="hc-btn sm:col-span-2 lg:col-span-4"><Save className="h-4 w-4" />{saving ? "Saving…" : "Save measurement"}</button>
    </form>
  );
};

const FullSetCard = ({ units }) => {
  const api = useApi();
  const invalidate = useInvalidate();
  const [condition, setCondition] = useState("fu");
  const [values, setValues] = useState({});
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const filled = FULL_SET.filter((e) => values[keyOf(e)] !== undefined && values[keyOf(e)] !== "");
    if (!filled.length) return toast.error("Fill in at least one measurement");
    if (filled.some((e) => !(Number(values[keyOf(e)]) > 0))) return toast.error("Measurements must be above zero");
    const dateErr = isValidPastDate(date);
    if (dateErr) return toast.error(dateErr);
    const c = CONDITIONS.find((x) => x.id === condition);
    setSaving(true);
    try {
      await api.post("/measurements/bulk", { date, flexed: c.flexed, pumped: c.pumped, entries: filled.map((e) => ({ ...e, value_cm: displayToCm(Number(values[keyOf(e)]), units) })) });
      await invalidate("measurements", "me", "goals");
      toast.success(`${filled.length} measurements saved`);
      setValues({});
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-testid="measurement-full-set" className="hc-card space-y-4 p-4 sm:p-6">
      <div className="max-w-xs">
        <label className="hc-label mb-2 block" htmlFor="fs-date">Date</label>
        <input id="fs-date" data-testid="full-set-date-input" type="date" max={todayISO()} className="hc-input" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <MeasurementSetForm units={units} condition={condition} onCondition={setCondition} values={values} onValues={setValues} />
      <button data-testid="full-set-save-button" disabled={saving} onClick={save} className="hc-btn w-full">{saving ? "Saving…" : "Save full set"}</button>
    </div>
  );
};

export default function MeasurementsPage() {
  const api = useApi();
  const invalidate = useInvalidate();
  const { data: me } = useMe();
  const { data: list } = useMeasurements();
  const [filter, setFilter] = useState("All");
  const [mode, setMode] = useState("single");
  if (!me || !list) return <Loading />;
  const rows = filter === "All" ? list : list.filter((m) => m.body_part === filter);

  const remove = async (id) => {
    try {
      await api.delete(`/measurements/${id}`);
      await invalidate("measurements", "me", "goals");
      toast.success("Measurement deleted");
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <div className="hc-rise space-y-8">
      <PageHeader eyebrow="Tape don't lie" title="Measurements" />
      <div className="flex gap-2">
        {[["single", "Single entry"], ["full", "Full set"]].map(([m, l]) => (
          <button key={m} data-testid={`measurement-mode-${m}`} data-active={mode === m} onClick={() => setMode(m)} className="hc-chip">{l}</button>
        ))}
      </div>
      {mode === "single" ? <MeasurementForm units={me.units} /> : <FullSetCard units={me.units} />}
      <section>
        <SectionTitle>History</SectionTitle>
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {["All", ...BODY_PARTS].map((p) => (
            <button key={p} data-testid={`measurement-filter-${p.toLowerCase()}`} data-active={filter === p} onClick={() => setFilter(p)} className="hc-chip shrink-0">{partLabel(p)}</button>
          ))}
        </div>
        <div data-testid="measurement-history" className="space-y-2">
          {rows.map((m) => (
            <div key={m.id} data-testid="measurement-history-item" className="hc-card flex items-center gap-4 p-4">
              <div className="w-24 shrink-0 font-mono text-xl font-bold text-hc-lime">{fmtLen(m.value_cm, me.units)}</div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{partLabel(m.body_part)} · <span className="text-hc-muted">{m.side}</span></div>
                <div className="text-xs text-hc-muted">{fmtDate(m.date)} · {m.flexed ? "Flexed" : "Unflexed"} · {m.pumped ? "Pumped" : "Not pumped"}</div>
                {m.notes && <div className="mt-1 truncate text-sm text-hc-muted">{m.notes}</div>}
              </div>
              <ConfirmAction testId="measurement-delete" title="Delete measurement?" description="This entry will be removed from your history and charts."
                onConfirm={() => remove(m.id)}
                trigger={<button data-testid="measurement-delete-button" className="grid h-11 w-11 place-items-center rounded-xl border border-hc-line text-hc-muted hover:text-red-400" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>} />
            </div>
          ))}
          {!rows.length && <Empty testId="measurement-history-empty">No measurements{filter !== "All" ? ` for ${filter}` : ""} yet.</Empty>}
        </div>
      </section>
    </div>
  );
}
