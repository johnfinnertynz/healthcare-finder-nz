# Specialist Gap Fill - May 2026

This pass used public provider websites, Healthpoint pages, Health NZ pages,
professional directory profiles, and local NGO/service pages to fill regions
where the app had few direct counsellor, psychologist, or psychiatrist options.

## Added Or Updated

- 61 sourced import records reviewed.
- 59 new provider records added to `providers.json`.
- 2 existing records improved with better direct contact detail or source data.
- Total provider records after merge: 1142.

## Coverage Notes

Regions with stronger specialist coverage after this pass:

- Waikato, Bay of Plenty, Taranaki, Nelson Marlborough Tasman, Canterbury, Otago.
- West Coast now has direct local counselling pathways instead of only broad public-service entries.
- Dunedin/Otago now includes Psychiatry Down South, a direct private psychiatry practice.

Regions still thin for private/local specialist choice:

- Northland: local psychologist options and one psychiatry route added.
- Tairawhiti: useful counselling and psychology contacts added; no local private psychiatrist found.
- Hawke's Bay: psychology and counselling coverage improved; no local psychiatrist found.
- Manawatu-Whanganui: psychology coverage improved; psychiatry still relies on public, GP, or telehealth routes.
- Wairarapa: some local psychology/counselling options found; no local psychiatrist found.
- South Canterbury: local counselling and psychology options improved; no local private psychiatrist found.
- West Coast: local counselling options found; no active local psychologist taking referrals or local psychiatrist confirmed.
- Southland: counselling and psychology improved; psychiatry still relies mostly on telehealth or referral pathways.
- Starfish Clinic contact details were found from the indexed provider page, but the site blocked automated direct checks during this pass, so those records are marked medium confidence and have website buttons hidden.

## Source Examples

- Psychiatry Down South: https://www.psychiatrydownsouth.co.nz/contact
- West Coast Health Primary Health Counselling: https://www.healthpoint.co.nz/mental-health-addictions/mental-health/west-coast-health-primary-health-counselling/at/west-coast-health-office-163-mackay-street/
- West Coast Counselling: https://westcoastcounselling.co.nz/
- Kensington Clinic listing: https://westcoastconnect.co.nz/directory/kensington-clinic/
- Heartwood Psychiatry: https://www.heartwoodpsychiatry.co.nz/
- Tom O'Flynn Psychiatrist: https://www.healthpoint.co.nz/private/psychiatry/tom-oflynn-psychiatrist/
- LaNae Fisk Psychology: https://www.lanaefiskpsychology.co.nz/
- Reihana Psychology: https://www.reihanapsychology.co.nz/
- Mokonui-a-rangi TALK: https://www.mokonuiarangi.org/
- Gore Counselling Centre: https://www.gorecounsellingcentre.com/
- Loss and Grief Centre Southland: https://www.lossandgriefcentre.com/our-centres/southland-centre
- The Starfish Clinic: https://www.starfishclinic.com/contact/
- Bay Psychology: https://baypsychology.co.nz/contact-us/
- Massey Palmerston North Psychology Clinic: https://www.massey.ac.nz/about/clinics-and-services-for-the-public/massey-psychology-clinics/palmerston-north-manawat%C5%AB-psychology-clinic-massey-university/
- WellMind: https://wellmind.co.nz/
- The Psychology Centre: https://tpc.org.nz/
- Phoenix Psychology: https://phoenixpsychology.co.nz/
- TalkingPoint: https://www.talkingpoint.co.nz/
- The Nelson Clinic: https://nelsonclinic.nz/contact-us
- South Coast Psychology: https://southcoastpsychology.co.nz/
- Coliber Group Psychiatry: https://www.coliber.nz/appointments/

## Verification

Commands run:

```sh
node tools/audit-provider-quality.mjs providers.json
node tools/audit-support-preferences.mjs providers.json
node tools/audit-address-coverage.mjs providers.json
```

Results:

- `providers.json` parses successfully.
- No duplicate provider IDs.
- Direct care records: 974.
- Missing contact details in direct-care records: 0.
- Directory-like records incorrectly typed as direct care: 0.
- GP directories incorrectly typed as GPs: 0.

## Follow-Up Queue

- Continue targeted searches for local psychiatry in Northland, Tairawhiti, Hawke's Bay, Manawatu-Whanganui, Wairarapa, South Canterbury, West Coast, and Southland.
- Recheck West Coast private psychology availability; Internal Growth was found but currently states it is full and not taking new clients.
- Keep using backend-only professional registers as verification sources, then add only public practice/contact pages as user-facing provider records.
