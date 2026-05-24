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

- Guides people through age, street address or suburb, gender, support preferences, concerns, and
  barriers to care.
- Includes NZ-only address autocomplete with a local fallback for common towns
  and suburbs.
- Uses the street address or suburb to weight nearby providers.
- Shows a care path only after the guide questions are complete.
- Recommends three first-contact options based on nearby providers, need, support
  preference, barriers, and provider fit.
- Helps users find providers by address/suburb match, support need, cost barrier, and contact
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
provider-sources.json  Refresh source manifest
data/imports/          Approved source exports, not usually committed
data/monitors/         Watchlists for promising providers not currently available
data/registers/        Backend-only professional register outputs
data/reports/          Refresh and audit reports
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
Provider coordinates can be stored as `lat` and `lon` for distance ranking.

Address lookup for users is done in the browser and is only used to rank nearby
providers. If a user chooses address lookup, the address text is sent to the
OpenStreetMap Nominatim geocoding service.

See `PROVIDER_DATABASE.md` for field definitions, source guidance, and import
rules.

## Data Quality Tools

Refresh the database from approved exports and live opt-in sources:

```sh
node tools/refresh-provider-database.mjs
```

The refresh pipeline reads `provider-sources.json`, imports any approved GP,
FHIR, direct-care, MCNZ, Psychologists Board, and NZCCP source files that are
present, refreshes opt-in RANZCP psychiatrists, geocodes public provider
addresses, and writes a report to `data/reports/provider-refresh-report.json`.
The GitHub Actions workflow `.github/workflows/provider-data-audit.yml` runs the
same checks weekly, refreshes DoctorPricer GP clinic listings at a conservative
rate, and can use `HEALTHPOINT_API_URL` / `HEALTHPOINT_API_TOKEN` repository
secrets if approved API access is granted.

Refresh the GP clinic database from DoctorPricer directly:

```sh
node tools/import-doctorpricer-gps.mjs providers.json --rate-limit-ms 5000
```

That importer queries regional seed points, dedupes clinics, filters obvious
urgent-care / student-only / non-GP records, and stores actual GP practices with
phone, website, address, and coordinates where available. Healthpoint-approved
FHIR or HPI access should still be treated as the preferred official long-term
source when it becomes available.

Import backend-only doctor register data after approved MCNZ access:

```sh
node tools/import-mcnz-register.mjs data/imports/mcnz-register.csv
```

Import backend-only Psychologists Board verification data:

```sh
node tools/import-psychologists-board-register.mjs data/imports/psychologists-board-register.csv
```

Check provider contact quality:

```sh
node tools/audit-provider-quality.mjs
node tools/audit-support-preferences.mjs
node tools/audit-address-coverage.mjs
```

Check promising providers that are not currently taking new clients:

```sh
node tools/check-provider-availability.mjs
```

The watchlist lives at `data/monitors/provider-availability-watchlist.json`.
These records are not shown as live first-contact options until their page stops
matching unavailable wording and is manually reviewed. The weekly GitHub Actions
audit writes `data/reports/provider-availability-monitor.json` as an artifact.

Geocode public provider addresses for distance ranking:

```sh
node tools/geocode-provider-addresses.mjs
```

Provider importers geocode newly added or updated records automatically when a
public physical address is present and `lat` / `lon` are missing. Add
`--no-geocode` to an import command when running offline or when an import source
must not be sent to OpenStreetMap Nominatim.

Import approved counsellor, psychologist, or psychiatrist contacts from CSV:

```sh
node tools/import-care-providers.mjs path/to/care-providers.csv
```

Import opt-in psychiatrist listings from RANZCP Your Health in Mind:

```sh
node tools/import-ranzcp-psychiatrists.mjs
```

Prepare a psychologist verification and public-contact research queue from an
exported New Zealand Psychologists Board register search:

```sh
node tools/prepare-psychologists-board-research.mjs path/to/psychologists-board-register.csv
```

Import approved FHIR provider bundles:

```sh
node tools/import-provider-fhir.mjs path/to/provider-bundle.json
node tools/import-practitioner-roles-fhir.mjs path/to/provider-bundle.json
```

Fetch an approved Healthpoint FHIR API/export endpoint, then import it:

```sh
HEALTHPOINT_API_URL="<approved-healthpoint-fhir-endpoint>" \
HEALTHPOINT_API_TOKEN="token-if-issued" \
node tools/fetch-healthpoint-fhir.mjs healthpoint-provider-bundle.json

node tools/import-provider-fhir.mjs healthpoint-provider-bundle.json
```

Check outbound links:

```sh
node tools/check-links.mjs
```

Some health and government sites may block automated link checks with `403`.
Those should be reviewed separately from genuinely broken links.
By default the checker samples generated DoctorPricer GP links so CI does not
hammer hundreds of practice websites. Run this for a full provider link audit:

```sh
CHECK_PROVIDER_LINKS=full node tools/check-links.mjs
```

Set `PROVIDER_LINK_LIMIT=300` to widen the sample.

## Provider Source Principles

- Prefer official provider pages, professional body directories, Health NZ,
  Healthpoint-approved data access, NZCCP, NZ Psychological Society, RANZCP, or
  provider-owned exports.
- Do not scrape public directories where terms prohibit automated extraction.
- Do not treat directories as direct first-contact providers.
- Keep MCNZ and Psychologists Board data backend-only unless separate public
  clinic or practice contact details have been verified.
- Do not publish private emails or personal phone numbers unless they are public
  professional contact details.
- Re-verify direct-care listings regularly.

## Disclaimer

This project provides navigation and first-contact support information. It does
not diagnose, triage clinical risk, or guarantee service availability, cost,
eligibility, or suitability.
