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
- Added GP source corroboration as a first-class auditor console queue with
  task-specific evidence rules, suggested searches, and normal review-decision
  export.
- Added a conservative filtered-batch helper in the auditor console for saving
  `needs_more_info` decisions on narrowed sets without overwriting individual
  decisions or approving provider data in bulk.
- Added a regional data-quality priority report that rolls provider coverage,
  weak GP source tasks, source-fit findings, availability/referral/watchlist
  signals, and address/coordinate gaps into reviewer-friendly regional actions.
- Added a Google Places discovery candidate exporter and auditor queue source.
  It uses the official Places API when a local key is supplied, stores no key
  material, and keeps all candidates review-gated.
- Fed Google Places candidates into the normal discovery seed pipeline and added
  capped seed-source website fetching for review-gated corroboration.
- Added incremental `--merge-existing` support for Places discovery and ran a
  bounded Northland psychiatry batch, producing 8 review-gated Places candidates
  and 11 discovery suggestions without live provider mutation.
- Hardened provider source-page extraction so closure/announcement headings do
  not become provider names and flattened team lists do not merge adjacent
  clinician names.
- Added exact-practice Google Places lookup support for the GP source
  corroboration queue, including target provider IDs and safeguards against
  broad matches on shared directory domains such as Healthpoint.
- Ran the exact GP source-corroboration queue across all 126 queued GP tasks,
  producing a cleaned review-gated Places export with 132 candidates and 100
  candidate websites before source enrichment.
- Hardened exact GP Places matching so target provider links require a real
  name, phone, or address signal, and stale exact-query results that match a
  different provider are filtered during merge.
- Added explicit provider review categories to the exported review queue, CSV,
  and Markdown report so the auditor filter can split GP corroboration, source
  conflicts, sensitive scope tags, availability, referral, location, directory
  contact, and Google Places discovery work.
- Regenerated evidence graph, claim queue, provider review queue, monitor queue,
  source-fit, availability, referral, and regional data-quality reports.

Safety notes:

- This change does not mutate live provider data.
- Unsupported broad/sensitive tags are still queued for human review when the
  specific claim value or public text is affected.
- The next data-quality target is working through the GP corroboration queue or
  using the regional priority report to choose the next focused verification
  batch.

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
