import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  confidenceByField,
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
  noNetwork: false
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
    if (domain && providerDomain === domain) signals.push("website-domain");
    if (placeName && normaliseComparable(placeName) === normaliseComparable(provider.name || provider.practiceName)) signals.push("name");
    if (placeAddress && provider.address && addressToken(placeAddress) && addressToken(placeAddress) === addressToken(provider.address)) signals.push("address");
    const providerSignals = {
      names: [placeName],
      practiceNames: [placeName],
      phones: [phone].filter(Boolean),
      websites: [domain].filter(Boolean),
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

export function candidateFromGooglePlace(place = {}, queryItem = {}, providers = []) {
  const name = place.displayName?.text || "";
  const phone = place.nationalPhoneNumber || place.internationalPhoneNumber || "";
  const website = place.websiteUri || "";
  const address = place.formattedAddress || "";
  const lat = place.location?.latitude;
  const lon = place.location?.longitude;
  const existingMatches = matchExistingProviders(place, providers);
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
      existingMatches.length ? `possible existing provider match: ${existingMatches.map((match) => match.providerId).join(", ")}` : "new candidate needs corroboration"
    ].filter(Boolean)),
    reviewGateRequired: true,
    liveMutationAllowed: false,
    claims
  };
}

export function buildGooglePlacesCandidatesFromResults(resultsByQuery = [], providers = []) {
  const byPlace = new Map();
  for (const item of resultsByQuery) {
    const queryItem = item.queryItem || {};
    for (const place of item.places || []) {
      const candidate = candidateFromGooglePlace(place, queryItem, providers);
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
        existingProviderMatches: [...existing.existingProviderMatches, ...candidate.existingProviderMatches],
        claims: [...existing.claims, ...candidate.claims]
      });
    }
  }
  return [...byPlace.values()].sort((a, b) =>
    (b.action === "research_new_provider") - (a.action === "research_new_provider")
    || TYPE_PRIORITY[b.type] - TYPE_PRIORITY[a.type]
    || a.region.localeCompare(b.region)
    || a.name.localeCompare(b.name)
  );
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
    `- Candidates found: ${output.candidates.length}`,
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
  const searchPlan = buildGooglePlacesDiscoveryPlan(config);
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

  const candidates = buildGooglePlacesCandidatesFromResults(results, providers);
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
      maxResultsPerQuery: config.maxResultsPerQuery
    },
    stats: {
      queriesPlanned: searchPlan.length,
      queriesRun: apiKey ? searchPlan.length : 0,
      placesReturned: results.reduce((total, result) => total + result.places.length, 0),
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
