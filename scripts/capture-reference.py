"""Refresh the public reference snapshot; never fetch hosted user sheets."""

import datetime
import hashlib
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "https://pokeroledex.nl"
DEST = ROOT / "data" / "reference"


def capture(path, body=None):
    request = urllib.request.Request(
        ORIGIN + "/api" + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


DEST.mkdir(parents=True, exist_ok=True)
counts = {}
for name in ("moves", "items", "abilities", "natures", "pokemon-templates"):
    if name == "pokemon-templates":
        records = capture("/pokemon-templates/filtered", {"campaignIds": [], "includeCore": True})
    else:
        records = capture("/" + name)
    (DEST / (name + ".json")).write_text(json.dumps(records, ensure_ascii=False) + "\n")
    counts[name] = len(records)
    print(f"{name}: {len(records)}")

ranks = ("STARTER", "ROOKIE", "STANDARD", "ADVANCED", "EXPERT", "ACE", "MASTER")
rank_data = {rank: capture("/rankup-attributes/" + rank) for rank in ranks}
(DEST / "rankup-attributes.json").write_text(json.dumps(rank_data, indent=2) + "\n")

manifest = {
    "capturedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "origin": ORIGIN,
    "counts": counts,
    "sha256": {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(DEST.glob("*.json"))},
}
(ROOT / "recovery" / "reference-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
