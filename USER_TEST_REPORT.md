# User Test Report

Date: 2026-05-25

## Need-Scope Regression Pass

This pass focused on whether the intake controls match people to services that
actually fit their selected concern. The trigger case was a 16-year-old female in
Northland selecting anxiety, panic, or overwhelm and being offered Xtrapsychplus,
which is scoped to sexual harm / ACC Sensitive Claims counselling.

Implemented outcome:

- Narrow sexual-harm-only and addiction-only services now have explicit or
  inferred `needScope` rules.
- A scoped service is only recommended when the selected "What is happening?"
  option matches that scope.
- Age-gated services are checked in the simulated workflow audit.
- Xtrapsychplus now has `needScope: ["trauma"]` and does not appear for the
  Northland teenage anxiety flow.

Browser verification:

- Scenario: age 16, Northland, female, anxiety/panic/overwhelm, privacy barrier,
  prefer female provider, counsellor/therapist.
- Result: top suggestions were Puawaitanga, Rust Avenue Medical Centre, and 1737.
  Xtrapsychplus did not appear in top suggestions or visible provider cards.

## 20 Example Flow Results

Command run: `node tools/user-flow-audit.mjs`

| Persona | Goal | Top three | Result |
| --- | --- | --- | --- |
| 16-year-old female in Northland with anxiety | avoid sexual-harm-only services | Puawaitanga; Bank Street Medical; Bream Bay Medical Centre | Pass |
| Auckland parent looking for ADHD assessment for child | find assessment-capable professionals | Auckland Mental Wellness Centre; Millennium Consulting; Alex Hayns | Pass |
| Wellington university student with depression | find low-cost counselling | Puawaitanga; Vibe Youth Services; Youthline Wellington | Pass |
| Rural South Island user with poor transport | find phone or video options | Growth Online Counselling; Puawaitanga; Dr Agata Moody - Coliber Psychiatry | Pass |
| Maori user seeking culturally appropriate support | find kaupapa Maori or culturally safe support | Jigsaw North Manaaki Whanau Counselling; Te Hau Awhiowhio o Otangarei Trust; Te Hau Ora o Ngapuhi | Pass |
| Pacific family needing free counselling | find Pasifika-friendly support | Vaka Tautua Mental Health Support; Etu Pasifika Auckland Ltd (Formerly Mt Wellington Integrated Healthcare); Etu Pasifika South Auckland (formerly Cavendish Doctors) | Pass |
| User in crisis needing immediate help | see crisis guidance immediately | Counsellingworx; PsychologyWorx; The Psychology Centre | Pass |
| Person looking for addiction support | find alcohol, drug, or gambling help | Adult Community Mental Health Service \| Bay of Plenty; Turning Point Trust; Get Smart Tauranga | Pass |
| Male trades worker reluctant to seek help | find a lower-pressure first contact | Merivale Psychotherapy and Counselling; Lucid Psychotherapy and Counselling; Talking Therapy Psychotherapy and Counselling Centre | Pass |
| LGBTQIA+ youth seeking safe support | find Rainbow-affirming support | Evolve Wellington Youth Service; Alana Malloy; Dr Sally Rimkeit | Pass |
| Low technical literacy user | get one obvious contact | Bellomo Family Health; Carefirst - Bell Block Medical Centre; Carefirst Merrilands Medical Centre | Pass |
| Elderly person searching on mobile | find nearby primary care | Carterton Medical Centre; Kuripuni Medical Centre; Mahara Health | Pass |
| User with limited English | find culturally matched support | Asian Family Services; Dr M Shanmukha Swamy Lokesh; Hong Kong Surgery | Pass |
| Domestic violence victim seeking discreet help | find trauma-informed help | Puawaitanga; Katherine Lee, Mindwell Online Psychology; LaNae Fisk Psychology | Pass |
| Someone searching at 2am while distressed | find something usable after hours | Drew Crannitch Psychologists; DrewCrannitch Psychologists; University of Otago Clinical Psychology Centre | Pass |
| User looking for free or low-cost support only | find funded options | Alive! Psychological Services; CRISP Counselling; Dr Craig Colhoun Psychology | Pass |
| User overwhelmed by too many options | see a small ranked set | Auckland Mental Wellness Centre; Birkenhead Medical Centre; Ember Community Support | Pass |
| User unsure whether serious enough | feel allowed to ask a GP | Florence Medical Centre; Golden Bay Community Health Centre; Greenwood Health | Pass |
| User helping a friend or family member | find practical first contacts | M.I.S.T Whanganui; MASH Trust; Palmerston North Psychology Clinic - Massey University | Pass |
| Comparing online vs in-person services | compare telehealth and local providers | Candice van der Merwe, Mindwell Online Psychology; Jeremy Mason, Mindwell Online Psychology; Katherine Lee, Mindwell Online Psychology | Pass |

Residual notes:

- Crisis guidance is still immediate and prominent, but the audit script checks
  provider recommendation quality separately from the always-visible crisis
  banner.
- The Otago flow exposes a likely duplicate naming issue for Drew Crannitch /
  DrewCrannitch Psychologists. This did not affect the need-scope fix but should
  be deduplicated in a provider data cleanup pass.

---

Date: 2026-05-24

## Method

Simulated 20 realistic New Zealand user workflows against the local app and the
provider database. The automated workflow test checks that each persona reaches
an actionable non-directory option, exact GP/psychologist/psychiatrist choices
stay exact, crisis teams are not offered as routine first contacts, and emergency
guidance is visible without completing the form.

Manual Browser flows were also run for:

- Christchurch male, anxiety, cost barrier, counsellor/therapist
- Auckland male, depression, counsellor/therapist, Asian support preference
- South Canterbury male, depression, counsellor/therapist
- Dunedin female, depression, cost barrier, psychologist

## Top UX And Trust Issues

1. High: Region leakage for Christchurch men's support.
   Fixed. South Canterbury no longer gets Christchurch-specific men's support.

2. High: Cultural preference matches could be hidden below generic options.
   Fixed. Selected opt-in support preferences are promoted into the top three
   while strict professional selections remain strict.

3. High: Narrow mobile layout could clip hero and safety content.
   Fixed. 360 and 390 px screenshots now show no horizontal overflow.

4. Medium: Users need visible reassurance that this is navigation, not clinical
   diagnosis.
   Fixed. Added a short disclaimer in the urgent help band.

5. Medium: Provider data confidence is incomplete.
   Documented. The app has contact/verification coverage, but confidence should
   be added progressively.

6. Medium: Thin specialist coverage in smaller regions remains a trust risk.
   Documented. The app falls back to national/telehealth and GP/public routes,
   but local specialist data still needs expansion.

## Persona Findings

| Persona | Goal | Simulated path | Friction or confusion | Trust/safety concern | Time-to-helpfulness | Continue? |
| --- | --- | --- | --- | --- | --- | --- |
| Teenager with anxiety in Christchurch | Find a safe first step | Age, Christchurch, anxiety, privacy, unsure | Needs youth options to stay visible | 1737 and youth-friendly support present | Under 1 minute | Yes |
| Auckland parent looking for ADHD assessment for child | Find assessment-capable professionals | Auckland, psychologist, cost | Exact psychologist can feel private/fee-heavy | Should ask about referral and cost before booking | 1-2 minutes | Yes |
| Wellington university student with depression | Find low-cost counselling | Wellington, therapist, cost | Few local counsellor records | Funded/low-cost options surface | Under 1 minute | Yes |
| Rural South Island user with poor transport | Find remote support | Southland, therapist, telehealth, transport | Local options still matter | Telehealth appears when requested | Under 1 minute | Yes |
| Maori user seeking culturally appropriate support | Find kaupapa Maori support | Northland, Maori preference, culture | Needs confidence in tag quality | Maori-tagged services surface only when selected | Under 1 minute | Yes |
| Pacific family needing free counselling | Find Pasifika-friendly help | Auckland, Pasifika, cost | Counsellor-specific Pasifika data is thin | Pasifika services now promoted | Under 1 minute | Yes |
| User in crisis needing immediate help | See urgent instructions immediately | Open page, no form needed | None | 111 and 1737 visible before form | Immediate | Yes |
| Person looking for addiction support | Find alcohol/drug/gambling help | Bay of Plenty, addiction, cost | Needs non-judgemental wording | Addiction-specific support and helplines available | Under 1 minute | Yes |
| Male trades worker reluctant to seek help | Find low-pressure contact | Canterbury, male provider, privacy | Avoid over-indexing on one men's centre | Men's support only appears for Canterbury | Under 1 minute | Yes |
| LGBTQIA+ youth seeking safe support | Find affirming support | Wellington, Rainbow preference, youth age | Rainbow evidence needs ongoing audit | Rainbow support only surfaces when selected | Under 1 minute | Yes |
| Low technical literacy user | Get one obvious contact | Taranaki, GP, depression | Address autocomplete must be forgiving | GP/direct contact path is simple | Under 1 minute | Yes |
| Elderly person searching on mobile | Find nearby primary care | Wairarapa, GP, anxiety, transport | Mobile readability is critical | Mobile hero/safety text fixed | Under 1 minute | Yes |
| User with limited English | Find culturally matched support | Auckland, Asian preference, anxiety | Language-specific data still limited | Asian Family Services appears only when selected | Under 1 minute | Yes |
| Domestic violence victim seeking discreet help | Find trauma-informed help | Tairawhiti, trauma, privacy | Needs discreet/safety-specific pathways | Trauma and privacy wording is present | 1-2 minutes | Probably |
| Someone searching at 2am while distressed | Find after-hours step | Otago, unsure, anxiety, wait | Need 1737 always visible | 1737 visible before and after flow | Immediate | Yes |
| Free/low-cost only user | Avoid unaffordable care | Hawke's Bay, cost, unsure | Private providers may still appear | Cost-aware public/GP routes are recommended | Under 1 minute | Yes |
| User overwhelmed by too many options | See a small ranked set | Auckland, unsure, anxiety | Provider list can still be large | Top three cards reduce first decision | Under 1 minute | Yes |
| User unsure whether serious enough | Feel allowed to ask | Nelson/Marlborough/Tasman, GP, work stress | Wording must avoid gatekeeping | GP path says a small first ask is enough | Under 1 minute | Yes |
| User helping a friend/family member | Find practical contacts | Manawatu-Whanganui, unsure, depression, cost | Message template is self-focused | Could later add "I am helping someone" mode | 1-2 minutes | Maybe |
| Comparing online vs in-person | Compare options | Rotorua/Taupo, psychologist, telehealth | Local psychology/psychiatry thin | Telehealth appears when selected | Under 1 minute | Yes |

## Implemented From This Pass

- Added automated workflow tests for all 20 personas.
- Added mobile layout fixes from screenshot review.
- Added preference promotion so opt-in support selections are harder to miss.
- Added data validation to catch duplicates, missing fields, invalid contacts,
  stale verification, crisis tag misuse, unavailable-provider wording, and bad
  coordinate ranges.
- Added a public-facing professional-care disclaimer.
- Fixed broken visible provider links discovered by link testing.

## Recommended Next UX Pass

- Add an optional "I am helping someone else" message mode.
- Add clearer "why not shown" copy when an opt-in preference has few exact local
  professional matches.
- Add region-specific data completeness badges for internal admin only, not for
  public users.
- Add more verified local specialist records in thin regions before wider public
  launch.
