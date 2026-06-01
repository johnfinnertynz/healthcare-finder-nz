# Regional Data Quality Priority Report

Generated: 2026-06-01T07:16:06.895Z

This is a reviewer triage report only. It highlights where the database looks thin, weakly sourced, stale, or risky; it does not prove provider availability and it does not update live recommendations.

## Summary

- Regions reviewed: 18
- High priority: 12
- Medium priority: 6
- Low priority: 0
- Live data mutation: none

## Regional Priorities

| Priority | Score | Region | Local direct | GP | Therapy | Psychologist | Psychiatrist | Youth | Addiction | Weak GP | Source-fit | Address gaps | First action |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| high | 211 | Auckland | 349 | 333 | 3 | 2 | 5 | 1 | 1 | 53 | 78 | 4 | Corroborate 53 GP records against practice-owned, Healthpoint, PHO, HPI, or approved FHIR sources. |
| high | 140 | Northland | 46 | 34 | 4 | 2 | 0 | 1 | 2 | 16 | 25 | 6 | Corroborate 16 GP records against practice-owned, Healthpoint, PHO, HPI, or approved FHIR sources. |
| high | 138 | Canterbury | 123 | 101 | 5 | 4 | 5 | 4 | 3 | 3 | 21 | 12 | Corroborate 3 GP records against practice-owned, Healthpoint, PHO, HPI, or approved FHIR sources. |
| high | 130 | Taranaki | 35 | 26 | 4 | 3 | 0 | 0 | 1 | 8 | 20 | 6 | Corroborate 8 GP records against practice-owned, Healthpoint, PHO, HPI, or approved FHIR sources. |
| high | 128 | Wellington | 84 | 74 | 2 | 1 | 2 | 3 | 1 | 3 | 25 | 6 | Corroborate 3 GP records against practice-owned, Healthpoint, PHO, HPI, or approved FHIR sources. |
| high | 126 | Manawatu-Whanganui | 48 | 37 | 3 | 2 | 0 | 2 | 0 | 10 | 25 | 7 | Corroborate 10 GP records against practice-owned, Healthpoint, PHO, HPI, or approved FHIR sources. |
| high | 125 | Nelson Marlborough Tasman | 32 | 23 | 3 | 2 | 0 | 1 | 0 | 1 | 16 | 7 | Corroborate 1 GP record against practice-owned, Healthpoint, PHO, HPI, or approved FHIR sources. |
| high | 113 | National | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 10 | 0 | Review national fallback records for overbroad tags, weak source evidence, or directory/direct-contact confusion. |
| high | 109 | Southland | 33 | 22 | 6 | 2 | 0 | 2 | 0 | 7 | 22 | 4 | Corroborate 7 GP records against practice-owned, Healthpoint, PHO, HPI, or approved FHIR sources. |
| high | 101 | South Canterbury | 25 | 16 | 6 | 2 | 0 | 0 | 0 | 2 | 15 | 7 | Corroborate 2 GP records against practice-owned, Healthpoint, PHO, HPI, or approved FHIR sources. |
| high | 98 | Waikato | 67 | 56 | 5 | 4 | 0 | 1 | 1 | 4 | 18 | 5 | Corroborate 4 GP records against practice-owned, Healthpoint, PHO, HPI, or approved FHIR sources. |
| high | 96 | Bay of Plenty | 57 | 48 | 4 | 2 | 0 | 1 | 1 | 2 | 19 | 3 | Corroborate 2 GP records against practice-owned, Healthpoint, PHO, HPI, or approved FHIR sources. |
| medium | 87 | Rotorua and Taupo | 34 | 24 | 3 | 2 | 0 | 0 | 2 | 2 | 13 | 7 | Corroborate 2 GP records against practice-owned, Healthpoint, PHO, HPI, or approved FHIR sources. |
| medium | 82 | Otago | 42 | 29 | 7 | 5 | 3 | 2 | 0 | 9 | 19 | 4 | Corroborate 9 GP records against practice-owned, Healthpoint, PHO, HPI, or approved FHIR sources. |
| medium | 74 | Tairawhiti | 16 | 7 | 4 | 2 | 0 | 0 | 2 | 4 | 11 | 2 | Corroborate 4 GP records against practice-owned, Healthpoint, PHO, HPI, or approved FHIR sources. |
| medium | 73 | West Coast | 12 | 4 | 1 | 1 | 0 | 0 | 1 | 1 | 9 | 5 | Corroborate 1 GP record against practice-owned, Healthpoint, PHO, HPI, or approved FHIR sources. |
| medium | 58 | Hawke's Bay | 31 | 20 | 4 | 2 | 1 | 1 | 1 | 0 | 12 | 6 | Review 12 medium source-fit findings for overbroad tags, directories, or weak support-preference evidence. |
| medium | 54 | Wairarapa | 20 | 11 | 4 | 2 | 0 | 1 | 1 | 1 | 3 | 9 | Corroborate 1 GP record against practice-owned, Healthpoint, PHO, HPI, or approved FHIR sources. |

## Region Detail

### Auckland

Priority: high (211)

Coverage: 349 local direct-care contacts, 333 GP, 3 counselling/psychology, 2 psychologist, 5 psychiatrist, 1 youth, 1 addiction.

Quality signals: 78 source-fit findings (0 unallowlisted high), 53 GP corroboration tasks, 11 availability findings, 0 referral findings, 4 address/coordinate gaps.

Recommended next actions:
- Corroborate 53 GP records against practice-owned, Healthpoint, PHO, HPI, or approved FHIR sources.
- Review 25 medium source-fit findings for overbroad tags, directories, or weak support-preference evidence.
- Check availability/referral/watchlist items so unavailable or GP-referral services do not lead first recommendations.
- Resolve address and coordinate gaps that affect distance ranking.

Sample records to inspect:
- gp-the-auckland-city-doctors-36-8570-174-7616 | gp | The Auckland City Doctors | GP source corroboration
- gp-airport-doctors-36-9962-174-7882 | gp | Airport Doctors | GP source corroboration
- gp-rosebank-road-medical-services-ltd-36-8944-174-6968 | gp | Rosebank Road Medical Services Ltd. | GP source corroboration
- auckland-auckland-mental-wellness-centre | psychologist | Auckland Mental Wellness Centre | broad-tag-without-source-support
- auckland-mt-eden-counselling-psychotherapy | counsellor | Mt Eden Counselling & Psychotherapy | weak-telehealth-evidence
- auckland-northspan-wellbeing | counsellor | Northspan Wellbeing | broad-tag-without-source-support
- crisis-auckland-central | public-service | Auckland Central Mental Health Crisis Team | missing address
- crisis-auckland-south-east | public-service | Auckland East and South Mental Health Crisis Team | missing address

### Northland

Priority: high (140)

Coverage: 46 local direct-care contacts, 34 GP, 4 counselling/psychology, 2 psychologist, 0 psychiatrist, 1 youth, 2 addiction.

Quality signals: 25 source-fit findings (0 unallowlisted high), 16 GP corroboration tasks, 0 availability findings, 0 referral findings, 6 address/coordinate gaps.

Recommended next actions:
- Corroborate 16 GP records against practice-owned, Healthpoint, PHO, HPI, or approved FHIR sources.
- Find the clearest local psychiatry referral pathway and capture whether GP referral is required.
- Review 9 medium source-fit findings for overbroad tags, directories, or weak support-preference evidence.
- Check availability/referral/watchlist items so unavailable or GP-referral services do not lead first recommendations.
- Resolve address and coordinate gaps that affect distance ranking.

Missing coverage signals: local psychiatrist or psychiatry pathway.

Sample records to inspect:
- gp-hikurangi-medical-centre-35-5965-174-2857 | gp | Hikurangi Medical Centre | GP source corroboration
- gp-wh-nau-ora-community-clinic-kaikohe-35-4081-173-7970 | gp | Whānau Ora Community Clinic - Kaikohe | GP source corroboration
- gp-commercial-street-surgery-35-3806-174-0683 | gp | Commercial Street Surgery | GP source corroboration
- gp-te-ara-tu-o-ng-ti-hine-35-3861-174-0698 | gp | Te Ara Tu o Ngāti Hine | weak-maori-evidence
- gp-te-ara-tu-o-ng-ti-hine-35-3882-174-0126 | gp | Te Ara Tu o Ngāti Hine | weak-maori-evidence
- gp-te-ara-tu-o-ng-ti-hine-35-7273-174-3173 | gp | Te Ara Tu o Ngāti Hine | weak-maori-evidence
- northland-healthnz-adult-community-mha | public-service | Te Tai Tokerau Adult Community Mental Health & Addiction Service | weak-telehealth-evidence
- crisis-northland | public-service | Northland Mental Health Crisis Team | missing address

### Canterbury

Priority: high (138)

Coverage: 123 local direct-care contacts, 101 GP, 5 counselling/psychology, 4 psychologist, 5 psychiatrist, 4 youth, 3 addiction.

Quality signals: 21 source-fit findings (0 unallowlisted high), 3 GP corroboration tasks, 3 availability findings, 0 referral findings, 12 address/coordinate gaps.

Recommended next actions:
- Corroborate 3 GP records against practice-owned, Healthpoint, PHO, HPI, or approved FHIR sources.
- Review 17 medium source-fit findings for overbroad tags, directories, or weak support-preference evidence.
- Check availability/referral/watchlist items so unavailable or GP-referral services do not lead first recommendations.
- Resolve address and coordinate gaps that affect distance ranking.

Sample records to inspect:
- gp-avonhead-surgery-43-5130-172-5553 | gp | Avonhead Surgery | GP source corroboration
- gp-qe2-medical-centre-43-4950-172-7112 | gp | QE2 Medical Centre | GP source corroboration
- gp-rangiora-medical-good-street-43-3021-172-5938 | gp | Rangiora Medical - Good Street | GP source corroboration
- canterbury-mherc | directory | Mental Health Education and Resource Centre | directory-treated-direct
- canterbury-lucid-psychotherapy | counsellor | Lucid Psychotherapy and Counselling | broad-tag-without-source-support
- canterbury-talking-therapy | counsellor | Talking Therapy Psychotherapy and Counselling Centre | broad-tag-without-source-support
- canterbury-healthnz-adult-crisis | public-service | Canterbury Adult Mental Health Single Point of Entry | missing address
- canterbury-caflink | youth | Canterbury CAFLink | missing address

### Taranaki

Priority: high (130)

Coverage: 35 local direct-care contacts, 26 GP, 4 counselling/psychology, 3 psychologist, 0 psychiatrist, 0 youth, 1 addiction.

Quality signals: 20 source-fit findings (0 unallowlisted high), 8 GP corroboration tasks, 1 availability findings, 0 referral findings, 6 address/coordinate gaps.

Recommended next actions:
- Corroborate 8 GP records against practice-owned, Healthpoint, PHO, HPI, or approved FHIR sources.
- Find the clearest local psychiatry referral pathway and capture whether GP referral is required.
- Add or verify a youth/rangatahi support pathway for this region.
- Review 12 medium source-fit findings for overbroad tags, directories, or weak support-preference evidence.
- Check availability/referral/watchlist items so unavailable or GP-referral services do not lead first recommendations.
- Resolve address and coordinate gaps that affect distance ranking.

Missing coverage signals: local psychiatrist or psychiatry pathway; local youth/rangatahi support.

Sample records to inspect:
- gp-eltham-health-centre-39-4313-174-2997 | gp | Eltham Health Centre | GP source corroboration
- gp-full-circle-medical-39-1561-174-2042 | gp | Full Circle Medical | GP source corroboration
- gp-the-nest-health-centre-39-1561-174-2042 | gp | The Nest Health Centre | GP source corroboration
- gp-tui-ora-hauora-wh-nau-ng-motu-39-0687-174-0679 | gp | Tui Ora Hauora ā-Whānau Ngāmotu | weak-maori-evidence
- gp-tui-ora-hauora-wh-nau-whaitara-39-0020-174-2353 | gp | Tui Ora Hauora ā-Whānau Whaitara | weak-maori-evidence
- taranaki-future-4u-counselling | counsellor | Future 4U Counselling | broad-tag-without-source-support
- taranaki-integrate-psychology | psychologist | Integrate Psychology | missing address
- taranaki-progress-to-health | public-service | Progress to Health Taranaki | missing address

### Wellington

Priority: high (128)

Coverage: 84 local direct-care contacts, 74 GP, 2 counselling/psychology, 1 psychologist, 2 psychiatrist, 3 youth, 1 addiction.

Quality signals: 25 source-fit findings (0 unallowlisted high), 3 GP corroboration tasks, 6 availability findings, 0 referral findings, 6 address/coordinate gaps.

Recommended next actions:
- Corroborate 3 GP records against practice-owned, Healthpoint, PHO, HPI, or approved FHIR sources.
- Review 22 medium source-fit findings for overbroad tags, directories, or weak support-preference evidence.
- Check availability/referral/watchlist items so unavailable or GP-referral services do not lead first recommendations.
- Resolve address and coordinate gaps that affect distance ranking.

Sample records to inspect:
- gp-kelburn-gps-41-2876-174-7656 | gp | Kelburn GPs | GP source corroboration
- gp-avalon-medical-centre-41-1977-174-9379 | gp | Avalon Medical Centre | GP source corroboration
- gp-t-tahi-bay-surgery-ltd-41-1089-174-8400 | gp | Tītahi Bay Surgery Ltd | GP source corroboration
- nzccp-alan-hackney | psychologist | Alan Hackney | register-only-public-contact
- nzccp-alana-malloy | psychologist | Alana Malloy | register-only-public-contact
- ranzcp-3038 | psychiatrist | Dr Justin Barry-Walsh | weak-telehealth-evidence
- ranzcp-4171 | psychiatrist | Prof Sunny Collings | weak-telehealth-evidence
- wellington-piki-youth-support | youth | Piki | missing address

### Manawatu-Whanganui

Priority: high (126)

Coverage: 48 local direct-care contacts, 37 GP, 3 counselling/psychology, 2 psychologist, 0 psychiatrist, 2 youth, 0 addiction.

Quality signals: 25 source-fit findings (0 unallowlisted high), 10 GP corroboration tasks, 0 availability findings, 0 referral findings, 7 address/coordinate gaps.

Recommended next actions:
- Corroborate 10 GP records against practice-owned, Healthpoint, PHO, HPI, or approved FHIR sources.
- Find the clearest local psychiatry referral pathway and capture whether GP referral is required.
- Add or verify alcohol, drug, or gambling support options for this region.
- Review 15 medium source-fit findings for overbroad tags, directories, or weak support-preference evidence.
- Resolve address and coordinate gaps that affect distance ranking.

Missing coverage signals: local psychiatrist or psychiatry pathway; local addiction support.

Sample records to inspect:
- gp-te-waiora-community-health-services-40-3700-175-2349 | gp | Te Waiora Community Health Services | GP source corroboration
- gp-horowhenua-community-practice-40-6287-175-2838 | gp | Horowhenua Community Practice | GP source corroboration
- gp-broadway-medical-chambers-40-3479-175-6257 | gp | Broadway Medical Chambers | GP source corroboration
- gp-best-care-whakapai-hauora-charitable-trust-40-3792-175-5843 | gp | Best Care (Whakapai Hauora) Charitable Trust | weak-maori-evidence
- manawatu-authentically-u | counsellor | Authentically U | broad-tag-without-source-support
- manawatu-cenpsyx-palmerston-north | psychologist | CenPsyX | broad-tag-without-source-support
- manawatu-mana-o-te-tangata-peer-support | public-service | Mana o te Tangata Trust | weak-telehealth-evidence
- crisis-manawatu-whanganui | public-service | Manawatu-Whanganui Mental Health Crisis Teams | missing address

### Nelson Marlborough Tasman

Priority: high (125)

Coverage: 32 local direct-care contacts, 23 GP, 3 counselling/psychology, 2 psychologist, 0 psychiatrist, 1 youth, 0 addiction.

Quality signals: 16 source-fit findings (0 unallowlisted high), 1 GP corroboration tasks, 3 availability findings, 0 referral findings, 7 address/coordinate gaps.

Recommended next actions:
- Corroborate 1 GP record against practice-owned, Healthpoint, PHO, HPI, or approved FHIR sources.
- Find the clearest local psychiatry referral pathway and capture whether GP referral is required.
- Add or verify alcohol, drug, or gambling support options for this region.
- Review 15 medium source-fit findings for overbroad tags, directories, or weak support-preference evidence.
- Check availability/referral/watchlist items so unavailable or GP-referral services do not lead first recommendations.
- Resolve address and coordinate gaps that affect distance ranking.

Missing coverage signals: local psychiatrist or psychiatry pathway; local addiction support.

Sample records to inspect:
- gp-florence-medical-centre-41-3415-173-1893 | gp | Florence Medical Centre | GP source corroboration
- gp-hauora-health-centre-41-2738-173-2873 | gp | Hauora Health Centre | weak-maori-evidence
- marlborough-rachael-sim-clinical-psychology | psychologist | Dr Rachael Sim Clinical Psychology | broad-tag-without-source-support
- marlborough-rosemary-crockett-counselling | counsellor | Rosemary Crockett Counselling | broad-tag-without-source-support
- marlborough-top-of-the-south-psych-services | psychologist | Top of the South Psych Services | broad-tag-without-source-support
- nelson-marlborough-tasman-care-marlborough | public-service | Care Marlborough | missing address
- crisis-nelson-marlborough-tasman | public-service | Nelson, Marlborough and Tasman Mental Health Crisis Teams | missing address
- nelson-marlborough-tasman-te-whare-mahana | public-service | Te Whare Mahana | missing address

### National

Priority: high (113)

Coverage: 0 local direct-care contacts, 0 GP, 0 counselling/psychology, 0 psychologist, 0 psychiatrist, 0 youth, 0 addiction.

Quality signals: 10 source-fit findings (0 unallowlisted high), 0 GP corroboration tasks, 4 availability findings, 0 referral findings, 0 address/coordinate gaps.

Recommended next actions:
- Review national fallback records for overbroad tags, weak source evidence, or directory/direct-contact confusion.
- Check national fallback availability, referral, and watchlist items before they are used as safety-net options.
- Keep national services as reviewed fallback options, not substitutes for local direct-care coverage.

Sample records to inspect:
- national-family-services-directory | directory | Family Services Directory / 211 Helpline | directory-treated-direct
- national-asian-family-services | counsellor | Asian Family Services | broad-tag-without-source-support
- national-empath-psychology | psychologist | Empath Psychology | broad-tag-without-source-support

### Southland

Priority: high (109)

Coverage: 33 local direct-care contacts, 22 GP, 6 counselling/psychology, 2 psychologist, 0 psychiatrist, 2 youth, 0 addiction.

Quality signals: 22 source-fit findings (0 unallowlisted high), 7 GP corroboration tasks, 0 availability findings, 0 referral findings, 4 address/coordinate gaps.

Recommended next actions:
- Corroborate 7 GP records against practice-owned, Healthpoint, PHO, HPI, or approved FHIR sources.
- Find the clearest local psychiatry referral pathway and capture whether GP referral is required.
- Add or verify alcohol, drug, or gambling support options for this region.
- Review 15 medium source-fit findings for overbroad tags, directories, or weak support-preference evidence.
- Check availability/referral/watchlist items so unavailable or GP-referral services do not lead first recommendations.
- Resolve address and coordinate gaps that affect distance ranking.

Missing coverage signals: local psychiatrist or psychiatry pathway; local addiction support.

Sample records to inspect:
- gp-bluff-medical-centre-46-6043-168-3503 | gp | Bluff Medical Centre | GP source corroboration
- gp-glengarry-medical-centre-46-4018-168-3855 | gp | Glengarry Medical Centre | GP source corroboration
- gp-queens-park-general-practice-ltd-46-4066-168-3530 | gp | Queens Park General Practice Ltd | GP source corroboration
- gp-waikiwi-medical-centre-46-3792-168-3474 | gp | Waikiwi Medical Centre | weak-maori-evidence
- southland-annelize-prinsloo-south-coast | psychologist | Annelize Prinsloo - South Coast Psychology | broad-tag-without-source-support
- southland-gore-counselling-centre | counsellor | Gore Counselling Centre | broad-tag-without-source-support
- southland-adventure-development | youth | Adventure Development Southland | missing address
- southland-nga-kete-matauranga-pounamu | public-service | Nga Kete Matauranga Pounamu | missing address

### South Canterbury

Priority: high (101)

Coverage: 25 local direct-care contacts, 16 GP, 6 counselling/psychology, 2 psychologist, 0 psychiatrist, 0 youth, 0 addiction.

Quality signals: 15 source-fit findings (0 unallowlisted high), 2 GP corroboration tasks, 0 availability findings, 0 referral findings, 7 address/coordinate gaps.

Recommended next actions:
- Corroborate 2 GP records against practice-owned, Healthpoint, PHO, HPI, or approved FHIR sources.
- Find the clearest local psychiatry referral pathway and capture whether GP referral is required.
- Add or verify a youth/rangatahi support pathway for this region.
- Add or verify alcohol, drug, or gambling support options for this region.
- Review 13 medium source-fit findings for overbroad tags, directories, or weak support-preference evidence.
- Resolve address and coordinate gaps that affect distance ranking.

Missing coverage signals: local psychiatrist or psychiatry pathway; local youth/rangatahi support; local addiction support.

Sample records to inspect:
- gp-temuka-family-practice-44-2416-171-2772 | gp | Temuka Family Practice | GP source corroboration
- gp-hirsch-ford-medical-44-3949-171-2480 | gp | Hirsch-Ford Medical | GP source corroboration
- south-canterbury-a-time-to-talk | counsellor | A Time to Talk | broad-tag-without-source-support
- south-canterbury-aod-service | addiction | Alcohol & Other Drugs (A&OD) South Canterbury | weak-telehealth-evidence
- south-canterbury-black-dog-therapy | counsellor | Black Dog Therapy | broad-tag-without-source-support
- crisis-south-canterbury | public-service | South Canterbury Mental Health Crisis Team | missing address
- south-canterbury-alice-mcclintock | psychologist | Alice McClintock - South Coast Psychology | missing coordinates
- south-canterbury-arowhenua-whanau-services | public-service | Arowhenua Whanau Services | missing coordinates

### Waikato

Priority: high (98)

Coverage: 67 local direct-care contacts, 56 GP, 5 counselling/psychology, 4 psychologist, 0 psychiatrist, 1 youth, 1 addiction.

Quality signals: 18 source-fit findings (0 unallowlisted high), 4 GP corroboration tasks, 0 availability findings, 0 referral findings, 5 address/coordinate gaps.

Recommended next actions:
- Corroborate 4 GP records against practice-owned, Healthpoint, PHO, HPI, or approved FHIR sources.
- Find the clearest local psychiatry referral pathway and capture whether GP referral is required.
- Review 14 medium source-fit findings for overbroad tags, directories, or weak support-preference evidence.
- Check availability/referral/watchlist items so unavailable or GP-referral services do not lead first recommendations.
- Resolve address and coordinate gaps that affect distance ranking.

Missing coverage signals: local psychiatrist or psychiatry pathway.

Sample records to inspect:
- gp-dr-k-pillay-ltd-37-8833-175-4638 | gp | Dr K Pillay LTD | GP source corroboration
- gp-dr-n-p-e-schofield-37-9057-175-4759 | gp | Dr N.P.E Schofield | GP source corroboration
- gp-duke-st-health-medical-centre-37-8950-175-4715 | gp | Duke St Health & Medical Centre | GP source corroboration
- gp-horotiu-hauora-family-health-37-7008-175-2034 | gp | Horotiu Hauora Family Health | weak-maori-evidence
- gp-raukura-hauora-o-tainui-nga-miro-37-6628-175-1543 | gp | Raukura Hauora O Tainui - Nga Miro | weak-maori-evidence
- gp-raukura-hauora-o-tainui-te-papanui-whare-haumanu-37-7714-175-2931 | gp | Raukura Hauora O Tainui - Te Papanui Whare Haumanu | weak-maori-evidence
- gp-raukura-hauora-o-tainui-te-rengarenga-37-7955-175-2457 | gp | Raukura Hauora O Tainui - Te Rengarenga | weak-maori-evidence
- gp-raukura-hauora-o-tainui-waahi-37-5583-175-1537 | gp | Raukura Hauora O Tainui - Waahi | weak-maori-evidence

### Bay of Plenty

Priority: high (96)

Coverage: 57 local direct-care contacts, 48 GP, 4 counselling/psychology, 2 psychologist, 0 psychiatrist, 1 youth, 1 addiction.

Quality signals: 19 source-fit findings (0 unallowlisted high), 2 GP corroboration tasks, 1 availability findings, 0 referral findings, 3 address/coordinate gaps.

Recommended next actions:
- Corroborate 2 GP records against practice-owned, Healthpoint, PHO, HPI, or approved FHIR sources.
- Find the clearest local psychiatry referral pathway and capture whether GP referral is required.
- Review 17 medium source-fit findings for overbroad tags, directories, or weak support-preference evidence.
- Check availability/referral/watchlist items so unavailable or GP-referral services do not lead first recommendations.
- Resolve address and coordinate gaps that affect distance ranking.

Missing coverage signals: local psychiatrist or psychiatry pathway.

Sample records to inspect:
- gp-te-korowai-hauora-o-hauraki-paeroa-37-3817-175-6707 | gp | Te Korowai Hauora o Hauraki - Paeroa | GP source corroboration
- gp-te-whare-hauora-o-raungaiti-37-7387-175-7379 | gp | Te Whare Hauora o Raungaiti | GP source corroboration
- bay-of-plenty-adult-community-mental-health | public-service | Adult Community Mental Health Service | Bay of Plenty | weak-telehealth-evidence
- bay-of-plenty-bay-counselling | counsellor | Bay Counselling and Therapy Service | broad-tag-without-source-support
- bay-of-plenty-psychology-group-tauranga | psychologist | The Psychology Group - Tauranga | broad-tag-without-source-support
- crisis-bay-of-plenty | public-service | Bay of Plenty Mental Health Crisis Teams | missing address
- bay-of-plenty-get-smart-tauranga | youth | Get Smart Tauranga | missing address
- bay-of-plenty-turning-point-trust | public-service | Turning Point Trust | missing coordinates

### Rotorua and Taupo

Priority: medium (87)

Coverage: 34 local direct-care contacts, 24 GP, 3 counselling/psychology, 2 psychologist, 0 psychiatrist, 0 youth, 2 addiction.

Quality signals: 13 source-fit findings (0 unallowlisted high), 2 GP corroboration tasks, 0 availability findings, 0 referral findings, 7 address/coordinate gaps.

Recommended next actions:
- Corroborate 2 GP records against practice-owned, Healthpoint, PHO, HPI, or approved FHIR sources.
- Find the clearest local psychiatry referral pathway and capture whether GP referral is required.
- Add or verify a youth/rangatahi support pathway for this region.
- Review 11 medium source-fit findings for overbroad tags, directories, or weak support-preference evidence.
- Resolve address and coordinate gaps that affect distance ranking.

Missing coverage signals: local psychiatrist or psychiatry pathway; local youth/rangatahi support.

Sample records to inspect:
- gp-lakeview-clinic-38-1425-176-2528 | gp | Lakeview Clinic | GP source corroboration
- gp-western-heights-health-centre-38-1288-176-2199 | gp | Western Heights Health Centre | GP source corroboration
- gp-te-r-nanga-o-ng-ti-pikiao-general-practice-38-1365-176-2492 | gp | Te Rūnanga o Ngāti Pikiao - General Practice | weak-maori-evidence
- rotorua-heads-and-hearts | psychologist | Heads and Hearts Psychology | broad-tag-without-source-support
- rotorua-healthnz-te-ngako-adult-mhas | public-service | Te Ngako Rotorua Adult Mental Health and Addictions Service | weak-telehealth-evidence
- rotorua-lakes-icamhs | youth | Infant, Child and Adolescent Mental Health Service | Lakes | weak-telehealth-evidence
- rotorua-taupo-ember-lakes-community-support | public-service | Ember Rotorua and Lakes Community Support | missing address
- rotorua-taupo-lifewise-rotorua | public-service | Lifewise Rotorua Mental Health & Addiction | missing address

### Otago

Priority: medium (82)

Coverage: 42 local direct-care contacts, 29 GP, 7 counselling/psychology, 5 psychologist, 3 psychiatrist, 2 youth, 0 addiction.

Quality signals: 19 source-fit findings (0 unallowlisted high), 9 GP corroboration tasks, 0 availability findings, 0 referral findings, 4 address/coordinate gaps.

Recommended next actions:
- Corroborate 9 GP records against practice-owned, Healthpoint, PHO, HPI, or approved FHIR sources.
- Add or verify alcohol, drug, or gambling support options for this region.
- Review 10 medium source-fit findings for overbroad tags, directories, or weak support-preference evidence.
- Resolve address and coordinate gaps that affect distance ranking.

Missing coverage signals: local addiction support.

Sample records to inspect:
- gp-albany-street-medical-centre-dunedin-45-8661-170-5089 | gp | Albany Street Medical Centre (Dunedin) | GP source corroboration
- gp-green-island-family-healthcare-45-9028-170-4301 | gp | Green Island Family Healthcare | GP source corroboration
- gp-helensburgh-medical-centre-45-8534-170-4836 | gp | Helensburgh Medical Centre | GP source corroboration
- dunedin-bernadette-berry-delta-psychology | psychologist | Bernadette Berry, Delta Psychology | broad-tag-without-source-support
- dunedin-otago-clinical-psychology-centre | psychologist | University of Otago Clinical Psychology Centre | broad-tag-without-source-support
- dunedin-parker-chin-psychology | psychologist | Parker & Chin Psychology | broad-tag-without-source-support
- gp-m-ori-hill-clinic-45-8581-170-5008 | gp | Māori Hill Clinic | weak-maori-evidence
- otago-adventure-development | youth | Adventure Development Otago | missing address

### Tairawhiti

Priority: medium (74)

Coverage: 16 local direct-care contacts, 7 GP, 4 counselling/psychology, 2 psychologist, 0 psychiatrist, 0 youth, 2 addiction.

Quality signals: 11 source-fit findings (0 unallowlisted high), 4 GP corroboration tasks, 0 availability findings, 0 referral findings, 2 address/coordinate gaps.

Recommended next actions:
- Corroborate 4 GP records against practice-owned, Healthpoint, PHO, HPI, or approved FHIR sources.
- Find the clearest local psychiatry referral pathway and capture whether GP referral is required.
- Add or verify a youth/rangatahi support pathway for this region.
- Review 7 medium source-fit findings for overbroad tags, directories, or weak support-preference evidence.
- Check availability/referral/watchlist items so unavailable or GP-referral services do not lead first recommendations.
- Resolve address and coordinate gaps that affect distance ranking.

Missing coverage signals: local psychiatrist or psychiatry pathway; local youth/rangatahi support.

Sample records to inspect:
- gp-city-medical-centre-gisborne-38-6645-178-0226 | gp | City Medical Centre Gisborne | GP source corroboration
- gp-de-lautour-medical-38-6683-178-0475 | gp | De Lautour Medical | GP source corroboration
- gp-te-puhi-kai-ti-community-health-centre-38-6741-178-0511 | gp | Te Puhi Kai-ti Community Health Centre | GP source corroboration
- tairawhiti-atawhai-counselling | counsellor | Atawhai Counselling and Supervision | broad-tag-without-source-support
- tairawhiti-icamhs-te-whare-o-te-rito | youth | ICAMHS Te Whare o te Rito | weak-telehealth-evidence
- tairawhiti-older-persons-mental-health-services | public-service | Older Persons Mental Health Services | Tairawhiti | weak-telehealth-evidence
- tairawhiti-te-whare-oranga | public-service | Te Whare Oranga Adult Community Mental Health & Addiction Services | weak-telehealth-evidence
- crisis-tairawhiti | public-service | Tairawhiti Mental Health Crisis Team | missing address

### West Coast

Priority: medium (73)

Coverage: 12 local direct-care contacts, 4 GP, 1 counselling/psychology, 1 psychologist, 0 psychiatrist, 0 youth, 1 addiction.

Quality signals: 9 source-fit findings (0 unallowlisted high), 1 GP corroboration tasks, 0 availability findings, 0 referral findings, 5 address/coordinate gaps.

Recommended next actions:
- Corroborate 1 GP record against practice-owned, Healthpoint, PHO, HPI, or approved FHIR sources.
- Find the clearest local psychiatry referral pathway and capture whether GP referral is required.
- Add or verify a youth/rangatahi support pathway for this region.
- Review 8 medium source-fit findings for overbroad tags, directories, or weak support-preference evidence.
- Check availability/referral/watchlist items so unavailable or GP-referral services do not lead first recommendations.
- Resolve address and coordinate gaps that affect distance ranking.

Missing coverage signals: local psychiatrist or psychiatry pathway; local youth/rangatahi support.

Sample records to inspect:
- gp-wood-medical-services-42-4442-171-1960 | gp | Wood Medical Services | GP source corroboration
- west-coast-adult-community-mental-health | public-service | Adult Community Mental Health Services | West Coast | weak-telehealth-evidence
- west-coast-camhs | youth | Child and Adolescent Mental Health Services | West Coast | weak-telehealth-evidence
- west-coast-health-primary-counselling | counsellor | West Coast Health - Primary Health Counselling Programme | broad-tag-without-source-support
- west-coast-homebuilders | public-service | Homebuilders West Coast | missing address
- west-coast-healthnz-mental-health-addiction | public-service | West Coast Mental Health and Addiction Services | missing address
- crisis-west-coast | public-service | West Coast Mental Health Crisis Team | missing address
- west-coast-proactive-greymouth-psychology | psychologist | Proactive Greymouth | missing coordinates

### Hawke's Bay

Priority: medium (58)

Coverage: 31 local direct-care contacts, 20 GP, 4 counselling/psychology, 2 psychologist, 1 psychiatrist, 1 youth, 1 addiction.

Quality signals: 12 source-fit findings (0 unallowlisted high), 0 GP corroboration tasks, 1 availability findings, 0 referral findings, 6 address/coordinate gaps.

Recommended next actions:
- Review 12 medium source-fit findings for overbroad tags, directories, or weak support-preference evidence.
- Check availability/referral/watchlist items so unavailable or GP-referral services do not lead first recommendations.
- Resolve address and coordinate gaps that affect distance ranking.

Sample records to inspect:
- gp-maraenui-medical-centre-39-5153-176-9056 | gp | Maraenui Medical Centre | weak-maori-evidence
- hawkes-bay-bay-psychology | psychologist | Bay Psychology | broad-tag-without-source-support
- hawkes-bay-community-mental-health-addiction | public-service | Hawke's Bay Community Mental Health and Addiction Services | weak-telehealth-evidence
- hawkes-bay-craig-colhoun | psychologist | Dr Craig Colhoun Psychology | broad-tag-without-source-support
- crisis-hawkes-bay | public-service | Hawke's Bay Mental Health Crisis Team | missing address
- hawkes-bay-te-taiwhenua-o-heretaunga | public-service | Te Taiwhenua o Heretaunga | missing address
- hawkes-bay-whakiao-taurima-counselling | counsellor | Whakiao Taurima Counselling | missing address
- hawkes-bay-healthnz-community-mhas | public-service | Hawke's Bay Community Mental Health and Addiction Services | missing coordinates

### Wairarapa

Priority: medium (54)

Coverage: 20 local direct-care contacts, 11 GP, 4 counselling/psychology, 2 psychologist, 0 psychiatrist, 1 youth, 1 addiction.

Quality signals: 3 source-fit findings (0 unallowlisted high), 1 GP corroboration tasks, 0 availability findings, 0 referral findings, 9 address/coordinate gaps.

Recommended next actions:
- Corroborate 1 GP record against practice-owned, Healthpoint, PHO, HPI, or approved FHIR sources.
- Find the clearest local psychiatry referral pathway and capture whether GP referral is required.
- Review 2 medium source-fit findings for overbroad tags, directories, or weak support-preference evidence.
- Resolve address and coordinate gaps that affect distance ranking.

Missing coverage signals: local psychiatrist or psychiatry pathway.

Sample records to inspect:
- gp-kuripuni-medical-centre-40-9584-175-6494 | gp | Kuripuni Medical Centre | GP source corroboration
- wairarapa-mhaids-camhs | youth | Wairarapa CAMHS | MHAIDS | weak-telehealth-evidence
- wairarapa-mhaids-community-mental-health | public-service | Wairarapa Community Mental Health Team | MHAIDS | weak-telehealth-evidence
- wairarapa-capital-psychology-assessments | psychologist | Capital Psychology - Wairarapa Assessments | missing address
- wairarapa-nic-allan-psychology | psychologist | Nicholas Allan Psychology | missing address
- wairarapa-piki-youth-support | youth | Piki Wellington and Wairarapa | missing address
- wairarapa-briar-nicol-counselling | counsellor | Briar Nicol Counselling | missing coordinates
- wairarapa-changeability-counselling | counsellor | ChangeAbility Counselling & Family Violence Services | missing coordinates

