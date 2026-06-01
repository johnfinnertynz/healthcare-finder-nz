import fs from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import { extractProviderEvidence } from "./lib/provider-evidence-extractor.mjs";
import { fetchPublicSource } from "./lib/source-fetcher.mjs";
import { normaliseComparable, sourceTypeFromUrl } from "./lib/provider-evidence-scorer.mjs";

const DEFAULTS = {
  providers: "providers.json",
  gpCorroborationQueue: "data/gp-source-corroboration-queue.json",
  googlePlacesCandidates: "data/discovery/google-places-provider-candidates.json",
  jsonOut: "data/gp-corroboration-review-pack.json",
  csvOut: "data/gp-corroboration-review-pack.csv",
  mdOut: "GP_CORROBORATION_REVIEW_PACK.md",
  region: "",
  limit: Infinity,
  fetchSources: false,
  maxSourceFetches: 10,
  rateLimitMs: 1000,
  timeoutMs: 12_000
};

const STRONG_MATCH_SIGNALS = new Set(["name", "phone", "address", "website-domain", "gp-corroboration-target"]);
const USABLE_SOURCE_CATEGORIES = new Set(["practice_or_network_site", "healthpoint_gp_listing"]);

function parseArgs(argv = process.argv.slice(2)) {
  const config = { ...DEFAULTS };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--providers") config.providers = argv[++index];
    else if (arg === "--gp-corroboration-queue") config.gpCorroborationQueue = argv[++index];
    else if (arg === "--google-places-candidates") config.googlePlacesCandidates = argv[++index];
    else if (arg === "--json-out") config.jsonOut = argv[++index];
    else if (arg === "--csv-out") config.csvOut = argv[++index];
    else if (arg === "--md-out") config.mdOut = argv[++index];
    else if (arg === "--region") config.region = argv[++index];
    else if (arg === "--limit") config.limit = Number(argv[++index]);
    else if (arg === "--fetch-sources") config.fetchSources = true;
    else if (arg === "--max-source-fetches") config.maxSourceFetches = Number(argv[++index]);
    else if (arg === "--rate-limit-ms") config.rateLimitMs = Number(argv[++index]);
    else if (arg === "--timeout-ms") config.timeoutMs = Number(argv[++index]);
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

function compact(value, max = 280) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null && String(value).trim() !== ""))];
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join("; ") : typeof value === "object" && value !== null ? JSON.stringify(value) : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function hostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function sourceCategory(url) {
  const host = hostname(url);
  if (!host) return "missing";
  const pathPart = (() => {
    try {
      const parsed = new URL(url);
      return `${parsed.pathname} ${parsed.search}`.toLowerCase();
    } catch {
      return "";
    }
  })();
  if (/health365|manage-my-health|managemyhealth|connectmed/.test(host) || /login|logon|sign-in|signin|account|portal/.test(pathPart)) {
    return "booking_or_login_portal";
  }
  if (host.includes("healthpoint.co.nz")) return "healthpoint_gp_listing";
  if (host.includes("google.")) return "google_places_only";
  if (/doctorpricer|linkedin|facebook|instagram|psychologytoday/.test(host)) return "third_party_directory_or_social";
  return "practice_or_network_site";
}

function idsFromCandidate(candidate = {}) {
  const fromReasons = asArray(candidate.reviewReasons)
    .flatMap((reason) => [...String(reason).matchAll(/target GP source-corroboration provider:\s*([^;|,\s]+)/gi)].map((match) => match[1]));
  const fromMatches = asArray(candidate.existingProviderMatches).map((match) => match.providerId);
  return unique([
    ...asArray(candidate.possibleProviderIds),
    ...fromMatches,
    ...fromReasons
  ]);
}

function strongSignalCount(signals) {
  return unique(signals).filter((signal) => STRONG_MATCH_SIGNALS.has(signal)).length;
}

function candidateAssessment(candidate, provider) {
  const linkedProviderIds = idsFromCandidate(candidate);
  const conflictingProviderIds = linkedProviderIds.filter((id) => id !== provider.id);
  const signals = unique([
    ...asArray(candidate.duplicateSignals),
    ...asArray(candidate.existingProviderMatches).flatMap((match) => match.signals || [])
  ]);
  const sourceUrl = candidate.website || candidate.googleMapsUri || "";
  const category = sourceCategory(candidate.website || candidate.googleMapsUri || "");
  const usableSource = USABLE_SOURCE_CATEGORIES.has(category);
  const typeConflict = candidate.type && candidate.type !== "gp";
  const matchStrength = strongSignalCount(signals);
  const hasContactValue = Boolean(candidate.phone || candidate.website || candidate.address);
  let recommendedAction = "source_lookup_needed";

  if (typeConflict || conflictingProviderIds.length) {
    recommendedAction = "manual_compare_conflict";
  } else if (usableSource && matchStrength >= 2 && hasContactValue) {
    recommendedAction = "review_and_capture_source_excerpt";
  } else if (usableSource && hasContactValue) {
    recommendedAction = "open_source_and_compare";
  }

  const score = [
    recommendedAction === "review_and_capture_source_excerpt" ? 400 : 0,
    category === "practice_or_network_site" ? 120 : 0,
    category === "healthpoint_gp_listing" ? 90 : 0,
    matchStrength * 40,
    candidate.phone ? 30 : 0,
    candidate.website ? 30 : 0,
    candidate.address ? 20 : 0,
    typeConflict || conflictingProviderIds.length ? -250 : 0
  ].reduce((sum, value) => sum + value, 0);

  const draftCorrectedFields = {};
  if (["review_and_capture_source_excerpt", "open_source_and_compare"].includes(recommendedAction)) {
    if (!provider.website && candidate.website) draftCorrectedFields.website = candidate.website;
    if (!provider.phone && candidate.phone) draftCorrectedFields.phone = candidate.phone;
    if (!provider.address && candidate.address) draftCorrectedFields.address = candidate.address;
    if ((provider.lat === undefined || provider.lat === "" || provider.lon === undefined || provider.lon === "") && candidate.lat && candidate.lon) {
      draftCorrectedFields.lat = candidate.lat;
      draftCorrectedFields.lon = candidate.lon;
      draftCorrectedFields.coordinateSource = "google_places_candidate_pending_review";
      draftCorrectedFields.coordinatePrecision = "business listing";
      draftCorrectedFields.coordinateConfidence = "medium";
      draftCorrectedFields.geocodeNeedsManualReview = true;
    }
    if (candidate.website) {
      draftCorrectedFields.source = candidate.website;
      draftCorrectedFields.sourceQuality = category === "healthpoint_gp_listing"
        ? "Healthpoint GP listing; pending human source-excerpt review"
        : "practice or clinic network website; pending human source-excerpt review";
    }
  }

  return {
    candidateId: candidate.candidateId || "",
    name: candidate.name || "",
    type: candidate.type || "",
    phone: candidate.phone || "",
    website: candidate.website || "",
    googleMapsUri: candidate.googleMapsUri || "",
    address: candidate.address || "",
    lat: candidate.lat ?? "",
    lon: candidate.lon ?? "",
    businessStatus: candidate.businessStatus || "",
    sourceUrl,
    sourceCategory: category,
    linkedProviderIds,
    conflictingProviderIds,
    matchSignals: signals,
    matchStrength,
    recommendedAction,
    reviewScore: score,
    draftCorrectedFields,
    reviewNotes: [
      "Open the source URL in a browser before approving any adjustment.",
      "Capture a short excerpt showing the practice name plus phone, website, or address.",
      "Do not approve availability, enrolment status, mental-health services, cultural support, or funding claims from this pack."
    ]
  };
}

function adminSeverity(priority) {
  if (priority === "manual_compare_conflict") return "high";
  if (priority === "ready_for_source_capture") return "medium";
  return "low";
}

function addAdminReviewFields(item) {
  const best = item.bestCandidate || {};
  const sourceUrls = unique([
    best.website,
    best.googleMapsUri,
    item.currentProvider?.website,
    item.currentProvider?.source
  ]);
  const severity = adminSeverity(item.priority);
  return {
    ...item,
    reviewId: item.packId,
    reviewCategory: "GP source corroboration",
    reviewPriority: item.priority,
    auditSeverity: severity,
    type: "gp",
    source: best.website || item.currentProvider?.source || "",
    sourceQuality: best.sourceCategory || item.currentProvider?.sourceQuality || "",
    sourceUrls,
    auditRules: unique(["gp-corroboration-review-pack", item.recommendedAction]),
    auditFindings: [{
      rule: "gp-corroboration-review-pack",
      severity,
      issue: item.reviewReasons.join(" "),
      suggestedFix: "Open the source, capture an excerpt, then export reviewed decisions before applying provider-data changes."
    }],
    sourceEvidence: {
      ...(item.sourceEvidence || {}),
      gpCorroborationReview: [{
        field: "candidateSource",
        value: best.website || best.googleMapsUri || "",
        sourceUrl: best.website || best.googleMapsUri || "",
        excerpt: "Review-pack candidate only. Human source excerpt is still required before approval.",
        capturedAt: "",
        confidence: item.priority === "ready_for_source_capture" ? "medium" : "low",
        needsManualReview: true
      }]
    },
    publicCardPreviewText: [
      item.name,
      `${item.region || ""}${item.city ? ` / ${item.city}` : ""}`,
      item.currentProvider?.address,
      item.currentProvider?.phone ? `Current phone: ${item.currentProvider.phone}` : "",
      item.currentProvider?.website ? `Current website: ${item.currentProvider.website}` : "Current website missing",
      best.phone ? `Candidate phone: ${best.phone}` : "",
      best.website ? `Candidate website: ${best.website}` : "",
      `Review action: ${item.recommendedAction}`
    ].filter(Boolean).join("\n"),
    claimId: item.packId,
    claimField: "gpSourceCorroboration",
    claimValue: best.sourceCategory || "missing",
    claimDecision: "review",
    claimRiskLevel: severity,
    requiredHumanAction: "Open the candidate source and capture an excerpt before using draft corrected fields.",
    correctedFields: item.draftCorrectedFields,
    prefillCorrectedFields: item.draftCorrectedFields,
    ...(item.suggestedSourceExcerpt ? { sourceExcerpt: item.suggestedSourceExcerpt } : {})
  };
}

function claimMatchesExpectedProvider(claim, item) {
  const expected = [
    item.name,
    item.currentProvider?.phone,
    item.currentProvider?.address,
    item.bestCandidate?.name,
    item.bestCandidate?.phone,
    item.bestCandidate?.address,
    item.bestCandidate?.website
  ].map(normaliseComparable).filter(Boolean);
  const value = normaliseComparable(Array.isArray(claim.value) ? claim.value.join(" ") : claim.value);
  const excerpt = normaliseComparable(claim.excerpt || "");
  return expected.some((candidate) => {
    if (!candidate) return false;
    return (value && (value.includes(candidate) || candidate.includes(value)))
      || (excerpt && excerpt.includes(candidate));
  });
}

function selectSourceClaims(claims, item) {
  const usefulFields = new Set(["name", "practiceName", "phone", "website", "address"]);
  const usefulClaims = claims.filter((claim) => usefulFields.has(claim.field));
  const matching = usefulClaims.filter((claim) => claimMatchesExpectedProvider(claim, item));
  return (matching.length ? matching : usefulClaims).slice(0, 8);
}

function sourceCaptureSummary(fetchResult, item, claims = []) {
  if (!fetchResult.ok) {
    return {
      status: fetchResult.blocked ? "blocked" : fetchResult.skipped ? "skipped" : "failed",
      requestedUrl: fetchResult.url || item.bestCandidate?.sourceUrl || "",
      finalUrl: fetchResult.finalUrl || fetchResult.url || "",
      capturedAt: fetchResult.capturedAt || "",
      statusCode: fetchResult.status || 0,
      error: fetchResult.error || "",
      sourceHash: fetchResult.sourceHash || "",
      claims: [],
      suggestedSourceExcerpt: ""
    };
  }

  const selectedClaims = selectSourceClaims(claims, item);
  const suggested = selectedClaims.find((claim) => claim.excerpt)?.excerpt || "";
  return {
    status: "captured",
    requestedUrl: fetchResult.url || item.bestCandidate?.sourceUrl || "",
    finalUrl: fetchResult.finalUrl || fetchResult.url || "",
    capturedAt: fetchResult.capturedAt || "",
    statusCode: fetchResult.status || 0,
    error: "",
    sourceHash: fetchResult.sourceHash || "",
    claims: selectedClaims,
    suggestedSourceExcerpt: suggested
  };
}

function attachSourceCapture(item, capture) {
  const claims = capture.claims || [];
  return addAdminReviewFields({
    ...item,
    sourceCapture: capture,
    suggestedSourceExcerpt: capture.suggestedSourceExcerpt || item.suggestedSourceExcerpt || "",
    reviewReasons: unique([
      ...asArray(item.reviewReasons),
      capture.status === "captured" ? "Automated source fetch captured reviewable public excerpts; human confirmation is still required." : "",
      capture.status && capture.status !== "captured" ? `Automated source fetch ${capture.status}: ${capture.error || "no excerpt captured"}.` : ""
    ]),
    sourceEvidence: {
      ...(item.sourceEvidence || {}),
      sourceCapture: claims
    }
  });
}

export async function enrichGpCorroborationReviewPackWithSourceExcerpts(pack, options = {}) {
  const fetchSource = options.fetchSource || ((url) => fetchPublicSource(url, {
    timeoutMs: options.timeoutMs,
    maxBytes: options.maxBytes
  }));
  let fetched = 0;
  const maxFetches = Number.isFinite(options.maxSourceFetches) ? options.maxSourceFetches : DEFAULTS.maxSourceFetches;
  const rateLimitMs = options.rateLimitMs ?? DEFAULTS.rateLimitMs;
  const items = [];

  for (const item of pack.items || []) {
    const url = item.bestCandidate?.sourceUrl || item.bestCandidate?.website || "";
    const canFetch = item.priority === "ready_for_source_capture"
      && USABLE_SOURCE_CATEGORIES.has(item.bestCandidate?.sourceCategory)
      && url
      && fetched < maxFetches;
    if (!canFetch) {
      items.push(item);
      continue;
    }

    let fetchResult;
    try {
      fetchResult = await fetchSource(url, item);
    } catch (error) {
      fetchResult = {
        url,
        finalUrl: url,
        capturedAt: new Date().toISOString(),
        ok: false,
        blocked: false,
        skipped: false,
        status: 0,
        contentType: "",
        error: error.message,
        text: "",
        sourceHash: ""
      };
    }
    fetched += 1;
    const claims = fetchResult.ok
      ? extractProviderEvidence({
        html: fetchResult.text,
        text: fetchResult.text,
        url: fetchResult.finalUrl || url,
        sourceType: sourceTypeFromUrl(fetchResult.finalUrl || url),
        capturedAt: fetchResult.capturedAt,
        region: item.region,
        city: item.city,
        type: "gp"
      })
      : [];
    items.push(attachSourceCapture(item, sourceCaptureSummary(fetchResult, item, claims)));
    if (rateLimitMs > 0 && fetched < maxFetches) await delay(rateLimitMs);
  }

  return {
    ...pack,
    sourceFetch: {
      enabled: true,
      fetched,
      maxSourceFetches: maxFetches,
      rateLimitMs,
      safety: "Captured snippets are review aids only and do not approve live provider data."
    },
    summary: {
      ...pack.summary,
      sourcePagesFetched: fetched,
      sourceCaptures: items.filter((item) => item.sourceCapture?.status === "captured").length,
      sourceCaptureFailures: items.filter((item) => item.sourceCapture && item.sourceCapture.status !== "captured").length
    },
    items
  };
}

function emptyPackItem(task, provider) {
  return addAdminReviewFields({
    packId: `gp-pack:${provider.id || task.providerId}`,
    providerId: provider.id || task.providerId || "",
    name: provider.name || task.name || "",
    region: provider.region || task.region || "",
    city: provider.city || task.city || "",
    currentProvider: {
      phone: provider.phone || task.phone || "",
      website: provider.website || task.website || "",
      address: provider.address || task.address || "",
      source: provider.source || task.source || "",
      sourceQuality: provider.sourceQuality || task.sourceQuality || ""
    },
    missingFields: task.missingFields || [],
    priority: "source_lookup_needed",
    reviewScore: 0,
    recommendedAction: "source_lookup_needed",
    reviewReasons: unique([task.reviewReason || "", "No linked Google Places or stronger source candidate is available yet."]),
    bestCandidate: null,
    candidates: [],
    draftCorrectedFields: {},
    sourceExcerptRequired: true,
    liveMutationAllowed: false
  });
}

function packItem(task, provider, candidates) {
  if (!candidates.length) return emptyPackItem(task, provider);
  const assessed = candidates
    .map((candidate) => candidateAssessment(candidate, provider))
    .sort((a, b) => b.reviewScore - a.reviewScore || a.name.localeCompare(b.name));
  const best = assessed[0];
  const priority = best.recommendedAction === "review_and_capture_source_excerpt"
    ? "ready_for_source_capture"
    : best.recommendedAction === "manual_compare_conflict"
      ? "manual_compare_conflict"
      : "source_lookup_needed";

  return addAdminReviewFields({
    packId: `gp-pack:${provider.id || task.providerId}`,
    providerId: provider.id || task.providerId || "",
    name: provider.name || task.name || "",
    region: provider.region || task.region || "",
    city: provider.city || task.city || "",
    currentProvider: {
      phone: provider.phone || task.phone || "",
      website: provider.website || task.website || "",
      address: provider.address || task.address || "",
      source: provider.source || task.source || "",
      sourceQuality: provider.sourceQuality || task.sourceQuality || ""
    },
    missingFields: task.missingFields || [],
    priority,
    reviewScore: best.reviewScore,
    recommendedAction: best.recommendedAction,
    reviewReasons: unique([
      task.reviewReason || "",
      best.recommendedAction === "review_and_capture_source_excerpt" ? "Strong linked candidate found; human source excerpt still required." : "",
      best.recommendedAction === "manual_compare_conflict" ? "Candidate links to more than one provider or has a provider-type conflict." : ""
    ]),
    bestCandidate: best,
    candidates: assessed,
    draftCorrectedFields: best.draftCorrectedFields,
    sourceExcerptRequired: true,
    liveMutationAllowed: false
  });
}

function matchesRegion(item, region) {
  return !region || item.region === region;
}

function sortItems(items) {
  const priorityRank = { ready_for_source_capture: 0, manual_compare_conflict: 1, source_lookup_needed: 2 };
  return items.sort((a, b) =>
    priorityRank[a.priority] - priorityRank[b.priority]
    || b.reviewScore - a.reviewScore
    || a.region.localeCompare(b.region)
    || a.name.localeCompare(b.name)
  );
}

function countsBy(items, field) {
  return items.reduce((counts, item) => {
    const key = item[field] || "unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

export function buildGpCorroborationReviewPack(options = {}) {
  const config = { ...DEFAULTS, ...options };
  const providers = readJsonInput(config.providers, []);
  const queue = readJsonInput(config.gpCorroborationQueue, { tasks: [] });
  const placesPayload = readJsonInput(config.googlePlacesCandidates, { candidates: [] });
  const providersById = new Map(asArray(providers).map((provider) => [provider.id, provider]));
  const candidatesByProviderId = new Map();

  for (const candidate of asArray(placesPayload.candidates)) {
    for (const providerId of idsFromCandidate(candidate)) {
      if (!candidatesByProviderId.has(providerId)) candidatesByProviderId.set(providerId, []);
      candidatesByProviderId.get(providerId).push(candidate);
    }
  }

  let items = asArray(queue.tasks)
    .map((task) => {
      const provider = providersById.get(task.providerId) || task;
      return packItem(task, provider, candidatesByProviderId.get(task.providerId) || []);
    })
    .filter((item) => matchesRegion(item, config.region));

  items = sortItems(items);
  if (Number.isFinite(config.limit) && config.limit > 0) items = items.slice(0, config.limit);

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    safety: {
      noLiveProviderMutation: true,
      reviewGateRequired: true,
      sourceExcerptRequiredBeforeApply: true,
      neverInferAvailabilityOrMentalHealthScope: true
    },
    inputs: {
      providers: asArray(providers).length,
      gpCorroborationTasks: asArray(queue.tasks).length,
      googlePlacesCandidates: asArray(placesPayload.candidates).length
    },
    filters: {
      region: config.region || "",
      limit: config.limit || ""
    },
    summary: {
      total: items.length,
      byPriority: countsBy(items, "priority"),
      readyForSourceCapture: items.filter((item) => item.priority === "ready_for_source_capture").length,
      conflicts: items.filter((item) => item.priority === "manual_compare_conflict").length,
      sourceLookupNeeded: items.filter((item) => item.priority === "source_lookup_needed").length,
      withDraftCorrectedFields: items.filter((item) => Object.keys(item.draftCorrectedFields || {}).length).length
    },
    items
  };
}

function writeCsv(filePath, items) {
  const headers = [
    "packId",
    "providerId",
    "name",
    "region",
    "city",
    "priority",
    "recommendedAction",
    "missingFields",
    "currentPhone",
    "candidatePhone",
    "currentWebsite",
    "candidateWebsite",
    "sourceCategory",
    "matchSignals",
    "conflictingProviderIds",
    "sourceCaptureStatus",
    "sourceCaptureFinalUrl",
    "suggestedSourceExcerpt",
    "draftCorrectedFields"
  ];
  const rows = items.map((item) => {
    const best = item.bestCandidate || {};
    return [
      item.packId,
      item.providerId,
      item.name,
      item.region,
      item.city,
      item.priority,
      item.recommendedAction,
      item.missingFields,
      item.currentProvider?.phone || "",
      best.phone || "",
      item.currentProvider?.website || "",
      best.website || "",
      best.sourceCategory || "",
      best.matchSignals || [],
      best.conflictingProviderIds || [],
      item.sourceCapture?.status || "",
      item.sourceCapture?.finalUrl || "",
      item.suggestedSourceExcerpt || "",
      item.draftCorrectedFields || {}
    ];
  });
  writeText(filePath, `${headers.join(",")}\n${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`);
}

function writeMarkdown(filePath, pack) {
  const lines = [
    "# GP Corroboration Review Pack",
    "",
    `Generated: ${pack.generatedAt}`,
    "",
    "This pack is for human review only. It does not change `providers.json`, and it does not prove availability, enrolment, mental-health scope, cultural support, or funding.",
    "",
    "## Summary",
    "",
    `- Review items: ${pack.summary.total}`,
    `- Ready for source capture: ${pack.summary.readyForSourceCapture}`,
    `- Manual compare conflicts: ${pack.summary.conflicts}`,
    `- Source lookup needed: ${pack.summary.sourceLookupNeeded}`,
    `- Items with draft corrected fields: ${pack.summary.withDraftCorrectedFields}`,
    ...(pack.sourceFetch?.enabled ? [
      `- Source pages fetched: ${pack.summary.sourcePagesFetched || 0}`,
      `- Source captures: ${pack.summary.sourceCaptures || 0}`,
      `- Source capture failures: ${pack.summary.sourceCaptureFailures || 0}`
    ] : []),
    "",
    "## How To Use",
    "",
    "1. Open the candidate source, preferring practice-owned pages or Healthpoint GP listings.",
    "2. Confirm the practice name and contact details match the existing provider.",
    "3. Capture a short source excerpt before using any draft corrected fields.",
    "4. Apply changes only through reviewed decision JSON and `npm run apply:review`.",
    "",
    "## Top Items",
    "",
    "| Priority | Provider | Region / city | Candidate | Source | Signals | Capture | Draft fields |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |"
  ];

  for (const item of pack.items.slice(0, 120)) {
    const best = item.bestCandidate || {};
    lines.push([
      item.priority,
      `${item.providerId} - ${item.name}`,
      `${item.region} / ${item.city}`,
      best.name || "",
      best.website || best.googleMapsUri || "",
      asArray(best.matchSignals).join(", "),
      item.sourceCapture?.status || "",
      Object.keys(item.draftCorrectedFields || {}).join(", ")
    ].map((cell) => compact(cell, 360).replace(/\|/g, "\\|")).join(" | ").replace(/^/, "| ").replace(/$/, " |"));
  }

  lines.push("", "No item in this report is safe to apply without a human-captured source excerpt.", "");
  writeText(filePath, lines.join("\n"));
}

export function writeGpCorroborationReviewPack(pack, config = {}) {
  const merged = { ...DEFAULTS, ...config };
  writeJson(merged.jsonOut, pack);
  writeCsv(merged.csvOut, pack.items);
  writeMarkdown(merged.mdOut, pack);
}

export async function runCli(argv = process.argv.slice(2)) {
  const config = parseArgs(argv);
  let pack = buildGpCorroborationReviewPack(config);
  if (config.fetchSources) {
    pack = await enrichGpCorroborationReviewPackWithSourceExcerpts(pack, config);
  }
  writeGpCorroborationReviewPack(pack, config);
  console.log(`GP corroboration review pack: ${pack.summary.total} item(s), ${pack.summary.readyForSourceCapture} ready for source capture.`);
  if (pack.sourceFetch?.enabled) {
    console.log(`Source captures: ${pack.summary.sourceCaptures || 0}/${pack.summary.sourcePagesFetched || 0} fetched.`);
  }
  console.log(`JSON: ${path.resolve(config.jsonOut)}`);
  console.log(`CSV: ${path.resolve(config.csvOut)}`);
  console.log(`Markdown: ${path.resolve(config.mdOut)}`);
  return pack;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runCli();
}
