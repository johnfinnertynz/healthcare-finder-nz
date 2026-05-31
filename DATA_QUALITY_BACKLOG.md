# Data Quality Backlog

Updated: 2026-05-31

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

## Next Backlog Items

1. Add a reviewed claim-batch decision format that can generate safe
   `provider-review-decisions.json` drafts.
2. Tune the auditor UI so auto-deprioritized low-risk claim groups can be hidden
   while still keeping high-risk batches prominent.
3. Tune duplicate/shared-practice false positives, especially shared GP network
   phones/domains.
4. Start manual review with the largest unsupported tag batches.
5. Add source-excerpt capture to more importers so fewer claims are
   `stored-provider-field` only.
6. Build a thin-region priority view from claim quality plus provider coverage.
