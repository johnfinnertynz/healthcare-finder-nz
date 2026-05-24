# Review Report

Date: 2026-05-24

## Summary

Reviewed the static Care Finder Aotearoa app, provider database, data tooling,
GitHub Pages deployment shape, accessibility basics, and main user flows.

Tested:

- Local app at `http://127.0.0.1:4173/`
- GitHub Pages URL returns `200` with title `Care Finder Aotearoa`
- Desktop rendered flow in the in-app Browser
- Responsive screenshots at 360, 390, 768, and 1024 px using headless Chromium
- Guided questions, address autocomplete, recommendation cards, provider list,
  "Use this path", message builder, `mailto:`, `tel:`, SMS, and website actions
- Auckland, Canterbury, South Canterbury, Otago, and opt-in Asian support flows
- Provider data validation, preference audit, address audit, availability
  watchlist audit, and link checks

## Bugs Found And Fixed

### High

- Christchurch men's support was still keyed on a loose `/canterbury/i` match.
  This could show Christchurch-specific support for South Canterbury users.
  Fixed by gating it to the actual `Canterbury` matched region only.
- Mobile screenshots showed horizontal clipping at narrow widths. Fixed mobile
  hero/safety button stacking, button wrapping, and min-width behaviour for key
  containers.
- Cultural preference matches could be buried below generic matches. Adjusted
  top recommendation ordering so selected Maori/Pasifika/Asian/Rainbow/provider
  gender matches are promoted while keeping GP, psychologist, and psychiatrist
  exact-type choices strict.

### Medium

- Provider JSON load failure only changed a counter. Added a clearer unavailable
  database state with 1737 and 111 fallback guidance.
- Provider-card external website and directory links did not consistently open
  safely. Added `target="_blank"` and `rel="noopener noreferrer"` for rendered
  provider/path external links.
- Public link check found broken user-visible GP website URLs for Birkenhead
  Medical Centre and Kawhia Health Centre. Replaced visible websites with
  provider-specific Healthpoint pages and added DoctorPricer importer overrides
  so refreshes do not reintroduce those URLs.
- The site did not visibly state that it is not a replacement for professional
  care. Added a short safety disclaimer to the urgent help band.

### Low

- Link checker mixed user-visible provider websites with backend verification
  source URLs. Updated it so default checks focus on links users can open, with
  `CHECK_PROVIDER_SOURCES=true` for stricter source audits.
- CI did not run the new data validation and workflow tests. Added validation and
  Node test steps to the provider data audit workflow.

### Cosmetic

- Mobile button layout now stacks consistently and avoids clipped label text.

## Fixes Applied

- Added `tools/validate-provider-data.mjs`.
- Added `tests/provider-data.test.mjs`.
- Added `tests/user-workflows.test.mjs` with 20 simulated personas.
- Added `DATA_QUALITY.md`.
- Updated `README.md` with link-checking mode notes.
- Updated `.github/workflows/provider-data-audit.yml` to run syntax checks,
  validation, and tests.
- Updated provider data for two broken GP websites.
- Updated importer URL overrides for those GP websites.

## Remaining Risks

- `node tools/validate-provider-data.mjs` passes but warns that 986 records do
  not yet have `confidence`. This is mainly imported GP/directory data and should
  be filled progressively.
- Address coverage audit shows missing coordinates for some non-GP support,
  youth, addiction, public-service, psychologist, and counsellor records. GP
  records have full coordinate coverage.
- `CHECK_PROVIDER_SOURCES=true node tools/check-links.mjs` is expected to flag at
  least one backend source URL for manual review: `starfishclinic.com` currently
  has a TLS certificate hostname mismatch. The Starfish provider records still
  have phone/email, but their source should be re-verified.
- Many official Health NZ and provider sites block automated link checks with
  `403`. These are documented as blocked-by-site, not broken.
- Local psychiatrist coverage remains thin outside Auckland, Canterbury, Otago,
  Wellington, Northland, Bay of Plenty, and Nelson Marlborough Tasman. National
  telehealth psychiatry improves fallback coverage but is not the same as local
  access.

## Data Gaps By Region

Regions with stronger broad coverage:

- Auckland: 358 records, strong GP and psychiatrist coverage, but few local
  non-GP counsellor records.
- Canterbury: 129 records, strong GP, psychologist, psychiatrist, youth, and
  addiction coverage.
- Otago: 47 records, improved local psychologist and psychiatrist coverage.
- Wellington: 91 records, strong GP and psychiatrist coverage, but few local
  counsellor records.
- Bay of Plenty and Northland: useful GP, psychologist, public, addiction, and
  limited psychiatry coverage.

Regions still thin for local psychologists/psychiatrists/counsellors:

- Hawke's Bay: no local psychiatrist records.
- Manawatu-Whanganui: no local psychiatrist records and few psychologists.
- Rotorua and Taupo: no local psychiatrist records.
- South Canterbury: no local psychiatrist records.
- Southland: no local psychiatrist records.
- Tairawhiti: no local psychiatrist records.
- Taranaki: no local psychiatrist records.
- Waikato: no local psychiatrist records.
- Wairarapa: no local psychiatrist records.
- West Coast: no local psychologist or psychiatrist records.

## Commands Run

- `node --check script.js`
- `node --check tools/*.mjs`
- `node --check tests/*.mjs`
- `node --test tests/*.test.mjs` - passed, 7/7 tests
- `node tools/validate-provider-data.mjs` - passed, 0 errors, 986 warnings
- `node tools/audit-provider-quality.mjs providers.json` - passed
- `node tools/audit-support-preferences.mjs providers.json` - passed with review
  notes only
- `node tools/audit-address-coverage.mjs providers.json` - passed with coverage
  gaps listed
- `node tools/audit-availability-watchlist.mjs` - passed
- `node tools/check-links.mjs` - passed, 0 broken links; 19 blocked-by-site
  links; 66 redirects
- `Invoke-WebRequest https://johnfinnertynz.github.io/healthcare-finder-nz/` -
  returned `200`

## Suggested Next Pass

- Fill `confidence` on GP/imported records in the import pipeline.
- Add coordinates for non-GP support records where public physical addresses are
  available.
- Re-verify Starfish Clinic source URLs or move those records to manual review if
  no stable public source can be found.
- Expand local psychiatrist and psychologist coverage in thin regions, especially
  West Coast, Waikato, Taranaki, Wairarapa, Southland, and Tairawhiti.
- Add a lightweight browser e2e runner if this grows beyond a static app.
