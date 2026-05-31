# Review Queue Reduction Plan

Updated: 2026-06-01

## Baseline

- Provider-level focused review queue: 525 items.
- Focused claim-level review queue: 638 items in 53 batches.
- Dedicated GP source corroboration queue: 126 tasks.
- Source-fit findings: 361.
- Availability findings: 3.
- Provider validation warnings: 0.
- Broken links in default link check: 0.
- Blocked-by-site links in default link check: 1.
- Regional priority report: 18 regions reviewed, 9 high priority, 9 medium
  priority.

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
4. Add source excerpts to importers so future claims can move out of manual
   review faster.
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
10. Use the **Filtered batch** helper only for conservative `needs_more_info`
    triage, then export decisions and run the controlled apply/validation path.
11. Run `npm run export:regional-quality` after each review/apply cycle and use
    the high-priority regions to choose the next focused source research pass.
