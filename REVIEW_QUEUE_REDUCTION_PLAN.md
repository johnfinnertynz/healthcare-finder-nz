# Review Queue Reduction Plan

Updated: 2026-05-31

## Baseline

- Provider-level focused review queue: 513 items.
- Source-fit findings: 361.
- Availability findings: 3.
- Provider validation warnings: 0.
- Broken links in default link check: 0.
- Blocked-by-site links in default link check: 1.

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
- The focused claim queue contains 2,389 review-gated claim items grouped into
  58 batches.
- The auto-resolution proposal report identifies 1,449 low-risk claims in 31
  groups that can be de-prioritized from manual claim review dashboards without
  mutating live provider data.
- Claim-batch exports now report both total claim rows and unique affected
  provider counts, so repeated tags on one provider do not make a batch look
  larger than the human review workload.

This does not reduce the provider-level queue count yet because no reviewed
decisions were applied to live data. It does reduce the manual review burden by
turning repeated work into batch categories.

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
3. Corroborate weak GP records by practice-owned or official sources.
4. Add source excerpts to importers so future claims can move out of manual
   review faster.
5. Add a reviewed batch-decision generator once the first human claim review
   session proves the workflow.
6. Use `PROVIDER_AUTO_RESOLUTION_PROPOSALS.md` to hide low-risk claim noise and
   keep reviewer effort on high-risk batches.
7. Use the auditor console's **Auto-resolution proposals** queue source to
   review proposal groups without treating them as live provider records.
