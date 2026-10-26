import { CONDITIONS, FULL_SET, entryLabel } from "../lib/constants";
import { lenUnit } from "../lib/units";

export const keyOf = (e) => `${e.body_part}-${e.side}`;

export const MeasurementSetForm = ({ units, condition, onCondition, values, onValues }) => (
  <div data-testid="measurement-set-form" className="space-y-4">
    <div>
      <div className="hc-label mb-2">Condition</div>
      <div className="grid grid-cols-2 gap-2">
        {CONDITIONS.map((c) => (
          <button key={c.id} type="button" data-testid={`condition-${c.id}`} data-active={condition === c.id} onClick={() => onCondition(c.id)}
            className="hc-chip h-12 justify-center rounded-xl px-2 text-xs sm:text-sm">{c.label}</button>
        ))}
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {FULL_SET.map((e) => {
        const k = keyOf(e);
        const label = entryLabel(e);
        return (
          <label key={k} className="block">
            <span className="hc-label mb-1.5 block">{label}</span>
            <div className="relative">
              <input data-testid={`set-measure-${k.toLowerCase()}`} type="number" inputMode="decimal" step="0.1" min="0" placeholder="—"
                className="hc-input pr-10 font-mono" value={values[k] || ""} onChange={(ev) => onValues({ ...values, [k]: ev.target.value })} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-hc-muted">{lenUnit(units)}</span>
            </div>
          </label>
        );
      })}
    </div>
  </div>
);
