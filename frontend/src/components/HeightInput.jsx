import { useEffect, useState } from "react";
import { cmToFtIn, ftInToCm, HEIGHT_MIN_CM, HEIGHT_MAX_CM } from "../lib/units";

export const heightError = (cm) => {
  if (cm == null) return "Enter your height";
  if (Number.isNaN(cm)) return "Enter a valid height (feet and inches 0–11.9)";
  if (cm < HEIGHT_MIN_CM || cm > HEIGHT_MAX_CM) return `Height must be between ${HEIGHT_MIN_CM} and ${HEIGHT_MAX_CM} cm (3 ft 4 in – 8 ft 2 in)`;
  return null;
};

const fromCm = (cm) => {
  if (!cm) return { cmText: "", ft: "", inch: "" };
  const { ft, inch } = cmToFtIn(cm);
  return { cmText: String(Math.round(cm * 10) / 10), ft: String(ft), inch: String(inch) };
};

export const HeightInput = ({ cm, unit, onChange, onUnit, showError }) => {
  const [f, setF] = useState(() => fromCm(cm));
  useEffect(() => {
    // Re-sync only when the stored value differs from what the fields already describe.
    const fieldsCm = unit === "ftin" ? (f.ft === "" && f.inch === "" ? null : ftInToCm(Number(f.ft) || 0, Number(f.inch) || 0)) : (f.cmText === "" ? null : Number(f.cmText));
    if (cm == null ? fieldsCm != null : fieldsCm == null || Math.abs(fieldsCm - cm) > 0.05) setF(fromCm(cm));
  }, [cm]); // eslint-disable-line react-hooks/exhaustive-deps

  const setCm = (text) => {
    setF({ ...f, cmText: text });
    onChange(text === "" ? null : Number(text));
  };
  const setFtIn = (ft, inch) => {
    setF({ ...f, ft, inch });
    const [nf, ni] = [Number(ft) || 0, Number(inch) || 0];
    if (ft === "" && inch === "") onChange(null);
    else onChange(nf < 0 || ni < 0 || ni >= 12 ? NaN : ftInToCm(nf, ni));
  };
  const switchUnit = (u) => {
    if (u === unit) return;
    setF(fromCm(cm));
    onUnit(u);
  };
  const err = showError ? heightError(cm) : null;
  const inchBad = unit === "ftin" && ((f.inch !== "" && (Number(f.inch) < 0 || Number(f.inch) >= 12)) || (f.ft !== "" && Number(f.ft) < 0));

  return (
    <div data-testid="height-input" className="space-y-3">
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-hc-line bg-hc-bg p-1">
        {[["cm", "CM"], ["ftin", "FT / IN"]].map(([u, label]) => (
          <button key={u} type="button" data-testid={`height-unit-${u}`} data-active={unit === u} onClick={() => switchUnit(u)}
            className={`h-11 rounded-lg font-display text-base font-bold uppercase tracking-wide transition-colors ${unit === u ? "bg-hc-lime text-hc-ink" : "text-hc-muted hover:text-hc-text"}`}>{label}</button>
        ))}
      </div>
      {unit === "cm" ? (
        <div className="relative">
          <input data-testid="height-cm-input" type="number" inputMode="decimal" step="0.1" min={HEIGHT_MIN_CM} max={HEIGHT_MAX_CM} placeholder="175"
            className="hc-input h-14 pr-14 font-mono text-2xl" value={f.cmText} onChange={(e) => setCm(e.target.value)} aria-label="Height in centimetres" />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-hc-muted">cm</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {[["ft", "5", f.ft, (v) => setFtIn(v, f.inch)], ["in", "9", f.inch, (v) => setFtIn(f.ft, v)]].map(([u, ph, val, set]) => (
            <div key={u} className="relative">
              <input data-testid={`height-${u}-input`} type="number" inputMode="decimal" min="0" step={u === "in" ? "0.5" : "1"} max={u === "in" ? "11.9" : "8"} placeholder={ph}
                className="hc-input h-14 pr-12 font-mono text-2xl" value={val} onChange={(e) => set(e.target.value)} aria-label={u === "ft" ? "Feet" : "Inches"} />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-hc-muted">{u}</span>
            </div>
          ))}
        </div>
      )}
      {(err || inchBad) && <p data-testid="height-error" className="text-sm text-red-400">{inchBad ? "Inches must be between 0 and 11.9" : err}</p>}
    </div>
  );
};
