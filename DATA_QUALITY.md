# Data Quality

This project uses `providers.json` as a public first-contact database for mental
health, addiction, youth, GP, psychologist, psychiatrist, and support services in
Aotearoa New Zealand.

The data standard is simple: do not invent services, contacts, eligibility, or
availability. A stressed user should be able to trust that each live result has a
real public contact route and a clear next step.

## Required Fields

Every provider record must include:

- `id`
- `name`
- `type`
- `region`
- `city`
- `cost`
- `tags`
- `fit`
- `firstStep`
- `source`
- `verified`

Recommended fields:

- `address`
- `lat` and `lon`
- `phone`
- `text`
- `email`
- `website`
- `hours`
- `confidence`
- `eligibility`
- `crisisOnly`
- `onlineAvailable`
- `phoneSupport`
- `inPerson`

Current schema aliases:

- `source` is the source URL.
- `verified` is the last verified month in `YYYY-MM` format.
- `tags` currently carry support flags such as `maori`, `pasifika`, `asian`,
  `rainbow`, `trauma-informed`, `telehealth`, `female`, `male`, `cost`,
  `crisis`, `addiction`, and `direct-contact`.

## Verification Rules

- Prefer official provider pages, Healthpoint-approved data, Health NZ, PHOs,
  professional bodies, NGO-owned pages, or approved exports.
- Use Healthpoint and broad directories as source or website links for a specific
  provider when needed, but do not treat a broad directory as a direct provider.
- A direct provider must have at least one usable public contact route: phone,
  text, email, or official website/contact page.
- Directory records must be marked `type: "directory"` or tagged `directory`.
  They must not show "Use this contact" in the UI.
- Crisis records must be tagged `crisis` and should only appear in crisis or
  fallback contexts, not as routine first-contact recommendations.
- If a provider page says books are closed, not taking new clients, or not
  accepting referrals, remove it from `providers.json` and add it to
  `data/monitors/provider-availability-watchlist.json`.
- Do not publish private emails, personal mobile numbers, or register addresses
  unless they are clearly public professional contact details.
- Keep MCNZ and Psychologists Board register data backend-only unless a separate
  public practice source confirms the user-facing contact.

## Support Preference Tags

Opt-in cultural and safety tags are hidden unless selected:

- `maori`
- `pasifika`
- `asian`
- `rainbow`

Provider gender tags are soft fit signals:

- `female`
- `male`

Only use these when a public source explicitly supports the tag. Do not infer
ethnicity, culture, gender, or affirming practice from a provider name alone.

## Update Checklist

Before committing provider data changes:

1. Run `node tools/validate-provider-data.mjs`.
2. Run `node tools/audit-provider-quality.mjs providers.json`.
3. Run `node tools/audit-support-preferences.mjs providers.json`.
4. Run `node tools/audit-address-coverage.mjs providers.json`.
5. Run `node tools/audit-availability-watchlist.mjs`.
6. Run `node tools/check-links.mjs`.
7. Check exact contact-type filters: GP, counsellor, psychologist, psychiatrist.
8. Check opt-in filters: Maori, Pasifika, Asian, Rainbow, trauma-informed,
   telehealth, female provider, male provider.
9. Check one local workflow in a large city and one in a thin-coverage region.

Use this stricter command when source URLs, not only user-visible websites, need
network verification:

```sh
CHECK_PROVIDER_SOURCES=true node tools/check-links.mjs
```

Some official health and provider sites block automated link checks. Treat 403
results as "manual browser review needed" rather than automatically broken.

## Known Data Risks

- Many imported GP and directory records still lack `confidence`. The validator
  warns about this but does not fail, because contact and verification fields are
  present.
- Several non-GP support services still need address or coordinate enrichment for
  stronger distance ranking.
- Local psychiatrist coverage is thin in many regions. National telehealth
  psychiatry helps, but it is not a full substitute for local specialist access.
- Source URLs can break even when the user-visible phone/email remains valid.
  Broken source URLs should trigger manual re-verification.
