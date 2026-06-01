# Location And Distance Review Pack

Generated: 2026-06-01T09:24:29.845Z

This pack is for human review only. It does not change `providers.json`, and it does not prove provider type, clinical scope, availability, referral pathway, cost, telehealth, or support-preference claims.

## Summary

- Review items: 104
- Items with candidate location evidence: 26
- Items with draft location fields: 22
- Review batches: 25

## By Issue Type

| Issue | Items |
| --- | ---: |
| coordinate_gap_candidate | 19 |
| location_review | 3 |
| missing_address | 68 |
| missing_coordinates | 14 |

## Review Batches

| Items | Providers | Batch | Suggested action |
| ---: | ---: | --- | --- |
| 37 | 37 | location-review:missing_address:source_lookup_needed:no_candidate:public-service | Find a public professional address source or leave as source lookup work. |
| 15 | 15 | location-review:missing_address:source_lookup_needed:no_candidate:youth | Find a public professional address source or leave as source lookup work. |
| 6 | 6 | location-review:missing_address:source_lookup_needed:no_candidate:psychologist | Find a public professional address source or leave as source lookup work. |
| 5 | 5 | location-review:missing_address:source_lookup_needed:no_candidate:counsellor | Find a public professional address source or leave as source lookup work. |
| 5 | 5 | location-review:missing_coordinates:geocode_or_source_lookup:no_candidate:counsellor | Use a public professional address source or geocoder result, then keep coordinates review-gated. |
| 5 | 5 | location-review:missing_coordinates:geocode_or_source_lookup:no_candidate:psychologist | Use a public professional address source or geocoder result, then keep coordinates review-gated. |
| 3 | 3 | location-review:coordinate_gap_candidate:manual_compare_conflict:strong_match:public-service | Compare manually; do not apply coordinates until the provider/location identity is clear. |
| 3 | 3 | location-review:coordinate_gap_candidate:manual_compare_conflict:strong_match:youth | Compare manually; do not apply coordinates until the provider/location identity is clear. |
| 3 | 3 | location-review:coordinate_gap_candidate:ready_for_location_review:strong_match:public-service | Open Maps/source, confirm the same provider or clinic location, then draft location-only coordinate/address updates. |
| 3 | 3 | location-review:missing_address:manual_compare_conflict:strong_match:public-service | Compare manually; do not apply coordinates until the provider/location identity is clear. |
| 3 | 3 | location-review:missing_coordinates:geocode_or_source_lookup:no_candidate:public-service | Use a public professional address source or geocoder result, then keep coordinates review-gated. |
| 2 | 2 | location-review:coordinate_gap_candidate:manual_compare_conflict:probable_match:public-service | Compare manually; do not apply coordinates until the provider/location identity is clear. |
| 2 | 2 | location-review:coordinate_gap_candidate:ready_for_location_review:strong_match:psychologist | Open Maps/source, confirm the same provider or clinic location, then draft location-only coordinate/address updates. |
| 1 | 1 | location-review:coordinate_gap_candidate:manual_compare_conflict:probable_match:addiction | Compare manually; do not apply coordinates until the provider/location identity is clear. |
| 1 | 1 | location-review:coordinate_gap_candidate:manual_compare_needed:weak_match:public-service | Compare manually; do not apply coordinates until the provider/location identity is clear. |
| 1 | 1 | location-review:coordinate_gap_candidate:manual_compare_needed:weak_match:youth | Compare manually; do not apply coordinates until the provider/location identity is clear. |
| 1 | 1 | location-review:coordinate_gap_candidate:ready_for_location_review:probable_match:addiction | Open Maps/source, confirm the same provider or clinic location, then draft location-only coordinate/address updates. |
| 1 | 1 | location-review:coordinate_gap_candidate:ready_for_location_review:probable_match:psychologist | Open Maps/source, confirm the same provider or clinic location, then draft location-only coordinate/address updates. |
| 1 | 1 | location-review:coordinate_gap_candidate:ready_for_location_review:strong_match:youth | Open Maps/source, confirm the same provider or clinic location, then draft location-only coordinate/address updates. |
| 1 | 1 | location-review:location_review:manual_compare_conflict:probable_match:counsellor | Compare manually; do not apply coordinates until the provider/location identity is clear. |
| 1 | 1 | location-review:location_review:manual_compare_conflict:strong_match:gp | Compare manually; do not apply coordinates until the provider/location identity is clear. |
| 1 | 1 | location-review:location_review:manual_compare_conflict:strong_match:public-service | Compare manually; do not apply coordinates until the provider/location identity is clear. |
| 1 | 1 | location-review:missing_address:manual_compare_conflict:probable_match:public-service | Compare manually; do not apply coordinates until the provider/location identity is clear. |
| 1 | 1 | location-review:missing_address:source_lookup_needed:no_candidate:addiction | Find a public professional address source or leave as source lookup work. |
| 1 | 1 | location-review:missing_coordinates:geocode_or_source_lookup:no_candidate:addiction | Use a public professional address source or geocoder result, then keep coordinates review-gated. |

## Top Items

| Priority | Provider | Type | Region / city | Current location | Candidate | Signals | Draft fields |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ready_for_location_review | national-pathways-primary-mental-health - Pathways Primary Mental Health Services | public-service | National / Auckland, Hauraki, Hamilton, Tauranga, Rotorua, Taupo, Wairarapa, Wellington, Nelson, Christchurch | Salmond House, 57 Vivian Street, Te Aro, Wellington 6011 | Pathways Salmond House 57 Vivian Street, Te Aro, Wellington 6011 | phone, website-domain, address | lat, lon, coordinateSource, coordinatePrecision, coordinateConfidence, geocodeNeedsManualReview |
| ready_for_location_review | wellington-rebecca-webster-clinical-psychologist - Rebecca Webster Clinical Psychologist | psychologist | Wellington / Te Aro | ClinicalSpaces, Level 9, 2 Manners Street, Te Aro, Wellington | Psych Clinic 1 Willeston Street, Wellington Central, Wellington 6011 | phone, website-domain | lat, lon, coordinateSource, coordinatePrecision, coordinateConfidence, geocodeNeedsManualReview |
| ready_for_location_review | wellington-vincents-art-workshop - Vincents Art Workshop | public-service | Wellington / Wellington | Willis St Village, 5/148 Willis Street, Wellington | Vincents Art Workshop Village, 5/148 Willis Street, Te Aro, Wellington 6011 | phone, website-domain, name | lat, lon, coordinateSource, coordinatePrecision, coordinateConfidence, geocodeNeedsManualReview |
| ready_for_location_review | wellington-evolve-youth-service - Evolve Wellington Youth Service | youth | Wellington / Wellington | Level 2, James Smith Building, Corner Cuba and Manners Streets, Wellington | Evolve Wellington Youth Service James Smith Building Corner Cuba & Level 2/Manners Street, Te Aro, Wellington 6011 | website-domain, name | lat, lon, coordinateSource, coordinatePrecision, coordinateConfidence, geocodeNeedsManualReview |
| ready_for_location_review | west-coast-proactive-greymouth-psychology - Proactive Greymouth | psychologist | West Coast / Greymouth | Unit D/64 High Street, Greymouth 7805 | Proactive Healthcare Greymouth - Physio, Health & Wellbeing & Occupational Health Unit D/64 High Street, Greymouth 7805 | website-domain, address | lat, lon, coordinateSource, coordinatePrecision, coordinateConfidence, geocodeNeedsManualReview |
| ready_for_location_review | manawatu-whanganui-healthnz-cmhas - Whanganui Community Mental Health & Addiction Service | public-service | Manawatu-Whanganui / Whanganui / Marton / Taihape | Te Kopae Building, Whanganui Hospital | Community Mental Health And Addiction Service Acute Services Building Building G/100 Heads Road, Gonville, Whanganui 4501 | coordinate-gap-target, name | lat, lon, coordinateSource, coordinatePrecision, coordinateConfidence, geocodeNeedsManualReview |
| ready_for_location_review | wairarapa-oasis-gambling-support - Oasis Wairarapa | addiction | Wairarapa / Masterton | Wairarapa Community Centre, 41 Perry Street, Masterton | The Salvation Army Oasis 41 Perry Street, Masterton 5810 | phone | lat, lon, coordinateSource, coordinatePrecision, coordinateConfidence, geocodeNeedsManualReview |
| ready_for_location_review | wellington-cbt-clinic - CBT Clinic | psychologist | Wellington / Wellington CBD | Level 6, AMI Plaza, 342-352 Lambton Quay, Wellington | Cognitive Behaviour Therapy Clinic Level 6, AMI Plaza 342 Lambton Quay, Central, Wellington 6011 | website-domain | lat, lon, coordinateSource, coordinatePrecision, coordinateConfidence, geocodeNeedsManualReview |
| manual_compare_conflict | rotorua-taupo-progress-to-health - Progress to Health Taupo | public-service | Rotorua and Taupo / Taupo |  | Progress To Health Taranaki 36 Devon Street West, New Plymouth Central, New Plymouth 4310 | website-domain, name, coordinate-gap-address-search-needs-review | address, lat, lon, coordinateSource, coordinatePrecision, coordinateConfidence, geocodeNeedsManualReview |
| manual_compare_conflict | taranaki-mhsop - Mental Health Services for Older People \| Taranaki | public-service | Taranaki / New Plymouth and Hawera | Te Puna Waiora, Taranaki Base Hospital, David Street, New Plymouth | Progress To Health Taranaki 36 Devon Street West, New Plymouth Central, New Plymouth 4310 | website-domain, name, coordinate-gap-address-search-needs-review | lat, lon, coordinateSource, coordinatePrecision, coordinateConfidence, geocodeNeedsManualReview |
| manual_compare_conflict | taranaki-progress-to-health - Progress to Health Taranaki | public-service | Taranaki / Taranaki |  | Progress To Health Taranaki 36 Devon Street West, New Plymouth Central, New Plymouth 4310 | website-domain, name, coordinate-gap-address-search-needs-review | address, lat, lon, coordinateSource, coordinatePrecision, coordinateConfidence, geocodeNeedsManualReview |
| manual_compare_conflict | waikato-progress-to-health - Progress to Health Waikato | public-service | Waikato / Hamilton | 18 Rostrevor Street, Hamilton \| -37.7807093 \| 175.2786117 | Progress To Health Taranaki 36 Devon Street West, New Plymouth Central, New Plymouth 4310 | website-domain, name, coordinate-gap-address-search-needs-review |  |
| manual_compare_conflict | wairarapa-pathways-masterton - Pathways Masterton | public-service | Wairarapa / Masterton | Level 1, Departmental Building, 35-37 Chapel Street, Masterton | Pathways Masterton Level 1, The Departmental Building 35/37 Chapel Street, Masterton 5810 | website-domain, phone, name | lat, lon, coordinateSource, coordinatePrecision, coordinateConfidence, geocodeNeedsManualReview |
| manual_compare_conflict | gp-te-nikau-health-centre-42-4633-171-1921 - Te Nikau Health Centre | gp | West Coast / Default | 71 Waterwalk Road, Greymouth, Default 7805 \| -42.4632728 \| 171.1920973 | West Coast District Health Board Te Nīkau Hospital & Health Centre, 71 Water Walk Road, Greymouth 7805 | coordinate-gap-address-search-needs-review, phone, website-domain |  |
| manual_compare_conflict | west-coast-adult-community-mental-health - Adult Community Mental Health Services \| West Coast | public-service | West Coast / Greymouth, Hokitika, and Westport | Te Nikau Grey Hospital, 71 Water Walk Road, Greymouth | West Coast District Health Board Te Nīkau Hospital & Health Centre, 71 Water Walk Road, Greymouth 7805 | coordinate-gap-address-search-needs-review, phone, website-domain | lat, lon, coordinateSource, coordinatePrecision, coordinateConfidence, geocodeNeedsManualReview |
| manual_compare_conflict | west-coast-healthnz-mental-health-addiction - West Coast Mental Health and Addiction Services | public-service | West Coast / West Coast |  | West Coast District Health Board Te Nīkau Hospital & Health Centre, 71 Water Walk Road, Greymouth 7805 | coordinate-gap-address-search-needs-review, phone, website-domain | address, lat, lon, coordinateSource, coordinatePrecision, coordinateConfidence, geocodeNeedsManualReview |
| manual_compare_conflict | west-coast-camhs - Child and Adolescent Mental Health Services \| West Coast | youth | West Coast / Greymouth and wider West Coast | Te Nikau Grey Hospital, 71 Water Walk Road, Greymouth | West Coast District Health Board Te Nīkau Hospital & Health Centre, 71 Water Walk Road, Greymouth 7805 | coordinate-gap-address-search-needs-review, phone, website-domain | lat, lon, coordinateSource, coordinatePrecision, coordinateConfidence, geocodeNeedsManualReview |
| manual_compare_conflict | south-canterbury-community-mental-health - Community Mental Health \| South Canterbury | public-service | South Canterbury / Timaru | Kensington Centre, Corner High and Queen Streets, Timaru | Kensington Centre 7 Queen Street, Parkside, Timaru 7910 | phone, coordinate-gap-address-search-needs-review | lat, lon, coordinateSource, coordinatePrecision, coordinateConfidence, geocodeNeedsManualReview |
| manual_compare_conflict | south-canterbury-mental-health-older-people - Mental Health of Older People \| South Canterbury | public-service | South Canterbury / Timaru | Kensington Centre, 7 Queen Street, Parkside, Timaru | Kensington Centre 7 Queen Street, Parkside, Timaru 7910 | phone, coordinate-gap-address-search-needs-review | lat, lon, coordinateSource, coordinatePrecision, coordinateConfidence, geocodeNeedsManualReview |
| manual_compare_conflict | crisis-south-canterbury - South Canterbury Mental Health Crisis Team | public-service | South Canterbury / South Canterbury |  | Kensington Centre 7 Queen Street, Parkside, Timaru 7910 | phone, coordinate-gap-address-search-needs-review | address, lat, lon, coordinateSource, coordinatePrecision, coordinateConfidence, geocodeNeedsManualReview |
| manual_compare_conflict | west-coast-rata-aod - Rata Alcohol and Other Drugs Service | addiction | West Coast / Westport / Greymouth / West Coast | Buller Health Hospital, Westport | West Coast District Health Board 46B Cobden Street, Westport 7825 | coordinate-gap-address-search-needs-review, website-domain | lat, lon, coordinateSource, coordinatePrecision, coordinateConfidence, geocodeNeedsManualReview |
| manual_compare_conflict | west-coast-health-primary-counselling - West Coast Health - Primary Health Counselling Programme | counsellor | West Coast / Greymouth and wider West Coast | Top Floor, 163 Mackay Street, Greymouth 7805 \| -42.4483337 \| 171.2139058 | West Coast Primary Health Organisation 163 MacKay Street, Greymouth 7805 | coordinate-gap-address-search-needs-review, phone |  |
| manual_compare_conflict | national-youthline - Youthline | youth | National / Aotearoa New Zealand | Level 1, 2 Owens Road, Epsom, Auckland 1023 \| -36.8780764 \| 174.7736695 | Youthline Wellington | phone, website-domain, name |  |
| manual_compare_conflict | wellington-youthline-wellington - Youthline Wellington | youth | Wellington / Wellington | PO Box 1059, Wellington 6140 | Youthline Wellington | phone, website-domain, name | coordinateSource, coordinatePrecision, coordinateConfidence, geocodeNeedsManualReview |
| manual_compare_needed | rotorua-lakes-icamhs - Infant, Child and Adolescent Mental Health Service \| Lakes | youth | Rotorua and Taupo / Rotorua and Taupo | Children's Health Hub, 1127 Haupapa Street, Rotorua | Behavioural Health (Rotorua) 2nd floor/1163 Eruera Street, BOP, Rotorua 3010 | coordinate-gap-address-search-needs-review | lat, lon, coordinateSource, coordinatePrecision, coordinateConfidence, geocodeNeedsManualReview |
| manual_compare_needed | wairarapa-mhaids-community-mental-health - Wairarapa Community Mental Health Team \| MHAIDS | public-service | Wairarapa / Masterton | Wairarapa Hospital Campus, Te Ore Ore Road, Masterton | Wairarapa Hospital Te Ore Ore Road, Lansdowne, Masterton 5810 | coordinate-gap-address-search-needs-review | lat, lon, coordinateSource, coordinatePrecision, coordinateConfidence, geocodeNeedsManualReview |
| geocode_or_source_lookup | tairawhiti-lanae-fisk-psychology - LaNae Fisk Psychology | psychologist | Canterbury / Christchurch | Christchurch |  |  |  |
| geocode_or_source_lookup | marlborough-top-of-the-south-psych-services - Top of the South Psych Services | psychologist | Nelson Marlborough Tasman / Blenheim | Blenheim |  |  |  |
| geocode_or_source_lookup | nelson-marlborough-tasman-nelson-bays-primary-health - Nelson Bays Primary Health - Mental Health and Addictions | public-service | Nelson Marlborough Tasman / Richmond / Nelson Tasman | 281 Queen Street, Richmond |  |  |  |
| geocode_or_source_lookup | rotorua-brigette-hohepa-counselling - Brigette Hohepa Counselling | counsellor | Rotorua and Taupo / Ngongotaha, Rotorua | Harmoni Hub, Room 3, 12 Western Road, Ngongotaha, Rotorua |  |  |  |
| geocode_or_source_lookup | taupo-resilience-counselling - Resilience Counselling Taupo | counsellor | Rotorua and Taupo / Taupo | 100 Kaimanawa Street, Taupo |  |  |  |
| geocode_or_source_lookup | rotorua-psychologist-nz-referrals - Psychologist.nz Rotorua Referrals | psychologist | Rotorua and Taupo / Rotorua | Rotorua |  |  |  |
| geocode_or_source_lookup | south-canterbury-aod-service - Alcohol & Other Drugs (A&OD) South Canterbury | addiction | South Canterbury / Timaru | Kensington Centre, Corner High and Queen Streets, Timaru |  |  |  |
| geocode_or_source_lookup | south-canterbury-a-time-to-talk - A Time to Talk | counsellor | South Canterbury / Timaru | Timaru |  |  |  |
| geocode_or_source_lookup | south-canterbury-alice-mcclintock - Alice McClintock - South Coast Psychology | psychologist | South Canterbury / Timaru | Timaru District |  |  |  |
| geocode_or_source_lookup | south-canterbury-reihana-psychology - Reihana Psychology | psychologist | South Canterbury / Timaru | Timaru |  |  |  |
| geocode_or_source_lookup | south-canterbury-ipmha - South Canterbury IPMHA | public-service | South Canterbury / Timaru | Kensington Centre, Queen Street, Timaru |  |  |  |
| geocode_or_source_lookup | wairarapa-briar-nicol-counselling - Briar Nicol Counselling | counsellor | Wairarapa / Wairarapa | Various venues, Wairarapa |  |  |  |
| geocode_or_source_lookup | west-coast-kensington-clinic - Kensington Clinic | counsellor | West Coast / Greymouth and online | Greymouth |  |  |  |
| geocode_or_source_lookup | west-coast-west-coast-health-bis - West Coast Health Brief Intervention Service | public-service | West Coast / Greymouth and wider West Coast | Top Floor, 163 Mackay Street, Greymouth |  |  |  |
| source_lookup_needed | crisis-auckland-central - Auckland Central Mental Health Crisis Team | public-service | Auckland / Auckland Central |  |  |  |  |
| source_lookup_needed | crisis-auckland-south-east - Auckland East and South Mental Health Crisis Team | public-service | Auckland / East and South Auckland |  |  |  |  |
| source_lookup_needed | crisis-auckland-west-north - Auckland West and North Mental Health Crisis Teams | public-service | Auckland / West and North Auckland |  |  |  |  |
| source_lookup_needed | auckland-ember-community-support - Ember Community Support | public-service | Auckland / Auckland |  |  |  |  |
| source_lookup_needed | crisis-bay-of-plenty - Bay of Plenty Mental Health Crisis Teams | public-service | Bay of Plenty / Tauranga and Whakatane |  |  |  |  |
| source_lookup_needed | bay-of-plenty-get-smart-tauranga - Get Smart Tauranga | youth | Bay of Plenty / Tauranga |  |  |  |  |
| source_lookup_needed | canterbury-addiction-central-service - Christchurch Central Service | addiction | Canterbury / Christchurch |  |  |  |  |
| source_lookup_needed | canterbury-lucid-psychotherapy - Lucid Psychotherapy and Counselling | counsellor | Canterbury / Christchurch |  |  |  |  |
| source_lookup_needed | canterbury-merivale-therapy - Merivale Psychotherapy and Counselling | counsellor | Canterbury / Christchurch |  |  |  |  |
| source_lookup_needed | nzccp-aimee-hanson - Aimee Hanson | psychologist | Canterbury / Christchurch |  |  |  |  |
| source_lookup_needed | canterbury-healthnz-adult-crisis - Canterbury Adult Mental Health Single Point of Entry | public-service | Canterbury / Christchurch |  |  |  |  |
| source_lookup_needed | crisis-canterbury - Canterbury Mental Health Crisis Team | public-service | Canterbury / Canterbury |  |  |  |  |
| source_lookup_needed | canterbury-mhaps - MHAPS Canterbury | public-service | Canterbury / Christchurch |  |  |  |  |
| source_lookup_needed | canterbury-purapura-whetu - Purapura Whetu | public-service | Canterbury / Christchurch / Canterbury |  |  |  |  |
| source_lookup_needed | canterbury-caflink - Canterbury CAFLink | youth | Canterbury / Christchurch |  |  |  |  |
| source_lookup_needed | canterbury-manu-ka-rere - Manu Ka Rere | youth | Canterbury / Christchurch / Canterbury |  |  |  |  |
| source_lookup_needed | canterbury-qtopia - Qtopia | youth | Canterbury / Christchurch |  |  |  |  |
| source_lookup_needed | canterbury-te-tahi-youth - Te Tahi Youth | youth | Canterbury / Christchurch |  |  |  |  |
| source_lookup_needed | hawkes-bay-whakiao-taurima-counselling - Whakiao Taurima Counselling | counsellor | Hawke's Bay / Hawke's Bay |  |  |  |  |
| source_lookup_needed | crisis-hawkes-bay - Hawke's Bay Mental Health Crisis Team | public-service | Hawke's Bay / Hawke's Bay |  |  |  |  |
| source_lookup_needed | hawkes-bay-te-taiwhenua-o-heretaunga - Te Taiwhenua o Heretaunga | public-service | Hawke's Bay / Hastings |  |  |  |  |
| source_lookup_needed | hawkes-bay-whatever-it-takes - Whatever It Takes Trust | public-service | Hawke's Bay / Hawke's Bay |  |  |  |  |
| source_lookup_needed | crisis-manawatu-whanganui - Manawatu-Whanganui Mental Health Crisis Teams | public-service | Manawatu-Whanganui / Palmerston North and Whanganui |  |  |  |  |
| source_lookup_needed | manawatu-whanganui-te-oranganui - Te Oranganui | public-service | Manawatu-Whanganui / Whanganui |  |  |  |  |
| source_lookup_needed | manawatu-whanganui-think-hauora-access-choice - THINK Hauora Access and Choice | public-service | Manawatu-Whanganui / Palmerston North / MidCentral |  |  |  |  |
| source_lookup_needed | manawatu-whanganui-whatever-youth - Whatever Whanganui Youth Health Place | youth | Manawatu-Whanganui / Whanganui |  |  |  |  |
| source_lookup_needed | manawatu-whanganui-yoss-palmerston-north - Youth One Stop Shop Palmerston North | youth | Manawatu-Whanganui / Palmerston North |  |  |  |  |
| source_lookup_needed | nelson-marlborough-tasman-care-marlborough - Care Marlborough | public-service | Nelson Marlborough Tasman / Blenheim |  |  |  |  |
| source_lookup_needed | crisis-nelson-marlborough-tasman - Nelson, Marlborough and Tasman Mental Health Crisis Teams | public-service | Nelson Marlborough Tasman / Nelson, Marlborough, Tasman |  |  |  |  |
| source_lookup_needed | nelson-marlborough-tasman-te-whare-mahana - Te Whare Mahana | public-service | Nelson Marlborough Tasman / Golden Bay |  |  |  |  |
| source_lookup_needed | nelson-marlborough-tasman-whanake-youth - Whanake Youth | youth | Nelson Marlborough Tasman / Nelson |  |  |  |  |
| source_lookup_needed | northland-xtrapsychplus - Xtrapsychplus | counsellor | Northland / Whangarei |  |  |  |  |
| source_lookup_needed | northland-starfish-donna-mcewen - The Starfish Clinic - Donna McEwen | psychologist | Northland / Whangarei |  |  |  |  |
| source_lookup_needed | northland-starfish-yvette-ahmad - The Starfish Clinic - Dr Yvette Ahmad | psychologist | Northland / Whangarei |  |  |  |  |
| source_lookup_needed | crisis-northland - Northland Mental Health Crisis Team | public-service | Northland / Northland |  |  |  |  |
| source_lookup_needed | northland-youth-health-service - Northland Youth Health Service | youth | Northland / Northland |  |  |  |  |
| source_lookup_needed | otago-ocasa - OCASA | counsellor | Otago / Dunedin / Otago |  |  |  |  |
| source_lookup_needed | crisis-otago-southland - Otago and Southland Mental Health Crisis Team | public-service | Otago / Otago and Southland |  |  |  |  |
| source_lookup_needed | otago-adventure-development - Adventure Development Otago | youth | Otago / Dunedin / Otago |  |  |  |  |
| source_lookup_needed | otago-mirror-services - Mirror Services | youth | Otago / Dunedin / Otago |  |  |  |  |
| source_lookup_needed | rotorua-taupo-ember-lakes-community-support - Ember Rotorua and Lakes Community Support | public-service | Rotorua and Taupo / Rotorua and Lakes |  |  |  |  |
| source_lookup_needed | rotorua-taupo-lifewise-rotorua - Lifewise Rotorua Mental Health & Addiction | public-service | Rotorua and Taupo / Rotorua |  |  |  |  |
| source_lookup_needed | crisis-rotorua-taupo - Rotorua and Taupo Mental Health Crisis Team | public-service | Rotorua and Taupo / Rotorua and Taupo |  |  |  |  |
| source_lookup_needed | southland-nga-kete-matauranga-pounamu - Nga Kete Matauranga Pounamu | public-service | Southland / Invercargill / Southland |  |  |  |  |
| source_lookup_needed | southland-pact - Pact Southland | public-service | Southland / Southland |  |  |  |  |
| source_lookup_needed | crisis-southland - Southland Mental Health Crisis Team | public-service | Southland / Southland |  |  |  |  |
| source_lookup_needed | southland-adventure-development - Adventure Development Southland | youth | Southland / Southland |  |  |  |  |
| source_lookup_needed | crisis-tairawhiti - Tairawhiti Mental Health Crisis Team | public-service | Tairawhiti / Gisborne |  |  |  |  |
| source_lookup_needed | taranaki-integrate-psychology - Integrate Psychology | psychologist | Taranaki / New Plymouth, Stratford and Hawera |  |  |  |  |
| source_lookup_needed | taranaki-healthnz-mental-health-brief-care - Taranaki Mental Health Assessment and Brief Care | public-service | Taranaki / Taranaki |  |  |  |  |
| source_lookup_needed | crisis-taranaki - Taranaki Mental Health Crisis Team | public-service | Taranaki / Taranaki |  |  |  |  |
| source_lookup_needed | taranaki-taranaki-retreat - Taranaki Retreat | public-service | Taranaki / Taranaki |  |  |  |  |
| source_lookup_needed | waikato-pinnacle-access-choice - Pinnacle Access and Choice / Te Tumu Waiora | public-service | Waikato / Waikato |  |  |  |  |
| source_lookup_needed | crisis-waikato - Waikato Mental Health Crisis Team | public-service | Waikato / Waikato |  |  |  |  |
| source_lookup_needed | waikato-youth-intact - Waikato Youth INtact | youth | Waikato / Waikato |  |  |  |  |
| source_lookup_needed | wairarapa-capital-psychology-assessments - Capital Psychology - Wairarapa Assessments | psychologist | Wairarapa / Wairarapa |  |  |  |  |
| source_lookup_needed | wairarapa-nic-allan-psychology - Nicholas Allan Psychology | psychologist | Wairarapa / Masterton |  |  |  |  |
| source_lookup_needed | crisis-wairarapa - Wairarapa Mental Health Crisis Team | public-service | Wairarapa / Wairarapa |  |  |  |  |
| source_lookup_needed | wairarapa-piki-youth-support - Piki Wellington and Wairarapa | youth | Wairarapa / Wairarapa |  |  |  |  |
| source_lookup_needed | wellington-te-haika - Te Haika Mental Health Contact Centre | public-service | Wellington / Wellington / Hutt Valley / Kapiti |  |  |  |  |
| source_lookup_needed | crisis-wellington - Wellington, Hutt and Kapiti Mental Health Crisis Team | public-service | Wellington / Wellington, Hutt and Kapiti |  |  |  |  |
| source_lookup_needed | wellington-piki-youth-support - Piki | youth | Wellington / Greater Wellington |  |  |  |  |
| source_lookup_needed | west-coast-homebuilders - Homebuilders West Coast | public-service | West Coast / West Coast |  |  |  |  |
| source_lookup_needed | crisis-west-coast - West Coast Mental Health Crisis Team | public-service | West Coast / West Coast |  |  |  |  |

## Safety

- Google Places is only a location corroboration clue in this pack.
- Apply only `address`, `lat`, `lon`, `coordinateSource`, `coordinatePrecision`, `coordinateConfidence`, and `geocodeNeedsManualReview` after human confirmation.
- Do not approve clinical scope, availability, referral, cost, telehealth, cultural support, or provider type from this pack.
- Use `npm run draft:location-distance` to create draft-only decisions after review, then apply through `npm run apply:review` and rerun validation.
