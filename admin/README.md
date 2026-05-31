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

## Claim Review Queue

Run the claim-level evidence exports when the provider review queue feels too
large or repetitive:

```bash
npm run evidence:graph
npm run evidence:score
npm run evidence:conflicts
npm run export:claims
```

Then choose **Claim review queue** from the queue selector.

Claim items focus on one field at a time, such as `tags`, `availabilityStatus`,
`referralType`, `phone`, `address`, or `onlineAvailable`. The detail panel shows
the claim field, value, risk, score, batch key, source type, source owner, and
required human action.

Use claim batches to plan work:

- unsupported broad or sensitive tags: remove the tag or add source excerpts
- weak GP source: corroborate practice details against stronger sources
- availability: keep accepting only with explicit current wording
- referral: keep psychiatry GP-first unless self-referral is explicit
- location: add coordinates only from public professional addresses

The claim queue is advisory. It does not apply batch decisions to
`providers.json`; exported decisions still need the controlled apply script and
the normal validation suite.

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
