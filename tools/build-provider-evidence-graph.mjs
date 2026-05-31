import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import {
  confidenceByField,
  confidenceFromTrust,
  normaliseComparable,
  riskLevelForField,
  scoreEvidence,
  sourceDomain,
  sourceOwnerTypeFromQuality,
  sourceTypeFromUrl,
  unique
} from "./lib/provider-evidence-scorer.mjs";

const DEFAULTS = {
  providers: "providers.json",
  sourceFitAudit: "data/provider-source-fit-audit.json",
  availabilityAudit: "data/provider-availability-audit.json",
  referralAudit: "data/provider-psychiatrist-referral-audit.json",
  reviewQueue: "data/provider-review-queue.json",
  graphOut: "data/provider-evidence-graph.json",
  claimsOut: "data/provider-claims.json",
  reportOut: "PROVIDER_EVIDENCE_GRAPH.md"
};

const LOW_RISK_FIELDS = new Set([
  "name",
  "clinicianName",
  "practiceName",
  "website",
  "phone",
  "address",
  "city",
  "region",
  "lat",
  "lon"
]);

const STRONG_SOURCE_TYPES = new Set([
  "provider_owned",
  "clinic_owned",
  "healthpoint",
  "official_register",
  "ngo_directory"
]);

const FIELD_RULE_HINTS = {
  address: ["missing-address"],
  lat: ["missing-coordinates", "coordinates-outside-nz"],
  lon: ["missing-coordinates", "coordinates-outside-nz"],
  sourceQuality: ["weak-gp-source", "register-only-public-contact"],
  website: ["weak-gp-source", "register-only-public-contact", "broken-website"],
  phone: ["weak-gp-source", "directory-treated-direct", "conflict-phone"],
  email: ["directory-treated-direct"],
  text: ["directory-treated-direct"],
  bookingUrl: ["directory-treated-direct"],
  type: ["directory-treated-direct", "direct-provider-directory-tag-review", "conflict-type"],
  tags: [
    "broad-tag-without-source-support",
    "weak-maori-evidence",
    "weak-pasifika-evidence",
    "weak-asian-evidence",
    "weak-rainbow-evidence",
    "weak-telehealth-evidence",
    "direct-provider-directory-tag-review"
  ],
  needScope: ["broad-tag-without-source-support"],
  specialties: ["broad-tag-without-source-support", "advertised-specialty-without-source-support"],
  advertisedSpecialties: ["advertised-specialty-without-source-support"],
  patientGroups: ["weak-maori-evidence", "weak-pasifika-evidence", "weak-asian-evidence", "weak-rainbow-evidence"],
  onlineAvailable: ["weak-telehealth-evidence"],
  phoneSupport: ["weak-telehealth-evidence"],
  availabilityStatus: ["availability-watchlist", "stale-availability", "accepting-without-explicit-evidence"],
  availabilityEvidence: ["availability-watchlist", "stale-availability", "accepting-without-explicit-evidence"],
  referralType: ["unknown-without-review", "missing-referral-metadata"],
  requiresReferral: ["unknown-without-review", "missing-referral-metadata"],
  referralSourceExcerpt: ["unknown-without-review", "missing-referral-metadata"],
  cost: ["weak-cost-evidence"],
  fit: ["broad-tag-without-source-support"],
  firstStep: ["directory-treated-direct"]
};

const TAG_RULE_VALUES = {
  "weak-maori-evidence": new Set(["maori", "kaupapa-maori", "whanau"]),
  "weak-pasifika-evidence": new Set(["pasifika", "pacific"]),
  "weak-asian-evidence": new Set(["asian"]),
  "weak-rainbow-evidence": new Set(["rainbow", "lgbt", "lgbtq", "lgbtqia", "takatapui"]),
  "weak-telehealth-evidence": new Set(["telehealth", "online"]),
  "direct-provider-directory-tag-review": new Set(["directory", "direct-contact"]),
  "directory-treated-direct": new Set(["directory", "direct-contact"])
};

const BROAD_NEED_TAGS = new Set(["depression", "anxiety", "trauma", "addiction", "work"]);

function parseArgs(argv = process.argv.slice(2)) {
  const config = { ...DEFAULTS };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--providers") config.providers = argv[++index];
    else if (arg === "--source-fit-audit") config.sourceFitAudit = argv[++index];
    else if (arg === "--availability-audit") config.availabilityAudit = argv[++index];
    else if (arg === "--referral-audit") config.referralAudit = argv[++index];
    else if (arg === "--review-queue") config.reviewQueue = argv[++index];
    else if (arg === "--graph-out") config.graphOut = argv[++index];
    else if (arg === "--claims-out") config.claimsOut = argv[++index];
    else if (arg === "--report-out") config.reportOut = argv[++index];
  }
  return config;
}

function readJsonIfExists(filePath, fallback) {
  if (!filePath || !fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value, pretty = true) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${pretty ? JSON.stringify(value, null, 2) : JSON.stringify(value)}\n`);
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function compact(value, max = 520) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function monthAge(value, now = new Date()) {
  if (!/^\d{4}-\d{2}/.test(value || "")) return Infinity;
  const [year, month] = String(value).slice(0, 7).split("-").map(Number);
  return (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month);
}

function claimId(parts) {
  return crypto.createHash("sha256").update(parts.map((part) => String(part ?? "")).join("|")).digest("hex").slice(0, 24);
}

function auditFindingMap(sourceFit, availability, referrals, reviewQueue) {
  const map = new Map();
  const add = (finding, source) => {
    const providerId = finding.providerId || finding.id;
    if (!providerId) return;
    const next = map.get(providerId) || [];
    next.push({
      source,
      rule: finding.rule || "unknown",
      severity: finding.severity || "low",
      issue: finding.issue || finding.message || "",
      suggestedFix: finding.suggestedFix || finding.suggestedAction || "",
      sourceUrl: finding.source || finding.sourceUrl || "",
      allowlisted: Boolean(finding.allowlisted)
    });
    map.set(providerId, next);
  };

  for (const finding of asArray(sourceFit.findings)) add(finding, "source-fit");
  for (const finding of asArray(availability.findings)) add(finding, "availability");
  for (const finding of asArray(referrals.findings)) add(finding, "referral");
  for (const item of asArray(reviewQueue.items)) {
    const providerId = item.providerId;
    if (!providerId) continue;
    const next = map.get(providerId) || [];
    for (const rule of asArray(item.auditRules)) {
      next.push({
        source: "review-queue",
        rule,
        severity: item.auditSeverity || "low",
        issue: asArray(item.reviewReasons).join("; "),
        suggestedFix: asArray(item.suggestedFixes).join("; "),
        sourceUrl: item.source || item.website || "",
        allowlisted: false
      });
    }
    map.set(providerId, next);
  }
  return map;
}

function normaliseTag(value) {
  return normaliseComparable(value).replace(/\s+/g, "-");
}

function broadTagFromFinding(finding) {
  const match = String(finding.issue || "").match(/Broad tag "([^"]+)"/i);
  return match ? normaliseTag(match[1]) : "";
}

function tagRuleAppliesToValue(finding, value) {
  const rule = finding.rule || "";
  const tag = normaliseTag(value);
  if (!tag) return false;
  if (rule === "broad-tag-without-source-support") {
    const namedTag = broadTagFromFinding(finding);
    return namedTag ? tag === namedTag : BROAD_NEED_TAGS.has(tag);
  }
  const allowedValues = TAG_RULE_VALUES[rule];
  return allowedValues ? allowedValues.has(tag) : true;
}

function patientGroupRuleAppliesToValue(finding, value) {
  const rule = finding.rule || "";
  const text = normaliseComparable(value);
  if (rule === "weak-maori-evidence") return /\b(maori|kaupapa|whanau|iwi)\b/.test(text);
  if (rule === "weak-pasifika-evidence") return /\b(pasifika|pacific|samoan|tongan|cook islands)\b/.test(text);
  if (rule === "weak-asian-evidence") return /\b(asian|chinese|korean|indian|mandarin|cantonese|vietnamese|japanese|filipino|thai)\b/.test(text);
  if (rule === "weak-rainbow-evidence") return /\b(rainbow|lgbt|lgbtq|lgbtqia|takatapui|gender diverse|transgender)\b/.test(text);
  return true;
}

function ruleAppliesToClaimValue(field, value, finding) {
  if (field === "tags") return tagRuleAppliesToValue(finding, value);
  if (field === "patientGroups") return patientGroupRuleAppliesToValue(finding, value);
  return true;
}

function rulesForField(field, value, findings) {
  const hints = FIELD_RULE_HINTS[field] || [];
  if (!hints.length) return [];
  return findings.filter((finding) =>
    hints.some((hint) => finding.rule?.includes(hint))
    && ruleAppliesToClaimValue(field, value, finding)
  );
}

function sourceForField(provider, field) {
  if (/^availability/.test(field)) return provider.availabilitySource || provider.source || provider.website || "";
  if (/^referral|requiresReferral/.test(field)) return provider.referralSourceUrl || provider.source || provider.website || "";
  if (field === "website") return provider.website || provider.source || "";
  if (field === "bookingUrl") return provider.bookingUrl || provider.source || provider.website || "";
  return provider.source || provider.website || "";
}

function excerptForField(provider, field, value) {
  if (field === "availabilityStatus" || field === "availabilityEvidence") return provider.availabilityEvidence || "";
  if (field === "referralType" || field === "requiresReferral" || field === "referralSourceExcerpt") return provider.referralSourceExcerpt || "";
  if (field === "providerGender") return provider.providerGenderEvidence || "";
  if (field === "advertisedSpecialties") {
    return asArray(provider.advertisedSpecialtyEvidence).map((item) => item.excerpt || item).filter(Boolean).join("; ");
  }
  if (field === "specialties") return asArray(provider.specialtyEvidence).join("; ");
  if (field === "tags") {
    const evidence = provider.sourceEvidence?.tags?.[value] || [];
    return asArray(evidence).map((item) => item.excerpt || "").filter(Boolean).join("; ");
  }
  return "";
}

function fieldValues(provider) {
  const entries = [];
  const scalarFields = [
    "name",
    "clinicianName",
    "practiceName",
    "type",
    "region",
    "city",
    "address",
    "lat",
    "lon",
    "phone",
    "text",
    "email",
    "website",
    "bookingUrl",
    "sourceQuality",
    "confidence",
    "availabilityStatus",
    "availabilityEvidence",
    "availabilityCheckedAt",
    "requiresReferral",
    "referralType",
    "referralSourceExcerpt",
    "onlineAvailable",
    "phoneSupport",
    "inPerson",
    "crisisOnly",
    "providerGender",
    "cost",
    "fit",
    "firstStep"
  ];
  for (const field of scalarFields) {
    if (provider[field] !== undefined && provider[field] !== null && provider[field] !== "") {
      entries.push({ field, value: provider[field] });
    }
  }
  for (const field of ["tags", "needScope", "specialties", "advertisedSpecialties", "patientGroups", "ageGroups", "services"]) {
    for (const value of asArray(provider[field])) entries.push({ field, value });
  }
  return entries;
}

function sourceFreshnessScore(provider, field) {
  const date = /^availability/.test(field)
    ? provider.availabilityCheckedAt
    : /^referral|requiresReferral/.test(field)
      ? provider.referralLastChecked
      : provider.lastVerified || provider.verified;
  const age = monthAge(date);
  if (age <= 1) return 0.08;
  if (age <= 3) return 0.04;
  if (age <= 6) return 0;
  if (age <= 12) return -0.08;
  return -0.16;
}

function claimScore({ provider, field, sourceType, sourceOwnerType, excerpt, sourceUrl, riskLevel, fieldFindings }) {
  const base = scoreEvidence({
    field,
    sourceType,
    sourceUrl,
    excerpt,
    needsManualReview: provider.needsManualVerification
  });
  const ownerBoost = ["provider_owned", "clinic_owned", "healthpoint", "official", "official_register"].includes(sourceOwnerType) ? 0.08 : 0;
  const providerConfidenceBoost = provider.confidence === "high" ? 0.07 : provider.confidence === "medium" ? 0.02 : -0.06;
  const manualPenalty = provider.needsManualVerification ? -0.08 : 0;
  const riskPenalty = riskLevel === "high" ? -0.12 : riskLevel === "medium" ? -0.04 : 0;
  const findingPenalty = fieldFindings.some((finding) => !finding.allowlisted) ? -0.18 : 0;
  const noSourcePenalty = sourceUrl ? 0 : -0.2;
  const score = Math.max(0, Math.min(1, base + ownerBoost + providerConfidenceBoost + manualPenalty + riskPenalty + findingPenalty + noSourcePenalty + sourceFreshnessScore(provider, field)));
  return Number(score.toFixed(2));
}

function decisionForClaim({ provider, field, value, sourceType, sourceOwnerType, score, riskLevel, excerpt, fieldFindings }) {
  const rules = fieldFindings.map((finding) => finding.rule);
  if (field === "availabilityStatus" && ["not_accepting", "referrals_paused"].includes(value)) {
    return {
      decision: "watchlist",
      reason: "restrictive availability belongs in monitor/watchlist review, not normal first recommendations",
      requiredHumanAction: "Confirm current availability before restoring or promoting this provider."
    };
  }
  if (sourceType === "search_result" || sourceType === "linkedIn_public") {
    return {
      decision: riskLevel === "high" ? "reject" : "review",
      reason: "discovery-only source cannot publish provider claims by itself",
      requiredHumanAction: "Find a provider-owned, official, or professional-directory source."
    };
  }
  if (rules.length) {
    return {
      decision: "review",
      reason: `field is linked to audit rule(s): ${rules.join(", ")}`,
      requiredHumanAction: "Open the source and resolve the audit finding or leave the field unknown."
    };
  }
  if (field === "availabilityStatus" && value === "accepting" && !excerpt) {
    return {
      decision: "review",
      reason: "accepting availability needs explicit current wording",
      requiredHumanAction: "Add a short source excerpt that explicitly says accepting/taking new clients."
    };
  }
  if (field === "referralType" && value === "self" && !excerpt) {
    return {
      decision: "review",
      reason: "psychiatry self-referral needs explicit source wording",
      requiredHumanAction: "Add self-referral evidence or keep referral status unknown/GP-first."
    };
  }
  if (riskLevel === "high") {
    return {
      decision: "review",
      reason: "high-risk claim affects safety, suitability, availability, referral, or sensitive matching",
      requiredHumanAction: "Human review required before this claim changes public recommendations."
    };
  }
  if (riskLevel === "medium" && (!excerpt || score < 0.8)) {
    return {
      decision: "review",
      reason: "medium-risk claim needs stronger evidence before batching",
      requiredHumanAction: "Confirm source wording or downgrade/leave unknown."
    };
  }
  if (LOW_RISK_FIELDS.has(field)
    && STRONG_SOURCE_TYPES.has(sourceType)
    && ["provider_owned", "clinic_owned", "healthpoint", "official", "official_register"].includes(sourceOwnerType)
    && score >= 0.72) {
    return {
      decision: "auto_accept",
      reason: "low-risk public contact/identity/location claim from a strong source with no field-specific audit conflict",
      requiredHumanAction: ""
    };
  }
  return {
    decision: "review",
    reason: "claim is usable but not strong enough for automatic resolution",
    requiredHumanAction: "Quick human check or corroborating source."
  };
}

function claimFromField(provider, entry, findings) {
  const sourceUrl = sourceForField(provider, entry.field);
  const sourceType = sourceTypeFromUrl(sourceUrl);
  const sourceOwnerType = sourceOwnerTypeFromQuality(provider.sourceQuality, sourceUrl);
  const riskLevel = riskLevelForField(entry.field);
  const fieldFindings = rulesForField(entry.field, entry.value, findings);
  const excerpt = compact(excerptForField(provider, entry.field, entry.value));
  const score = claimScore({
    provider,
    field: entry.field,
    sourceType,
    sourceOwnerType,
    excerpt,
    sourceUrl,
    riskLevel,
    fieldFindings
  });
  const confidence = confidenceFromTrust(score);
  const decision = decisionForClaim({
    provider,
    field: entry.field,
    value: entry.value,
    sourceType,
    sourceOwnerType,
    score,
    riskLevel,
    excerpt,
    fieldFindings
  });
  return {
    claimId: claimId([provider.id, entry.field, entry.value, sourceUrl]),
    providerId: provider.id,
    providerName: provider.name || "",
    field: entry.field,
    value: entry.value,
    sourceUrl,
    sourceType,
    sourceOwnerType,
    excerpt,
    capturedAt: "",
    sourceLastChecked: /^availability/.test(entry.field) ? provider.availabilityCheckedAt || "" : provider.lastVerified || provider.verified || "",
    confidence,
    score,
    riskLevel,
    extractionMethod: excerpt ? "stored-source-excerpt" : "stored-provider-field",
    corroboratingSources: [],
    conflictingSources: [],
    decision: decision.decision,
    reason: decision.reason,
    requiredHumanAction: decision.requiredHumanAction,
    auditRules: unique(fieldFindings.map((finding) => finding.rule)),
    auditIssues: unique(fieldFindings.map((finding) => finding.issue)),
    needsManualReview: decision.decision !== "auto_accept"
  };
}

function providerNode(provider, findings) {
  const claims = fieldValues(provider).map((entry) => claimFromField(provider, entry, findings));
  return {
    providerId: provider.id,
    name: provider.name || "",
    clinicianName: provider.clinicianName || "",
    practiceName: provider.practiceName || "",
    type: provider.type || "",
    region: provider.region || "",
    city: provider.city || "",
    sourceUrls: unique(claims.map((claim) => claim.sourceUrl)),
    sourceTypes: unique(claims.map((claim) => claim.sourceType)),
    sourceHosts: unique(claims.map((claim) => sourceDomain(claim.sourceUrl))),
    identityKey: [
      normaliseComparable(provider.clinicianName || provider.name),
      sourceDomain(provider.website || provider.source || ""),
      normaliseComparable(provider.phone || provider.email || provider.address)
    ].filter(Boolean).join("|"),
    claims,
    confidenceByField: confidenceByField(claims),
    conflicts: claims
      .filter((claim) => claim.conflictingSources?.length)
      .map((claim) => ({ field: claim.field, claimId: claim.claimId })),
    auditRules: unique(findings.map((finding) => finding.rule)),
    reviewCategory: reviewCategoryForProvider(provider, claims, findings),
    autoAcceptedClaims: claims.filter((claim) => claim.decision === "auto_accept").length,
    reviewClaims: claims.filter((claim) => claim.decision === "review").length,
    watchlistClaims: claims.filter((claim) => claim.decision === "watchlist").length,
    rejectClaims: claims.filter((claim) => claim.decision === "reject").length
  };
}

function reviewCategoryForProvider(provider, claims, findings) {
  const rules = findings.map((finding) => finding.rule).join(" ");
  if (/directory-treated-direct/.test(rules)) return "directory/direct-contact confusion";
  if (/availability-watchlist|stale-availability|accepting-without/.test(rules) || claims.some((claim) => claim.decision === "watchlist")) return "availability watchlist";
  if (provider.type === "psychiatrist" && (provider.referralNeedsManualReview || provider.referralType === "unknown")) return "referral pathway review";
  if (/broad-tag|weak-(maori|pasifika|asian|rainbow)|weak-telehealth/.test(rules)) return "sensitive/scope evidence";
  if (/missing-address|missing-coordinates/.test(rules)) return "location or distance evidence";
  if (/weak-gp-source/.test(rules)) return "GP source corroboration";
  if (provider.needsManualVerification) return "needs quick human check";
  return "ready to auto-apply low-risk claims";
}

function countBy(items, getter) {
  return items.reduce((counts, item) => {
    const key = getter(item) || "unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function writeReport(filePath, graph) {
  const lines = [
    "# Provider Evidence Graph",
    "",
    `Generated: ${graph.generatedAt}`,
    "",
    "This graph splits provider rows into field-level claims. It is advisory and does not change public provider data.",
    "",
    "## Summary",
    "",
    `- Providers: ${graph.summary.providers}`,
    `- Claims: ${graph.summary.claims}`,
    `- Auto-accepted low-risk claims: ${graph.summary.byDecision.auto_accept || 0}`,
    `- Claims needing review: ${graph.summary.byDecision.review || 0}`,
    `- Watchlist claims: ${graph.summary.byDecision.watchlist || 0}`,
    `- Reject/discovery-only claims: ${graph.summary.byDecision.reject || 0}`,
    "",
    "## Review Categories",
    "",
    "| Category | Providers |",
    "| --- | --- |"
  ];
  for (const [category, count] of Object.entries(graph.summary.byReviewCategory).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${category} | ${count} |`);
  }
  lines.push(
    "",
    "## Safety",
    "",
    "- Auto-accept is limited to low-risk public contact, identity, or location claims from strong sources.",
    "- Availability, referral, provider type, clinical scope, support tags, telehealth, cost, and sensitive suitability claims stay review-gated.",
    "- Existing source excerpts are reused only where already stored; missing excerpts remain manual review work."
  );
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

export function buildProviderEvidenceGraph(config = {}) {
  const merged = { ...DEFAULTS, ...config };
  const providers = readJsonIfExists(merged.providers, []);
  const sourceFit = readJsonIfExists(merged.sourceFitAudit, { findings: [] });
  const availability = readJsonIfExists(merged.availabilityAudit, { findings: [] });
  const referrals = readJsonIfExists(merged.referralAudit, { findings: [] });
  const reviewQueue = readJsonIfExists(merged.reviewQueue, { items: [] });
  const auditMap = auditFindingMap(sourceFit, availability, referrals, reviewQueue);
  const nodes = providers.map((provider) => providerNode(provider, auditMap.get(provider.id) || []));
  const claims = nodes.flatMap((node) => node.claims);
  const generatedAt = new Date().toISOString();
  return {
    version: 1,
    generatedAt,
    safety: {
      advisoryOnly: true,
      noLiveProviderMutation: true,
      noAcceptingFromSilence: true,
      noPsychiatrySelfReferralFromSilence: true,
      highRiskClaimsReviewGated: true,
      tierThreeSourcesNeverPublishAlone: true
    },
    inputs: {
      providers: providers.length,
      sourceFitFindings: asArray(sourceFit.findings).length,
      availabilityFindings: asArray(availability.findings).length,
      referralFindings: asArray(referrals.findings).length,
      reviewQueueItems: asArray(reviewQueue.items).length
    },
    summary: {
      providers: nodes.length,
      claims: claims.length,
      byDecision: countBy(claims, (claim) => claim.decision),
      byRisk: countBy(claims, (claim) => claim.riskLevel),
      byConfidence: countBy(claims, (claim) => claim.confidence),
      byField: countBy(claims, (claim) => claim.field),
      bySourceType: countBy(claims, (claim) => claim.sourceType),
      byReviewCategory: countBy(nodes, (node) => node.reviewCategory)
    },
    nodes,
    claims
  };
}

export function writeProviderEvidenceGraph(graph, config = {}) {
  const merged = { ...DEFAULTS, ...config };
  writeJson(merged.graphOut, {
    version: graph.version,
    generatedAt: graph.generatedAt,
    safety: graph.safety,
    inputs: graph.inputs,
    summary: graph.summary,
    claimsPath: merged.claimsOut,
    nodes: graph.nodes.map((node) => ({
      ...node,
      claims: undefined,
      claimIds: node.claims.map((claim) => claim.claimId)
    }))
  });
  writeJson(merged.claimsOut, {
    version: graph.version,
    generatedAt: graph.generatedAt,
    safety: graph.safety,
    inputs: graph.inputs,
    summary: graph.summary,
    claims: graph.claims
  }, false);
  writeReport(merged.reportOut, graph);
}

export function runCli(argv = process.argv.slice(2)) {
  const config = parseArgs(argv);
  const graph = buildProviderEvidenceGraph(config);
  writeProviderEvidenceGraph(graph, config);
  console.log(`Built provider evidence graph: ${graph.summary.providers} providers, ${graph.summary.claims} claims.`);
  console.log(`Auto-accepted low-risk claims: ${graph.summary.byDecision.auto_accept || 0}. Review-gated claims: ${graph.summary.byDecision.review || 0}.`);
  console.log(`Graph: ${path.resolve(config.graphOut)}`);
  console.log(`Claims: ${path.resolve(config.claimsOut)}`);
  return graph;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
