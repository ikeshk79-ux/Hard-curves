# Phase 2: programmes / splits / days / priorities / migration tests (Ben = destructive, Alex = read-only migration checks)
import json
import os
import subprocess

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    for line in open("/app/frontend/.env"):
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip()
API = f"{BASE_URL.rstrip('/')}/api"
ORIGINAL_12 = {"bench-press", "incline-db-press", "overhead-triceps-ext", "weighted-pullup", "barbell-row", "lat-pulldown",
               "back-squat", "romanian-deadlift", "standing-calf-raise", "seated-db-press", "cable-lateral-raise", "barbell-curl"}
GROUPS = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Forearms", "Quads", "Hamstrings", "Glutes", "Calves", "Abs & Core", "Traps"]


@pytest.fixture(scope="module")
def toks():
    return json.loads(subprocess.run(["python3", "/app/tests/clerk_tokens.py"], capture_output=True, text=True, check=True).stdout)


@pytest.fixture(scope="module")
def ben(toks):
    h = {"Authorization": f"Bearer {toks['athlete2']['token']}"}
    assert requests.post(f"{API}/reset", headers=h).status_code == 200
    yield h
    requests.post(f"{API}/reset", headers=h)


@pytest.fixture(scope="module")
def alex(toks):
    return {"Authorization": f"Bearer {toks['athlete']['token']}"}, toks["athlete"]["user_id"]


def test_auth_required():
    for m, p in [("get", "/programmes"), ("get", "/splits"), ("post", "/programmes"), ("put", "/programmes/x"),
                 ("post", "/programmes/x/duplicate"), ("post", "/programmes/x/activate"), ("delete", "/programmes/x")]:
        assert getattr(requests, m)(f"{API}{p}").status_code == 401, p


def test_alex_migration(alex):
    h, uid = alex
    progs = requests.get(f"{API}/programmes", headers=h).json()
    mp = [p for p in progs if p["id"] == f"default-{uid}"]
    assert mp, [p["id"] for p in progs]
    mp = mp[0]
    print("Alex programmes:", [(p["name"], p["active"]) for p in progs])
    assert mp["name"] == "Mass Phase"
    assert sum(p["active"] for p in progs) == 1
    tr = [d for d in mp["days"] if d["type"] == "training"]
    assert len(tr) >= 4
    for d in mp["days"]:
        assert {"id", "name", "type", "muscle_groups", "exercise_ids", "weekday"} <= set(d)
    assert all(d["muscle_groups"] for d in tr)
    plan = requests.get(f"{API}/plan", headers=h).json()
    assert plan["active"] is True and plan["id"] == [p for p in progs if p["active"]][0]["id"]


def test_exercises_41_with_images(ben):
    ex = requests.get(f"{API}/exercises", headers=ben).json()
    assert len(ex) == 41 and ORIGINAL_12 <= {e["id"] for e in ex}
    assert all(e.get("image") for e in ex)
    assert {e["muscle"] for e in ex} <= set(GROUPS)
    img = requests.get(f"{BASE_URL.rstrip('/')}{ex[0]['image']}")
    assert img.status_code == 200 and "image" in img.headers.get("content-type", "")


def test_splits(ben):
    s = requests.get(f"{API}/splits", headers=ben).json()
    assert {x["id"] for x in s} == {"ppl", "upper_lower", "arnold", "bro", "full_body", "custom"}


@pytest.mark.parametrize("split", ["ppl", "upper_lower", "arnold", "bro", "full_body", "custom"])
def test_create_each_split(ben, split):
    r = requests.post(f"{API}/programmes", headers=ben, json={"name": f"TEST {split}", "split": split})
    assert r.status_code == 200, r.text
    p = r.json()
    assert p["active"] is False and p["split"] == split and "_id" not in p
    if split != "custom":
        assert any(d["type"] == "rest" for d in p["days"])
        assert all(d["exercise_ids"] == [] for d in p["days"] if d["type"] == "rest")
    got = [x for x in requests.get(f"{API}/programmes", headers=ben).json() if x["id"] == p["id"]]
    assert got and got[0]["days"] == p["days"]


def test_create_invalid(ben):
    assert requests.post(f"{API}/programmes", headers=ben, json={"name": "x", "split": "nope"}).status_code == 422
    assert requests.post(f"{API}/programmes", headers=ben, json={"name": "", "split": "ppl"}).status_code == 422


def test_update_full_and_persist(ben):
    p = requests.post(f"{API}/programmes", headers=ben, json={"name": "TEST upd", "split": "ppl"}).json()
    d0 = p["days"][0]["id"]
    body = {"name": "TEST upd2", "schedule": "weekly", "priorities": {"Glutes": "primary", "Chest": "maintenance"},
            "days": [{"id": d0, "name": "Glutes A", "type": "training", "muscle_groups": ["Glutes", "Shoulders", "Abs & Core"],
                      "exercise_ids": ["romanian-deadlift", "bogus-ex", "seated-db-press", "romanian-deadlift"], "weekday": 0},
                     {"id": d0, "name": "Glutes B", "type": "training", "muscle_groups": ["Glutes"], "exercise_ids": ["back-squat"], "weekday": 2},
                     {"name": "Rest", "type": "rest", "muscle_groups": [], "exercise_ids": [], "weekday": None}]}
    r = requests.put(f"{API}/programmes/{p['id']}", headers=ben, json=body)
    assert r.status_code == 200, r.text
    got = [x for x in requests.get(f"{API}/programmes", headers=ben).json() if x["id"] == p["id"]][0]
    assert got["name"] == "TEST upd2" and got["schedule"] == "weekly"
    assert got["priorities"] == {"Glutes": "primary", "Chest": "maintenance"}
    assert got["days"][0]["exercise_ids"] == ["romanian-deadlift", "seated-db-press"]
    assert got["days"][0]["id"] == d0 and got["days"][1]["id"] != d0
    assert got["days"][0]["weekday"] == 0 and got["days"][2]["weekday"] is None and got["days"][2]["type"] == "rest"
    # reorder kept
    body["days"][0]["exercise_ids"] = ["seated-db-press", "romanian-deadlift"]
    requests.put(f"{API}/programmes/{p['id']}", headers=ben, json=body)
    got = [x for x in requests.get(f"{API}/programmes", headers=ben).json() if x["id"] == p["id"]][0]
    assert got["days"][0]["exercise_ids"] == ["seated-db-press", "romanian-deadlift"]


@pytest.mark.parametrize("patch", [
    {"priorities": {"Chest": "top"}}, {"priorities": {"Wings": "primary"}}, {"split": "nope"}, {"schedule": "monthly"},
    {"days": [{"name": "D", "muscle_groups": ["Wings"]}]}, {"days": [{"name": "D", "weekday": 7}]},
    {"days": [{"name": "D", "type": "nap"}]}, {"days": []}])
def test_update_invalid_422(ben, patch):
    pid = requests.get(f"{API}/plan", headers=ben).json()["id"]
    body = {"name": "TEST", "days": [{"name": "D"}], **patch}
    r = requests.put(f"{API}/programmes/{pid}", headers=ben, json=body)
    assert r.status_code == 422, f"{patch} -> {r.status_code} {r.text[:200]}"


@pytest.mark.parametrize("pri", [{"Chest": ["primary"]}, {"Chest": None}, {"Chest": 1}])
def test_update_priorities_bad_types(ben, pri):
    pid = requests.get(f"{API}/plan", headers=ben).json()["id"]
    r = requests.put(f"{API}/programmes/{pid}", headers=ben, json={"name": "TEST", "days": [{"name": "D"}], "priorities": pri})
    assert r.status_code == 422, f"{pri} -> {r.status_code} {r.text[:200]}"


def test_duplicate_activate_delete(ben):
    src = requests.post(f"{API}/programmes", headers=ben, json={"name": "TEST src", "split": "arnold"}).json()
    r = requests.post(f"{API}/programmes/{src['id']}/duplicate", headers=ben)
    assert r.status_code == 200
    dup = r.json()
    assert dup["name"] == "TEST src (copy)" and dup["active"] is False and dup["id"] != src["id"] and "_id" not in dup
    assert len(dup["days"]) == len(src["days"])
    assert not ({d["id"] for d in dup["days"]} & {d["id"] for d in src["days"]})
    assert [d["exercise_ids"] for d in dup["days"]] == [d["exercise_ids"] for d in src["days"]]
    # activate
    r = requests.post(f"{API}/programmes/{dup['id']}/activate", headers=ben)
    assert r.status_code == 200 and r.json()["active"] is True
    progs = requests.get(f"{API}/programmes", headers=ben).json()
    assert [p["id"] for p in progs if p["active"]] == [dup["id"]]
    assert requests.get(f"{API}/plan", headers=ben).json()["id"] == dup["id"]
    assert requests.get(f"{API}/me", headers=ben).json()["plan_name"] == "TEST src (copy)"
    # delete active -> another active
    assert requests.delete(f"{API}/programmes/{dup['id']}", headers=ben).status_code == 200
    progs = requests.get(f"{API}/programmes", headers=ben).json()
    assert dup["id"] not in {p["id"] for p in progs}
    assert sum(p["active"] for p in progs) == 1
    assert requests.delete(f"{API}/programmes/{dup['id']}", headers=ben).status_code == 404
    assert requests.post(f"{API}/programmes/nope/activate", headers=ben).status_code == 404
    assert requests.post(f"{API}/programmes/nope/duplicate", headers=ben).status_code == 404


def test_delete_last_blocked(ben):
    progs = requests.get(f"{API}/programmes", headers=ben).json()
    for p in progs[1:]:
        assert requests.delete(f"{API}/programmes/{p['id']}", headers=ben).status_code == 200
    left = requests.get(f"{API}/programmes", headers=ben).json()
    assert len(left) == 1 and left[0]["active"] is True
    assert requests.delete(f"{API}/programmes/{left[0]['id']}", headers=ben).status_code == 422


def test_add_day_exercise(ben):
    p = requests.get(f"{API}/plan", headers=ben).json()
    pid, d = p["id"], p["days"][0]
    url = f"{API}/programmes/{pid}/days/{d['id']}/exercises"
    new = "hip-thrust" if "hip-thrust" in {e["id"] for e in requests.get(f"{API}/exercises", headers=ben).json()} else "back-squat"
    r = requests.post(url, headers=ben, json={"exercise_id": new})
    assert r.status_code == 200
    ids = [x for x in r.json()["days"] if x["id"] == d["id"]][0]["exercise_ids"]
    assert ids[-1] == new and ids[:-1] == [i for i in d["exercise_ids"] if i != new]
    r2 = requests.post(url, headers=ben, json={"exercise_id": new}).json()
    assert [x for x in r2["days"] if x["id"] == d["id"]][0]["exercise_ids"].count(new) == 1
    assert requests.post(url, headers=ben, json={"exercise_id": "bogus"}).status_code == 422
    assert requests.post(f"{API}/programmes/{pid}/days/nope/exercises", headers=ben, json={"exercise_id": new}).status_code == 404


def test_isolation(ben, alex):
    ah, _ = alex
    apid = requests.get(f"{API}/plan", headers=ah).json()["id"]
    body = {"name": "HACK", "days": [{"name": "x"}]}
    assert requests.put(f"{API}/programmes/{apid}", headers=ben, json=body).status_code == 404
    assert requests.post(f"{API}/programmes/{apid}/duplicate", headers=ben).status_code == 404
    assert requests.post(f"{API}/programmes/{apid}/activate", headers=ben).status_code == 404
    # Ben has >=1 programme so delete reaches lookup
    requests.post(f"{API}/programmes", headers=ben, json={"name": "TEST iso", "split": "custom"})
    assert requests.delete(f"{API}/programmes/{apid}", headers=ben).status_code == 404
    assert requests.get(f"{API}/plan", headers=ah).json()["name"] != "HACK"


def test_put_plan_legacy_targets_active(ben):
    p = requests.get(f"{API}/plan", headers=ben).json()
    r = requests.put(f"{API}/plan", headers=ben, json={"name": "TEST legacy", "days": [{"name": "A", "exercise_ids": ["bench-press"]}]})
    assert r.status_code == 200 and r.json()["id"] == p["id"]
    d = r.json()["days"][0]
    assert d["muscle_groups"] == ["Chest"] and d["type"] == "training"
