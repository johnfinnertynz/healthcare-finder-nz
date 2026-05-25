import fs from "node:fs";
import path from "node:path";

const DEFAULT_WIKI_URL = "https://en.wikipedia.org/wiki/List_of_populated_places_in_New_Zealand";
const DEFAULT_OUT_DIR = "data/discovery";
const DEFAULT_PAGES = 3;
const DEFAULT_RESULTS_PER_PAGE = 10;
const DEFAULT_RATE_LIMIT_MS = 1200;

const serviceSearches = [
  {
    serviceType: "gp",
    queryTerms: [
      "GP doctors medical centre",
      "general practice family doctor"
    ]
  },
  {
    serviceType: "psychologist",
    queryTerms: [
      "psychologist clinical psychologist",
      "psychologist therapy"
    ]
  },
  {
    serviceType: "psychiatrist",
    queryTerms: [
      "psychiatrist private psychiatry",
      "psychiatry specialist"
    ]
  },
  {
    serviceType: "counsellor",
    queryTerms: [
      "counsellor therapist counselling",
      "counselling mental health therapist"
    ]
  }
];

const appRegionMap = new Map([
  ["Auckland", "Auckland"],
  ["Northland", "Northland"],
  ["Waikato", "Waikato"],
  ["Bay of Plenty", "Bay of Plenty"],
  ["Gisborne", "Tairawhiti"],
  ["Taranaki", "Taranaki"],
  ["Hawke's Bay", "Hawke's Bay"],
  ["Manawatu-Whanganui", "Manawatu-Whanganui"],
  ["Manawatū-Whanganui", "Manawatu-Whanganui"],
  ["Wellington", "Wellington"],
  ["Nelson", "Nelson Marlborough Tasman"],
  ["Marlborough", "Nelson Marlborough Tasman"],
  ["Tasman", "Nelson Marlborough Tasman"],
  ["West Coast", "West Coast"],
  ["Canterbury", "Canterbury"],
  ["Otago", "Otago"],
  ["Southland", "Southland"]
]);

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const runSearches = args.includes("--run-searches");
const outDir = stringOption("--out-dir", DEFAULT_OUT_DIR);
const placesUrl = stringOption("--places-url", DEFAULT_WIKI_URL);
const pages = numberOption("--pages", DEFAULT_PAGES);
const rateLimitMs = numberOption("--rate-limit-ms", DEFAULT_RATE_LIMIT_MS);
const limitPlaces = numberOption("--limit-places", Infinity);
const limitSearches = numberOption("--limit-searches", Infinity);
const placeFilters = optionValues("--place").map(normaliseComparable);
const generatedAt = new Date().toISOString();

function optionValues(name) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === name && args[index + 1] && !args[index + 1].startsWith("--")) {
      values.push(args[index + 1]);
      index += 1;
    }
  }
  return values;
}

function stringOption(name, fallback) {
  const index = args.indexOf(name);
  return index === -1 || !args[index + 1] || args[index + 1].startsWith("--") ? fallback : args[index + 1];
}

function numberOption(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1 || !args[index + 1] || args[index + 1].startsWith("--")) return fallback;
  const value = Number(args[index + 1]);
  return Number.isFinite(value) ? value : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ndash;|&minus;/gi, "-");
}

function stripHtml(value) {
  return decodeHtml(String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<sup[\s\S]*?<\/sup>/gi, " ")
    .replace(/<span[^>]*display:\s*none[\s\S]*?<\/span>/gi, " ")
    .replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function normaliseComparable(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugify(value) {
  return normaliseComparable(value).replace(/\s+/g, "-");
}

function parsePopulation(value) {
  const number = Number(String(value || "").replace(/[^0-9]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function normaliseRegion(value) {
  const region = stripHtml(value)
    .replace("Gisborne Region", "Gisborne")
    .replace("Auckland Region", "Auckland")
    .replace("Wellington Region", "Wellington")
    .replace("Canterbury, New Zealand", "Canterbury");
  return appRegionMap.get(region) || region;
}

function placeSearchNames(name) {
  const cleanName = stripHtml(name).replace(/\s*-\s*/g, "-");
  const ascii = cleanName.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const pieces = cleanName
    .split(/\s*-\s*/)
    .map((piece) => piece.trim())
    .filter(Boolean);
  const aliases = [
    cleanName,
    ascii,
    ...pieces,
    ...pieces.map((piece) => piece.normalize("NFKD").replace(/[\u0300-\u036f]/g, ""))
  ]
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  return [...new Set(aliases)].slice(0, 4);
}

function parsePlacesFromWikipedia(html) {
  const rows = [];
  const rowPattern = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowPattern.exec(html))) {
    const cells = [];
    const cellPattern = /<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
    let cellMatch;
    while ((cellMatch = cellPattern.exec(rowMatch[1]))) {
      cells.push(stripHtml(cellMatch[1]));
    }

    if (cells.length < 4 || !/^\d+$/.test(cells[0])) continue;
    const rank = Number(cells[0]);
    const name = cells[1];
    const wikiRegion = cells[2];
    if (!name || !wikiRegion) continue;

    rows.push({
      rank,
      name,
      searchNames: placeSearchNames(name),
      wikiRegion,
      appRegion: normaliseRegion(wikiRegion),
      populationJune2025: parsePopulation(cells[3]),
      source: placesUrl
    });
  }

  return rows;
}

async function fetchPlaces() {
  const response = await fetch(placesUrl, {
    headers: {
      accept: "text/html",
      "user-agent": "CareFinderAotearoa/1.0 provider discovery queue"
    }
  });

  if (!response.ok) {
    throw new Error(`Could not fetch populated places: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const places = parsePlacesFromWikipedia(html);
  if (!places.length) throw new Error("No populated places could be parsed from the Wikipedia table.");
  return places;
}

function searchUrl(engine, query, page) {
  const offset = (page - 1) * DEFAULT_RESULTS_PER_PAGE;
  if (engine === "google") {
    const url = new URL("https://www.google.com/search");
    url.searchParams.set("q", query);
    url.searchParams.set("start", String(offset));
    return url.toString();
  }

  const url = new URL("https://www.bing.com/search");
  url.searchParams.set("q", query);
  url.searchParams.set("first", String(offset + 1));
  return url.toString();
}

function buildQueue(places) {
  const queue = [];
  for (const place of places) {
    for (const searchName of place.searchNames) {
      for (const service of serviceSearches) {
        for (const terms of service.queryTerms) {
          const query = `${searchName} ${terms} NZ`;
          for (const engine of ["google", "bing"]) {
            for (let page = 1; page <= pages; page += 1) {
              queue.push({
                id: `${slugify(place.name)}-${service.serviceType}-${slugify(terms)}-${slugify(searchName)}-${engine}-p${page}`,
                place: place.name,
                searchName,
                wikiRegion: place.wikiRegion,
                appRegion: place.appRegion,
                serviceType: service.serviceType,
                query,
                engine,
                page,
                url: searchUrl(engine, query, page),
                source: place.source
              });
            }
          }
        }
      }
    }
  }
  return queue;
}

function filterPlaces(places) {
  const filtered = placeFilters.length
    ? places.filter((place) => {
        const candidates = [place.name, ...place.searchNames].map(normaliseComparable);
        return placeFilters.some((filter) => candidates.includes(filter));
      })
    : places;

  return filtered.slice(0, limitPlaces);
}

async function googleSearch(item) {
  const apiKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CSE_ID;
  if (!apiKey || !cx) return null;

  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", item.query);
  url.searchParams.set("start", String((item.page - 1) * DEFAULT_RESULTS_PER_PAGE + 1));
  url.searchParams.set("num", String(DEFAULT_RESULTS_PER_PAGE));

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Google Custom Search failed: ${response.status} ${response.statusText}`);
  const payload = await response.json();
  return (payload.items || []).map((result, index) => ({
    position: (item.page - 1) * DEFAULT_RESULTS_PER_PAGE + index + 1,
    title: result.title || "",
    url: result.link || "",
    snippet: result.snippet || ""
  }));
}

async function bingSearch(item) {
  const apiKey = process.env.BING_WEB_SEARCH_KEY || process.env.BING_SEARCH_KEY;
  if (!apiKey) return null;

  const url = new URL("https://api.bing.microsoft.com/v7.0/search");
  url.searchParams.set("q", item.query);
  url.searchParams.set("count", String(DEFAULT_RESULTS_PER_PAGE));
  url.searchParams.set("offset", String((item.page - 1) * DEFAULT_RESULTS_PER_PAGE));
  url.searchParams.set("mkt", "en-NZ");
  url.searchParams.set("safeSearch", "Moderate");

  const response = await fetch(url, {
    headers: {
      "Ocp-Apim-Subscription-Key": apiKey
    }
  });
  if (!response.ok) throw new Error(`Bing Web Search failed: ${response.status} ${response.statusText}`);
  const payload = await response.json();
  return (payload.webPages?.value || []).map((result, index) => ({
    position: (item.page - 1) * DEFAULT_RESULTS_PER_PAGE + index + 1,
    title: result.name || "",
    url: result.url || "",
    snippet: result.snippet || ""
  }));
}

async function runOfficialSearches(queue) {
  const selected = queue.slice(0, limitSearches);
  const results = [];
  let skipped = 0;

  for (const item of selected) {
    const searchResults = item.engine === "google"
      ? await googleSearch(item)
      : await bingSearch(item);

    if (searchResults === null) {
      skipped += 1;
      continue;
    }

    results.push({
      query: item.query,
      engine: item.engine,
      page: item.page,
      place: item.place,
      appRegion: item.appRegion,
      serviceType: item.serviceType,
      results: searchResults
    });
    await sleep(rateLimitMs);
  }

  return { results, skipped };
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

const allPlaces = await fetchPlaces();
const places = filterPlaces(allPlaces);
const queue = buildQueue(places);
const output = {
  generatedAt,
  source: placesUrl,
  note: "Search-engine result pages are queued for repeatable human or API-assisted provider discovery. Use official Google Custom Search and Bing Web Search API keys for --run-searches; do not scrape blocked search result HTML.",
  placesScanned: places.length,
  pagesPerQuery: pages,
  serviceSearches,
  places
};
const queueOutput = {
  generatedAt,
  source: placesUrl,
  note: "Each item is one search-result page to review. Direct provider contacts still need source verification before being added to providers.json.",
  placesScanned: places.length,
  searchesQueued: queue.length,
  queue
};

if (!dryRun) {
  writeJson(path.join(outDir, "nz-populated-places.json"), output);
  writeJson(path.join(outDir, "provider-search-queue.json"), queueOutput);
}

let searchSummary = "";
if (runSearches) {
  const apiResults = await runOfficialSearches(queue);
  searchSummary = ` Official API searches returned ${apiResults.results.length}; skipped ${apiResults.skipped} without configured API keys.`;
  if (!dryRun) {
    writeJson(path.join(outDir, "provider-search-results.json"), {
      generatedAt,
      source: placesUrl,
      results: apiResults.results
    });
  }
}

console.log(`Parsed ${allPlaces.length} populated places; queued ${queue.length} Google/Bing result pages for ${places.length} places.${dryRun ? " Dry run, not written." : ""}${searchSummary}`);
console.log(`Output directory: ${path.resolve(outDir)}`);
