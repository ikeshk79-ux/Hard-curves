# Phase 1: onboarding, height/units/model profile fields, bulk measurements, body weights
import os
import json
import uuid
import urllib.request
import urllib.parse
import datetime
import pytest
import requests
from dotenv import dotenv_values

FRONT_ENV = dotenv_values("/app/frontend/.env")
BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or FRONT_ENV["REACT_APP_BACKEND_URL"]).rstrip("/")
API = f"{BASE_URL}/api"
SK = dotenv_values("/app/backend/.env")["CLERK_SECRET_KEY"]


def bapi(path, body=None, method="POST"):
    req = urllib.request.Request("https://api.clerk.com/v1" + path, data=json.dumps(body).encode() if body is not None else None,
                                 method=method, headers={"Authorization": "Bearer " + SK, "Content-Type": "application/json", "User-Agent": "emergent-test"})
    return json.load(urllib.request.urlopen(req))


def token_for(email, first, create=False):
    found = bapi(f"/users?email_address={urllib.parse.quote(email)}", method="GET")
    if found:
        u = found[0]
    elif create:
        u = bapi("/users", {"email_address": [email], "password": "Test-pass-12345!", "skip_password_checks": True, "first_name": first})
    else:
        pytest.skip(f"missing clerk user {email}")
    s = bapi("/sessions", {"user_id": u["id"]})
    return bapi(f"/sessions/{s['id']}/tokens", {"expires_in_seconds": 3600})["jwt"]


def client(tok):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {tok}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def fresh():
    email = f"onbtest{uuid.uuid4().hex[:6]}+clerk_test@example.com"
    return client(token_for(email, "Fresh", create=True))


@pytest.fixture(scope="module")
def alex():
    return client(token_for("athlete+clerk_test@example.com", "Alex"))


@pytest.fixture(scope="module")
def ben():
    return client(token_for("athlete2+clerk_test@example.com", "Ben"))


TODAY = datetime.date.today().isoformat()
FUTURE = (datetime.date.today() + datetime.timedelta(days=3)).isoformat()


# Auth
def test_unauth_401():
    assert requests.get(f"{API}/me").status_code == 401
    assert requests.get(f"{API}/body-weights").status_code == 401
    assert requests.post(f"{API}/measurements/bulk", json={}).status_code == 401


# New user defaults
def test_fresh_user_defaults(fresh):
    r = fresh.get(f"{API}/me")
    assert r.status_code == 200
    d = r.json()
    assert d["onboarding_completed"] is False
    assert d["height_unit"] == "cm" and d["model"] == "model5" and d["units"] == "metric"
    assert d["height_cm"] is None


# Existing user not forced into onboarding, data intact
def test_existing_user_completed_and_data(alex):
    d = alex.get(f"{API}/me").json()
    assert d["onboarding_completed"] is True
    for path in ["workouts", "measurements", "photos", "goals", "plan"]:
        r = alex.get(f"{API}/{path}")
        assert r.status_code == 200, path
    assert len(alex.get(f"{API}/workouts").json()) > 0


# PATCH /me validation
@pytest.mark.parametrize("payload", [{"height_cm": 50}, {"height_cm": 99.9}, {"height_cm": 250.1}, {"height_unit": "in"},
                                     {"model": "model1"}, {"units": "si"}])
def test_me_patch_invalid(fresh, payload):
    assert fresh.patch(f"{API}/me", json=payload).status_code == 422


def test_me_patch_onboarding_persist(fresh):
    r = fresh.patch(f"{API}/me", json={"height_cm": 175.3, "height_unit": "ftin", "units": "imperial", "model": "model5", "onboarding_completed": True})
    assert r.status_code == 200
    d = fresh.get(f"{API}/me").json()
    assert d["height_cm"] == 175.3 and d["height_unit"] == "ftin" and d["units"] == "imperial"
    assert d["onboarding_completed"] is True and d["model"] == "model5"
    # switching unit keeps height
    fresh.patch(f"{API}/me", json={"height_unit": "cm"})
    d = fresh.get(f"{API}/me").json()
    assert d["height_cm"] == 175.3 and d["height_unit"] == "cm"
    for v in (100, 250):
        assert fresh.patch(f"{API}/me", json={"height_cm": v}).status_code == 200


# Bulk measurements
def test_bulk_measurements(fresh):
    entries = [{"body_part": "Neck", "side": "Midline", "value_cm": 15 * 2.54},
               {"body_part": "Arms", "side": "Left", "value_cm": 38.1},
               {"body_part": "Arms", "side": "Right", "value_cm": 39.0},
               {"body_part": "Glutes", "side": "Midline", "value_cm": 100}]
    r = fresh.post(f"{API}/measurements/bulk", json={"date": TODAY, "flexed": False, "pumped": True, "entries": entries})
    assert r.status_code == 200, r.text
    docs = r.json()
    assert len(docs) == 4 and all(d["flexed"] is False and d["pumped"] is True and d["date"] == TODAY for d in docs)
    stored = fresh.get(f"{API}/measurements").json()
    neck = [m for m in stored if m["body_part"] == "Neck"][0]
    assert neck["value_cm"] == 38.1 and neck["side"] == "Midline"
    sides = {(m["body_part"], m["side"]) for m in stored}
    assert ("Arms", "Left") in sides and ("Arms", "Right") in sides


@pytest.mark.parametrize("payload", [
    {"date": TODAY, "entries": [{"body_part": "Toes", "side": "Midline", "value_cm": 10}]},
    {"date": TODAY, "entries": [{"body_part": "Neck", "side": "Up", "value_cm": 10}]},
    {"date": FUTURE, "entries": [{"body_part": "Neck", "side": "Midline", "value_cm": 10}]},
    {"date": "2025-02-30", "entries": [{"body_part": "Neck", "side": "Midline", "value_cm": 10}]},
    {"date": TODAY, "entries": []},
    {"date": TODAY, "entries": [{"body_part": "Neck", "side": "Midline", "value_cm": 0}]},
])
def test_bulk_invalid(fresh, payload):
    assert fresh.post(f"{API}/measurements/bulk", json=payload).status_code in (400, 422)


# Body weights
def test_body_weights_crud_and_isolation(fresh, ben):
    for bad in (10, 24.9, 351):
        assert fresh.post(f"{API}/body-weights", json={"weight_kg": bad, "date": TODAY}).status_code == 422
    assert fresh.post(f"{API}/body-weights", json={"weight_kg": 70, "date": FUTURE}).status_code in (400, 422)
    r = fresh.post(f"{API}/body-weights", json={"weight_kg": 68.456, "date": "2025-12-01"})
    assert r.status_code == 200
    w1 = r.json()
    assert w1["weight_kg"] == 68.46
    w2 = fresh.post(f"{API}/body-weights", json={"weight_kg": 67, "date": TODAY}).json()
    lst = fresh.get(f"{API}/body-weights").json()
    assert [w["id"] for w in lst][:2] == [w2["id"], w1["id"]]
    assert all(w["id"] not in (w1["id"], w2["id"]) for w in ben.get(f"{API}/body-weights").json())
    assert ben.delete(f"{API}/body-weights/{w1['id']}").status_code == 404
    assert fresh.delete(f"{API}/body-weights/{w1['id']}").status_code == 200
    assert w1["id"] not in [w["id"] for w in fresh.get(f"{API}/body-weights").json()]
    assert fresh.delete(f"{API}/body-weights/{w1['id']}").status_code == 404


# Export and reset
def test_export_and_reset(fresh):
    ex = fresh.get(f"{API}/export").json()
    assert "body_weights" in ex and len(ex["body_weights"]) >= 1
    assert ex["profile"]["height_cm"] is not None
    assert fresh.post(f"{API}/reset").status_code == 200
    assert fresh.get(f"{API}/body-weights").json() == []
    assert fresh.get(f"{API}/measurements").json() == []
    d = fresh.get(f"{API}/me").json()
    assert d["height_cm"] is not None and d["onboarding_completed"] is True and d["height_unit"] == "cm"
