import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { applyReviewDecisions } from "../tools/apply-provider-review-decisions.mjs";
import { buildProviderEvidenceGraph } from "../tools/build-provider-evidence-graph.mjs";
import { buildProviderClaimReviewQueue } from "../tools/export-provider-claim-review-queue.mjs";
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
  assert.match(js, /provider-claim-review-queue\.json/);
  assert.match(js, /Claim field/);
  assert.match(js, /provider-monitor-queue\.json/);
  assert.match(html, /Same practice \/ related records/);
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
  assert.ok(queue.batches.some((batch) => batch.claimField === "tags" && batch.count >= 2));
  assert.ok(queue.summary.batches < queue.items.length, "batch count should compress repeated claim items");
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
