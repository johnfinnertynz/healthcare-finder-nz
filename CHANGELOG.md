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
- Added a GP corroboration review pack that ranks exact GP Places/Healthpoint
  and practice-site leads into ready source-capture, manual compare conflict,
  and source-lookup-needed buckets. The auditor can load it directly, and login
  portals are not treated as source evidence.
- Added optional bounded source fetching for the GP corroboration review pack.
  It can prefill short Healthpoint/practice-page excerpts for human auditors,
  while keeping all changes review-gated and preventing live provider mutation.
- Tightened source-fetch login detection so public provider pages with ordinary
  login navigation are not falsely treated as blocked. The current GP review
  pack now has captured snippets for 64 of 68 ready GP source leads; the
  remaining 4 are marked blocked or failed for human browser review.
- Added an auditor **Source capture** filter and queue badges for captured,
  blocked, failed, skipped, not-fetched, and prefilled source evidence states.
- Added a dedicated auditor **Discovery suggestions** queue for
  `data/discovery/provider-suggestions.json`, so review-gated new-provider and
  existing-provider update suggestions can be worked without filtering the full
  manual review queue.
- Added a controlled reviewed new-provider import path to `npm run
  apply:review`. It requires an approved discovery-suggestion decision,
  allowlisted provider fields, `newProviderCandidate`, and human-captured source
  evidence; discovery snippets, blocked pages, and Google Places seed text are
  still rejected.
- Added `npm run export:source-fit-capture` and an auditor **Source-fit evidence
  capture** queue. The first bounded batch checked 30 unsupported
  tag/telehealth findings, captured 6 source-support excerpts, and produced 4
  review-gated safe-removal candidates without mutating live data.
- Added `npm run draft:source-fit-capture`, a confirmed-human-review helper
  that merges safe-removal candidates by provider before drafting `adjust`
  decisions. This prevents one tag-removal decision from re-adding another
  unsupported tag on the same provider.
- Made source-fit evidence capture resumable with `--skip-existing` and
  `--merge-existing`, so bounded runs can preserve earlier excerpts and move on
  to new unsupported tag/support/telehealth findings without live data changes.
- Tightened source-fit capture for support-preference tags: if a Māori,
  Pasifika, Asian, or Rainbow row has public identity cues but the automated
  fetch misses explicit wording, it now goes to human browser review instead of
  being labelled a safe-removal candidate.
- Expanded the source-fit capture export to 140 checked findings. The current
  review file has 14 captured support excerpts, 28 review-gated safe-removal
  candidates, 88 human-browser-review rows, 8 skipped sources, and 2 failed
  fetches.
- Added source-fit capture batch keys and a batch summary so auditors can filter
  repeated unsupported tag/support/telehealth issues by
  `source-fit:<status>:<rule>:<target>` in the console.
- Ran the next resumable source-fit capture batch. The current review file now
  covers 220 findings with 33 captured support excerpts, 62 review-gated
  safe-removal candidates, 109 human-browser-review rows, 13 skipped sources,
  and 3 failed fetches.
- Added eligible coverage metrics to source-fit capture and completed the
  current eligible source-fit capture set. The review file now covers 227 of
  227 eligible findings, with 36 captured support excerpts, 64 review-gated
  safe-removal candidates, 110 human-browser-review rows, 14 skipped sources,
  and 3 failed fetches.
- Added `npm run draft:gp-corroboration`, a review-gated helper that turns
  human-confirmed GP corroboration review-pack rows into contact/source-only
  `adjust` decision drafts. It can also draft `needs_more_info` decisions for
  failed source captures and cannot approve availability, enrolment, scope,
  cultural support, funding, or referral claims.
- Hardened coordinate metadata for distance ranking. New geocodes now keep
  source, precision, confidence, and manual-review fields; out-of-NZ Nominatim
  results are rejected; and existing coordinate records were backfilled with
  honest coordinate metadata without marking any address as manually verified.
- Added conservative geocoder fallback queries for specific public addresses and
  skipped vague locality-only locations. A bounded address batch filled 32
  Nominatim coordinate records in total and reduced public-address records
  missing coordinates from 55 to 24.
- Added a review-gated Google Places coordinate-gap mode for known providers
  with public addresses but missing coordinates. A bounded official-API run
  produced 26 coordinate candidates, skipped vague address records by default,
  and merged them into the auditor review queue without mutating live provider
  data.
- Improved the auditor handling for those coordinate-gap leads: they now appear
  as **Location and distance evidence**, use a `coordinate-gap:<region>` batch,
  pre-fill only location metadata fields, and compare against the live provider
  row when a target provider ID is present.
- Added a dedicated location/distance review pack and auditor queue source.
  The pack deduplicates missing-address, missing-coordinate, and coordinate-gap
  work by provider, groups 104 current tasks into 25 batch keys, and keeps
  Google Places as location corroboration only.
- Added `npm run draft:location-distance`, a confirmed-human-review helper
  that can draft only public address and coordinate metadata decisions. It
  cannot approve provider type, clinical scope, availability, referral, cost,
  telehealth, cultural support, or support-preference tags.
- Regenerated evidence graph, claim queue, provider review queue, monitor queue,
  source-fit, availability, referral, and regional data-quality reports.

Safety notes:

- This change does not mutate live provider data.
- Unsupported broad/sensitive tags are still queued for human review when the
  specific claim value or public text is affected. Source-fit capture can
  reduce the inspection work, but it does not approve sensitive tags or
  telehealth automatically.
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
