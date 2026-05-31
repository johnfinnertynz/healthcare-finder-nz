# Provider Discovery Suggestions

Generated: 2026-05-31T22:56:10.871Z

Suggestions are review-gated. They must be inspected in the auditor console and applied with controlled review decisions before public recommendations change.

## Summary

- Suggestions: 11
- Add new provider: 0
- Update existing provider: 0
- Move to watchlist: 0
- Needs manual research: 11

## Top Suggestions

| Action | Provider | Type | Region / city | Confidence | Reasons |
| --- | --- | --- | --- | --- | --- |
| needs_manual_research | Dr Sarah Castle | psychiatrist | Northland / Whangarei | high | conflicting tags values; extracted from seed source provider_owned; conflicting fields: tags |
| needs_manual_research | Whangarei Care Centre | counsellor | Northland / Whangarei | high | conflicting address, type values; extracted from seed source provider_owned; conflicting fields: address, type |
| needs_manual_research | candidate:dec8f3f12127927b |  |  /  | medium | conflicting source values; no direct public contact found; seed source login-or-captcha-required; conflicting fields: source |
| needs_manual_research | Lynn Price | psychologist | Northland / Whangarei | high | existing provider enrichment; source-fit: medium weak-telehealth-evidence - Telehealth or online availability is set but source fields do not clearly support remote care.; review queue high: medium: weak-telehealth-evidence; availability needs manual review |
| needs_manual_research | Hagan Provan | psychologist | Northland / Whangarei | high | existing provider enrichment; review queue critical: provider discovery suggestion; conflicting source values; no direct public contact found; seed source too-large; conflicting fields: source; review queue medium: availability needs manual review |
| needs_manual_research | Jigsaw North Manaaki Whanau Counselling | counsellor | Northland / Whangarei | high | existing provider enrichment; source-fit: medium broad-tag-without-source-support - Broad tag "depression" is present but source fields do not clearly support it.; source-fit: medium broad-tag-without-source-support - Broad tag "anxiety" is present but source fields do not clearly support it.; source-fit: medium broad-tag-without-source-support - Broad tag "trauma" is present but source fields do not clearly support it.; review queue high: medium: broad-tag-without-source-support; availability needs manual review |
| needs_manual_research | EAP Services Limited (Northland) | psychiatrist | Northland / Whangarei | medium | Google Places discovery candidate; corroborate with provider-owned, Healthpoint, official register, or professional-directory evidence before live use; Google Places is a discovery/corroboration source, not enough by itself for live recommendations.; Confirm provider type, services, availability, cost, referral pathway, and support-preference tags from stronger public sources.; missing signals: local psychiatrist or psychiatry pathway \| 16 GP corroboration tasks \| Google Places discovery/corroboration only; new candidate needs corroboration; search-result, Google Places, LinkedIn, or unknown-source data cannot create a live provider |
| needs_manual_research | Heartwood Psychiatry | psychiatrist | Northland / Northland and telehealth | high | existing provider enrichment; review queue medium: availability needs manual review; referral pathway needs manual review; psychiatrist referral pathway unknown |
| needs_manual_research | Northland Psychiatry | psychiatrist | Northland / Whangarei | medium | Google Places discovery candidate; corroborate with provider-owned, Healthpoint, official register, or professional-directory evidence before live use; Google Places is a discovery/corroboration source, not enough by itself for live recommendations.; Confirm provider type, services, availability, cost, referral pathway, and support-preference tags from stronger public sources.; missing signals: local psychiatrist or psychiatry pathway \| 16 GP corroboration tasks \| Google Places discovery/corroboration only; new candidate needs corroboration; search-result, Google Places, LinkedIn, or unknown-source data cannot create a live provider |
| needs_manual_research | Elke Radewald Psychology services | psychologist | Northland / Whangarei | medium | Google Places discovery candidate; corroborate with provider-owned, Healthpoint, official register, or professional-directory evidence before live use; Google Places is a discovery/corroboration source, not enough by itself for live recommendations.; Confirm provider type, services, availability, cost, referral pathway, and support-preference tags from stronger public sources.; missing signals: local psychiatrist or psychiatry pathway \| 16 GP corroboration tasks \| Google Places discovery/corroboration only; new candidate needs corroboration; search-result, Google Places, LinkedIn, or unknown-source data cannot create a live provider |
| needs_manual_research | J Counselling | psychiatrist | Northland / Whangarei | medium | Google Places discovery candidate; corroborate with provider-owned, Healthpoint, official register, or professional-directory evidence before live use; Google Places is a discovery/corroboration source, not enough by itself for live recommendations.; Confirm provider type, services, availability, cost, referral pathway, and support-preference tags from stronger public sources.; missing signals: local psychiatrist or psychiatry pathway \| 16 GP corroboration tasks \| Google Places discovery/corroboration only; new candidate needs corroboration; search-result, Google Places, LinkedIn, or unknown-source data cannot create a live provider |

## Safety Notes

- Search result snippets and public LinkedIn signals are discovery/corroboration only.
- Availability, referral pathways, cultural tags, telehealth, and advertised specialties require explicit evidence or reviewer approval.
- This script does not mutate `providers.json`.
