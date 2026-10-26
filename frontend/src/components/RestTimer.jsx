import { useEffect, useRef, useState } from "react";
import { Timer, X } from "lucide-react";
import { fmtClock } from "../lib/units";

export function useRestTimer() {
  const [timer, setTimer] = useState(null);
  const start = (seconds, label) => setTimer({ endsAt: Date.now() + seconds * 1000, total: seconds, label });
  const adjust = (delta) => setTimer((t) => t && { ...t, endsAt: Math.max(Date.now(), t.endsAt + delta * 1000), total: Math.max(1, t.total + delta) });
  const stop = () => setTimer(null);
  return { timer, start, adjust, stop };
}

export const RestTimer = ({ timer, adjust, stop }) => {
  const [now, setNow] = useState(Date.now());
  const buzzed = useRef(false);

  useEffect(() => {
    buzzed.current = false;
    if (!timer) return undefined;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [timer]);

  if (!timer) return null;
  const remaining = Math.max(0, (timer.endsAt - now) / 1000);
  const over = remaining <= 0;
  if (over && !buzzed.current) {
    buzzed.current = true;
    navigator.vibrate?.([200, 100, 200]);
  }
  const pct = Math.min(100, (1 - remaining / timer.total) * 100);

  return (
    <div data-testid="rest-timer" className="fixed inset-x-3 bottom-[76px] z-50 mx-auto max-w-xl lg:bottom-6 lg:left-auto lg:right-6 lg:w-[420px]">
      <div className={`overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl ${over ? "border-hc-lime bg-hc-lime text-hc-ink" : "border-hc-line bg-hc-card/95"}`}>
        <div className="flex items-center gap-3 p-3">
          <Timer className={`h-5 w-5 shrink-0 ${over ? "" : "text-hc-lime"}`} />
          <div className="min-w-0 flex-1">
            <div className={`truncate text-[11px] font-semibold uppercase tracking-[0.18em] ${over ? "text-hc-ink/70" : "text-hc-muted"}`}>
              {over ? "Go again" : `Rest · ${timer.label}`}
            </div>
            <div data-testid="rest-timer-display" className="font-mono text-3xl font-bold leading-tight">
              {over ? "Rest over" : fmtClock(remaining)}
            </div>
          </div>
          {!over && (
            <>
              <button data-testid="rest-timer-minus15" onClick={() => adjust(-15)} className="h-12 w-14 rounded-xl border border-hc-line bg-hc-raised font-mono text-sm font-bold">−15s</button>
              <button data-testid="rest-timer-plus15" onClick={() => adjust(15)} className="h-12 w-14 rounded-xl border border-hc-line bg-hc-raised font-mono text-sm font-bold">+15s</button>
              <button data-testid="rest-timer-skip" onClick={stop} className="h-12 rounded-xl bg-hc-lime px-3 font-display text-sm font-bold uppercase text-hc-ink">Skip</button>
            </>
          )}
          {over && (
            <button data-testid="rest-timer-dismiss" onClick={stop} className="grid h-12 w-12 place-items-center rounded-xl bg-hc-ink/10" aria-label="Dismiss">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        {!over && <div className="h-1 bg-hc-lime transition-[width] duration-200" style={{ width: `${pct}%` }} />}
      </div>
    </div>
  );
};
