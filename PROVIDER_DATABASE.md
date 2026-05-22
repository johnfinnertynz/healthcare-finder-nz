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
- `phone`: public phone number, digits preferred
- `text`: public text/SMS number, if available
- `email`: public professional email, if available
- `website`: official website or trusted directory listing
- `hours`: contact hours or access notes
- `cost`: free, funded, private, public service, or varies
- `tags`: search and matching tags such as `depression`, `anxiety`, `trauma`,
  `cost`, `male`, `rangatahi`, `same-day`, `privacy`
- `fit`: plain-language description of who this is good for
- `firstStep`: the smallest action a user can take
- `source`: URL used to verify the listing
- `verified`: month verified, formatted `YYYY-MM`

## Import Rule

If a listing is only a directory and not a direct provider, mark `type` as
`directory`. Direct contact details are more useful, but directories are still
valuable when they help users find fit, cost, culture, or availability.

## General Practice Data

Health NZ directs people to Healthpoint to search for general practices and
filter by hours, location, services, and enrolment status. Healthpoint is useful
as a public first-contact pathway, but its site terms prohibit scraping or
extracting listings without written permission. For that reason, the database
uses Healthpoint GP directory records for NZ-wide coverage until a permitted
bulk source is available.

To import a permitted GP export, use:

```sh
node tools/import-gp-practices.mjs path/to/gp-practices.csv
```

Required CSV columns: `name`, `region`, `city`, `website`.

Optional CSV columns: `id`, `address`, `phone`, `email`, `hours`, `cost`,
`tags`, `fit`, `firstStep`, `source`, `verified`.

Use `tags` separated by `|` or `;`. Good GP tags include `gp`, `primary-care`,
`depression`, `anxiety`, `cost`, `maori`, `pasifika`, `asian`,
`trauma-informed`, `female`, `male`, `telehealth`, and `enrolling`.

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

Do not scrape Healthpoint listing pages. Their public pages prohibit automated
extraction without written permission.

To import a FHIR Bundle from Healthpoint API, HPI API, or an approved export:

```sh
node tools/import-provider-fhir.mjs path/to/provider-bundle.json
```

The importer supports `Organization`, `HealthcareService`, and `Location`
resources and maps public `telecom` contact points into `phone`, `email`, and
`website` fields.

To import an approved NZCCP directory snapshot:

```sh
node tools/import-nzccp-directory.mjs path/to/nzccp-directory-pages path/to/profile-pages
```

The first path may be one saved directory HTML file or a folder containing saved
pagination pages. The optional profile folder lets the importer add direct email,
phone, or website contact details when profile pages publish them.
