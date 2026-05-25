# Admin Security Model

The provider auditor console is separate from the public Healthcare Finder NZ app. The public GitHub Pages finder must remain static and must not gain write-enabled provider administration features.

## Current Prototype

- `admin/` is a local/static review prototype.
- It loads `data/provider-review-queue.json`.
- It stores draft decisions in browser local storage.
- It exports review decisions as JSON for a controlled script.
- It contains no secrets, tokens, production API keys, or browser-to-production write paths.
- It must not be linked from the user-facing crisis/help flow.

## Intended Production Architecture

Production writes should become reviewed patches or GitHub pull requests, not direct browser writes.

Recommended flow:

```text
providers.json
+ audit outputs
+ watchlist
+ link results
        ↓
provider review queue
        ↓
authenticated auditor UI
        ↓
review decisions / patches
        ↓
apply-provider-review-decisions script or backend job
        ↓
validation, audits, tests
        ↓
commit / PR / merge
```

## Authentication Options

Any production admin service should use one of:

- GitHub OAuth
- Google OAuth
- OIDC through the hosting platform
- Platform-native auth with SSO/MFA

Auditor accounts must be allowlisted.

## Roles

- `viewer`: read queue and source evidence only.
- `auditor`: create review decisions.
- `leadReviewer`: approve high-risk changes and overrides.
- `admin`: manage roles, queue generation, and operational settings.

## Authorization

- Server-side authorization is required for every provider and review object.
- Object-level authorization is required. Do not rely only on route-level checks.
- High-risk changes require lead review, including psychiatrist referral changes, directory-to-direct-provider changes, cultural/support-preference tags, telehealth claims, and broad need tags.
- Optimistic concurrency or row locking is required for multi-reviewer use.

## Audit Log

- Applied decisions append to `data/provider-review-log.jsonl`.
- The log is append-only by default.
- Log events include old values, new values, reviewer, reviewed date, source URL, source excerpt, resolved audit rules, and notes.
- Corrections should preserve enough context for a future reviewer to understand why the production data changed.

## Browser and Source-Site Safety

- Source pages should open in a new tab.
- Iframe previews are optional and sandboxed.
- The admin system must not proxy, scrape, or republish full source pages to bypass iframe restrictions.
- Captured excerpts should be short and source-backed.
- Blocked or unreachable pages must never be treated as evidence of current availability.

## Web Security Requirements

- No frontend secrets.
- No direct production writes from the browser.
- CSRF protection if cookie auth is used.
- Rate limiting on review and export endpoints.
- Strict Content Security Policy.
- Secure headers, including `X-Content-Type-Options`, `Referrer-Policy`, and frame restrictions for the admin app.
- All state-changing requests must be authenticated and authorized server-side.
- Patient/user intake data must not be present in admin. The admin should review provider data and source evidence only.

## Data Safety Rules

The admin workflow must never guess:

- Availability as accepting without explicit evidence.
- Psychiatrist self-referral without explicit source evidence.
- Māori, Pasifika, Asian, Rainbow, trauma-informed, or telehealth claims without evidence or explicit reviewer approval.
- Broad need tags such as depression, anxiety, trauma, addiction, or work support without evidence or explicit reviewer approval.
- Directory records as direct providers without a direct provider source.
- Register-only clinicians as public contact providers without a separate public practice/contact source.

All production data changes must pass:

```bash
npm test
npm run validate:data
npm run audit:source-fit
npm run audit:availability
npm run audit:referrals
npm run audit:addresses
npm run check:links
```
