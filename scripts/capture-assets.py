#!/usr/bin/env python3
"""Cache the original frontend's public assets; reruns reuse valid local files."""
import concurrent.futures
import datetime
import hashlib
import json
from pathlib import Path
import re
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "https://pokeroledex.nl"
PUBLIC = ROOT / "public"


def load(name):
    return json.loads((ROOT / "data/reference" / (name + ".json")).read_text())


def asset_paths():
    bundle = (ROOT / "recovery/original/app.js").read_text()
    pokemon, moves, items = load("pokemon-templates"), load("moves"), load("items")
    # Every original Pokémon image component supplies a literal mode.
    modes = set(re.findall(r'jsx\(Ba,\{[^}]*?type:"([a-z]+)"', bundle))
    paths = {f"/images/pokemon/{mode.capitalize()}Sprites/{p['image']}"
             for mode in modes for p in pokemon}
    paths.update(f"/images/item/{item['image']}" for item in items)
    types = {t for p in pokemon for t in p["types"]} | {m["type"] for m in moves}
    paths.update(f"/images/type/{t.lower()}.svg" for t in types)
    paths.update(f"/images/moveCategory/{m['category'].lower()}.png" for m in moves)
    paths.update(f"/images/move/{m['target'].lower()}.svg" for m in moves)
    literals = set(re.findall(r'"(/[^"\s]*\.(?:png|svg|ico|ttf))"', bundle))
    paths.update(p for p in literals if not p.endswith("Ball.png"))
    paths.update("/images/rank" + p for p in literals if p.endswith("Ball.png"))
    paths.update(("/fonts/Square.ttf", "/fonts/Prototype.ttf", "/favicon.ico"))
    return sorted(paths), sorted(modes)


def valid_asset(path, body):
    if path.endswith(".png"):
        return body.startswith(b"\x89PNG\r\n\x1a\n")
    if path.endswith(".svg"):
        return b"<svg" in body[:1000] and b"<html" not in body[:1000].lower()
    if path.endswith(".ttf"):
        return body[:4] in (b"\x00\x01\x00\x00", b"OTTO", b"true")
    if path.endswith(".ico"):
        return body.startswith(b"\x00\x00\x01\x00")
    return False


def capture(path):
    dest = PUBLIC / path.lstrip("/")
    result = {"path": path, "source": ORIGIN + urllib.parse.quote(path)}
    body = dest.read_bytes() if dest.exists() else b""
    try:
        if not valid_asset(path, body):
            request = urllib.request.Request(result["source"], headers={"User-Agent": "PokeRoleDex-local-recovery/1.0"})
            with urllib.request.urlopen(request, timeout=45) as response:
                body = response.read()
                if not valid_asset(path, body):
                    return {**result, "status": "missing", "reason": "Invalid asset response (including HTML fallback)", "contentType": response.headers.get("Content-Type")}
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(body)
        return {**result, "status": "saved", "bytes": len(body), "sha256": hashlib.sha256(body).hexdigest()}
    except (urllib.error.URLError, TimeoutError, OSError) as error:
        return {**result, "status": "missing", "reason": str(error)}


if __name__ == "__main__":
    paths, modes = asset_paths()
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for index, result in enumerate(pool.map(capture, paths), 1):
            results.append(result)
            if index % 250 == 0:
                print(f"Checked {index}/{len(paths)} assets", flush=True)
    saved = sum(r["status"] == "saved" for r in results)
    manifest = {"origin": ORIGIN, "capturedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "spriteModes": modes, "saved": saved, "missing": len(results) - saved, "assets": results}
    (ROOT / "recovery/asset-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Saved {saved}; missing {len(results) - saved}. See recovery/asset-manifest.json.")
