import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { applyReviewDecisions } from "../tools/apply-provider-review-decisions.mjs";
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
});
