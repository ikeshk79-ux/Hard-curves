import { MUSCLE_GROUPS } from "../../lib/constants";

const LEVELS = [["primary", "Primary"], ["secondary", "Secondary"], ["maintenance", "Maintain"]];

export const PriorityGrid = ({ priorities, days, onChange }) => {
  const freq = (g) => days.filter((d) => d.type !== "rest" && d.muscle_groups.includes(g)).length;
  const set = (g, level) => {
    const next = { ...priorities };
    if (next[g] === level) delete next[g];
    else next[g] = level;
    onChange(next);
  };
  return (
    <div data-testid="priority-grid" className="grid gap-2 sm:grid-cols-2">
      {MUSCLE_GROUPS.map((g) => {
        const slug = g.toLowerCase().replace(/[^a-z]+/g, "-");
        return (
          <div key={g} className="flex items-center gap-2 rounded-xl border border-hc-line bg-hc-bg px-3 py-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{g}</div>
              <div data-testid={`priority-freq-${slug}`} className="text-[11px] text-hc-muted">{freq(g)}× per cycle</div>
            </div>
            {LEVELS.map(([lv, label]) => (
              <button key={lv} type="button" data-testid={`priority-${slug}-${lv}`} data-active={priorities[g] === lv} onClick={() => set(g, lv)}
                className="hc-chip h-8 px-2 text-[11px]">{label}</button>
            ))}
          </div>
        );
      })}
    </div>
  );
};
