#!/usr/bin/env python3
"""Revalidate an OSM shortlist by stable object ID; no outreach."""
import csv
import json
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

OUTPUT = Path(__file__).resolve().parent / "output"
BASE = "https://api.openstreetmap.org/api/0.6"

def fetch(row):
    url = f"{BASE}/{row['osm_type']}/{row['osm_id']}.json"
    req = urllib.request.Request(url, headers={"User-Agent": "QuoteLoop-research/0.1 (dry-run OSM validation)"})
    with urllib.request.urlopen(req, timeout=30) as response:
        return url, json.load(response)

def main():
    original = list(csv.DictReader((OUTPUT / "shortlist.csv").open(encoding="utf-8")))
    retrieved = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    checked = []
    for i, row in enumerate(original):
        record = dict(row)
        record["validation_retrieved_at"] = retrieved
        try:
            url, payload = fetch(row)
            elements = payload.get("elements", [])
            record["validation_source_url"] = url
            if not elements:
                record["validation_status"] = "not_found_current"
                record["validation_note"] = "Object API returned no elements."
            else:
                current = elements[0]
                tags = current.get("tags", {})
                current_name = str(tags.get("name", "")).strip()
                website = str(tags.get("contact:website") or tags.get("website") or tags.get("url") or "").strip()
                abandoned = any(str(tags.get(k, "")).lower() in {"yes", "true", "1"} for k in ["disused", "abandoned", "demolished", "removed:amenity"])
                record["current_name"] = current_name
                record["current_website_tag"] = website
                record["name_changed"] = bool(current_name and current_name != row["name"])
                record["validation_status"] = "website_now_present" if website else ("marked_closed_or_abandoned" if abandoned else ("name_changed" if record["name_changed"] else "current_osm_no_website_tag"))
                record["validation_note"] = "Current OSM object re-fetched; independent manual verification still required." if record["validation_status"] == "current_osm_no_website_tag" else "Review before any action."
        except urllib.error.HTTPError as exc:
            record["validation_source_url"] = f"{BASE}/{row['osm_type']}/{row['osm_id']}.json"
            record["validation_status"] = "not_found_current" if exc.code == 404 else "validation_unavailable"
            record["validation_note"] = f"OSM API HTTP {exc.code}; not treated as a prospect."
        except Exception as exc:
            record["validation_source_url"] = f"{BASE}/{row['osm_type']}/{row['osm_id']}.json"
            record["validation_status"] = "validation_unavailable"
            record["validation_note"] = f"Validation failed: {exc}"
        checked.append(record)
        if i + 1 < len(original):
            time.sleep(1.1)
    fields = list(original[0].keys()) + ["validation_retrieved_at", "validation_source_url", "current_name", "current_website_tag", "name_changed", "validation_status", "validation_note"] if original else []
    with (OUTPUT / "validated_candidates.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields); writer.writeheader(); writer.writerows(checked)
    actionable = [r for r in checked if r.get("validation_status") == "current_osm_no_website_tag"]
    with (OUTPUT / "validated_shortlist.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields); writer.writeheader(); writer.writerows(actionable)
    (OUTPUT / "validated_candidates.json").write_text(json.dumps(checked, indent=2), encoding="utf-8")
    report = {"retrieved_at": retrieved, "input_count": len(original), "validated_count": len(checked), "actionable_count": len(actionable), "status_counts": {status: sum(1 for r in checked if r.get("validation_status") == status) for status in sorted({r.get("validation_status") for r in checked})}, "source_policy": "OSM API object re-fetch by stable ID", "outreach_performed": False, "caveat": "current_osm_no_website_tag remains only a source-level signal; manual identity, activity, official website and lawful professional contact review is required."}
    (OUTPUT / "validation_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({"report": report, "actionable_top": [{k: r.get(k, "") for k in ["id", "name", "category", "address", "phone", "maps_url", "validation_status"]} for r in actionable[:20]]}, indent=2))

if __name__ == "__main__":
    main()
