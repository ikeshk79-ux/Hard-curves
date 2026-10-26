import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useApi, useMe, errMsg } from "../lib/api";
import { displayToCm, displayToKg, fmtHeight, todayISO, wUnit } from "../lib/units";
import { CONDITIONS, FULL_SET, partLabel } from "../lib/constants";
import { Brand } from "../components/Brand";
import { Loading } from "../components/Bits";
import { HeightInput, heightError } from "../components/HeightInput";
import { MeasurementSetForm, keyOf } from "../components/MeasurementSetForm";
import { ModelPicker } from "../components/ModelPicker";

const STEPS = ["Height", "Units", "Body weight", "Measurements", "Model", "Review"];

const Step = ({ title, hint, children }) => (
  <div className="space-y-5">
    <div>
      <h1 data-testid="onboarding-step-title" className="hc-title text-4xl leading-none sm:text-5xl">{title}</h1>
      {hint && <p className="mt-2 text-hc-muted">{hint}</p>}
    </div>
    {children}
  </div>
);

const Row = ({ k, v }) => (
  <div className="flex justify-between gap-3 border-b border-hc-line py-2.5 text-sm last:border-0">
    <span className="text-hc-muted">{k}</span><span className="text-right font-mono">{v}</span>
  </div>
);

export default function OnboardingPage() {
  const api = useApi();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: me } = useMe();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ height_cm: null, height_unit: "cm", units: "metric", weight: "", model: "model5", condition: "fu", values: {}, skipMeasure: false });
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => { if (me) setF((x) => ({ ...x, height_cm: me.height_cm ?? null, height_unit: me.height_unit, units: me.units, model: me.model })); }, [me]);

  if (!me) return <Loading />;
  if (me.onboarding_completed && !done) return <Navigate to="/" replace />;
  const set = (p) => setF({ ...f, ...p });
  const entries = FULL_SET.filter((e) => Number(f.values[keyOf(e)]) > 0);
  const badMeasure = FULL_SET.some((e) => f.values[keyOf(e)] !== undefined && f.values[keyOf(e)] !== "" && !(Number(f.values[keyOf(e)]) > 0));
  const weightNum = Number(f.weight);
  const weightKg = f.weight === "" ? null : displayToKg(weightNum, f.units);

  const next = () => {
    if (step === 0) { setTouched(true); if (heightError(f.height_cm)) return; }
    if (step === 2 && f.weight !== "" && !(weightKg >= 25 && weightKg <= 350)) return toast.error(`Enter a weight between ${f.units === "imperial" ? "55 and 770 lb" : "25 and 350 kg"}, or leave it empty`);
    if (step === 3 && badMeasure) return toast.error("Measurements must be above zero, or leave them empty");
    setStep(step + 1);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (weightKg) await api.post("/body-weights", { weight_kg: weightKg, date: todayISO() });
      if (!f.skipMeasure && entries.length) {
        const c = CONDITIONS.find((x) => x.id === f.condition);
        await api.post("/measurements/bulk", { date: todayISO(), flexed: c.flexed, pumped: c.pumped, entries: entries.map((e) => ({ ...e, value_cm: displayToCm(Number(f.values[keyOf(e)]), f.units) })) });
      }
      await api.patch("/me", { height_cm: Math.round(f.height_cm * 10) / 10, height_unit: f.height_unit, units: f.units, model: f.model, onboarding_completed: true });
      setDone(true);
      await qc.invalidateQueries();
    } catch (e) {
      toast.error(errMsg(e, "Could not save your profile"));
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <Shell>
        <div data-testid="onboarding-done" className="space-y-6 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-hc-lime text-hc-ink"><Check className="h-8 w-8" strokeWidth={3} /></span>
          <h1 className="hc-title text-5xl">You're set up</h1>
          <p className="text-hc-muted">Your physique profile is saved. You can change any of it later in Profile.</p>
          <button data-testid="onboarding-continue-button" onClick={() => navigate("/", { replace: true })} className="hc-btn h-14 w-full text-lg">Continue to Hard Curves</button>
        </div>
      </Shell>
    );
  }

  const c = CONDITIONS.find((x) => x.id === f.condition);
  return (
    <Shell step={step}>
      {step === 0 && <Step title="Your height" hint="Stored in centimetres; shown the way you prefer."><HeightInput cm={f.height_cm} unit={f.height_unit} onChange={(v) => set({ height_cm: v })} onUnit={(u) => set({ height_unit: u })} showError={touched} /></Step>}
      {step === 1 && (
        <Step title="Preferred units" hint="Used for measurements, body weight and lifts.">
          <div className="grid gap-3">
            {[["metric", "Metric", "Centimetres and kilograms"], ["imperial", "Imperial", "Inches and pounds"]].map(([u, t, d]) => (
              <button key={u} data-testid={`onboarding-units-${u}`} data-active={f.units === u} onClick={() => set({ units: u })}
                className={`hc-card flex items-center justify-between p-5 text-left transition-colors ${f.units === u ? "border-hc-lime" : ""}`}>
                <div><div className="hc-title text-2xl">{t}</div><div className="text-sm text-hc-muted">{d}</div></div>
                <span className={`grid h-7 w-7 place-items-center rounded-full border-2 ${f.units === u ? "border-hc-lime bg-hc-lime text-hc-ink" : "border-hc-line"}`}>{f.units === u && <Check className="h-4 w-4" strokeWidth={3} />}</span>
              </button>
            ))}
          </div>
        </Step>
      )}
      {step === 2 && (
        <Step title="Body weight" hint="Optional. You can log it over time in Profile.">
          <div className="relative">
            <input data-testid="onboarding-weight-input" type="number" inputMode="decimal" step="0.1" min="0" placeholder={f.units === "imperial" ? "150" : "68"}
              className="hc-input h-14 pr-14 font-mono text-2xl" value={f.weight} onChange={(e) => set({ weight: e.target.value })} aria-label="Body weight" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-hc-muted">{wUnit(f.units)}</span>
          </div>
        </Step>
      )}
      {step === 3 && (
        <Step title="Measurements" hint="Optional. Fill in any you have today, or add them later.">
          <MeasurementSetForm units={f.units} condition={f.condition} onCondition={(v) => set({ condition: v })} values={f.values} onValues={(v) => set({ values: v, skipMeasure: false })} />
        </Step>
      )}
      {step === 4 && <Step title="Anatomical model" hint="Used for muscle selection and measurement visuals."><ModelPicker value={f.model} onChange={(m) => set({ model: m })} /></Step>}
      {step === 5 && (
        <Step title="Review & save">
          <div data-testid="onboarding-review" className="hc-card px-4 py-2">
            <Row k="Height" v={fmtHeight(f.height_cm, f.height_unit)} />
            <Row k="Units" v={f.units === "metric" ? "cm / kg" : "in / lb"} />
            <Row k="Body weight" v={f.weight ? `${f.weight} ${wUnit(f.units)}` : "Skipped"} />
            <Row k="Measurements" v={!f.skipMeasure && entries.length ? `${entries.length} · ${c.label}` : "Add later"} />
            {!f.skipMeasure && entries.length > 0 && <div className="pb-2 text-xs text-hc-muted">{entries.map((e) => (e.side === "Midline" ? partLabel(e.body_part) : `${e.side} ${partLabel(e.body_part).toLowerCase()}`)).join(", ")}</div>}
            <Row k="Model" v="Model 5" />
          </div>
          <button data-testid="onboarding-save-button" disabled={saving} onClick={save} className="hc-btn h-14 w-full text-lg">{saving ? "Saving…" : "Save profile"}</button>
        </Step>
      )}
      <div className="mt-8 flex gap-3">
        {step > 0 && <button data-testid="onboarding-back-button" onClick={() => setStep(step - 1)} className="hc-btn-ghost h-14 px-5"><ArrowLeft className="h-5 w-5" /></button>}
        {step === 3 && <button data-testid="onboarding-skip-measurements" onClick={() => { set({ skipMeasure: true, values: {} }); setStep(4); }} className="hc-btn-ghost h-14 flex-1">Add later</button>}
        {step === 2 && !f.weight && <button data-testid="onboarding-skip-weight" onClick={() => setStep(3)} className="hc-btn-ghost h-14 flex-1">Skip</button>}
        {step < 5 && <button data-testid="onboarding-next-button" onClick={next} className="hc-btn h-14 flex-1 text-lg">Next<ArrowRight className="h-5 w-5" /></button>}
      </div>
    </Shell>
  );
}

const Shell = ({ step, children }) => (
  <div className="hc-grain min-h-screen bg-hc-bg px-4 pb-12 pt-6 text-hc-text">
    <div className="mx-auto max-w-xl">
      <div className="mb-8 flex items-center justify-between"><Brand />{step != null && <span data-testid="onboarding-step-count" className="font-mono text-sm text-hc-muted">{step + 1}/{STEPS.length}</span>}</div>
      {step != null && (
        <div className="mb-8 grid grid-cols-6 gap-1.5">
          {STEPS.map((s, i) => <div key={s} className={`h-1.5 rounded-full transition-colors ${i <= step ? "bg-hc-lime" : "bg-hc-line"}`} />)}
        </div>
      )}
      <div className="hc-rise">{children}</div>
    </div>
  </div>
);
