# Review Queue Reduction Plan

Updated: 2026-06-01

## Baseline

- Provider-level focused review queue: 775 items after the bounded psychiatry
  Places/enrichment pass. The increase is intentional: new candidates are
  review-gated and are not live provider data.
- Focused claim-level review queue: 638 items in 53 batches.
- Dedicated GP source corroboration queue: 126 tasks.
- Source-fit findings: 361.
- Availability findings: 30.
- Provider validation warnings: 0.
- Broken links in default link check: 0.
- Blocked-by-site links in default link check: 1.
- Regional priority report: 18 regions reviewed, 12 high priority, 6 medium
  priority.
- First bounded source-fit evidence capture: 30 unsupported tag/telehealth
  findings checked; 6 source-support excerpts found, 4 review-gated safe-removal
  candidates, 17 human-browser-review items, and 3 skipped/too-large sources.

Top provider-level root causes:

| Root cause | Count |
| --- | ---: |
| Weak GP source | 126 |
| Missing address | 73 |
| Broad tag without source support | 63 |
| Weak telehealth evidence | 55 |
| Weak Maori evidence | 37 |
| Missing coordinates | 35 |
| Availability watchlist | 20 |

Current provider-level review categories:

| Review category | Count |
| --- | ---: |
| GP source corroboration | 251 |
| Location and distance evidence | 130 |
| Sensitive tag or scope evidence | 111 |
| Referral pathway review | 81 |
| Availability review | 77 |
| Google Places discovery | 50 |
| Needs quick human check | 41 |
| Directory/direct-contact confusion | 34 |

## Claim-Level Reduction Layer

This cycle added a separate claim review queue:

- Provider rows split into 32,548 field-level claims.
- 1,449 low-risk public contact, identity, or location claims were marked
  `auto_accept` in the advisory graph.
- The focused claim queue now contains 638 review-gated claim items grouped into
  53 batches.
- The auto-resolution proposal report identifies 1,449 low-risk claims in 31
  groups that can be de-prioritized from manual claim review dashboards without
  mutating live provider data.
- Claim-batch exports now report both total claim rows and unique affected
  provider counts, so repeated tags on one provider do not make a batch look
  larger than the human review workload.
- Provider-level broad-tag, weak telehealth, and weak cultural/support evidence
  findings are now value-aware in the claim graph. A weak telehealth finding
  queues telehealth/online claims instead of every tag on that provider; a
  broad-tag finding queues the named broad tag rather than unrelated tags.
- Weak GP source findings now queue one source-corroboration task per affected
  GP practice instead of separate phone and sourceQuality tasks for the same
  root cause.
- Broad-tag findings now attach to `fit`, `specialties`, or `needScope` only
  when that public text repeats the specific unsupported need claim.
- Reviewed claim batches can now produce draft decision JSON through
  `npm run draft:claim-batch`; this is still draft-only and must go through the
  controlled apply, validation, audit, and test path.
- Weak GP source records also have a dedicated queue via
  `npm run export:gp-corroboration`. It currently contains 126 practices, all
  missing a practice website while retaining a third-party/DoctorPricer source.
  The queue gives reviewers suggested searches and explicit evidence rules
  without mutating live data.
- The auditor console can now load the GP source corroboration queue directly.
  Each task is normalized into the same review-item shape as the manual,
  claim, proposal, and monitor queues, with task-specific instructions for
  acceptable evidence and discovery-only sources.
- The auditor console now has a conservative filtered-batch helper. It records
  `needs_more_info` for unsaved items in narrowed filtered sets, preserves
  existing decisions, and keeps all live data changes behind exported decisions
  plus the controlled apply workflow.
- `npm run export:regional-quality` now combines coverage, weak GP source
  tasks, source-fit findings, availability/referral/watchlist signals, and
  address/coordinate gaps into `REGIONAL_DATA_QUALITY_REPORT.md` so review
  batches can start with the highest-risk regions.
- Google Places candidates now feed into the normal discovery seed pipeline,
  and `discover:enrich -- --fetch-seed-sources` can inspect a capped number of
  known provider websites to collect review-gated source excerpts.
- A bounded Northland psychiatry Places run produced 8 review-gated business
  candidates and 11 discovery suggestions. Some are likely non-psychiatry
  services found by the query and must be confirmed or rejected by the auditor.
- Source-page extraction now avoids using closure/announcement headings as
  provider names and truncates title-prefixed clinician matches before they
  swallow adjacent team-list names.
- The Places discovery tool can now run exact GP source-corroboration lookups
  from `data/gp-source-corroboration-queue.json`, carry target provider IDs into
  review, and avoid broad identity matches from shared directory domains.
- The exact GP Places helper has now been run across all 126 GP
  source-corroboration tasks. The current cleaned Places export contains 132
  review-gated candidates, including 100 with candidate websites and 124 tied
  back to queued GP provider IDs. A capped GP seed-source fetch then produced
  99 discovery suggestions, 2 of which are update-existing-provider suggestions
  that still require auditor approval.
- Exact GP Places matching now rejects uncorroborated target results. A Places
  result must match the queued target by name, phone, or address; old/stale
  exact-query results that only matched a different provider are dropped during
  merge instead of being shown as provider corroboration.
- Provider review queue exports now include `reviewCategory` in JSON and CSV,
  plus a category summary in `PROVIDER_REVIEW_QUEUE.md`. This makes the
  auditor category filter actionable across GP corroboration, source conflicts,
  sensitive scope tags, availability, referral, location, directory/contact, and
  Google Places discovery work.
- `npm run export:gp-review-pack` now joins GP source-corroboration tasks to
  Places/Healthpoint/practice-site leads. It found 68 GP items ready for human
  source-excerpt capture, 18 manual compare conflicts, and 40 items still
  needing a source lookup. It also filters login portals out of the ready
  bucket.
- `npm run export:gp-review-pack -- --fetch-sources --max-source-fetches 10`
  can now capture a bounded set of short public source excerpts into the review
  pack. These snippets prefill auditor notes only; they do not approve contact,
  availability, enrolment, scope, cultural support, or funding claims.
- The source fetcher now distinguishes normal provider pages with login links
  from real login/challenge pages. A full ready-bucket GP capture fetched 68
  ready source leads and produced 64 prefilled excerpts, with 4 blocked/failed
  items left for human browser review.
- The auditor now includes a **Source capture** filter and source-capture badges
  so the captured GP snippets can be worked separately from blocked, failed,
  skipped, or not-fetched items.
- A bounded psychiatry discovery pass added 84 review-gated discovery
  suggestions. This intentionally increased the provider review queue from 675
  to 775 items because thin-region psychiatry leads are now explicit review
  work instead of silent gaps. None of these suggestions mutate live provider
  data.
- Places result typing is now conservative: `queryType` is stored separately
  from confirmed/suggested provider `type`, and psychiatry-query results that
  look like psychology, counselling, generic health, or unknown services stay
  `unknown` until stronger sources confirm the service type.
- Discovery identity matching now treats titled and likely clinician names as
  clinician identities before shared emails, phones, register domains, or
  practice websites. The latest psychiatry enrichment export has no candidate
  group with more than five possible provider IDs.
- The auditor can now load `data/discovery/provider-suggestions.json` as a
  focused **Discovery suggestions** queue. This lets a reviewer work the 84
  psychiatry suggestions directly without filtering through the full 775-item
  manual review queue.
- `npm run apply:review` can now import an approved new-provider discovery
  suggestion when the exported decision has `newProviderCandidate`, allowlisted
  fields, and human-captured source evidence. Google Places seed text, search
  snippets, LinkedIn-only signals, blocked pages, and missing evidence are
  rejected before `providers.json` changes.
- `npm run export:source-fit-capture` now fetches bounded source-fit findings
  and writes `data/provider-source-fit-evidence-capture.json`. It captures
  excerpts where a source appears to support a flagged broad/support/telehealth
  claim, and pre-fills conservative removal corrections where a reachable
  source does not support the claim. The auditor can load this as **Source-fit
  evidence capture**; all outcomes remain review-gated.
- `npm run draft:source-fit-capture` now converts human-reviewed safe-removal
  capture rows into merged draft decisions. It groups removals by provider so
  several unsupported tag removals cannot overwrite each other and re-add a
  removed tag.
- `npm run export:source-fit-capture -- --skip-existing --merge-existing` now
  supports resumable bounded capture. The next pass can keep earlier excerpts
  while checking new provider/rule/target rows instead of re-fetching the same
  first batch.

This does not reduce the provider-level queue count yet because no reviewed
decisions were applied to live data. It does reduce the manual review burden by
removing 1,751 noisy claim rows from the focused claim-review queue and turning
the remaining repeated work into batch categories. The provider-level queue can
grow slightly when new discovery candidates are added; those are intentionally
review-gated rather than published.

## Batch Priorities

1. Sensitive tag or scope evidence:
   - remove unsupported broad tags or add source-backed excerpts.
   - do not batch-approve sensitive tags without evidence.
2. GP source corroboration:
   - verify practice phone, website, and address against stronger sources.
   - batch by source/domain where possible.
3. Referral pathway review:
   - confirm psychiatrist GP/self/specialist referral wording.
   - keep unknown or GP-first when unsure.
4. Availability review:
   - keep `accepting` rare and excerpt-backed.
   - move unavailable providers to the watchlist.
5. Location and distance evidence:
   - geocode public addresses or suppress local distance ranking.
6. Directory/direct-contact confusion:
   - directories get website navigation only; no "use this contact" workflow.

## Safe Auto-Resolution Policy

Automatic resolution is advisory unless and until a reviewed apply workflow is
implemented.

Auto-accept is allowed only when all are true:

- field risk is low;
- field is public identity, contact, or location data;
- source type/owner is provider-owned, clinic-owned, Healthpoint, official, or
  official-register-like;
- no field-specific audit finding is attached;
- score is high enough for the configured threshold;
- the change does not alter availability, referral, scope, support tags,
  telehealth, provider type, cost, or crisis suitability.

## Next Steps

1. Use `npm run export:claims` and open the claim queue in the auditor.
2. Review the largest unsupported tag batches and remove unsupported tags first.
3. Run `npm run export:gp-corroboration` and corroborate weak GP records by
   practice-owned or official sources.
4. Continue bounded source-fit capture batches so unsupported tag claims either
   gain reviewer-checkable excerpts or become conservative removal candidates.
5. Add a reviewed batch-decision generator once the first human claim review
   session proves the workflow.
6. Use `PROVIDER_AUTO_RESOLUTION_PROPOSALS.md` to hide low-risk claim noise and
   keep reviewer effort on high-risk batches.
7. Use the auditor console's **Auto-resolution proposals** queue source to
   review proposal groups without treating them as live provider records.
8. Use `npm run draft:claim-batch` after a manual evidence check to turn a
   reviewed batch into a draft decision file.
9. Use the auditor console's **GP source corroboration** queue source to review
   weak GP records and capture stronger website/contact evidence before any
   live provider update.
10. Use the auditor console's **GP corroboration review pack** to start with
   ready-for-source-capture GP items after Places/source enrichment; rerun it
   with `--fetch-sources` for a small prefilled-excerpt batch when useful.
   The current export has 64 captured GP snippets ready for confirmation; use
   the **Source capture: captured** filter to isolate them.
11. Use the auditor console's **Discovery suggestions** queue to work the
    review-gated provider suggestions directly after `npm run discover:suggest`.
    Only import a new provider after capturing a provider-owned, Healthpoint,
    official, or professional source excerpt.
12. Use `npm run export:source-fit-capture -- --limit 30 --skip-existing --merge-existing`
    and the auditor's **Source-fit evidence capture** queue before manually
    opening every unsupported-tag item. Confirm source-support excerpts or apply conservative
    tag/telehealth removals through reviewed decisions only.
13. After checking safe-removal candidates, use
    `npm run draft:source-fit-capture -- --confirmed-human-review ...` to create
    merged draft decisions, inspect them, then run the controlled apply path.
14. Use the **Filtered batch** helper only for conservative `needs_more_info`
    triage, then export decisions and run the controlled apply/validation path.
15. Run `npm run export:regional-quality` after each review/apply cycle and use
    the high-priority regions to choose the next focused source research pass.
