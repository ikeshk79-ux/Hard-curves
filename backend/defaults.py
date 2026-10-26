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
]

EXERCISE_IDS = {e["id"] for e in EXERCISES}

DEFAULT_PLAN_NAME = "Hard Curves Split"

DEFAULT_DAYS = [
    {"id": "day-chest-triceps", "name": "Chest & Triceps", "exercise_ids": ["bench-press", "incline-db-press", "overhead-triceps-ext"]},
    {"id": "day-back-biceps", "name": "Back & Biceps", "exercise_ids": ["weighted-pullup", "barbell-row", "lat-pulldown", "barbell-curl"]},
    {"id": "day-legs", "name": "Legs", "exercise_ids": ["back-squat", "romanian-deadlift", "standing-calf-raise"]},
    {"id": "day-shoulders-arms", "name": "Shoulders & Arms", "exercise_ids": ["seated-db-press", "cable-lateral-raise", "barbell-curl", "overhead-triceps-ext"]},
]

BODY_PARTS = ["Neck", "Shoulders", "Chest", "Back", "Waist", "Hips", "Glutes", "Arms", "Forearms", "Thighs", "Calves"]
SIDES = ["Right", "Left", "Both", "Midline"]
