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
- `specialties`
- `patientGroups`
- `ageGroups`
- `fit`
- `firstStep`
- `source`
- `verified`
- `lastVerified`
- `confidence`
- `sourceQuality`
- `needsManualVerification`
- `needScope`
- `availabilityStatus`
- `availabilityCheckedAt`
- `availabilitySource`
- `availabilityNeedsManualReview`

Psychiatry records must also include:

- `baselineScope`
- `baselineScopeSource`
- `baselineScopeNote`
- `advertisedSpecialties`
- `advertisedSpecialtyEvidence`
- `specialtyTagsSource`
- `requiresReferral`
- `referralType`
- `referralSourceUrl`
- `referralSourceExcerpt`
- `referralConfidence`
- `referralLastChecked`
- `referralNeedsManualReview`

Recommended fields:

- `address`
- `lat` and `lon`
- `phone`
- `text`
- `email`
- `website`
- `bookingUrl`
- `hours`
- `eligibility`
- `crisisOnly`
- `onlineAvailable`
- `phoneSupport`
- `inPerson`

Current schema aliases:

- `source` is the source URL.
- `verified` is the last verified month in `YYYY-MM` format.
- `lastVerified` mirrors the latest known verification/import month and is used
  for launch-readiness checks.
- `sourceQuality` describes the kind of source, such as provider-owned page,
  trusted health directory, official agency page, professional directory, or
  third-party GP listing.
- `needsManualVerification` is `true` when a listing should be checked by a
  person before stronger claims are made.
- `needScope` is always present. Use `[]` for broad services, or a narrow list
  such as `["trauma"]`, `["addiction"]`, or `["work"]` when the source only
  supports a limited pathway. This prevents sexual-harm-only, addiction-only,
  and work/rehab-only providers from ranking for unrelated concerns.
- `patientGroups`, `ageGroups`, `specialties`, `services`, and `languages` are
  optional structured source fields. Use them when a directory explicitly
  publishes them, especially for support-preference evidence.
- `tags` currently carry support flags such as `maori`, `pasifika`, `asian`,
  `rainbow`, `trauma-informed`, `telehealth`, `female`, `male`, `cost`,
  `crisis`, `addiction`, `psychiatry-service`, and `direct-contact`.
- `availabilityStatus` must be one of `accepting`, `waitlist`,
  `not_accepting`, `referrals_paused`, `unknown`, or `not_published`.
- `availabilityCheckedAt` is the date or month when availability was last
  checked, in `YYYY-MM-DD` or `YYYY-MM` format.
- `availabilitySource` is the source URL used for the status. This may be the
  same as `source` or `website`.
- `availabilityEvidence` stores the short public phrase that supports an
  explicit status. Do not invent this text.
- `availabilityNeedsManualReview` is `true` when the status is uncertain,
  restrictive, stale, or based on indirect wording.
- `referralType` must be `gp`, `self`, `specialist`, or `unknown` for
  psychiatrist and psychiatry-service records. Use `unknown` when the source is
  unclear; do not infer self-referral from silence.
- `requiresReferral` means the stored source indicates referral is required or
  usually needed. It does not mean every direct contact route is useless; it
  means the UI should guide the user toward a GP/clinician referral first.
- `baselineScope` is only for named psychiatrist records. It is a conservative
  routing aid based on the Medical Council of New Zealand psychiatry vocational
  scope, which describes psychiatry as assessment, diagnosis, and treatment of
  psychological, emotional, or cognitive problems. It must not be displayed as
  an advertised specialty.
- `advertisedSpecialties` contains profile/source-backed interests or
  specialties only. These may appear as "listed interests" in the UI and can
  receive a stronger ranking boost than `baselineScope`.
- `advertisedSpecialtyEvidence` stores the short source evidence for the
  advertised interests. Do not copy broad baseline capability into this field.
- `specialtyTagsSource` explains whether broad tags came from listed
  interests, source-backed service text, or another reviewed source.

## Verification Rules

- Prefer official provider pages, Healthpoint-approved data, Health NZ, PHOs,
  professional bodies, NGO-owned pages, or approved exports.
- Use Healthpoint and broad directories as source or website links for a specific
  provider when needed, but do not treat a broad directory as a direct provider.
- A direct provider must have at least one usable public contact route: phone,
  text, email, or official website/contact page.
- Directory records must be marked `type: "directory"` or tagged `directory`.
  They must not show "Use this contact" in the UI.
- Directory records must not be tagged `direct-contact`. If a navigation phone
  number is retained for human review, it must be allowlisted in the source-fit
  audit and still treated as a directory in the UI.
- Crisis records must be tagged `crisis` and should only appear in crisis or
  fallback contexts, not as routine first-contact recommendations.
- Crisis-only records must be `helpline`, `public-service`, or `directory`
  records, not routine GP, counsellor, psychologist, or psychiatrist records.
- Use `psychiatry-service` for public specialist mental health teams that are a
  valid route to psychiatry or medication-specialist assessment, but are not
  private psychiatrist listings. Keep their `type` as `public-service` or
  `youth` unless the listing is a named psychiatrist or psychiatry practice.
- Psychiatrists are treated differently from psychologists and counsellors
  because they are medical specialists within a vocational scope of psychiatry.
  A psychiatrist record may carry baseline capability metadata for common
  psychiatric presentations such as mood disorders, anxiety disorders, bipolar
  disorder, psychosis, trauma/PTSD, and diagnosis/medication/risk assessment.
  This is for routing only. It is not a claim that the profile advertises those
  conditions as special interests.
- ADHD/neurodevelopmental assessment and substance/addiction comorbidity may be
  added to psychiatrist `baselineScope` when the profile or tags give a specific
  reason to treat that as relevant. Prefer explicit advertised specialties when
  available.
- Psychologist and counsellor records do not get baseline condition scope.
  Depression, anxiety, trauma, addiction, work stress, and cultural/support tags
  still need source evidence through `specialties`, `services`, `fit`,
  `patientGroups`, or reviewed tags.
- Private psychiatrist listings must carry referral metadata. If a profile says
  a GP referral is needed, the main first step should be booking with a GP and
  bringing the psychiatrist details, not emailing the psychiatrist as the main
  action.
- RANZCP Your Health in Mind psychiatrist profile records are GP-referral-first
  unless a newer source gives stronger contrary evidence. Keep the source URL
  and a short referral excerpt on the record.
- The approved `baselineScopeSource` is the Medical Council psychiatry
  vocational scope page:
  `https://www.mcnz.org.nz/registration/scopes-of-practice/vocational-and-provisional-vocational/types-of-vocational-scope/psychiatry/`.
- Use `ageGroups` where a source limits access. The website filters these
  records so child/adolescent-only and older-adult-only services are not shown
  to clearly incompatible ages.
- If a provider page says books are closed, not taking new clients, or not
  accepting referrals, do not promote it as a normal first-contact option. Move
  it to `data/monitors/provider-availability-watchlist.json` where possible, or
  keep it labelled with `availabilityStatus: "not_accepting"` /
  `"referrals_paused"` only when there is a deliberate fallback reason.
- Do not publish private emails, personal mobile numbers, or register addresses
  unless they are clearly public professional contact details.
- Keep MCNZ and Psychologists Board register data backend-only unless a separate
  public practice source confirms the user-facing contact.
- When a resolved user address/suburb is available, in-person local GP,
  counsellor, psychologist, psychiatrist, and men's-centre matches must be
  within 30 km. Region-only matching must not make a Blenheim provider look
  local to Golden Bay. Confirmed telehealth, national services, helplines,
  directories, and public regional pathways may be shown separately or labelled
  clearly.

## Support Preference Tags

Opt-in cultural and safety tags are hidden unless selected:

- `maori`
- `pasifika`
- `asian`
- `rainbow`

Provider gender is stored separately from general support tags where possible:

- `providerGender: "female"`
- `providerGender: "male"`
- optional `providerGenderSource` and `providerGenderEvidence`

Legacy `female` and `male` tags may still exist, but new imports should prefer
`providerGender` so a clinician's gender is not confused with a service focus
such as men's health or women's health. Only use provider-gender metadata when a
public source explicitly supports it. Do not infer ethnicity, culture, gender,
or affirming practice from a provider name alone.

## Availability Freshness Rules

Availability is not the same as link reachability. A provider website can be
online while the provider is full, paused, or waitlisting.

- `accepting` needs explicit public evidence such as "accepting new clients" or
  "currently available"; it must not be guessed from a booking button alone.
- `unknown` and `not_published` are normal for many providers. They stay visible
  with confirm-availability wording.
- `waitlist` stays visible but is ranked lower than unknown/not-published
  providers with similar fit.
- `not_accepting` and `referrals_paused` are excluded from the first care-path
  cards unless there are no alternatives, and they must be labelled clearly.
- Restrictive statuses should be rechecked at least every 14 days. Waitlist
  statuses should be rechecked at least every 30 days. Accepting, unknown, and
  not-published statuses should be refreshed at least every 90 days.
- Stale restrictive records need human review before being treated as available.
- Use `data/provider-availability-allowlist.json` only for short-lived, reviewed
  exceptions. Every item needs `id`, `rule`, `reason`, `reviewedBy`,
  `reviewedDate`, and `expiryDate`.

The availability tools are:

```sh
node tools/audit-provider-availability.mjs
node tools/recheck-provider-availability.mjs
```

The audit writes `data/provider-availability-audit.json` and
`AVAILABILITY_RECHECK_REPORT.md`. The recheck tool writes
`data/provider-availability-recheck-results.json` and never changes
`providers.json` automatically.

## Psychiatrist Referral Rules

Psychiatry is often a referral pathway, not a simple "email this person"
pathway. The app should reduce friction without sending users into a dead end.

- `referralType: "gp"` means a GP appointment is the practical first step.
- `referralType: "self"` needs public evidence of self-referral, online booking,
  direct patient enquiry, or an equivalent pathway.
- `referralType: "specialist"` means another clinician or health professional
  referral is required or usually expected.
- `referralType: "unknown"` stays eligible, but the UI must say referral
  requirements are unclear and may need checking.
- Do not mark `self` just because a phone number or email is published.

Run:

```sh
node tools/audit-psychiatrist-referrals.mjs
```

The audit writes `data/provider-psychiatrist-referral-audit.json` and
`PSYCHIATRIST_REFERRAL_AUDIT.md`.

## Update Checklist

Before committing provider data changes:

1. Run `node tools/validate-provider-data.mjs`.
2. Run `node tools/audit-provider-source-fit.mjs`.
3. Run `node tools/audit-provider-availability.mjs`.
4. Run `node tools/audit-psychiatrist-referrals.mjs`.
5. Run `node tools/audit-provider-quality.mjs providers.json`.
6. Run `node tools/audit-support-preferences.mjs providers.json`.
7. Run `node tools/audit-address-coverage.mjs providers.json`.
8. Run `node tools/audit-availability-watchlist.mjs`.
9. Run `node tools/check-links.mjs`.
10. Check exact contact-type filters: GP, counsellor, psychologist, psychiatrist.
11. Check opt-in filters: Maori, Pasifika, Asian, Rainbow, trauma-informed,
   telehealth, female provider, male provider.
12. Check one local workflow in a large city and one in a thin-coverage region.
13. Use `MANUAL_VERIFICATION_PLAN.md` for priority phone/email checks during
    soft launch.

## Human Review Queue

Use the provider review queue when audit output or manual verification flags
need a human decision:

```sh
npm run export:review
```

The export produces `data/provider-review-queue.json`,
`data/provider-review-queue.csv`, and `PROVIDER_REVIEW_QUEUE.md`. The queue is
focused by default. It prioritises high-severity audit findings, providers that
can affect first recommendations, psychiatrist referral uncertainty,
availability risk, unsupported broad tags, weak support-preference evidence,
weak telehealth evidence, geocode concerns, directory/direct-contact confusion,
register-only records, missing contact details, low confidence, and stale
verification dates.

Use `admin/index.html` for local review. It is a static prototype only: it does
not write to provider data. Reviewers export decisions, then apply them through:

```sh
npm run apply:review
```

Supported decisions are `approve`, `adjust`, `reject`, `move_to_watchlist`,
`duplicate`, and `needs_more_info`. `correctedFields` is intentionally
allowlisted. Unsafe fields are rejected unless an explicit unsafe-field flag is
used for an exceptional local maintenance task.

Every applied decision appends to `data/provider-review-log.jsonl`. The log is
the audit trail and should not be rewritten during normal review work.

## Structured Evidence Model

Review queue items can include structured source evidence:

```json
{
  "sourceEvidence": {
    "contact": [],
    "address": [],
    "availability": [],
    "referral": [],
    "scope": [],
    "tags": {},
    "telehealth": [],
    "cultural": [],
    "cost": []
  }
}
```

Each evidence item supports:

- `field`
- `value`
- `sourceUrl`
- `excerpt`
- `capturedAt`
- `confidence`
- `needsManualReview`

Do not fake excerpts. If an importer cannot capture a source excerpt for a
claim, mark the relevant evidence item as `needsManualReview: true`.

Never guess:

- accepting-new-client status
- psychiatrist self-referral
- Māori, Pasifika, Asian, Rainbow, trauma-informed, or telehealth support
- broad need tags such as depression, anxiety, trauma, addiction, or work
- whether a directory/register entry is a direct provider

## Source-Fit Audit

The source-fit audit protects against a record being more confident than its
source. It flags examples such as:

- sexual-harm-only sources tagged for general depression or anxiety
- addiction-only services ranking for unrelated low-mood support
- ACC, concussion, pain, or return-to-work providers used as broad psychology
- crisis pathways offered as routine first contacts
- directories with direct-contact signals
- national individual clinicians without telehealth evidence
- cultural-support or telehealth tags that lack public-source evidence
- register-only professionals without a separate public practice contact

High-severity findings fail CI unless a short-lived exception exists in
`data/provider-source-fit-allowlist.json`. Every allowlist item needs `id`,
`rule`, `reason`, `reviewedBy`, `reviewedDate`, and `expiryDate`; use it only
when the UI intentionally handles the risk safely.

Use this stricter command when source URLs, not only user-visible websites, need
network verification:

```sh
CHECK_PROVIDER_SOURCES=true node tools/check-links.mjs
```

Some official health and provider sites block automated link checks or rate-limit
them. Treat `401`, `403`, `429`, and Cloudflare-style `520`-`524` results as
"manual browser review needed" rather than automatically broken. The checker
uses a browser-like user agent by default; override `LINK_CHECK_USER_AGENT`,
`LINK_CHECK_RETRIES`, or `LINK_CHECK_CONCURRENCY` for slower manual audits.

## Known Data Risks

- Many imported GP and directory records are intentionally marked `medium`
  confidence with `needsManualVerification: true`. That does not mean the record
  is unusable; it means the source should be manually checked before wider public
  promotion.
- Several non-GP support services still need address or coordinate enrichment for
  stronger distance ranking.
- Local psychiatrist coverage is thin in many regions. National telehealth
  psychiatry helps, but it is not a full substitute for local specialist access.
- Source URLs can break even when the user-visible phone/email remains valid.
  Broken source URLs should trigger manual re-verification.
