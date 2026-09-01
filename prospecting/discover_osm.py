#!/usr/bin/env python3
"""Bounded, dry-run OSM prospect discovery for QuoteLoop.

This script records a source-level signal only. An empty OSM website field is
never treated as proof that a business has no website.
"""
import csv
import json
import re
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

BBOX = "53.30,-2.70,53.70,-1.85"  # North-West Manchester metro and adjacent towns
ENDPOINT = "https://overpass-api.de/api/interpreter"
CRAFTS = ("plumber", "electrician", "painter", "carpenter", "builder", "roofer")
CHAIN_WORDS = re.compile(r"\b(howdens|plumbase|city electrical factors|cef|travis perkins|toolstation|wickes|screwfix|jewson|selco|b&q|hss|gap group|ibbs?)\b", re.I)

def query():
    craft_pattern = "|".join(CRAFTS)
    return f'''[out:json][timeout:60];nwr[craft~"^({craft_pattern})$"]({BBOX});out center tags;'''

def fetch():
    body = urllib.parse.urlencode({"data": query()}).encode()
    req = urllib.request.Request(ENDPOINT, data=body, headers={"User-Agent": "QuoteLoop-research/0.1 (dry-run local-business research)"})
    with urllib.request.urlopen(req, timeout=90) as response:
        return json.load(response)

def value(tags, *keys):
    for key in keys:
        if tags.get(key):
            return str(tags[key]).strip()
    return ""

def address(tags):
    parts = [value(tags, "addr:housenumber"), value(tags, "addr:street"), value(tags, "addr:suburb"), value(tags, "addr:city"), value(tags, "addr:postcode")]
    return ", ".join(p for p in parts if p)

def normal(s):
    return re.sub(r"[^a-z0-9]+", "", s.lower())

def main():
    output = Path(__file__).resolve().parent / "output"
    output.mkdir(parents=True, exist_ok=True)
    retrieved = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    raw = fetch()
    raw_for_storage = json.loads(json.dumps(raw))
    for element in raw_for_storage.get("elements", []):
        for key in ["email", "contact:email", "fax", "contact:fax", "mobile", "contact:mobile"]:
            element.get("tags", {}).pop(key, None)
    (output / "raw_osm.json").write_text(json.dumps({"retrieved_at": retrieved, "endpoint": ENDPOINT, "query": query(), "data": raw_for_storage}, indent=2), encoding="utf-8")
    rows = []
    seen = set()
    for element in raw.get("elements", []):
        tags = element.get("tags", {})
        name = value(tags, "name")
        craft = value(tags, "craft").replace("_", " ").title()
        if not name or not craft or CHAIN_WORDS.search(name):
            continue
        center = element.get("center", {})
        lat = element.get("lat", center.get("lat", ""))
        lon = element.get("lon", center.get("lon", ""))
        key = (normal(name), round(float(lat), 4) if lat else "", round(float(lon), 4) if lon else "")
        if key in seen:
            continue
        seen.add(key)
        phone = value(tags, "contact:phone", "phone")
        website = value(tags, "contact:website", "website", "url")
        addr = address(tags)
        score_parts = {"public_phone": 2 if phone else 0, "address": 2 if addr else 0, "no_website_tag_signal": 2 if not website else -2, "opening_hours": 1 if value(tags, "opening_hours") else 0, "named_local_trade": 1}
        score = sum(score_parts.values())
        status = "no_site_signal" if not website else "possible_official_site"
        note = "OSM has no website/contact:website tag; this is not proof of no website." if not website else "OSM contains a website field; exclude from no-site outreach unless manually verified."
        rows.append({
            "id": f"osm-{element['type']}-{element['id']}", "name": name, "city": "North-West England (bbox)", "category": craft,
            "address": addr, "phone": phone, "website_tag": website, "opening_hours": value(tags, "opening_hours"),
            "osm_type": element["type"], "osm_id": element["id"], "lat": lat, "lon": lon,
            "maps_url": f"https://www.openstreetmap.org/{element['type']}/{element['id']}", "source_url": ENDPOINT,
            "retrieved_at": retrieved, "verification_status": status, "score": score,
            "qualification": "manual_review_required", "qualification_note": note,
            "score_components": json.dumps(score_parts, separators=(",", ":")),
        })
    rows.sort(key=lambda r: (-r["score"], r["name"].lower()))
    fields = ["id", "name", "city", "category", "address", "phone", "website_tag", "opening_hours", "osm_type", "osm_id", "lat", "lon", "maps_url", "source_url", "retrieved_at", "verification_status", "score", "qualification", "qualification_note", "score_components"]
    with (output / "shortlist.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    (output / "shortlist.json").write_text(json.dumps(rows, indent=2), encoding="utf-8")
    report = {
        "retrieved_at": retrieved, "campaign": {"geography": "North-West England search box around Manchester (includes adjacent towns)", "categories": list(CRAFTS), "limit": 60, "source_policy": "OpenStreetMap/Overpass only", "outreach_performed": False},
        "raw_count": len(raw.get("elements", [])), "exported_count": len(rows),
        "status_counts": {k: sum(1 for r in rows if r["verification_status"] == k) for k in ["no_site_signal", "possible_official_site"]},
        "source_caveat": "OSM website absence is a source-level signal only. Every candidate requires manual identity, activity, contact-channel and official-website verification before outreach.",
        "files": ["raw_osm.json", "shortlist.csv", "shortlist.json"],
    }
    (output / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({"report": report, "top_rows": rows[:10]}, indent=2))

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"discovery failed: {exc}", file=sys.stderr)
        raise
