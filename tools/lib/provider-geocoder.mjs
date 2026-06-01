import fs from "node:fs";
import path from "node:path";

function readJson(filePath, fallback) {
  return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf8")) : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasCoords(provider) {
  return provider.lat !== undefined && provider.lon !== undefined && provider.lat !== "" && provider.lon !== "";
}

export function isNewZealandCoordinate(lat, lon) {
  const numericLat = Number(lat);
  const numericLon = Number(lon);
  if (!Number.isFinite(numericLat) || !Number.isFinite(numericLon)) return false;

  const latInNzRange = numericLat >= -53 && numericLat <= -28;
  const lonInMainNzRange = numericLon >= 165 && numericLon <= 180;
  const lonInChathamRange = numericLon >= -180 && numericLon <= -175;
  return latInNzRange && (lonInMainNzRange || lonInChathamRange);
}

function isRemote(provider) {
  const text = `${provider.name || ""} ${provider.address || ""} ${(provider.tags || []).join(" ")}`.toLowerCase();
  return /online|telehealth|phone|video|national/.test(text);
}

function cacheKey(value) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function addressParts(provider) {
  return [
    provider.address,
    provider.city,
    provider.region && provider.region !== "National" ? provider.region : "",
    "New Zealand"
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

export function geocodableAddress(provider) {
  if (hasCoords(provider) || isRemote(provider)) return "";

  const address = String(provider.address || "").trim();
  if (!address) return "";

  const enoughDetail = address.split(/\s+/).length >= 2 || provider.city || provider.region;
  if (!enoughDetail) return "";

  const parts = addressParts(provider);
  const query = [...new Set(parts)].join(", ");
  return /new zealand|aotearoa/i.test(query) ? query : `${query}, New Zealand`;
}

export function loadGeocodeConfig(configPath = "provider-sources.json") {
  const config = readJson(configPath, {});
  const geocoding = config.geocoding || {};
  return {
    cachePath: geocoding.cachePath || "data/geocode-cache.json",
    rateLimitMs: Number(geocoding.rateLimitMs ?? 1100),
    userAgent: geocoding.userAgent || "CareFinderAotearoa/1.0",
    configPath
  };
}

function nominatimPrecision(result = {}) {
  const addresstype = String(result.addresstype || result.type || "").toLowerCase();
  const placeRank = Number(result.place_rank);
  if (["house", "building", "amenity", "clinic", "doctors", "office", "shop", "healthcare"].includes(addresstype)) {
    return "address geocode";
  }
  if (["road", "street", "suburb", "neighbourhood", "quarter"].includes(addresstype)) {
    return "street/locality geocode";
  }
  if (["city", "town", "village", "locality", "municipality"].includes(addresstype) || (Number.isFinite(placeRank) && placeRank <= 18)) {
    return "locality geocode";
  }
  return "address geocode";
}

export function coordinateMetadataFromSource(source, options = {}) {
  const sourceText = String(source || "");
  const sourceLower = sourceText.toLowerCase();
  let coordinatePrecision = "coordinate source unspecified";
  let coordinateConfidence = "low";

  if (/doctorpricer|google[_\s-]?places|business listing/.test(sourceLower)) {
    coordinatePrecision = "business listing";
    coordinateConfidence = "medium";
  } else if (/ranzcp|professional directory/.test(sourceLower)) {
    coordinatePrecision = "professional directory listing";
    coordinateConfidence = "medium";
  } else if (/fhir|provider export/.test(sourceLower)) {
    coordinatePrecision = "official provider export";
    coordinateConfidence = "medium";
  } else if (/city-level|locality/.test(sourceLower)) {
    coordinatePrecision = "locality geocode";
    coordinateConfidence = "low";
  } else if (/openstreetmap|nominatim/.test(sourceLower)) {
    coordinatePrecision = /approximate|street-level/.test(sourceLower) ? "street/locality geocode" : "address geocode";
    coordinateConfidence = coordinatePrecision === "address geocode" ? "medium" : "low";
  }

  return {
    coordinatePrecision,
    coordinateConfidence,
    geocodeNeedsManualReview: options.needsManualReview !== false
  };
}

export function coordinateMetadataForNominatim(result = {}, fetchedDate = new Date().toISOString().slice(0, 10)) {
  const coordinatePrecision = nominatimPrecision(result);
  const coordinateConfidence = coordinatePrecision === "address geocode" ? "medium" : "low";
  return {
    coordinateSource: `OpenStreetMap Nominatim ${fetchedDate}`,
    coordinatePrecision,
    coordinateConfidence,
    geocodeNeedsManualReview: true
  };
}

async function fetchGeocode(query, userAgent) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "nz");
  url.searchParams.set("q", query);

  const response = await fetch(url, {
    headers: {
      "accept": "application/json",
      "user-agent": userAgent
    }
  });

  if (!response.ok) {
    throw new Error(`Nominatim request failed: ${response.status} ${response.statusText}`);
  }

  const matches = await response.json();
  const match = matches[0];
  return match
    ? {
        lat: Number(match.lat),
        lon: Number(match.lon),
        displayName: match.display_name,
        addresstype: match.addresstype,
        type: match.type,
        place_rank: match.place_rank
      }
    : { lat: "", lon: "", displayName: "" };
}

export async function geocodeProviderRecords(providers, options = {}) {
  const config = loadGeocodeConfig(options.configPath);
  const cache = readJson(config.cachePath, {});
  const today = options.today || new Date().toISOString().slice(0, 10);
  const providerIds = options.providerIds ? new Set(options.providerIds) : null;
  const limit = Number.isFinite(options.limit) ? options.limit : Infinity;
  const logs = [];
  const summary = {
    checked: 0,
    updated: 0,
    skipped: 0,
    noMatch: 0,
    outsideNz: 0,
    failed: 0,
    logs
  };
  const geocodeFetcher = options.fetchGeocode || fetchGeocode;

  for (const provider of providers) {
    if (providerIds && !providerIds.has(provider.id)) continue;

    const query = geocodableAddress(provider);
    if (!query) {
      summary.skipped += 1;
      continue;
    }

    if (summary.checked >= limit) break;
    summary.checked += 1;

    try {
      const key = cacheKey(query);
      let result = cache[key];

      if (!result) {
        result = await geocodeFetcher(query, config.userAgent);
        result.fetched = today;
        cache[key] = result;
        await sleep(config.rateLimitMs);
      }

      if (Number.isFinite(result.lat) && Number.isFinite(result.lon)) {
        if (!isNewZealandCoordinate(result.lat, result.lon)) {
          summary.outsideNz += 1;
          logs.push(`OUTSIDE_NZ ${provider.id} ${provider.name} -> ${result.lat},${result.lon}`);
          continue;
        }

        provider.lat = result.lat;
        provider.lon = result.lon;
        Object.assign(provider, coordinateMetadataForNominatim(result, result.fetched || today));
        summary.updated += 1;
        logs.push(`GEOCODED ${provider.id} ${provider.name} -> ${Math.round(result.lat * 10000) / 10000},${Math.round(result.lon * 10000) / 10000}`);
      } else {
        summary.noMatch += 1;
        logs.push(`NO_MATCH ${provider.id} ${provider.name}`);
      }
    } catch (error) {
      summary.failed += 1;
      logs.push(`GEOCODE_FAILED ${provider.id} ${provider.name}: ${error.message}`);
      if (!options.failSoft) throw error;
    }
  }

  if (!options.dryRun) {
    fs.mkdirSync(path.dirname(config.cachePath), { recursive: true });
    fs.writeFileSync(config.cachePath, `${JSON.stringify(cache, null, 2)}\n`);
  }

  return summary;
}

export async function geocodeProviderFile(providersPath = "providers.json", options = {}) {
  const providers = readJson(providersPath, []);
  const summary = await geocodeProviderRecords(providers, options);

  if (!options.dryRun) {
    fs.writeFileSync(providersPath, `${JSON.stringify(providers, null, 2)}\n`);
  }

  return summary;
}
