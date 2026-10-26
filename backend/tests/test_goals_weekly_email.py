# Hard Curves: Body part goals, profile timezone/weekly_email, cron weekly-email endpoint, preview email, export/reset
import json
import os
import subprocess
import uuid
from datetime import datetime, timedelta

import pytest
import requests
from dotenv import dotenv_values

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    for line in open("/app/frontend/.env"):
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip()
API = f"{BASE_URL.rstrip('/')}/api"
CRON_SECRET = dotenv_values("/app/backend/.env").get("WEBHOOK_CRON_SECRET")
TODAY = datetime.utcnow().date()


@pytest.fixture(scope="module")
def toks():
    return json.loads(subprocess.run(["python3", "/app/tests/clerk_tokens.py"], capture_output=True, text=True, check=True).stdout)


def H(toks, who):
    return {"Authorization": f"Bearer {toks[who]['token']}"}


@pytest.fixture(scope="module", autouse=True)
def ben_clean(toks):
    assert requests.post(f"{API}/reset", headers=H(toks, "athlete2")).status_code == 200
    yield
    requests.post(f"{API}/reset", headers=H(toks, "athlete2"))


def meas(toks, who, value, side="Right", flexed=True, pumped=False, part="Arms", day=None):
    r = requests.post(f"{API}/measurements", headers=H(toks, who), json={
        "body_part": part, "side": side, "value_cm": value, "date": (day or TODAY).isoformat(), "flexed": flexed, "pumped": pumped})
    assert r.status_code == 200, r.text
    return r.json()


# --- Goals auth ---
@pytest.mark.parametrize("method,path", [("get", "/goals"), ("post", "/goals"), ("delete", "/goals/x"),
                                         ("post", "/me/weekly-email/preview")])
def test_goals_require_auth(method, path):
    assert getattr(requests, method)(f"{API}{path}").status_code == 401


# --- Goal validation ---
@pytest.mark.parametrize("body", [
    {"body_part": "Toes", "side": "Right", "target_cm": 40},
    {"body_part": "Arms", "side": "Middle", "target_cm": 40},
    {"body_part": "Arms", "side": "Right", "target_cm": 0},
    {"body_part": "Arms", "side": "Right", "target_cm": -5},
    {"body_part": "Arms", "side": "Right", "target_cm": 500},
    {"body_part": "Arms", "side": "Right"},
])
def test_goal_validation(toks, body):
    assert requests.post(f"{API}/goals", headers=H(toks, "athlete2"), json=body).status_code == 422


# --- Goal progress from matching entries only ---
def test_goal_progress_matching_only(toks):
    h = H(toks, "athlete2")
    meas(toks, "athlete2", 40, day=TODAY - timedelta(days=10))
    meas(toks, "athlete2", 45, day=TODAY - timedelta(days=5))
    r = requests.post(f"{API}/goals", headers=h, json={"body_part": "Arms", "side": "Right", "flexed": True, "pumped": False, "target_cm": 50})
    assert r.status_code == 200
    g = r.json()
    assert g["start_cm"] == 45 and g["current_cm"] == 45 and g["percent"] == 0 and g["reached"] is False
    assert g["entries"] == 2 and isinstance(g["id"], str) and "_id" not in g
    # non-matching entries must not change progress
    meas(toks, "athlete2", 60, side="Left")
    meas(toks, "athlete2", 60, flexed=False)
    meas(toks, "athlete2", 60, pumped=True)
    meas(toks, "athlete2", 60, part="Thighs")
    goals = requests.get(f"{API}/goals", headers=h).json()
    assert len(goals) == 1
    assert goals[0]["current_cm"] == 45 and goals[0]["percent"] == 0 and goals[0]["entries"] == 2
    # matching entry moves progress
    meas(toks, "athlete2", 47)
    g = requests.get(f"{API}/goals", headers=h).json()[0]
    assert g["current_cm"] == 47 and g["percent"] == 40.0 and g["reached"] is False and g["entries"] == 3
    meas(toks, "athlete2", 51)
    g = requests.get(f"{API}/goals", headers=h).json()[0]
    assert g["reached"] is True and g["percent"] == 100.0


def test_goal_upsert_same_combo(toks):
    h = H(toks, "athlete2")
    before = requests.get(f"{API}/goals", headers=h).json()
    r = requests.post(f"{API}/goals", headers=h, json={"body_part": "Arms", "side": "Right", "flexed": True, "pumped": False, "target_cm": 55})
    assert r.status_code == 200
    after = requests.get(f"{API}/goals", headers=h).json()
    assert len(after) == len(before) == 1
    assert after[0]["id"] == before[0]["id"] and after[0]["target_cm"] == 55 and after[0]["start_cm"] == 45
    # different combo -> new goal, no matching entries
    r = requests.post(f"{API}/goals", headers=h, json={"body_part": "Arms", "side": "Left", "flexed": True, "pumped": True, "target_cm": 50})
    assert r.status_code == 200 and r.json()["start_cm"] is None and r.json()["current_cm"] is None and r.json()["reached"] is False
    assert len(requests.get(f"{API}/goals", headers=h).json()) == 2


def test_goal_isolation_and_delete(toks):
    h = H(toks, "athlete2")
    gid = requests.get(f"{API}/goals", headers=h).json()[0]["id"]
    alex_goal_ids = [g["id"] for g in requests.get(f"{API}/goals", headers=H(toks, "athlete")).json()]
    assert gid not in alex_goal_ids
    assert requests.delete(f"{API}/goals/{gid}", headers=H(toks, "athlete")).status_code == 404
    assert requests.delete(f"{API}/goals/{gid}", headers=h).status_code == 200
    assert gid not in [g["id"] for g in requests.get(f"{API}/goals", headers=h).json()]
    assert requests.delete(f"{API}/goals/{gid}", headers=h).status_code == 404


def test_goal_shrink_target(toks):
    # target below start (e.g. waist cut) - reached when current <= target
    h = H(toks, "athlete2")
    meas(toks, "athlete2", 90, part="Back", side="Midline", flexed=False)
    r = requests.post(f"{API}/goals", headers=h, json={"body_part": "Back", "side": "Midline", "flexed": False, "pumped": False, "target_cm": 80})
    assert r.status_code == 200
    meas(toks, "athlete2", 85, part="Back", side="Midline", flexed=False)
    g = [x for x in requests.get(f"{API}/goals", headers=h).json() if x["body_part"] == "Back"][0]
    assert g["percent"] == 50.0 and g["reached"] is False
    meas(toks, "athlete2", 79, part="Back", side="Midline", flexed=False)
    g = [x for x in requests.get(f"{API}/goals", headers=h).json() if x["body_part"] == "Back"][0]
    assert g["reached"] is True and g["percent"] == 100.0


# --- Export / reset ---
def test_export_includes_goals_and_reset_deletes(toks):
    h = H(toks, "athlete2")
    requests.post(f"{API}/goals", headers=h, json={"body_part": "Arms", "side": "Right", "target_cm": 50})
    ex = requests.get(f"{API}/export", headers=h).json()
    assert "goals" in ex and len(ex["goals"]) >= 1 and "_id" not in ex["goals"][0]
    assert "weekly_email" in ex["profile"]
    assert requests.post(f"{API}/reset", headers=h).status_code == 200
    assert requests.get(f"{API}/goals", headers=h).json() == []


# --- Profile timezone / weekly_email ---
def test_me_timezone_and_weekly_email(toks):
    h = H(toks, "athlete2")
    me = requests.get(f"{API}/me", headers=h).json()
    assert "weekly_email" in me and "timezone" in me
    r = requests.patch(f"{API}/me", headers=h, json={"timezone": "Not/AZone"})
    assert r.status_code == 422
    r = requests.patch(f"{API}/me", headers=h, json={"timezone": "Europe/London", "weekly_email": False})
    assert r.status_code == 200 and r.json()["timezone"] == "Europe/London" and r.json()["weekly_email"] is False
    me = requests.get(f"{API}/me", headers=h).json()
    assert me["timezone"] == "Europe/London" and me["weekly_email"] is False
    r = requests.patch(f"{API}/me", headers=h, json={"weekly_email": True, "timezone": "America/New_York"})
    assert r.json()["weekly_email"] is True and r.json()["timezone"] == "America/New_York"
    r = requests.patch(f"{API}/me", headers=h, json={"weekly_email": "notabool"})
    assert r.status_code == 422


def test_me_weekly_email_default_true(toks):
    # owner never toggled -> default true
    me = requests.get(f"{API}/me", headers=H(toks, "owner")).json()
    assert me["weekly_email"] in (True,)


# --- Cron ---
def test_cron_auth():
    url = f"{API}/cron/weekly-email"
    assert requests.post(url, json={"run_id": "x"}).status_code == 401
    assert requests.post(url, json={"run_id": "x"}, headers={"Authorization": "Bearer wrong"}).status_code == 401
    assert requests.post(url, json={"run_id": "x"}, headers={"Authorization": CRON_SECRET or ""}).status_code == 401


def test_cron_run_id_and_duplicate():
    assert CRON_SECRET, "WEBHOOK_CRON_SECRET missing"
    url = f"{API}/cron/weekly-email"
    h = {"Authorization": f"Bearer {CRON_SECRET}"}
    assert requests.post(url, json={}, headers=h).status_code == 400
    assert requests.post(url, data="notjson", headers={**h, "Content-Type": "application/json"}).status_code == 400
    rid = f"TEST_{uuid.uuid4().hex}"
    r = requests.post(url, json={"run_id": rid}, headers=h)
    assert r.status_code == 200 and r.json()["status"] == "accepted"
    r = requests.post(url, json={"run_id": rid}, headers=h)
    assert r.status_code == 200 and r.json()["status"] == "duplicate"
    rid2 = f"TEST_{uuid.uuid4().hex}"
    r = requests.post(url, json={}, headers={**h, "X-Webhook-Id": rid2})
    assert r.json()["status"] == "accepted"


# --- Preview email (once per user, then 429) ---
def test_preview_email_and_rate_limit(toks):
    h = H(toks, "athlete2")
    r = requests.post(f"{API}/me/weekly-email/preview", headers=h)
    assert r.status_code in (200, 429), r.text
    if r.status_code == 200:
        assert r.json()["sent_to"] == "athlete2+clerk_test@example.com"
    r2 = requests.post(f"{API}/me/weekly-email/preview", headers=h)
    assert r2.status_code == 429
