import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  availabilityCadenceDays,
  daysSince,
  isAvailabilityStale,
  providerAvailability,
  requiresAvailabilityMetadata,
  restrictiveStatuses
} from "./lib/provider-availability.mjs";

const DEFAULTS = {
  providers: "providers.json",
  watchlist: "data/monitors/provider-availability-watchlist.json",
  availabilityAudit: "data/provider-availability-audit.json",
  recheckResults: "data/provider-availability-recheck-results.json",
  jsonOut: "data/provider-monitor-queue.json",
  csvOut: "data/provider-monitor-queue.csv",
  mdOut: "PROVIDER_MONITOR_QUEUE.md",
  includeStaleVerification: false,
  verificationCadenceDays: 180
};

const HIGH_RISK_RULES = new Set([
  "availability-changed",
  "watchlist-possibly-available",
  "live-provider-now-restrictive",
  "accepting-without-explicit-evidence",
  "restrictive-evidence-status-mismatch"
]);

function parseArgs(argv = process.argv.slice(2)) {
  const config = { ...DEFAULTS };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--providers") config.providers = argv[++index];
    else if (arg === "--watchlist") config.watchlist = argv[++index];
    else if (arg === "--availability-audit") config.availabilityAudit = argv[++index];
    else if (arg === "--recheck-results") config.recheckResults = argv[++index];
    else if (arg === "--json-out") config.jsonOut = argv[++index];
    else if (arg === "--csv-out") config.csvOut = argv[++index];
    else if (arg === "--md-out") config.mdOut = argv[++index];
    else if (arg === "--include-stale-verification") config.includeStaleVerification = true;
    else if (arg === "--verification-cadence-days") config.verificationCadenceDays = Number(argv[++index]);
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

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function compact(value, max = 320) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join("; ") : String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function safeId(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function sourceUrls(...values) {
  return [...new Set(values.flat().filter((url) => /^https?:\/\//i.test(url || "")))];
}

function providerUrl(provider = {}) {
  return provider.website || provider.source || provider.availabilitySource || "";
}

function providerById(providers) {
  return new Map(providers.map((provider) => [provider.id, provider]));
}

function providerByNormalisedUrl(providers) {
  const map = new Map();
  for (const provider of providers) {
    for (const url of sourceUrls(provider.website, provider.source, provider.availabilitySource)) {
      map.set(url.replace(/\/+$/, "").toLowerCase(), provider);
    }
  }
  return map;
}

function watchlistById(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function priorityFor(rule, severity = "medium") {
  if (rule === "live-provider-now-restrictive" || rule === "accepting-without-explicit-evidence") return "critical";
  if (HIGH_RISK_RULES.has(rule) || severity === "high") return "high";
  if (severity === "medium") return "medium";
  return "low";
}

function actionFor(rule, sourceKind = "") {
  if (rule === "watchlist-possibly-available") {
    return "Open the source and confirm availability before moving the provider from the watchlist back into live results.";
  }
  if (rule === "live-provider-now-restrictive") {
    return "Confirm the restrictive wording, then move the provider to the watchlist or adjust availability so they do not lead first recommendations.";
  }
  if (rule === "availability-changed") {
    return sourceKind === "watchlist"
      ? "Confirm the change manually before restoring this provider to public recommendations."
      : "Confirm the change manually before changing live availability metadata.";
  }
  if (rule === "fetch-blocked-or-failed") {
    return "Use a browser, phone, or email check. Do not infer availability from a blocked or failed automated fetch.";
  }
  if (rule === "stale-availability") {
    return "Recheck the provider source and update availability evidence, checked date, and review notes.";
  }
  return "Open the source, compare the public record with current evidence, then approve, adjust, move to watchlist, or mark needs more info.";
}

function evidenceItem({ field, value, sourceUrl, excerpt, capturedAt, confidence = "low", needsManualReview = true }) {
  return {
    field,
    value: value || "",
    sourceUrl: sourceUrl || "",
    excerpt: excerpt || "",
    capturedAt: capturedAt || "",
    confidence,
    needsManualReview
  };
}

function publicPreview({ provider, rule, currentStatus, detectedStatus, evidence, recommendedAction }) {
  return compact([
    provider.name,
    [provider.region, provider.city].filter(Boolean).join(" / "),
    `Monitor task: ${rule}.`,
    currentStatus ? `Current status: ${currentStatus}.` : "",
    detectedStatus ? `Automated check saw: ${detectedStatus}.` : "",
    evidence ? `Evidence: ${compact(evidence, 180)}.` : "",
    recommendedAction
  ].filter(Boolean).join("\n"));
}

function makeItem({ provider, reviewId, rule, severity, issue, suggestedFix, sourceKind, currentStatus, detectedStatus, evidence, matchedPattern, checkedAt, urls }) {
  const priority = priorityFor(rule, severity);
  const recommendedAction = actionFor(rule, sourceKind);
  const sourceList = sourceUrls(urls, providerUrl(provider));
  return {
    reviewId,
    providerId: provider.id || reviewId,
    name: provider.name || reviewId,
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
    source: provider.source || provider.website || "",
    sourceQuality: provider.sourceQuality || "",
    confidence: provider.confidence || "low",
    needsManualVerification: provider.needsManualVerification !== false,
    verified: provider.verified || "",
    lastVerified: provider.lastVerified || "",
    availabilityStatus: provider.availabilityStatus || currentStatus || "",
    availabilityCheckedAt: provider.availabilityCheckedAt || checkedAt || "",
    availabilityEvidence: provider.availabilityEvidence || evidence || "",
    availabilitySource: provider.availabilitySource || sourceList[0] || "",
    availabilityNeedsManualReview: true,
    requiresReferral: provider.requiresReferral ?? "",
    referralType: provider.referralType || "",
    referralSourceUrl: provider.referralSourceUrl || "",
    referralSourceExcerpt: provider.referralSourceExcerpt || "",
    referralConfidence: provider.referralConfidence || "",
    referralLastChecked: provider.referralLastChecked || "",
    referralNeedsManualReview: provider.referralNeedsManualReview ?? "",
    tags: provider.tags || [],
    needScope: provider.needScope || [],
    specialties: provider.specialties || [],
    services: provider.services || [],
    patientGroups: provider.patientGroups || [],
    ageGroups: provider.ageGroups || [],
    onlineAvailable: provider.onlineAvailable ?? "",
    phoneSupport: provider.phoneSupport ?? "",
    inPerson: provider.inPerson ?? "",
    crisisOnly: provider.crisisOnly ?? "",
    auditSeverity: severity,
    auditRules: [rule],
    auditFindings: [{
      source: "ongoing-monitor",
      severity,
      rule,
      issue,
      suggestedFix,
      sourceUrl: sourceList[0] || "",
      raw: { sourceKind, currentStatus, detectedStatus, evidence, matchedPattern, checkedAt }
    }],
    suggestedFixes: [suggestedFix],
    reviewPriority: priority,
    reviewReasons: [issue, recommendedAction],
    sourceUrls: sourceList,
    sourceEvidenceSummary: compact([evidence, matchedPattern ? `Matched pattern: ${matchedPattern}` : ""].filter(Boolean).join(" | ")),
    sourceEvidence: {
      contact: [],
      address: [],
      availability: [evidenceItem({
        field: "availabilityStatus",
        value: detectedStatus || currentStatus || "",
        sourceUrl: sourceList[0] || "",
        excerpt: evidence || "",
        capturedAt: checkedAt || "",
        confidence: evidence ? "medium" : "low",
        needsManualReview: true
      })],
      referral: [],
      scope: [],
      tags: {},
      telehealth: [],
      cultural: [],
      cost: []
    },
    publicCardPreviewText: publicPreview({ provider, rule, currentStatus, detectedStatus, evidence, recommendedAction }),
    reviewDecision: "",
    correctedFields: {},
    reviewer: "",
    reviewedDate: "",
    reviewNotes: "",
    currentProvider: provider
  };
}

function itemsFromRecheckResults({ recheck, providers, watchlistItems }) {
  const byId = providerById(providers);
  const byUrl = providerByNormalisedUrl(providers);
  const watchById = watchlistById(watchlistItems);
  const items = [];

  for (const result of asArray(recheck.results)) {
    const watchItem = watchById.get(result.id);
    const watchProvider = watchItem?.providerCandidate
      ? { ...watchItem.providerCandidate, id: watchItem.providerCandidate.id || watchItem.id }
      : null;
    const provider = byId.get(result.id)
      || byUrl.get(String(result.url || "").replace(/\/+$/, "").toLowerCase())
      || watchProvider
      || watchItem
      || {};

    let rule = "";
    let severity = "medium";
    let issue = "";

    if (result.sourceKind === "watchlist" && result.detectedStatus === "possibly_available") {
      rule = "watchlist-possibly-available";
      severity = "high";
      issue = "A watched unavailable provider may now be available.";
    } else if (result.sourceKind === "live-provider" && restrictiveStatuses.has(result.detectedStatus)) {
      rule = "live-provider-now-restrictive";
      severity = "high";
      issue = "A live provider source now appears to show restrictive availability.";
    } else if (result.changed) {
      rule = "availability-changed";
      severity = "high";
      issue = "Automated availability text no longer matches the stored status.";
    } else if (result.blocked || result.detectedStatus === "blocked" || result.detectedStatus === "check_failed") {
      rule = "fetch-blocked-or-failed";
      severity = "medium";
      issue = "Automated fetch could not verify the provider source.";
    } else {
      continue;
    }

    items.push(makeItem({
      provider,
      reviewId: `monitor:${rule}:${result.id || safeId(result.url)}`,
      rule,
      severity,
      issue,
      suggestedFix: result.recommendedAction || actionFor(rule, result.sourceKind),
      sourceKind: result.sourceKind,
      currentStatus: result.currentStatus,
      detectedStatus: result.detectedStatus,
      evidence: result.evidence,
      matchedPattern: result.matchedPattern,
      checkedAt: result.checkedAt || recheck.checkedAt,
      urls: [result.url, result.finalUrl]
    }));
  }

  return items;
}

function itemsFromAvailabilityAudit({ audit, providers }) {
  const byId = providerById(providers);
  const monitorRules = new Set([
    "stale-availability",
    "accepting-without-explicit-evidence",
    "restrictive-evidence-status-mismatch",
    "missing-availability-checked-at",
    "missing-or-invalid-availability-status"
  ]);
  const items = [];

  for (const finding of asArray(audit.findings)) {
    if (finding.allowlisted || !monitorRules.has(finding.rule)) continue;
    const provider = byId.get(finding.providerId) || {
      id: finding.providerId,
      name: finding.providerName,
      type: finding.type,
      region: finding.region,
      city: finding.city,
      source: finding.source
    };

    items.push(makeItem({
      provider,
      reviewId: `monitor:${finding.rule}:${finding.providerId}`,
      rule: finding.rule,
      severity: finding.severity || "medium",
      issue: finding.issue || "Availability audit finding needs review.",
      suggestedFix: finding.suggestedAction || actionFor(finding.rule),
      sourceKind: "availability-audit",
      currentStatus: finding.availabilityStatus || provider.availabilityStatus,
      detectedStatus: "",
      evidence: provider.availabilityEvidence || "",
      matchedPattern: "",
      checkedAt: finding.availabilityCheckedAt || provider.availabilityCheckedAt,
      urls: [finding.source, provider.availabilitySource, provider.source, provider.website]
    }));
  }

  return items;
}

function itemsFromStaleVerification({ providers, now, cadenceDays }) {
  const items = [];
  for (const provider of providers) {
    if (!requiresAvailabilityMetadata(provider)) continue;
    const lastChecked = provider.lastVerified || provider.verified || "";
    if (daysSince(lastChecked, now) <= cadenceDays) continue;
    const availability = providerAvailability(provider);
    if (availability.checkedAt && !isAvailabilityStale(availability.status, availability.checkedAt, now)) continue;

    items.push(makeItem({
      provider,
      reviewId: `monitor:stale-provider-verification:${provider.id}`,
      rule: "stale-provider-verification",
      severity: "low",
      issue: `Provider verification is older than ${cadenceDays} days.`,
      suggestedFix: "Open the source and confirm contact, location, scope, and availability before renewing lastVerified.",
      sourceKind: "verification-cadence",
      currentStatus: availability.status,
      detectedStatus: "",
      evidence: "",
      matchedPattern: "",
      checkedAt: lastChecked,
      urls: [provider.source, provider.website, provider.availabilitySource]
    }));
  }
  return items;
}

function dedupeAndSort(items) {
  const priorityRank = { critical: 0, high: 1, medium: 2, low: 3 };
  const severityRank = { high: 0, medium: 1, low: 2, none: 3 };
  const map = new Map();
  for (const item of items) {
    const existing = map.get(item.reviewId);
    if (!existing) {
      map.set(item.reviewId, item);
      continue;
    }
    existing.auditFindings.push(...item.auditFindings);
    existing.auditRules = [...new Set([...existing.auditRules, ...item.auditRules])];
    existing.reviewReasons = [...new Set([...existing.reviewReasons, ...item.reviewReasons])];
    existing.suggestedFixes = [...new Set([...existing.suggestedFixes, ...item.suggestedFixes])];
    existing.sourceUrls = sourceUrls(existing.sourceUrls, item.sourceUrls);
    existing.reviewPriority = priorityRank[item.reviewPriority] < priorityRank[existing.reviewPriority]
      ? item.reviewPriority
      : existing.reviewPriority;
  }

  return [...map.values()].sort((a, b) => {
    const priorityDelta = priorityRank[a.reviewPriority] - priorityRank[b.reviewPriority];
    if (priorityDelta) return priorityDelta;
    const severityDelta = severityRank[a.auditSeverity] - severityRank[b.auditSeverity];
    if (severityDelta) return severityDelta;
    return `${a.region} ${a.name}`.localeCompare(`${b.region} ${b.name}`);
  });
}

export function buildProviderMonitorQueue(options = {}) {
  const config = { ...DEFAULTS, ...options };
  const providers = readJsonIfExists(config.providers, []);
  const watchlist = readJsonIfExists(config.watchlist, { items: [] });
  const watchlistItems = Array.isArray(watchlist) ? watchlist : watchlist.items || [];
  const availabilityAudit = readJsonIfExists(config.availabilityAudit, { findings: [] });
  const recheck = readJsonIfExists(config.recheckResults, { results: [] });
  const now = options.now || new Date();

  const items = dedupeAndSort([
    ...itemsFromRecheckResults({ recheck, providers, watchlistItems }),
    ...itemsFromAvailabilityAudit({ audit: availabilityAudit, providers }),
    ...(config.includeStaleVerification ? itemsFromStaleVerification({
      providers,
      now,
      cadenceDays: Number(config.verificationCadenceDays) || DEFAULTS.verificationCadenceDays
    }) : [])
  ]);

  return {
    version: 1,
    mode: "ongoing-provider-monitor",
    generatedAt: now.toISOString(),
    providersPath: config.providers,
    watchlistPath: config.watchlist,
    sourceReports: {
      availabilityAudit: config.availabilityAudit,
      recheckResults: config.recheckResults
    },
    cadenceDays: {
      availability: availabilityCadenceDays,
      verification: Number(config.verificationCadenceDays) || DEFAULTS.verificationCadenceDays
    },
    summary: {
      total: items.length,
      critical: items.filter((item) => item.reviewPriority === "critical").length,
      high: items.filter((item) => item.reviewPriority === "high").length,
      medium: items.filter((item) => item.reviewPriority === "medium").length,
      low: items.filter((item) => item.reviewPriority === "low").length
    },
    items
  };
}

function writeCsv(filePath, items) {
  const fields = [
    "reviewId",
    "providerId",
    "name",
    "type",
    "region",
    "city",
    "reviewPriority",
    "auditSeverity",
    "auditRules",
    "availabilityStatus",
    "availabilityCheckedAt",
    "sourceUrls",
    "reviewReasons",
    "suggestedFixes"
  ];
  const rows = [
    fields.join(","),
    ...items.map((item) => fields.map((field) => csvCell(item[field])).join(","))
  ];
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${rows.join("\n")}\n`);
}

function writeMarkdown(filePath, queue) {
  const lines = [
    "# Provider Monitor Queue",
    "",
    `Generated: ${queue.generatedAt}`,
    "",
    "This queue is for ongoing provider checks after records have been manually audited.",
    "Automated fetches can flag possible changes, but they do not update live provider data by themselves.",
    "",
    `Total: ${queue.summary.total}`,
    `Critical: ${queue.summary.critical}`,
    `High: ${queue.summary.high}`,
    `Medium: ${queue.summary.medium}`,
    `Low: ${queue.summary.low}`,
    "",
    "## Highest Priority Items",
    ""
  ];

  for (const item of queue.items.slice(0, 40)) {
    lines.push(`- **${item.reviewPriority.toUpperCase()}** ${item.name} (${item.type}, ${item.region || "unknown"})`);
    lines.push(`  - Rule: ${item.auditRules.join(", ")}`);
    lines.push(`  - Action: ${item.reviewReasons[item.reviewReasons.length - 1] || ""}`);
    if (item.sourceUrls[0]) lines.push(`  - Source: ${item.sourceUrls[0]}`);
  }

  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function runCli() {
  const config = parseArgs();
  const queue = buildProviderMonitorQueue(config);
  writeJson(config.jsonOut, queue);
  writeCsv(config.csvOut, queue.items);
  writeMarkdown(config.mdOut, queue);
  console.log(`Wrote ${queue.items.length} monitor review item(s) to ${path.resolve(config.jsonOut)}.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
