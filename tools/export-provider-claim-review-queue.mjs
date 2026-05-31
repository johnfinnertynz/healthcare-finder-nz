import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildProviderEvidenceGraph } from "./build-provider-evidence-graph.mjs";

const DEFAULTS = {
  graph: "data/provider-evidence-graph.json",
  claims: "data/provider-claims.json",
  providers: "providers.json",
  jsonOut: "data/provider-claim-review-queue.json",
  csvOut: "data/provider-claim-review-queue.csv",
  mdOut: "PROVIDER_CLAIM_REVIEW_QUEUE.md",
  includeAuto: false,
  includeAll: false,
  limit: Infinity
};

const PRIORITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };

function parseArgs(argv = process.argv.slice(2)) {
  const config = { ...DEFAULTS };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--graph") config.graph = argv[++index];
    else if (arg === "--claims") config.claims = argv[++index];
    else if (arg === "--providers") config.providers = argv[++index];
    else if (arg === "--json-out") config.jsonOut = argv[++index];
    else if (arg === "--csv-out") config.csvOut = argv[++index];
    else if (arg === "--md-out") config.mdOut = argv[++index];
    else if (arg === "--include-auto") config.includeAuto = true;
    else if (arg === "--include-all") config.includeAll = true;
    else if (arg === "--limit") config.limit = Number(argv[++index]);
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

function compact(value, max = 360) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null && String(value).trim() !== ""))];
}

function severityForClaim(claim) {
  if (claim.decision === "watchlist") return "high";
  if (claim.decision === "reject") return "high";
  if (claim.riskLevel === "high") return "high";
  if (claim.riskLevel === "medium") return "medium";
  return claim.decision === "auto_accept" ? "low" : "medium";
}

function priorityForClaim(claim, providerNode) {
  if (claim.decision === "watchlist") return "critical";
  if (claim.decision === "reject") return "critical";
  if (claim.riskLevel === "high" && providerNode?.reviewClaims > 0) return "high";
  if (claim.auditRules?.length) return "high";
  if (claim.riskLevel === "medium") return "medium";
  return claim.decision === "auto_accept" ? "low" : "medium";
}

function reviewCategory(claim, providerNode) {
  if (claim.decision === "auto_accept") return "ready to auto-apply, low risk";
  if (claim.decision === "watchlist") return "availability watchlist";
  if (claim.decision === "reject") return "not suitable for public app";
  if (claim.field === "referralType" || claim.field === "requiresReferral" || claim.field === "referralSourceExcerpt") return "referral pathway review";
  if (claim.field === "availabilityStatus" || claim.field === "availabilityEvidence") return "availability review";
  if (claim.auditRules?.some((rule) => /broad-tag|weak-(maori|pasifika|asian|rainbow)|weak-telehealth/.test(rule))) return "sensitive tag or scope evidence";
  if (claim.auditRules?.some((rule) => /missing-address|missing-coordinates/.test(rule))) return "location and distance evidence";
  if (claim.auditRules?.some((rule) => /weak-gp-source/.test(rule))) return "GP source corroboration";
  return providerNode?.reviewCategory || "needs quick human check";
}

function batchKey(claim, providerNode) {
  const category = reviewCategory(claim, providerNode);
  const rule = claim.auditRules?.[0] || claim.reason.split(".")[0].slice(0, 80);
  return [
    category,
    claim.decision,
    claim.riskLevel,
    claim.field,
    claim.sourceType,
    rule
  ].join("|");
}

function sourceEvidenceForClaim(claim) {
  const item = {
    field: claim.field,
    value: claim.value,
    sourceUrl: claim.sourceUrl,
    sourceType: claim.sourceType,
    excerpt: claim.excerpt,
    capturedAt: claim.capturedAt || claim.sourceLastChecked || "",
    confidence: claim.confidence,
    extractor: claim.extractionMethod,
    needsManualReview: claim.decision !== "auto_accept"
  };
  const evidence = {
    contact: [],
    address: [],
    availability: [],
    referral: [],
    scope: [],
    tags: {},
    telehealth: [],
    cultural: [],
    cost: [],
    identity: []
  };
  if (["phone", "text", "email", "website", "bookingUrl"].includes(claim.field)) evidence.contact.push(item);
  else if (["address", "city", "region", "lat", "lon"].includes(claim.field)) evidence.address.push(item);
  else if (/availability/.test(claim.field)) evidence.availability.push(item);
  else if (/referral|requiresReferral/.test(claim.field)) evidence.referral.push(item);
  else if (claim.field === "tags") {
    evidence.tags[String(claim.value)] = [item];
    if (["maori", "pasifika", "asian", "rainbow"].includes(String(claim.value))) evidence.cultural.push(item);
    if (["telehealth", "online"].includes(String(claim.value))) evidence.telehealth.push(item);
  } else if (claim.field === "cost") evidence.cost.push(item);
  else if (["name", "clinicianName", "practiceName", "type"].includes(claim.field)) evidence.identity.push(item);
  else evidence.scope.push(item);
  return evidence;
}

function publicPreview(provider, claim) {
  return compact([
    provider?.clinicianName ? `${provider.clinicianName}${provider.practiceName ? `, ${provider.practiceName}` : ""}` : provider?.name,
    `${provider?.type || ""} | ${provider?.region || ""}${provider?.city ? ` / ${provider.city}` : ""}`,
    provider?.fit,
    provider?.firstStep,
    `Claim under review: ${claim.field} = ${Array.isArray(claim.value) ? claim.value.join(", ") : claim.value}`
  ].filter(Boolean).join("\n"), 1200);
}

function itemFromClaim(claim, providerNode, provider) {
  const category = reviewCategory(claim, providerNode);
  const key = batchKey(claim, providerNode);
  const priority = priorityForClaim(claim, providerNode);
  const severity = severityForClaim(claim);
  const sourceUrls = unique([claim.sourceUrl, provider?.source, provider?.website, provider?.availabilitySource, provider?.referralSourceUrl]);
  return {
    reviewId: `claim:${claim.claimId}`,
    providerId: claim.providerId,
    name: provider?.name || claim.providerName || "",
    clinicianName: provider?.clinicianName || "",
    practiceName: provider?.practiceName || "",
    type: provider?.type || providerNode?.type || "",
    region: provider?.region || providerNode?.region || "",
    city: provider?.city || providerNode?.city || "",
    address: provider?.address || "",
    lat: provider?.lat ?? "",
    lon: provider?.lon ?? "",
    phone: provider?.phone || "",
    text: provider?.text || "",
    email: provider?.email || "",
    website: provider?.website || "",
    bookingUrl: provider?.bookingUrl || "",
    source: provider?.source || claim.sourceUrl || "",
    sourceQuality: provider?.sourceQuality || "",
    confidence: claim.confidence || provider?.confidence || "",
    needsManualVerification: claim.decision !== "auto_accept",
    verified: provider?.verified || "",
    lastVerified: provider?.lastVerified || "",
    availabilityStatus: provider?.availabilityStatus || "",
    availabilityCheckedAt: provider?.availabilityCheckedAt || "",
    availabilityEvidence: provider?.availabilityEvidence || "",
    availabilitySource: provider?.availabilitySource || "",
    availabilityNeedsManualReview: provider?.availabilityNeedsManualReview,
    requiresReferral: provider?.requiresReferral,
    referralType: provider?.referralType || "",
    referralSourceUrl: provider?.referralSourceUrl || "",
    referralSourceExcerpt: provider?.referralSourceExcerpt || "",
    referralConfidence: provider?.referralConfidence || "",
    referralLastChecked: provider?.referralLastChecked || "",
    referralNeedsManualReview: provider?.referralNeedsManualReview,
    tags: asArray(provider?.tags),
    needScope: asArray(provider?.needScope),
    specialties: asArray(provider?.specialties),
    services: asArray(provider?.services),
    patientGroups: asArray(provider?.patientGroups),
    ageGroups: asArray(provider?.ageGroups),
    onlineAvailable: provider?.onlineAvailable,
    phoneSupport: provider?.phoneSupport,
    inPerson: provider?.inPerson,
    crisisOnly: provider?.crisisOnly,
    claimId: claim.claimId,
    claimField: claim.field,
    claimValue: claim.value,
    claimRiskLevel: claim.riskLevel,
    claimConfidence: claim.confidence,
    claimScore: claim.score,
    claimDecision: claim.decision,
    claimReason: claim.reason,
    requiredHumanAction: claim.requiredHumanAction,
    sourceOwnerType: claim.sourceOwnerType,
    sourceType: claim.sourceType,
    sourceLastChecked: claim.sourceLastChecked,
    reviewCategory: category,
    batchKey: key,
    auditSeverity: severity,
    auditRules: unique([category, claim.decision, ...(claim.auditRules || [])]),
    auditIssues: unique([claim.reason, ...(claim.auditIssues || [])]),
    suggestedFixes: unique([claim.requiredHumanAction].filter(Boolean)),
    reviewPriority: priority,
    priorityScore: PRIORITY_RANK[priority] ?? 2,
    reviewReasons: unique([claim.reason, claim.requiredHumanAction, ...(claim.auditRules || [])].filter(Boolean)),
    sourceUrls,
    sourceEvidence: sourceEvidenceForClaim(claim),
    sourceEvidenceSummary: compact([claim.excerpt, claim.reason, claim.requiredHumanAction].filter(Boolean).join(" | "), 600),
    publicCardPreviewText: publicPreview(provider, claim),
    currentProvider: null,
    auditFindings: (claim.auditRules || []).map((rule, index) => ({
      source: "claim-evidence-graph",
      severity,
      rule,
      issue: claim.auditIssues?.[index] || claim.reason,
      suggestedFix: claim.requiredHumanAction,
      sourceUrl: claim.sourceUrl,
      allowlisted: false
    })),
    reviewDecision: "",
    correctedFields: {},
    reviewer: "",
    reviewedDate: "",
    reviewNotes: ""
  };
}

function riskyAvailability(value) {
  return ["accepting", "waitlist", "not_accepting", "referrals_paused"].includes(String(value || ""));
}

function shouldIncludeClaim(claim, providerNode, provider, config) {
  if (config.includeAll) return config.includeAuto || claim.decision !== "auto_accept";
  if (claim.decision === "auto_accept") return config.includeAuto;
  if (claim.decision === "watchlist" || claim.decision === "reject") return true;
  if (claim.auditRules?.length) return true;
  if (["availabilityStatus", "availabilityEvidence"].includes(claim.field)) {
    return Boolean(provider?.availabilityNeedsManualReview && riskyAvailability(provider?.availabilityStatus));
  }
  if (["referralType", "requiresReferral", "referralSourceExcerpt"].includes(claim.field)) {
    return Boolean((provider?.type === "psychiatrist" || provider?.tags?.includes("psychiatry-service"))
      && (provider?.referralNeedsManualReview || provider?.referralType === "unknown"));
  }
  if (providerNode?.reviewCategory === "directory/direct-contact confusion") {
    return ["type", "tags", "phone", "email", "text", "bookingUrl", "firstStep"].includes(claim.field);
  }
  return false;
}

function batchesFromItems(items) {
  const map = new Map();
  for (const item of items) {
    const batch = map.get(item.batchKey) || {
      batchKey: item.batchKey,
      reviewCategory: item.reviewCategory,
      claimDecision: item.claimDecision,
      claimRiskLevel: item.claimRiskLevel,
      claimField: item.claimField,
      sourceType: item.sourceType,
      auditRules: item.auditRules,
      count: 0,
      providerMap: new Map(),
      regions: new Set(),
      sampleValues: [],
      suggestedBatchAction: ""
    };
    batch.count += 1;
    const providerKey = item.providerId || item.reviewId;
    const providerSample = batch.providerMap.get(providerKey) || {
      providerId: item.providerId,
      name: item.name,
      region: item.region,
      city: item.city,
      claimCount: 0,
      claimFields: [],
      claimValues: [],
      sourceUrls: []
    };
    providerSample.claimCount += 1;
    providerSample.claimFields = unique([...providerSample.claimFields, item.claimField]);
    providerSample.claimValues = unique([...providerSample.claimValues, String(item.claimValue ?? "")]).slice(0, 8);
    providerSample.sourceUrls = unique([...providerSample.sourceUrls, ...asArray(item.sourceUrls)]).slice(0, 4);
    batch.providerMap.set(providerKey, providerSample);
    batch.regions.add(item.region || "unknown");
    if (batch.sampleValues.length < 8) batch.sampleValues.push(item.claimValue);
    map.set(item.batchKey, batch);
  }
  return [...map.values()].map((batch) => {
    const providerCount = batch.providerMap.size;
    const providers = [...batch.providerMap.values()]
      .sort((a, b) => b.claimCount - a.claimCount || a.name.localeCompare(b.name))
      .slice(0, 12);
    return {
      batchKey: batch.batchKey,
      reviewCategory: batch.reviewCategory,
      claimDecision: batch.claimDecision,
      claimRiskLevel: batch.claimRiskLevel,
      claimField: batch.claimField,
      sourceType: batch.sourceType,
      auditRules: batch.auditRules,
      count: batch.count,
      providerCount,
      duplicateClaimRows: Math.max(0, batch.count - providerCount),
      providers,
      regions: [...batch.regions].sort(),
      sampleValues: unique(batch.sampleValues.map((value) => String(value))),
      suggestedBatchAction: batch.claimDecision === "auto_accept"
        ? "Can be auto-resolved as low-risk if validation passes; no live mutation is performed by export."
        : batch.reviewCategory === "GP source corroboration"
          ? "Batch research: corroborate against practice-owned, Healthpoint-approved, HPI/FHIR, or PHO source."
          : batch.reviewCategory === "location and distance evidence"
            ? "Batch geocode/address check; do not show as local if coordinates remain missing."
            : batch.reviewCategory === "sensitive tag or scope evidence"
              ? "Open source pages and remove unsupported tags or add short excerpts."
              : "Review representative items first, then apply safe decisions individually."
    };
  }).sort((a, b) => b.count - a.count || a.reviewCategory.localeCompare(b.reviewCategory));
}

function countBy(items, getter) {
  return items.reduce((counts, item) => {
    const key = getter(item) || "unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
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
    "type",
    "region",
    "city",
    "reviewCategory",
    "batchKey",
    "claimField",
    "claimValue",
    "claimRiskLevel",
    "claimConfidence",
    "claimScore",
    "claimDecision",
    "sourceType",
    "sourceOwnerType",
    "sourceUrls",
    "auditRules",
    "claimReason",
    "requiredHumanAction",
    "reviewPriority"
  ];
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${[
    headers.join(","),
    ...items.map((item) => headers.map((header) => csvEscape(item[header])).join(","))
  ].join("\n")}\n`);
}

function writeMarkdown(filePath, queue) {
  const lines = [
    "# Provider Claim Review Queue",
    "",
    `Generated: ${queue.generatedAt}`,
    "",
    "This queue is generated from field-level provider claims. It compresses recurring work into batches so reviewers do not have to inspect hundreds of near-identical issues one by one.",
    "",
    "## Summary",
    "",
    `- Review items: ${queue.items.length}`,
    `- Batch groups: ${queue.batches.length}`,
    `- Auto-accepted low-risk claims in graph: ${queue.inputs.autoAcceptedClaims}`,
    `- Review-gated claims in graph: ${queue.inputs.reviewGatedClaims}`,
    "",
    "## Largest Batches",
    "",
    "| Claims | Providers | Category | Field | Decision | Source type | Suggested batch action |",
    "| ---: | ---: | --- | --- | --- | --- | --- |"
  ];
  for (const batch of queue.batches.slice(0, 40)) {
    lines.push(`| ${batch.count} | ${batch.providerCount} | ${batch.reviewCategory} | ${batch.claimField} | ${batch.claimDecision} | ${batch.sourceType} | ${batch.suggestedBatchAction.replace(/\|/g, "\\|")} |`);
  }
  lines.push("", "## Top Claim Items", "", "| Priority | Provider | Field | Value | Reason |", "| --- | --- | --- | --- | --- |");
  for (const item of queue.items.slice(0, 80)) {
    lines.push(`| ${item.reviewPriority} | ${`${item.providerId} - ${item.name}`.replace(/\|/g, "\\|")} | ${item.claimField} | ${String(item.claimValue).replace(/\|/g, "\\|").slice(0, 80)} | ${item.claimReason.replace(/\|/g, "\\|")} |`);
  }
  lines.push("", "Auto-accept claims are advisory only. Apply live changes only through reviewed decisions and validation.", "");
  fs.writeFileSync(filePath, lines.join("\n"));
}

export function buildProviderClaimReviewQueue(config = {}) {
  const merged = { ...DEFAULTS, ...config };
  let graph = readJsonIfExists(merged.graph, null);
  if (!graph) graph = buildProviderEvidenceGraph({ providers: merged.providers });
  const graphNodes = asArray(graph.nodes);
  const graphHasNodeClaims = graphNodes.some((node) => Array.isArray(node.claims) && node.claims.length);
  const claimsPayload = graphHasNodeClaims
    ? { claims: asArray(graph.claims) }
    : readJsonIfExists(merged.claims, { claims: [] });
  const claimsByProviderId = new Map();
  for (const claim of asArray(claimsPayload.claims)) {
    const bucket = claimsByProviderId.get(claim.providerId) || [];
    bucket.push(claim);
    claimsByProviderId.set(claim.providerId, bucket);
  }
  const providers = readJsonIfExists(merged.providers, []);
  const providersById = new Map(providers.map((provider) => [provider.id, provider]));
  const nodesByProviderId = new Map(graphNodes.map((node) => [node.providerId, node]));
  let items = graphNodes.flatMap((node) =>
    asArray(node.claims?.length ? node.claims : claimsByProviderId.get(node.providerId))
      .filter((claim) => shouldIncludeClaim(claim, node, providersById.get(claim.providerId), merged))
      .map((claim) => itemFromClaim(claim, node, providersById.get(claim.providerId)))
  );
  items = items.sort((a, b) =>
    PRIORITY_RANK[a.reviewPriority] - PRIORITY_RANK[b.reviewPriority]
    || b.claimScore - a.claimScore
    || a.reviewCategory.localeCompare(b.reviewCategory)
    || a.name.localeCompare(b.name)
  );
  if (Number.isFinite(merged.limit) && merged.limit > 0) items = items.slice(0, merged.limit);
  const allClaims = asArray(graph.claims).length
    ? asArray(graph.claims)
    : asArray(claimsPayload.claims).length
      ? asArray(claimsPayload.claims)
      : graphNodes.flatMap((node) => asArray(node.claims));
  const batches = batchesFromItems(items);
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    mode: "claim-level-review",
    safety: {
      advisoryOnly: true,
      noLiveProviderMutation: true,
      highRiskClaimsReviewGated: true,
      autoAcceptLimitedToLowRiskPublicContactIdentityLocation: true
    },
    inputs: {
      sourceGraphGeneratedAt: graph.generatedAt || "",
      providers: providers.length,
      claimNodes: nodesByProviderId.size,
      claims: allClaims.length,
      autoAcceptedClaims: allClaims.filter((claim) => claim.decision === "auto_accept").length,
      reviewGatedClaims: allClaims.filter((claim) => claim.decision !== "auto_accept").length
    },
    summary: {
      total: items.length,
      batches: batches.length,
      byCategory: countBy(items, (item) => item.reviewCategory),
      byDecision: countBy(items, (item) => item.claimDecision),
      byRisk: countBy(items, (item) => item.claimRiskLevel),
      byField: countBy(items, (item) => item.claimField),
      bySourceType: countBy(items, (item) => item.sourceType),
      byPriority: countBy(items, (item) => item.reviewPriority)
    },
    allowedReviewDecisions: ["approve", "adjust", "reject", "move_to_watchlist", "duplicate", "needs_more_info"],
    batches,
    items
  };
}

export function writeProviderClaimReviewQueue(queue, config = {}) {
  const merged = { ...DEFAULTS, ...config };
  writeJson(merged.jsonOut, queue, false);
  writeCsv(merged.csvOut, queue.items);
  writeMarkdown(merged.mdOut, queue);
}

export function runCli(argv = process.argv.slice(2)) {
  const config = parseArgs(argv);
  const queue = buildProviderClaimReviewQueue(config);
  writeProviderClaimReviewQueue(queue, config);
  console.log(`Exported ${queue.items.length} provider claim review items in ${queue.batches.length} batch groups.`);
  console.log(`JSON: ${path.resolve(config.jsonOut)}`);
  console.log(`CSV: ${path.resolve(config.csvOut)}`);
  console.log(`Markdown: ${path.resolve(config.mdOut)}`);
  return queue;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
