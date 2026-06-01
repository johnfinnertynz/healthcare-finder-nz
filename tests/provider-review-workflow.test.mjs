import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { applyReviewDecisions } from "../tools/apply-provider-review-decisions.mjs";
import { buildProviderEvidenceGraph } from "../tools/build-provider-evidence-graph.mjs";
import { buildClaimBatchDecisionDraft } from "../tools/draft-claim-batch-review-decisions.mjs";
import { buildProviderAutoResolutionProposals } from "../tools/export-provider-auto-resolution-proposals.mjs";
import { buildProviderClaimReviewQueue } from "../tools/export-provider-claim-review-queue.mjs";
import { buildGpSourceCorroborationQueue } from "../tools/export-gp-source-corroboration-queue.mjs";
import {
  buildGpCorroborationReviewPack,
  enrichGpCorroborationReviewPackWithSourceExcerpts
} from "../tools/export-gp-corroboration-review-pack.mjs";
import { buildRegionalDataQualityReport } from "../tools/export-regional-data-quality-report.mjs";
import { detectProviderConflicts } from "../tools/detect-provider-conflicts.mjs";
import { buildProviderMonitorQueue } from "../tools/export-provider-monitor-queue.mjs";
import { buildProviderReviewQueue } from "../tools/export-provider-review-queue.mjs";

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "provider-review-"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function baseProvider(overrides = {}) {
  return {
    id: "provider-base",
    name: "Base Provider",
    type: "psychologist",
    region: "Auckland",
    city: "Auckland",
    address: "1 Queen Street, Auckland",
    lat: -36.8485,
    lon: 174.7633,
    phone: "09 123 4567",
    text: "",
    email: "hello@example.org",
    website: "https://example.org",
    bookingUrl: "",
    source: "https://example.org/source",
    sourceQuality: "provider-owned public page",
    confidence: "medium",
    needsManualVerification: true,
    verified: "2026-05",
    lastVerified: "2026-05",
    availabilityStatus: "not_published",
    availabilityCheckedAt: "2026-05",
    availabilityEvidence: "",
    availabilitySource: "https://example.org/source",
    availabilityNeedsManualReview: true,
    tags: ["psychologist", "depression"],
    needScope: [],
    specialties: [],
    services: [],
    patientGroups: [],
    ageGroups: [],
    fit: "Provider offering mental health care.",
    firstStep: "Email the provider to ask about availability.",
    cost: "Ask about fees.",
    hours: "Ask about hours.",
    ...overrides
  };
}

function buildQueueFixture(providers, reports = {}) {
  const dir = tempDir();
  const providersPath = path.join(dir, "providers.json");
  const sourceFit = path.join(dir, "source-fit.json");
  const availability = path.join(dir, "availability.json");
  const referrals = path.join(dir, "referrals.json");
  const watchlist = path.join(dir, "watchlist.json");
  writeJson(providersPath, providers);
  writeJson(sourceFit, { findings: reports.sourceFit || [] });
  writeJson(availability, { findings: reports.availability || [] });
  writeJson(referrals, { findings: reports.referrals || [] });
  writeJson(watchlist, reports.watchlist || { version: 1, items: [] });
  return buildProviderReviewQueue({
    providers: providersPath,
    sourceFitAudit: sourceFit,
    availabilityAudit: availability,
    referralAudit: referrals,
    watchlist,
    linkResults: path.join(dir, "missing-link-report.json"),
    identityScan: path.join(dir, "missing-identity-scan.json"),
    discoveryQueue: path.join(dir, "missing-discovery.json"),
    googlePlacesCandidates: path.join(dir, "missing-google-places.json"),
    skipAuditRun: true
  });
}

test("export queue includes high source-fit findings and sorts high risk first", () => {
  const critical = baseProvider({ id: "critical-provider", name: "Critical Provider" });
  const lower = baseProvider({ id: "lower-provider", name: "Lower Provider", confidence: "high", needsManualVerification: false });
  const queue = buildQueueFixture([lower, critical], {
    sourceFit: [
      {
        providerId: "critical-provider",
        providerName: "Critical Provider",
        rule: "directory-treated-direct",
        severity: "high",
        issue: "Directory is treated as direct.",
        suggestedFix: "Remove direct-contact signals.",
        source: "https://example.org/source"
      },
      {
        providerId: "lower-provider",
        providerName: "Lower Provider",
        rule: "weak-telehealth-evidence",
        severity: "medium",
        issue: "Telehealth is weak.",
        suggestedFix: "Verify telehealth.",
        source: "https://example.org/source"
      }
    ]
  });

  assert.equal(queue.items[0].providerId, "critical-provider");
  assert.equal(queue.items[0].auditSeverity, "high");
  assert.ok(queue.items[0].auditRules.includes("directory-treated-direct"));
  assert.equal(queue.items[0].reviewCategory, "Directory/direct-contact confusion");
  assert.equal(queue.summary.byCategory["Directory/direct-contact confusion"], 1);
});

test("export queue includes availability risk, referral review, address concerns, broad tags, cultural tags, and telehealth claims", () => {
  const availabilityRisk = baseProvider({ id: "availability-risk", availabilityStatus: "accepting", availabilityEvidence: "" });
  const psychiatrist = baseProvider({
    id: "psychiatrist-review",
    type: "psychiatrist",
    referralType: "unknown",
    requiresReferral: false,
    referralSourceUrl: "https://example.org/referral",
    referralSourceExcerpt: "Referral pathway not published.",
    referralConfidence: "low",
    referralLastChecked: "2026-05",
    referralNeedsManualReview: true
  });
  const missingCoords = baseProvider({ id: "missing-coords", lat: "", lon: "" });
  const tagged = baseProvider({ id: "tagged-risk", tags: ["psychologist", "depression", "maori", "telehealth"] });

  const queue = buildQueueFixture([availabilityRisk, psychiatrist, missingCoords, tagged], {
    availability: [
      {
        providerId: "availability-risk",
        providerName: "Availability Risk",
        rule: "accepting-without-explicit-evidence",
        severity: "high",
        issue: "Accepting without evidence.",
        suggestedAction: "Add evidence.",
        source: "https://example.org"
      }
    ],
    referrals: [
      {
        providerId: "psychiatrist-review",
        name: "Psychiatrist Review",
        rule: "unknown-without-review",
        severity: "medium",
        issue: "Referral is unknown.",
        suggestedAction: "Review source.",
        sourceUrl: "https://example.org/referral"
      }
    ],
    sourceFit: [
      {
        providerId: "tagged-risk",
        providerName: "Tagged Risk",
        rule: "broad-tag-without-source-support",
        severity: "medium",
        issue: "Broad tag needs evidence.",
        suggestedFix: "Verify tag.",
        source: "https://example.org"
      },
      {
        providerId: "tagged-risk",
        providerName: "Tagged Risk",
        rule: "weak-maori-evidence",
        severity: "medium",
        issue: "Maori support tag needs evidence.",
        suggestedFix: "Verify cultural evidence.",
        source: "https://example.org"
      },
      {
        providerId: "tagged-risk",
        providerName: "Tagged Risk",
        rule: "weak-telehealth-evidence",
        severity: "medium",
        issue: "Telehealth needs evidence.",
        suggestedFix: "Verify telehealth.",
        source: "https://example.org"
      }
    ]
  });

  const ids = queue.items.map((item) => item.providerId);
  assert.ok(ids.includes("availability-risk"));
  assert.ok(ids.includes("psychiatrist-review"));
  assert.ok(ids.includes("missing-coords"));
  assert.ok(ids.includes("tagged-risk"));
  assert.ok(queue.items.find((item) => item.providerId === "tagged-risk").auditRules.includes("weak-maori-evidence"));
  assert.ok(queue.items.find((item) => item.providerId === "tagged-risk").auditRules.includes("weak-telehealth-evidence"));
  assert.equal(queue.items.find((item) => item.providerId === "availability-risk").reviewCategory, "Availability review");
  assert.equal(queue.items.find((item) => item.providerId === "psychiatrist-review").reviewCategory, "Referral pathway review");
  assert.equal(queue.items.find((item) => item.providerId === "missing-coords").reviewCategory, "Location and distance evidence");
  assert.equal(queue.items.find((item) => item.providerId === "tagged-risk").reviewCategory, "Sensitive tag or scope evidence");
});

test("focused export does not dump low-risk GP manual records by default", () => {
  const gp = baseProvider({ id: "gp-manual-only", type: "gp", name: "Manual GP", needsManualVerification: true, availabilityNeedsManualReview: true });
  const specialist = baseProvider({ id: "specialist-manual-only", type: "psychologist", name: "Manual Psychologist", needsManualVerification: true });
  const queue = buildQueueFixture([gp, specialist]);

  assert.equal(queue.items.some((item) => item.providerId === "gp-manual-only"), false);
  assert.equal(queue.items.some((item) => item.providerId === "specialist-manual-only"), true);
});

test("approve cannot invent evidence and accepting cannot be approved without explicit evidence", () => {
  const provider = baseProvider({ id: "approve-safety", availabilityStatus: "accepting", availabilityEvidence: "" });
  const result = applyReviewDecisions({
    providers: [provider],
    decisions: {
      decisions: [
        {
          providerId: "approve-safety",
          action: "approve",
          reviewer: "tester",
          reviewedDate: "2026-05-26",
          correctedFields: {}
        }
      ]
    }
  });

  assert.equal(result.applied.length, 0);
  assert.match(result.errors[0].error, /without source evidence|without explicit accepting/i);
});

test("psychiatrist referralType self cannot be applied without explicit source evidence", () => {
  const provider = baseProvider({
    id: "psych-self-unsafe",
    type: "psychiatrist",
    referralType: "unknown",
    requiresReferral: false,
    referralSourceUrl: "https://example.org",
    referralSourceExcerpt: "Referral pathway not published.",
    referralConfidence: "low",
    referralLastChecked: "2026-05",
    referralNeedsManualReview: true
  });
  const result = applyReviewDecisions({
    providers: [provider],
    decisions: {
      decisions: [
        {
          providerId: "psych-self-unsafe",
          action: "adjust",
          correctedFields: { referralType: "self" },
          sourceExcerpt: "Contact page.",
          reviewer: "tester",
          reviewedDate: "2026-05-26"
        }
      ]
    }
  });

  assert.equal(result.applied.length, 0);
  assert.match(result.errors[0].error, /self-referral/i);
});

test("adjust applies only allowed corrected fields and rejects unsafe fields", () => {
  const provider = baseProvider({ id: "field-safety" });
  const result = applyReviewDecisions({
    providers: [provider],
    decisions: {
      decisions: [
        {
          providerId: "field-safety",
          action: "adjust",
          correctedFields: { admin: true },
          sourceExcerpt: "Evidence",
          reviewer: "tester",
          reviewedDate: "2026-05-26"
        }
      ]
    }
  });

  assert.equal(result.applied.length, 0);
  assert.match(result.errors[0].error, /Unsafe correctedFields/);
});

test("adjust cannot add unsupported advertised specialties without evidence", () => {
  const provider = baseProvider({
    id: "advertised-specialty-safety",
    type: "psychiatrist",
    tags: ["psychiatrist"],
    advertisedSpecialties: [],
    advertisedSpecialtyEvidence: []
  });
  const rejected = applyReviewDecisions({
    providers: [provider],
    decisions: {
      decisions: [
        {
          providerId: "advertised-specialty-safety",
          action: "adjust",
          correctedFields: { advertisedSpecialties: ["Depression"] },
          sourceExcerpt: "Profile says private psychiatrist.",
          reviewer: "tester",
          reviewedDate: "2026-05-26"
        }
      ]
    }
  });
  const accepted = applyReviewDecisions({
    providers: [provider],
    decisions: {
      decisions: [
        {
          providerId: "advertised-specialty-safety",
          action: "adjust",
          correctedFields: {
            advertisedSpecialties: ["Depression"],
            advertisedSpecialtyEvidence: [{ sourceUrl: provider.source, excerpt: "Profile lists Depression as a special interest." }]
          },
          sourceExcerpt: "Profile lists Depression as a special interest.",
          reviewer: "tester",
          reviewedDate: "2026-05-26"
        }
      ]
    }
  });

  assert.equal(rejected.applied.length, 0);
  assert.match(rejected.errors[0].error, /advertised specialties/i);
  assert.equal(accepted.applied.length, 1);
  assert.deepEqual(accepted.providers[0].advertisedSpecialties, ["Depression"]);
});

test("reject removes provider safely and writes log event", () => {
  const provider = baseProvider({ id: "reject-me" });
  const result = applyReviewDecisions({
    providers: [provider],
    decisions: { decisions: [{ providerId: "reject-me", action: "reject", reviewer: "tester", reviewedDate: "2026-05-26", sourceExcerpt: "Bad record." }] }
  });

  assert.equal(result.providers.some((item) => item.id === "reject-me"), false);
  assert.equal(result.events[0].action, "reject");
  assert.equal(result.events[0].oldFields.id, "reject-me");
});

test("move_to_watchlist updates watchlist and removes provider from first recommendations", () => {
  const provider = baseProvider({ id: "watch-me", availabilityStatus: "not_accepting", availabilityEvidence: "Not accepting new clients." });
  const result = applyReviewDecisions({
    providers: [provider],
    watchlist: { version: 1, items: [] },
    decisions: { decisions: [{ providerId: "watch-me", action: "move_to_watchlist", reviewer: "tester", reviewedDate: "2026-05-26", sourceExcerpt: "Not accepting new clients." }] }
  });

  assert.equal(result.providers.some((item) => item.id === "watch-me"), false);
  assert.equal(result.watchlist.items.some((item) => item.id === "watch-me"), true);
  assert.equal(result.events[0].newFields.movedToWatchlist, "watch-me");
});

test("duplicate preserves kept-provider link in review log", () => {
  const duplicate = baseProvider({ id: "duplicate-provider" });
  const kept = baseProvider({ id: "kept-provider" });
  const result = applyReviewDecisions({
    providers: [duplicate, kept],
    decisions: { decisions: [{ providerId: "duplicate-provider", action: "duplicate", keptProviderId: "kept-provider", reviewer: "tester", reviewedDate: "2026-05-26" }] }
  });

  assert.equal(result.providers.some((item) => item.id === "duplicate-provider"), false);
  assert.equal(result.providers.some((item) => item.id === "kept-provider"), true);
  assert.equal(result.events[0].newFields.duplicateOf, "kept-provider");
});

test("needs_more_info leaves provider unchanged", () => {
  const provider = baseProvider({ id: "needs-more-info" });
  const result = applyReviewDecisions({
    providers: [provider],
    decisions: { decisions: [{ providerId: "needs-more-info", action: "needs_more_info", reviewer: "tester", reviewedDate: "2026-05-26" }] }
  });

  assert.deepEqual(result.providers, [provider]);
  assert.equal(result.events[0].action, "needs_more_info");
});

test("review log records old and new values for adjustments", () => {
  const provider = baseProvider({ id: "adjust-log", phone: "09 111 1111" });
  const result = applyReviewDecisions({
    providers: [provider],
    decisions: {
      decisions: [
        {
          providerId: "adjust-log",
          action: "adjust",
          correctedFields: { phone: "09 222 2222" },
          sourceExcerpt: "Phone 09 222 2222",
          reviewer: "tester",
          reviewedDate: "2026-05-26"
        }
      ]
    }
  });

  assert.equal(result.providers[0].phone, "09 222 2222");
  assert.equal(result.events[0].oldFields.phone, "09 111 1111");
  assert.equal(result.events[0].newFields.phone, "09 222 2222");
});

test("admin UI contains no tokens, opens sources externally, and keeps iframe sandboxed", () => {
  const html = fs.readFileSync("admin/index.html", "utf8");
  const js = fs.readFileSync("admin/admin.js", "utf8");
  assert.doesNotMatch(`${html}\n${js}`, /api[_-]?key|secret|token|bearer\s+[a-z0-9._-]+/i);
  assert.match(html, /sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"/);
  assert.match(js, /target = "_blank"/);
  assert.match(js, /rel = "noopener noreferrer"/);
  assert.match(html, /data\/provider-review-queue\.json/);
  assert.match(html, /Auditor guide/);
  assert.match(html, /Common corrections/);
  assert.match(html, /Generated correctedFields preview/);
  assert.match(js, /Stored:/);
  assert.match(js, /Confidence:/);
  assert.match(js, /availabilityStatus/);
  assert.match(js, /referralType/);
  assert.match(js, /choice-grid/);
  assert.match(html, /Ongoing monitor queue/);
  assert.match(html, /Claim review queue/);
  assert.match(html, /GP source corroboration/);
  assert.match(html, /Google Places candidates/);
  assert.match(html, /Auto-resolution proposals/);
  assert.match(html, /Regional priorities/);
  assert.match(html, /Review category/);
  assert.match(html, /Any batch/);
  assert.match(html, /Filtered batch/);
  assert.match(html, /Save needs_more_info for filtered/);
  assert.match(js, /provider-claim-review-queue\.json/);
  assert.match(js, /gp-source-corroboration-queue\.json/);
  assert.match(js, /gpTaskToItem/);
  assert.match(js, /Suggested searches/);
  assert.match(js, /DoctorPricer and search snippets are discovery-only/);
  assert.match(js, /provider-auto-resolution-proposals\.json/);
  assert.match(js, /autoDeprioritizeProposals/);
  assert.match(js, /queueItemsFromPayload/);
  assert.match(js, /Claim field/);
  assert.match(js, /categoryFilter/);
  assert.match(js, /batchFilter/);
  assert.match(js, /filteredBatchDecisionFor/);
  assert.match(js, /Narrow the queue first and keep the filtered set to 100 items or fewer/);
  assert.match(js, /item\(s\) that already had decisions/);
  assert.match(js, /provider-monitor-queue\.json/);
  assert.match(js, /regional-data-quality-report\.json/);
  assert.match(js, /google-places-provider-candidates\.json/);
  assert.match(js, /googlePlacesCandidateToItem/);
  assert.match(js, /noClinicalClaimsFromPlacesAlone/);
  assert.match(js, /regionalPriorityToItem/);
  assert.match(js, /planningOnly/);
  assert.match(js, /do not export provider decisions/i);
  assert.match(html, /Same practice \/ related records/);
  assert.match(html, /practiceGroupTitle/);
  assert.match(html, /New clinician from this practice/);
  assert.match(js, /relatedPracticeRecords/);
  assert.match(js, /practiceTemplateFor/);
  assert.match(js, /providers\.json/);
  assert.match(js, /tags: \[\]/);
  assert.match(js, /Draft copied from shared practice details only/);
});

test("provider evidence graph splits rows into scored claims and review-gates high-risk fields", () => {
  const dir = tempDir();
  const providersPath = path.join(dir, "providers.json");
  const sourceFitPath = path.join(dir, "source-fit.json");
  const availabilityPath = path.join(dir, "availability.json");
  const referralPath = path.join(dir, "referral.json");
  const reviewQueuePath = path.join(dir, "review-queue.json");
  const provider = baseProvider({
    id: "claim-source",
    name: "Claim Source",
    sourceQuality: "provider-owned page",
    confidence: "high",
    needsManualVerification: false,
    tags: ["psychologist", "depression"],
    availabilityStatus: "accepting",
    availabilityEvidence: "",
    availabilityNeedsManualReview: true
  });
  writeJson(providersPath, [provider]);
  writeJson(sourceFitPath, {
    findings: [{
      providerId: "claim-source",
      rule: "broad-tag-without-source-support",
      severity: "medium",
      issue: "Broad tag needs source evidence.",
      suggestedFix: "Remove tag or add evidence.",
      source: "https://example.org/source"
    }]
  });
  writeJson(availabilityPath, { findings: [] });
  writeJson(referralPath, { findings: [] });
  writeJson(reviewQueuePath, { items: [] });
  const graph = buildProviderEvidenceGraph({
    providers: providersPath,
    sourceFitAudit: sourceFitPath,
    availabilityAudit: availabilityPath,
    referralAudit: referralPath,
    reviewQueue: reviewQueuePath
  });
  const node = graph.nodes[0];
  const nameClaim = node.claims.find((claim) => claim.field === "name");
  const tagClaim = node.claims.find((claim) => claim.field === "tags" && claim.value === "depression");
  const acceptingClaim = node.claims.find((claim) => claim.field === "availabilityStatus");
  assert.equal(nameClaim.decision, "auto_accept");
  assert.equal(tagClaim.decision, "review");
  assert.equal(tagClaim.riskLevel, "high");
  assert.equal(acceptingClaim.decision, "review");
  assert.match(acceptingClaim.reason, /accepting availability/i);
});

test("claim review queue compresses repeated field-level work into batch groups", () => {
  const dir = tempDir();
  const providersPath = path.join(dir, "providers.json");
  const sourceFitPath = path.join(dir, "source-fit.json");
  const emptyPath = path.join(dir, "empty.json");
  const providers = [
    baseProvider({ id: "batch-one", name: "Batch One", tags: ["psychologist", "depression"] }),
    baseProvider({ id: "batch-two", name: "Batch Two", tags: ["psychologist", "depression"] })
  ];
  writeJson(providersPath, providers);
  writeJson(sourceFitPath, {
    findings: providers.map((provider) => ({
      providerId: provider.id,
      rule: "broad-tag-without-source-support",
      severity: "medium",
      issue: "Broad depression tag needs source support.",
      suggestedFix: "Remove or evidence tag.",
      source: provider.source
    }))
  });
  writeJson(emptyPath, { findings: [] });
  const graph = buildProviderEvidenceGraph({
    providers: providersPath,
    sourceFitAudit: sourceFitPath,
    availabilityAudit: emptyPath,
    referralAudit: emptyPath,
    reviewQueue: emptyPath
  });
  const graphPath = path.join(dir, "graph.json");
  writeJson(graphPath, graph);
  const queue = buildProviderClaimReviewQueue({ graph: graphPath, providers: providersPath });
  assert.ok(queue.items.some((item) => item.claimField === "tags" && item.claimValue === "depression"));
  const tagBatch = queue.batches.find((batch) => batch.claimField === "tags" && batch.count >= 2);
  assert.ok(tagBatch);
  assert.equal(tagBatch.providerCount, 2);
  assert.equal(tagBatch.providers.length, 2);
  assert.equal(tagBatch.duplicateClaimRows, tagBatch.count - tagBatch.providerCount);
  assert.ok(queue.summary.batches < queue.items.length, "batch count should compress repeated claim items");
});

test("claim queue attaches tag audit findings only to matching tag values", () => {
  const dir = tempDir();
  const providersPath = path.join(dir, "providers.json");
  const sourceFitPath = path.join(dir, "source-fit.json");
  const emptyPath = path.join(dir, "empty.json");
  const providers = [
    baseProvider({
      id: "targeted-tags",
      name: "Targeted Tags",
      tags: ["psychologist", "depression", "telehealth", "direct-contact", "cost"]
    })
  ];
  writeJson(providersPath, providers);
  writeJson(sourceFitPath, {
    findings: [
      {
        providerId: "targeted-tags",
        rule: "broad-tag-without-source-support",
        severity: "medium",
        issue: "Broad tag \"depression\" is present but source fields do not clearly support it.",
        suggestedFix: "Remove depression or add evidence."
      },
      {
        providerId: "targeted-tags",
        rule: "weak-telehealth-evidence",
        severity: "medium",
        issue: "Telehealth or online availability is set but source fields do not clearly support remote care.",
        suggestedFix: "Remove telehealth/online flags or add evidence."
      }
    ]
  });
  writeJson(emptyPath, { findings: [], items: [] });
  const graph = buildProviderEvidenceGraph({
    providers: providersPath,
    sourceFitAudit: sourceFitPath,
    availabilityAudit: emptyPath,
    referralAudit: emptyPath,
    reviewQueue: emptyPath
  });
  const graphPath = path.join(dir, "graph.json");
  writeJson(graphPath, graph);
  const queue = buildProviderClaimReviewQueue({ graph: graphPath, providers: providersPath });
  const tagItems = queue.items.filter((item) => item.claimField === "tags");
  const queuedTags = tagItems.map((item) => item.claimValue).sort();

  assert.deepEqual(queuedTags, ["depression", "telehealth"]);
  assert.equal(tagItems.some((item) => item.claimValue === "direct-contact"), false);
  assert.equal(tagItems.some((item) => item.claimValue === "cost"), false);
  assert.equal(tagItems.some((item) => item.claimValue === "psychologist"), false);
});

test("weak GP source audit creates one source-corroboration task per provider", () => {
  const dir = tempDir();
  const providersPath = path.join(dir, "providers.json");
  const sourceFitPath = path.join(dir, "source-fit.json");
  const emptyPath = path.join(dir, "empty.json");
  const providers = [
    baseProvider({
      id: "weak-gp-source",
      name: "Weak GP Source",
      type: "gp",
      phone: "09 123 4567",
      website: "",
      source: "https://doctorpricer.co.nz/",
      sourceQuality: "third-party public GP listing",
      tags: ["gp", "primary-care"]
    })
  ];
  writeJson(providersPath, providers);
  writeJson(sourceFitPath, {
    findings: [
      {
        providerId: "weak-gp-source",
        rule: "weak-gp-source",
        severity: "low",
        issue: "GP record uses a third-party or generic source and is missing either phone or website.",
        suggestedFix: "Verify against a practice-owned page, Healthpoint, HPI/FHIR export, or PHO data when available."
      }
    ]
  });
  writeJson(emptyPath, { findings: [], items: [] });
  const graph = buildProviderEvidenceGraph({
    providers: providersPath,
    sourceFitAudit: sourceFitPath,
    availabilityAudit: emptyPath,
    referralAudit: emptyPath,
    reviewQueue: emptyPath
  });
  const graphPath = path.join(dir, "graph.json");
  writeJson(graphPath, graph);
  const queue = buildProviderClaimReviewQueue({ graph: graphPath, providers: providersPath });
  const gpItems = queue.items.filter((item) => item.reviewCategory === "GP source corroboration");

  assert.equal(gpItems.length, 1);
  assert.equal(gpItems[0].providerId, "weak-gp-source");
  assert.equal(gpItems[0].claimField, "sourceQuality");
  assert.equal(gpItems.some((item) => item.claimField === "phone"), false);
});

test("GP source corroboration queue isolates weak GP records without live mutation", () => {
  const providers = [
    baseProvider({
      id: "weak-gp-corroboration",
      name: "Weak GP Corroboration",
      type: "gp",
      region: "Northland",
      city: "Whangarei",
      address: "1 Sample Road, Whangarei",
      phone: "09 123 4567",
      website: "",
      source: "https://doctorpricer.co.nz/",
      sourceQuality: "third-party public GP listing",
      importSource: "doctorpricer",
      tags: ["gp", "primary-care"]
    }),
    baseProvider({
      id: "strong-gp-corroboration",
      name: "Strong GP Corroboration",
      type: "gp",
      region: "Northland",
      city: "Whangarei",
      website: "https://examplemedical.nz",
      source: "https://examplemedical.nz",
      sourceQuality: "practice-owned public page",
      tags: ["gp", "primary-care"]
    }),
    baseProvider({
      id: "weak-non-gp",
      name: "Weak Non-GP",
      type: "psychologist",
      website: "",
      source: "https://doctorpricer.co.nz/",
      sourceQuality: "third-party public listing"
    })
  ];
  const original = JSON.stringify(providers);
  const queue = buildGpSourceCorroborationQueue({
    providers,
    sourceFitAudit: {
      findings: [{
        providerId: "weak-gp-corroboration",
        rule: "weak-gp-source",
        severity: "low",
        issue: "GP record uses a third-party or generic source and is missing either phone or website."
      }]
    }
  });

  assert.equal(queue.summary.totalTasks, 1);
  assert.equal(queue.summary.missingWebsite, 1);
  assert.equal(queue.summary.missingPhone, 0);
  assert.equal(queue.summary.noLiveProviderMutation, true);
  assert.equal(queue.safety.reviewGateRequired, true);
  assert.equal(queue.tasks[0].providerId, "weak-gp-corroboration");
  assert.deepEqual(queue.tasks[0].missingFields, ["website"]);
  assert.equal(queue.tasks[0].decisionGuidance.liveMutationAllowed, false);
  assert.ok(queue.tasks[0].allowedEvidenceSources.some((source) => /Healthpoint/.test(source)));
  assert.ok(queue.tasks[0].disallowedEvidenceSources.some((source) => /search-result snippet/i.test(source)));
  assert.ok(queue.tasks[0].suggestedSearches.some((query) => query.includes("site:healthpoint.co.nz")));
  assert.equal(JSON.stringify(providers), original);
});

test("GP corroboration review pack ranks strong exact leads but keeps source capture gated", () => {
  const provider = baseProvider({
    id: "gp-ready-review",
    name: "Ready Review Medical",
    type: "gp",
    region: "Northland",
    city: "Whangarei",
    phone: "09 123 4567",
    website: "",
    sourceQuality: "third-party public GP listing",
    importSource: "doctorpricer",
    tags: ["gp", "primary-care"]
  });
  const pack = buildGpCorroborationReviewPack({
    providers: [provider],
    gpCorroborationQueue: {
      tasks: [{
        providerId: "gp-ready-review",
        name: "Ready Review Medical",
        region: "Northland",
        city: "Whangarei",
        missingFields: ["website"],
        reviewReason: "GP record needs stronger corroboration: missing website."
      }]
    },
    googlePlacesCandidates: {
      candidates: [{
        candidateId: "places-ready-review",
        action: "corroborate_existing_provider",
        type: "gp",
        name: "Ready Review Medical",
        phone: "09 123 4567",
        website: "https://www.healthpoint.co.nz/gps-accident-urgent-medical-care/gp/ready-review-medical/",
        address: "1 Test Street, Whangarei",
        lat: -35.72,
        lon: 174.32,
        possibleProviderIds: ["gp-ready-review"],
        duplicateSignals: ["phone", "name", "address"],
        reviewReasons: ["target GP source-corroboration provider: gp-ready-review"]
      }]
    }
  });

  assert.equal(pack.safety.noLiveProviderMutation, true);
  assert.equal(pack.safety.sourceExcerptRequiredBeforeApply, true);
  assert.equal(pack.summary.readyForSourceCapture, 1);
  assert.equal(pack.items[0].priority, "ready_for_source_capture");
  assert.equal(pack.items[0].bestCandidate.sourceCategory, "healthpoint_gp_listing");
  assert.equal(pack.items[0].draftCorrectedFields.website, "https://www.healthpoint.co.nz/gps-accident-urgent-medical-care/gp/ready-review-medical/");
  assert.equal(pack.items[0].liveMutationAllowed, false);
});

test("GP corroboration review pack can capture source excerpts without approving data", async () => {
  const provider = baseProvider({
    id: "gp-ready-review-excerpt",
    name: "Ready Review Medical",
    type: "gp",
    region: "Northland",
    city: "Whangarei",
    phone: "09 123 4567",
    website: "",
    sourceQuality: "third-party public GP listing",
    importSource: "doctorpricer",
    tags: ["gp", "primary-care"]
  });
  const pack = buildGpCorroborationReviewPack({
    providers: [provider],
    gpCorroborationQueue: {
      tasks: [{
        providerId: "gp-ready-review-excerpt",
        name: "Ready Review Medical",
        region: "Northland",
        city: "Whangarei",
        missingFields: ["website"],
        reviewReason: "GP record needs stronger corroboration: missing website."
      }]
    },
    googlePlacesCandidates: {
      candidates: [{
        candidateId: "places-ready-review-excerpt",
        action: "corroborate_existing_provider",
        type: "gp",
        name: "Ready Review Medical",
        phone: "09 123 4567",
        website: "https://readyreviewmedical.example.org",
        address: "1 Test Street, Whangarei",
        possibleProviderIds: ["gp-ready-review-excerpt"],
        duplicateSignals: ["phone", "name", "address"]
      }]
    }
  });

  const enriched = await enrichGpCorroborationReviewPackWithSourceExcerpts(pack, {
    maxSourceFetches: 1,
    rateLimitMs: 0,
    fetchSource: async (url) => ({
      url,
      finalUrl: url,
      capturedAt: "2026-06-01T00:00:00.000Z",
      ok: true,
      blocked: false,
      skipped: false,
      status: 200,
      contentType: "text/html",
      error: "",
      text: "<html><title>Ready Review Medical</title><body><h1>Ready Review Medical</h1><p>Phone 09 123 4567</p><p>1 Test Street, Whangarei</p></body></html>",
      sourceHash: "testhash"
    })
  });

  assert.equal(enriched.sourceFetch.enabled, true);
  assert.equal(enriched.summary.sourcePagesFetched, 1);
  assert.equal(enriched.summary.sourceCaptures, 1);
  assert.equal(enriched.items[0].sourceCapture.status, "captured");
  assert.match(enriched.items[0].sourceExcerpt, /Ready Review Medical|09 123 4567/);
  assert.equal(enriched.items[0].liveMutationAllowed, false);
});

test("GP corroboration review pack flags multi-provider Places matches as manual compare", () => {
  const provider = baseProvider({
    id: "gp-shared-match",
    name: "Shared Match Medical",
    type: "gp",
    website: "",
    phone: "09 222 3333",
    sourceQuality: "third-party public GP listing",
    importSource: "doctorpricer"
  });
  const pack = buildGpCorroborationReviewPack({
    providers: [provider],
    gpCorroborationQueue: {
      tasks: [{
        providerId: "gp-shared-match",
        name: "Shared Match Medical",
        missingFields: ["website"]
      }]
    },
    googlePlacesCandidates: {
      candidates: [{
        candidateId: "places-shared-match",
        action: "corroborate_existing_provider",
        type: "gp",
        name: "Shared Match Medical",
        phone: "09 222 3333",
        website: "https://sharedmedical.nz",
        possibleProviderIds: ["gp-shared-match", "gp-other-branch"],
        duplicateSignals: ["phone", "name"]
      }]
    }
  });

  assert.equal(pack.items[0].priority, "manual_compare_conflict");
  assert.deepEqual(pack.items[0].bestCandidate.conflictingProviderIds, ["gp-other-branch"]);
  assert.deepEqual(pack.items[0].draftCorrectedFields, {});
});

test("GP corroboration review pack does not treat login portals as source evidence", () => {
  const provider = baseProvider({
    id: "gp-portal-only",
    name: "Portal Only Medical",
    type: "gp",
    website: "",
    phone: "09 333 4444",
    sourceQuality: "third-party public GP listing",
    importSource: "doctorpricer"
  });
  const pack = buildGpCorroborationReviewPack({
    providers: [provider],
    gpCorroborationQueue: {
      tasks: [{ providerId: "gp-portal-only", name: "Portal Only Medical", missingFields: ["website"] }]
    },
    googlePlacesCandidates: {
      candidates: [{
        candidateId: "places-portal-only",
        action: "corroborate_existing_provider",
        type: "gp",
        name: "Portal Only Medical",
        phone: "09 333 4444",
        website: "https://health365.co.nz/SGAccount/LogOn",
        possibleProviderIds: ["gp-portal-only"],
        duplicateSignals: ["phone", "name"]
      }]
    }
  });

  assert.equal(pack.items[0].bestCandidate.sourceCategory, "booking_or_login_portal");
  assert.equal(pack.items[0].priority, "source_lookup_needed");
  assert.deepEqual(pack.items[0].draftCorrectedFields, {});
});

test("admin UI can load GP source corroboration tasks as review items", () => {
  const html = fs.readFileSync("admin/index.html", "utf8");
  const js = fs.readFileSync("admin/admin.js", "utf8");

  assert.match(html, /<option value="gp">GP source corroboration<\/option>/);
  assert.match(html, /<option value="gpReviewPack">GP corroboration review pack<\/option>/);
  assert.match(js, /Array\.isArray\(queue\.tasks\) && queue\.summary\?\.reviewGateRequired/);
  assert.match(js, /reviewCategory: "GP source corroboration"/);
  assert.match(js, /gp-corroboration-review-pack\.json/);
  assert.match(js, /item\.prefillCorrectedFields/);
  assert.match(js, /item\.sourceExcerpt/);
  assert.match(js, /practice-owned, Healthpoint, PHO, HPI\/FHIR, or official source/);
  assert.match(js, /Do not infer availability, enrolment, mental-health specialties, cultural support/);
});

test("broad tag findings only attach to matching fit and specialty text", () => {
  const dir = tempDir();
  const providersPath = path.join(dir, "providers.json");
  const sourceFitPath = path.join(dir, "source-fit.json");
  const emptyPath = path.join(dir, "empty.json");
  const providers = [
    baseProvider({
      id: "targeted-broad-text",
      name: "Targeted Broad Text",
      tags: ["psychologist", "depression"],
      specialties: ["Diagnostic assessment", "Mood and anxiety therapy", "Professional supervision"],
      fit: "Local psychology profile for mood support and diagnostic assessment."
    })
  ];
  writeJson(providersPath, providers);
  writeJson(sourceFitPath, {
    findings: [
      {
        providerId: "targeted-broad-text",
        rule: "broad-tag-without-source-support",
        severity: "medium",
        issue: "Broad tag \"depression\" is present but source fields do not clearly support it.",
        suggestedFix: "Remove depression or add evidence."
      }
    ]
  });
  writeJson(emptyPath, { findings: [], items: [] });
  const graph = buildProviderEvidenceGraph({
    providers: providersPath,
    sourceFitAudit: sourceFitPath,
    availabilityAudit: emptyPath,
    referralAudit: emptyPath,
    reviewQueue: emptyPath
  });
  const graphPath = path.join(dir, "graph.json");
  writeJson(graphPath, graph);
  const queue = buildProviderClaimReviewQueue({ graph: graphPath, providers: providersPath });
  const broadItems = queue.items.filter((item) => item.auditRules.includes("broad-tag-without-source-support"));

  assert.ok(broadItems.some((item) => item.claimField === "tags" && item.claimValue === "depression"));
  assert.ok(broadItems.some((item) => item.claimField === "fit"));
  assert.ok(broadItems.some((item) => item.claimField === "specialties" && item.claimValue === "Mood and anxiety therapy"));
  assert.equal(broadItems.some((item) => item.claimField === "specialties" && item.claimValue === "Diagnostic assessment"), false);
  assert.equal(broadItems.some((item) => item.claimField === "specialties" && item.claimValue === "Professional supervision"), false);
});

test("claim batch draft helper creates review-gated adjustment decisions only after human confirmation", () => {
  const dir = tempDir();
  const providersPath = path.join(dir, "providers.json");
  const sourceFitPath = path.join(dir, "source-fit.json");
  const emptyPath = path.join(dir, "empty.json");
  const claimQueuePath = path.join(dir, "claim-queue.json");
  const providers = [
    baseProvider({ id: "draft-one", name: "Draft One", tags: ["psychologist", "depression", "anxiety"] }),
    baseProvider({ id: "draft-two", name: "Draft Two", tags: ["psychologist", "depression"] })
  ];
  writeJson(providersPath, providers);
  writeJson(sourceFitPath, {
    findings: providers.map((provider) => ({
      providerId: provider.id,
      rule: "broad-tag-without-source-support",
      severity: "medium",
      issue: "Broad depression tag needs source support.",
      suggestedFix: "Remove or evidence tag.",
      source: provider.source
    }))
  });
  writeJson(emptyPath, { findings: [] });
  const graph = buildProviderEvidenceGraph({
    providers: providersPath,
    sourceFitAudit: sourceFitPath,
    availabilityAudit: emptyPath,
    referralAudit: emptyPath,
    reviewQueue: emptyPath
  });
  const graphPath = path.join(dir, "graph.json");
  writeJson(graphPath, graph);
  const queue = buildProviderClaimReviewQueue({ graph: graphPath, providers: providersPath });
  writeJson(claimQueuePath, queue);
  const tagBatch = queue.batches.find((batch) => batch.claimField === "tags" && batch.count >= 2);

  assert.throws(() => buildClaimBatchDecisionDraft({
    claimQueue: claimQueuePath,
    providers: providersPath,
    batchKey: tagBatch.batchKey,
    decision: "adjust",
    field: "tags",
    removeValues: ["depression"],
    reviewer: "Reviewer"
  }), /confirmed-human-review|source-excerpt|notes/);

  const draft = buildClaimBatchDecisionDraft({
    claimQueue: claimQueuePath,
    providers: providersPath,
    batchKey: tagBatch.batchKey,
    decision: "adjust",
    field: "tags",
    removeValues: ["depression"],
    reviewer: "Reviewer",
    sourceExcerpt: "Human review confirmed this broad tag is not supported by the cited source.",
    confirmedHumanReview: true
  });

  assert.equal(draft.safety.noLiveProviderMutation, true);
  assert.equal(draft.summary.decisionsDrafted, 2);
  assert.equal(draft.decisions.every((decision) => decision.action === "adjust"), true);
  assert.equal(draft.decisions.every((decision) => !decision.correctedFields.tags.includes("depression")), true);
  assert.equal(draft.decisions.every((decision) => decision.correctedFields.tags.includes("psychologist")), true);
});

test("provider conflict detector flags likely shared practices without auto-merging clinicians", () => {
  const dir = tempDir();
  const providersPath = path.join(dir, "providers.json");
  writeJson(providersPath, [
    baseProvider({
      id: "clinician-one",
      name: "Alex One, Shared Clinic",
      clinicianName: "Alex One",
      practiceName: "Shared Clinic",
      website: "https://sharedclinic.nz",
      email: "admin@sharedclinic.nz"
    }),
    baseProvider({
      id: "clinician-two",
      name: "Blair Two, Shared Clinic",
      clinicianName: "Blair Two",
      practiceName: "Shared Clinic",
      website: "https://sharedclinic.nz",
      email: "admin@sharedclinic.nz"
    })
  ]);
  const report = detectProviderConflicts({ providers: providersPath, graph: path.join(dir, "missing-graph.json") });
  const shared = report.conflicts.find((conflict) => conflict.kind === "shared-domain" && conflict.key === "sharedclinic.nz");
  assert.ok(shared);
  assert.equal(shared.likelySharedPractice, true);
  assert.equal(shared.likelyDuplicate, false);
});

test("auto-resolution proposals de-prioritize low-risk claims but keep risky batches review-gated", () => {
  const dir = tempDir();
  const providersPath = path.join(dir, "providers.json");
  const sourceFitPath = path.join(dir, "source-fit.json");
  const emptyPath = path.join(dir, "empty.json");
  const claimsPath = path.join(dir, "claims.json");
  const claimQueuePath = path.join(dir, "claim-queue.json");
  const providerQueuePath = path.join(dir, "provider-queue.json");
  const conflictsPath = path.join(dir, "conflicts.json");
  const provider = baseProvider({
    id: "proposal-provider",
    name: "Proposal Provider",
    sourceQuality: "provider-owned page",
    confidence: "high",
    needsManualVerification: false,
    tags: ["psychologist", "depression"]
  });
  writeJson(providersPath, [provider]);
  writeJson(sourceFitPath, {
    findings: [{
      providerId: "proposal-provider",
      rule: "broad-tag-without-source-support",
      severity: "medium",
      issue: "Broad tag needs source evidence.",
      suggestedFix: "Remove tag or add evidence.",
      source: provider.source
    }]
  });
  writeJson(emptyPath, { findings: [] });
  const graph = buildProviderEvidenceGraph({
    providers: providersPath,
    sourceFitAudit: sourceFitPath,
    availabilityAudit: emptyPath,
    referralAudit: emptyPath,
    reviewQueue: emptyPath
  });
  writeJson(claimsPath, { claims: graph.claims });
  const graphPath = path.join(dir, "graph.json");
  writeJson(graphPath, graph);
  const claimQueue = buildProviderClaimReviewQueue({ graph: graphPath, claims: claimsPath, providers: providersPath });
  writeJson(claimQueuePath, claimQueue);
  writeJson(providerQueuePath, { items: [{ providerId: "proposal-provider" }] });
  writeJson(conflictsPath, { summary: { total: 0 }, conflicts: [] });
  const output = buildProviderAutoResolutionProposals({
    claims: claimsPath,
    claimQueue: claimQueuePath,
    providerQueue: providerQueuePath,
    conflicts: conflictsPath
  });

  assert.ok(output.summary.autoDeprioritizeClaims >= 1);
  assert.ok(output.autoDeprioritizeProposals.some((proposal) => proposal.field === "name"));
  assert.ok(output.manualBatchProposals.some((proposal) => proposal.reviewCategory === "sensitive tag or scope evidence"));
  assert.equal(output.autoDeprioritizeProposals.every((proposal) => proposal.liveMutationAllowed === false), true);
  assert.ok(output.blockedAutomationRules.some((rule) => rule.rule === "sensitive-tags-need-evidence"));
});

test("provider monitor queue turns automated recheck changes into review items", () => {
  const dir = tempDir();
  const providersPath = path.join(dir, "providers.json");
  const watchlistPath = path.join(dir, "watchlist.json");
  const availabilityAuditPath = path.join(dir, "availability-audit.json");
  const recheckPath = path.join(dir, "recheck.json");
  writeJson(providersPath, [
    baseProvider({
      id: "live-provider",
      name: "Live Provider",
      availabilityStatus: "unknown",
      availabilityCheckedAt: "2026-05-01",
      website: "https://example.org/live"
    })
  ]);
  writeJson(watchlistPath, {
    version: 1,
    items: [
      {
        id: "watch-provider",
        name: "Watch Provider",
        type: "psychologist",
        region: "Otago",
        city: "Dunedin",
        url: "https://example.org/watch",
        lastKnownStatus: "unavailable",
        providerCandidate: {
          name: "Watch Provider",
          type: "psychologist",
          region: "Otago",
          city: "Dunedin",
          website: "https://example.org/watch"
        }
      }
    ]
  });
  writeJson(availabilityAuditPath, {
    findings: [
      {
        providerId: "live-provider",
        providerName: "Live Provider",
        rule: "stale-availability",
        severity: "medium",
        issue: "Availability is stale.",
        suggestedAction: "Recheck availability.",
        source: "https://example.org/live"
      }
    ]
  });
  writeJson(recheckPath, {
    checkedAt: "2026-05-26T00:00:00.000Z",
    results: [
      {
        id: "watch-provider",
        name: "Watch Provider",
        sourceKind: "watchlist",
        url: "https://example.org/watch",
        currentStatus: "not_accepting",
        detectedStatus: "possibly_available",
        changed: true,
        evidence: "new client enquiries welcome",
        checkedAt: "2026-05-26T00:00:00.000Z"
      },
      {
        id: "live-provider",
        name: "Live Provider",
        sourceKind: "live-provider",
        url: "https://example.org/live",
        currentStatus: "unknown",
        detectedStatus: "not_accepting",
        changed: true,
        evidence: "not accepting new clients",
        checkedAt: "2026-05-26T00:00:00.000Z"
      }
    ]
  });

  const queue = buildProviderMonitorQueue({
    providers: providersPath,
    watchlist: watchlistPath,
    availabilityAudit: availabilityAuditPath,
    recheckResults: recheckPath,
    now: new Date("2026-05-26T00:00:00.000Z")
  });

  assert.equal(queue.mode, "ongoing-provider-monitor");
  assert.ok(queue.items.some((item) => item.auditRules.includes("watchlist-possibly-available")));
  assert.equal(queue.items[0].reviewPriority, "critical");
  assert.ok(queue.items.every((item) => item.reviewId.startsWith("monitor:")));
  assert.ok(queue.items.every((item) => Array.isArray(item.sourceUrls)));
});

test("regional data-quality report ranks thin regions and aggregates review signals without mutation", () => {
  const strongAucklandProviders = [
    baseProvider({ id: "akl-gp", type: "gp", region: "Auckland", tags: ["gp"], name: "Auckland GP" }),
    baseProvider({ id: "akl-counsellor", type: "counsellor", region: "Auckland", tags: ["counsellor"], name: "Auckland Counsellor" }),
    baseProvider({ id: "akl-psychologist", type: "psychologist", region: "Auckland", tags: ["psychologist"], name: "Auckland Psychologist" }),
    baseProvider({ id: "akl-psychiatrist", type: "psychiatrist", region: "Auckland", tags: ["psychiatrist"], name: "Auckland Psychiatrist" }),
    baseProvider({ id: "akl-youth", type: "youth", region: "Auckland", tags: ["youth"], name: "Auckland Youth" }),
    baseProvider({ id: "akl-addiction", type: "addiction", region: "Auckland", tags: ["addiction"], name: "Auckland Addiction" }),
    baseProvider({
      id: "akl-public",
      type: "public-service",
      region: "Auckland",
      tags: ["public-service", "mental-health"],
      name: "Auckland Community Mental Health"
    })
  ];
  const thinNorthlandProvider = baseProvider({
    id: "northland-gp",
    type: "gp",
    region: "Northland",
    city: "Whangarei",
    name: "Northland GP",
    website: "",
    email: "",
    phone: "09 000 0000",
    address: "1 Bank Street, Whangarei",
    lat: "",
    lon: "",
    source: "https://doctorpricer.co.nz/",
    sourceQuality: "third-party public GP listing",
    importSource: "doctorpricer",
    tags: ["gp"],
    fit: "General practice.",
    firstStep: "Call the practice."
  });
  const providers = [thinNorthlandProvider, ...strongAucklandProviders];
  const before = JSON.stringify(providers);

  const report = buildRegionalDataQualityReport({
    generatedAt: "2026-05-26T00:00:00.000Z",
    providers,
    sourceFitAudit: {
      findings: [
        {
          providerId: "northland-gp",
          providerName: "Northland GP",
          region: "Northland",
          rule: "weak-gp-source",
          severity: "high",
          issue: "Weak GP source."
        }
      ]
    },
    availabilityAudit: {
      findings: [
        {
          providerId: "northland-gp",
          providerName: "Northland GP",
          region: "Northland",
          rule: "blocked-or-unreachable-source",
          severity: "medium"
        }
      ]
    },
    referralAudit: { findings: [] },
    gpCorroborationQueue: {
      tasks: [
        {
          providerId: "northland-gp",
          name: "Northland GP",
          type: "gp",
          region: "Northland",
          priority: "medium"
        }
      ]
    },
    monitorQueue: { items: [] },
    watchlist: { items: [] }
  });

  const northland = report.regions.find((region) => region.region === "Northland");
  const auckland = report.regions.find((region) => region.region === "Auckland");

  assert.equal(JSON.stringify(providers), before, "regional report must not mutate provider input");
  assert.equal(report.safety.noLiveProviderMutation, true);
  assert.ok(northland.priorityScore > auckland.priorityScore);
  assert.equal(northland.priorityLevel, "high");
  assert.equal(northland.qualitySignals.sourceFit.highUnallowlisted, 1);
  assert.equal(northland.qualitySignals.gpCorroborationTasks, 1);
  assert.equal(northland.qualitySignals.missingCoords, 1);
  assert.ok(northland.coverage.missingSignals.includes("local counselling/psychology contact"));
  assert.ok(northland.recommendedActions.some((action) => /Corroborate 1 GP record/.test(action)));
  assert.ok(report.summary.topPriorities.some((item) => item.region === "Northland"));
});
