# Care Finder Aotearoa

A low-barrier mental health care finder for people in Aotearoa New Zealand.

Live site: [johnfinnertynz.github.io/healthcare-finder-nz](https://johnfinnertynz.github.io/healthcare-finder-nz/)

Care Finder Aotearoa helps someone take a first step when they need support but
do not know who to contact or what to say. It combines a guided intake flow,
local provider search, funding guidance, and a concise first-contact message
builder.

This project was built by [John Finnerty](https://johnfinnerty.co.nz), a
software developer based in Christchurch, New Zealand.

## Safety

This is not an emergency service or a replacement for clinical care.

If someone is unsafe right now, call **111**. If they can stay safe but need to
talk now, free call or text **1737** any time, 24/7.

## What It Does

- Guides people through age, region, gender, support preferences, concerns, and
  barriers to care.
- Shows a care path only after the guide questions are complete.
- Recommends three first-contact options based on location, need, support
  preference, barriers, and provider fit.
- Helps users find providers by region, support need, cost barrier, and contact
  type.
- Prioritises direct-contact providers over directory-only results.
- Generates a short, editable first-contact message.
- Provides working `mailto:` and `tel:` actions where provider contact details
  are available.
- Includes NZ funding pathways such as WINZ counselling support, Access and
  Choice, and ACC Sensitive Claims.
- Keeps user answers in the browser instead of requiring an account.

## Why This Exists

Finding mental health support can be hard when someone is overwhelmed, worried
about cost, unsure what kind of provider fits, or unable to explain what is
happening. This project tries to make the first contact smaller, clearer, and
less intimidating.

It is a navigation aid, not a diagnosis, emergency service, or replacement for
professional care.

## Project Structure

```text
index.html             Static app shell and content
styles.css             Visual design and responsive layout
script.js              Guided flow, provider matching, and message builder
providers.json         Local provider and directory data
PROVIDER_DATABASE.md   Data rules, fields, and import notes
tools/                 Data import and quality utilities
```

## Local Development

This is a static site. From the project folder, run:

```sh
python -m http.server 4173
```

Then open:

```text
http://127.0.0.1:4173/
```

## Provider Data

Provider records live in `providers.json`.

The database is intended to contain current, public, professional contact
details only. Direct care records should include at least one usable contact
method such as phone, email, text, or an official website/contact page.

See `PROVIDER_DATABASE.md` for field definitions, source guidance, and import
rules.

## Data Quality Tools

Check provider contact quality:

```sh
node tools/audit-provider-quality.mjs
```

Import approved counsellor, psychologist, or psychiatrist contacts from CSV:

```sh
node tools/import-care-providers.mjs path/to/care-providers.csv
```

Import approved FHIR provider bundles:

```sh
node tools/import-provider-fhir.mjs path/to/provider-bundle.json
```

Check outbound links:

```sh
node tools/check-links.mjs
```

Some health and government sites may block automated link checks with `403`.
Those should be reviewed separately from genuinely broken links.

## Provider Source Principles

- Prefer official provider pages, professional body directories, Health NZ,
  Healthpoint-approved data access, NZCCP, NZ Psychological Society, RANZCP, or
  provider-owned exports.
- Do not scrape public directories where terms prohibit automated extraction.
- Do not publish private emails or personal phone numbers unless they are public
  professional contact details.
- Re-verify direct-care listings regularly.

## Disclaimer

This project provides navigation and first-contact support information. It does
not diagnose, triage clinical risk, or guarantee service availability, cost,
eligibility, or suitability.
