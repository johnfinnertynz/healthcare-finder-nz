# Data Quality Backlog

Updated: 2026-06-01

Care Finder should prefer fewer, better-sourced provider claims over broad but
uncertain coverage. This backlog focuses on reducing unsafe certainty and the
manual review burden.

## Current Bottlenecks

| Area | Current signal | Risk | Next action |
| --- | --- | --- | --- |
| Sensitive/scope tags | Claim queue groups broad tags, support-preference tags, and telehealth claims into the largest batches | Providers may be matched for needs their sources do not actually support | Remove unsupported tags or add short source excerpts through review decisions |
| Weak GP source corroboration | Many GP records are sourced from a third-party GP listing | GP contacts are useful, but source confidence is weaker than practice-owned or official data | Corroborate phone, website, and address against practice-owned, PHO, Healthpoint-approved, HPI/FHIR, or official data |
| Availability | Availability is mostly `not_published` or `unknown`; restrictive statuses are watchlisted | Availability changes quickly and should not be overclaimed | Keep accepting status rare; monitor not-accepting/waitlist records separately |
| Referral pathways | Psychiatrist referral metadata passes audit but still needs ongoing checks | Direct-contact psychiatry recommendations can create dead ends | Keep GP-referral-first unless self-referral is explicit |
| Address and coordinates | Some non-GP providers have missing address or coordinate evidence | Distance ranking can wrongly imply local access | Geocode only public professional addresses and mark uncertainty honestly |
| Duplicates/shared practices | Shared domains, phones, and addresses create many conflict groups | Different clinicians at one practice must not be merged | Review as shared-practice batches, not automatic duplicate merges |
| Claim/root-cause duplication | Provider-level findings can still create repeated field tasks when one root cause affects several stored fields | Inflated queues make auditors spend time on noise instead of risky claims | Use source-fit evidence capture to prefill excerpts or conservative removal candidates for unsupported tags |
| Regional prioritisation | Coverage, GP corroboration, audit, and distance-ranking risks were previously split across several reports | Reviewers could spend time in a large region while a thinner region has no specialist pathway | Use `REGIONAL_DATA_QUALITY_REPORT.md` to choose the next manual research batch |

## Queue Reduction Targets

| Target | Why it matters | Safe reduction method |
| --- | --- | --- |
| Unsupported broad tags | Directly affects user matching | Remove unsupported tags or add source-backed `specialties`, `services`, or `needScope` evidence |
| Weak telehealth claims | Affects rural and transport-barrier users | Keep telehealth only when the source mentions online, video, remote, or phone appointments |
| Weak cultural/support-preference evidence | Affects opt-in safety filters | Keep Maori, Pasifika, Asian, and Rainbow tags only with source wording or reviewer approval |
| Weak GP source claims | Affects large numbers of first-contact GP options | Batch-corroborate by practice website/domain rather than one-by-one where possible |
| Availability watchlist candidates | Prevents unavailable providers from ranking | Keep them off live recommendations until a current source or direct response confirms availability |

## Done This Cycle

- Added field-level provider claims with risk, confidence, decision, and source
  metadata.
- Added a focused claim review queue with batch grouping.
- Added conflict/shared-practice detection.
- Added an auditor queue option for claim-level review.
- Added auto-resolution proposals that de-prioritize low-risk claim review noise
  without applying provider data changes.
- Added an auditor queue option for auto-resolution proposal groups.
- Deduplicated claim-batch provider samples so batch size separates total claim
  rows from unique affected providers.
- Added a claim-batch decision draft helper that creates review-decision JSON
  without mutating live provider data.
- Tuned the evidence graph so provider-level weak telehealth, cultural support,
  and broad-tag findings only attach to matching tag or field claims. This cut
  the focused claim-review queue from 2,389 items to 941 while keeping high-risk
  claims review-gated.
- Collapsed weak GP source corroboration into one source-check task per affected
  practice, reducing the focused claim-review queue again from 941 items to 815.
- Targeted broad-tag findings in public text fields so `fit`, `specialties`,
  and `needScope` are queued only when that specific text repeats the
  unsupported need claim. This reduced the focused claim-review queue from 815
  items to 638.
- Added a dedicated GP source corroboration queue with 126 review-gated tasks
  for DoctorPricer/third-party GP records missing practice websites. The queue
  separates acceptable evidence sources from discovery-only sources and does
  not mutate live provider data.
- Added the GP source corroboration queue to the auditor console so reviewers
  can switch to it, see suggested searches and evidence rules, and export normal
  review decisions without touching live provider data from the browser.
- Added a conservative filtered-batch helper to the auditor console. It can save
  `needs_more_info` decisions for narrowed sets of unsaved items, but it cannot
  bulk approve, bulk adjust, overwrite existing decisions, or mutate live data.
- Added a regional data-quality priority report that combines local coverage,
  weak GP source tasks, source-fit findings, availability/referral/watchlist
  signals, and address/coordinate gaps without mutating live provider data.
- Added Google Places candidates to the normal discovery seed flow and added a
  capped seed-source website fetch mode, so likely provider websites can produce
  reviewable excerpts before a human auditor decides whether to update live
  data.
- Ran a bounded Northland psychiatry Places discovery batch. It added review
  leads, including a Northland Psychiatry source, while keeping query-type
  conflicts and non-specialist-looking matches gated for audit.
- Hardened source-page extraction after the Northland batch exposed two noisy
  patterns: announcement headings being treated as service names, and adjacent
  team-list names being merged into one clinician.
- Added exact-practice Google Places lookups for GP source-corroboration tasks.
  A bounded Northland batch produced GP candidates linked back to queued
  provider IDs while suppressing broad matches on shared directory domains.
- Ran the exact-practice Google Places helper across all 126 GP
  source-corroboration tasks. The cleaned export now has 132 review-gated
  Places candidates, 100 with a candidate website, and 124 tied to a queued GP
  provider ID. A capped source-fetch pass produced 99 GP discovery suggestions,
  including 2 update-existing-provider suggestions that still require auditor
  approval.
- Hardened exact GP Places matching after the full run exposed false positives:
  target providers are linked only when the Places result corroborates the
  queued practice by name, phone, or address, and stale results that match a
  different provider are filtered from regenerated reports.
- Added a GP corroboration review pack that joins the GP source-corroboration
  queue to Places/Healthpoint/practice-site leads. It currently creates 126
  review-only items, including 68 ready-for-source-capture items, 18 manual
  compare conflicts, and 40 source-lookup-needed items.
- Added optional bounded source-excerpt capture to the GP corroboration review
  pack. It can prefill short public Healthpoint/practice-page snippets for the
  auditor, while keeping every item review-gated and leaving live provider data
  unchanged.
- Tightened the source fetcher's login/captcha detection so public provider
  pages that merely include a login navigation link are not discarded as
  blocked. Login forms, login URLs, and human-verification pages still stay
  blocked.
- Ran the GP corroboration review pack across all 68 ready-for-source-capture
  GP leads. The export now includes prefilled review snippets for 64 of them;
  4 remain blocked or failed and need human browser review.
- Added an auditor **Source capture** filter and queue badges so captured GP
  snippets can be reviewed separately from blocked, failed, skipped, or
  not-yet-fetched source checks.
- Ran a bounded Google Places psychiatry discovery batch across eight high
  priority regions with local psychiatry gaps. The run added review-gated
  psychiatry leads and refreshed discovery suggestions without mutating
  `providers.json`.
- Tightened Places typing so a result from a psychiatrist query is not labelled
  as a psychiatrist unless the result name/types or an existing matched provider
  explicitly support it. Psychology/counselling-looking results are kept as
  `unknown` until stronger source evidence is reviewed.
- Hardened discovery identity matching so shared clinic emails, shared register
  domains, and shared practice websites do not merge different clinicians. The
  latest psychiatry enrichment export has 84 suggestions and zero candidate
  groups with more than five possible provider IDs.
- Added a dedicated **Discovery suggestions** queue source to the auditor so
  review-gated provider suggestions can be worked directly, instead of being
  buried inside the larger manual review queue.
- Added a controlled reviewed new-provider import path to `npm run
  apply:review`. It only accepts approved discovery suggestions with
  `newProviderCandidate`, allowlisted fields, and human-captured source
  evidence; discovery snippets and blocked pages remain rejected.
- Added a bounded source-fit evidence capture export and auditor queue. The
  first 30 unsupported tag/telehealth findings produced 6 captured support
  excerpts, 4 review-gated safe-removal candidates, 17 human-browser-review
  items, and 3 skipped/too-large source checks without mutating live data.
- Added a source-fit capture decision draft helper. It requires confirmed human
  review and merges removals by provider so multiple unsupported-tag removals
  cannot overwrite each other and re-add a claim.
- Made source-fit evidence capture resumable. Repeated bounded runs can now use
  `--skip-existing --merge-existing` to keep earlier excerpts and move on to new
  unsupported tag/support/telehealth findings without mutating live data.
- Tightened support-preference capture so Māori, Pasifika, Asian, and Rainbow
  rows with public identity cues are no longer labelled safe-removal candidates
  just because the automated fetch missed explicit wording. Those now require
  human browser review.
- Regenerated the source-fit evidence capture export across the first 140
  findings. It now contains 14 source-support excerpts, 28 review-gated
  safe-removal candidates, 88 human-browser-review rows, 8 skipped sources, and
  2 failed fetches.
- Added source-fit capture batch keys and a report summary so repeated
  unsupported tag/support/telehealth work can be filtered in the auditor by
  `source-fit:<status>:<rule>:<target>`.
- Ran the next resumable source-fit capture batch. The export now covers 220
  findings with 33 source-support excerpts, 62 review-gated safe-removal
  candidates, 109 human-browser-review rows, 13 skipped sources, and 3 failed
  fetches.
- Added source-fit capture coverage metrics and completed the current eligible
  capture set. The export now covers 227 of 227 eligible findings with 36
  source-support excerpts, 64 review-gated safe-removal candidates, 110
  human-browser-review rows, 14 skipped sources, and 3 failed fetches.
- Added a GP corroboration decision draft helper. After a reviewer checks
  captured GP source snippets, it can draft contact/source-only `adjust`
  decisions; failed source captures can be drafted as `needs_more_info`.
  Availability, enrolment, scope, cultural support, funding, and referral claims
  remain out of scope.
- Hardened coordinate metadata. Existing coordinate records now carry
  `coordinateSource`, `coordinatePrecision`, `coordinateConfidence`, and
  `geocodeNeedsManualReview`; automated Nominatim results are rejected if they
  fall outside New Zealand bounds, and historical unknown coordinate sources are
  labelled honestly for manual review.
- Added conservative geocoder fallback queries and skipped vague locality-only
  addresses. A bounded run filled 32 OpenStreetMap Nominatim coordinate records
  in total and reduced distance-weighted records with a public address but no
  coordinates from 55 to 24 without treating town names or "various venues" as
  exact clinic points.
- Added a Google Places coordinate-gap mode. A bounded official-API run checked
  the specific unresolved address records, skipped vague coordinate gaps by
  default, produced 26 review-gated coordinate candidates, and merged them into
  the auditor/provider review queue without mutating live provider rows.
- Updated the auditor workflow so coordinate-gap candidates are easier to work:
  filter **Google Places candidates** by **Location and distance evidence** or
  `coordinate-gap:<region>`, compare against the linked live provider row, and
  export location-only adjustments after confirming the same provider or public
  clinic location.
- Added a dedicated location/distance review pack and draft helper. The pack
  deduplicates 126 location queue rows into 104 provider-level tasks, groups
  them into 25 batches, and lets reviewers draft only address/coordinate
  metadata after confirmed human review.

## Next Backlog Items

1. Add reviewed batch-adjust UI only after the first human review session proves
   the conservative `needs_more_info` batch helper is understandable.
2. Work through the auditor console's **GP source corroboration** and
   **GP corroboration review pack** queues, starting with the 64 captured GP
   snippets using the **Source capture: captured** filter. After checking
   snippets, use `npm run draft:gp-corroboration`; use
   `--decision needs_more_info --status failed` for the 4 failed source
   captures.
3. Tune duplicate/shared-practice false positives, especially shared GP network
   phones/domains.
4. Continue resumable source-fit capture batches with
   `--skip-existing --merge-existing`, then use the auditor **Batch** filter
   for `source-fit:<status>:<rule>:<target>` groups before confirming excerpts
   or removing unsupported claims through reviewed decisions.
5. Add source-excerpt capture to more importers so fewer claims are
   `stored-provider-field` only.
6. Keep adding extractor regression tests whenever generated discovery reports
   show obviously misleading provider names, clinician names, or closure text.
7. Use bounded `discover:places -- --gp-corroboration-queue ...` batches for
   weak GP records, then review the matched websites/Healthpoint links before
   applying any updates.
8. Use bounded `discover:places` plus `discover:enrich -- --fetch-seed-sources`
   runs for high-priority thin regions, then send resulting candidates through
   the auditor.
9. Review the **Location/distance review pack**, starting with the 8
   `ready_for_location_review` rows. Use `npm run draft:location-distance`
   only after confirming the same provider or same public clinic location;
   leave vague town-only, "various venues", old-address, and shared-building
   rows as `needs_more_info`.
10. Use `REGIONAL_DATA_QUALITY_REPORT.md` to choose the next thin-region or
   weak-source verification batch, then refresh the report after decisions are
   applied.
11. Review the psychiatry discovery suggestions through the auditor's
    **Discovery suggestions** queue, starting with the add-new Northland
    Psychiatry lead. Capture a human source excerpt before using the controlled
    new-provider import path.
