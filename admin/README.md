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
