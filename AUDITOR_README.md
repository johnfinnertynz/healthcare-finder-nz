# Provider Auditor Instructions

This guide is for a human reviewer checking provider records before changes affect the public Care Finder Aotearoa recommendations.

The auditor console is a local review tool. It does not write directly to `providers.json`, and it does not change the public website by itself.

## The Rule

Do not guess.

Only confirm, change, or approve provider information when there is public source evidence or a clear review note explaining what was checked. If unsure, choose `needs_more_info`.

## What You Are Reviewing

You are checking whether each provider record is safe and accurate enough to be used in public recommendations.

Focus on:

- Provider name
- Clinician name
- Practice name
- Provider type
- Region and city
- Address and coordinates
- Phone, text, email, website, and booking links
- Whether they are accepting, waitlisting, not accepting, paused, unknown, or not published
- Whether psychiatrist contact requires a GP or specialist referral
- What services they actually support
- Whether tags such as Maori, Pasifika, Asian, Rainbow, trauma-informed, or telehealth are source-backed
- Whether the public card shown to users is calm, accurate, and not misleading

## Before You Start

From the project folder, generate the review queue:

```sh
npm run export:review
```

When you want to review repeated field-level issues in batches, also generate
the claim queue:

```sh
npm run evidence:graph
npm run evidence:score
npm run evidence:conflicts
npm run export:claims
npm run export:gp-corroboration
npm run export:auto-resolution
npm run export:regional-quality
```

Start a local server:

```sh
python -m http.server 4174
```

Open:

```text
http://127.0.0.1:4174/admin/index.html
```

If the queue does not load, rerun `npm run export:review` for the manual queue
or `npm run export:claims` for the claim queue, then refresh the page.

Use the **Queue** selector to choose:

- **Manual review queue** for provider-level decisions.
- **Claim review queue** for one-field-at-a-time checks grouped by batch key.
- **GP source corroboration** for weak third-party GP records that need stronger
  practice-owned, Healthpoint, PHO, HPI/FHIR, or official source evidence.
- **Auto-resolution proposals** for grouped low-risk de-prioritisation and
  high-risk manual batch planning.
- **Ongoing monitor queue** for automated availability/recheck findings.
- **Regional priorities** for choosing the next region and queue to review.

In the claim queue, each item shows a claim field, claim value, risk level,
score, batch key, source type, and required human action. Use it to work through
large repeated issues such as unsupported broad tags, weak GP source
corroboration, availability evidence, referral pathway wording, and coordinate
gaps.

In the GP source corroboration queue, each item is one GP practice source check.
Use the suggested searches to find a stronger source, then capture the URL,
source type, short excerpt, captured date, and any contact/address conflict.
Do not use DoctorPricer, search snippets, LinkedIn/social-only pages, blocked
pages, or name-based inference as approval evidence. Do not infer accepting
patients, enrolment, mental-health specialties, cultural support, language
support, or funding eligibility from this queue.

Open `PROVIDER_AUTO_RESOLUTION_PROPOSALS.md` before a long review session. It
separates low-risk claim noise that can be de-prioritized from high-risk batches
that still need a person. It does not approve provider data and it does not
change the public app.

You can also choose **Auto-resolution proposals** in the admin console. Treat
those rows as review-planning groups: low-risk rows can be collapsed out of your
manual workload, while manual-batch rows tell you where human evidence checks
still matter. They are not live provider records.

Choose **Regional priorities** when you need to decide where to work next. Each
row is a planning item for a region, showing coverage gaps, weak GP source
tasks, source-fit issues, availability/referral/watchlist signals, and sample
records. This view disables provider-decision export. Use it to pick a region,
then switch to the relevant provider, claim, GP corroboration, or monitor queue
and filter by that region before saving decisions.

After reviewing a batch, you can draft a decision file without changing live
data:

```sh
npm run draft:claim-batch -- --batch-key "<batch key>" --decision needs_more_info
```

For a reviewed tag/scope cleanup where you are removing an unsupported value:

```sh
npm run draft:claim-batch -- --batch-key "<batch key>" --decision adjust --field tags --remove-values depression --reviewer "Your name" --source-excerpt "Short evidence note" --confirmed-human-review
```

The draft helper only writes `data/provider-claim-batch-decision-draft.json` and
`PROVIDER_CLAIM_BATCH_DECISION_DRAFT.md`. It does not apply the decision. Review
the draft, then apply it through the normal controlled review script and run the
validation suite.

The auditor console has a smaller **Filtered batch** helper for conservative
triage. Narrow the queue first, then use it only when the whole filtered set
needs more information. It saves `needs_more_info` for unsaved filtered items,
does not overwrite existing item decisions, and refuses unfiltered or very large
sets. It is not a bulk approve or bulk adjust tool.

## Review One Provider

For each item:

1. Select the provider from the queue.
2. Read **What users would see**.
3. Read **Why this record was flagged**.
4. Check **Fields that affect ranking**.
5. Check **Availability**.
6. Check **Referral pathway** if the provider is a psychiatrist or psychiatry service.
7. Check **Location and distance**.
8. Check **Tags and scope**.
9. Open the primary source in a new tab.
10. Compare the source page with the stored fields.
11. Choose a decision.
12. Add a short source excerpt or review note.
13. Save the decision locally.

Do not rely on the iframe preview. Many provider websites block iframe loading. Always use **Open primary source in new tab** as the real source check.

## Decision Choices

### approve

Use when the current provider record is correct enough to keep.

Only approve if:

- The source supports the important fields.
- The public card is not misleading.
- Any risky field has evidence or a clear review note.

Do not approve `accepting` availability unless the source explicitly says something like "accepting new clients" or "taking new patients".

### adjust

Use when the provider is valid, but one or more fields need correction.

Put changes in **Corrected fields JSON**.

Example:

```json
{
  "clinicianName": "Jane Example",
  "practiceName": "Example Psychology",
  "website": "https://example.org",
  "availabilityStatus": "unknown",
  "availabilityEvidence": "Availability is not published on the provider website.",
  "availabilityCheckedAt": "2026-05-26"
}
```

### reject

Use when the provider should not be in live provider data.

Use this for:

- Bad source
- Wrong provider type
- Cannot find any reliable provider source
- Not a healthcare/support provider
- Unsafe or misleading record

Add a short note explaining why.

### move_to_watchlist

Use when the provider may be useful later but should not appear in first recommendations now.

Use this for:

- Not accepting new clients
- Books closed
- Referrals paused
- Long wait that makes the provider unsuitable as a first recommendation
- Promising provider with unclear availability that needs monitoring

Include the source phrase if possible.

Example source excerpt:

```text
The website says the practice is not currently accepting new clients.
```

### duplicate

Use when this record duplicates another provider already in the database.

Fill in **Kept provider ID** with the provider record that should remain.

### needs_more_info

Use when you cannot safely decide yet.

Use this when:

- The source does not load.
- The source is unclear.
- Different sources conflict.
- You need to call or email the provider.
- You are not sure whether the service fits the public recommendation.

This leaves the provider unchanged and keeps it in future review queues.

## Corrected Fields JSON

Only enter fields that need to change.

Common safe fields:

```json
{
  "name": "",
  "clinicianName": "",
  "practiceName": "",
  "type": "",
  "region": "",
  "city": "",
  "address": "",
  "lat": "",
  "lon": "",
  "phone": "",
  "text": "",
  "email": "",
  "website": "",
  "bookingUrl": "",
  "source": "",
  "sourceQuality": "",
  "confidence": "",
  "needsManualVerification": true,
  "availabilityStatus": "",
  "availabilityEvidence": "",
  "availabilityCheckedAt": "",
  "availabilitySource": "",
  "availabilityNeedsManualReview": true,
  "requiresReferral": true,
  "referralType": "",
  "referralSourceUrl": "",
  "referralSourceExcerpt": "",
  "referralConfidence": "",
  "referralLastChecked": "",
  "referralNeedsManualReview": true,
  "tags": [],
  "needScope": [],
  "specialties": [],
  "services": [],
  "patientGroups": [],
  "ageGroups": [],
  "onlineAvailable": false,
  "phoneSupport": false,
  "inPerson": true,
  "crisisOnly": false,
  "fit": "",
  "firstStep": "",
  "cost": "",
  "hours": ""
}
```

Do not paste this full example into the form. Use only the fields you are changing.

## Availability Rules

Allowed availability values:

- `accepting`
- `waitlist`
- `not_accepting`
- `referrals_paused`
- `unknown`
- `not_published`

Use `accepting` only when the source explicitly says they are accepting or taking new clients/patients/referrals.

Use `unknown` when the source gives contact details but does not say whether they are accepting.

Use `not_published` when availability is not shown.

Use `waitlist`, `not_accepting`, or `referrals_paused` only when the source says so.

Never infer availability from:

- A website loading
- A contact form existing
- A booking button existing
- A phone number or email being visible

## Psychiatrist Referral Rules

Psychiatrists often require referral. Do not make direct contact look easy if the person actually needs a GP or specialist referral first.

Allowed referral values:

- `gp`
- `self`
- `specialist`
- `unknown`

Use `self` only when the source explicitly supports self-referral, direct patient enquiry, or direct booking.

Use `gp` when the source says GP referral is required or expected.

Use `unknown` when the source does not clearly say.

For RANZCP psychiatrist records, do not change GP-referral guidance unless there is stronger direct source evidence.

## Tag Rules

Tags affect who gets shown to vulnerable users. Be conservative.

Do not add these without source evidence or an explicit review note:

- `maori`
- `pasifika`
- `asian`
- `rainbow`
- `trauma-informed`
- `telehealth`
- `online`
- `depression`
- `anxiety`
- `trauma`
- `addiction`
- `work`

Do not infer culture, gender, language, or affirming practice from a person's name.

## Provider Type Rules

Use:

- `gp` for GP clinics or general practices.
- `counsellor` for counsellors, counselling practices, therapists, and psychotherapists.
- `psychologist` for psychologists and psychology practices.
- `psychiatrist` for psychiatrists and psychiatry services.
- `public-service` for Health NZ, NGO, community, or government-funded service pathways.
- `youth` for youth/rangatahi services.
- `addiction` for alcohol, drug, gambling, or addiction-specific services.
- `directory` for directories or navigation resources.
- `helpline` for call/text/chat lines.
- `mens-centre` for men's centre style support.

Do not turn a directory into a direct provider unless there is a direct provider source with contact details.

Do not turn a professional register listing into a public contact provider unless there is a separate public practice or clinic source.

## Source Excerpts

Keep excerpts short.

Good:

```text
The profile says online appointments are available and lists anxiety, depression, and trauma therapy.
```

Bad:

```text
Pasting the whole web page.
```

Use excerpts for:

- Availability
- Referral pathway
- Services/specialties
- Cultural or identity support
- Telehealth
- Cost/funding
- Contact details

## After Reviewing a Batch

Click **Export decisions JSON**.

Save the exported file as:

```text
data/provider-review-decisions.json
```

Apply the decisions:

```sh
npm run apply:review
```

Then run:

```sh
npm run validate:data
npm run audit:source-fit
npm run audit:availability
npm run audit:referrals
npm run audit:addresses
npm test
```

If any command fails, do not publish the changes until the failure is understood and fixed.

## Ongoing Checks After The First Audit

After a provider has been reviewed, the project can keep checking source pages in the future.

Run:

```sh
npm run monitor:providers
```

This does three things:

1. Cautiously fetches provider and watchlist source pages.
2. Looks for availability wording such as accepting, waitlist, not accepting, or referrals paused.
3. Builds an ongoing monitor queue for human review.

Open the admin console and use the **Queue** selector to choose **Ongoing monitor queue**.

Treat monitor items as prompts to check, not automatic truth. A blocked page, 404, changed phrase, or possible availability change should be opened in the browser and confirmed before changing public data.

Good monitor decisions:

- Use `adjust` when the source clearly supports a changed field.
- Use `move_to_watchlist` when a live provider now appears unavailable.
- Use `needs_more_info` when the automated fetch was blocked or unclear.
- Use `approve` only when the source still supports the current record.

Never mark a provider as accepting just because the old unavailable wording disappeared. Look for explicit accepting-new-clients or booking evidence, or leave availability as `unknown` / `not_published`.

## What To Do When You Are Unsure

Choose `needs_more_info`.

Write what is unclear:

- "Website does not say whether they are accepting new clients."
- "Source says counselling but database says psychologist."
- "Profile lists trauma only; unsure whether depression/anxiety tags are justified."
- "Source page is blocked and needs manual browser review."
- "Provider may be duplicate of provider-id-here."

## What Not To Do

Do not:

- Guess availability.
- Guess referral requirements.
- Guess culture, gender, language, or identity support.
- Add broad mental-health tags just because the provider is a mental-health professional.
- Paste full source pages into excerpts.
- Edit `providers.json` directly from the browser.
- Add patient or user intake data to the review notes.
- Treat blocked/unreachable pages as proof that a provider is unavailable or available.

## Final Safety Check

Before a reviewed change should affect public users, it must:

1. Have a review decision.
2. Have evidence or notes.
3. Be applied by `npm run apply:review`.
4. Be recorded in `data/provider-review-log.jsonl`.
5. Pass validation, audits, and tests.
