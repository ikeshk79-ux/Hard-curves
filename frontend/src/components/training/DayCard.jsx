import { ArrowDown, ArrowUp, Copy, Moon, Trash2 } from "lucide-react";
import { MUSCLE_GROUPS, WEEKDAYS } from "../../lib/constants";
import { SortableExerciseList } from "./SortableExerciseList";

const IconBtn = ({ testId, label, onClick, disabled, children, danger }) => (
  <button type="button" data-testid={testId} onClick={onClick} disabled={disabled} aria-label={label} title={label}
    className={`grid h-10 w-10 place-items-center rounded-xl border border-hc-line text-hc-muted transition-colors disabled:opacity-30 ${danger ? "hover:text-red-400" : "hover:border-hc-lime hover:text-hc-text"}`}>
    {children}
  </button>
);

const AddExercise = ({ day, index, exercises, onAdd }) => {
  const free = exercises.filter((e) => !day.exercise_ids.includes(e.id));
  const forDay = free.filter((e) => day.muscle_groups.includes(e.muscle));
  const other = free.filter((e) => !day.muscle_groups.includes(e.muscle));
  return (
    <select data-testid={`day-${index}-add-exercise`} value="" onChange={(e) => e.target.value && onAdd(e.target.value)}
      className="hc-input h-11 cursor-pointer border-dashed bg-transparent text-sm">
      <option value="">+ Add exercise</option>
      {forDay.length > 0 && <optgroup label="For this day's muscles">{forDay.map((e) => <option key={e.id} value={e.id}>{e.name} · {e.muscle}</option>)}</optgroup>}
      <optgroup label={forDay.length ? "All other exercises" : "All exercises"}>{other.map((e) => <option key={e.id} value={e.id}>{e.name} · {e.muscle}</option>)}</optgroup>
    </select>
  );
};

export const DayCard = ({ day, index, total, exercises, exMap, schedule, onChange, onMove, onDuplicate, onDelete }) => {
  const rest = day.type === "rest";
  const toggleGroup = (g) => onChange({ ...day, muscle_groups: day.muscle_groups.includes(g) ? day.muscle_groups.filter((x) => x !== g) : [...day.muscle_groups, g] });
  return (
    <div data-testid={`programme-day-${index}`} className={`rounded-2xl border p-4 ${rest ? "border-dashed border-hc-line bg-hc-bg/50" : "border-hc-line bg-hc-bg"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm text-hc-lime">D{index + 1}</span>
        <input data-testid={`day-${index}-name-input`} className="hc-input h-11 min-w-0 flex-1 font-semibold" value={day.name} maxLength={60}
          onChange={(e) => onChange({ ...day, name: e.target.value })} placeholder="Day name" />
        {schedule === "weekly" && (
          <select data-testid={`day-${index}-weekday`} value={day.weekday ?? ""} onChange={(e) => onChange({ ...day, weekday: e.target.value === "" ? null : Number(e.target.value) })}
            className="hc-input h-11 w-24 cursor-pointer" aria-label="Weekday">
            <option value="">No day</option>
            {WEEKDAYS.map((w, i) => <option key={w} value={i}>{w}</option>)}
          </select>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:w-72">
        {[["training", "Training"], ["rest", "Rest & recovery"]].map(([t, l]) => (
          <button key={t} type="button" data-testid={`day-${index}-type-${t}`} data-active={day.type === t} onClick={() => onChange({ ...day, type: t })} className="hc-chip h-9 justify-center rounded-lg px-2 text-xs">{l}</button>
        ))}
      </div>
      {rest ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-hc-muted"><Moon className="h-4 w-4" />Recovery day — no exercises.</div>
      ) : (
        <>
          <div className="hc-label mb-2 mt-4">Muscle groups</div>
          <div className="flex flex-wrap gap-1.5">
            {MUSCLE_GROUPS.map((g) => (
              <button key={g} type="button" data-testid={`day-${index}-muscle-${g.toLowerCase().replace(/[^a-z]+/g, "-")}`} data-active={day.muscle_groups.includes(g)}
                onClick={() => toggleGroup(g)} className="hc-chip h-8 px-3 text-xs">{g}</button>
            ))}
          </div>
          <div className="hc-label mb-2 mt-4">Exercises · drag to reorder</div>
          <SortableExerciseList ids={day.exercise_ids} exMap={exMap} dayIndex={index} onChange={(ids) => onChange({ ...day, exercise_ids: ids })} />
          <div className="mt-2"><AddExercise day={day} index={index} exercises={exercises} onAdd={(id) => onChange({ ...day, exercise_ids: [...day.exercise_ids, id] })} /></div>
        </>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <IconBtn testId={`day-${index}-move-up`} label="Move day up" onClick={() => onMove(-1)} disabled={index === 0}><ArrowUp className="h-4 w-4" /></IconBtn>
        <IconBtn testId={`day-${index}-move-down`} label="Move day down" onClick={() => onMove(1)} disabled={index === total - 1}><ArrowDown className="h-4 w-4" /></IconBtn>
        <IconBtn testId={`day-${index}-duplicate`} label="Duplicate day" onClick={onDuplicate}><Copy className="h-4 w-4" /></IconBtn>
        <IconBtn testId={`day-${index}-delete`} label="Delete day" onClick={onDelete} disabled={total === 1} danger><Trash2 className="h-4 w-4" /></IconBtn>
      </div>
    </div>
  );
};
