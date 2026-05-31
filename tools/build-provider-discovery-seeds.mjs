import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { slugify, unique } from "./lib/provider-evidence-scorer.mjs";

const DEFAULTS = {
  providers: "providers.json",
  providerSources: "provider-sources.json",
  reviewQueue: "data/provider-review-queue.json",
  sourceFitAudit: "data/provider-source-fit-audit.json",
  availabilityAudit: "data/provider-availability-audit.json",
  referralAudit: "data/provider-psychiatrist-referral-audit.json",
  discoveryQueue: "data/discovery/provider-search-queue.json",
  googlePlacesCandidates: "data/discovery/google-places-provider-candidates.json",
  manualSeeds: "data/discovery/manual-provider-discovery-seeds.json",
  out: "data/discovery/provider-discovery-seeds.json"
};

const priorityByType = {
  psychiatrist: 95,
  psychologist: 90,
  counsellor: 80,
  gp: 45,
  addiction: 75,
  youth: 70,
  "public-service": 65,
  directory: 35
};

function parseArgs(argv = process.argv.slice(2)) {
  const config = { ...DEFAULTS };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--providers") config.providers = argv[++index];
    else if (arg === "--review-queue") config.reviewQueue = argv[++index];
    else if (arg === "--region") config.region = argv[++index];
    else if (arg === "--type") config.type = argv[++index];
    else if (arg === "--limit") config.limit = Number(argv[++index]);
    else if (arg === "--manual-seeds") config.manualSeeds = argv[++index];
    else if (arg === "--google-places-candidates") config.googlePlacesCandidates = argv[++index];
    else if (arg === "--out") config.out = argv[++index];
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

function seedId(parts) {
  return slugify(parts.filter(Boolean).join("-")).slice(0, 140);
}

function providerPriority(provider = {}, reasons = []) {
  let score = priorityByType[provider.type] || 50;
  if (provider.needsManualVerification) score += 12;
  if (provider.confidence === "low") score += 12;
  if (provider.type !== "gp" && (!provider.address || provider.lat === "" || provider.lon === "")) score += 8;
  if (provider.availabilityNeedsManualReview || provider.referralNeedsManualReview) score += 10;
  if (reasons.some((reason) => /high|critical|unsupported|missing|conflict|referral|availability/i.test(reason))) score += 12;
  return Math.max(1, Math.min(100, score));
}

function providerSeed(provider, reasons = ["existing provider enrichment"]) {
  return {
    seedId: `provider:${provider.id}`,
    region: provider.region || "",
    city: provider.city || "",
    suburb: "",
    type: provider.type || "",
    providerType: provider.type || "",
    knownProviderName: provider.name || "",
    knownClinicianName: provider.clinicianName || "",
    knownPracticeName: provider.practiceName || "",
    knownAddress: provider.address || "",
    knownPhone: provider.phone || "",
    knownEmail: provider.email || "",
    knownWebsite: provider.website || "",
    knownSourceUrl: provider.source || provider.website || "",
    possibleProviderId: provider.id || "",
    reason: unique(reasons).join("; "),
    priority: providerPriority(provider, reasons),
    source: "providers.json"
  };
}

function indexProviders(providers) {
  return new Map(providers.map((provider) => [provider.id, provider]));
}

function addSeed(map, seed) {
  if (!seed) return;
  if (seed.region === undefined) seed.region = "";
  if (seed.city === undefined) seed.city = "";
  const id = seed.seedId || `manual:${seedId([seed.region, seed.city, seed.providerType || seed.type, seed.knownProviderName, seed.knownClinicianName, seed.knownPracticeName, seed.knownSourceUrl])}`;
  const existing = map.get(id);
  if (existing) {
    existing.reason = unique([existing.reason, seed.reason]).join("; ");
    existing.priority = Math.max(existing.priority || 0, seed.priority || 0);
    existing.source = unique([existing.source, seed.source]).join("; ");
    return;
  }
  map.set(id, { ...seed, seedId: id });
}

function addAuditSeeds(map, providersById, audit, sourceName) {
  for (const finding of audit.findings || []) {
    const providerId = finding.providerId || finding.id || "";
    const provider = providersById.get(providerId);
    if (!provider) continue;
    addSeed(map, providerSeed(provider, [`${sourceName}: ${finding.severity || "low"} ${finding.rule || "audit"} - ${finding.issue || finding.message || ""}`]));
  }
}

function addReviewQueueSeeds(map, providersById, reviewQueue) {
  for (const item of reviewQueue.items || []) {
    const provider = providersById.get(item.providerId);
    if (provider) {
      addSeed(map, providerSeed(provider, [`review queue ${item.reviewPriority || ""}: ${(item.reviewReasons || []).join("; ")}`]));
      continue;
    }
    addSeed(map, {
      seedId: `review:${item.reviewId || item.providerId || item.name}`,
      region: item.region || "",
      city: item.city || "",
      type: item.type || "",
      providerType: item.type || "",
      knownProviderName: item.name || "",
      knownClinicianName: item.clinicianName || "",
      knownPracticeName: item.practiceName || "",
      knownAddress: item.address || "",
      knownPhone: item.phone || "",
      knownEmail: item.email || "",
      knownWebsite: item.website || "",
      knownSourceUrl: item.source || item.website || "",
      possibleProviderId: item.providerId || "",
      reason: `review queue candidate: ${(item.reviewReasons || []).join("; ")}`,
      priority: priorityByType[item.type] || 60,
      source: "provider review queue"
    });
  }
}

function addDiscoveryPlaceSeeds(map, discoveryQueue) {
  const seen = new Set();
  for (const item of discoveryQueue.queue || []) {
    const key = `${item.appRegion}|${item.place}|${item.serviceType}`;
    if (seen.has(key)) continue;
    seen.add(key);
    addSeed(map, {
      seedId: `place:${seedId([item.appRegion, item.place, item.serviceType])}`,
      region: item.appRegion || "",
      city: item.place || item.searchName || "",
      type: item.serviceType || "",
      providerType: item.serviceType || "",
      reason: "thin/local coverage discovery place search",
      priority: priorityByType[item.serviceType] || 55,
      source: "provider search queue"
    });
  }
}

function addGooglePlacesCandidateSeeds(map, placesPayload) {
  for (const candidate of placesPayload.candidates || []) {
    const record = candidate.suggestedProviderRecord || {};
    const possibleProviderId = candidate.possibleProviderIds?.[0] || "";
    const reviewText = (candidate.reviewReasons || []).join(" ");
    const type = record.type || candidate.type || "";
    const isGpCorroborationLead = type === "gp" && (/GP source corroboration/i.test(reviewText) || /^gp-/.test(possibleProviderId));
    const basePriority = priorityByType[type] || 65;
    addSeed(map, {
      seedId: `google-places:${candidate.candidateId || seedId([candidate.region, candidate.city, candidate.type, candidate.name])}`,
      region: record.region || candidate.region || "",
      city: record.city || candidate.city || "",
      suburb: "",
      type,
      providerType: type,
      knownProviderName: record.name || candidate.name || "",
      knownClinicianName: record.clinicianName || "",
      knownPracticeName: record.practiceName || candidate.name || "",
      knownAddress: record.address || candidate.address || "",
      knownPhone: record.phone || candidate.phone || "",
      knownEmail: record.email || "",
      knownWebsite: record.website || candidate.website || "",
      knownSourceUrl: record.website || candidate.website || record.source || candidate.googleMapsUri || "",
      possibleProviderId: possibleProviderId || record.id || candidate.candidateId || "",
      reason: unique([
        "Google Places discovery candidate; corroborate with provider-owned, Healthpoint, official register, or professional-directory evidence before live use",
        ...(candidate.reviewReasons || [])
      ]).join("; "),
      priority: Math.min(100, basePriority + (isGpCorroborationLead ? 35 : possibleProviderId ? 8 : 15)),
      source: "google places candidate export"
    });
  }
}

function addManualSeeds(map, manualSeeds) {
  const items = Array.isArray(manualSeeds) ? manualSeeds : manualSeeds.seeds || [];
  for (const seed of items) {
    addSeed(map, {
      ...seed,
      seedId: seed.seedId || `manual:${seedId([seed.region, seed.city, seed.providerType || seed.type, seed.knownProviderName, seed.knownClinicianName, seed.knownPracticeName])}`,
      providerType: seed.providerType || seed.type || "",
      reason: seed.reason || "manual discovery seed",
      priority: seed.priority || 80,
      source: seed.source || "manual seed file"
    });
  }
}

function applyFilters(seeds, config) {
  let filtered = seeds;
  if (config.region) filtered = filtered.filter((seed) => seed.region === config.region);
  if (config.type) filtered = filtered.filter((seed) => (seed.providerType || seed.type) === config.type);
  filtered = filtered.sort((a, b) => (b.priority || 0) - (a.priority || 0) || a.seedId.localeCompare(b.seedId));
  if (Number.isFinite(config.limit) && config.limit > 0) filtered = filtered.slice(0, config.limit);
  return filtered;
}

export function buildProviderDiscoverySeeds(config = {}) {
  const merged = { ...DEFAULTS, ...config };
  const providers = readJsonIfExists(merged.providers, []);
  const providersById = indexProviders(providers);
  const sourceFit = readJsonIfExists(merged.sourceFitAudit, { findings: [] });
  const availability = readJsonIfExists(merged.availabilityAudit, { findings: [] });
  const referrals = readJsonIfExists(merged.referralAudit, { findings: [] });
  const reviewQueue = readJsonIfExists(merged.reviewQueue, { items: [] });
  const discoveryQueue = readJsonIfExists(merged.discoveryQueue, { queue: [] });
  const googlePlacesCandidates = readJsonIfExists(merged.googlePlacesCandidates, { candidates: [] });
  const manualSeeds = readJsonIfExists(merged.manualSeeds, { seeds: [] });
  const providerSources = readJsonIfExists(merged.providerSources, {});

  const seedMap = new Map();
  for (const provider of providers) addSeed(seedMap, providerSeed(provider));
  addAuditSeeds(seedMap, providersById, sourceFit, "source-fit");
  addAuditSeeds(seedMap, providersById, availability, "availability");
  addAuditSeeds(seedMap, providersById, referrals, "psychiatrist-referral");
  addReviewQueueSeeds(seedMap, providersById, reviewQueue);
  addDiscoveryPlaceSeeds(seedMap, discoveryQueue);
  addGooglePlacesCandidateSeeds(seedMap, googlePlacesCandidates);
  addManualSeeds(seedMap, manualSeeds);

  const seeds = applyFilters([...seedMap.values()], merged);
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    note: "Discovery seeds are public-provider-data starting points only. Enrichment and suggestions remain review-gated before live provider data changes.",
    safety: {
      noPrivateAccounts: true,
      noSearchHtmlScraping: true,
      noBlockedSourceBypass: true,
      noAcceptingFromSilence: true
    },
    inputs: {
      providers: providers.length,
      sourceFitFindings: sourceFit.findings?.length || 0,
      availabilityFindings: availability.findings?.length || 0,
      referralFindings: referrals.findings?.length || 0,
      reviewQueueItems: reviewQueue.items?.length || 0,
      discoveryQueueItems: discoveryQueue.queue?.length || 0,
      googlePlacesCandidates: googlePlacesCandidates.candidates?.length || 0,
      manualSeeds: Array.isArray(manualSeeds) ? manualSeeds.length : manualSeeds.seeds?.length || 0,
      configuredLiveSources: Object.keys(providerSources.liveSources || {}).filter((key) => providerSources.liveSources[key]).length
    },
    filters: {
      region: merged.region || "",
      type: merged.type || "",
      limit: merged.limit || ""
    },
    seeds
  };
}

export function runCli(argv = process.argv.slice(2)) {
  const config = parseArgs(argv);
  const output = buildProviderDiscoverySeeds(config);
  writeJson(config.out, output);
  console.log(`Built ${output.seeds.length} provider discovery seeds.`);
  console.log(`JSON: ${path.resolve(config.out)}`);
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
