# Hard Curves API regression tests (auth, isolation, workouts/PRs, measurements, photos, owner, reset)
import io
import json
import os
import subprocess
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    for line in open("/app/frontend/.env"):
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip()
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

PNG = bytes.fromhex("89504e470d0a1a0a0000000d4948445200000001000000010806000000"
                    "1f15c4890000000d49444154789c6360f8cfc0f01f0005000201e2d6"
                    "a4c10000000049454e44ae426082")


@pytest.fixture(scope="session")
def toks():
    out = subprocess.run(["python3", "/app/tests/clerk_tokens.py"], capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def H(toks, who):
    return {"Authorization": f"Bearer {toks[who]['token']}"}


@pytest.fixture(scope="session", autouse=True)
def clean_ben(toks):
    # athlete2 (Ben) used as clean slate for destructive flows
    r = requests.post(f"{API}/reset", headers=H(toks, "athlete2"))
    assert r.status_code == 200
    yield


# --- Auth ---
@pytest.mark.parametrize("method,path", [("get", "/me"), ("get", "/plan"), ("get", "/workouts"), ("get", "/measurements"),
                                         ("get", "/photos"), ("get", "/records"), ("get", "/export"), ("post", "/reset"),
                                         ("get", "/owner/stats"), ("get", "/owner/athletes"), ("get", "/exercises")])
def test_requires_auth(method, path):
    r = getattr(requests, method)(f"{API}{path}")
    assert r.status_code == 401, f"{path} -> {r.status_code}"
    r = getattr(requests, method)(f"{API}{path}", headers={"Authorization": "Bearer garbage"})
    assert r.status_code == 401


def test_me_and_role_ignored(toks):
    r = requests.get(f"{API}/me", headers=H(toks, "athlete2"))
    assert r.status_code == 200 and r.json()["role"] == "member"
    r = requests.patch(f"{API}/me", headers=H(toks, "athlete2"), json={"role": "admin", "display_name": "Ben TEST"})
    assert r.status_code == 200
    assert r.json()["role"] == "member" and r.json()["display_name"] == "Ben TEST"
    assert requests.get(f"{API}/owner/stats", headers=H(toks, "athlete2")).status_code == 403
    requests.patch(f"{API}/me", headers=H(toks, "athlete2"), json={"display_name": "Ben"})


def test_me_invalid_units(toks):
    r = requests.patch(f"{API}/me", headers=H(toks, "athlete2"), json={"units": "furlongs"})
    assert r.status_code == 422


def test_exercises_library_keeps_original_12(toks):
    r = requests.get(f"{API}/exercises", headers=H(toks, "athlete2"))
    ids = {e["id"] for e in r.json()}
    original = {"bench-press", "incline-db-press", "overhead-triceps-ext", "weighted-pullup", "barbell-row", "lat-pulldown",
                "back-squat", "romanian-deadlift", "standing-calf-raise", "seated-db-press", "cable-lateral-raise", "barbell-curl"}
    assert r.status_code == 200 and len(ids) == 41 and original <= ids


# --- Plan ---
def test_plan_save_and_persist(toks):
    h = H(toks, "athlete2")
    plan = requests.get(f"{API}/plan", headers=h).json()
    assert plan["name"] == "Hard Curves Split" and len(plan["days"]) == 4
    body = {"name": "TEST Plan", "days": [{"id": plan["days"][0]["id"], "name": "Push TEST", "exercise_ids": ["bench-press", "bogus"]},
                                          {"name": "New Day", "exercise_ids": ["back-squat"]}]}
    r = requests.put(f"{API}/plan", headers=h, json=body)
    assert r.status_code == 200
    got = requests.get(f"{API}/plan", headers=h).json()
    assert got["name"] == "TEST Plan" and len(got["days"]) == 2
    assert got["days"][0]["exercise_ids"] == ["bench-press"]
    assert got["days"][1]["id"].startswith("day-")
    assert requests.get(f"{API}/me", headers=h).json()["plan_name"] == "TEST Plan"
    assert requests.put(f"{API}/plan", headers=h, json={"name": "x", "days": []}).status_code == 422


# --- Workouts / PRs ---
def _w(load, completed=True, date="2026-01-10", ex="barbell-curl", reps=8):
    return {"name": "TEST session", "date": date, "completed": completed, "exercises": [{"exercise_id": ex, "sets": [{"load": load, "reps": reps, "done": True}]}]}


def test_pr_logic(toks):
    h = H(toks, "athlete2")
    r = requests.post(f"{API}/workouts", headers=h, json=_w(40))
    assert r.status_code == 200 and r.json()["prs"] == []  # first time = no PR
    assert r.json()["workout"]["volume"] == 320
    r = requests.post(f"{API}/workouts", headers=h, json=_w(60, completed=False))
    assert r.json()["prs"] == []  # incomplete: no PR
    r = requests.post(f"{API}/workouts", headers=h, json=_w(45))
    prs = r.json()["prs"]
    assert len(prs) == 1 and prs[0]["load"] == 45 and prs[0]["previous_load"] == 40  # incomplete 60 ignored
    r = requests.post(f"{API}/workouts", headers=h, json=_w(45, reps=12))
    assert r.json()["prs"] == []  # equal load not a PR
    recs = requests.get(f"{API}/records", headers=h).json()
    curl = [x for x in recs if x["exercise_id"] == "barbell-curl"][0]
    assert curl["load"] == 45 and curl["reps"] == 12
    ws = requests.get(f"{API}/workouts", headers=h).json()
    assert len(ws) == 4


def test_workout_validation_and_delete(toks):
    h = H(toks, "athlete2")
    assert requests.post(f"{API}/workouts", headers=h, json=_w(10, ex="nope")).status_code == 422
    assert requests.post(f"{API}/workouts", headers=h, json=_w(10, date="2027-05-01")).status_code == 422
    assert requests.post(f"{API}/workouts", headers=h, json=_w(10, date="2026-02-30")).status_code == 422
    wid = requests.post(f"{API}/workouts", headers=h, json=_w(10, ex="lat-pulldown")).json()["workout"]["id"]
    # isolation: athlete cannot delete Ben's workout
    assert requests.delete(f"{API}/workouts/{wid}", headers=H(toks, "athlete")).status_code == 404
    assert requests.delete(f"{API}/workouts/{wid}", headers=h).status_code == 200
    assert wid not in [w["id"] for w in requests.get(f"{API}/workouts", headers=h).json()]


# --- Measurements ---
def test_measurements(toks):
    h = H(toks, "athlete2")
    base = {"body_part": "Arms", "side": "Right", "value_cm": 45.5, "date": "2026-01-05", "flexed": True, "notes": "TEST"}
    r = requests.post(f"{API}/measurements", headers=h, json=base)
    assert r.status_code == 200 and r.json()["value_cm"] == 45.5
    mid = r.json()["id"]
    for bad in ["2026-02-30", "2099-01-01", "abc", "1900-01-01"]:
        assert requests.post(f"{API}/measurements", headers=h, json={**base, "date": bad}).status_code == 422, bad
    assert requests.post(f"{API}/measurements", headers=h, json={**base, "body_part": "Toes"}).status_code == 422
    assert requests.post(f"{API}/measurements", headers=h, json={**base, "value_cm": 0}).status_code == 422
    assert mid in [m["id"] for m in requests.get(f"{API}/measurements", headers=h).json()]
    assert mid not in [m["id"] for m in requests.get(f"{API}/measurements", headers=H(toks, "athlete")).json()]
    assert requests.delete(f"{API}/measurements/{mid}", headers=H(toks, "athlete")).status_code == 404
    assert requests.delete(f"{API}/measurements/{mid}", headers=h).status_code == 200
    assert requests.delete(f"{API}/measurements/{mid}", headers=h).status_code == 404


# --- Photos ---
def test_photos(toks):
    h = H(toks, "athlete2")
    r = requests.post(f"{API}/photos", headers=h, files={"file": ("x.txt", b"hello", "text/plain")}, data={"date": "2026-01-05"})
    assert r.status_code == 422
    big = b"\x00" * (10 * 1024 * 1024 + 10)
    r = requests.post(f"{API}/photos", headers=h, files={"file": ("big.png", big, "image/png")}, data={"date": "2026-01-05"})
    assert r.status_code == 413
    r = requests.post(f"{API}/photos", headers=h, files={"file": ("p.png", PNG, "image/png")}, data={"date": "2026-01-05", "note": "TEST"})
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    assert "storage_path" not in r.json()
    f = requests.get(f"{API}/photos/{pid}/file", headers=h)
    assert f.status_code == 200 and f.content == PNG and f.headers["content-type"] == "image/png"
    assert requests.get(f"{API}/photos/{pid}/file", headers=H(toks, "athlete")).status_code == 404
    assert requests.get(f"{API}/photos/{pid}/file", headers=H(toks, "owner")).status_code == 200
    assert pid not in [p["id"] for p in requests.get(f"{API}/photos", headers=H(toks, "athlete")).json()]
    assert requests.delete(f"{API}/photos/{pid}", headers=H(toks, "athlete")).status_code == 404
    assert requests.delete(f"{API}/photos/{pid}", headers=h).status_code == 200
    assert pid not in [p["id"] for p in requests.get(f"{API}/photos", headers=h).json()]
    assert requests.get(f"{API}/photos/{pid}/file", headers=h).status_code == 404


# --- Owner ---
def test_owner(toks):
    assert requests.get(f"{API}/owner/stats", headers=H(toks, "athlete")).status_code == 403
    assert requests.get(f"{API}/owner/athletes", headers=H(toks, "athlete")).status_code == 403
    h = H(toks, "owner")
    s = requests.get(f"{API}/owner/stats", headers=h)
    assert s.status_code == 200 and s.json()["users"] >= 3
    a = requests.get(f"{API}/owner/athletes?q=athlete2", headers=h).json()
    assert len(a) == 1 and a[0]["user_id"] == toks["athlete2"]["user_id"]
    assert requests.get(f"{API}/owner/athletes?q=.*", headers=h).json() == []
    d = requests.get(f"{API}/owner/athletes/{toks['athlete2']['user_id']}", headers=h)
    assert d.status_code == 200 and d.json()["stats"]["workouts"] >= 4
    assert requests.get(f"{API}/owner/athletes/nope", headers=h).status_code == 404
    assert requests.get(f"{API}/owner/athletes/{toks['athlete2']['user_id']}", headers=H(toks, "athlete")).status_code == 403


# --- Export / Reset ---
def test_export_and_reset(toks):
    h = H(toks, "athlete2")
    e = requests.get(f"{API}/export", headers=h).json()
    assert set(["profile", "plan", "workouts", "measurements", "photos"]) <= set(e)
    assert len(e["workouts"]) >= 4
    assert requests.post(f"{API}/reset", headers=h).status_code == 200
    assert requests.get(f"{API}/workouts", headers=h).json() == []
    assert requests.get(f"{API}/measurements", headers=h).json() == []
    assert requests.get(f"{API}/photos", headers=h).json() == []
    p = requests.get(f"{API}/plan", headers=h).json()
    assert p["name"] == "Hard Curves Split" and len(p["days"]) == 4
