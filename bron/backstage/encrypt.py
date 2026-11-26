# Backstage pass: encrypts the full texts behind the password, so the public repo only holds the teaser and an unreadable file.
#   BACKSTAGE_PASSWORD=... python3 bron/backstage/encrypt.py      -> site/backstage.json (then run bron/build.py)
# Texts: bron/backstage/content.json (NOT in git: it is the secret part; see .gitignore), else content.example.json (placeholders).
# Format: { "<problem id or part key p b m o r c>": { "title": "...", "paras": ["...", "..."] }, ... }
# Browser side: story.js (PBKDF2-SHA256 -> AES-GCM 256, WebCrypto). Needs https (or localhost): crypto.subtle is missing on plain http.
import json, os, sys, base64, secrets
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
HERE = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(os.path.dirname(HERE))
pw = os.environ.get("BACKSTAGE_PASSWORD") or sys.exit("set BACKSTAGE_PASSWORD")
src = os.path.join(HERE, "content.json"); src = src if os.path.exists(src) else os.path.join(HERE, "content.example.json")
items = json.load(open(src, encoding="utf-8"))
salt, ITER = secrets.token_bytes(16), 250000
key = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=ITER).derive(pw.encode())
b64 = lambda b: base64.b64encode(b).decode()
out = {"salt": b64(salt), "iter": ITER, "check": None, "items": {}}
def seal(obj): iv = secrets.token_bytes(12); return {"iv": b64(iv), "data": b64(AESGCM(key).encrypt(iv, json.dumps(obj).encode(), None))}
out["check"] = seal("ok")   # lets the page tell a wrong password from a missing text
for k, v in items.items(): out["items"][k] = seal(v)
json.dump(out, open(os.path.join(REPO, "site", "backstage.json"), "w")); print("site/backstage.json:", len(items), "texts from", os.path.basename(src))
