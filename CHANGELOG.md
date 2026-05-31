# Changelog

## 2026-06-01

- Tightened claim-review queue generation so provider-level source-fit findings
  only attach to matching claim values.
- Reduced the focused claim review queue from 2,389 items to 941 while keeping
  availability, referral, support tags, scope, and telehealth claims
  review-gated.
- Collapsed weak GP source corroboration from duplicate phone/sourceQuality rows
  into one source-check task per affected GP, reducing the focused claim queue
  again to 815 items.
- Targeted broad-tag findings in public text fields so unrelated `fit` and
  `specialties` values are no longer queued, reducing the focused claim queue
  again to 638 items.
- Added a dedicated GP source corroboration queue with 126 review-gated tasks
  for third-party/DoctorPricer GP records that still need stronger official or
  practice-owned website evidence.
- Regenerated evidence graph, claim queue, provider review queue, monitor queue,
  source-fit, availability, and referral reports.

Safety notes:

- This change does not mutate live provider data.
- Unsupported broad/sensitive tags are still queued for human review when the
  specific claim value or public text is affected.
- The next data-quality target is working through the GP corroboration queue or
  adding source excerpt capture for high-risk review claims.

## 2026-05-31

- Added a claim-level evidence graph for current provider records.
- Added provider claim scoring with risk, confidence, source owner/type, and
  advisory decisions.
- Added a focused claim review queue and CSV/Markdown exports with batch
  grouping.
- Added duplicate/shared-practice conflict detection.
- Added claim review queue support in the local auditor console.
- Added safe auto-resolution proposal exports for low-risk claim noise.
- Added auditor filters for review category and batch key.
- Added an auditor queue source for auto-resolution proposal groups.
- Deduplicated claim-batch provider samples so large batches show unique provider counts.
- Added a claim-batch decision draft helper for review-gated `needs_more_info`
  and safe array-value removal drafts.
- Added task, backlog, import strategy, and review queue reduction documents.

Safety notes:

- No live provider records are changed by the claim tools.
- High-risk claims remain review-gated.
- `accepting` availability and psychiatrist self-referral are not inferred from
  silence.
- Search snippets and public LinkedIn signals remain discovery-only.
