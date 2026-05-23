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
    rateLimitMs: Number(geocoding.rateLimitMs || 1100),
    userAgent: geocoding.userAgent || "CareFinderAotearoa/1.0",
    configPath
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
        displayName: match.display_name
      }
    : { lat: "", lon: "", displayName: "" };
}

export async function geocodeProviderRecords(providers, options = {}) {
  const config = loadGeocodeConfig(options.configPath);
  const cache = readJson(config.cachePath, {});
  const today = new Date().toISOString().slice(0, 10);
  const providerIds = options.providerIds ? new Set(options.providerIds) : null;
  const limit = Number.isFinite(options.limit) ? options.limit : Infinity;
  const logs = [];
  const summary = {
    checked: 0,
    updated: 0,
    skipped: 0,
    noMatch: 0,
    failed: 0,
    logs
  };

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
        result = await fetchGeocode(query, config.userAgent);
        result.fetched = today;
        cache[key] = result;
        await sleep(config.rateLimitMs);
      }

      if (Number.isFinite(result.lat) && Number.isFinite(result.lon)) {
        provider.lat = result.lat;
        provider.lon = result.lon;
        provider.coordinateSource = `OpenStreetMap Nominatim ${today}`;
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
