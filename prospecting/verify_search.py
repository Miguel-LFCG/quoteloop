#!/usr/bin/env python3
"""Bounded ordinary public-search verification for a dry-run shortlist.

This adds evidence for human review; it never upgrades a candidate to
verified_no_site and never contacts the business.
"""
import csv
import html
import json
import re
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

OUTPUT = Path(__file__).resolve().parent / "output"
BLOCKED_DOMAINS = {"facebook.com", "www.facebook.com", "instagram.com", "www.instagram.com", "yell.com", "www.yell.com", "checkatrade.com", "www.checkatrade.com", "mybuilder.com", "www.mybuilder.com", "trustatrader.com", "www.trustatrader.com", "yelp.com", "www.yelp.com", "google.com", "www.google.com"}

def strip_tags(value):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", value))).strip()

def results(text):
    found = []
    starts = [m.start() for m in re.finditer(r'<a rel="nofollow" class="result__a"', text, re.I)]
    for i, start in enumerate(starts[:5]):
        end = starts[i + 1] if i + 1 < len(starts) else len(text)
        block = text[start:end]
        a = re.search(r'href="([^"]+)"[^>]*>(.*?)</a>', block, re.S | re.I)
        if not a:
            continue
        snippet = re.search(r'class="result__snippet"[^>]*>(.*?)</(?:a|div)>', block, re.S | re.I)
        found.append({"title": strip_tags(a.group(2)), "url": html.unescape(a.group(1)), "snippet": strip_tags(snippet.group(1)) if snippet else ""})
    return found

def domain(url):
    try:
        return urllib.parse.urlparse(url).netloc.lower().split(":", 1)[0]
    except Exception:
        return ""

def main():
    rows = list(csv.DictReader((OUTPUT / "shortlist.csv").open(encoding="utf-8")))
    targets = [r for r in rows if r["verification_status"] == "no_site_signal"][:12]
    verified = []
    retrieved = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    for index, row in enumerate(targets):
        query = f'"{row["name"]}" {row["address"]} UK'
        url = "https://html.duckduckgo.com/html/?" + urllib.parse.urlencode({"q": query})
        req = urllib.request.Request(url, headers={"User-Agent": "QuoteLoop-research/0.1 (dry-run verification)"})
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                text = response.read().decode("utf-8", "replace")
            search_results = results(text)
            independent = [x for x in search_results if domain(x["url"]) and domain(x["url"]) not in BLOCKED_DOMAINS and "duckduckgo.com" not in domain(x["url"])]
            signal = "independent_domain_signal" if independent else ("directory_or_social_signal" if search_results else "no_search_result")
            error = ""
        except Exception as exc:
            search_results, independent, signal, error = [], [], "search_unavailable", str(exc)
        verified.append({"candidate_id": row["id"], "name": row["name"], "category": row["category"], "address": row["address"], "osm_status": row["verification_status"], "query": query, "search_url": url, "retrieved_at": retrieved, "search_signal": signal, "independent_result_count": len(independent), "results": search_results, "error": error, "review_status": "manual_review_required"})
        if index + 1 < len(targets):
            time.sleep(1.2)
    (OUTPUT / "search_verification.json").write_text(json.dumps({"retrieved_at": retrieved, "source_policy": "ordinary public DuckDuckGo HTML search, bounded to 12 queries", "outreach_performed": False, "records": verified}, indent=2), encoding="utf-8")
    with (OUTPUT / "search_verification.csv").open("w", newline="", encoding="utf-8") as f:
        fields = ["candidate_id", "name", "category", "address", "osm_status", "query", "search_url", "retrieved_at", "search_signal", "independent_result_count", "review_status", "error"]
        writer = csv.DictWriter(f, fieldnames=fields); writer.writeheader(); writer.writerows([{k: r[k] for k in fields} for r in verified])
    print(json.dumps({"retrieved_at": retrieved, "queried": len(verified), "signals": {s: sum(1 for r in verified if r["search_signal"] == s) for s in sorted({r["search_signal"] for r in verified})}, "records": [{k: r[k] for k in ["candidate_id", "name", "category", "search_signal", "independent_result_count", "review_status"]} for r in verified]}, indent=2))

if __name__ == "__main__":
    main()
