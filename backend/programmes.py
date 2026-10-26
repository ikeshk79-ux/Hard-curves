import uuid

try:
    from backend.defaults import EXERCISES, MUSCLE_GROUPS
except ModuleNotFoundError:
    from defaults import EXERCISES, MUSCLE_GROUPS

EX_BY_ID = {e["id"]: e for e in EXERCISES}
PRIORITY_LEVELS = {"primary", "secondary", "maintenance"}
SCHEDULES = {"rotation", "weekly"}

PUSH, PULL = ["Chest", "Shoulders", "Triceps"], ["Back", "Biceps", "Traps", "Forearms"]
LEGS = ["Quads", "Hamstrings", "Glutes", "Calves"]
UPPER = ["Chest", "Back", "Shoulders", "Biceps", "Triceps"]
FULL = ["Chest", "Back", "Shoulders", "Quads", "Hamstrings", "Glutes", "Abs & Core"]

# (label, [(day name, muscle groups or None for rest)])
SPLITS = {
    "ppl": ("Push / Pull / Legs", [("Push", PUSH), ("Pull", PULL), ("Legs", LEGS), ("Rest & recovery", None)]),
    "upper_lower": ("Upper / Lower", [("Upper", UPPER), ("Lower", LEGS + ["Abs & Core"]), ("Rest & recovery", None)]),
    "arnold": ("Arnold Split", [("Chest & Back", ["Chest", "Back"]), ("Shoulders & Arms", ["Shoulders", "Biceps", "Triceps", "Forearms"]),
                                ("Legs", LEGS + ["Abs & Core"]), ("Rest & recovery", None)]),
    "bro": ("Bro Split", [("Chest", ["Chest"]), ("Back", ["Back", "Traps"]), ("Shoulders", ["Shoulders"]),
                          ("Arms", ["Biceps", "Triceps", "Forearms"]), ("Legs", LEGS), ("Rest & recovery", None), ("Rest & recovery", None)]),
    "full_body": ("Full Body", [("Full Body A", FULL), ("Rest & recovery", None), ("Full Body B", FULL), ("Rest & recovery", None),
                                ("Full Body C", FULL), ("Rest & recovery", None), ("Rest & recovery", None)]),
    "custom": ("Custom Split", [("Day 1", [])]),
}


def new_day_id() -> str:
    return f"day-{uuid.uuid4().hex[:8]}"


def starter_exercises(groups: list) -> list:
    per = 2 if len(groups) <= 3 else 1
    return [e["id"] for g in groups for e in [x for x in EXERCISES if x["muscle"] == g][:per]]


def template_days(split: str) -> list:
    return [{"id": new_day_id(), "name": name, "type": "rest" if groups is None else "training",
             "muscle_groups": groups or [], "exercise_ids": starter_exercises(groups or []), "weekday": None}
            for name, groups in SPLITS[split][1]]


def norm_day(d: dict) -> dict:
    ex_ids = [e for e in d.get("exercise_ids", []) if e in EX_BY_ID]
    groups = d.get("muscle_groups")
    if groups is None:
        groups = list(dict.fromkeys(EX_BY_ID[e]["muscle"] for e in ex_ids))
    weekday = d.get("weekday")
    rest = d.get("type") == "rest"
    return {"id": d.get("id") or new_day_id(), "name": d["name"].strip(), "type": "rest" if rest else "training",
            "muscle_groups": [] if rest else [g for g in groups if g in MUSCLE_GROUPS],
            "exercise_ids": [] if rest else list(dict.fromkeys(ex_ids)), "weekday": weekday if weekday in range(7) else None}


def legacy_fields(doc: dict, now: str) -> dict:
    """Fields a pre-programmes plan doc needs; applied once at startup."""
    return {"id": f"default-{doc['user_id']}", "active": True, "split": "custom", "schedule": "rotation",
            "priorities": {}, "created_at": doc.get("updated_at") or now, "days": [norm_day(d) for d in doc.get("days", [])]}
