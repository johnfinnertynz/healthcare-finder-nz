# GP Source Corroboration Queue

Generated: 2026-05-31T23:11:17.501Z

This queue turns weak GP source records into focused, review-gated source checks. It does not mutate `providers.json` and it must not be used to infer availability, enrolment, mental-health specialty, or cultural support claims.

## Summary

- Tasks: 126
- Missing phone: 0
- Missing website: 126
- Live provider mutation: no
- Human review required before provider updates: yes

## Region Counts

| Region | Tasks |
| --- | ---: |
| Auckland | 53 |
| Northland | 16 |
| Manawatu-Whanganui | 10 |
| Otago | 9 |
| Taranaki | 8 |
| Southland | 7 |
| Tairawhiti | 4 |
| Waikato | 4 |
| Canterbury | 3 |
| Wellington | 3 |
| Bay of Plenty | 2 |
| Rotorua and Taupo | 2 |
| South Canterbury | 2 |
| Nelson Marlborough Tasman | 1 |
| Wairarapa | 1 |
| West Coast | 1 |

## Acceptable Evidence

- practice-owned website or contact page
- Healthpoint GP listing or approved Healthpoint export
- PHO, Health NZ, HPI/FHIR, or other official provider dataset
- official clinic network page
- provider-owned booking or enrolment page

Do not use search-result snippets, DoctorPricer alone, LinkedIn/social-only pages, or blocked/private pages as evidence.

## Google Places Helper

For small review-gated batches, the Places discovery tool can run exact-practice lookups from this queue:

```sh
npm run discover:places -- --gp-corroboration-queue data/gp-source-corroboration-queue.json --region Northland --limit-queries 5 --max-results-per-query 3 --merge-existing
```

Places results are discovery/corroboration leads only. Reviewers still need stronger practice-owned, Healthpoint, PHO/HPI/FHIR, or official evidence before applying any provider update.

## First Tasks

| Priority | Provider | Region / city | Missing | Phone | Current source | Suggested search |
| --- | --- | --- | --- | --- | --- | --- |
| medium | The Auckland City Doctors (gp-the-auckland-city-doctors-36-8570-174-7616) | Auckland / Auckland | website | (09) 280 3555 | third-party public GP listing | "The Auckland City Doctors" "Auckland" GP NZ |
| medium | Airport Doctors (gp-airport-doctors-36-9962-174-7882) | Auckland / Auckland Airport | website | (09) 256 8655 | third-party public GP listing | "Airport Doctors" "Auckland Airport" GP NZ |
| medium | Rosebank Road Medical Services Ltd. (gp-rosebank-road-medical-services-ltd-36-8944-174-6968) | Auckland / Avondale | website | (09) 828 8237 | third-party public GP listing | "Rosebank Road Medical Services Ltd." "Avondale" GP NZ |
| medium | Donovan Street Medical Centre (gp-donovan-street-medical-centre-36-9224-174-7018) | Auckland / Blockhouse Bay | website | (09) 627 1290 | third-party public GP listing | "Donovan Street Medical Centre" "Blockhouse Bay" GP NZ |
| medium | Te Manu Aute Whare Oranga (gp-te-manu-aute-whare-oranga-37-0252-174-8573) | Auckland / Clendon Park | website | (09) 640 0824 | third-party public GP listing | "Te Manu Aute Whare Oranga" "Clendon Park" GP NZ |
| medium | The Lakes Clinic Epsom (previously Epsom Medical Care) (gp-the-lakes-clinic-epsom-previously-epsom-medical-care-36-8863-174-7758) | Auckland / Epsom | website | (09) 523 3488 | third-party public GP listing | "The Lakes Clinic Epsom (previously Epsom Medical Care)" "Epsom" GP NZ |
| medium | Forrest Hill Family Medical Centre (gp-forrest-hill-family-medical-centre-36-7603-174-7471) | Auckland / Forrest Hill | website | (09) 410 5411 | third-party public GP listing | "Forrest Hill Family Medical Centre" "Forrest Hill" GP NZ |
| medium | Archers Medical Centre (gp-archers-medical-centre-36-7846-174-7340) | Auckland / Glenfield | website | (09) 444 9324 | third-party public GP listing | "Archers Medical Centre" "Glenfield" GP NZ |
| medium | Surrey Medical Centre (gp-surrey-medical-centre-36-8637-174-7368) | Auckland / Grey Lynn | website | (09) 376 4658 | third-party public GP listing | "Surrey Medical Centre" "Grey Lynn" GP NZ |
| medium | Palomino Medical Centre (gp-palomino-medical-centre-36-8830-174-6152) | Auckland / Henderson | website | (09) 836 4898 | third-party public GP listing | "Palomino Medical Centre" "Henderson" GP NZ |
| medium | Eastern Family Doctors (gp-eastern-family-doctors-36-9008-174-9047) | Auckland / Highland Park | website | (09) 222 0168 | third-party public GP listing | "Eastern Family Doctors" "Highland Park" GP NZ |
| medium | Family Health Care Medical Centre (gp-family-health-care-medical-centre-36-8999-174-9088) | Auckland / Highland Park | website | (09) 537 3208 | third-party public GP listing | "Family Health Care Medical Centre" "Highland Park" GP NZ |
| medium | Hillside Medical Centre (gp-hillside-medical-centre-36-9261-174-7493) | Auckland / Hillsborough | website | (09) 625 9068 | third-party public GP listing | "Hillside Medical Centre" "Hillsborough" GP NZ |
| medium | Howick Medical Practice (gp-howick-medical-practice-36-8952-174-9335) | Auckland / Howick | website | (09) 535 1610 | third-party public GP listing | "Howick Medical Practice" "Howick" GP NZ |
| medium | All Care Family Medical Centre - Northcote (gp-all-care-family-medical-centre-northcote-36-8071-174-7412) | Auckland / Kaipātiki | website | (09) 419 1267 | third-party public GP listing | "All Care Family Medical Centre - Northcote" "Kaipātiki" GP NZ |
| medium | Dr K Magan Surgery (gp-dr-k-magan-surgery-36-9661-174-8259) | Auckland / Māngere East | website | (09) 275 4763 | third-party public GP listing | "Dr K Magan Surgery" "Māngere East" GP NZ |
| medium | Dr Upsdell's Surgery (gp-dr-upsdell-s-surgery-36-9725-174-8341) | Auckland / Māngere East | website | (09) 278 7214 | third-party public GP listing | "Dr Upsdell's Surgery" "Māngere East" GP NZ |
| medium | Māngere East Medical Centre (gp-m-ngere-east-medical-centre-36-9665-174-8251) | Auckland / Māngere East | website | (09) 275 8587 | third-party public GP listing | "Māngere East Medical Centre" "Māngere East" GP NZ |
| medium | Manukau Family Doctors (gp-manukau-family-doctors-36-9841-174-8785) | Auckland / Manukau | website | (09) 277 5777 | third-party public GP listing | "Manukau Family Doctors" "Manukau" GP NZ |
| medium | Fellbrook Medical Centre (gp-fellbrook-medical-centre-37-0205-174-8644) | Auckland / Manurewa | website | (09) 269 0088 | third-party public GP listing | "Fellbrook Medical Centre" "Manurewa" GP NZ |
| medium | My Doctor Matakana (gp-my-doctor-matakana-36-3534-174-7167) | Auckland / Matakana | website | (09) 553 4600 | third-party public GP listing | "My Doctor Matakana" "Matakana" GP NZ |
| medium | Assist Healthcare (gp-assist-healthcare-36-8844-174-7164) | Auckland / Mount Albert | website | (09) 281 1900 | third-party public GP listing | "Assist Healthcare" "Mount Albert" GP NZ |
| medium | Mt Albert Medical Centre (gp-mt-albert-medical-centre-36-8856-174-7142) | Auckland / Mount Albert | website | (09) 846 7493 | third-party public GP listing | "Mt Albert Medical Centre" "Mount Albert" GP NZ |
| medium | Healthcare Roskill South (gp-healthcare-roskill-south-36-9212-174-7355) | Auckland / Mount Roskill | website | (09) 620 8573 | third-party public GP listing | "Healthcare Roskill South" "Mount Roskill" GP NZ |
| medium | K' Road Medical Centre (gp-k-road-medical-centre-36-8579-174-7572) | Auckland / Newton | website | (09) 373 5041 | third-party public GP listing | "K' Road Medical Centre" "Newton" GP NZ |
| medium | Newton Medical Centre (gp-newton-medical-centre-36-8580-174-7570) | Auckland / Newton | website | (09) 309 6871 | third-party public GP listing | "Newton Medical Centre" "Newton" GP NZ |
| medium | Family Medicine Birkenhead (gp-family-medicine-birkenhead-36-8103-174-7367) | Auckland / North Shore | website | (09) 480 7204 | third-party public GP listing | "Family Medicine Birkenhead" "North Shore" GP NZ |
| medium | Green Cross Clinic (gp-green-cross-clinic-36-7895-174-7689) | Auckland / North Shore City | website | (09) 486 1001 | third-party public GP listing | "Green Cross Clinic" "North Shore City" GP NZ |
| medium | Northcote Point Doctors (gp-northcote-point-doctors-36-8104-174-7418) | Auckland / Northcote | website | (09) 480 9309 | third-party public GP listing | "Northcote Point Doctors" "Northcote" GP NZ |
| medium | Onehunga Family Medical Centre (gp-onehunga-family-medical-centre-36-9235-174-7856) | Auckland / Onehunga | website | (09) 636 6267 | third-party public GP listing | "Onehunga Family Medical Centre" "Onehunga" GP NZ |
| medium | Ōtāhuhu Family Doctors (gp-t-huhu-family-doctors-36-9441-174-8406) | Auckland / Ōtāhuhu | website | (09) 276 1339 | third-party public GP listing | "Ōtāhuhu Family Doctors" "Ōtāhuhu" GP NZ |
| medium | Queen Street Medical Centre (gp-queen-street-medical-centre-36-9463-174-8442) | Auckland / Ōtāhuhu | website | (09) 276 5566 | third-party public GP listing | "Queen Street Medical Centre" "Ōtāhuhu" GP NZ |
| medium | Clevedon Road Medical Centre (gp-clevedon-road-medical-centre-37-0621-174-9486) | Auckland / Papakura | website | (09) 298 3110 | third-party public GP listing | "Clevedon Road Medical Centre" "Papakura" GP NZ |
| medium | Papakura Family Doctors (gp-papakura-family-doctors-37-0569-174-9395) | Auckland / Papakura | website | (09) 298 6378 | third-party public GP listing | "Papakura Family Doctors" "Papakura" GP NZ |
| medium | The Wood Street Doctors (gp-the-wood-street-doctors-37-0648-174-9415) | Auckland / Papakura | website | (09) 299 8194 | third-party public GP listing | "The Wood Street Doctors" "Papakura" GP NZ |
| medium | Puhinui Medical Centre (gp-puhinui-medical-centre-36-9871-174-8606) | Auckland / Papatoetoe | website | (09) 278 7733 | third-party public GP listing | "Puhinui Medical Centre" "Papatoetoe" GP NZ |
| medium | Integrated Medical Centre (gp-integrated-medical-centre-36-8505-174-7750) | Auckland / Parnell | website | (09) 817 6772 | third-party public GP listing | "Integrated Medical Centre" "Parnell" GP NZ |
| medium | Parnell Family Doctor (gp-parnell-family-doctor-36-8594-174-7820) | Auckland / Parnell | website | (09) 377 3362 | third-party public GP listing | "Parnell Family Doctor" "Parnell" GP NZ |
| medium | Parnell Medical Centre (gp-parnell-medical-centre-36-8523-174-7861) | Auckland / Parnell | website | (09) 377 4427 | third-party public GP listing | "Parnell Medical Centre" "Parnell" GP NZ |
| medium | Penrose Clinic (gp-penrose-clinic-36-9103-174-8170) | Auckland / Penrose | website | (09) 579 4784 | third-party public GP listing | "Penrose Clinic" "Penrose" GP NZ |
| medium | Pōkeno Family Health (gp-p-keno-family-health-37-2474-175-0240) | Auckland / Pōkeno | website | (09) 558 1294 | third-party public GP listing | "Pōkeno Family Health" "Pōkeno" GP NZ |
| medium | All Care Family Medical Centre - Ponsonby (gp-all-care-family-medical-centre-ponsonby-36-8518-174-7452) | Auckland / Ponsonby | website | (09) 376 5580 | third-party public GP listing | "All Care Family Medical Centre - Ponsonby" "Ponsonby" GP NZ |
| medium | Doctors on Jervois (gp-doctors-on-jervois-36-8459-174-7414) | Auckland / Ponsonby | website | (09) 376 4920 | third-party public GP listing | "Doctors on Jervois" "Ponsonby" GP NZ |
| medium | Dr Zhuang & Wah Surgery (gp-dr-zhuang-wah-surgery-36-8483-174-7443) | Auckland / Ponsonby | website | (09) 376 2760 | third-party public GP listing | "Dr Zhuang & Wah Surgery" "Ponsonby" GP NZ |
| medium | Pukekohe Family Doctors - GP (gp-pukekohe-family-doctors-gp-37-2078-174-9083) | Auckland / Pukekohe | website | (09) 238 6696 | third-party public GP listing | "Pukekohe Family Doctors - GP" "Pukekohe" GP NZ |
| medium | 168 ○ Medical Centre (gp-168-medical-centre-36-8780-174-7410) | Auckland / Sandringham | website | (09) 846 7311 | third-party public GP listing | "168 ○ Medical Centre" "Sandringham" GP NZ |
| medium | Alberton Medical Practice (gp-alberton-medical-practice-36-8959-174-7319) | Auckland / Sandringham | website | (09) 629 2088 | third-party public GP listing | "Alberton Medical Practice" "Sandringham" GP NZ |
| medium | Byron Medical (gp-byron-medical-36-7906-174-7726) | Auckland / Takapuna | website | (09) 486 2122 | third-party public GP listing | "Byron Medical" "Takapuna" GP NZ |
| medium | Teo Medical Care (gp-teo-medical-care-36-8624-174-6488) | Auckland / Te Atatū South | website | (09) 834 7670 | third-party public GP listing | "Teo Medical Care" "Te Atatū South" GP NZ |
| medium | Waiake Medical Centre (gp-waiake-medical-centre-36-7084-174-7477) | Auckland / Waiake | website | (09) 478 7660 | third-party public GP listing | "Waiake Medical Centre" "Waiake" GP NZ |
| medium | Coast To Coast Health Care (gp-coast-to-coast-health-care-36-4116-174-6549) | Auckland / Warkworth | website | (09) 425 8585 | third-party public GP listing | "Coast To Coast Health Care" "Warkworth" GP NZ |
| medium | Pasefika Family Health Group - Weymouth Medical Centre (gp-pasefika-family-health-group-weymouth-medical-centre-37-0430-174-8656) | Auckland / Weymouth | website | (09) 528 9800 | third-party public GP listing | "Pasefika Family Health Group - Weymouth Medical Centre" "Weymouth" GP NZ |
| medium | Wiri Family Doctors (gp-wiri-family-doctors-37-0009-174-8893) | Auckland / Wiri | website | (09) 263 6622 | third-party public GP listing | "Wiri Family Doctors" "Wiri" GP NZ |
| medium | Te Korowai Hauora o Hauraki - Paeroa (gp-te-korowai-hauora-o-hauraki-paeroa-37-3817-175-6707) | Bay of Plenty / Paeroa | website | (07) 862 9284 | third-party public GP listing | "Te Korowai Hauora o Hauraki - Paeroa" "Paeroa" GP NZ |
| medium | Te Whare Hauora o Raungaiti (gp-te-whare-hauora-o-raungaiti-37-7387-175-7379) | Bay of Plenty / Waharoa | website | (07) 888 3921 | third-party public GP listing | "Te Whare Hauora o Raungaiti" "Waharoa" GP NZ |
| medium | Avonhead Surgery (gp-avonhead-surgery-43-5130-172-5553) | Canterbury / Christchurch | website | 03 358 3300 | third-party public GP listing | "Avonhead Surgery" "Christchurch" GP NZ |
| medium | QE2 Medical Centre (gp-qe2-medical-centre-43-4950-172-7112) | Canterbury / Christchurch | website | (03) 388 9120 | third-party public GP listing | "QE2 Medical Centre" "Christchurch" GP NZ |
| medium | Rangiora Medical - Good Street (gp-rangiora-medical-good-street-43-3021-172-5938) | Canterbury / Rangiora | website | (03) 313 8262 | third-party public GP listing | "Rangiora Medical - Good Street" "Rangiora" GP NZ |
| medium | Te Waiora Community Health Services (gp-te-waiora-community-health-services-40-3700-175-2349) | Manawatu-Whanganui / Himatangi Beach | website | 06 363 6030 | third-party public GP listing | "Te Waiora Community Health Services" "Himatangi Beach" GP NZ |
| medium | Horowhenua Community Practice (gp-horowhenua-community-practice-40-6287-175-2838) | Manawatu-Whanganui / Levin | website | (06) 368 8065 | third-party public GP listing | "Horowhenua Community Practice" "Levin" GP NZ |
| medium | Broadway Medical Chambers (gp-broadway-medical-chambers-40-3479-175-6257) | Manawatu-Whanganui / Manawatu-Wanganui | website | (06) 358 9484 | third-party public GP listing | "Broadway Medical Chambers" "Manawatu-Wanganui" GP NZ |
| medium | Bulls Medical Centre (gp-bulls-medical-centre-40-1739-175-3862) | Manawatu-Whanganui / Manawatu-Wanganui | website | (06) 322 1222 | third-party public GP listing | "Bulls Medical Centre" "Manawatu-Wanganui" GP NZ |
| medium | Gilmore Family Medical (gp-gilmore-family-medical-40-3626-175-6188) | Manawatu-Whanganui / Manawatu-Wanganui | website | (06) 356 5099 | third-party public GP listing | "Gilmore Family Medical" "Manawatu-Wanganui" GP NZ |
| medium | Horowhenua Community Practice (gp-horowhenua-community-practice-40-6200-175-2862) | Manawatu-Whanganui / Manawatu-Wanganui | website | (06) 368 8065 | third-party public GP listing | "Horowhenua Community Practice" "Manawatu-Wanganui" GP NZ |
| medium | Tararua Medical Centre (gp-tararua-medical-centre-40-6235-175-2905) | Manawatu-Whanganui / Manawatu-Wanganui | website | (06) 368 0950 | third-party public GP listing | "Tararua Medical Centre" "Manawatu-Wanganui" GP NZ |
| medium | Te Waiora Community Health Services (gp-te-waiora-community-health-services-40-4677-175-2802) | Manawatu-Whanganui / Manawatu-Wanganui | website | (06) 363 6030 | third-party public GP listing | "Te Waiora Community Health Services" "Manawatu-Wanganui" GP NZ |
| medium | Te Waiora Community Health Services (gp-te-waiora-community-health-services-40-5468-175-4120) | Manawatu-Whanganui / Shannon | website | (06) 363 6030 | third-party public GP listing | "Te Waiora Community Health Services" "Shannon" GP NZ |
| medium | Dr Shorts Surgery Dannevirke (gp-dr-shorts-surgery-dannevirke-40-2036-176-0966) | Manawatu-Whanganui / Tararua | website | (06) 374 8892 | third-party public GP listing | "Dr Shorts Surgery Dannevirke" "Tararua" GP NZ |
| medium | Florence Medical Centre (gp-florence-medical-centre-41-3415-173-1893) | Nelson Marlborough Tasman / Tasman | website | (03) 544 8080 | third-party public GP listing | "Florence Medical Centre" "Tasman" GP NZ |
| medium | Hikurangi Medical Centre (gp-hikurangi-medical-centre-35-5965-174-2857) | Northland / Hikurangi | website | (09) 433 8799 | third-party public GP listing | "Hikurangi Medical Centre" "Hikurangi" GP NZ |
| medium | Whānau Ora Community Clinic - Kaikohe (gp-wh-nau-ora-community-clinic-kaikohe-35-4081-173-7970) | Northland / Kaikohe | website | (09) 283 5580 | third-party public GP listing | "Whānau Ora Community Clinic - Kaikohe" "Kaikohe" GP NZ |
| medium | Commercial Street Surgery (gp-commercial-street-surgery-35-3806-174-0683) | Northland / Kawakawa | website | (09) 404 0885 | third-party public GP listing | "Commercial Street Surgery" "Kawakawa" GP NZ |
| medium | Coast To Coast Health Care (gp-coast-to-coast-health-care-36-1098-174-3543) | Northland / Maungaturoto | website | (09) 431 8576 | third-party public GP listing | "Coast To Coast Health Care" "Maungaturoto" GP NZ |
| medium | Te Ara Tu o Ngāti Hine (gp-te-ara-tu-o-ng-ti-hine-35-3882-174-0126) | Northland / Moerewa | website | (09) 404 0241 | third-party public GP listing | "Te Ara Tu o Ngāti Hine" "Moerewa" GP NZ |
| medium | Ngunguru Medical Centre (gp-ngunguru-medical-centre-35-6269-174-5097) | Northland / Ngunguru | website | (09) 434 3732 | third-party public GP listing | "Ngunguru Medical Centre" "Ngunguru" GP NZ |
| medium | Paihia Medical Services (gp-paihia-medical-services-35-2812-174-0915) | Northland / Paihia | website | (09) 402 8407 | third-party public GP listing | "Paihia Medical Services" "Paihia" GP NZ |
| medium | Coast To Coast Health Care - Paparoa Medical Centre (gp-coast-to-coast-health-care-paparoa-medical-centre-36-1021-174-2330) | Northland / Paparoa | website | (09) 431 7222 | third-party public GP listing | "Coast To Coast Health Care - Paparoa Medical Centre" "Paparoa" GP NZ |
| medium | Bream Bay Medical Centre (gp-bream-bay-medical-centre-35-8750-174-4553) | Northland / Ruakākā | website | (09) 432 8060 | third-party public GP listing | "Bream Bay Medical Centre" "Ruakākā" GP NZ |
| medium | Russell Medical Services (gp-russell-medical-services-35-2611-174-1230) | Northland / Russell | website | (09) 403 7690 | third-party public GP listing | "Russell Medical Services" "Russell" GP NZ |
| medium | Bank Street Medical (gp-bank-street-medical-35-7212-174-3204) | Northland / Whangārei | website | (09) 438 4379 | third-party public GP listing | "Bank Street Medical" "Whangārei" GP NZ |

Only the first 80 tasks are shown. See `data/gp-source-corroboration-queue.json` or `data/gp-source-corroboration-queue.csv` for the full queue.
