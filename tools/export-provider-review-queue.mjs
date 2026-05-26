import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const DEFAULTS = {
  providers: "providers.json",
  sourceFitAudit: "data/provider-source-fit-audit.json",
  availabilityAudit: "data/provider-availability-audit.json",
  referralAudit: "data/provider-psychiatrist-referral-audit.json",
  identityScan: "data/reports/provider-identity-scan-2026-05-25.json",
  watchlist: "data/monitors/provider-availability-watchlist.json",
  linkResults: "data/reports/link-check-results.json",
  discoveryQueue: "data/discovery/provider-search-queue.json",
  jsonOut: "data/provider-review-queue.json",
  csvOut: "data/provider-review-queue.csv",
  mdOut: "PROVIDER_REVIEW_QUEUE.md"
};

const REVIEW_DECISIONS = ["", "approve", "adjust", "reject", "move_to_watchlist", "duplicate", "needs_more_info"];
const SEVERITY_RANK = { high: 0, medium: 1, low: 2, none: 3 };
const PRIORITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };
const RISKY_AVAILABILITY = new Set(["accepting", "waitlist", "not_accepting", "referrals_paused"]);
const FIRST_RECOMMENDATION_TYPES = new Set(["gp", "counsellor", "psychologist", "psychiatrist", "mens-centre", "youth", "addiction", "public-service"]);
const DIRECT_TYPES = new Set(["gp", "counsellor", "psychologist", "psychiatrist", "mens-centre", "youth", "addiction", "public-service"]);
const BROAD_NEED_TAGS = new Set(["depression", "anxiety", "trauma", "addiction", "work", "stress", "relationships", "grief"]);
const SUPPORT_TAGS = new Set(["maori", "pasifika", "asian", "rainbow"]);
const TELEHEALTH_TAGS = new Set(["telehealth", "online"]);

function parseArgs(argv = process.argv.slice(2)) {
  const config = { ...DEFAULTS, includeAll: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--include-all") config.includeAll = true;
    else if (arg === "--region") config.region = argv[++index];
    else if (arg === "--type") config.type = argv[++index];
    else if (arg === "--severity") config.severity = argv[++index];
    else if (arg === "--limit") config.limit = Number(argv[++index]);
    else if (arg === "--json-out") config.jsonOut = argv[++index];
    else if (arg === "--csv-out") config.csvOut = argv[++index];
    else if (arg === "--md-out") config.mdOut = argv[++index];
    else if (arg === "--providers") config.providers = argv[++index];
  }
  return config;
}

function readJsonIfExists(filePath, fallback) {
  if (!filePath || !fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function isStale(inputPath, outputPath) {
  if (!fs.existsSync(outputPath)) return true;
  if (!fs.existsSync(inputPath)) return false;
  return fs.statSync(outputPath).mtimeMs < fs.statSync(inputPath).mtimeMs;
}

function runAuditIfStale(label, args, outputPath, providersPath) {
  if (!isStale(providersPath, outputPath)) return { label, skipped: true, ok: true };
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    encoding: "utf8"
  });
  return {
    label,
    command: `node ${args.join(" ")}`,
    ok: result.status === 0 || fs.existsSync(outputPath),
    status: result.status,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim()
  };
}

function maybeRunAudits(config) {
  return [
    runAuditIfStale("source-fit audit", [
      "tools/audit-provider-source-fit.mjs",
      config.providers,
      "--json-out",
      config.sourceFitAudit,
      "--md-out",
      "PROVIDER_SOURCE_FIT_AUDIT.md"
    ], config.sourceFitAudit, config.providers),
    runAuditIfStale("availability audit", [
      "tools/audit-provider-availability.mjs",
      config.providers,
      "--json-out",
      config.availabilityAudit,
      "--md-out",
      "AVAILABILITY_RECHECK_REPORT.md"
    ], config.availabilityAudit, config.providers),
    runAuditIfStale("psychiatrist referral audit", [
      "tools/audit-psychiatrist-referrals.mjs",
      config.providers,
      "--json-out",
      config.referralAudit,
      "--md-out",
      "PSYCHIATRIST_REFERRAL_AUDIT.md"
    ], config.referralAudit, config.providers)
  ];
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function compact(value, max = 320) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function highestSeverity(findings) {
  if (findings.some((finding) => finding.severity === "high")) return "high";
  if (findings.some((finding) => finding.severity === "medium")) return "medium";
  if (findings.some((finding) => finding.severity === "low")) return "low";
  return "none";
}

function directProvider(provider) {
  return DIRECT_TYPES.has(provider.type) && provider.type !== "directory" && !provider.tags?.includes("directory");
}

function hasPublicContact(provider) {
  return Boolean(provider.phone || provider.text || provider.email || provider.website || provider.bookingUrl);
}

function likelyFirstRecommendation(provider) {
  if (!FIRST_RECOMMENDATION_TYPES.has(provider.type)) return false;
  if (provider.crisisOnly || provider.tags?.includes("crisis")) return false;
  if (provider.type === "directory" || provider.tags?.includes("directory")) return false;
  if (["not_accepting", "referrals_paused"].includes(provider.availabilityStatus)) return false;
  return hasPublicContact(provider);
}

function monthAge(value, now = new Date()) {
  if (!/^\d{4}-\d{2}/.test(value || "")) return Infinity;
  const [year, month] = String(value).split("-").map(Number);
  return (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month);
}

function addAudit(map, finding, sourceName) {
  const providerId = finding.providerId || finding.id || "";
  if (!providerId) return;
  const bucket = map.get(providerId) || [];
  bucket.push({
    source: sourceName,
    severity: finding.severity || "low",
    rule: finding.rule || "unknown",
    issue: finding.issue || finding.message || "",
    suggestedFix: finding.suggestedFix || finding.suggestedAction || "",
    sourceUrl: finding.source || finding.sourceUrl || "",
    allowlisted: Boolean(finding.allowlisted),
    raw: finding
  });
  map.set(providerId, bucket);
}

function buildAuditMap({ sourceFit, availability, referrals, addressFindings, linkFindings }) {
  const map = new Map();
  for (const finding of asArray(sourceFit.findings)) addAudit(map, finding, "source-fit");
  for (const finding of asArray(availability.findings)) addAudit(map, finding, "availability");
  for (const finding of asArray(referrals.findings)) addAudit(map, finding, "referral");
  for (const finding of addressFindings) addAudit(map, finding, "address");
  for (const finding of linkFindings) addAudit(map, finding, "links");
  return map;
}

function addressFindings(providers) {
  const findings = [];
  for (const provider of providers) {
    if (!DIRECT_TYPES.has(provider.type)) continue;
    const remote = provider.onlineAvailable === true
      || provider.phoneSupport === true
      || provider.region === "National"
      || provider.tags?.some((tag) => TELEHEALTH_TAGS.has(tag));
    if (!provider.address && !remote && provider.type !== "helpline") {
      findings.push({
        providerId: provider.id,
        providerName: provider.name,
        region: provider.region,
        city: provider.city,
        type: provider.type,
        source: provider.source || provider.website || "",
        rule: "missing-address",
        severity: provider.type === "gp" ? "low" : "medium",
        issue: "Distance-weighted direct provider is missing an address and is not clearly remote.",
        suggestedAction: "Verify an address or mark the provider as telehealth/phone-only with evidence."
      });
    }
    const hasLat = provider.lat !== undefined && provider.lat !== "";
    const hasLon = provider.lon !== undefined && provider.lon !== "";
    if (provider.address && (!hasLat || !hasLon) && !remote) {
      findings.push({
        providerId: provider.id,
        providerName: provider.name,
        region: provider.region,
        city: provider.city,
        type: provider.type,
        source: provider.source || provider.website || "",
        rule: "missing-coordinates",
        severity: provider.type === "gp" ? "low" : "medium",
        issue: "Provider has an address but missing latitude/longitude for distance weighting.",
        suggestedAction: "Geocode the address and mark coordinate confidence, or set manual review if uncertain."
      });
    }
    if (hasLat && hasLon) {
      const lat = Number(provider.lat);
      const lon = Number(provider.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -48 || lat > -33 || lon < 165 || lon > 180) {
        findings.push({
          providerId: provider.id,
          providerName: provider.name,
          region: provider.region,
          city: provider.city,
          type: provider.type,
          source: provider.source || provider.website || "",
          rule: "coordinates-outside-nz",
          severity: "high",
          issue: "Provider coordinates look outside New Zealand.",
          suggestedAction: "Correct coordinates or remove them before distance ranking."
        });
      }
    }
  }
  return findings;
}

function linkFindingsFromOptionalReport(report, providers) {
  const results = Array.isArray(report) ? report : asArray(report.results);
  if (!results.length) return [];
  const byUrl = new Map();
  for (const result of results) byUrl.set(result.url, result);
  const findings = [];
  for (const provider of providers) {
    for (const field of ["website", "source", "bookingUrl", "availabilitySource", "referralSourceUrl"]) {
      const url = provider[field];
      const result = byUrl.get(url);
      if (!result || result.ok || result.blocked) continue;
      findings.push({
        providerId: provider.id,
        providerName: provider.name,
        region: provider.region,
        city: provider.city,
        type: provider.type,
        source: url,
        rule: `broken-${field}`,
        severity: field === "website" || field === "bookingUrl" ? "high" : "medium",
        issue: `${field} did not pass the latest link check (${result.status || result.error || "unknown"}).`,
        suggestedAction: "Verify the public URL before relying on this record."
      });
    }
  }
  return findings;
}

function evidenceItem({ field, value, sourceUrl, excerpt, capturedAt, confidence, needsManualReview }) {
  return {
    field,
    value: value ?? "",
    sourceUrl: sourceUrl || "",
    excerpt: excerpt || "",
    capturedAt: capturedAt || "",
    confidence: confidence || "low",
    needsManualReview: needsManualReview !== false
  };
}

function sourceEvidence(provider, scan) {
  const capturedAt = scan?.generatedAt || "";
  const tags = asArray(provider.tags);
  const evidence = {
    contact: [],
    address: [],
    availability: [],
    referral: [],
    scope: [],
    tags: {},
    telehealth: [],
    cultural: [],
    cost: []
  };

  for (const field of ["phone", "text", "email", "website", "bookingUrl"]) {
    if (provider[field]) {
      evidence.contact.push(evidenceItem({
        field,
        value: provider[field],
        sourceUrl: provider.source || provider.website,
        confidence: provider.sourceQuality?.includes("provider-owned") ? "medium" : "low",
        needsManualReview: provider.needsManualVerification
      }));
    }
  }

  if (provider.address || provider.lat || provider.lon) {
    evidence.address.push(evidenceItem({
      field: "address",
      value: provider.address || `${provider.lat || ""}, ${provider.lon || ""}`,
      sourceUrl: provider.source || provider.website,
      confidence: provider.coordinateConfidence || "low",
      needsManualReview: provider.geocodeNeedsManualReview !== false
    }));
  }

  evidence.availability.push(evidenceItem({
    field: "availabilityStatus",
    value: provider.availabilityStatus || "",
    sourceUrl: provider.availabilitySource || provider.source || provider.website,
    excerpt: provider.availabilityEvidence || "",
    capturedAt: provider.availabilityCheckedAt || "",
    confidence: provider.availabilityEvidence ? "medium" : "low",
    needsManualReview: provider.availabilityNeedsManualReview !== false || !provider.availabilityEvidence
  }));

  if (provider.type === "psychiatrist" || provider.tags?.includes("psychiatry-service")) {
    evidence.referral.push(evidenceItem({
      field: "referralType",
      value: provider.referralType || "",
      sourceUrl: provider.referralSourceUrl || provider.source || provider.website,
      excerpt: provider.referralSourceExcerpt || "",
      capturedAt: provider.referralLastChecked || "",
      confidence: provider.referralConfidence || "low",
      needsManualReview: provider.referralNeedsManualReview !== false || !provider.referralSourceExcerpt
    }));
  }

  for (const field of ["fit", "firstStep", "services", "specialties", "patientGroups", "ageGroups"]) {
    const value = Array.isArray(provider[field]) ? provider[field].join(", ") : provider[field];
    if (value) {
      evidence.scope.push(evidenceItem({
        field,
        value,
        sourceUrl: provider.source || provider.website,
        confidence: provider.sourceQuality?.includes("provider-owned") ? "medium" : "low",
        needsManualReview: provider.needsManualVerification
      }));
    }
  }

  for (const tag of tags) {
    evidence.tags[tag] = [evidenceItem({
      field: "tags",
      value: tag,
      sourceUrl: provider.source || provider.website,
      confidence: "low",
      needsManualReview: provider.needsManualVerification || BROAD_NEED_TAGS.has(tag) || SUPPORT_TAGS.has(tag) || TELEHEALTH_TAGS.has(tag)
    })];
  }

  for (const tag of tags.filter((tag) => TELEHEALTH_TAGS.has(tag))) {
    evidence.telehealth.push(evidenceItem({
      field: "tags",
      value: tag,
      sourceUrl: provider.source || provider.website,
      confidence: "low",
      needsManualReview: true
    }));
  }
  for (const tag of tags.filter((tag) => SUPPORT_TAGS.has(tag))) {
    evidence.cultural.push(evidenceItem({
      field: "tags",
      value: tag,
      sourceUrl: provider.source || provider.website,
      confidence: "low",
      needsManualReview: true
    }));
  }
  if (provider.cost) {
    evidence.cost.push(evidenceItem({
      field: "cost",
      value: provider.cost,
      sourceUrl: provider.source || provider.website,
      confidence: provider.costSource ? "medium" : "low",
      needsManualReview: true
    }));
  }

  const serviceSignals = scan?.serviceSignals || {};
  const supportSignals = scan?.supportSignals || {};
  for (const [key, signal] of Object.entries(serviceSignals)) {
    if (signal?.value !== "found") continue;
    evidence.scope.push(evidenceItem({
      field: key,
      value: signal.label || key,
      sourceUrl: signal.sourceUrl,
      excerpt: signal.evidence,
      capturedAt,
      confidence: "medium",
      needsManualReview: true
    }));
  }
  for (const [key, signal] of Object.entries(supportSignals)) {
    if (signal?.value !== "found") continue;
    const item = evidenceItem({
      field: key,
      value: signal.label || key,
      sourceUrl: signal.sourceUrl,
      excerpt: signal.evidence,
      capturedAt,
      confidence: "medium",
      needsManualReview: true
    });
    if (key === "telehealth") evidence.telehealth.push(item);
    else evidence.cultural.push(item);
  }
  if (scan?.costFundingSignal?.value === "found") {
    evidence.cost.push(evidenceItem({
      field: "cost",
      value: "source scan signal",
      sourceUrl: scan.costFundingSignal.sourceUrl,
      excerpt: scan.costFundingSignal.evidence,
      capturedAt,
      confidence: "medium",
      needsManualReview: true
    }));
  }

  return evidence;
}

function sourceEvidenceSummary(provider, findings, scan) {
  const pieces = [];
  if (provider.availabilityEvidence) pieces.push(`Availability: ${compact(provider.availabilityEvidence, 180)}`);
  if (provider.referralSourceExcerpt) pieces.push(`Referral: ${compact(provider.referralSourceExcerpt, 180)}`);
  if (scan?.autoClinicianName || scan?.autoPracticeName) {
    pieces.push(`Source scan: clinician "${scan.autoClinicianName || "(none)"}", practice "${scan.autoPracticeName || "(none)"}".`);
  }
  const evidenceSignals = [
    ...Object.values(scan?.serviceSignals || {}),
    ...Object.values(scan?.supportSignals || {}),
    scan?.costFundingSignal,
    scan?.availabilitySignal,
    scan?.bookingSignal
  ].filter((signal) => signal?.value === "found" && signal.evidence);
  for (const signal of evidenceSignals.slice(0, 3)) {
    pieces.push(`${signal.label || signal.status || "Signal"}: ${compact(signal.evidence, 180)}`);
  }
  for (const finding of findings.slice(0, 2)) {
    pieces.push(`${finding.source} audit: ${compact(finding.issue, 180)}`);
  }
  return pieces.join(" | ");
}

function publicCardPreviewText(provider) {
  const title = provider.clinicianName
    ? `${provider.clinicianName}${provider.practiceName ? `, ${provider.practiceName}` : ""}`
    : provider.name || "";
  return compact([
    title,
    provider.region || provider.city ? `${provider.region || ""}${provider.city ? ` / ${provider.city}` : ""}` : "",
    provider.fit,
    provider.firstStep,
    provider.cost,
    provider.availabilityStatus ? `Availability: ${provider.availabilityStatus}` : ""
  ].filter(Boolean).join("\n"), 1400);
}

function reviewReasons(provider, findings) {
  const reasons = [];
  for (const finding of findings) reasons.push(`${finding.severity}: ${finding.rule}`);
  if (provider.needsManualVerification) reasons.push("provider details need manual verification");
  if (provider.availabilityNeedsManualReview) reasons.push("availability needs manual review");
  if (provider.referralNeedsManualReview) reasons.push("referral pathway needs manual review");
  if (provider.confidence === "low") reasons.push("low confidence source");
  if (provider.type === "psychiatrist" && (!provider.referralType || provider.referralType === "unknown")) reasons.push("psychiatrist referral pathway unknown");
  if (RISKY_AVAILABILITY.has(provider.availabilityStatus)) reasons.push(`availability status is ${provider.availabilityStatus}`);
  if (directProvider(provider) && !hasPublicContact(provider)) reasons.push("direct provider missing public contact");
  if (provider.address && (provider.lat === undefined || provider.lon === undefined || provider.lat === "" || provider.lon === "")) reasons.push("address missing coordinates");
  if (monthAge(provider.lastVerified) > 6 || monthAge(provider.verified) > 6) reasons.push("verification date is stale or missing");
  return unique(reasons);
}

function reviewScore(provider, findings, reasons) {
  let score = 0;
  if (findings.some((finding) => finding.severity === "high" && !finding.allowlisted)) score += 10_000;
  if (findings.some((finding) => finding.severity === "high")) score += 6_000;
  if (findings.some((finding) => finding.severity === "medium")) score += 2_000;
  if (likelyFirstRecommendation(provider)) score += 950;
  if (provider.type === "psychiatrist" && (!provider.referralType || provider.referralType === "unknown" || provider.referralNeedsManualReview)) score += 900;
  if (RISKY_AVAILABILITY.has(provider.availabilityStatus)) score += 800;
  if (findings.some((finding) => /broad|overbroad|unsupported/.test(finding.rule))) score += 700;
  if (findings.some((finding) => /telehealth|online/.test(finding.rule))) score += 650;
  if (findings.some((finding) => /maori|pasifika|asian|rainbow|support-tag|cultural/.test(finding.rule))) score += 620;
  if (findings.some((finding) => /address|coordinate|geocode|region|local/.test(finding.rule))) score += 580;
  if (findings.some((finding) => /directory|direct|register/.test(finding.rule))) score += 560;
  if (directProvider(provider) && !hasPublicContact(provider)) score += 530;
  if (provider.confidence === "low") score += 500;
  if (monthAge(provider.lastVerified) > 6 || monthAge(provider.verified) > 6) score += 250;
  if (provider.type === "psychiatrist") score += 400;
  else if (provider.type === "psychologist") score += 350;
  else if (provider.type === "counsellor") score += 250;
  else if (provider.type === "gp") score -= 700;
  score += Math.min(reasons.length * 20, 200);
  return score;
}

function reviewPriorityFromScore(score, severity) {
  if (severity === "high" || score >= 8_000) return "critical";
  if (score >= 2_500) return "high";
  if (score >= 800) return "medium";
  return "low";
}

function shouldInclude(provider, findings, reasons, includeAll) {
  if (includeAll) return true;
  if (findings.length) return true;
  if (provider.type === "psychiatrist" && (!provider.referralType || provider.referralType === "unknown" || provider.referralNeedsManualReview)) return true;
  if (provider.type !== "gp" && provider.needsManualVerification) return true;
  if (provider.type !== "gp" && provider.availabilityNeedsManualReview) return true;
  if (provider.confidence === "low") return true;
  if (RISKY_AVAILABILITY.has(provider.availabilityStatus) && provider.type !== "gp") return true;
  if (directProvider(provider) && provider.type !== "gp" && !hasPublicContact(provider)) return true;
  return reasons.some((reason) => /coordinates|stale|missing/.test(reason)) && provider.type !== "gp";
}

function itemFromProvider(provider, findings, scan, includeAll) {
  const reasons = reviewReasons(provider, findings);
  if (!shouldInclude(provider, findings, reasons, includeAll)) return null;
  const auditSeverity = highestSeverity(findings);
  const score = reviewScore(provider, findings, reasons);
  const sourceUrls = unique([
    provider.website,
    provider.bookingUrl,
    provider.source,
    provider.availabilitySource,
    provider.referralSourceUrl,
    ...findings.map((finding) => finding.sourceUrl)
  ]);

  return {
    reviewId: `provider:${provider.id}`,
    providerId: provider.id || "",
    name: provider.name || "",
    clinicianName: provider.clinicianName || "",
    practiceName: provider.practiceName || "",
    type: provider.type || "",
    region: provider.region || "",
    city: provider.city || "",
    address: provider.address || "",
    lat: provider.lat ?? "",
    lon: provider.lon ?? "",
    phone: provider.phone || "",
    text: provider.text || "",
    email: provider.email || "",
    website: provider.website || "",
    bookingUrl: provider.bookingUrl || "",
    source: provider.source || "",
    sourceQuality: provider.sourceQuality || "",
    confidence: provider.confidence || "",
    needsManualVerification: provider.needsManualVerification,
    verified: provider.verified || "",
    lastVerified: provider.lastVerified || "",
    availabilityStatus: provider.availabilityStatus || "",
    availabilityCheckedAt: provider.availabilityCheckedAt || "",
    availabilityEvidence: provider.availabilityEvidence || "",
    availabilitySource: provider.availabilitySource || "",
    availabilityNeedsManualReview: provider.availabilityNeedsManualReview,
    requiresReferral: provider.requiresReferral,
    referralType: provider.referralType || "",
    referralSourceUrl: provider.referralSourceUrl || "",
    referralSourceExcerpt: provider.referralSourceExcerpt || "",
    referralConfidence: provider.referralConfidence || "",
    referralLastChecked: provider.referralLastChecked || "",
    referralNeedsManualReview: provider.referralNeedsManualReview,
    tags: asArray(provider.tags),
    needScope: asArray(provider.needScope),
    baselineScope: asArray(provider.baselineScope),
    baselineScopeSource: provider.baselineScopeSource || "",
    baselineScopeNote: provider.baselineScopeNote || "",
    advertisedSpecialties: asArray(provider.advertisedSpecialties),
    advertisedSpecialtyEvidence: asArray(provider.advertisedSpecialtyEvidence),
    specialtyTagsSource: provider.specialtyTagsSource || "",
    specialties: asArray(provider.specialties),
    services: asArray(provider.services),
    patientGroups: asArray(provider.patientGroups),
    ageGroups: asArray(provider.ageGroups),
    onlineAvailable: provider.onlineAvailable,
    phoneSupport: provider.phoneSupport,
    inPerson: provider.inPerson,
    crisisOnly: provider.crisisOnly,
    auditSeverity,
    auditRules: unique(findings.map((finding) => finding.rule)),
    auditIssues: findings.map((finding) => finding.issue).filter(Boolean),
    suggestedFixes: unique(findings.map((finding) => finding.suggestedFix)),
    reviewPriority: reviewPriorityFromScore(score, auditSeverity),
    priorityScore: score,
    reviewReasons: reasons,
    sourceUrls,
    sourceEvidence: sourceEvidence(provider, scan),
    sourceEvidenceSummary: sourceEvidenceSummary(provider, findings, scan),
    publicCardPreviewText: publicCardPreviewText(provider),
    currentProvider: provider,
    auditFindings: findings,
    identityScan: scan || null,
    reviewDecision: "",
    correctedFields: {},
    reviewer: "",
    reviewedDate: "",
    reviewNotes: ""
  };
}

function watchlistReviewItems(watchlist, providersById, includeAll) {
  const items = Array.isArray(watchlist) ? watchlist : asArray(watchlist.items);
  if (!includeAll && !items.length) return [];
  return items.map((item) => {
    const candidate = item.providerCandidate || {};
    const providerId = item.providerId || candidate.id || item.id || "";
    const liveProvider = providersById.get(providerId);
    if (liveProvider) return null;
    const providerLike = {
      id: providerId,
      name: item.name || candidate.name || providerId,
      clinicianName: candidate.clinicianName || "",
      practiceName: candidate.practiceName || "",
      type: item.type || candidate.type || "",
      region: item.region || candidate.region || "",
      city: item.city || candidate.city || "",
      address: candidate.address || "",
      lat: candidate.lat ?? "",
      lon: candidate.lon ?? "",
      phone: candidate.phone || "",
      text: candidate.text || "",
      email: candidate.email || "",
      website: item.url || candidate.website || "",
      bookingUrl: candidate.bookingUrl || "",
      source: item.url || candidate.source || "",
      sourceQuality: candidate.sourceQuality || "watchlist candidate",
      confidence: candidate.confidence || "low",
      needsManualVerification: true,
      verified: candidate.verified || "",
      lastVerified: candidate.lastVerified || "",
      availabilityStatus: item.lastKnownStatus || item.availabilityStatus || "not_accepting",
      availabilityCheckedAt: item.checkedAt || item.availabilityCheckedAt || "",
      availabilityEvidence: item.reason || item.availabilityEvidence || "",
      availabilitySource: item.url || item.availabilitySource || candidate.source || "",
      availabilityNeedsManualReview: true,
      tags: asArray(candidate.tags),
      needScope: asArray(candidate.needScope),
      fit: candidate.fit || "",
      firstStep: candidate.firstStep || ""
    };
    const findings = [{
      source: "watchlist",
      severity: "medium",
      rule: "availability-watchlist",
      issue: item.reason || "Provider candidate is on the availability watchlist.",
      suggestedFix: "Recheck availability before adding or restoring this provider.",
      sourceUrl: item.url || candidate.website || "",
      allowlisted: false
    }];
    const reviewItem = itemFromProvider(providerLike, findings, null, true);
    return {
      ...reviewItem,
      reviewId: `watchlist:${item.id || providerId}`,
      reviewReasons: unique([...reviewItem.reviewReasons, "availability watchlist candidate"]),
      watchlistItem: item
    };
  }).filter(Boolean);
}

function applyFilters(items, config) {
  let filtered = items;
  if (config.region) filtered = filtered.filter((item) => item.region === config.region);
  if (config.type) filtered = filtered.filter((item) => item.type === config.type);
  if (config.severity) filtered = filtered.filter((item) => item.auditSeverity === config.severity);
  filtered = filtered.sort((a, b) =>
    PRIORITY_RANK[a.reviewPriority] - PRIORITY_RANK[b.reviewPriority]
    || b.priorityScore - a.priorityScore
    || SEVERITY_RANK[a.auditSeverity] - SEVERITY_RANK[b.auditSeverity]
    || a.type.localeCompare(b.type)
    || a.region.localeCompare(b.region)
    || a.name.localeCompare(b.name)
  );
  if (Number.isFinite(config.limit) && config.limit > 0) filtered = filtered.slice(0, config.limit);
  return filtered;
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join("; ") : typeof value === "object" && value !== null ? JSON.stringify(value) : String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(filePath, items) {
  const headers = [
    "reviewId",
    "providerId",
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
    "source",
    "sourceQuality",
    "confidence",
    "needsManualVerification",
    "verified",
    "lastVerified",
    "availabilityStatus",
    "availabilityCheckedAt",
    "availabilityEvidence",
    "availabilitySource",
    "availabilityNeedsManualReview",
    "requiresReferral",
    "referralType",
    "referralSourceUrl",
    "referralSourceExcerpt",
    "referralConfidence",
    "referralLastChecked",
    "referralNeedsManualReview",
    "tags",
    "needScope",
    "baselineScope",
    "baselineScopeSource",
    "baselineScopeNote",
    "advertisedSpecialties",
    "advertisedSpecialtyEvidence",
    "specialtyTagsSource",
    "specialties",
    "services",
    "patientGroups",
    "ageGroups",
    "onlineAvailable",
    "phoneSupport",
    "inPerson",
    "crisisOnly",
    "auditSeverity",
    "auditRules",
    "auditIssues",
    "suggestedFixes",
    "reviewPriority",
    "priorityScore",
    "reviewReasons",
    "sourceUrls",
    "sourceEvidenceSummary",
    "publicCardPreviewText",
    "reviewDecision",
    "correctedFields",
    "reviewer",
    "reviewedDate",
    "reviewNotes"
  ];
  const lines = [
    headers.join(","),
    ...items.map((item) => headers.map((header) => csvEscape(item[header])).join(","))
  ];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function writeMarkdown(filePath, queue) {
  const lines = [
    "# Provider Review Queue",
    "",
    `Generated: ${queue.generatedAt}`,
    "",
    `Focused queue: ${queue.filters.includeAll ? "no, include-all was used" : "yes"}.`,
    "",
    "## Summary",
    "",
    `- Review items: ${queue.items.length}`,
    `- Critical: ${queue.summary.byPriority.critical || 0}`,
    `- High: ${queue.summary.byPriority.high || 0}`,
    `- Medium: ${queue.summary.byPriority.medium || 0}`,
    `- Low: ${queue.summary.byPriority.low || 0}`,
    "",
    "## Top Queue Items",
    "",
    "| Priority | Severity | Provider | Type | Region / City | Rules | Reasons |",
    "| --- | --- | --- | --- | --- | --- | --- |"
  ];
  for (const item of queue.items.slice(0, 80)) {
    lines.push([
      item.reviewPriority,
      item.auditSeverity,
      `${item.providerId} - ${item.name}`,
      item.type,
      `${item.region} / ${item.city}`,
      item.auditRules.join(", "),
      item.reviewReasons.join("; ")
    ].map((cell) => String(cell || "").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim()).join(" | ").replace(/^/, "| ").replace(/$/, " |"));
  }
  lines.push("", "Review decisions must be applied with `npm run apply:review`; the public app does not write provider data from the browser.", "");
  fs.writeFileSync(filePath, lines.join("\n"));
}

function countsBy(items, field) {
  return items.reduce((counts, item) => {
    const key = item[field] || "unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

export function buildProviderReviewQueue(config = {}) {
  const mergedConfig = { ...DEFAULTS, ...config };
  const auditRunResults = mergedConfig.skipAuditRun ? [] : maybeRunAudits(mergedConfig);
  const providers = readJsonIfExists(mergedConfig.providers, []);
  const providersById = new Map(providers.map((provider) => [provider.id, provider]));
  const sourceFit = readJsonIfExists(mergedConfig.sourceFitAudit, { findings: [] });
  const availability = readJsonIfExists(mergedConfig.availabilityAudit, { findings: [] });
  const referrals = readJsonIfExists(mergedConfig.referralAudit, { findings: [] });
  const watchlist = readJsonIfExists(mergedConfig.watchlist, { items: [] });
  const linkResults = readJsonIfExists(mergedConfig.linkResults, { results: [] });
  const discoveryQueue = readJsonIfExists(mergedConfig.discoveryQueue, null);
  const identityScan = readJsonIfExists(mergedConfig.identityScan, { records: [] });
  const scanByProviderId = new Map(asArray(identityScan.records).map((record) => [record.providerId, { ...record, generatedAt: identityScan.generatedAt }]));
  const auditMap = buildAuditMap({
    sourceFit,
    availability,
    referrals,
    addressFindings: addressFindings(providers),
    linkFindings: linkFindingsFromOptionalReport(linkResults, providers)
  });

  const providerItems = providers
    .map((provider) => itemFromProvider(provider, auditMap.get(provider.id) || [], scanByProviderId.get(provider.id), mergedConfig.includeAll))
    .filter(Boolean);
  const watchlistItems = watchlistReviewItems(watchlist, providersById, mergedConfig.includeAll);
  const items = applyFilters([...providerItems, ...watchlistItems], mergedConfig);
  const generatedAt = new Date().toISOString();
  return {
    version: 1,
    generatedAt,
    providersPath: mergedConfig.providers,
    filters: {
      includeAll: Boolean(mergedConfig.includeAll),
      region: mergedConfig.region || "",
      type: mergedConfig.type || "",
      severity: mergedConfig.severity || "",
      limit: mergedConfig.limit || ""
    },
    auditRunResults,
    inputs: {
      providers: providers.length,
      sourceFitFindings: asArray(sourceFit.findings).length,
      availabilityFindings: asArray(availability.findings).length,
      referralFindings: asArray(referrals.findings).length,
      watchlistItems: asArray(Array.isArray(watchlist) ? watchlist : watchlist.items).length,
      identityScanRecords: asArray(identityScan.records).length,
      discoveryCandidates: discoveryQueue?.candidates?.length || discoveryQueue?.queue?.length || 0
    },
    summary: {
      total: items.length,
      byPriority: countsBy(items, "reviewPriority"),
      bySeverity: countsBy(items, "auditSeverity"),
      byType: countsBy(items, "type"),
      byRegion: countsBy(items, "region")
    },
    allowedReviewDecisions: REVIEW_DECISIONS.filter(Boolean),
    items
  };
}

export function writeProviderReviewQueue(queue, config = {}) {
  const mergedConfig = { ...DEFAULTS, ...config };
  writeJson(mergedConfig.jsonOut, queue);
  writeCsv(mergedConfig.csvOut, queue.items);
  writeMarkdown(mergedConfig.mdOut, queue);
}

export function runCli(argv = process.argv.slice(2)) {
  const config = parseArgs(argv);
  const queue = buildProviderReviewQueue(config);
  writeProviderReviewQueue(queue, config);
  console.log(`Exported ${queue.items.length} provider review items.`);
  console.log(`JSON: ${path.resolve(config.jsonOut)}`);
  console.log(`CSV: ${path.resolve(config.csvOut)}`);
  console.log(`Markdown: ${path.resolve(config.mdOut)}`);
  return queue;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
