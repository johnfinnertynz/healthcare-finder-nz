import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  confidenceByField,
  confidenceRank,
  evidenceItem,
  hashText,
  likelySameProvider,
  normaliseComparable,
  slugify,
  sourceDomain,
  sourceEvidenceShape,
  unique
} from "./lib/provider-evidence-scorer.mjs";

const DEFAULTS = {
  providers: "providers.json",
  regionalReport: "data/regional-data-quality-report.json",
  gpCorroborationQueue: "",
  apiKeyEnv: "GOOGLE_PLACES_API_KEY",
  apiKeyFile: "",
  jsonOut: "data/discovery/google-places-provider-candidates.json",
  csvOut: "data/discovery/google-places-provider-candidates.csv",
  mdOut: "GOOGLE_PLACES_PROVIDER_CANDIDATES.md",
  limitRegions: 5,
  limitQueries: 25,
  maxResultsPerQuery: 8,
  rateLimitMs: 300,
  radiusMeters: 25_000,
  noNetwork: false,
  mergeExisting: false
};

const REGION_CENTRES = {
  Northland: { city: "Whangarei", lat: -35.7251, lon: 174.3237 },
  Auckland: { city: "Auckland", lat: -36.8485, lon: 174.7633 },
  Waikato: { city: "Hamilton", lat: -37.787, lon: 175.2793 },
  "Bay of Plenty": { city: "Tauranga", lat: -37.6878, lon: 176.1651 },
  "Rotorua and Taupo": { city: "Rotorua", lat: -38.1368, lon: 176.2497 },
  "Tairawhiti / Gisborne": { city: "Gisborne", lat: -38.6623, lon: 178.0176 },
  "Tairawhiti": { city: "Gisborne", lat: -38.6623, lon: 178.0176 },
  "Tairāwhiti / Gisborne": { city: "Gisborne", lat: -38.6623, lon: 178.0176 },
  "Hawke's Bay": { city: "Napier", lat: -39.4928, lon: 176.912 },
  Taranaki: { city: "New Plymouth", lat: -39.0556, lon: 174.0752 },
  "Manawatu-Whanganui": { city: "Palmerston North", lat: -40.3523, lon: 175.6082 },
  "Manawatū-Whanganui": { city: "Palmerston North", lat: -40.3523, lon: 175.6082 },
  Wairarapa: { city: "Masterton", lat: -40.9511, lon: 175.6574 },
  Wellington: { city: "Wellington", lat: -41.2924, lon: 174.7787 },
  "Nelson, Marlborough and Tasman": { city: "Nelson", lat: -41.2706, lon: 173.284 },
  Canterbury: { city: "Christchurch", lat: -43.5321, lon: 172.6362 },
  "Canterbury / Christchurch": { city: "Christchurch", lat: -43.5321, lon: 172.6362 },
  "South Canterbury": { city: "Timaru", lat: -44.3969, lon: 171.2559 },
  "West Coast": { city: "Greymouth", lat: -42.4504, lon: 171.2108 },
  Otago: { city: "Dunedin", lat: -45.8788, lon: 170.5028 },
  Southland: { city: "Invercargill", lat: -46.4132, lon: 168.3538 }
};

const TYPE_QUERIES = {
  gp: ["GP clinic", "medical centre", "doctors"],
  psychologist: ["psychologist", "clinical psychologist"],
  psychiatrist: ["psychiatrist", "private psychiatrist"],
  counsellor: ["counsellor", "counselling", "therapist"]
};

const TYPE_PRIORITY = {
  psychiatrist: 1_000,
  psychologist: 800,
  counsellor: 650,
  gp: 450
};

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.businessStatus",
  "places.types",
  "places.googleMapsUri"
].join(",");

function parseArgs(argv = process.argv.slice(2)) {
  const config = { ...DEFAULTS };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--providers") config.providers = argv[++index];
    else if (arg === "--regional-report") config.regionalReport = argv[++index];
    else if (arg === "--gp-corroboration-queue") config.gpCorroborationQueue = argv[++index];
    else if (arg === "--api-key-file") config.apiKeyFile = argv[++index];
    else if (arg === "--api-key-env") config.apiKeyEnv = argv[++index];
    else if (arg === "--region") config.region = argv[++index];
    else if (arg === "--type") config.type = argv[++index];
    else if (arg === "--limit-regions") config.limitRegions = Number(argv[++index]);
    else if (arg === "--limit-queries") config.limitQueries = Number(argv[++index]);
    else if (arg === "--max-results-per-query") config.maxResultsPerQuery = Number(argv[++index]);
    else if (arg === "--rate-limit-ms") config.rateLimitMs = Number(argv[++index]);
    else if (arg === "--radius-meters") config.radiusMeters = Number(argv[++index]);
    else if (arg === "--json-out") config.jsonOut = argv[++index];
    else if (arg === "--csv-out") config.csvOut = argv[++index];
    else if (arg === "--md-out") config.mdOut = argv[++index];
    else if (arg === "--no-network") config.noNetwork = true;
    else if (arg === "--merge-existing") config.mergeExisting = true;
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

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath) || ".", { recursive: true });
  fs.writeFileSync(filePath, value);
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join("; ") : typeof value === "object" && value !== null ? JSON.stringify(value) : String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function splitTypes(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalisePhone(value) {
  return String(value || "").replace(/[^\d+]/g, "");
}

function addressToken(value) {
  return normaliseComparable(value).split(" ").slice(0, 6).join(" ");
}

function isSharedDirectoryDomain(domain = "") {
  return /(^|\.)healthpoint\.co\.nz$|(^|\.)google\.com$|(^|\.)maps\.google\.com$|(^|\.)doctorpricer\.co\.nz$|(^|\.)psychologytoday\.com$|(^|\.)nzccp\.co\.nz$/i.test(domain);
}

function distanceKm(aLat, aLon, bLat, bLon) {
  const values = [aLat, aLon, bLat, bLon].map(Number);
  if (values.some((value) => !Number.isFinite(value))) return "";
  const [lat1, lon1, lat2, lon2] = values.map((value) => value * Math.PI / 180);
  const deltaLat = lat2 - lat1;
  const deltaLon = lon2 - lon1;
  const h = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return Number((6_371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))).toFixed(1));
}

function meaningfulNameTokens(value = "") {
  const generic = new Set(["medical", "centre", "center", "clinic", "doctor", "doctors", "gp", "surgery", "health", "healthcare", "family", "limited", "ltd", "practice"]);
  return normaliseComparable(value)
    .split(" ")
    .filter((token) => token.length > 2 && !generic.has(token));
}

function namesCorroborate(placeName = "", providerName = "") {
  const place = normaliseComparable(placeName);
  const provider = normaliseComparable(providerName);
  if (!place || !provider) return false;
  if (place === provider || place.includes(provider) || provider.includes(place)) return true;
  const placeTokens = meaningfulNameTokens(placeName);
  const providerTokens = meaningfulNameTokens(providerName);
  if (!placeTokens.length || !providerTokens.length) return false;
  const overlap = providerTokens.filter((token) => placeTokens.includes(token)).length;
  return overlap >= Math.max(2, Math.ceil(providerTokens.length * 0.75));
}

function targetProviderSignals(place = {}, targetProvider = {}, queryItem = {}) {
  const phone = place.nationalPhoneNumber || place.internationalPhoneNumber || "";
  const name = place.displayName?.text || "";
  const address = place.formattedAddress || "";
  const distance = distanceKm(
    queryItem.center?.latitude,
    queryItem.center?.longitude,
    place.location?.latitude,
    place.location?.longitude
  );
  return unique([
    namesCorroborate(name, targetProvider.name || targetProvider.practiceName) ? "name" : "",
    phone && targetProvider.phone && normalisePhone(phone) === normalisePhone(targetProvider.phone) ? "phone" : "",
    address && targetProvider.address && addressToken(address) === addressToken(targetProvider.address) ? "address" : "",
    distance !== "" && distance <= 1 ? "near-target-location" : ""
  ]);
}

function readApiKey(config) {
  if (config.noNetwork) return "";
  const envValue = process.env[config.apiKeyEnv] || "";
  if (envValue.trim()) return envValue.trim();
  if (config.apiKeyFile && fs.existsSync(config.apiKeyFile)) {
    return fs.readFileSync(config.apiKeyFile, "utf8").trim();
  }
  return "";
}

function regionCentre(region) {
  return REGION_CENTRES[region] || REGION_CENTRES[normaliseRegionAlias(region)] || {
    city: region || "New Zealand",
    lat: -40.9006,
    lon: 174.886
  };
}

function normaliseRegionAlias(region) {
  const comparable = normaliseComparable(region);
  if (comparable.includes("tairawhiti") || comparable.includes("gisborne")) return "Tairawhiti / Gisborne";
  if (comparable.includes("canterbury christchurch")) return "Canterbury / Christchurch";
  if (comparable.includes("manawatu")) return "Manawatu-Whanganui";
  return region;
}

function typesForRegion(regionItem = {}, explicitTypes = []) {
  if (explicitTypes.length) return explicitTypes.filter((type) => TYPE_QUERIES[type]);
  const coverage = regionItem.coverage || {};
  const quality = regionItem.qualitySignals || {};
  const missing = new Set(coverage.missingSignals || []);
  const types = new Set();

  if ((quality.gpCorroborationTasks || 0) > 0 || (coverage.gp || 0) < 3) types.add("gp");
  if ((coverage.psychologist || 0) < 5 || (coverage.talkingTherapy || 0) < 5) types.add("psychologist");
  if ((coverage.counsellor || 0) < 5 || (coverage.talkingTherapy || 0) < 5) types.add("counsellor");
  if ((coverage.psychiatrist || 0) < 2 || [...missing].some((signal) => /psychiat/i.test(signal))) types.add("psychiatrist");
  if (!types.size) {
    types.add("psychologist");
    types.add("counsellor");
  }

  return [...types].sort((a, b) => TYPE_PRIORITY[b] - TYPE_PRIORITY[a]);
}

function priorityForPlan(regionItem = {}, type = "") {
  const quality = regionItem.qualitySignals || {};
  let score = regionItem.priorityScore || 0;
  score += TYPE_PRIORITY[type] || 0;
  if (type === "gp") score += Math.min((quality.gpCorroborationTasks || 0) * 20, 400);
  if (type === "psychiatrist" && regionItem.coverage?.psychiatrist === 0) score += 450;
  if (["psychologist", "counsellor"].includes(type) && (regionItem.coverage?.talkingTherapy || 0) < 5) score += 300;
  return score;
}

export function buildGooglePlacesDiscoveryPlan(options = {}) {
  const config = { ...DEFAULTS, ...options };
  const report = readJsonIfExists(config.regionalReport, { regions: [] });
  const explicitTypes = splitTypes(config.type);
  let regions = report.regions || [];
  if (config.region) regions = regions.filter((item) => item.region === config.region);
  regions = regions
    .filter((item) => item.region && item.region !== "National")
    .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0) || a.region.localeCompare(b.region));
  if (Number.isFinite(config.limitRegions) && config.limitRegions > 0) regions = regions.slice(0, config.limitRegions);

  const plan = [];
  for (const regionItem of regions) {
    const centre = regionCentre(regionItem.region);
    for (const type of typesForRegion(regionItem, explicitTypes)) {
      const queryTerms = TYPE_QUERIES[type] || [];
      for (const queryTerm of queryTerms) {
        plan.push({
          queryId: `places:${slugify(regionItem.region)}:${type}:${slugify(queryTerm)}`,
          region: regionItem.region,
          city: centre.city,
          type,
          textQuery: `${queryTerm} ${centre.city} ${regionItem.region} New Zealand`,
          center: { latitude: centre.lat, longitude: centre.lon },
          radiusMeters: config.radiusMeters,
          priorityScore: priorityForPlan(regionItem, type),
          regionPriorityLevel: regionItem.priorityLevel || "",
          reason: [
            regionItem.coverage?.missingSignals?.length ? `missing signals: ${regionItem.coverage.missingSignals.join("; ")}` : "",
            regionItem.qualitySignals?.gpCorroborationTasks ? `${regionItem.qualitySignals.gpCorroborationTasks} GP corroboration tasks` : "",
            "Google Places discovery/corroboration only"
          ].filter(Boolean).join(" | ")
        });
      }
    }
  }

  const seen = new Set();
  const uniquePlan = plan
    .sort((a, b) => b.priorityScore - a.priorityScore || a.textQuery.localeCompare(b.textQuery))
    .filter((item) => {
      const key = normaliseComparable(`${item.region} ${item.type} ${item.textQuery}`);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  if (Number.isFinite(config.limitQueries) && config.limitQueries > 0) return uniquePlan.slice(0, config.limitQueries);
  return uniquePlan;
}

function numberOrBlank(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : "";
}

function buildTextQueryFromGpTask(task = {}) {
  const name = task.name || "";
  const city = task.city || task.region || "";
  const phone = task.phone || "";
  return [name, city, phone, "GP medical centre New Zealand"]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildGooglePlacesPlanFromGpCorroborationQueue(options = {}) {
  const config = { ...DEFAULTS, ...options };
  const queue = readJsonIfExists(config.gpCorroborationQueue, { tasks: [] });
  const regionFilter = String(config.region || "").toLowerCase();
  let tasks = queue.tasks || [];
  if (regionFilter) tasks = tasks.filter((task) => String(task.region || "").toLowerCase() === regionFilter);
  tasks = tasks
    .filter((task) => task.providerId && task.name)
    .sort((a, b) =>
      (b.priorityScore || 0) - (a.priorityScore || 0)
      || a.region.localeCompare(b.region)
      || a.city.localeCompare(b.city)
      || a.name.localeCompare(b.name)
    );
  if (Number.isFinite(config.limitQueries) && config.limitQueries > 0) tasks = tasks.slice(0, config.limitQueries);

  return tasks.map((task) => {
    const lat = numberOrBlank(task.lat);
    const lon = numberOrBlank(task.lon);
    const centre = lat !== "" && lon !== ""
      ? { city: task.city || task.region || "New Zealand", lat, lon }
      : regionCentre(task.region);
    return {
      queryId: `places-gp-corroborate:${slugify(task.providerId)}`,
      region: task.region || "",
      city: task.city || centre.city || "",
      type: "gp",
      textQuery: buildTextQueryFromGpTask(task),
      center: { latitude: centre.lat, longitude: centre.lon },
      radiusMeters: lat !== "" && lon !== "" ? Math.min(config.radiusMeters, 8_000) : config.radiusMeters,
      priorityScore: task.priorityScore || 200,
      regionPriorityLevel: task.priority || "medium",
      targetProviderId: task.providerId || "",
      targetProviderName: task.name || "",
      reason: [
        "GP source corroboration task",
        task.reviewReason || "",
        task.missingFields?.length ? `missing fields: ${task.missingFields.join(", ")}` : "",
        "Google Places discovery/corroboration only"
      ].filter(Boolean).join(" | ")
    };
  });
}

function matchExistingProviders(place = {}, providers = []) {
  const phone = place.nationalPhoneNumber || place.internationalPhoneNumber || "";
  const domain = sourceDomain(place.websiteUri || "");
  const placeName = place.displayName?.text || "";
  const placeAddress = place.formattedAddress || "";
  const matches = [];

  for (const provider of providers) {
    const signals = [];
    if (phone && provider.phone && normalisePhone(phone) === normalisePhone(provider.phone)) signals.push("phone");
    const providerDomain = sourceDomain(provider.website || provider.source || "");
    if (domain && providerDomain === domain && !isSharedDirectoryDomain(domain)) signals.push("website-domain");
    if (placeName && normaliseComparable(placeName) === normaliseComparable(provider.name || provider.practiceName)) signals.push("name");
    if (placeAddress && provider.address && addressToken(placeAddress) && addressToken(placeAddress) === addressToken(provider.address)) signals.push("address");
    const providerSignals = {
      names: [placeName],
      practiceNames: [placeName],
      phones: [phone].filter(Boolean),
      websites: [domain].filter((value) => value && !isSharedDirectoryDomain(value)),
      addresses: [placeAddress].filter(Boolean)
    };
    if (!signals.length && !likelySameProvider(provider, providerSignals)) continue;
    matches.push({
      providerId: provider.id,
      name: provider.name || "",
      type: provider.type || "",
      region: provider.region || "",
      city: provider.city || "",
      signals: unique(signals.length ? signals : ["identity-signal"])
    });
  }

  return matches.slice(0, 5);
}

function claim(field, value, place, queryItem, confidence = "low", excerpt = "") {
  if (value === undefined || value === null || value === "") return null;
  const sourceUrl = place.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=Google%20Place%20${encodeURIComponent(place.id || "")}`;
  return evidenceItem({
    field,
    value,
    sourceUrl,
    sourceType: "google_places",
    excerpt: excerpt || `Google Places ${field}: ${value}`,
    capturedAt: new Date().toISOString(),
    confidence,
    extractor: "google-places-discovery",
    needsManualReview: true
  });
}

function claimKey(claimItem = {}) {
  return [
    claimItem.field || "",
    Array.isArray(claimItem.value) ? JSON.stringify(claimItem.value) : String(claimItem.value ?? ""),
    claimItem.sourceUrl || "",
    claimItem.sourceType || "",
    claimItem.extractor || ""
  ].join("|");
}

function dedupeClaims(claims = []) {
  const byKey = new Map();
  for (const claimItem of claims) {
    if (!claimItem) continue;
    const key = claimKey(claimItem);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, claimItem);
      continue;
    }
    byKey.set(key, {
      ...existing,
      ...claimItem,
      capturedAt: existing.capturedAt || claimItem.capturedAt,
      excerpt: existing.excerpt || claimItem.excerpt,
      confidence: confidenceRank[claimItem.confidence] > confidenceRank[existing.confidence] ? claimItem.confidence : existing.confidence
    });
  }
  return [...byKey.values()];
}

function dedupeExistingProviderMatches(matches = []) {
  const byProviderId = new Map();
  for (const match of matches) {
    if (!match?.providerId) continue;
    const existing = byProviderId.get(match.providerId);
    if (!existing) {
      byProviderId.set(match.providerId, { ...match, signals: unique(match.signals || []) });
      continue;
    }
    byProviderId.set(match.providerId, {
      ...existing,
      ...match,
      signals: unique([...(existing.signals || []), ...(match.signals || [])])
    });
  }
  return [...byProviderId.values()];
}

export function candidateFromGooglePlace(place = {}, queryItem = {}, providers = []) {
  const name = place.displayName?.text || "";
  const phone = place.nationalPhoneNumber || place.internationalPhoneNumber || "";
  const website = place.websiteUri || "";
  const address = place.formattedAddress || "";
  const lat = place.location?.latitude;
  const lon = place.location?.longitude;
  const distanceFromQueryKm = distanceKm(queryItem.center?.latitude, queryItem.center?.longitude, lat, lon);
  let existingMatches = dedupeExistingProviderMatches(matchExistingProviders(place, providers));
  let discardReason = "";
  if (queryItem.targetProviderId && !existingMatches.some((match) => match.providerId === queryItem.targetProviderId)) {
    const targetProvider = providers.find((provider) => provider.id === queryItem.targetProviderId);
    if (targetProvider) {
      const signals = targetProviderSignals(place, targetProvider, queryItem);
      const hasIdentitySignal = signals.some((signal) => ["name", "phone", "address"].includes(signal));
      if (hasIdentitySignal) {
        existingMatches.unshift({
          providerId: targetProvider.id,
          name: targetProvider.name || "",
          type: targetProvider.type || "",
          region: targetProvider.region || "",
          city: targetProvider.city || "",
          signals: unique(["gp-corroboration-target", ...signals])
        });
      } else {
        discardReason = "uncorroborated exact GP Places result: no target name, phone, or address match";
      }
    }
  }
  existingMatches = dedupeExistingProviderMatches(existingMatches);
  const sourceUrl = place.googleMapsUri || website || "";
  const claims = [
    claim("name", name, place, queryItem, "medium"),
    claim("practiceName", name, place, queryItem, "low"),
    claim("type", queryItem.type, place, queryItem, "low", `Search query type was ${queryItem.type}; reviewer must confirm provider type from a stronger source.`),
    claim("region", queryItem.region, place, queryItem, "low"),
    claim("city", queryItem.city, place, queryItem, "low"),
    claim("address", address, place, queryItem, "medium"),
    claim("lat", lat, place, queryItem, "medium"),
    claim("lon", lon, place, queryItem, "medium"),
    claim("phone", phone, place, queryItem, phone ? "medium" : "low"),
    claim("website", website, place, queryItem, website ? "medium" : "low"),
    claim("source", sourceUrl, place, queryItem, "low"),
    claim("businessStatus", place.businessStatus || "", place, queryItem, "low"),
    ...(place.types || []).map((type) => claim("placeType", type, place, queryItem, "low"))
  ].filter(Boolean);
  const confidence = confidenceByField(claims);
  const contactCount = [phone, website, sourceUrl].filter(Boolean).length;
  const action = existingMatches.length ? "corroborate_existing_provider" : "research_new_provider";
  const candidateId = place.id
    ? `google-place-${slugify(place.id.replace(/^places\//, ""))}`
    : `google-place-${hashText(`${name}|${address}|${queryItem.textQuery}`).slice(0, 16)}`;
  const suggestedProviderRecord = {
    id: `candidate-${slugify(name || candidateId).slice(0, 72)}`,
    name,
    clinicianName: "",
    practiceName: name,
    type: queryItem.type || "",
    region: queryItem.region || "",
    city: queryItem.city || "",
    address,
    lat: lat ?? "",
    lon: lon ?? "",
    coordinateSource: "google_places",
    coordinatePrecision: "business listing",
    coordinateConfidence: address ? "medium" : "low",
    geocodeNeedsManualReview: true,
    phone,
    email: "",
    website,
    source: sourceUrl,
    sourceQuality: "Google Places public business listing; discovery/corroboration only",
    confidence: contactCount >= 2 ? "medium" : "low",
    needsManualVerification: true,
    verified: "",
    lastVerified: "",
    availabilityStatus: "not_published",
    availabilityCheckedAt: "",
    availabilityEvidence: "",
    availabilitySource: "",
    availabilityNeedsManualReview: true,
    referralType: queryItem.type === "psychiatrist" ? "unknown" : "",
    referralNeedsManualReview: queryItem.type === "psychiatrist",
    tags: [],
    needScope: [],
    specialties: [],
    advertisedSpecialties: [],
    services: [],
    patientGroups: [],
    ageGroups: [],
    onlineAvailable: false,
    phoneSupport: Boolean(phone),
    inPerson: Boolean(address),
    crisisOnly: false,
    sourceEvidence: sourceEvidenceShape(claims),
    confidenceByField: confidence
  };

  return {
    candidateId,
    action,
    queryId: queryItem.queryId || "",
    query: queryItem.textQuery || "",
    type: queryItem.type || "",
    region: queryItem.region || "",
    city: queryItem.city || "",
    name,
    address,
    lat: lat ?? "",
    lon: lon ?? "",
    distanceFromQueryKm,
    phone,
    website,
    googlePlaceId: place.id || "",
    googleMapsUri: place.googleMapsUri || "",
    businessStatus: place.businessStatus || "",
    placeTypes: place.types || [],
    existingProviderMatches: existingMatches,
    possibleProviderIds: existingMatches.map((match) => match.providerId),
    duplicateSignals: unique(existingMatches.flatMap((match) => match.signals || [])),
    confidence: suggestedProviderRecord.confidence,
    confidenceByField: confidence,
    sourceEvidence: suggestedProviderRecord.sourceEvidence,
    suggestedProviderRecord,
    sourceUrlsUsed: unique([sourceUrl, website]),
    reviewReasons: unique([
      "Google Places is a discovery/corroboration source, not enough by itself for live recommendations.",
      "Confirm provider type, services, availability, cost, referral pathway, and support-preference tags from stronger public sources.",
      queryItem.reason || "",
      queryItem.targetProviderId ? `target GP source-corroboration provider: ${queryItem.targetProviderId}` : "",
      distanceFromQueryKm !== "" ? `Google Places result is ${distanceFromQueryKm} km from the query centre.` : "",
      discardReason,
      existingMatches.length ? `possible existing provider match: ${existingMatches.map((match) => match.providerId).join(", ")}` : "new candidate needs corroboration"
    ].filter(Boolean)),
    reviewGateRequired: true,
    liveMutationAllowed: false,
    discardReason,
    claims
  };
}

export function buildGooglePlacesCandidatesFromResults(resultsByQuery = [], providers = []) {
  const byPlace = new Map();
  for (const item of resultsByQuery) {
    const queryItem = item.queryItem || {};
    for (const place of item.places || []) {
      const candidate = candidateFromGooglePlace(place, queryItem, providers);
      if (candidate.discardReason) continue;
      const key = place.id || candidate.candidateId;
      const existing = byPlace.get(key);
      if (!existing) {
        byPlace.set(key, candidate);
        continue;
      }
      byPlace.set(key, {
        ...existing,
        query: unique([existing.query, candidate.query]).join(" | "),
        sourceUrlsUsed: unique([...existing.sourceUrlsUsed, ...candidate.sourceUrlsUsed]),
        reviewReasons: unique([...existing.reviewReasons, ...candidate.reviewReasons]),
        possibleProviderIds: unique([...existing.possibleProviderIds, ...candidate.possibleProviderIds]),
        existingProviderMatches: dedupeExistingProviderMatches([...existing.existingProviderMatches, ...candidate.existingProviderMatches]),
        claims: dedupeClaims([...existing.claims, ...candidate.claims])
      });
    }
  }
  return [...byPlace.values()]
    .map(normaliseGooglePlacesCandidateTypeConflict)
    .filter((candidate) => !candidate.discardReason)
    .sort((a, b) =>
      (b.action === "research_new_provider") - (a.action === "research_new_provider")
      || (TYPE_PRIORITY[b.type] || 0) - (TYPE_PRIORITY[a.type] || 0)
      || a.region.localeCompare(b.region)
      || a.name.localeCompare(b.name)
    );
}

export function mergeGooglePlacesCandidates(existingCandidates = [], newCandidates = []) {
  const byId = new Map();
  for (const candidate of existingCandidates) {
    if (!candidate?.candidateId) continue;
    byId.set(candidate.candidateId, candidate);
  }
  for (const candidate of newCandidates) {
    if (!candidate?.candidateId) continue;
    const existing = byId.get(candidate.candidateId);
    if (!existing) {
      byId.set(candidate.candidateId, candidate);
      continue;
    }
    byId.set(candidate.candidateId, {
      ...existing,
      ...candidate,
      query: unique([existing.query, candidate.query]).filter(Boolean).join(" | "),
      sourceUrlsUsed: unique([...(existing.sourceUrlsUsed || []), ...(candidate.sourceUrlsUsed || [])]),
      reviewReasons: unique([...(existing.reviewReasons || []), ...(candidate.reviewReasons || [])]),
      possibleProviderIds: unique([...(existing.possibleProviderIds || []), ...(candidate.possibleProviderIds || [])]),
      existingProviderMatches: dedupeExistingProviderMatches([...(existing.existingProviderMatches || []), ...(candidate.existingProviderMatches || [])]),
      duplicateSignals: unique([...(existing.duplicateSignals || []), ...(candidate.duplicateSignals || [])]),
      claims: dedupeClaims([...(existing.claims || []), ...(candidate.claims || [])])
    });
  }
  return [...byId.values()]
    .map(normaliseGooglePlacesCandidateTypeConflict)
    .filter((candidate) => !candidate.discardReason)
    .sort((a, b) =>
      (b.action === "research_new_provider") - (a.action === "research_new_provider")
      || (TYPE_PRIORITY[b.type] || 0) - (TYPE_PRIORITY[a.type] || 0)
      || a.region.localeCompare(b.region)
      || a.name.localeCompare(b.name)
    );
}

function hasStrongProviderMatchSignals(signals = []) {
  return signals.some((signal) => ["name", "phone", "address", "website-domain", "identity-signal"].includes(signal));
}

function normaliseGooglePlacesCandidateMatches(candidate = {}) {
  const candidateDomain = sourceDomain(candidate.website || candidate.suggestedProviderRecord?.website || candidate.source || "");
  const sharedDirectoryCandidate = isSharedDirectoryDomain(candidateDomain);
  const existingProviderMatches = (candidate.existingProviderMatches || [])
    .filter((match) => {
      const signals = match.signals || [];
      if (signals.includes("gp-corroboration-target") && !hasStrongProviderMatchSignals(signals)) return false;
      if (!sharedDirectoryCandidate) return true;
      return signals.some((signal) => signal !== "website-domain");
    });
  const possibleProviderIds = unique(existingProviderMatches.map((match) => match.providerId));
  const duplicateSignals = unique(existingProviderMatches.flatMap((match) => match.signals || []));
  const exactGpTargetQuery = /^places-gp-corroborate:/i.test(candidate.queryId || "")
    || (candidate.reviewReasons || []).some((reason) => /target GP source-corroboration provider:/i.test(reason));
  const targetProviderIds = unique((candidate.reviewReasons || [])
    .flatMap((reason) => [...String(reason).matchAll(/target GP source-corroboration provider:\s*([^;|,\s]+)/gi)].map((match) => match[1])));
  const targetMatched = targetProviderIds.length
    ? targetProviderIds.some((providerId) => possibleProviderIds.includes(providerId))
    : false;
  const discardReason = exactGpTargetQuery && targetProviderIds.length && possibleProviderIds.length && !targetMatched
    ? "uncorroborated exact GP Places result: matched a different provider, not the queued target"
    : exactGpTargetQuery && !possibleProviderIds.length
      ? "uncorroborated exact GP Places result: no target name, phone, or address match"
      : candidate.discardReason || "";
  const reviewReasons = unique([
    ...(candidate.reviewReasons || []).filter((reason) => !/^possible existing provider match:/i.test(reason)),
    discardReason,
    possibleProviderIds.length ? `possible existing provider match: ${possibleProviderIds.join(", ")}` : ""
  ]);
  return {
    ...candidate,
    action: possibleProviderIds.length ? "corroborate_existing_provider" : "research_new_provider",
    existingProviderMatches,
    possibleProviderIds,
    duplicateSignals,
    discardReason,
    reviewReasons,
    claims: dedupeClaims(candidate.claims || [])
  };
}

function normaliseGooglePlacesCandidateTypeConflict(candidate = {}) {
  candidate = normaliseGooglePlacesCandidateMatches(candidate);
  const queryTypes = unique((candidate.claims || [])
    .filter((claimItem) => claimItem.field === "type")
    .map((claimItem) => claimItem.value)
    .filter(Boolean));
  if (queryTypes.length <= 1) return candidate;
  const matchedProviderTypes = unique((candidate.existingProviderMatches || [])
    .map((match) => match.type)
    .filter(Boolean));
  const resolvedType = matchedProviderTypes.length === 1 ? matchedProviderTypes[0] : "unknown";
  return {
    ...candidate,
    type: resolvedType,
    suggestedProviderRecord: {
      ...(candidate.suggestedProviderRecord || {}),
      type: resolvedType
    },
    reviewReasons: unique([
      ...(candidate.reviewReasons || []),
      `conflicting Google Places search query types: ${queryTypes.join(", ")}; confirm provider type from a stronger source${matchedProviderTypes.length === 1 ? `; existing matched provider type kept as ${resolvedType}` : ""}`
    ])
  };
}

async function searchPlaces(queryItem, config, apiKey) {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK
    },
    body: JSON.stringify({
      textQuery: queryItem.textQuery,
      maxResultCount: Math.max(1, Math.min(config.maxResultsPerQuery, 20)),
      regionCode: "NZ",
      languageCode: "en",
      includePureServiceAreaBusinesses: true,
      locationBias: {
        circle: {
          center: queryItem.center,
          radius: queryItem.radiusMeters
        }
      }
    })
  });
  const text = await response.text();
  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const payload = JSON.parse(text);
      message = payload.error?.message || message;
    } catch {
      // Keep the HTTP status when the body is not JSON.
    }
    return { queryItem, ok: false, error: message, places: [] };
  }
  const payload = text ? JSON.parse(text) : {};
  return { queryItem, ok: true, places: payload.places || [] };
}

function writeCsv(filePath, candidates) {
  const headers = [
    "candidateId",
    "action",
    "type",
    "region",
    "city",
    "name",
    "address",
    "phone",
    "website",
    "googleMapsUri",
    "businessStatus",
    "possibleProviderIds",
    "duplicateSignals",
    "reviewReasons"
  ];
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${[
    headers.join(","),
    ...candidates.map((candidate) => headers.map((header) => csvEscape(candidate[header])).join(","))
  ].join("\n")}\n`);
}

function writeMarkdown(filePath, output) {
  const lines = [
    "# Google Places Provider Candidates",
    "",
    `Generated: ${output.generatedAt}`,
    "",
    "This report uses the official Google Places Text Search API, where configured, as a discovery and corroboration aid. It does not update `providers.json` and it must not be treated as proof of services, availability, referral pathway, cost, telehealth, or cultural safety.",
    "",
    "## Summary",
    "",
    `- Mode: ${output.mode}`,
    `- Search queries planned: ${output.searchPlan.length}`,
    `- Search queries run: ${output.stats.queriesRun}`,
    `- Places returned: ${output.stats.placesReturned}`,
    `- New candidates in this run: ${output.stats.newCandidates}`,
    `- Candidates found: ${output.candidates.length}`,
    `- Existing candidates merged: ${output.inputs.mergeExisting ? output.inputs.existingCandidates : 0}`,
    `- GP corroboration queue source: ${output.inputs.gpCorroborationQueue || "not used"}`,
    `- API errors: ${output.errors.length}`,
    `- API key stored in output: no`,
    "",
    "## Top Candidates",
    "",
    "| Action | Provider | Type | Region / city | Contact | Possible existing match |",
    "| --- | --- | --- | --- | --- | --- |"
  ];
  for (const candidate of output.candidates.slice(0, 100)) {
    const contact = [
      candidate.phone ? "phone" : "",
      candidate.website ? "website" : "",
      candidate.googleMapsUri ? "maps" : ""
    ].filter(Boolean).join(", ") || "none";
    lines.push(`| ${candidate.action} | ${String(candidate.name).replace(/\|/g, "\\|")} | ${candidate.type} | ${candidate.region} / ${candidate.city} | ${contact} | ${(candidate.possibleProviderIds || []).join(", ")} |`);
  }
  lines.push("", "## Planned Searches", "", "| Priority | Region | Type | Query |", "| --- | --- | --- | --- |");
  for (const query of output.searchPlan.slice(0, 150)) {
    lines.push(`| ${query.priorityScore} | ${query.region} | ${query.type} | ${query.textQuery.replace(/\|/g, "\\|")} |`);
  }
  if (output.errors.length) {
    lines.push("", "## API Errors", "", "| Query | Error |", "| --- | --- |");
    for (const error of output.errors) lines.push(`| ${error.query.replace(/\|/g, "\\|")} | ${error.error.replace(/\|/g, "\\|")} |`);
  }
  lines.push("", "## Safety Notes", "", "- Google Places is treated as a third-party business listing source.", "- Provider-owned, clinic-owned, Healthpoint, official register, or professional-directory evidence is still needed for clinical/service claims.", "- Do not infer accepting new clients, psychiatrist self-referral, telehealth, cultural tags, or specialties from a Places listing alone.");
  writeText(filePath, `${lines.join("\n")}\n`);
}

export async function discoverGooglePlacesProviders(options = {}) {
  const config = { ...DEFAULTS, ...options };
  const providers = readJsonIfExists(config.providers, []);
  const apiKey = readApiKey(config);
  const searchPlan = config.gpCorroborationQueue
    ? buildGooglePlacesPlanFromGpCorroborationQueue(config)
    : buildGooglePlacesDiscoveryPlan(config);
  const results = [];
  const errors = [];
  const mode = config.noNetwork || !apiKey ? "queue-only/no-network" : "official-google-places-api";

  if (apiKey) {
    for (const queryItem of searchPlan) {
      const result = await searchPlaces(queryItem, config, apiKey);
      if (result.ok) results.push(result);
      else errors.push({ query: queryItem.textQuery, error: result.error });
      await sleep(config.rateLimitMs);
    }
  }

  const discoveredCandidates = buildGooglePlacesCandidatesFromResults(results, providers);
  const existingOutput = config.mergeExisting ? readJsonIfExists(config.jsonOut, { candidates: [] }) : { candidates: [] };
  const candidates = (config.mergeExisting
    ? mergeGooglePlacesCandidates(existingOutput.candidates || [], discoveredCandidates)
    : discoveredCandidates)
    .map(normaliseGooglePlacesCandidateTypeConflict);
  const output = {
    version: 1,
    generatedAt: new Date().toISOString(),
    mode,
    safety: {
      officialApiOnly: true,
      noSearchHtmlScraping: true,
      noApiKeyInOutput: true,
      noLiveProviderMutation: true,
      reviewGateRequired: true,
      noClinicalClaimsFromPlacesAlone: true
    },
    inputs: {
      providers: providers.length,
      regionalReport: config.regionalReport,
      apiKeyPresent: Boolean(apiKey),
      apiKeySource: apiKey ? (config.apiKeyFile ? "file" : "environment") : "none",
      region: config.region || "",
      type: config.type || "",
      gpCorroborationQueue: config.gpCorroborationQueue || "",
      maxResultsPerQuery: config.maxResultsPerQuery,
      mergeExisting: Boolean(config.mergeExisting),
      existingCandidates: existingOutput.candidates?.length || 0
    },
    stats: {
      queriesPlanned: searchPlan.length,
      queriesRun: apiKey ? searchPlan.length : 0,
      placesReturned: results.reduce((total, result) => total + result.places.length, 0),
      newCandidates: discoveredCandidates.length,
      candidates: candidates.length
    },
    searchPlan,
    errors,
    candidates
  };

  writeJson(config.jsonOut, output);
  writeCsv(config.csvOut, candidates);
  writeMarkdown(config.mdOut, output);
  return output;
}

export async function runCli(argv = process.argv.slice(2)) {
  const config = parseArgs(argv);
  const output = await discoverGooglePlacesProviders(config);
  console.log(`Prepared ${output.candidates.length} Google Places provider candidates.`);
  console.log(`Search queries planned: ${output.searchPlan.length}; run: ${output.stats.queriesRun}; mode: ${output.mode}.`);
  if (output.errors.length) console.log(`API errors: ${output.errors.length}. See ${path.resolve(config.mdOut)}.`);
  console.log(`JSON: ${path.resolve(config.jsonOut)}`);
  console.log(`CSV: ${path.resolve(config.csvOut)}`);
  console.log(`Markdown: ${path.resolve(config.mdOut)}`);
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
