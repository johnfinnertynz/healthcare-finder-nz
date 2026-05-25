# Provider Gap Audit - 2026-05-24

## Scope

This pass targeted region/type gaps where the local database had few or no
direct first-contact records, especially counsellors, psychologists,
psychiatrists, and specialist psychiatry pathways outside Christchurch and
Canterbury.

## Method

- Re-counted direct records by `region` and `type` from `providers.json`.
- Re-checked thin regions for counsellor, psychologist, psychiatrist, youth,
  addiction, public specialist mental health, and GP-linked support coverage.
- Used provider-owned pages, Healthpoint service pages, Health NZ pages, PHO
  pages, RANZCP/Your Health in Mind psychiatrist records, CAB/community
  directories, and local NGO pages as evidence.
- Treated broad directories as leads only. Live records were added only when a
  specific service or provider had a public contact route.
- Added a `psychiatry-service` tag for public specialist mental health teams
  that are valid psychiatry pathways but are not private psychiatrist listings.
- Added age-aware filtering so child/adolescent-only and older-adult-only
  specialist services do not crowd out adult results.
- Moved providers with closed books, broken websites, or unavailable streams to
  `data/monitors/provider-availability-watchlist.json`.

## Chrome Note

The earlier search batch used Chrome-based Google/Bing review and produced local
ignored evidence files under `data/reports/`. During this continuation, the
Chrome automation bridge did not respond even though Chrome, the extension, and
the native host manifest all checked as installed and enabled. The continuation
therefore used live source checks and the repo import/validation pipeline rather
than claiming fresh Chrome tab control.

## Discovery Channels That Worked

- RANZCP/Your Health in Mind records as psychiatrist leads, then remapped
  records with real local addresses out of generic `National` where appropriate.
- Healthpoint specific service pages for public specialist teams, not broad
  search-result directories.
- Health NZ and MHAIDS service pages for official entry points.
- Local PHO and GP-linked services for free or funded primary mental health
  support.
- CAB/community directories where a local provider page was otherwise thin.
- Provider-owned websites for private counsellors, psychologists, and
  telepsychiatry services.
- Availability text monitoring for providers that are full, closed, or only
  partially available.

## Live Records Added Or Strengthened

- National telepsychiatry: MSQ Health, Positive Mind Works Psychiatry, and
  MindCraft Psychiatry.
- RANZCP region mapping: Dr Vernon Reynolds now maps to Northland, Dr Helen
  Austin to Nelson Marlborough Tasman, and Prof Sunny Collings to Wellington.
- Northland: Steven Smithson Counselling and Te Tai Tokerau Adult Community
  Mental Health & Addiction Service.
- Bay of Plenty: AncorA Adult ADHD Clinic, Anteris Private Psychiatry, and Adult
  Community Mental Health Service | Bay of Plenty.
- Rotorua and Taupo: Brigette Hohepa Counselling, Resilience Counselling Taupo,
  Te Ngako Adult MHAS as a psychiatry pathway, and Lakes iCAMHS.
- Hawke's Bay: Community Mental Health and Addiction Services as a psychiatry
  pathway, plus the previously added local private counselling/psychology
  contacts.
- Manawatu-Whanganui: Palmerston North Community Mental Health as a psychiatry
  pathway, plus existing local counselling and psychiatry contacts.
- Wairarapa: MHAIDS Community Mental Health Team and Wairarapa CAMHS.
- South Canterbury: Community Mental Health | South Canterbury and Mental
  Health of Older People | South Canterbury.
- Southland: Southern Adult Community Mental Health Services.
- Tairawhiti: Te Whare Oranga, ICAMHS Te Whare o te Rito, and Older Persons
  Mental Health strengthened as psychiatry pathways.
- Taranaki: Space of Mind moved from watchlist to live for child/adolescent
  psychiatry after the current source showed appointment-request pathways.
- West Coast: West Coast Health Brief Intervention Service, Adult Community
  Mental Health Services | West Coast, and West Coast CAMHS.

## Watchlist Additions And Changes

The watchlist now has 19 items. Providers are not served live when the source
currently indicates closed books, unavailable services, imminent closure, broken
source pages, or limited streams:

- Creative Counselling, Kerikeri.
- MindMe Clinical Psychology, Northland.
- Wayfinder Psychology, Whangarei.
- Whangarei Care Centre Counselling, closing Friday 29 May 2026.
- Waikato Counselling, Hamilton.
- Northland Psychiatry, Dr Joseph Foote, limited to ACC/VA assessments.
- Calming Minds, Taranaki.
- South Coast Psychology Psychiatry, no psychiatry providers visible.
- Durkin Zintl Psychology, closed to new referrals.
- Mauri Psychology, fully booked/unavailable.
- Jade Psychology, maternity leave.
- Tosca Lammerts van Bueren Counselling, stale closed-status notice.
- Nova Mentem broad anxiety/mood/trauma/psychosis streams, currently at
  capacity; the live record is limited to currently open assessment streams.
- Janneke van Rooijen Psychology, provider-owned website currently returns 404.

Space of Mind was removed from the watchlist and added as a live
child/adolescent psychiatry contact because the current provider site shows
appointment-request pathways and public contact details.

## Remaining Thin Areas

- West Coast still lacks a live local private psychologist. Internal Growth
  Holistic Psychology remains on the watchlist because it is at capacity.
- Rotorua/Taupo, South Canterbury, Wairarapa, and West Coast still have few
  private psychiatrist records, but now have specific public specialist
  psychiatry-service pathways instead of unrelated GP or helpline substitutions.
- Several public psychiatry pathways are referral-based. The UI now treats them
  as specialist pathways, not private psychiatrist contacts.
- Some medium-confidence community-directory and professional-directory records
  should be manually phoned or emailed before broad public promotion.
- Some new addresses did not geocode automatically and need manual coordinate
  enrichment for better distance ranking.

## Further Discovery Ideas

- Ask Healthpoint again for API/export access and keep public Healthpoint pages
  as manual verification sources only; do not scrape them at scale without
  permission.
- Use the RANZCP import as a recurring backend refresh, with region correction
  tests for addresses that otherwise land in `National`.
- Use Psychologists Board, NZCCP, NZ Psychological Society, NZAC, and TalkingWorks
  as lead lists, then only publish records where a provider-owned page or
  trusted directory confirms public contact details.
- Search local CAB/community directories for towns with few private providers:
  Taupo, Rotorua, Greymouth, Hokitika, Westport, Wairoa, Masterton, and Timaru.
- Monitor provider websites that say not taking clients and only return them to
  live results after a human confirms availability.
- Add a manual verification spreadsheet export for providers marked
  `needsManualVerification: true`, prioritised by thin regions and high-use
  pathways.

## Verification Run

- `node tools/validate-provider-data.mjs`: 1210 providers, 0 errors, 0 warnings.
- `node --test tests/*.test.mjs`: 13 tests passed.
- `node tools/audit-availability-watchlist.mjs`: 19 watchlist items, 0 errors.
- `node tools/audit-provider-quality.mjs`: 0 missing contact details, 0 stale
  verification warnings, 0 directory-like direct-care records.
- `node tools/audit-support-preferences.mjs`: 0 missing opt-in tags; review-only
  weak-evidence notes remain for some cultural/gender/trauma tags.
- `node tools/check-links.mjs`: 446 links checked, 0 broken, 16 blocked by site.
