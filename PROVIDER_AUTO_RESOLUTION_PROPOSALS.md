# Provider Auto-Resolution Proposals

Generated: 2026-06-01T06:01:34.091Z

These proposals are a safety layer for reducing review noise. They do not mutate `providers.json` and they do not approve high-risk healthcare claims.

## Summary

- Provider-level review items: 775
- Claim-level review items: 638
- Claim batch groups: 53
- Low-risk claims that can be de-prioritized from manual claim review: 1449
- Auto-deprioritize proposal groups: 31
- Manual batch proposal groups: 53

## Safe Auto-Deprioritization

| Count | Field | Source type | Owner | Action |
| ---: | --- | --- | --- | --- |
| 197 | city | provider_owned | provider_owned | Remove these claim-level checks from manual review dashboards unless the source changes; do not mutate providers.json from this proposal. |
| 197 | name | provider_owned | provider_owned | Remove these claim-level checks from manual review dashboards unless the source changes; do not mutate providers.json from this proposal. |
| 197 | region | provider_owned | provider_owned | Remove these claim-level checks from manual review dashboards unless the source changes; do not mutate providers.json from this proposal. |
| 196 | website | provider_owned | provider_owned | Remove these claim-level checks from manual review dashboards unless the source changes; do not mutate providers.json from this proposal. |
| 143 | phone | provider_owned | provider_owned | Remove these claim-level checks from manual review dashboards unless the source changes; do not mutate providers.json from this proposal. |
| 126 | address | provider_owned | provider_owned | Remove these claim-level checks from manual review dashboards unless the source changes; do not mutate providers.json from this proposal. |
| 87 | lat | provider_owned | provider_owned | Remove these claim-level checks from manual review dashboards unless the source changes; do not mutate providers.json from this proposal. |
| 87 | lon | provider_owned | provider_owned | Remove these claim-level checks from manual review dashboards unless the source changes; do not mutate providers.json from this proposal. |
| 32 | city | ngo_directory | official | Remove these claim-level checks from manual review dashboards unless the source changes; do not mutate providers.json from this proposal. |
| 32 | name | ngo_directory | official | Remove these claim-level checks from manual review dashboards unless the source changes; do not mutate providers.json from this proposal. |
| 32 | region | ngo_directory | official | Remove these claim-level checks from manual review dashboards unless the source changes; do not mutate providers.json from this proposal. |
| 31 | phone | ngo_directory | official | Remove these claim-level checks from manual review dashboards unless the source changes; do not mutate providers.json from this proposal. |
| 31 | website | ngo_directory | official | Remove these claim-level checks from manual review dashboards unless the source changes; do not mutate providers.json from this proposal. |
| 9 | address | ngo_directory | official | Remove these claim-level checks from manual review dashboards unless the source changes; do not mutate providers.json from this proposal. |
| 5 | clinicianName | provider_owned | provider_owned | Remove these claim-level checks from manual review dashboards unless the source changes; do not mutate providers.json from this proposal. |
| 5 | practiceName | provider_owned | provider_owned | Remove these claim-level checks from manual review dashboards unless the source changes; do not mutate providers.json from this proposal. |
| 5 | website | provider_owned | official | Remove these claim-level checks from manual review dashboards unless the source changes; do not mutate providers.json from this proposal. |
| 4 | city | provider_owned | official | Remove these claim-level checks from manual review dashboards unless the source changes; do not mutate providers.json from this proposal. |
| 4 | name | provider_owned | official | Remove these claim-level checks from manual review dashboards unless the source changes; do not mutate providers.json from this proposal. |
| 4 | region | provider_owned | official | Remove these claim-level checks from manual review dashboards unless the source changes; do not mutate providers.json from this proposal. |
| 3 | city | ngo_directory | provider_owned | Remove these claim-level checks from manual review dashboards unless the source changes; do not mutate providers.json from this proposal. |
| 3 | lat | ngo_directory | official | Remove these claim-level checks from manual review dashboards unless the source changes; do not mutate providers.json from this proposal. |
| 3 | lon | ngo_directory | official | Remove these claim-level checks from manual review dashboards unless the source changes; do not mutate providers.json from this proposal. |
| 3 | name | ngo_directory | provider_owned | Remove these claim-level checks from manual review dashboards unless the source changes; do not mutate providers.json from this proposal. |
| 3 | region | ngo_directory | provider_owned | Remove these claim-level checks from manual review dashboards unless the source changes; do not mutate providers.json from this proposal. |
| 3 | website | ngo_directory | provider_owned | Remove these claim-level checks from manual review dashboards unless the source changes; do not mutate providers.json from this proposal. |
| 2 | address | ngo_directory | provider_owned | Remove these claim-level checks from manual review dashboards unless the source changes; do not mutate providers.json from this proposal. |
| 2 | phone | ngo_directory | provider_owned | Remove these claim-level checks from manual review dashboards unless the source changes; do not mutate providers.json from this proposal. |
| 1 | lat | ngo_directory | provider_owned | Remove these claim-level checks from manual review dashboards unless the source changes; do not mutate providers.json from this proposal. |
| 1 | lon | ngo_directory | provider_owned | Remove these claim-level checks from manual review dashboards unless the source changes; do not mutate providers.json from this proposal. |
| 1 | phone | provider_owned | official | Remove these claim-level checks from manual review dashboards unless the source changes; do not mutate providers.json from this proposal. |

## Manual Batch Work

| Claims | Providers | Category | Field | Risk | Source type | Suggested action |
| ---: | ---: | --- | --- | --- | --- | --- |
| 152 | 56 | sensitive tag or scope evidence | tags | high | provider_owned | Open source pages and remove unsupported tags or add short excerpts. |
| 126 | 126 | GP source corroboration | sourceQuality | medium | third_party_directory | Batch research: corroborate against practice-owned, Healthpoint-approved, HPI/FHIR, or PHO source. |
| 32 | 32 | sensitive tag or scope evidence | tags | high | third_party_directory | Open source pages and remove unsupported tags or add short excerpts. |
| 24 | 24 | availability review | availabilityEvidence | high | official_register | Review representative items first, then apply safe decisions individually. |
| 24 | 24 | availability review | availabilityStatus | high | official_register | Review representative items first, then apply safe decisions individually. |
| 18 | 18 | referral pathway review | requiresReferral | high | healthpoint | Review representative items first, then apply safe decisions individually. |
| 18 | 18 | referral pathway review | referralType | high | healthpoint | Review representative items first, then apply safe decisions individually. |
| 18 | 18 | referral pathway review | referralSourceExcerpt | medium | healthpoint | Review representative items first, then apply safe decisions individually. |
| 17 | 17 | referral pathway review | requiresReferral | high | provider_owned | Review representative items first, then apply safe decisions individually. |
| 17 | 17 | referral pathway review | referralType | high | provider_owned | Review representative items first, then apply safe decisions individually. |
| 17 | 17 | referral pathway review | referralSourceExcerpt | medium | provider_owned | Review representative items first, then apply safe decisions individually. |
| 16 | 16 | sensitive tag or scope evidence | phoneSupport | medium | healthpoint | Open source pages and remove unsupported tags or add short excerpts. |
| 16 | 16 | sensitive tag or scope evidence | onlineAvailable | high | healthpoint | Open source pages and remove unsupported tags or add short excerpts. |
| 16 | 16 | sensitive tag or scope evidence | tags | high | official_register | Open source pages and remove unsupported tags or add short excerpts. |
| 15 | 15 | sensitive tag or scope evidence | phoneSupport | medium | provider_owned | Open source pages and remove unsupported tags or add short excerpts. |
| 15 | 15 | sensitive tag or scope evidence | onlineAvailable | high | provider_owned | Open source pages and remove unsupported tags or add short excerpts. |
| 9 | 5 | sensitive tag or scope evidence | tags | high | provider_owned | Open source pages and remove unsupported tags or add short excerpts. |
| 9 | 4 | sensitive tag or scope evidence | tags | high | professional_directory | Open source pages and remove unsupported tags or add short excerpts. |
| 8 | 3 | sensitive tag or scope evidence | tags | high | healthpoint | Open source pages and remove unsupported tags or add short excerpts. |
| 6 | 4 | sensitive tag or scope evidence | tags | high | provider_owned | Open source pages and remove unsupported tags or add short excerpts. |
| 5 | 5 | availability review | availabilityEvidence | high | provider_owned | Review representative items first, then apply safe decisions individually. |
| 5 | 5 | availability review | availabilityStatus | high | provider_owned | Review representative items first, then apply safe decisions individually. |
| 5 | 1 | directory/direct-contact confusion | tags | high | provider_owned | Review representative items first, then apply safe decisions individually. |
| 5 | 1 | directory/direct-contact confusion | tags | high | healthpoint | Review representative items first, then apply safe decisions individually. |
| 3 | 3 | location or distance evidence | website | low | professional_directory | Review representative items first, then apply safe decisions individually. |
| 3 | 3 | location or distance evidence | sourceQuality | medium | professional_directory | Review representative items first, then apply safe decisions individually. |
| 3 | 3 | sensitive tag or scope evidence | tags | high | provider_owned | Open source pages and remove unsupported tags or add short excerpts. |
| 3 | 3 | sensitive tag or scope evidence | tags | high | healthpoint | Open source pages and remove unsupported tags or add short excerpts. |
| 2 | 2 | referral pathway review | requiresReferral | high | ngo_directory | Review representative items first, then apply safe decisions individually. |
| 2 | 2 | referral pathway review | referralType | high | ngo_directory | Review representative items first, then apply safe decisions individually. |
| 2 | 2 | referral pathway review | referralSourceExcerpt | medium | ngo_directory | Review representative items first, then apply safe decisions individually. |
| 2 | 2 | sensitive tag or scope evidence | fit | medium | provider_owned | Open source pages and remove unsupported tags or add short excerpts. |
| 2 | 2 | sensitive tag or scope evidence | phoneSupport | medium | ngo_directory | Open source pages and remove unsupported tags or add short excerpts. |
| 2 | 2 | sensitive tag or scope evidence | onlineAvailable | high | ngo_directory | Open source pages and remove unsupported tags or add short excerpts. |
| 2 | 2 | sensitive/scope evidence | website | low | professional_directory | Review representative items first, then apply safe decisions individually. |
| 2 | 2 | sensitive/scope evidence | sourceQuality | medium | professional_directory | Review representative items first, then apply safe decisions individually. |
| 1 | 1 | availability review | availabilityEvidence | high | professional_directory | Review representative items first, then apply safe decisions individually. |
| 1 | 1 | availability review | availabilityStatus | high | professional_directory | Review representative items first, then apply safe decisions individually. |
| 1 | 1 | directory/direct-contact confusion | phone | low | provider_owned | Review representative items first, then apply safe decisions individually. |
| 1 | 1 | directory/direct-contact confusion | firstStep | medium | provider_owned | Review representative items first, then apply safe decisions individually. |

## Automation Blocks

| Rule | Count | Why blocked |
| --- | ---: | --- |
| high-risk-claims-review-gated | 423 | High-risk claims can affect suitability, clinical scope, referral, availability, culture, crisis, or telehealth matching. |
| availability-not-auto-upgraded | 60 | Availability can change quickly. Accepting status needs explicit current wording and reviewer approval. |
| psychiatry-referral-not-inferred | 111 | Psychiatrist self-referral cannot be inferred from contact details or silence. |
| sensitive-tags-need-evidence | 314 | Maori, Pasifika, Asian, Rainbow, trauma, addiction, sexual-harm, youth, men, and broad need tags need source evidence or explicit approval. |
| conflicts-not-overwritten | 1667 | Conflicting and shared-practice records are advisory review groups; they are not automatic merges. |

## Policy

- Auto-deprioritization removes noise from claim review dashboards only.
- Provider data changes still require exported review decisions, the controlled apply script, validation, audits, and tests.
- No accepting availability, psychiatrist self-referral, support tag, telehealth, provider type, cost, or scope claim is auto-approved here.
