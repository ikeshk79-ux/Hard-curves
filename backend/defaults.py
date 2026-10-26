EXERCISES = [
    {"id": "bench-press", "name": "Barbell Bench Press", "muscle": "Chest", "equipment": "Barbell", "sets": 4, "reps": "6-10", "rest": 150, "rir": "1-2"},
    {"id": "incline-db-press", "name": "Incline Dumbbell Press", "muscle": "Chest", "equipment": "Dumbbells", "sets": 3, "reps": "8-12", "rest": 120, "rir": "1-2"},
    {"id": "overhead-triceps-ext", "name": "Overhead Cable Triceps Extension", "muscle": "Triceps", "equipment": "Cable", "sets": 3, "reps": "10-15", "rest": 90, "rir": "0-1"},
    {"id": "weighted-pullup", "name": "Weighted Pull-up", "muscle": "Back", "equipment": "Bodyweight + belt", "sets": 4, "reps": "6-10", "rest": 150, "rir": "1-2"},
    {"id": "barbell-row", "name": "Barbell Row", "muscle": "Back", "equipment": "Barbell", "sets": 4, "reps": "8-10", "rest": 120, "rir": "1-2"},
    {"id": "lat-pulldown", "name": "Lat Pulldown", "muscle": "Back", "equipment": "Cable", "sets": 3, "reps": "10-12", "rest": 90, "rir": "1"},
    {"id": "back-squat", "name": "Back Squat", "muscle": "Quads", "equipment": "Barbell", "sets": 4, "reps": "6-8", "rest": 180, "rir": "1-2"},
    {"id": "romanian-deadlift", "name": "Romanian Deadlift", "muscle": "Hamstrings", "equipment": "Barbell", "sets": 3, "reps": "8-10", "rest": 150, "rir": "1-2"},
    {"id": "standing-calf-raise", "name": "Standing Calf Raise", "muscle": "Calves", "equipment": "Machine", "sets": 4, "reps": "10-15", "rest": 60, "rir": "0-1"},
    {"id": "seated-db-press", "name": "Seated Dumbbell Shoulder Press", "muscle": "Shoulders", "equipment": "Dumbbells", "sets": 3, "reps": "8-12", "rest": 120, "rir": "1-2"},
    {"id": "cable-lateral-raise", "name": "Cable Lateral Raise", "muscle": "Shoulders", "equipment": "Cable", "sets": 3, "reps": "12-20", "rest": 60, "rir": "0-1"},
    {"id": "barbell-curl", "name": "Barbell Curl", "muscle": "Biceps", "equipment": "Barbell", "sets": 3, "reps": "8-12", "rest": 90, "rir": "0-1"},
    {"id": "cable-fly", "name": "Cable Fly", "muscle": "Chest", "equipment": "Cable", "sets": 3, "reps": "12-15", "rest": 90, "rir": "0-1"},
    {"id": "chest-dip", "name": "Chest Dip", "muscle": "Chest", "equipment": "Bodyweight + belt", "sets": 3, "reps": "8-12", "rest": 120, "rir": "1-2"},
    {"id": "seated-cable-row", "name": "Seated Cable Row", "muscle": "Back", "equipment": "Cable", "sets": 3, "reps": "10-12", "rest": 90, "rir": "1"},
    {"id": "reverse-pec-deck", "name": "Reverse Pec Deck", "muscle": "Shoulders", "equipment": "Machine", "sets": 3, "reps": "12-20", "rest": 60, "rir": "0-1"},
    {"id": "incline-db-curl", "name": "Incline Dumbbell Curl", "muscle": "Biceps", "equipment": "Dumbbells", "sets": 3, "reps": "8-12", "rest": 90, "rir": "0-1"},
    {"id": "preacher-curl", "name": "Preacher Curl", "muscle": "Biceps", "equipment": "Dumbbells", "sets": 3, "reps": "8-12", "rest": 90, "rir": "0-1"},
    {"id": "hammer-curl", "name": "Hammer Curl", "muscle": "Biceps", "equipment": "Dumbbells", "sets": 3, "reps": "10-12", "rest": 75, "rir": "1"},
    {"id": "rope-pushdown", "name": "Rope Pushdown", "muscle": "Triceps", "equipment": "Cable", "sets": 3, "reps": "10-15", "rest": 75, "rir": "0-1"},
    {"id": "close-grip-bench", "name": "Close-Grip Bench Press", "muscle": "Triceps", "equipment": "Barbell", "sets": 3, "reps": "6-10", "rest": 150, "rir": "1-2"},
    {"id": "skull-crusher", "name": "EZ-Bar Skull Crusher", "muscle": "Triceps", "equipment": "EZ bar", "sets": 3, "reps": "8-12", "rest": 90, "rir": "1"},
    {"id": "wrist-curl", "name": "Barbell Wrist Curl", "muscle": "Forearms", "equipment": "Barbell", "sets": 3, "reps": "12-20", "rest": 60, "rir": "0-1"},
    {"id": "reverse-curl", "name": "EZ-Bar Reverse Curl", "muscle": "Forearms", "equipment": "EZ bar", "sets": 3, "reps": "10-15", "rest": 60, "rir": "1"},
    {"id": "farmers-carry", "name": "Farmer's Carry", "muscle": "Forearms", "equipment": "Dumbbells", "sets": 3, "reps": "30-40 m", "rest": 90, "rir": "1-2"},
    {"id": "leg-press", "name": "Leg Press", "muscle": "Quads", "equipment": "Machine", "sets": 3, "reps": "10-15", "rest": 120, "rir": "1"},
    {"id": "leg-extension", "name": "Leg Extension", "muscle": "Quads", "equipment": "Machine", "sets": 3, "reps": "12-15", "rest": 75, "rir": "0-1"},
    {"id": "bulgarian-split-squat", "name": "Bulgarian Split Squat", "muscle": "Quads", "equipment": "Dumbbells", "sets": 3, "reps": "8-12", "rest": 120, "rir": "1-2"},
    {"id": "lying-leg-curl", "name": "Lying Leg Curl", "muscle": "Hamstrings", "equipment": "Machine", "sets": 3, "reps": "10-12", "rest": 90, "rir": "0-1"},
    {"id": "seated-leg-curl", "name": "Seated Leg Curl", "muscle": "Hamstrings", "equipment": "Machine", "sets": 3, "reps": "10-15", "rest": 90, "rir": "0-1"},
    {"id": "hip-thrust", "name": "Barbell Hip Thrust", "muscle": "Glutes", "equipment": "Barbell", "sets": 4, "reps": "8-12", "rest": 120, "rir": "1"},
    {"id": "cable-kickback", "name": "Cable Glute Kickback", "muscle": "Glutes", "equipment": "Cable", "sets": 3, "reps": "12-15", "rest": 60, "rir": "0-1"},
    {"id": "hip-abduction", "name": "Hip Abduction Machine", "muscle": "Glutes", "equipment": "Machine", "sets": 3, "reps": "15-20", "rest": 60, "rir": "0-1"},
    {"id": "seated-calf-raise", "name": "Seated Calf Raise", "muscle": "Calves", "equipment": "Machine", "sets": 4, "reps": "12-20", "rest": 60, "rir": "0-1"},
    {"id": "leg-press-calf-raise", "name": "Leg Press Calf Raise", "muscle": "Calves", "equipment": "Machine", "sets": 3, "reps": "12-20", "rest": 60, "rir": "0-1"},
    {"id": "cable-crunch", "name": "Cable Crunch", "muscle": "Abs & Core", "equipment": "Cable", "sets": 3, "reps": "12-15", "rest": 60, "rir": "1"},
    {"id": "hanging-leg-raise", "name": "Hanging Leg Raise", "muscle": "Abs & Core", "equipment": "Bodyweight", "sets": 3, "reps": "10-15", "rest": 75, "rir": "1"},
    {"id": "ab-wheel", "name": "Ab Wheel Rollout", "muscle": "Abs & Core", "equipment": "Ab wheel", "sets": 3, "reps": "8-12", "rest": 75, "rir": "1-2"},
    {"id": "barbell-shrug", "name": "Barbell Shrug", "muscle": "Traps", "equipment": "Barbell", "sets": 4, "reps": "10-12", "rest": 90, "rir": "1"},
    {"id": "db-shrug", "name": "Dumbbell Shrug", "muscle": "Traps", "equipment": "Dumbbells", "sets": 3, "reps": "12-15", "rest": 75, "rir": "0-1"},
    {"id": "rack-pull", "name": "Rack Pull", "muscle": "Traps", "equipment": "Barbell", "sets": 3, "reps": "5-8", "rest": 180, "rir": "1-2"},
]

for _e in EXERCISES:
    _e["image"] = f"/exercises/{_e['id']}.webp"

MUSCLE_GROUPS = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Forearms", "Quads", "Hamstrings", "Glutes", "Calves", "Abs & Core", "Traps"]

EXERCISE_IDS = {e["id"] for e in EXERCISES}

DEFAULT_PLAN_NAME = "Hard Curves Split"

DEFAULT_DAYS = [
    {"id": "day-chest-triceps", "name": "Chest & Triceps", "exercise_ids": ["bench-press", "incline-db-press", "overhead-triceps-ext"]},
    {"id": "day-back-biceps", "name": "Back & Biceps", "exercise_ids": ["weighted-pullup", "barbell-row", "lat-pulldown", "barbell-curl"]},
    {"id": "day-legs", "name": "Legs", "exercise_ids": ["back-squat", "romanian-deadlift", "standing-calf-raise"]},
    {"id": "day-shoulders-arms", "name": "Shoulders & Arms", "exercise_ids": ["seated-db-press", "cable-lateral-raise", "barbell-curl", "overhead-triceps-ext"]},
]

BODY_PARTS = ["Neck", "Shoulders", "Chest", "Back", "Waist", "Hips", "Glutes", "Arms", "Forearms", "Thighs", "Calves"]
BILATERAL_PARTS = {"Arms", "Forearms", "Thighs", "Calves"}


def side_ok(part: str, side: str) -> bool:
    return side in ({"Left", "Right", "Both"} if part in BILATERAL_PARTS else {"Midline"})
SIDES = ["Right", "Left", "Both", "Midline"]
