import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Ruler, Scale, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useApi, useInvalidate, errMsg } from "../lib/api";
import { displayToKg, fmtDate, fmtHeight, fmtLoad, todayISO, isValidPastDate, wUnit } from "../lib/units";
import { HeightInput, heightError } from "./HeightInput";
import { ModelPicker } from "./ModelPicker";

const HeightCard = ({ me }) => {
  const api = useApi();
  const invalidate = useInvalidate();
  const [cm, setCm] = useState(me.height_cm ?? null);
  const [unit, setUnit] = useState(me.height_unit);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setCm(me.height_cm ?? null); setUnit(me.height_unit); }, [me.height_cm, me.height_unit]);

  const save = async () => {
    if (heightError(cm)) return toast.error(heightError(cm));
    setBusy(true);
    try {
      await api.patch("/me", { height_cm: Math.round(cm * 10) / 10, height_unit: unit });
      await invalidate("me");
      toast.success("Height saved");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="height-card" className="hc-card space-y-3 p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Ruler className="h-4 w-4 text-hc-lime" /><span className="font-semibold">Height</span></div>
        <span data-testid="height-saved-value" className="font-mono text-sm text-hc-muted">{fmtHeight(me.height_cm, me.height_unit)}</span>
      </div>
      <HeightInput cm={cm} unit={unit} onChange={setCm} onUnit={setUnit} showError />
      <button data-testid="height-save-button" disabled={busy} onClick={save} className="hc-btn w-full">{busy ? "Saving…" : "Save height"}</button>
    </div>
  );
};

const WeightCard = ({ me }) => {
  const api = useApi();
  const invalidate = useInvalidate();
  const { data: weights } = useQuery({ queryKey: ["body-weights"], queryFn: () => api.get("/body-weights").then((r) => r.data) });
  const [val, setVal] = useState("");
  const [date, setDate] = useState(todayISO());
  const units = me.units;

  const add = async () => {
    const kg = displayToKg(Number(val), units);
    if (!(kg >= 25 && kg <= 350)) return toast.error(`Enter a weight between ${units === "imperial" ? "55 and 770 lb" : "25 and 350 kg"}`);
    const dErr = isValidPastDate(date);
    if (dErr) return toast.error(dErr);
    try {
      await api.post("/body-weights", { weight_kg: kg, date });
      setVal("");
      await invalidate("body-weights", "me");
      toast.success("Weight logged");
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const remove = async (id) => {
    try {
      await api.delete(`/body-weights/${id}`);
      await invalidate("body-weights");
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <div data-testid="weight-card" className="hc-card space-y-3 p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Scale className="h-4 w-4 text-hc-lime" /><span className="font-semibold">Body weight</span></div>
        <span data-testid="weight-latest" className="font-mono text-sm text-hc-muted">{weights?.[0] ? fmtLoad(weights[0].weight_kg, units) : "—"}</span>
      </div>
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
        <div className="relative">
          <input data-testid="weight-input" type="number" inputMode="decimal" step="0.1" min="0" className="hc-input pr-10 font-mono" value={val} onChange={(e) => setVal(e.target.value)} placeholder="0.0" aria-label="Body weight" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-hc-muted">{wUnit(units)}</span>
        </div>
        <input data-testid="weight-date-input" type="date" max={todayISO()} className="hc-input" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Weight date" />
        <button data-testid="weight-add-button" onClick={add} className="hc-btn px-4">Log</button>
      </div>
      <div data-testid="weight-history" className="max-h-48 divide-y divide-hc-line overflow-y-auto">
        {(weights || []).map((w) => (
          <div key={w.id} data-testid="weight-history-item" className="flex items-center justify-between py-2 text-sm">
            <span className="text-hc-muted">{fmtDate(w.date)}</span>
            <span className="flex items-center gap-3 font-mono">{fmtLoad(w.weight_kg, units)}
              <button data-testid="weight-delete-button" onClick={() => remove(w.id)} className="text-hc-muted hover:text-red-400" aria-label="Delete weight"><Trash2 className="h-4 w-4" /></button>
            </span>
          </div>
        ))}
        {weights && !weights.length && <div className="py-2 text-sm text-hc-muted">No weight logged yet.</div>}
      </div>
    </div>
  );
};

export const PhysiqueSection = ({ me }) => {
  const api = useApi();
  const invalidate = useInvalidate();
  const pickModel = async (model) => {
    try {
      await api.patch("/me", { model });
      await invalidate("me");
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2"><HeightCard me={me} /><WeightCard me={me} /></div>
      <div className="hc-card p-4 sm:p-5">
        <div className="mb-3 font-semibold">Anatomical model</div>
        <div className="max-w-md"><ModelPicker value={me.model} onChange={pickModel} /></div>
      </div>
    </div>
  );
};
