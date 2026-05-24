import fs from "node:fs";

const [, , providersPath = "providers.json", watchlistPath = "data/monitors/provider-availability-watchlist.json"] = process.argv;

const WATCHLIST_NOTE_PATTERNS = [
  /Monitor,\s*Not\s*Added/i,
  /full capacity/i,
  /unable to take on new clients/i,
  /unable to accept new clients/i,
  /not taking new patients/i,
  /not taking new clients/i,
  /closed to new (?:patients|clients|referrals)/i
];

const REPORT_FILES = [
  "data/reports/specialist-gap-fill-2026-05.md",
  "data/reports/regional-provider-coverage-2026-05.md"
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normaliseUrl(value = "") {
  return value.replace(/\/+$/, "").toLowerCase();
}

function extractUrls(text) {
  return [...text.matchAll(/https?:\/\/[^\s"'<>),]+/g)]
    .map((match) => match[0].replace(/[.;]+$/, ""))
    .map(normaliseUrl);
}

const providers = readJson(providersPath);
const watchlist = readJson(watchlistPath);
const items = Array.isArray(watchlist) ? watchlist : watchlist.items || [];
const errors = [];
const warnings = [];

const liveIds = new Set(providers.map((provider) => provider.id));
const watchIds = new Set();
const watchUrls = new Set();

for (const item of items) {
  if (!item.id) errors.push("Watchlist item missing id.");
  if (!item.name) errors.push(`${item.id || "unknown"} missing name.`);
  if (!item.url) errors.push(`${item.id || item.name || "unknown"} missing url.`);
  if (item.lastKnownStatus !== "unavailable") {
    errors.push(`${item.id} lastKnownStatus should be unavailable while it is in the watchlist.`);
  }
  if (!Array.isArray(item.unavailablePatterns) || item.unavailablePatterns.length === 0) {
    errors.push(`${item.id} missing unavailablePatterns.`);
  }
  if (!item.providerCandidate || typeof item.providerCandidate !== "object") {
    errors.push(`${item.id} missing providerCandidate.`);
  }
  if (watchIds.has(item.id)) errors.push(`Duplicate watchlist id: ${item.id}.`);
  watchIds.add(item.id);
  if (item.url) watchUrls.add(normaliseUrl(item.url));
  if (liveIds.has(item.id)) errors.push(`${item.id} is both live in providers.json and in the unavailable watchlist.`);
}

for (const reportFile of REPORT_FILES) {
  if (!fs.existsSync(reportFile)) continue;
  const lines = fs.readFileSync(reportFile, "utf8").split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!WATCHLIST_NOTE_PATTERNS.some((pattern) => pattern.test(line))) continue;

    const context = lines.slice(index, index + 4).join(" ");
    const urls = extractUrls(context);
    for (const url of urls) {
      if (!watchUrls.has(url)) {
        warnings.push(`${reportFile}:${index + 1} mentions an unavailable or omitted provider URL that is not in the watchlist: ${url}`);
      }
    }
  }
}

for (const warning of warnings) console.log(`WATCHLIST_REVIEW ${warning}`);
for (const error of errors) console.error(`WATCHLIST_ERROR ${error}`);

console.log(`Availability watchlist items: ${items.length}. Errors: ${errors.length}. Review notes: ${warnings.length}.`);
process.exitCode = errors.length ? 1 : 0;
