# Provider Auditor Console

This is a local/static prototype for reviewing provider data. It is not a production admin system and it does not write to `providers.json`.

For the step-by-step human review process, start with `../AUDITOR_README.md`.

## Run

1. Generate a focused queue:

   ```bash
   npm run export:review
   ```

2. Serve the repo locally, then open `admin/index.html`.

   ```bash
   python -m http.server 4174
   ```

3. Review providers, save decisions locally in the browser, and export `provider-review-decisions.json`.

4. Place the exported file at `data/provider-review-decisions.json`, then apply it through the controlled script:

   ```bash
   npm run apply:review
   npm run validate:data
   npm run audit:source-fit
   npm run audit:availability
   npm run audit:referrals
   npm test
   ```

## Ongoing Monitor Queue

After the first audit, run future automated checks with:

```bash
npm run monitor:providers
```

This fetches provider/watchlist source pages cautiously, reruns availability
checks, and writes:

- `data/provider-monitor-queue.json`
- `data/provider-monitor-queue.csv`
- `PROVIDER_MONITOR_QUEUE.md`

Use the **Queue** selector in the admin console to switch from the manual review
queue to the ongoing monitor queue. Monitor items are still human review tasks:
do not change live provider data until a reviewer confirms the evidence and
exports/applies a decision.

## GP Source Corroboration Queue

Run the GP source queue when DoctorPricer or other third-party GP records need
stronger source evidence:

```bash
npm run export:gp-corroboration
```

This writes:

- `data/gp-source-corroboration-queue.json`
- `data/gp-source-corroboration-queue.csv`
- `GP_SOURCE_CORROBORATION_QUEUE.md`

Choose **GP source corroboration** from the queue selector. Each item is a
review task for one GP practice, not permission to change live data. The detail
view shows the current stored phone/address/website, suggested searches, and the
evidence policy for the task.

Acceptable evidence is a practice-owned page, Healthpoint listing/export, PHO,
Health NZ, HPI/FHIR, official clinic network page, or provider-owned booking or
enrolment page. Do not approve a GP contact record from a search-result snippet,
DoctorPricer alone, LinkedIn/social-only pages, blocked/private pages, or
name-based inference.

Keep this queue narrow. It can support corrections to public contact/location
and source-quality fields, but it must not be used to infer availability,
enrolment, mental-health specialty, cultural support, language support, or
funding eligibility.

## GP Corroboration Review Pack

After running Google Places or source-enrichment checks for GP records, export
the ranked review pack:

```bash
npm run export:gp-review-pack
```

Optional bounded source capture:

```bash
npm run export:gp-review-pack -- --fetch-sources --max-source-fetches 10 --rate-limit-ms 1000
```

This writes:

- `data/gp-corroboration-review-pack.json`
- `data/gp-corroboration-review-pack.csv`
- `GP_CORROBORATION_REVIEW_PACK.md`

Choose **GP corroboration review pack** from the queue selector. This view
groups the GP source-corroboration tasks that already have a likely
Healthpoint, practice-site, or clinic-network lead. It labels each item as
ready for source capture, manual compare conflict, or source lookup needed.
Use the **Source capture** filter to separate captured snippets from blocked,
failed, skipped, or not-yet-fetched source checks.

The pack can pre-fill draft public contact/source fields, but it is not an
approval. When exported with `--fetch-sources`, it may also pre-fill a short
source excerpt from public Healthpoint or practice pages. Open the source,
confirm the excerpt shows the same practice name and contact details, then
export a reviewed decision before applying anything. Login portals and Google
Maps-only leads are kept in source-lookup/manual review, not treated as source
evidence.

## Google Places Candidates

Run the Google Places exporter when the regional report shows thin local
coverage and you need likely clinic/business leads:

```bash
npm run discover:places -- --no-network
npm run discover:places -- --api-key-file "path/to/google-places-api-key.txt" --region Northland --type psychologist --limit-queries 2 --max-results-per-query 5
```

This writes:

- `data/discovery/google-places-provider-candidates.json`
- `data/discovery/google-places-provider-candidates.csv`
- `GOOGLE_PLACES_PROVIDER_CANDIDATES.md`

Choose **Google Places candidates** from the queue selector. Each item is a
lead, not an approved provider. Use the Maps link and website to find stronger
evidence such as the provider/practice website, Healthpoint, an official
register, or a professional directory. Do not approve clinical scope,
availability, cost, referral pathway, telehealth, or cultural/support tags from
Google Places alone.

## Regional Priorities

Run the regional report when deciding where the next review session should
start:

```bash
npm run export:regional-quality
```

This writes:

- `data/regional-data-quality-report.json`
- `REGIONAL_DATA_QUALITY_REPORT.md`

Choose **Regional priorities** from the queue selector. This is a planning-only
view: it shows each region's coverage signals, weak GP source task count,
source-fit findings, availability/referral/watchlist signals, address/coordinate
gaps, recommended actions, and sample records to inspect.

Use this view to decide which region and queue to work next. It disables
provider-decision export because a regional priority is not itself a provider
record. After choosing an action, switch to **Manual review queue**, **Claim
review queue**, **GP source corroboration**, **Google Places candidates**, or
**Ongoing monitor queue** and
filter by the same region or provider ID before saving review decisions.

## Claim Review Queue

Run the claim-level evidence exports when the provider review queue feels too
large or repetitive:

```bash
npm run evidence:graph
npm run evidence:score
npm run evidence:conflicts
npm run export:claims
npm run export:auto-resolution
```

Then choose **Claim review queue** from the queue selector for individual
field checks, or **Auto-resolution proposals** for the compressed proposal view.

Claim items focus on one field at a time, such as `tags`, `availabilityStatus`,
`referralType`, `phone`, `address`, or `onlineAvailable`. The detail panel shows
the claim field, value, risk, score, batch key, source type, source owner, and
required human action.

Batch summaries separate total claim rows from unique affected providers. A
single provider may create several tag or scope claims, so use provider count to
estimate the real review workload.

Use claim batches to plan work:

- unsupported broad or sensitive tags: remove the tag or add source excerpts
- weak GP source: corroborate practice details against stronger sources
- availability: keep accepting only with explicit current wording
- referral: keep psychiatry GP-first unless self-referral is explicit
- location: add coordinates only from public professional addresses

The console also includes a conservative **Filtered batch** helper. First narrow
the queue by batch, rule, category, search, region, type, severity, availability,
or referral status. For filtered sets of 100 items or fewer, the helper can save
`needs_more_info` decisions for unsaved items only. It does not overwrite
existing item decisions and it cannot apply `adjust`, `approve`, `reject`,
`duplicate`, or watchlist decisions in bulk.

The claim queue is advisory. It does not apply batch decisions to
`providers.json`; exported decisions still need the controlled apply script and
the normal validation suite.

After a batch has been reviewed, use `npm run draft:claim-batch` to generate a
draft decision file. The draft helper can mark a batch as `needs_more_info`, or
remove explicitly reviewed unsupported values from array fields. It does not add
high-risk claims and it does not write live data.

`npm run export:auto-resolution` writes
`PROVIDER_AUTO_RESOLUTION_PROPOSALS.md` and
`data/provider-auto-resolution-proposals.json`. Use that report to understand
which low-risk claim checks can be collapsed or hidden from manual dashboards
and which large batches still need human judgement. It is not an approval tool.

The admin console can now load the same JSON through **Auto-resolution
proposals**. Each row is a proposal group, not a provider record. Low-risk rows
show checks that may be de-prioritized from manual dashboards; manual-batch rows
show high-risk groups that still need a person. Saving a decision here is only a
local note until it is exported and applied through the controlled review flow.

## Discovery Suggestions

Provider discovery outputs also feed this review workflow:

```bash
npm run discover:seeds
node tools/enrich-provider-candidates.mjs --no-network --limit 20
npm run discover:suggest
npm run export:review
```

Discovery suggestions are not live data. They are candidate records or patches
with source links, extracted excerpts, confidence values, conflicts, and review
reasons. Review them like any other queue item. Open the source in a new tab,
confirm contact details and ranking-sensitive claims, adjust fields if needed,
then export a decision for the controlled apply script.

Search-result snippets and public LinkedIn signals are discovery/corroboration
only. Do not approve specialties, availability, cultural tags, telehealth, or
psychiatry self-referral from those sources alone.

## Multi-Clinician Practices

When one business has several clinicians, keep each clinician as a separate
provider record and reuse shared practice details only when the source supports
them. The **Same practice / related records** section compares practice name,
provider-owned website, phone, email domain, and address against live providers
and queue items.

Use **New clinician from this practice** to copy a draft JSON template for
another clinician at the same business. It is not a live write path. Fill in the
clinician name, clinician-specific scope, source evidence, availability, and
referral details before importing through the reviewed data workflow. The
template deliberately does not copy specialties, condition tags, or cultural
support tags from another clinician. If the selected record is a directory,
helpline, or service rather than an individual clinician, treat the template as
a prompt for manual research only.

## Decisions

- `approve`: confirm current data. This can only clear manual review flags when source evidence/review notes exist.
- `adjust`: apply safe `correctedFields`.
- `reject`: remove the provider from live provider data and preserve the action in the append-only log.
- `move_to_watchlist`: remove the provider from live recommendations and add/update the availability watchlist.
- `duplicate`: remove the duplicate and record `keptProviderId` in the review log.
- `needs_more_info`: leave provider data unchanged.

## Source Viewing

Use **Open primary source in new tab** for source review. The iframe is optional, sandboxed, and expected to fail on many provider websites. Do not proxy or bypass source-site restrictions.

## Safety

The UI downloads review decisions only. It does not contain secrets, authentication tokens, API keys, or direct production write paths. Production use needs a separate authenticated service and object-level authorization as documented in `ADMIN_SECURITY_MODEL.md`.
