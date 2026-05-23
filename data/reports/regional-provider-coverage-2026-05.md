# Regional Provider Coverage Audit - May 2026

Database expansion pass completed on 2026-05-24.

## Import Summary

- Added 94 regional mental-health, addiction, youth, kaupapa Maori, Pasifika, Rainbow, GP-linked, public-service, peer-support, and navigator entries.
- Every current location filter now has at least 5 newly added entries in `data/imports/regional-mental-health-services-2026-05.json`.
- Source links in the import were checked with a link audit before merge; the staged import returned 0 broken URLs.
- Directory/navigator entries were kept as `type: "directory"` and should not be treated as direct-contact providers.

## Coverage After Merge

| Region | Total entries | Direct/contactable entries | Psychologist/psychiatrist entries | New May 2026 entries |
| --- | ---: | ---: | ---: | ---: |
| Northland | 42 | 41 | 0 | 5 |
| Auckland | 359 | 354 | 13 | 5 |
| Waikato | 64 | 63 | 1 | 5 |
| Bay of Plenty | 57 | 55 | 2 | 5 |
| Rotorua and Taupo | 31 | 30 | 0 | 5 |
| Tairawhiti | 15 | 14 | 0 | 6 |
| Hawke's Bay | 27 | 26 | 0 | 5 |
| Taranaki | 34 | 33 | 1 | 5 |
| Manawatu-Whanganui | 46 | 45 | 0 | 7 |
| Wairarapa | 19 | 18 | 0 | 6 |
| Wellington | 91 | 90 | 8 | 6 |
| Nelson Marlborough Tasman | 32 | 31 | 1 | 6 |
| Canterbury | 130 | 128 | 15 | 7 |
| South Canterbury | 23 | 22 | 0 | 5 |
| West Coast | 12 | 11 | 0 | 6 |
| Otago | 44 | 43 | 8 | 5 |
| Southland | 29 | 28 | 0 | 5 |

## Regions With Good Coverage

- Auckland, Canterbury, Wellington, Otago, Waikato and Bay of Plenty have the strongest mix of direct-contact providers, local GP data, youth services, addiction pathways, and specialist psychology/psychiatry listings.
- Northland, Taranaki, Manawatu-Whanganui, Nelson Marlborough Tasman and Rotorua/Taupo now have useful community, youth, AOD, kaupapa Maori, and public-service coverage.

## Regions Still Thin

- Tairawhiti, Wairarapa, South Canterbury, West Coast, Hawke's Bay and Southland still need more direct private psychologists, psychiatrists, and counsellors with public email/phone contact.
- West Coast remains the thinnest region by total count, but the pass added local public AOD, youth online, kaupapa Maori, Pact, Homebuilders and Health NZ pathways.
- Tairawhiti and Wairarapa rely mostly on Health NZ, kaupapa Maori providers, peer/community supports, addiction services, and navigators rather than many specialist private clinicians.

## Entries Needing Follow-Up Verification

These entries were added with `confidence: "medium"` because the source is a trusted directory, a provider overview page, or otherwise not a direct service page with all details:

- Te Hau Ora o Ngapuhi
- Pinnacle Access and Choice / Te Tumu Waiora
- Turning Point Trust
- Nga Kakano Foundation
- Navigate Bay of Plenty
- Ember Rotorua and Lakes Community Support
- Te Taiwhenua o Heretaunga
- Taranaki Retreat
- Taranaki Mental Health Assessment and Brief Care
- THINK Hauora Access and Choice
- Youth One Stop Shop Palmerston North
- Te Oranganui
- CareNZ Wellington
- Te Whare Mahana
- Care Marlborough
- Whanake Youth
- Te Tahi Youth
- Qtopia
- MHAPS Canterbury
- Purapura Whetu
- Health Point Timaru
- Centrecare Waimate
- Poutini Waiora
- West Coast Mental Health and Addiction Services
- Pact West Coast
- Homebuilders West Coast
- Mirror Services
- Adventure Development Otago
- OCASA
- Nga Kete Matauranga Pounamu
- Adventure Development Southland
- Pact Southland

## Source URLs Used

### Northland

- https://otangarei.org/contact/
- https://tehono.directory/providers/te-hau-ora-o-ngapuhi
- https://www.healthnz.govt.nz/hospitals-services/hospitals/northland/community-clinics/northland-youth-health-service
- https://www.nhht.co.nz/mental-health-addictions
- https://www.odyssey.org.nz/contact

### Auckland

- https://ry.org.nz/auckland-services
- https://www.healthpoint.co.nz/mental-health-addictions/mental-health/ember-korowai-takitini/
- https://www.healthpoint.co.nz/mental-health-addictions/mental-health/kahui-tu-kaha/
- https://www.healthpoint.co.nz/mental-health-addictions/mental-health/vaka-tautua-mental-health-support/
- https://www.odyssey.org.nz/contact

### Waikato

- https://www.healthpoint.co.nz/100-seddon-road-frankton-hamilton/
- https://www.healthpoint.co.nz/mental-health-addictions/mental-health/te-korowai-hauora-o-hauraki-hinengaro-mental/at/15-princes-street-paeroa/
- https://www.odyssey.org.nz/our-services/rangatahi/waikato-youth-intact
- https://www.pinnacle.co.nz/contact
- https://www.progresstohealth.org.nz/

### Bay of Plenty

- https://getsmarttga.org.nz/
- https://mentalhealth.org.nz/groups/group/navigate-a-community-support-collective
- https://ngakakano.org.nz/contact-us/
- https://turningpoint.org.nz/turning-point
- https://www.healthpoint.co.nz/mental-health-addictions/mental-health/te-manu-toroa-trust-mental-health-addiction/at/tebbs-lane-gate-pa-tauranga/

### Rotorua and Taupo

- https://info.health.nz/locations/rotorua-taupo-lakes/mental-health-addiction/adult-mhas-taupo
- https://www.healthpoint.co.nz/mental-health-addictions/addiction/manaaki-ora-trust-3/at/1-brookland-road-western-heights-rotorua/
- https://www.healthpoint.co.nz/mental-health-addictions/mental-health/ember-korowai-takitini/
- https://www.lifewise.org.nz/mental-health-addiction/
- https://www.progresstohealth.org.nz/

### Tairawhiti

- https://healthpoint.co.nz/mental-health-addictions/mental-health/te-hauora-o-turanganui-a-kiwa-ltd-mental/at/145-derby-street-gisborne/
- https://info.health.nz/locations/tairawhiti-gisborne/mental-health-and-addiction-services-tairawhiti
- https://www.healthpoint.co.nz/26-peel-street-gisborne/
- https://www.healthpoint.co.nz/mental-health-addictions/mental-health/adult-community-mental-health-addiction-services-1/at/79-lowe-street-gisborne/
- https://www.healthpoint.co.nz/mental-health-addictions/mental-health/infant-child-and-adolescent-mental-health-2/at/gisborne-hospital/
- https://www.healthpoint.co.nz/mental-health-addictions/mental-health/ngati-porou-oranga-mental-health-services/at/66-customhouse-street-gisborne/

### Hawke's Bay

- https://ttoh.iwi.nz/contact%20us
- https://witservices.co.nz/
- https://www.healthnz.govt.nz/hospitals-services/hospitals/hawkes-bay/mental-health-and-addiction-services-in-hawkes-bay

### Taranaki

- https://www.healthpoint.co.nz/mental-health-addictions/mental-health/tui-ora-mental-health-addiction-services/
- https://www.progresstohealth.org.nz/
- https://www.taranakiretreat.org.nz/directory/cat/addictionssupport/
- https://www.tutamawahine.org.nz/contact

### Manawatu-Whanganui

- https://mist.org.nz/
- https://teoranganui.co.nz/
- https://www.healthpoint.co.nz/mental-health-addictions/mental-health/community-mental-health-addiction-service/at/7-blackwell-street-marton/
- https://www.mashtrust.org.nz/
- https://www.thinkhauora.nz/
- https://www.whatever.org.nz/
- https://www.yoss.org.nz/

### Wairarapa

- https://healthpoint.co.nz/mental-health-addictions/mental-health/te-hauora-runanga-o-wairarapa/
- https://piki.org.nz/support
- https://waisct.org.nz/changeability/
- https://waisct.org.nz/king-street-artworks/
- https://waisct.org.nz/pathways/
- https://waisct.org.nz/wairarapa-oasis/

### Wellington

- https://graceslist.org/directory-listing/new-zealand/wellington/carenz-2/
- https://piki.org.nz/support
- https://www.evolveyouth.org.nz/contact
- https://www.familyservices.govt.nz/directory/viewprovider.htm?cat1=-1&id=23600&pageNumber=452&pageSize=10
- https://www.vibe.org.nz/contact-us
- https://youthline.co.nz/our-centres/

### Nelson Marlborough Tasman

- https://mentalhealth.org.nz/groups/group/care-marlborough
- https://www.futureready.org.nz/listing/whanake-youth/
- https://www.healthaction.org.nz/
- https://www.healthpoint.co.nz/mental-health-addictions/mental-health/nelson-bays-primary-health-mental-health/
- https://www.mvip.co.nz/uploads/2/0/0/9/20099639/mental_health_and_where_to_go_for_help__in__nelson_tasman.pdf
- https://www.tpo.org.nz/contact-us

### Canterbury

- https://www.cinch.org.nz/mobile/1638/entry/892
- https://www.healthpoint.co.nz/mental-health-addictions/mental-health/he-waka-tapu/at/161-pages-road-wainoni-christchurch/
- https://www.manukarere.org.nz/contact
- https://www.mhaps.org.nz/
- https://www.pw.maori.nz/
- https://www.qtopia.org.nz/
- https://www.tetahiyouth.org.nz/

### South Canterbury

- https://southcanterbury.org.nz/business-listing/health-point-timaru-ampss101/
- https://www.futureready.org.nz/listing/centrecare-waimate/
- https://www.healthnz.govt.nz/locations/south-canterbury/integrated-primary-mental-health-addiction-ipmha
- https://www.healthpoint.co.nz/mental-health-addictions/addiction/alcohol-other-drugs-aod-south-canterbury/
- https://www.healthpoint.co.nz/mental-health-addictions/mental-health/arowhenua-whanau-services/

### West Coast

- https://homebuilderstrust.co.nz/whatwedo/
- https://new.healthpoint.co.nz/mental-health-addictions/addiction/rata-alcohol-and-other-drugs-service-west/at/buller-health-hospital/
- https://westcoasthealth.nz/your-health/mental-health/youth-online-program
- https://www.wcdhb.health.nz/health-services/mental-health/
- https://www.wcdhb.health.nz/wp-content/uploads/Maternal-Mental-Health-Pathway.pdf

### Otago

- https://wellsouth.nz/your-health/mental-health-and-wellbeing/toku-oranga-access-and-choice
- https://www.familyservices.govt.nz/directory/viewprovider.htm?cat1=68&cat2=877&id=1648&pageNumber=1&pageSize=10
- https://www.mirrorservices.org.nz/
- https://www.ocasa.org.nz/
- https://www.tekaika.nz/services/toku-oranga

### Southland

- https://nkmp.maori.nz/
- https://wellsouth.nz/your-health/mental-health-and-wellbeing/toku-oranga-access-and-choice
- https://www.familyservices.govt.nz/directory/viewprovider.htm?cat1=68&cat2=877&id=1648&pageNumber=1&pageSize=10
- https://www.number10.org.nz/helpful-info
- https://www.pactgroup.co.nz/
