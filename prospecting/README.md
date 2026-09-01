# QuoteLoop prospecting worker

This folder contains a bounded, dry-run discovery and validation worker.

```bash
python3 prospecting/discover_osm.py
python3 prospecting/validate_osm.py
```

Outputs are intentionally ignored by Git because prospect lists may contain
business contact details and should remain local:

- `output/raw_osm.json` — sanitized source snapshot (incidental email/mobile/fax fields removed)
- `output/shortlist.csv` — original bounded shortlist
- `output/validated_candidates.csv` — current OSM object revalidation
- `output/validated_shortlist.csv` — current source-level no-website-tag signal
- `output/first_batch.csv` / `first_batch.md` — five candidates for human review
- `output/validation_report.json` — machine-readable counts

Important: an empty OSM website field is not proof that a business has no
website. Confirm identity, activity, official website, contact preference,
legal basis and suppression status before any manual outreach. This worker
never sends messages.
