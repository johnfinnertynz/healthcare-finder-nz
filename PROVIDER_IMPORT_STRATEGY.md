# Provider Import Strategy

Updated: 2026-05-31

Provider imports should move through staging before they affect the public app.
The public finder must remain static, conservative, and review-gated.

## Import Flow

```text
raw source or approved export
  -> extracted claims
  -> scored claims
  -> candidate provider / patch suggestions
  -> review queue
  -> reviewed decisions
  -> validation, audits, tests
  -> providers.json
```

## Source Tiers

| Tier | Examples | Allowed use |
| --- | --- | --- |
| 1 | Provider-owned pages, clinic-owned pages, Health NZ, official organisation pages, approved Healthpoint/HPI/FHIR exports, directly verified public contact details | Strong evidence for low-risk contact and location claims; high-risk claims still need explicit wording |
| 2 | Professional directories, NZCCP, RANZCP, TalkingWorks, Mindwell, NGO/PHO pages | Useful for discovery and corroboration; specialty, availability, and referral claims need excerpts |
| 3 | Google Places business listings, search snippets, public LinkedIn snippets, mirrors, old cached pages | Discovery/corroboration only; never enough to publish a live clinical, availability, referral, telehealth, cost, cultural-support, or specialty claim alone |

## Field Policy

Low-risk fields can be auto-scored as safe when source evidence is strong:

- organisation or practice name
- public website
- public clinic phone
- public clinic email
- public address
- city and region
- coordinates mechanically derived from a public address

High-risk fields remain review-gated:

- availability
- referral pathway
- provider type
- direct-contact status
- clinical scope and support needs
- age eligibility
- cost or funding eligibility
- cultural/safety tags
- telehealth
- gender preference
- crisis suitability
- whether a directory/register listing is a direct provider

## Importer Expectations

Each importer should preserve:

- source URL
- source type and owner type
- captured date or source last checked date
- short excerpts for any ranking-sensitive claim
- confidence by field where possible
- whether a claim needs manual review

If an importer cannot capture an excerpt, it should still preserve the field but
mark the claim as review-needed. It must not fake evidence text.

## Current Tooling

- `npm run discover:seeds` creates discovery seeds from existing providers,
  audit gaps, and review needs.
- `npm run discover:enrich` builds candidates and snowball searches without
  scraping blocked search-result pages.
- `npm run discover:suggest` creates review-gated candidate additions/patches.
- `npm run discover:places` creates review-gated Google Places business
  candidates from regional priority gaps. It reads the API key only from an
  environment variable or local file and does not store it in outputs.
- `npm run evidence:graph` creates claim-level evidence from current providers.
- `npm run export:claims` creates the compressed claim review queue.
- `npm run export:gp-corroboration` creates a dedicated queue for weak
  DoctorPricer/third-party GP records that need practice-owned, Healthpoint,
  HPI/FHIR, PHO, or official corroboration.
- `npm run export:regional-quality` rolls coverage, weak source, source-fit,
  availability, referral, watchlist, and address/coordinate risks into regional
  priorities for manual research planning.
- `npm run export:review` creates the provider-level review queue.
- `npm run apply:review` applies only reviewed decisions through the controlled
  script.

The local auditor console can load the GP corroboration queue as a first-class
queue source. This is still a review surface only: it helps reviewers collect
stronger source URLs and excerpts before any controlled `apply:review` step.

## Never Guess

- accepting new clients
- psychiatrist self-referral
- Maori, Pasifika, Asian, Rainbow, trauma-informed, sexual-harm, addiction,
  youth, men, or other sensitive suitability tags
- telehealth
- broad need tags such as depression, anxiety, trauma, addiction, or work stress
- whether a directory/register page is a direct provider
