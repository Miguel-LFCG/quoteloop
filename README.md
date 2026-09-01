# QuoteLoop

A narrow, privacy-first quote follow-up board and founder-led setup offer for UK tradespeople.

## Product decision

QuoteLoop is **not** pretending to be a full CRM. The launch wedge is: "a two-minute daily list for the quotes that need a human follow-up". The free board stores quote data in the user's browser; the site stores only pilot applications and aggregate events.

Key operating docs: `research.md`, `founder-log.md`, `launch-plan.md`, `launch-checklist.md` and `customer-onboarding.md`.
The dry-run prospecting worker and local shortlist are under `prospecting/`.
Anonymous activation metrics are recorded by the app; `/root/.hermes/scripts/quoteloop_lead_watchdog.py` alerts on new pilot applications without sending replies.

## Run locally

```bash
npm test
PORT=18082 node server.mjs
curl -fsS http://127.0.0.1:18082/health
```

Open `http://127.0.0.1:18082/` and `http://127.0.0.1:18082/app`.

## Safe defaults

- `DRY_RUN=true` by design.
- No automated outreach, message sending, payment processing, or domain purchase.
- `ADMIN_TOKEN` is required for `/admin/leads`; never commit it.
- SQLite database is `data/quoteloop.sqlite` (override with `DB_PATH`).
- The pilot applications table is `data/quoteloop.sqlite` and is excluded from Git.
- To review submitted leads without printing the token: `curl -fsS "http://127.0.0.1:18082/admin/leads?token=$(sed -n 's/^ADMIN_TOKEN=//p' /root/.config/quoteloop.env)"`

## Routes

- `/` landing page, calculator, offer and pilot form
- `/app` free local-first quote board
- `/playbook` SEO-friendly free quote follow-up guide
- `/privacy` pilot data-collection note
- `/robots.txt` and `/sitemap.xml` acquisition metadata
- `/health` machine health and activation flags
- `/api/metrics` aggregate counts only
- `/admin/leads?token=...` private lead export, disabled until `ADMIN_TOKEN` exists

## What is deliberately not built yet

- No customer login or cloud quote storage
- No SMS/WhatsApp automation
- No payment integration
- No autonomous prospect outreach

Those are validation-dependent follow-ons, not launch prerequisites.
