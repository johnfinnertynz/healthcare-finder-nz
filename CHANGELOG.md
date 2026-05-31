# Changelog

## 2026-05-31

- Added a claim-level evidence graph for current provider records.
- Added provider claim scoring with risk, confidence, source owner/type, and
  advisory decisions.
- Added a focused claim review queue and CSV/Markdown exports with batch
  grouping.
- Added duplicate/shared-practice conflict detection.
- Added claim review queue support in the local auditor console.
- Added safe auto-resolution proposal exports for low-risk claim noise.
- Added auditor filters for review category and batch key.
- Added an auditor queue source for auto-resolution proposal groups.
- Deduplicated claim-batch provider samples so large batches show unique provider counts.
- Added a claim-batch decision draft helper for review-gated `needs_more_info`
  and safe array-value removal drafts.
- Added task, backlog, import strategy, and review queue reduction documents.

Safety notes:

- No live provider records are changed by the claim tools.
- High-risk claims remain review-gated.
- `accepting` availability and psychiatrist self-referral are not inferred from
  silence.
- Search snippets and public LinkedIn signals remain discovery-only.
