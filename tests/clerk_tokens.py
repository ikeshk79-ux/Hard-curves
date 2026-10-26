import os, json, sys, urllib.request
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")
SK = os.environ["CLERK_SECRET_KEY"]


def bapi(path, body=None, method="POST"):
    req = urllib.request.Request("https://api.clerk.com/v1" + path, data=json.dumps(body).encode() if body is not None else None, method=method,
                                 headers={"Authorization": "Bearer " + SK, "Content-Type": "application/json", "User-Agent": "emergent-test"})
    return json.load(urllib.request.urlopen(req))


def get_user(email, first):
    found = bapi(f"/users?email_address={urllib.parse.quote(email)}", method="GET")
    if found:
        return found[0]
    return bapi("/users", {"email_address": [email], "password": "Test-pass-12345!", "skip_password_checks": True, "first_name": first})


import urllib.parse
out = {}
for key, email, first in [("athlete", "athlete+clerk_test@example.com", "Alex"), ("owner", "owner+clerk_test@example.com", "Olivia"), ("athlete2", "athlete2+clerk_test@example.com", "Ben")]:
    u = get_user(email, first)
    s = bapi("/sessions", {"user_id": u["id"]})
    tok = bapi(f"/sessions/{s['id']}/tokens", {"expires_in_seconds": 3600})["jwt"]
    out[key] = {"user_id": u["id"], "token": tok, "email": email}
    if len(sys.argv) > 1 and sys.argv[1] == "tickets":
        out[key]["ticket"] = bapi("/sign_in_tokens", {"user_id": u["id"], "expires_in_seconds": 3600})["token"]
print(json.dumps(out))
