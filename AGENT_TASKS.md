# Agent Tasks

Updated: 2026-05-31

This file tracks autonomous data-quality tasks for Care Finder Aotearoa. Status
values are `todo`, `doing`, `blocked`, or `done`.

| ID | Title | Category | Impact | Risk | Files likely affected | Acceptance criteria | Status | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CF-DQ-001 | Build claim-level evidence graph | Data quality | High | Medium | `tools/build-provider-evidence-graph.mjs`, `data/provider-evidence-graph.json` | Provider rows split into sourced claims with confidence, risk, decision, and reason | done | Keep refining scoring thresholds against audit findings |
| CF-DQ-002 | Export compressed claim review queue | Reviewer efficiency | High | Low | `tools/export-provider-claim-review-queue.mjs`, `PROVIDER_CLAIM_REVIEW_QUEUE.md` | Repeated claim issues grouped into batches; default export stays focused | done | Use batches to plan human review sessions |
| CF-DQ-003 | Add safe auto-resolution scoring | Data safety | High | Medium | `tools/lib/provider-evidence-scorer.mjs`, evidence graph tools | Only low-risk public contact/identity/location claims can be auto-accepted; high-risk claims stay gated | done | Add apply step only after human-reviewed policy is tested |
| CF-DQ-004 | Detect duplicate and shared-practice conflicts | Data quality | Medium | Medium | `tools/detect-provider-conflicts.mjs`, `PROVIDER_CONFLICTS.md` | Shared phones/domains/addresses are grouped without auto-merging clinicians | done | Tune false-positive groups, especially large GP networks |
| CF-DQ-005 | Reduce unsupported sensitive/scope tags | Safety | High | Medium | `providers.json`, review decisions, source-fit audit | Broad tags and cultural/telehealth tags either gain evidence excerpts or are removed | todo | Start with largest claim batches in the auditor |
| CF-DQ-006 | Corroborate weak GP source records | Data quality | Medium | Medium | `providers.json`, GP importers, provider sources | Third-party GP records gain practice-owned/official corroboration where possible | todo | Batch by source/domain and review high-use regions first |
| CF-DQ-007 | Improve address and coordinate confidence | Matching | Medium | Low | `tools/geocode-provider-addresses.mjs`, `providers.json` | Missing coordinates are filled from public addresses or providers stop ranking as local | todo | Process missing-address and missing-coordinate batches |
| CF-DQ-008 | Make claim queue first-class in auditor workflow | Admin UX | Medium | Low | `admin/index.html`, `admin/admin.js`, `admin/README.md` | Auditor can switch to claim review queue and see claim field, score, batch, and required action | done | Add batch action UI after first human review session |
| CF-DQ-009 | Add claim-level apply workflow | Controlled changes | Medium | High | `tools/apply-provider-review-decisions.mjs`, tests | Reviewer-approved claim batches can produce safe decision files without direct browser writes | todo | Design allowlist and lead-review rules before implementation |
| CF-DQ-010 | Thin-region discovery refresh | Coverage | High | Medium | discovery tools, provider suggestions | Regions with few direct providers get targeted discovery tasks, not broad scraping | todo | Use review queue and gap reports to seed searches |
| CF-DQ-011 | Export safe auto-resolution proposals | Reviewer efficiency | High | Low | `tools/export-provider-auto-resolution-proposals.mjs`, `PROVIDER_AUTO_RESOLUTION_PROPOSALS.md` | Low-risk claim noise is grouped separately from high-risk review batches with no live mutation | done | Use the report to tune admin batch display |
