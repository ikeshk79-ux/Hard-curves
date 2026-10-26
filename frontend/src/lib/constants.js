export const BODY_PARTS = ["Neck", "Shoulders", "Chest", "Back", "Waist", "Hips", "Glutes", "Arms", "Forearms", "Thighs", "Calves"];
export const SIDES = ["Right", "Left", "Both", "Midline"];
export const PART_LABEL = { Arms: "Upper arm" };
export const partLabel = (p) => PART_LABEL[p] || p;
const SINGULAR = { Arms: "upper arm", Forearms: "forearm", Thighs: "thigh", Calves: "calf" };
export const entryLabel = (e) => (e.side === "Midline" ? partLabel(e.body_part) : `${e.side} ${SINGULAR[e.body_part] || e.body_part.toLowerCase()}`);
const BILATERAL = ["Arms", "Forearms", "Thighs", "Calves"];
export const defaultSide = (part) => (BILATERAL.includes(part) ? "Right" : "Midline");
export const sidesFor = (part) => (BILATERAL.includes(part) ? ["Right", "Left", "Both"] : ["Midline"]);

export const FULL_SET = [
  ...["Neck", "Shoulders", "Chest", "Back", "Waist", "Hips", "Glutes"].map((p) => ({ body_part: p, side: "Midline" })),
  ...BILATERAL.flatMap((p) => [{ body_part: p, side: "Left" }, { body_part: p, side: "Right" }]),
];

export const CONDITIONS = [
  { id: "fp", label: "Flexed & pumped", flexed: true, pumped: true },
  { id: "fu", label: "Flexed & unpumped", flexed: true, pumped: false },
  { id: "up", label: "Unflexed & pumped", flexed: false, pumped: true },
  { id: "uu", label: "Unflexed & unpumped", flexed: false, pumped: false },
];

export const TIPS = [
  "Leave 1–2 reps in reserve on compounds; take isolation work closer to failure.",
  "Control the eccentric for 2–3 seconds — the stretch under load drives growth.",
  "Add load only when you hit the top of the rep range on every working set.",
  "Measure arms at the same spot, same time of day, same pump state — like for like.",
  "Rest long enough to repeat performance: 2–3 minutes on heavy compounds is not lazy.",
  "Track your best set per exercise. If it stalls three sessions in a row, change something.",
  "Sleep is a training variable. Seven to nine hours is where recovery happens.",
  "Hit each muscle twice a week with quality volume rather than once with junk sets.",
  "Progress photos in the same light and pose beat the mirror every time.",
  "Warm-up sets prime the groove — they don't count toward your working volume.",
];

export const tipOfTheDay = () => TIPS[Math.floor(Date.now() / 86400000) % TIPS.length];

export const MUSCLE_GROUPS = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Forearms", "Quads", "Hamstrings", "Glutes", "Calves", "Abs & Core", "Traps"];
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const todayWeekday = () => (new Date().getDay() + 6) % 7;
export const isRest = (d) => d?.type === "rest";
export const todayIsRest = (plan) => plan?.schedule === "weekly" && isRest(plan.days.find((d) => d.weekday === todayWeekday()));

export const nextDay = (plan, workouts) => {
  const days = plan?.days || [];
  const training = days.filter((d) => !isRest(d));
  if (!training.length) return null;
  if (plan.schedule === "weekly") {
    const t = todayWeekday();
    for (let i = 0; i < 7; i += 1) {
      const d = days.find((x) => x.weekday === (t + i) % 7 && !isRest(x));
      if (d) return d;
    }
    return training[0];
  }
  const last = (workouts || []).find((w) => w.completed && w.day_id && days.some((d) => d.id === w.day_id));
  if (!last) return training[0];
  const idx = days.findIndex((d) => d.id === last.day_id);
  for (let i = 1; i <= days.length; i += 1) {
    const d = days[(idx + i) % days.length];
    if (!isRest(d)) return d;
  }
  return training[0];
};
