import os
from html import escape
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

try:
    from backend.stats import best_loads, goal_progress, goal_key
except ModuleNotFoundError:
    from stats import best_loads, goal_progress, goal_key

KG_TO_LB = 2.20462


def _num(v: float) -> str:
    r = round(v, 1)
    return str(int(r)) if r == int(r) else f"{r:.1f}"


def fmt_len(cm: float, units: str) -> str:
    return f"{_num(cm / 2.54)} in" if units == "imperial" else f"{_num(cm)} cm"


def fmt_load(kg: float, units: str) -> str:
    return f"{_num(kg * KG_TO_LB)} lb" if units == "imperial" else f"{_num(kg)} kg"


def fmt_volume(kg: float, units: str) -> str:
    if units == "imperial":
        return f"{round(kg * KG_TO_LB):,} lb"
    return f"{kg / 1000:.2f} t" if kg >= 1000 else f"{round(kg)} kg"


def local_now(user: dict, now: datetime) -> datetime:
    try:
        return now.astimezone(ZoneInfo(user.get("timezone") or "UTC"))
    except Exception:
        return now.astimezone(ZoneInfo("UTC"))


async def build_summary(db, user: dict, now: datetime) -> dict:
    uid = user["user_id"]
    today = local_now(user, now).date()
    start = (today - timedelta(days=6)).isoformat()
    workouts = await db.workouts.find({"user_id": uid, "completed": True}, {"_id": 0}).to_list(5000)
    measurements = await db.measurements.find({"user_id": uid}, {"_id": 0}).to_list(5000)
    goals = await db.goals.find({"user_id": uid}, {"_id": 0}).to_list(100)

    week = [w for w in workouts if w["date"] >= start]
    before = best_loads([w for w in workouts if w["date"] < start])
    records = [{**r, "previous_load": before[eid]["load"]} for eid, r in best_loads(week).items()
               if eid in before and r["load"] > before[eid]["load"]]

    groups = {}
    for m in sorted(measurements, key=lambda m: (m["date"], m["created_at"])):
        groups.setdefault(goal_key(m), []).append(m)
    changes = []
    for key, entries in groups.items():
        recent = [m for m in entries if m["date"] >= start]
        older = [m for m in entries if m["date"] < start]
        if not recent:
            continue
        base = older[-1] if older else (recent[0] if len(recent) > 1 else None)
        changes.append({"label": f"{key[0]} · {key[1]} · {'flexed' if key[2] else 'unflexed'}{' · pumped' if key[3] else ''}",
                        "latest": recent[-1]["value_cm"], "delta": recent[-1]["value_cm"] - base["value_cm"] if base else None})

    return {
        "start": start, "end": today.isoformat(),
        "sessions": len(week), "sets": sum(w.get("set_count", 0) for w in week),
        "volume": sum(w.get("volume", 0) for w in week),
        "records": records, "changes": changes,
        "goals": [goal_progress(g, measurements) for g in goals],
    }


def _row(label: str, value: str) -> str:
    return (f'<tr><td style="padding:8px 0;border-bottom:1px solid #2B2E34;color:#8E949E;font-size:14px">{escape(label)}</td>'
            f'<td style="padding:8px 0;border-bottom:1px solid #2B2E34;color:#F3F4F6;font-size:14px;text-align:right;font-family:monospace">{escape(value)}</td></tr>')


def _section(title: str, rows: list, empty: str) -> str:
    body = "".join(rows) if rows else f'<tr><td style="padding:8px 0;color:#8E949E;font-size:14px">{escape(empty)}</td></tr>'
    return (f'<tr><td style="padding:20px 24px 0"><div style="color:#C8F169;font-size:12px;letter-spacing:2px;font-weight:bold;text-transform:uppercase">{escape(title)}</div>'
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0">{body}</table></td></tr>')


def render_email(user: dict, s: dict) -> tuple:
    units = user.get("units", "metric")
    name = user.get("display_name") or user.get("name") or "Athlete"
    brand = os.environ["EMAIL_FROM_NAME"]
    rec_rows = [_row(r["exercise_name"], f"{fmt_load(r['load'], units)} × {r['reps']} (was {fmt_load(r['previous_load'], units)})") for r in s["records"]]
    chg_rows = []
    for c in s["changes"]:
        delta = "" if c["delta"] is None else f" ({'+' if c['delta'] >= 0 else '−'}{fmt_len(abs(c['delta']), units)})"
        chg_rows.append(_row(c["label"], f"{fmt_len(c['latest'], units)}{delta}"))
    goal_rows = [_row(f"{g['body_part']} · {g['side']} → {fmt_len(g['target_cm'], units)}",
                      "Reached" if g["reached"] else (f"{g['percent']:.0f}% · now {fmt_len(g['current_cm'], units)}" if g["current_cm"] else "No matching entry yet"))
                 for g in s["goals"]]
    stats = (f'<tr><td style="padding:20px 24px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>'
             + "".join(f'<td style="background:#22252B;border-radius:10px;padding:12px;text-align:center;width:33%">'
                       f'<div style="color:#8E949E;font-size:11px;text-transform:uppercase;letter-spacing:1px">{escape(k)}</div>'
                       f'<div style="color:#F3F4F6;font-size:22px;font-weight:bold;font-family:monospace;margin-top:4px">{escape(v)}</div></td>'
                       for k, v in [("Sessions", str(s["sessions"])), ("Sets", str(s["sets"])), ("Volume", fmt_volume(s["volume"], units))])
             + "</tr></table></td></tr>")
    html = (
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#101113;padding:24px 0">'
        '<tr><td align="center"><table role="presentation" width="560" cellpadding="0" cellspacing="0" '
        'style="max-width:560px;width:100%;background:#181A1E;border:1px solid #2B2E34;border-radius:16px;font-family:Arial,Helvetica,sans-serif">'
        '<tr><td style="padding:24px 24px 0"><span style="display:inline-block;background:#C8F169;color:#171A12;font-weight:900;'
        'padding:4px 8px;border-radius:6px;font-size:13px;letter-spacing:1px">HARD CURVES</span></td></tr>'
        f'<tr><td style="padding:16px 24px 0;color:#F3F4F6;font-size:26px;font-weight:900;text-transform:uppercase">Your week, {escape(name)}</td></tr>'
        f'<tr><td style="padding:6px 24px 0;color:#8E949E;font-size:14px">{escape(s["start"])} to {escape(s["end"])}</td></tr>'
        + stats
        + _section("New records", rec_rows, "No new records this week. Next week is yours.")
        + _section("Measurement changes", chg_rows, "No measurements logged this week.")
        + (_section("Goals", goal_rows, "") if goal_rows else "")
        + f'<tr><td style="padding:24px;color:#8E949E;font-size:12px">Sent by {escape(brand)} every Sunday evening. '
          'You can turn this email off in Profile in the app.</td></tr>'
        '</table></td></tr></table>'
    )
    subject = f"Your {brand} week: {s['sessions']} session{'' if s['sessions'] == 1 else 's'}, {fmt_volume(s['volume'], units)}"
    return subject, html
