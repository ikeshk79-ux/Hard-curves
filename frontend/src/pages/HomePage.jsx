import { Link } from "react-router-dom";
import { Play, Flame, Weight, Ruler, ClipboardList, Lightbulb, ChevronRight } from "lucide-react";
import { useMe, usePlan, useExercises, useWorkouts, useMeasurements } from "../lib/api";
import { fmtVolume, fmtLen, fmtDate } from "../lib/units";
import { tipOfTheDay, nextDay } from "../lib/constants";
import { StatCard, SectionTitle, Empty, Loading } from "../components/Bits";

const UpNext = ({ day, exercises }) => (
  <div data-testid="up-next-card" className="hc-card relative overflow-hidden p-5 sm:p-6">
    <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-hc-lime/10 blur-2xl" />
    <div className="hc-label text-hc-lime">Up next</div>
    <div data-testid="up-next-day-name" className="hc-title mt-2 text-3xl">{day?.name || "No plan days"}</div>
    <div className="mt-4 flex flex-wrap gap-2">
      {(day?.exercise_ids || []).map((id) => (
        <span key={id} className="rounded-full border border-hc-line bg-hc-raised px-3 py-1 text-xs text-hc-muted">{exercises?.find((e) => e.id === id)?.name}</span>
      ))}
    </div>
    {day && (
      <Link data-testid="up-next-start-button" to={`/log?day=${day.id}`} className="hc-btn mt-5 w-full sm:w-auto">
        <Play className="h-4 w-4" fill="currentColor" />Start {day.name}
      </Link>
    )}
  </div>
);

export default function HomePage() {
  const { data: me } = useMe();
  const { data: plan } = usePlan();
  const { data: exercises } = useExercises();
  const { data: workouts } = useWorkouts();
  const { data: measurements } = useMeasurements();
  if (!me || !plan || !workouts || !measurements) return <Loading />;

  const units = me.units;
  const done = workouts.filter((w) => w.completed);
  const volume = done.reduce((a, w) => a + (w.volume || 0), 0);
  const arm = measurements.find((m) => m.body_part === "Arms");
  const day = nextDay(plan, workouts);

  return (
    <div className="hc-rise space-y-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="hc-label">{fmtDate(new Date().toISOString())}</div>
          <h1 data-testid="home-welcome" className="hc-title mt-2 text-4xl leading-none sm:text-5xl lg:text-6xl">
            Welcome back, <span className="text-hc-lime">{me.display_name}</span>
          </h1>
        </div>
        <Link data-testid="start-workout-button" to={day ? `/log?day=${day.id}` : "/log"} className="hc-btn h-14 px-7 text-lg">
          <Play className="h-5 w-5" fill="currentColor" />Start workout
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard testId="stat-sessions" label="Sessions done" value={done.length} icon={Flame} />
        <StatCard testId="stat-volume" label="Total volume" value={fmtVolume(volume, units)} icon={Weight} />
        <StatCard testId="stat-arm" label="Latest arm" value={arm ? fmtLen(arm.value_cm, units) : "—"} icon={Ruler} accent />
        <StatCard testId="stat-plan" label="Active plan" value={<span className="font-display text-2xl uppercase">{plan.name}</span>} icon={ClipboardList} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <UpNext day={day} exercises={exercises} />
          <div>
            <SectionTitle action={<Link to="/training" className="text-sm text-hc-lime">History</Link>}>Recent workouts</SectionTitle>
            <div data-testid="recent-workouts" className="space-y-2">
              {workouts.slice(0, 3).map((w) => (
                <div key={w.id} data-testid="recent-workout-item" className="hc-card flex items-center justify-between p-4">
                  <div>
                    <div className="font-semibold">{w.name}</div>
                    <div className="text-xs text-hc-muted">{fmtDate(w.date)} · {w.set_count} {w.set_count === 1 ? "set" : "sets"} · {w.completed ? "Completed" : "In progress"}</div>
                  </div>
                  <div className="font-mono text-sm text-hc-lime">{fmtVolume(w.volume || 0, units)}</div>
                </div>
              ))}
              {!workouts.length && <Empty testId="recent-workouts-empty">No workouts yet. Start your first session.</Empty>}
            </div>
          </div>
        </div>
        <div className="space-y-6 lg:col-span-2">
          <div>
            <SectionTitle action={<Link to="/measurements" className="text-sm text-hc-lime">Log</Link>}>Latest measurements</SectionTitle>
            <div data-testid="latest-measurements" className="hc-card divide-y divide-hc-line">
              {measurements.slice(0, 5).map((m) => (
                <div key={m.id} data-testid="latest-measurement-item" className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="font-semibold">{m.body_part} <span className="text-hc-muted">· {m.side}</span></div>
                    <div className="text-xs text-hc-muted">{fmtDate(m.date)} · {m.flexed ? "Flexed" : "Unflexed"}{m.pumped ? " · Pumped" : ""}</div>
                  </div>
                  <div className="font-mono font-bold">{fmtLen(m.value_cm, units)}</div>
                </div>
              ))}
              {!measurements.length && <div className="p-4"><Empty>No measurements yet.</Empty></div>}
            </div>
          </div>
          <div data-testid="training-tip" className="hc-card border-hc-lime/30 p-5">
            <div className="flex items-center gap-2 text-hc-lime"><Lightbulb className="h-4 w-4" /><span className="hc-label text-hc-lime">Training tip</span></div>
            <p className="mt-3 leading-relaxed text-hc-text">{tipOfTheDay()}</p>
            <Link to="/progress" className="mt-4 inline-flex items-center text-sm text-hc-muted hover:text-hc-lime">See your progress<ChevronRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
