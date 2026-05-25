# Provider Database

`providers.json` is the local first-contact database used by the website.

Each record should be verified before it is added. Prefer official provider pages,
Healthpoint, professional body directories, Health NZ pages, or the provider's own
website. Do not add personal mobile numbers or private emails unless they are
published as professional contact details.

## Fields

- `id`: stable lowercase id, for example `canterbury-example-service`
- `name`: public service or provider name
- `type`: one of `gp`, `counsellor`, `psychologist`, `psychiatrist`, `helpline`,
  `mens-centre`, `youth`, `addiction`, `directory`, `public-service`
- `region`: NZ region, or `National`
- `city`: city or service area
- `address`: public address, if available
- `lat` / `lon`: optional provider coordinates for distance ranking
- `coordinateSource`: optional note for where provider coordinates came from
- `phone`: public phone number, digits preferred
- `text`: public text/SMS number, if available
- `email`: public professional email, if available
- `website`: official website or trusted directory listing
- `hours`: contact hours or access notes
- `cost`: free, funded, private, public service, or varies
- `tags`: search and matching tags such as `depression`, `anxiety`, `trauma`,
  `cost`, `male`, `rangatahi`, `same-day`, `privacy`, `telehealth`, and
  `psychiatry-service`
- `specialties`: optional public focus areas or clinical interests listed by the
  provider or directory
- `patientGroups`: optional patient groups explicitly listed by the source, such
  as Maori, Rainbow, family, refugee, veteran, or disability groups
- `ageGroups`: optional age groups explicitly listed by the source
- `fit`: plain-language description of who this is good for
- `firstStep`: the smallest action a user can take
- `source`: URL used to verify the listing
- `verified`: month verified, formatted `YYYY-MM`
- `lastVerified`: latest known verification or import month, formatted `YYYY-MM`
- `confidence`: `high`, `medium`, or `low`; use `medium` when the source is
  indirect or the listing needs a future direct-provider confirmation
- `sourceQuality`: short description of the source, such as `provider-owned page`,
  `official health/government page`, `professional directory`, or
  `third-party public GP listing`
- `needsManualVerification`: `true` when details should be checked by a person
  before broader public promotion
- `availabilityStatus`: one of `accepting`, `waitlist`, `not_accepting`,
  `referrals_paused`, `unknown`, or `not_published`
- `availabilityCheckedAt`: month or date when availability was last checked
- `availabilityEvidence`: short source phrase supporting explicit availability,
  if one exists
- `availabilitySource`: URL used for the availability status
- `availabilityNeedsManualReview`: `true` when the status is uncertain,
  restrictive, stale, or indirectly sourced
- `requiresReferral`: for psychiatrist and psychiatry-service records, `true`
  when the source indicates a referral is required or usually expected
- `referralType`: one of `gp`, `self`, `specialist`, or `unknown`
- `referralSourceUrl`: source URL used for referral pathway metadata
- `referralSourceExcerpt`: short source-backed note about the pathway
- `referralConfidence`: `high`, `medium`, or `low`
- `referralLastChecked`: month or date when referral wording was checked
- `referralNeedsManualReview`: `true` when the pathway is unclear or indirect

## Import Rule

If a listing is only a directory and not a direct provider, mark `type` as
`directory`. Direct contact details are more useful, but directories are still
valuable when they help users find fit, cost, culture, or availability.

Use `psychiatry-service` when a public specialist mental health team is a direct
pathway to psychiatry assessment or medication-specialist support, but is not a
private named psychiatrist. Keep the visible `type` as `public-service` or
`youth` so users see what they are contacting.

Private psychiatrist and psychiatry-practice records must include referral
metadata. If a source says GP referral is required, the visible first step should
send the user toward a GP referral conversation rather than presenting email or
phone contact as the main action. If referral wording is unclear, use
`referralType: "unknown"` and keep `referralNeedsManualReview: true`.

Use `ageGroups` whenever a source clearly limits access. The app filters these
records by the user's age so, for example, child/adolescent-only psychiatry does
not appear as a routine adult option.

When a resolved user address/suburb is available, normal in-person local GP,
counsellor, psychologist, psychiatrist, and men's-centre results are capped at
30 km. Same-region matching must not override real distance. Confirmed
telehealth, national services, helplines, directories, and public regional
pathways can still be shown with clear wording.

## Availability Watchlist

Do not promote a provider as a normal first-contact option when the source
clearly says they are full, closed to new clients, or unable to accept new
referrals. Prefer moving them to
`data/monitors/provider-availability-watchlist.json`. If a restrictive record is
kept as a deliberate fallback, mark it with `availabilityStatus:
"not_accepting"` or `"referrals_paused"` and `availabilityNeedsManualReview:
true`.

Run the audit and cautious monitor:

```sh
node tools/find-unavailable-providers.mjs
node tools/audit-availability-watchlist.mjs
node tools/audit-provider-availability.mjs
node tools/recheck-provider-availability.mjs
```

`find-unavailable-providers.mjs` scans current direct-care provider websites and
writes `data/reports/provider-unavailable-candidates.json` for manual review.
`audit-availability-watchlist.mjs` checks that unavailable watchlist records are
not also live in `providers.json` and that tracked "monitor, not added" notes
have matching watchlist URLs. `audit-provider-availability.mjs` writes
`data/provider-availability-audit.json` and
`AVAILABILITY_RECHECK_REPORT.md`. `recheck-provider-availability.mjs` re-checks
the watchlist slowly and writes `data/provider-availability-recheck-results.json`.
A detected change should be manually reviewed before adding the provider back to
the live database, because "possibly available" wording may still require a phone
or email confirmation.

## Discovery Queue

When a region or town has weak coverage, build a repeatable search queue rather
than relying on one-off manual searching:

```sh
npm run discover:providers
```

The script reads the Wikipedia populated-places table, maps places to the app's
regions where possible, and writes:

- `data/discovery/nz-populated-places.json`
- `data/discovery/provider-search-queue.json`
- `data/discovery/provider-search-results.json` when `--run-searches` is used
  with official Google Custom Search or Bing Web Search API keys

Each queued item covers a place, service type, search query, search engine, and
result page. Review provider-owned pages, professional profiles, Healthpoint,
Health NZ, PHOs, NGO pages, or professional body directories before adding live
records. Do not add a result just because it appears in a search result.

Useful narrow pass:

```sh
node tools/build-provider-discovery-queue.mjs --place Whangarei --run-searches --limit-searches 50
```

## General Practice Data

Health NZ directs people to Healthpoint to search for general practices and
filter by hours, location, services, and enrolment status. Healthpoint is useful
as a public first-contact pathway, but public directory pages must not be treated
as direct provider records. Directory pages should use `type: "directory"` and
must not appear as "Use this path" GP options.

The site also has a backend-only DoctorPricer importer for GP clinic records.
DoctorPricer publishes a public GP-practice search endpoint used by its own
site, with practice name, website, phone, address, coordinates, PHO, enrolment
state, and fee signals. The importer queries regional seed points slowly, dedupes
the results, filters obvious urgent-care / student-only / non-GP records, and
stores the clinic as `type: "gp"` so users can call the practice directly instead
of being sent to a directory.

```sh
node tools/import-doctorpricer-gps.mjs
```

Use a conservative rate limit if refreshing manually:

```sh
node tools/import-doctorpricer-gps.mjs providers.json --rate-limit-ms 5000
```

Because this source is not an official Health NZ register, keep the official
HPI/Healthpoint-approved pathway below as the preferred long-term source. If
DoctorPricer asks for different access terms, disable
`liveSources.doctorPricerGpPractices.enabled` in `provider-sources.json` and use
an approved CSV/FHIR export instead.

To import a permitted GP export, use:

```sh
node tools/import-gp-practices.mjs path/to/gp-practices.csv
```

The importer geocodes any new or updated records with a public physical address
and no `lat` / `lon`. Use `--no-geocode` for offline runs or restricted-source
imports that should not send address text to OpenStreetMap Nominatim.

Required CSV columns: `name`, `region`, `city`, `website`.

Optional CSV columns: `id`, `address`, `phone`, `email`, `lat`, `lon`, `hours`,
`cost`, `tags`, `fit`, `firstStep`, `source`, `verified`, `lastVerified`,
`confidence`, `sourceQuality`, and `needsManualVerification`.

Use `tags` separated by `|` or `;`. Good GP tags include `gp`, `primary-care`,
`depression`, `anxiety`, `cost`, `maori`, `pasifika`, `asian`,
`trauma-informed`, `female`, `male`, `telehealth`, and `enrolling`.

For Healthpoint, use the official HL7 FHIR API or an approved export rather than
scraping public pages:

```sh
HEALTHPOINT_API_URL="<approved-healthpoint-fhir-endpoint>" \
HEALTHPOINT_API_TOKEN="token-if-issued" \
node tools/fetch-healthpoint-fhir.mjs healthpoint-provider-bundle.json

node tools/import-provider-fhir.mjs healthpoint-provider-bundle.json
```

For ongoing refreshes, put approved exports in `data/imports/` and run:

```sh
node tools/refresh-provider-database.mjs
```

This imports approved GP/practice data, direct-care CSVs, approved FHIR bundles,
backend-only professional registers, opt-in RANZCP psychiatrist listings,
Mindwell online psychologists, and the curated search/Chrome gap-fill records,
then runs address/contact audits. It also geocodes public provider addresses so
distance ranking can use `lat` and `lon`.

## Curated Gap-Fill Records

`tools/import-gap-verified-providers.mjs` stores a small curated set of direct
contacts found during region/type gap checks. It is intentionally conservative:
provider-owned pages and trusted health/community directories are preferred, and
services that are closed, full, or only available for limited assessments are
written to `data/monitors/provider-availability-watchlist.json` instead of being
served as first-contact options.

Run it after a manual Google/Bing/Chrome search pass or as part of the full
refresh pipeline:

```sh
node tools/import-gap-verified-providers.mjs
```

## Long-Term Contact Import

Use structured provider-directory data rather than scraping public pages.

Preferred sources:

1. Healthpoint HL7 FHIR API. This is the best fit for public, user-facing
   service listings because it is designed to share current directory data,
   including service contact details, locations, referral information, and
   categories.
2. NZCCP Find a Clinical Psychologist directory. This is useful for clinical
   psychologist endpoints because listings include city, specialties, treatment
   approaches, public profiles, and sometimes direct contact details on profile
   pages. Use an approved/saved snapshot or export rather than live scraping.
3. Health NZ Health Provider Index FHIR API. This is authoritative for health
   organisations and facilities and can include contact details and addresses,
   but access is restricted to authorised health providers or organisations
   supporting them.
4. Medical Council Register of Doctors. Keep this as backend reference data for
   checking whether an individual doctor is registered, practising, and recorded
   under General Practice or another area of medicine. It is not a clinic
   contact directory and should not be served as a first-contact option.
5. PHO or provider-owned CSV exports, where the organisation has given
   permission to reuse contact details.

Direct-care source shortlist:

- New Zealand Psychologists Board public register:
  https://psychologistsboard.org.nz/search-register/
- NZCCP Find a Clinical Psychologist:
  https://www.nzccp.co.nz/for-the-public
- NZ Psychological Society PsychDirect:
  https://www.psychology.org.nz/public/find-psychologist
- RANZCP Find a Psychiatrist:
  https://www.ranzcp.org/college-committees/public-partners/find-a-psychiatrist
- Your Health in Mind Find a Psychiatrist:
  https://www.yourhealthinmind.org/find-a-psychiatrist
- Mindwell Online Psychology:
  https://www.mindwell.co.nz/
- TalkingWorks practitioner directory:
  https://www.talkingworks.co.nz/
- NZAC / Counselling Aotearoa approved exports, if a data-sharing agreement is
  available.

Do not scrape Healthpoint listing pages. Their public pages prohibit automated
extraction without written permission.

To import a FHIR Bundle from Healthpoint API, HPI API, or an approved export:

```sh
node tools/import-provider-fhir.mjs path/to/provider-bundle.json
```

The importer supports `Organization`, `HealthcareService`, and `Location`
resources and maps public `telecom` contact points into `phone`, `email`, and
`website` fields.

Approved FHIR bundles may also include `PractitionerRole` resources that connect
doctors to organisations and locations. Keep those in a backend-only register:

```sh
node tools/import-practitioner-roles-fhir.mjs data/imports/healthpoint-provider-bundle.json
```

This can help verify which GPs or psychiatrists are attached to which practice,
but users should usually contact the clinic or practice record rather than an
individual doctor record.

To import the Medical Council register after approved access has been granted:

```sh
node tools/import-mcnz-register.mjs data/imports/mcnz-register.csv
```

The output goes to `data/registers/doctors.json` and is backend-only. The Medical
Council register can include a doctor's registered address, but MCNZ states this
is not employment or practice information. Do not use that address as a clinic
recommendation unless a separate public clinic source confirms it.

To import a New Zealand Psychologists Board register export:

```sh
node tools/import-psychologists-board-register.mjs data/imports/psychologists-board-register.csv
node tools/prepare-psychologists-board-research.mjs data/imports/psychologists-board-register.csv
```

The register output is backend-only verification data. Use the research queue to
find separate public practice pages or approved directory exports before adding a
psychologist as a first-contact provider.

To import an approved NZCCP directory snapshot:

```sh
node tools/import-nzccp-directory.mjs path/to/nzccp-directory-pages path/to/profile-pages
```

The first path may be one saved directory HTML file or a folder containing saved
pagination pages. The optional profile folder lets the importer add direct email,
phone, or website contact details when profile pages publish them.

To import direct counsellor, psychologist, or psychiatrist contacts from an
approved CSV export:

```sh
node tools/import-care-providers.mjs path/to/care-providers.csv
```

The direct-care, GP, FHIR, NZCCP snapshot, and RANZCP importers all run the same
geocoding helper on newly added or updated records. If source data already
includes `lat` and `lon`, those coordinates are kept and no lookup is needed.

Required columns: `name`, `type`, `region`, `city`, `source`.
Optional columns include `id`, `address`, `lat`, `lon`, `phone`, `text`,
`email`, `website`, `bookingUrl`, `cost`, `hours`, `tags`, `fit`, `firstStep`, and
`verified`. Importers should also populate `lastVerified`, `confidence`,
`sourceQuality`, and `needsManualVerification`; use honest `medium` or `low`
confidence rather than implying a provider has been manually checked.

Optional structured fit columns such as `specialties`, `patientGroups`,
`ageGroups`, `services`, and `languages` can be stored as arrays when the source
publishes them. Do not infer opt-in support tags from a provider's name alone;
use these explicit fields or another public source.

`type` must be `counsellor`, `psychologist`, or `psychiatrist`. Each row must
include at least one of `phone`, `text`, `email`, or `website`, because these
records are intended to be direct care endpoints rather than directory hops.

Run this before publishing to check contact quality:

```sh
node tools/audit-provider-quality.mjs
node tools/audit-address-coverage.mjs
```

To import opt-in New Zealand psychiatrist listings from Your Health in Mind:

```sh
node tools/import-ranzcp-psychiatrists.mjs
```

The directory states that information is provided by individual psychiatrists and
that psychiatrists opt in to be included. Imported records should still be
reviewed regularly because wait times, new-patient status, and contact details
can change.

To import Mindwell's public online psychologist profiles:

```sh
node tools/import-mindwell-psychologists.mjs
```

This importer uses Mindwell's sitemap and provider-owned profile pages. Keep
the shared `team@mindwell.co.nz` contact attached to the service rather than
inventing individual clinician emails.

To use the New Zealand Psychologists Board register as a verification and
research source:

```sh
node tools/prepare-psychologists-board-research.mjs path/to/psychologists-board-register.csv
```

The Psychologists Board register should be treated as an authority for whether a
person is registered and whether they hold a current practising certificate. Do
not treat it as a direct contact directory. Use the generated research queue to
find public practice pages, clinic pages, professional profiles, and published
contact details before adding a provider record.
