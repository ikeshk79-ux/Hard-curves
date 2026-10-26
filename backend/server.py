import os
import re
import uuid
import hmac
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta, date as date_cls
from typing import Dict, List, Optional

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, Depends, HTTPException, UploadFile, File, Form, Response, Request, BackgroundTasks
from starlette.concurrency import run_in_threadpool
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError
from zoneinfo import ZoneInfo, available_timezones

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

try:
    from backend.clerk_auth import clerk_router, require_user
    from backend.defaults import EXERCISES, EXERCISE_IDS, DEFAULT_DAYS, DEFAULT_PLAN_NAME, BODY_PARTS, SIDES, side_ok, MUSCLE_GROUPS
    from backend import storage, weekly
    from backend import programmes as prog
    from backend.stats import set_counts, workout_volume, best_loads, goal_progress, goal_key
    from backend.emailer import send_email, EmailUnavailable
except ModuleNotFoundError:
    from clerk_auth import clerk_router, require_user
    from defaults import EXERCISES, EXERCISE_IDS, DEFAULT_DAYS, DEFAULT_PLAN_NAME, BODY_PARTS, SIDES, side_ok, MUSCLE_GROUPS
    import storage
    import weekly
    import programmes as prog
    from stats import set_counts, workout_volume, best_loads, goal_progress, goal_key
    from emailer import send_email, EmailUnavailable

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

ROLES = ["admin", "member"]
DEFAULT_ROLE = "member"
RETIRED_ROLES = {}
RANK = {r: len(ROLES) - i for i, r in enumerate(ROLES)}
ENV = "live" if os.environ.get("CLERK_PUBLISHABLE_KEY", "").startswith("pk_live_") else "preview"
IN_ENV = {"env": {"$in": [ENV, None]}}
EX_BY_ID = {e["id"]: e for e in EXERCISES}
TIMEZONES = available_timezones()
DEFAULT_MODEL = "model5"
PHOTO_TYPES = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp", "heic": "image/heic", "heif": "image/heif"}
MAX_PHOTO_BYTES = 10 * 1024 * 1024


def looks_like_image(data: bytes) -> bool:
    return (data.startswith(b"\xff\xd8\xff") or data.startswith(b"\x89PNG")
            or (data[:4] == b"RIFF" and data[8:12] == b"WEBP") or data[4:8] == b"ftyp")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def effective_role(role) -> str:
    role = RETIRED_ROLES.get(role, role)
    return role if role in ROLES else DEFAULT_ROLE


def validate_date(value: str) -> str:
    try:
        d = date_cls.fromisoformat(value)
    except (ValueError, TypeError):
        raise HTTPException(status_code=422, detail="Enter a real date (YYYY-MM-DD)")
    if d > (datetime.now(timezone.utc) + timedelta(days=1)).date():
        raise HTTPException(status_code=422, detail="Date cannot be in the future")
    if d.year < 1950:
        raise HTTPException(status_code=422, detail="Date is too far in the past")
    return d.isoformat()


def _clerk_user(user_id: str) -> dict:
    r = requests.get(f"https://api.clerk.com/v1/users/{user_id}", timeout=10,
                     headers={"Authorization": f"Bearer {os.environ['CLERK_SECRET_KEY']}", "User-Agent": "emergent-app"})
    r.raise_for_status()
    return r.json()


def _identity(info: dict):
    admins = {e.strip().lower() for e in os.environ.get("ADMIN_EMAIL", "").split(",") if e.strip()}
    emails = info.get("email_addresses") or []
    primary = next((e for e in emails if e.get("id") == info.get("primary_email_address_id")), emails[0] if emails else {})
    is_admin = any(e["email_address"].lower() in admins and (e.get("verification") or {}).get("status") == "verified" for e in emails)
    name = " ".join(p for p in [info.get("first_name"), info.get("last_name")] if p) or (primary.get("email_address", "Athlete").split("@")[0])
    return primary.get("email_address", ""), name, is_admin


async def current_member(user: dict = Depends(require_user)) -> dict:
    uid = user["user_id"]
    member = await db.users.find_one({"user_id": uid}, {"_id": 0})
    now = now_iso()
    if member is None or not member.get("role"):
        email, name, is_admin = _identity(await run_in_threadpool(_clerk_user, uid))
        role = "admin" if is_admin else DEFAULT_ROLE
        await db.users.update_one({"user_id": uid, "role": {"$in": [None, ""]}}, {"$set": {"role": role}})
        member = await db.users.find_one_and_update(
            {"user_id": uid},
            {"$setOnInsert": {"user_id": uid, "role": role, "email": email, "name": name, "display_name": name,
                              "units": "metric", "height_unit": "cm", "model": DEFAULT_MODEL,
                              "onboarding_completed": False, "created_at": now, "updated_at": now}},
            upsert=True, projection={"_id": 0}, return_document=ReturnDocument.AFTER)
    await db.users.update_one({"user_id": uid}, {"$set": {"env": ENV, "last_active": now}})
    return {**member, "env": ENV, "last_active": now, "role": effective_role(member["role"])}


def require_role(*roles: str):
    async def check(member: dict = Depends(current_member)) -> dict:
        if member["role"] not in roles:
            raise HTTPException(status_code=403, detail="Not allowed")
        return member
    return check


async def touch(uid: str):
    await db.users.update_one({"user_id": uid}, {"$set": {"updated_at": now_iso()}})


async def get_plan(uid: str) -> dict:
    """The athlete's active programme; seeds the default one on first use."""
    plan = await db.plans.find_one({"user_id": uid, "active": True}, {"_id": 0})
    if plan:
        return plan
    other = await db.plans.find_one({"user_id": uid}, {"_id": 0}, sort=[("created_at", 1)])
    if other:
        await db.plans.update_one({"user_id": uid, "id": other["id"]}, {"$set": {"active": True}})
        return {**other, "active": True}
    now = now_iso()
    seed = {"user_id": uid, "name": DEFAULT_PLAN_NAME, "days": [prog.norm_day(d) for d in DEFAULT_DAYS], "active": True,
            "split": "custom", "schedule": "rotation", "priorities": {}, "created_at": now, "updated_at": now}
    await db.plans.update_one({"user_id": uid, "id": f"default-{uid}"}, {"$setOnInsert": seed}, upsert=True)
    return await db.plans.find_one({"user_id": uid, "id": f"default-{uid}"}, {"_id": 0})


def public_me(member: dict, plan: dict) -> dict:
    keys = ["user_id", "role", "email", "name", "display_name", "units", "created_at", "updated_at", "last_active", "timezone", "height_cm"]
    return {**{k: member.get(k) for k in keys}, "plan_name": plan["name"], "weekly_email": member.get("weekly_email", True),
            "height_unit": member.get("height_unit", "cm"), "model": member.get("model", DEFAULT_MODEL),
            # Accounts created before onboarding existed count as completed.
            "onboarding_completed": member.get("onboarding_completed", True)}


# ---------- Models ----------
class MeUpdate(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=60)
    units: Optional[str] = Field(None, pattern="^(metric|imperial)$")
    plan_name: Optional[str] = Field(None, min_length=1, max_length=60)
    timezone: Optional[str] = Field(None, max_length=64)
    weekly_email: Optional[bool] = None
    height_cm: Optional[float] = Field(None, ge=100, le=250)
    height_unit: Optional[str] = Field(None, pattern="^(cm|ftin)$")
    model: Optional[str] = Field(None, pattern="^(model5)$")
    onboarding_completed: Optional[bool] = None


class DayIn(BaseModel):
    id: Optional[str] = Field(None, max_length=40)
    name: str = Field(min_length=1, max_length=60)
    type: str = Field("training", pattern="^(training|rest)$")
    muscle_groups: Optional[List[str]] = Field(None, max_length=12)
    exercise_ids: List[str] = Field([], max_length=40)
    weekday: Optional[int] = Field(None, ge=0, le=6)


class PlanIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    days: List[DayIn] = Field(min_length=1, max_length=60)
    split: Optional[str] = None
    schedule: Optional[str] = Field(None, pattern="^(rotation|weekly)$")
    priorities: Optional[Dict[str, str]] = None


class ProgrammeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    split: str = "custom"


class DayExerciseIn(BaseModel):
    exercise_id: str


class SetIn(BaseModel):
    load: float = Field(0, ge=0, le=2000)
    reps: int = Field(0, ge=0, le=500)
    rir: Optional[float] = Field(None, ge=0, le=10)
    done: bool = False


class WorkoutExerciseIn(BaseModel):
    exercise_id: str
    sets: List[SetIn] = Field(min_length=1, max_length=50)


class WorkoutIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    date: str
    completed: bool = True
    day_id: Optional[str] = None
    exercises: List[WorkoutExerciseIn] = Field(min_length=1, max_length=30)


class MeasurementIn(BaseModel):
    body_part: str
    side: str
    value_cm: float = Field(gt=0, le=400)
    date: str
    flexed: bool = False
    pumped: bool = False
    notes: str = Field("", max_length=500)


class BulkEntry(BaseModel):
    body_part: str
    side: str
    value_cm: float = Field(gt=0, le=400)


class MeasurementBulkIn(BaseModel):
    date: str
    flexed: bool = False
    pumped: bool = False
    entries: List[BulkEntry] = Field(min_length=1, max_length=40)


class BodyWeightIn(BaseModel):
    weight_kg: float = Field(ge=25, le=350)
    date: str


# ---------- Athlete routes ----------
@api_router.get("/")
async def root():
    return {"message": "Hard Curves API"}


@api_router.get("/me")
async def get_me(member: dict = Depends(current_member)):
    return public_me(member, await get_plan(member["user_id"]))


@api_router.patch("/me")
async def update_me(body: MeUpdate, member: dict = Depends(current_member)):
    uid = member["user_id"]
    if body.timezone is not None and body.timezone not in TIMEZONES:
        raise HTTPException(status_code=422, detail="Unknown time zone")
    fields = {k: v.strip() if isinstance(v, str) else v for k, v in body.model_dump(exclude_none=True).items() if k != "plan_name"}
    if fields:
        await db.users.update_one({"user_id": uid}, {"$set": fields})
    if body.plan_name:
        plan = await get_plan(uid)
        await db.plans.update_one({"user_id": uid, "id": plan["id"]}, {"$set": {"name": body.plan_name.strip(), "updated_at": now_iso()}})
    await touch(uid)
    member = await db.users.find_one({"user_id": uid}, {"_id": 0})
    return public_me({**member, "role": effective_role(member.get("role"))}, await get_plan(uid))


@api_router.get("/exercises")
async def list_exercises(member: dict = Depends(current_member)):
    return EXERCISES


@api_router.get("/plan")
async def read_plan(member: dict = Depends(current_member)):
    return await get_plan(member["user_id"])


async def write_programme(uid: str, pid: str, body: PlanIn) -> dict:
    if body.split is not None and body.split not in prog.SPLITS:
        raise HTTPException(status_code=422, detail="Unknown split")
    pri = body.priorities or {}
    if any(k not in MUSCLE_GROUPS or v not in prog.PRIORITY_LEVELS for k, v in pri.items()):
        raise HTTPException(status_code=422, detail="Unknown muscle group or priority")
    if any(g not in MUSCLE_GROUPS for d in body.days for g in (d.muscle_groups or [])):
        raise HTTPException(status_code=422, detail="Unknown muscle group")
    days, seen = [], set()
    for d in body.days:
        nd = prog.norm_day(d.model_dump())
        if nd["id"] in seen:
            nd["id"] = prog.new_day_id()
        seen.add(nd["id"])
        days.append(nd)
    fields = {"name": body.name.strip(), "days": days, "priorities": pri, "updated_at": now_iso()}
    if body.split is not None:
        fields["split"] = body.split
    if body.schedule is not None:
        fields["schedule"] = body.schedule
    res = await db.plans.update_one({"user_id": uid, "id": pid}, {"$set": fields})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Programme not found")
    await touch(uid)
    return await db.plans.find_one({"user_id": uid, "id": pid}, {"_id": 0})


@api_router.put("/plan")
async def save_plan(body: PlanIn, member: dict = Depends(current_member)):
    plan = await get_plan(member["user_id"])
    return await write_programme(member["user_id"], plan["id"], body)


@api_router.get("/programmes")
async def list_programmes(member: dict = Depends(current_member)):
    await get_plan(member["user_id"])
    return await db.plans.find({"user_id": member["user_id"]}, {"_id": 0}).sort("created_at", 1).to_list(100)


@api_router.get("/splits")
async def list_splits(member: dict = Depends(current_member)):
    return [{"id": k, "label": v[0], "days": [n for n, _ in v[1]]} for k, v in prog.SPLITS.items()]


@api_router.post("/programmes")
async def create_programme(body: ProgrammeCreate, member: dict = Depends(current_member)):
    if body.split not in prog.SPLITS:
        raise HTTPException(status_code=422, detail="Unknown split")
    uid = member["user_id"]
    if await db.plans.count_documents({"user_id": uid}) >= 50:
        raise HTTPException(status_code=422, detail="You can keep up to 50 programmes")
    now = now_iso()
    doc = {"id": str(uuid.uuid4()), "user_id": uid, "name": body.name.strip(), "split": body.split, "schedule": "rotation",
           "priorities": {}, "days": prog.template_days(body.split), "active": False, "created_at": now, "updated_at": now}
    await db.plans.insert_one({**doc})
    await touch(uid)
    return doc


@api_router.put("/programmes/{pid}")
async def update_programme(pid: str, body: PlanIn, member: dict = Depends(current_member)):
    return await write_programme(member["user_id"], pid, body)


@api_router.post("/programmes/{pid}/duplicate")
async def duplicate_programme(pid: str, member: dict = Depends(current_member)):
    uid = member["user_id"]
    src = await db.plans.find_one({"user_id": uid, "id": pid}, {"_id": 0})
    if not src:
        raise HTTPException(status_code=404, detail="Programme not found")
    now = now_iso()
    doc = {**src, "id": str(uuid.uuid4()), "name": f"{src['name']} (copy)"[:60], "active": False,
           "days": [{**d, "id": prog.new_day_id()} for d in src["days"]], "created_at": now, "updated_at": now}
    await db.plans.insert_one({**doc})
    await touch(uid)
    return doc


@api_router.post("/programmes/{pid}/activate")
async def activate_programme(pid: str, member: dict = Depends(current_member)):
    uid = member["user_id"]
    if not await db.plans.find_one({"user_id": uid, "id": pid}):
        raise HTTPException(status_code=404, detail="Programme not found")
    await db.plans.update_many({"user_id": uid, "id": {"$ne": pid}}, {"$set": {"active": False}})
    await db.plans.update_one({"user_id": uid, "id": pid}, {"$set": {"active": True}})
    await touch(uid)
    return await db.plans.find_one({"user_id": uid, "id": pid}, {"_id": 0})


@api_router.delete("/programmes/{pid}")
async def delete_programme(pid: str, member: dict = Depends(current_member)):
    uid = member["user_id"]
    if await db.plans.count_documents({"user_id": uid}) <= 1:
        raise HTTPException(status_code=422, detail="Keep at least one programme")
    if (await db.plans.delete_one({"user_id": uid, "id": pid})).deleted_count == 0:
        raise HTTPException(status_code=404, detail="Programme not found")
    await get_plan(uid)
    await touch(uid)
    return {"ok": True}


@api_router.post("/programmes/{pid}/days/{day_id}/exercises")
async def add_day_exercise(pid: str, day_id: str, body: DayExerciseIn, member: dict = Depends(current_member)):
    """Append one exercise to a day (used by the muscle selector)."""
    if body.exercise_id not in EXERCISE_IDS:
        raise HTTPException(status_code=422, detail="Unknown exercise")
    res = await db.plans.update_one({"user_id": member["user_id"], "id": pid, "days.id": day_id},
                                    {"$addToSet": {"days.$.exercise_ids": body.exercise_id}, "$set": {"updated_at": now_iso()}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Day not found")
    await touch(member["user_id"])
    return await db.plans.find_one({"user_id": member["user_id"], "id": pid}, {"_id": 0})


@api_router.get("/workouts")
async def list_workouts(member: dict = Depends(current_member)):
    return await db.workouts.find({"user_id": member["user_id"]}, {"_id": 0}).sort([("date", -1), ("created_at", -1)]).to_list(2000)


@api_router.post("/workouts")
async def create_workout(body: WorkoutIn, member: dict = Depends(current_member)):
    uid = member["user_id"]
    for ex in body.exercises:
        if ex.exercise_id not in EXERCISE_IDS:
            raise HTTPException(status_code=422, detail="Unknown exercise")
    doc = {
        "id": str(uuid.uuid4()), "user_id": uid, "name": body.name.strip(), "date": validate_date(body.date),
        "completed": body.completed, "day_id": body.day_id, "created_at": now_iso(),
        "exercises": [{"exercise_id": ex.exercise_id, "name": EX_BY_ID[ex.exercise_id]["name"],
                       "muscle": EX_BY_ID[ex.exercise_id]["muscle"], "sets": [s.model_dump() for s in ex.sets]}
                      for ex in body.exercises],
    }
    doc["volume"] = workout_volume(doc)
    doc["set_count"] = sum(len(set_counts(ex["sets"])) for ex in doc["exercises"])
    prs = []
    if body.completed:
        previous = best_loads(await db.workouts.find({"user_id": uid, "completed": True}, {"_id": 0}).to_list(5000))
        for eid, rec in best_loads([doc]).items():
            if eid in previous and rec["load"] > previous[eid]["load"]:
                prs.append({**rec, "previous_load": previous[eid]["load"]})
    await db.workouts.insert_one({**doc})
    await touch(uid)
    return {"workout": doc, "prs": prs}


@api_router.delete("/workouts/{workout_id}")
async def delete_workout(workout_id: str, member: dict = Depends(current_member)):
    if (await db.workouts.delete_one({"id": workout_id, "user_id": member["user_id"]})).deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    await touch(member["user_id"])
    return {"ok": True}


@api_router.get("/records")
async def list_records(member: dict = Depends(current_member)):
    workouts = await db.workouts.find({"user_id": member["user_id"], "completed": True}, {"_id": 0}).to_list(5000)
    return sorted(best_loads(workouts).values(), key=lambda r: r["exercise_name"])


@api_router.get("/measurements")
async def list_measurements(member: dict = Depends(current_member)):
    return await db.measurements.find({"user_id": member["user_id"]}, {"_id": 0}).sort([("date", -1), ("created_at", -1)]).to_list(5000)


@api_router.post("/measurements")
async def create_measurement(body: MeasurementIn, member: dict = Depends(current_member)):
    if body.body_part not in BODY_PARTS or not side_ok(body.body_part, body.side):
        raise HTTPException(status_code=422, detail="That side doesn't fit this body part")
    doc = {"id": str(uuid.uuid4()), "user_id": member["user_id"], **body.model_dump(),
           "value_cm": round(body.value_cm, 2), "date": validate_date(body.date), "notes": body.notes.strip(), "created_at": now_iso()}
    await db.measurements.insert_one({**doc})
    await touch(member["user_id"])
    return doc


@api_router.post("/measurements/bulk")
async def create_measurements_bulk(body: MeasurementBulkIn, member: dict = Depends(current_member)):
    day = validate_date(body.date)
    if any(e.body_part not in BODY_PARTS or not side_ok(e.body_part, e.side) for e in body.entries):
        raise HTTPException(status_code=422, detail="That side doesn't fit this body part")
    if len({(e.body_part, e.side) for e in body.entries}) != len(body.entries):
        raise HTTPException(status_code=422, detail="Each body part and side can appear only once")
    now = now_iso()
    docs = [{"id": str(uuid.uuid4()), "user_id": member["user_id"], "body_part": e.body_part, "side": e.side,
             "value_cm": round(e.value_cm, 2), "date": day, "flexed": body.flexed, "pumped": body.pumped,
             "notes": "", "created_at": now} for e in body.entries]
    await db.measurements.insert_many([{**d} for d in docs])
    await touch(member["user_id"])
    return docs


@api_router.get("/body-weights")
async def list_body_weights(member: dict = Depends(current_member)):
    return await db.body_weights.find({"user_id": member["user_id"]}, {"_id": 0}).sort([("date", -1), ("created_at", -1)]).to_list(5000)


@api_router.post("/body-weights")
async def add_body_weight(body: BodyWeightIn, member: dict = Depends(current_member)):
    doc = {"id": str(uuid.uuid4()), "user_id": member["user_id"], "weight_kg": round(body.weight_kg, 2),
           "date": validate_date(body.date), "created_at": now_iso()}
    await db.body_weights.insert_one({**doc})
    await touch(member["user_id"])
    return doc


@api_router.delete("/body-weights/{wid}")
async def delete_body_weight(wid: str, member: dict = Depends(current_member)):
    if (await db.body_weights.delete_one({"id": wid, "user_id": member["user_id"]})).deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    await touch(member["user_id"])
    return {"ok": True}


@api_router.delete("/measurements/{mid}")
async def delete_measurement(mid: str, member: dict = Depends(current_member)):
    if (await db.measurements.delete_one({"id": mid, "user_id": member["user_id"]})).deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    await touch(member["user_id"])
    return {"ok": True}


PHOTO_FIELDS = {"_id": 0, "storage_path": 0}


@api_router.get("/photos")
async def list_photos(member: dict = Depends(current_member)):
    return await db.photos.find({"user_id": member["user_id"], "is_deleted": False}, PHOTO_FIELDS).sort([("date", -1), ("created_at", -1)]).to_list(2000)


@api_router.post("/photos")
async def upload_photo(file: UploadFile = File(...), date: str = Form(...), note: str = Form(""), member: dict = Depends(current_member)):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else ""
    if ext not in PHOTO_TYPES:
        raise HTTPException(status_code=422, detail="Use a JPG, PNG, WEBP or HEIC image")
    data = await file.read()
    if len(data) > MAX_PHOTO_BYTES:
        raise HTTPException(status_code=413, detail="Photo must be 10 MB or smaller")
    if not looks_like_image(data):
        raise HTTPException(status_code=422, detail="That file is not a valid image")
    day = validate_date(date)
    content_type = PHOTO_TYPES[ext]
    path = f"{storage.APP_NAME}/photos/{member['user_id']}/{uuid.uuid4()}.{ext}"
    try:
        result = await run_in_threadpool(storage.put_object, path, data, content_type)
    except requests.RequestException:
        logger.exception("Photo upload failed")
        raise HTTPException(status_code=502, detail="Photo storage is unavailable, try again")
    doc = {"id": str(uuid.uuid4()), "user_id": member["user_id"], "storage_path": result["path"], "content_type": content_type,
           "size": len(data), "date": day, "note": note.strip()[:300], "is_deleted": False, "created_at": now_iso()}
    await db.photos.insert_one({**doc})
    await touch(member["user_id"])
    return {k: v for k, v in doc.items() if k != "storage_path"}


@api_router.get("/photos/{photo_id}/file")
async def photo_file(photo_id: str, member: dict = Depends(current_member)):
    scope = {} if member["role"] == "admin" else {"user_id": member["user_id"]}
    rec = await db.photos.find_one({"id": photo_id, "is_deleted": False, **scope}, {"_id": 0})
    if not rec:
        raise HTTPException(status_code=404, detail="Not found")
    data, _ = await run_in_threadpool(storage.get_object, rec["storage_path"])
    return Response(content=data, media_type=rec["content_type"], headers={"Cache-Control": "private, max-age=3600"})


@api_router.delete("/photos/{photo_id}")
async def delete_photo(photo_id: str, member: dict = Depends(current_member)):
    res = await db.photos.update_one({"id": photo_id, "user_id": member["user_id"], "is_deleted": False}, {"$set": {"is_deleted": True}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    await touch(member["user_id"])
    return {"ok": True}


@api_router.get("/export")
async def export_data(member: dict = Depends(current_member)):
    uid = member["user_id"]
    plan = await get_plan(uid)
    return {
        "exported_at": now_iso(), "profile": public_me(member, plan), "plan": plan,
        "workouts": await db.workouts.find({"user_id": uid}, {"_id": 0}).to_list(5000),
        "measurements": await db.measurements.find({"user_id": uid}, {"_id": 0}).to_list(5000),
        "photos": await db.photos.find({"user_id": uid, "is_deleted": False}, PHOTO_FIELDS).to_list(2000),
        "goals": await db.goals.find({"user_id": uid}, {"_id": 0}).to_list(100),
        "programmes": await db.plans.find({"user_id": uid}, {"_id": 0}).to_list(100),
        "body_weights": await db.body_weights.find({"user_id": uid}, {"_id": 0}).to_list(5000),
    }


@api_router.post("/reset")
async def reset_data(member: dict = Depends(current_member)):
    uid = member["user_id"]
    await db.workouts.delete_many({"user_id": uid})
    await db.measurements.delete_many({"user_id": uid})
    await db.photos.update_many({"user_id": uid}, {"$set": {"is_deleted": True}})
    await db.plans.delete_many({"user_id": uid})
    await db.goals.delete_many({"user_id": uid})
    await db.body_weights.delete_many({"user_id": uid})
    await get_plan(uid)
    await touch(uid)
    return {"ok": True}


# ---------- Goals ----------
class GoalIn(BaseModel):
    body_part: str
    side: str
    flexed: bool = True
    pumped: bool = False
    target_cm: float = Field(gt=0, le=400)


@api_router.get("/goals")
async def list_goals(member: dict = Depends(current_member)):
    uid = member["user_id"]
    goals = await db.goals.find({"user_id": uid}, {"_id": 0}).sort("created_at", 1).to_list(100)
    measurements = await db.measurements.find({"user_id": uid}, {"_id": 0}).to_list(5000)
    return [goal_progress(g, measurements) for g in goals]


@api_router.post("/goals")
async def save_goal(body: GoalIn, member: dict = Depends(current_member)):
    if body.body_part not in BODY_PARTS or not side_ok(body.body_part, body.side):
        raise HTTPException(status_code=422, detail="That side doesn't fit this body part")
    uid = member["user_id"]
    match = {"user_id": uid, "body_part": body.body_part, "side": body.side, "flexed": body.flexed, "pumped": body.pumped}
    measurements = await db.measurements.find({"user_id": uid}, {"_id": 0}).to_list(5000)
    latest = sorted((m for m in measurements if goal_key(m) == goal_key(match)), key=lambda m: (m["date"], m["created_at"]))
    existing = await db.goals.find_one(match, {"_id": 0})
    doc = {**match, "target_cm": round(body.target_cm, 2),
           "start_cm": existing["start_cm"] if existing else (latest[-1]["value_cm"] if latest else None),
           "id": existing["id"] if existing else str(uuid.uuid4()),
           "created_at": existing["created_at"] if existing else now_iso()}
    await db.goals.update_one(match, {"$set": doc}, upsert=True)
    await touch(uid)
    return goal_progress(doc, measurements)


@api_router.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str, member: dict = Depends(current_member)):
    if (await db.goals.delete_one({"id": goal_id, "user_id": member["user_id"]})).deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    await touch(member["user_id"])
    return {"ok": True}


# ---------- Weekly email ----------
async def send_weekly(user: dict, now: datetime):
    subject, html = weekly.render_email(user, await weekly.build_summary(db, user, now))
    return await send_email(to=user["email"], subject=subject, html=html)


async def run_weekly_emails(now: datetime = None):
    now = now or datetime.now(timezone.utc)
    users = await db.users.find({**IN_ENV, "weekly_email": {"$ne": False}, "email": {"$nin": [None, ""]}}, {"_id": 0}).to_list(10000)
    for u in users:
        local = weekly.local_now(u, now)
        if local.weekday() != 6 or local.hour != 18:
            continue
        week = local.date().isoformat()
        claimed = await db.users.update_one({"user_id": u["user_id"], "last_weekly_email": {"$ne": week}}, {"$set": {"last_weekly_email": week}})
        if claimed.modified_count != 1:
            continue
        try:
            await send_weekly(u, now)
            logger.info(f"Weekly email sent to {u['user_id']}")
        except Exception:
            logger.exception(f"Weekly email failed for {u['user_id']}")
            await db.users.update_one({"user_id": u["user_id"]}, {"$set": {"last_weekly_email": None}})


@api_router.post("/cron/weekly-email")
async def cron_weekly_email(request: Request, background: BackgroundTasks):
    # Cron endpoints must ack 2xx immediately; enqueue/background the actual work.
    secret = os.environ.get("WEBHOOK_CRON_SECRET", "")
    auth = request.headers.get("authorization", "")
    if not secret or not auth.startswith("Bearer ") or not hmac.compare_digest(auth[7:].encode(), secret.encode()):
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        envelope = await request.json()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid body")
    run_id = request.headers.get("x-webhook-id") or (envelope.get("run_id") if isinstance(envelope, dict) else None)
    if not run_id:
        raise HTTPException(status_code=400, detail="Missing run id")
    try:
        await db.cron_runs.insert_one({"_id": str(run_id), "name": "weekly-email", "received_at": now_iso()})
    except DuplicateKeyError:
        return {"status": "duplicate"}
    background.add_task(run_weekly_emails)
    return {"status": "accepted"}


@api_router.post("/me/weekly-email/preview")
async def preview_weekly_email(member: dict = Depends(current_member)):
    last = member.get("last_preview_email")
    if last and datetime.fromisoformat(last) > datetime.now(timezone.utc) - timedelta(minutes=5):
        raise HTTPException(status_code=429, detail="You can send a preview once every 5 minutes")
    if not member.get("email"):
        raise HTTPException(status_code=422, detail="No email on your account")
    await db.users.update_one({"user_id": member["user_id"]}, {"$set": {"last_preview_email": now_iso()}})
    try:
        await send_weekly(member, datetime.now(timezone.utc))
    except (EmailUnavailable, ValueError):
        await db.users.update_one({"user_id": member["user_id"]}, {"$set": {"last_preview_email": None}})
        raise HTTPException(status_code=503, detail="Email is temporarily unavailable")
    return {"ok": True, "sent_to": member["email"]}


# ---------- Owner routes (read-only) ----------
async def env_user_ids() -> list:
    return [u["user_id"] for u in await db.users.find(IN_ENV, {"_id": 0, "user_id": 1}).to_list(10000)]


async def counts_by_user(collection, match: dict) -> dict:
    rows = await collection.aggregate([{"$match": match}, {"$group": {"_id": "$user_id", "n": {"$sum": 1}}}]).to_list(10000)
    return {r["_id"]: r["n"] for r in rows}


@api_router.get("/owner/stats")
async def owner_stats(admin: dict = Depends(require_role("admin"))):
    cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    ids = {"user_id": {"$in": await env_user_ids()}}
    return {
        "users": await db.users.count_documents(IN_ENV),
        "new_7d": await db.users.count_documents({**IN_ENV, "created_at": {"$gte": cutoff}}),
        "active_7d": await db.users.count_documents({**IN_ENV, "last_active": {"$gte": cutoff}}),
        "workouts": await db.workouts.count_documents(ids),
        "measurements": await db.measurements.count_documents(ids),
        "photos": await db.photos.count_documents({**ids, "is_deleted": False}),
    }


@api_router.get("/owner/athletes")
async def owner_athletes(q: str = "", admin: dict = Depends(require_role("admin"))):
    match = dict(IN_ENV)
    if q.strip():
        rx = {"$regex": re.escape(q.strip()), "$options": "i"}
        match = {"$and": [IN_ENV, {"$or": [{"display_name": rx}, {"email": rx}, {"name": rx}]}]}
    users = await db.users.find(match, {"_id": 0}).sort("last_active", -1).to_list(5000)
    ids = {"user_id": {"$in": [u["user_id"] for u in users]}}
    w, m, p = (await counts_by_user(db.workouts, ids), await counts_by_user(db.measurements, ids),
               await counts_by_user(db.photos, {**ids, "is_deleted": False}))
    return [{"user_id": u["user_id"], "display_name": u.get("display_name") or u.get("name"), "email": u.get("email"),
             "role": effective_role(u.get("role")), "created_at": u.get("created_at"), "last_active": u.get("last_active"),
             "workouts": w.get(u["user_id"], 0), "measurements": m.get(u["user_id"], 0), "photos": p.get(u["user_id"], 0)}
            for u in users]


@api_router.get("/owner/athletes/{user_id}")
async def owner_athlete(user_id: str, admin: dict = Depends(require_role("admin"))):
    u = await db.users.find_one({"user_id": user_id, **IN_ENV}, {"_id": 0})
    if not u:
        raise HTTPException(status_code=404, detail="Not found")
    workouts = await db.workouts.find({"user_id": user_id}, {"_id": 0}).sort([("date", -1), ("created_at", -1)]).to_list(5000)
    measurements = await db.measurements.find({"user_id": user_id}, {"_id": 0}).sort([("date", -1), ("created_at", -1)]).to_list(5000)
    photos = await db.photos.find({"user_id": user_id, "is_deleted": False}, PHOTO_FIELDS).sort([("date", -1), ("created_at", -1)]).to_list(2000)
    plan = await db.plans.find_one({"user_id": user_id, "active": True}, {"_id": 0})
    done = [w for w in workouts if w.get("completed")]
    return {
        "athlete": {"user_id": user_id, "display_name": u.get("display_name") or u.get("name"), "email": u.get("email"),
                    "units": u.get("units", "metric"), "created_at": u.get("created_at"), "last_active": u.get("last_active"),
                    "plan_name": plan["name"] if plan else DEFAULT_PLAN_NAME},
        "stats": {"workouts": len(workouts), "completed": len(done), "sets": sum(w.get("set_count", 0) for w in workouts),
                  "volume": sum(w.get("volume", 0) for w in done), "measurements": len(measurements), "photos": len(photos)},
        "measurements": measurements[:20], "workouts": workouts[:20], "photos": photos,
    }


app.include_router(api_router)
app.include_router(clerk_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    for old, new in RETIRED_ROLES.items():
        await db.users.update_many({"role": old}, {"$set": {"role": new}})
    await db.users.create_index("user_id", unique=True)
    now = now_iso()
    async for doc in db.plans.find({"id": {"$exists": False}}):
        await db.plans.update_one({"_id": doc["_id"], "id": {"$exists": False}}, {"$set": prog.legacy_fields(doc, now)})
    await db.plans.create_index([("user_id", 1), ("id", 1)], unique=True)
    await db.workouts.create_index([("user_id", 1), ("date", -1)])
    await db.measurements.create_index([("user_id", 1), ("date", -1)])
    await db.photos.create_index([("user_id", 1), ("date", -1)])
    await db.body_weights.create_index([("user_id", 1), ("date", -1)])
    await db.goals.create_index([("user_id", 1), ("body_part", 1), ("side", 1), ("flexed", 1), ("pumped", 1)], unique=True)
    try:
        await run_in_threadpool(storage.init_storage)
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
