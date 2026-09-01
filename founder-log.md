# Founder log — QuoteLoop

## Assumption → Action → Evidence → Result → Next decision

### 1. Admin pain is revenue-adjacent for UK trades
- **Assumption:** A recurring follow-up/admin leak is more monetisable than a generic content product.
- **Action:** Researched official ONS construction statistics plus trade-industry research.
- **Evidence:** ONS reports 370,770 registered construction firms in Great Britain in Q3 2024.[10] Powered Now reports 277 hours lost to admin per year and 93% stress/anxiety; Electrical Times reports 5h20m/week spent on admin including quoting and chasing payments.[1][2]
- **Result:** Strong enough pain and market breadth to justify a bounded pilot.
- **Next decision:** Target independent trades and test a narrow workflow, not all business admin.

### 2. People pay for trade admin software, but the category is crowded
- **Assumption:** Existing paid products can validate willingness to pay without proving our product will win.
- **Action:** Checked official Tradify and Quote-Chaser pages.
- **Evidence:** Tradify lists £34/user/month and quote/invoice/email-tracking features; Quote-Chaser lists automatic quote follow-ups and £9.99/month.[3][4]
- **Result:** Market is real; generic CRM or quote reminder cloning is a poor wedge.
- **Next decision:** Build no-account/local-first board with human-in-the-loop messaging and founder-led setup.

### 3. Fast cash beats premature SaaS infrastructure
- **Assumption:** A £49 setup can reach first revenue faster than waiting for billing, authentication and telephony.
- **Action:** Built free board, calculator, landing page, pilot form, SQLite lead capture, product playbook and measurement endpoints.
- **Evidence:** Local tests pass; app handles adding, filtering, marking, deleting, copy-script, WhatsApp-link preparation and backup export.
- **Result:** Launch-ready validation asset exists, but no revenue has been claimed because no payment provider is configured.
- **Next decision:** Publish demo, recruit 10 tightly matched pilot applicants, then accept payment only after fit review.

### 4. Safety and privacy should be part of the wedge
- **Assumption:** A no-account workflow lowers adoption risk and avoids collecting customers' personal data.
- **Action:** Kept quote records in browser localStorage; server stores only consented pilot applications and aggregate events; automated outreach/payments disabled.
- **Evidence:** `/health` reports `dryRun:true`, `liveOutreach:false`, `paymentsEnabled:false`; code includes a honeypot, consent requirement, basic rate limit and private admin-token gate.
- **Result:** Safe dry-run pilot, not a disguised automation system.
- **Next decision:** Only add cloud sync or messaging after explicit user demand, consent, compliance review and a paying pilot.

### 5. Create the first manual-review acquisition batch
- **Assumption:** A small, evidence-backed queue is more useful than broad automated prospecting.
- **Action:** Queried a bounded North-West England search box around Manchester for six trade categories using OSM/Overpass, then re-fetched every object by stable ID through the OSM API.
- **Evidence:** The run returned 48 raw objects, retained 44 after transparent chain filtering, and revalidated all 44; 31 retained a current OSM no-website-tag signal and 13 had a website tag.[11]
- **Result:** A five-record first batch is ready locally, but every record remains manual-review-required; no outreach occurred.
- **Next decision:** Manually verify activity, identity, official website and lawful professional contact before sending at most one personalized invitation per approved prospect.

### 6. Measure activation without collecting quote data
- **Assumption:** Page views alone cannot tell whether QuoteLoop creates real workflow value; aggregate activation events are needed to distinguish curiosity from use.
- **Action:** Added anonymous event counters for quote added, follow-up script copied, quote won/lost, import and export. Added a five-minute no-agent watchdog that alerts only when a new pilot application appears; it reads the private admin token locally and never prints applicant emails.
- **Evidence:** The isolated API test accepted all five new event types and returned one count for each; the watchdog baseline ran with zero output and persisted an empty seen-ID state. The live service health response remains healthy with outreach and payments disabled.
- **Result:** QuoteLoop can now measure the key activation funnel without uploading quote contents, and new applications will be surfaced promptly.
- **Next decision:** Wait for real visitors and applicants. Continue only if users add real quotes, take follow-up actions and at least one qualified applicant accepts the £49 setup.

## Sources

[1] https://powerednow.com/resources/now-report
    > "93% of tradespeople report stress or anxiety."
    > "277hrs Lost to admin every year"
[2] https://www.electricaltimes.co.uk/93-of-uk-tradespeople-say-running-their-business-is-stressing-them-out-new-national-report-finds
    > "Business admin – quoting, invoicing and chasing payments – takes an average of five hours and 20 minutes a week"
    > "tradespeople are owed an average of £5,901 in unpaid invoices"
[3] https://www.tradifyhq.com/uk/pricing
    > "£34 per user/month"
    > "Instant Website £10 per month."
[4] https://quote-chaser.com
    > "Quote-Chaser automatically reminds you when to follow up quotations"
    > "Quote-Chaser Pro £ 9.99 / month"
[10] https://www.ons.gov.uk/businessindustryandtrade/constructionindustry/articles/constructionstatistics/latest — Construction statistics, Great Britain
    > "370,770 Value Added Tax (VAT) and Pay As You Earn (PAYE) registered construction firms were operating in the construction industry across Great Britain"
[11] https://overpass-api.de/api/interpreter — Overpass API source endpoint
    > ""name": "Industria Painting and Decorating""
