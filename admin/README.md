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

## Discovery Suggestions Queue

After running the discovery/enrichment flow, build review-gated suggestions:

```bash
npm run discover:suggest
```

This writes:

- `data/discovery/provider-suggestions.json`
- `data/discovery/provider-suggestions.csv`
- `PROVIDER_DISCOVERY_SUGGESTIONS.md`

Choose **Discovery suggestions** from the queue selector to inspect only the
proposed new-provider, existing-provider update, watchlist, and manual-research
items. This is useful after a focused Places/source-enrichment batch, such as
thin-region psychiatry discovery.

Treat these as suggestions, not approved data. Open the source links, confirm
the provider type, contact details, referral path, availability, and any
support-preference or specialty claims, then export a normal review decision.
For a new-provider suggestion, use **Approve** only after you have captured a
short source excerpt from a provider-owned, Healthpoint, official, or
professional source. The exported decision includes `newProviderCandidate: true`
and must be applied with `npm run apply:review`. The apply script rejects
Google Places seed text, search snippets, LinkedIn-only signals, blocked pages,
and missing evidence.

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

After checking captured GP rows, use the draft helper to create controlled
contact-only decisions:

```bash
npm run draft:gp-corroboration -- --confirmed-human-review --reviewer "Your name" --notes "Checked source; public contact/source fields match."
```

For failed source captures that need browser review, use:

```bash
npm run draft:gp-corroboration -- --decision needs_more_info --status failed --reviewer "Your name" --notes "Needs manual browser review."
```

The helper writes `data/gp-corroboration-decision-draft.json` and
`GP_CORROBORATION_DECISION_DRAFT.md`. It cannot approve availability,
enrolment, mental-health scope, cultural support, funding, or referral claims.

## Source-Fit Evidence Capture

Run a bounded source-fit capture when unsupported broad tags,
support-preference tags, or telehealth flags create repetitive review work:

```bash
npm run export:source-fit-capture -- --limit 30 --rate-limit-ms 1000
```

After the first batch, use the resumable form so the next bounded run keeps the
old excerpts and checks new rows:

```bash
npm run export:source-fit-capture -- --limit 30 --skip-existing --merge-existing --rate-limit-ms 1000
```

This writes:

- `data/provider-source-fit-evidence-capture.json`
- `data/provider-source-fit-evidence-capture.csv`
- `PROVIDER_SOURCE_FIT_EVIDENCE_CAPTURE.md`

Choose **Source-fit evidence capture** from the queue selector. Each row shows
the original source-fit finding, the public source URL, any captured short
excerpt, and prefilled conservative `correctedFields` when the source was
reachable but did not support the flagged claim.

Use **Adjust** only after checking the source and confirming the correction is a
downgrade, such as removing an unsupported tag or telehealth flag. Use
`needs_more_info` for blocked, skipped, failed, unclear, or mismatched sources.
Captured excerpts are review aids; they are not automatic approval for
specialties, support-preference tags, telehealth, availability, or referral
pathways.

For Māori, Pasifika, Asian, and Rainbow support-preference rows, the capture
tool intentionally avoids over-confident removals. If the provider name, source
URL, or stored public text has relevant identity cues but the fetch did not find
clear wording, the item appears as `needs_human_browser_review`. Open the source
in a browser and either add evidence, leave it as `needs_more_info`, or only
remove the tag when you are confident the public source does not support it.

For reviewed safe-removal candidates, prefer the source-fit draft helper over
hand-editing several individual decisions:

```bash
npm run draft:source-fit-capture -- --confirmed-human-review --reviewer "Your name" --notes "Checked source; unsupported claims should be removed."
```

The helper groups rows by provider before drafting `adjust` decisions. This
prevents one tag-removal row from re-adding another unsupported tag on the same
provider. Inspect the generated JSON/Markdown, then apply through
`npm run apply:review` only after the corrections are correct.

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

For new-provider suggestions, the apply script imports only approved decisions
with `newProviderCandidate: true`, allowlisted provider fields, and a
human-captured source excerpt. It fills safe defaults where needed, such as
verification dates, `not_published` availability, and psychiatrist baseline
scope metadata. It does not infer accepting availability, self-referral,
advertised specialties, cultural tags, telehealth, or broad condition tags.

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
