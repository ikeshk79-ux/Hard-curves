def set_counts(sets: list) -> list:
    return [s for s in sets if s.get("reps", 0) > 0]


def workout_volume(w: dict) -> float:
    return sum(s["load"] * s["reps"] for ex in w["exercises"] for s in set_counts(ex["sets"]))


def best_loads(workouts: list) -> dict:
    best = {}
    for w in sorted(workouts, key=lambda x: (x["date"], x["created_at"])):
        if not w.get("completed"):
            continue
        for ex in w["exercises"]:
            for s in set_counts(ex["sets"]):
                if s["load"] <= 0:
                    continue
                cur = best.get(ex["exercise_id"])
                if cur is None or s["load"] > cur["load"] or (s["load"] == cur["load"] and s["reps"] > cur["reps"]):
                    best[ex["exercise_id"]] = {"exercise_id": ex["exercise_id"], "exercise_name": ex["name"],
                                               "load": s["load"], "reps": s["reps"], "date": w["date"], "workout_id": w["id"]}
    return best


def goal_key(d: dict) -> tuple:
    return (d["body_part"], d["side"], bool(d["flexed"]), bool(d["pumped"]))


def goal_progress(goal: dict, measurements: list) -> dict:
    """Progress from matching entries only (same body part, side, flexed and pumped state)."""
    matching = sorted((m for m in measurements if goal_key(m) == goal_key(goal)), key=lambda m: (m["date"], m["created_at"]))
    current = matching[-1] if matching else None
    start = goal.get("start_cm")
    if start is None and matching:
        start = matching[0]["value_cm"]
    pct = 0.0
    if current and start is not None:
        span = goal["target_cm"] - start
        pct = 100.0 if span == 0 else max(0.0, min(100.0, (current["value_cm"] - start) / span * 100))
    reached = bool(current) and (
        current["value_cm"] >= goal["target_cm"] if start is None or goal["target_cm"] >= start else current["value_cm"] <= goal["target_cm"])
    return {**goal, "start_cm": start, "current_cm": current["value_cm"] if current else None,
            "current_date": current["date"] if current else None, "entries": len(matching),
            "percent": round(pct, 1), "reached": reached}
