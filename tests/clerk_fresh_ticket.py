# Create a fresh +clerk_test user (for onboarding tests) and print {email, user_id, ticket}
import json, sys, uuid, urllib.request
from dotenv import dotenv_values
SK = dotenv_values("/app/backend/.env")["CLERK_SECRET_KEY"]


def bapi(path, body=None, method="POST"):
    req = urllib.request.Request("https://api.clerk.com/v1" + path, data=json.dumps(body).encode() if body is not None else None, method=method,
                                 headers={"Authorization": "Bearer " + SK, "Content-Type": "application/json", "User-Agent": "emergent-test"})
    return json.load(urllib.request.urlopen(req))


email = sys.argv[1] if len(sys.argv) > 1 else f"onbui{uuid.uuid4().hex[:6]}+clerk_test@example.com"
u = bapi("/users", {"email_address": [email], "password": "Test-pass-12345!", "skip_password_checks": True, "first_name": "Nova"})
print(json.dumps({"email": email, "user_id": u["id"], "ticket": bapi("/sign_in_tokens", {"user_id": u["id"], "expires_in_seconds": 3600})["token"]}))
