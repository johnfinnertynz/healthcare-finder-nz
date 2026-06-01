import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildProviderReviewQueue } from "./export-provider-review-queue.mjs";

const DEFAULTS = {
  providers: "providers.json",
  reviewQueue: "data/provider-review-queue.json",
  googlePlacesCandidates: "data/discovery/google-places-provider-candidates.json",
  jsonOut: "data/location-distance-review-pack.json",
  csvOut: "data/location-distance-review-pack.csv",
  mdOut: "LOCATION_DISTANCE_REVIEW_PACK.md",
  region: "",
  type: "",
  limit: Infinity,
  rebuildQueue: false
};

const STRONG_LOCATION_SIGNALS = new Set(["name", "phone", "address", "website-domain", "coordinate-gap-target"]);
const WEAK_LOCATION_SIGNALS = new Set(["coordinate-gap-address-search-needs-review", "near-target-location"]);
const LOCATION_FIELDS = new Set([
  "address",
  "lat",
  "lon",
  "coordinateSource",
  "coordinatePrecision",
  "coordinateConfidence",
  "geocodeNeedsManualReview"
]);

function parseArgs(argv = process.argv.slice(2)) {
  const config = { ...DEFAULTS };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--providers") config.providers = argv[++index];
    else if (arg === "--review-queue") config.reviewQueue = argv[++index];
    else if (arg === "--google-places-candidates") config.googlePlacesCandidates = argv[++index];
    else if (arg === "--json-out") config.jsonOut = argv[++index];
    else if (arg === "--csv-out") config.csvOut = argv[++index];
    else if (arg === "--md-out") config.mdOut = argv[++index];
    else if (arg === "--region") config.region = argv[++index];
    else if (arg === "--type") config.type = argv[++index];
    else if (arg === "--limit") config.limit = Number(argv[++index]);
    else if (arg === "--rebuild-queue") config.rebuildQueue = true;
  }
  return config;
}

function readJsonInput(input, fallback) {
  if (Array.isArray(input) || (input && typeof input === "object")) return input;
  if (!input || !fs.existsSync(input)) return fallback;
  return JSON.parse(fs.readFileSync(input, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null && String(value).trim() !== ""))];
}

function compact(value, max = 320) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join("; ") : typeof value === "object" && value !== null ? JSON.stringify(value) : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function hasCoords(provider = {}) {
  return provider.lat !== undefined && provider.lat !== "" && provider.lon !== undefined && provider.lon !== "";
}

function isCoordinateGapCandidate(candidate = {}) {
  const text = [
    candidate.queryId || "",
    candidate.reviewPurpose || "",
    ...(candidate.reviewReasons || []),
    ...(candidate.duplicateSignals || [])
  ].join(" ").toLowerCase();
  return /coordinate-gap/.test(text);
}

function candidateProviderIds(candidate = {}) {
  const fromMatches = asArray(candidate.existingProviderMatches).map((match) => match.providerId);
  const fromReasons = asArray(candidate.reviewReasons)
    .flatMap((reason) => [...String(reason).matchAll(/target coordinate-gap provider:\s*([^;|,\s]+)/gi)].map((match) => match[1]));
  return unique([
    ...asArray(candidate.possibleProviderIds),
    ...fromMatches,
    ...fromReasons
  ]);
}

function candidateSignals(candidate = {}) {
  return unique([
    ...asArray(candidate.duplicateSignals),
    ...asArray(candidate.existingProviderMatches).flatMap((match) => match.signals || [])
  ]);
}

function signalStrength(signals = []) {
  const strong = unique(signals).filter((signal) => STRONG_LOCATION_SIGNALS.has(signal)).length;
  const weak = unique(signals).filter((signal) => WEAK_LOCATION_SIGNALS.has(signal)).length;
  if (strong >= 2) return "strong_match";
  if (strong >= 1) return "probable_match";
  if (weak >= 1) return "weak_match";
  return "unmatched";
}

function issueTypeFor(provider = {}, queueItems = [], candidates = []) {
  const rules = queueItems.flatMap((item) => asArray(item.auditRules)).join(" ").toLowerCase();
  if (/coordinates-outside-nz|region|local/.test(rules)) return "location_conflict";
  if (!provider.address) return "missing_address";
  if (!hasCoords(provider)) return candidates.length ? "coordinate_gap_candidate" : "missing_coordinates";
  if (/coordinate-gap/.test(rules)) return "coordinate_gap_candidate";
  return "location_review";
}

function priorityFor(issueType, bestCandidate = null) {
  if (issueType === "location_conflict") return "manual_compare_conflict";
  if (!bestCandidate) return issueType === "missing_coordinates" ? "geocode_or_source_lookup" : "source_lookup_needed";
  if (bestCandidate.conflictingProviderIds.length) return "manual_compare_conflict";
  if (["strong_match", "probable_match"].includes(bestCandidate.matchStrength)) return "ready_for_location_review";
  return "manual_compare_needed";
}

function batchAction(item) {
  if (item.priority === "ready_for_location_review") {
    return "Open Maps/source, confirm the same provider or clinic location, then draft location-only coordinate/address updates.";
  }
  if (item.priority === "manual_compare_conflict" || item.priority === "manual_compare_needed") {
    return "Compare manually; do not apply coordinates until the provider/location identity is clear.";
  }
  if (item.priority === "geocode_or_source_lookup") {
    return "Use a public professional address source or geocoder result, then keep coordinates review-gated.";
  }
  return "Find a public professional address source or leave as source lookup work.";
}

function locationBatchKey(item) {
  return [
    "location-review",
    item.issueType || "unknown_issue",
    item.priority || "unknown_priority",
    item.bestCandidate?.matchStrength || "no_candidate",
    item.type || "unknown_type"
  ].join(":");
}

function cleanLocationFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).filter(([field, value]) => LOCATION_FIELDS.has(field) && value !== undefined && value !== ""));
}

function compactQueueItem(item = {}) {
  return {
    reviewId: item.reviewId || "",
    reviewCategory: item.reviewCategory || "",
    providerId: item.providerId || "",
    auditSeverity: item.auditSeverity || "",
    reviewPriority: item.reviewPriority || "",
    auditRules: asArray(item.auditRules),
    auditIssues: asArray(item.auditIssues),
    suggestedFixes: asArray(item.suggestedFixes),
    reviewReasons: asArray(item.reviewReasons),
    sourceUrls: asArray(item.sourceUrls)
  };
}

function candidateAssessment(candidate = {}, provider = {}) {
  const linkedProviderIds = candidateProviderIds(candidate);
  const conflictingProviderIds = linkedProviderIds.filter((id) => id && id !== provider.id);
  const signals = candidateSignals(candidate);
  const matchStrength = signalStrength(signals);
  const sourceUrl = candidate.googleMapsUri || candidate.website || "";
  const score = [
    matchStrength === "strong_match" ? 400 : 0,
    matchStrength === "probable_match" ? 260 : 0,
    matchStrength === "weak_match" ? 80 : 0,
    candidate.lat !== undefined && candidate.lat !== "" && candidate.lon !== undefined && candidate.lon !== "" ? 120 : 0,
    candidate.address ? 80 : 0,
    candidate.website ? 30 : 0,
    candidate.phone ? 20 : 0,
    conflictingProviderIds.length ? -300 : 0
  ].reduce((sum, value) => sum + value, 0);
  const draftCorrectedFields = cleanLocationFields({
    address: provider.address ? "" : candidate.address || "",
    lat: !hasCoords(provider) ? candidate.lat : "",
    lon: !hasCoords(provider) ? candidate.lon : "",
    coordinateSource: !hasCoords(provider) ? "google_places_candidate_pending_human_review" : "",
    coordinatePrecision: !hasCoords(provider) ? "business listing" : "",
    coordinateConfidence: !hasCoords(provider) ? (["strong_match", "probable_match"].includes(matchStrength) ? "medium" : "low") : "",
    geocodeNeedsManualReview: !hasCoords(provider) ? true : ""
  });

  return {
    candidateId: candidate.candidateId || "",
    name: candidate.name || "",
    type: candidate.type || "",
    address: candidate.address || "",
    lat: candidate.lat ?? "",
    lon: candidate.lon ?? "",
    phone: candidate.phone || "",
    website: candidate.website || "",
    googleMapsUri: candidate.googleMapsUri || "",
    businessStatus: candidate.businessStatus || "",
    sourceUrl,
    linkedProviderIds,
    conflictingProviderIds,
    matchSignals: signals,
    matchStrength,
    reviewScore: score,
    draftCorrectedFields,
    reviewNotes: [
      "Google Places is a coordinate/address clue only.",
      "Confirm this is the same provider or same public clinic location before applying location fields.",
      "Do not approve provider type, clinical scope, availability, referral pathway, cost, telehealth, or support-preference tags from this pack."
    ]
  };
}

function addAdminFields(raw) {
  const best = raw.bestCandidate || null;
  const batchKey = locationBatchKey(raw);
  const auditSeverity = raw.priority === "manual_compare_conflict" ? "high" : raw.priority === "ready_for_location_review" ? "medium" : "low";
  const sourceUrls = unique([
    raw.currentProvider?.website,
    raw.currentProvider?.source,
    best?.googleMapsUri,
    best?.website,
    ...(raw.queueItems || []).flatMap((item) => asArray(item.sourceUrls))
  ]);
  return {
    ...raw,
    reviewId: raw.packId,
    reviewCategory: "Location and distance evidence",
    reviewPriority: raw.priority,
    auditSeverity,
    batchKey,
    batchLabel: `${raw.issueType || "unknown"} / ${raw.priority || "unknown"} / ${best?.matchStrength || "no_candidate"} / ${raw.type || "unknown"}`,
    batchSuggestedAction: batchAction(raw),
    source: best?.googleMapsUri || best?.website || raw.currentProvider?.source || raw.currentProvider?.website || "",
    sourceQuality: best ? "Google Places public business listing; location corroboration only" : raw.currentProvider?.sourceQuality || "",
    sourceUrls,
    auditRules: unique(["location-distance-review-pack", raw.issueType, raw.priority, ...asArray(raw.queueItems).flatMap((item) => asArray(item.auditRules))]),
    auditFindings: [{
      rule: "location-distance-review-pack",
      severity: auditSeverity,
      issue: raw.reviewReasons.join(" "),
      suggestedFix: "Confirm public professional address/location evidence, then export reviewed location-only decisions."
    }],
    sourceEvidence: {
      ...(raw.sourceEvidence || {}),
      locationDistanceReview: [{
        field: "locationCandidate",
        value: best?.sourceUrl || raw.currentProvider?.address || "",
        sourceUrl: best?.sourceUrl || raw.currentProvider?.source || "",
        excerpt: best
          ? `Google Places location clue: ${best.name || "candidate"} at ${best.address || "address not supplied"}.`
          : "No linked coordinate candidate is available yet.",
        capturedAt: "",
        confidence: best?.matchStrength === "strong_match" ? "medium" : "low",
        needsManualReview: true
      }]
    },
    sourceEvidenceSummary: best
      ? compact(`Google Places candidate ${best.name || ""}; address ${best.address || ""}; signals ${asArray(best.matchSignals).join(", ")}.`)
      : "",
    publicCardPreviewText: [
      raw.name,
      `${raw.region || ""}${raw.city ? ` / ${raw.city}` : ""}`,
      raw.currentProvider?.address ? `Current address: ${raw.currentProvider.address}` : "Current address missing",
      hasCoords(raw.currentProvider) ? `Current coordinates: ${raw.currentProvider.lat}, ${raw.currentProvider.lon}` : "Current coordinates missing",
      best?.address ? `Candidate address: ${best.address}` : "",
      best && best.lat !== "" && best.lon !== "" ? `Candidate coordinates: ${best.lat}, ${best.lon}` : "",
      `Review action: ${raw.priority}`
    ].filter(Boolean).join("\n"),
    claimId: raw.packId,
    claimField: "locationDistanceEvidence",
    claimValue: raw.issueType,
    claimDecision: "review",
    claimRiskLevel: auditSeverity,
    requiredHumanAction: "Confirm the same public provider/location before applying address or coordinate fields.",
    correctedFields: raw.draftCorrectedFields,
    prefillCorrectedFields: raw.draftCorrectedFields,
    liveMutationAllowed: false
  };
}

function buildItem(provider, queueItems, candidates) {
  const assessed = candidates
    .map((candidate) => candidateAssessment(candidate, provider))
    .sort((a, b) => b.reviewScore - a.reviewScore || a.name.localeCompare(b.name));
  const best = assessed[0] || null;
  const issueType = issueTypeFor(provider, queueItems, assessed);
  const priority = priorityFor(issueType, best);
  const reasons = unique([
    ...queueItems.flatMap((item) => asArray(item.reviewReasons)),
    issueType === "missing_address" ? "Provider is distance-weighted but missing a public address." : "",
    issueType === "missing_coordinates" ? "Provider has a public address but no stored coordinates." : "",
    issueType === "coordinate_gap_candidate" ? "Google Places has a coordinate-gap candidate that needs human identity confirmation." : "",
    best ? `Best candidate match strength: ${best.matchStrength}.` : "No linked Google Places coordinate candidate is available yet."
  ]);

  return addAdminFields({
    packId: `location-pack:${provider.id}`,
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
    currentProvider: {
      id: provider.id || "",
      name: provider.name || "",
      type: provider.type || "",
      region: provider.region || "",
      city: provider.city || "",
      address: provider.address || "",
      lat: provider.lat ?? "",
      lon: provider.lon ?? "",
      coordinateSource: provider.coordinateSource || "",
      coordinatePrecision: provider.coordinatePrecision || "",
      coordinateConfidence: provider.coordinateConfidence || "",
      geocodeNeedsManualReview: provider.geocodeNeedsManualReview,
      website: provider.website || "",
      source: provider.source || "",
      sourceQuality: provider.sourceQuality || "",
      phone: provider.phone || ""
    },
    issueType,
    priority,
    reviewScore: best?.reviewScore || 0,
    reviewReasons: reasons,
    bestCandidate: best,
    candidates: assessed,
    queueItems: queueItems.map(compactQueueItem),
    draftCorrectedFields: best ? best.draftCorrectedFields : {},
    sourceExcerptRequired: true
  });
}

function summarizeBatches(items) {
  const byKey = new Map();
  for (const item of items) {
    const key = item.batchKey || locationBatchKey(item);
    if (!byKey.has(key)) {
      byKey.set(key, {
        batchKey: key,
        label: item.batchLabel || "",
        issueType: item.issueType || "",
        priority: item.priority || "",
        matchStrength: item.bestCandidate?.matchStrength || "no_candidate",
        type: item.type || "",
        count: 0,
        providerIds: new Set(),
        suggestedAction: item.batchSuggestedAction || batchAction(item)
      });
    }
    const batch = byKey.get(key);
    batch.count += 1;
    if (item.providerId) batch.providerIds.add(item.providerId);
  }
  return [...byKey.values()]
    .map((batch) => ({
      ...batch,
      providerCount: batch.providerIds.size,
      providerIds: undefined
    }))
    .sort((a, b) => b.count - a.count || a.batchKey.localeCompare(b.batchKey));
}

function countsBy(items, field) {
  return items.reduce((counts, item) => {
    const key = item[field] || "unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function readOrBuildReviewQueue(config) {
  if (!config.rebuildQueue && fs.existsSync(config.reviewQueue)) {
    return readJsonInput(config.reviewQueue, { items: [] });
  }
  return buildProviderReviewQueue({
    providers: config.providers,
    googlePlacesCandidates: config.googlePlacesCandidates,
    skipAuditRun: true
  });
}

export function buildLocationDistanceReviewPack(options = {}) {
  const config = { ...DEFAULTS, ...options };
  const providers = readJsonInput(config.providers, []);
  const reviewQueue = readOrBuildReviewQueue(config);
  const placesPayload = readJsonInput(config.googlePlacesCandidates, { candidates: [] });
  const providersById = new Map(asArray(providers).map((provider) => [provider.id, provider]));
  const queueByProviderId = new Map();
  const candidatesByProviderId = new Map();

  for (const item of asArray(reviewQueue.items)) {
    if (item.reviewCategory !== "Location and distance evidence") continue;
    if (!item.providerId || !providersById.has(item.providerId)) continue;
    if (!queueByProviderId.has(item.providerId)) queueByProviderId.set(item.providerId, []);
    queueByProviderId.get(item.providerId).push(item);
  }

  for (const candidate of asArray(placesPayload.candidates)) {
    if (!isCoordinateGapCandidate(candidate)) continue;
    for (const providerId of candidateProviderIds(candidate)) {
      if (!providersById.has(providerId)) continue;
      if (!candidatesByProviderId.has(providerId)) candidatesByProviderId.set(providerId, []);
      candidatesByProviderId.get(providerId).push(candidate);
    }
  }

  const providerIds = unique([...queueByProviderId.keys(), ...candidatesByProviderId.keys()]);
  let items = providerIds
    .map((providerId) => buildItem(providersById.get(providerId), queueByProviderId.get(providerId) || [], candidatesByProviderId.get(providerId) || []))
    .filter((item) => !config.region || item.region === config.region)
    .filter((item) => !config.type || item.type === config.type)
    .sort((a, b) => {
      const priorityRank = { ready_for_location_review: 0, manual_compare_conflict: 1, manual_compare_needed: 2, geocode_or_source_lookup: 3, source_lookup_needed: 4 };
      return (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9)
        || b.reviewScore - a.reviewScore
        || a.region.localeCompare(b.region)
        || a.type.localeCompare(b.type)
        || a.name.localeCompare(b.name);
    });

  if (Number.isFinite(config.limit) && config.limit > 0) items = items.slice(0, config.limit);
  const batches = summarizeBatches(items);

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    safety: {
      noLiveProviderMutation: true,
      reviewGateRequired: true,
      sourceExcerptRequiredBeforeApply: true,
      locationFieldsOnly: true,
      googlePlacesIsCorroborationOnly: true,
      noClinicalAvailabilityReferralOrSupportClaims: true
    },
    inputs: {
      providers: asArray(providers).length,
      providerReviewItems: asArray(reviewQueue.items).length,
      locationReviewItems: [...queueByProviderId.values()].flat().length,
      googlePlacesCandidates: asArray(placesPayload.candidates).length,
      coordinateGapCandidates: [...candidatesByProviderId.values()].flat().length
    },
    filters: {
      region: config.region || "",
      type: config.type || "",
      limit: config.limit || ""
    },
    summary: {
      total: items.length,
      byPriority: countsBy(items, "priority"),
      byIssueType: countsBy(items, "issueType"),
      byType: countsBy(items, "type"),
      withCandidate: items.filter((item) => item.bestCandidate).length,
      withDraftCorrectedFields: items.filter((item) => Object.keys(item.draftCorrectedFields || {}).length).length,
      batchCount: batches.length,
      batches
    },
    items
  };
}

function writeCsv(filePath, items) {
  const headers = [
    "packId",
    "providerId",
    "name",
    "type",
    "region",
    "city",
    "issueType",
    "priority",
    "batchKey",
    "currentAddress",
    "currentLat",
    "currentLon",
    "candidateName",
    "candidateAddress",
    "candidateLat",
    "candidateLon",
    "matchStrength",
    "matchSignals",
    "candidateSource",
    "draftCorrectedFields"
  ];
  const rows = items.map((item) => {
    const best = item.bestCandidate || {};
    return [
      item.packId,
      item.providerId,
      item.name,
      item.type,
      item.region,
      item.city,
      item.issueType,
      item.priority,
      item.batchKey,
      item.currentProvider?.address || "",
      item.currentProvider?.lat ?? "",
      item.currentProvider?.lon ?? "",
      best.name || "",
      best.address || "",
      best.lat ?? "",
      best.lon ?? "",
      best.matchStrength || "",
      best.matchSignals || [],
      best.googleMapsUri || best.website || "",
      item.draftCorrectedFields || {}
    ];
  });
  writeText(filePath, `${headers.join(",")}\n${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`);
}

function writeMarkdown(filePath, pack) {
  const lines = [
    "# Location And Distance Review Pack",
    "",
    `Generated: ${pack.generatedAt}`,
    "",
    "This pack is for human review only. It does not change `providers.json`, and it does not prove provider type, clinical scope, availability, referral pathway, cost, telehealth, or support-preference claims.",
    "",
    "## Summary",
    "",
    `- Review items: ${pack.summary.total}`,
    `- Items with candidate location evidence: ${pack.summary.withCandidate}`,
    `- Items with draft location fields: ${pack.summary.withDraftCorrectedFields}`,
    `- Review batches: ${pack.summary.batchCount}`,
    "",
    "## By Issue Type",
    "",
    "| Issue | Items |",
    "| --- | ---: |"
  ];

  for (const [issue, count] of Object.entries(pack.summary.byIssueType || {}).sort()) {
    lines.push(`| ${issue} | ${count} |`);
  }

  lines.push(
    "",
    "## Review Batches",
    "",
    "| Items | Providers | Batch | Suggested action |",
    "| ---: | ---: | --- | --- |"
  );
  for (const batch of asArray(pack.summary.batches).slice(0, 60)) {
    lines.push([
      batch.count,
      batch.providerCount,
      batch.batchKey,
      batch.suggestedAction
    ].map((cell) => compact(cell, 360).replace(/\|/g, "\\|")).join(" | ").replace(/^/, "| ").replace(/$/, " |"));
  }

  lines.push(
    "",
    "## Top Items",
    "",
    "| Priority | Provider | Type | Region / city | Current location | Candidate | Signals | Draft fields |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |"
  );
  for (const item of pack.items.slice(0, 160)) {
    const best = item.bestCandidate || {};
    lines.push([
      item.priority,
      `${item.providerId} - ${item.name}`,
      item.type,
      `${item.region} / ${item.city}`,
      [item.currentProvider?.address, item.currentProvider?.lat, item.currentProvider?.lon].filter(Boolean).join(" | "),
      best.name ? `${best.name} ${best.address || ""}` : "",
      asArray(best.matchSignals).join(", "),
      Object.keys(item.draftCorrectedFields || {}).join(", ")
    ].map((cell) => compact(cell, 360).replace(/\|/g, "\\|")).join(" | ").replace(/^/, "| ").replace(/$/, " |"));
  }

  lines.push(
    "",
    "## Safety",
    "",
    "- Google Places is only a location corroboration clue in this pack.",
    "- Apply only `address`, `lat`, `lon`, `coordinateSource`, `coordinatePrecision`, `coordinateConfidence`, and `geocodeNeedsManualReview` after human confirmation.",
    "- Do not approve clinical scope, availability, referral, cost, telehealth, cultural support, or provider type from this pack.",
    "- Use `npm run draft:location-distance` to create draft-only decisions after review, then apply through `npm run apply:review` and rerun validation."
  );
  writeText(filePath, `${lines.join("\n")}\n`);
}

export function writeLocationDistanceReviewPack(pack, config = {}) {
  const merged = { ...DEFAULTS, ...config };
  writeJson(merged.jsonOut, pack);
  writeCsv(merged.csvOut, pack.items);
  writeMarkdown(merged.mdOut, pack);
}

export function runCli(argv = process.argv.slice(2)) {
  const config = parseArgs(argv);
  const pack = buildLocationDistanceReviewPack(config);
  writeLocationDistanceReviewPack(pack, config);
  console.log(`Location/distance review pack: ${pack.summary.total} item(s), ${pack.summary.withCandidate} with candidate location evidence.`);
  console.log(`JSON: ${path.resolve(config.jsonOut)}`);
  console.log(`CSV: ${path.resolve(config.csvOut)}`);
  console.log(`Markdown: ${path.resolve(config.mdOut)}`);
  return pack;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
