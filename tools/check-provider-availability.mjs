import fs from "node:fs";
import path from "node:path";

const [, , watchlistPath = "data/monitors/provider-availability-watchlist.json", reportPath = "data/reports/provider-availability-monitor.json"] = process.argv;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function ensureParent(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function normaliseText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function findPattern(patterns = [], text) {
  for (const pattern of patterns) {
    const regex = new RegExp(pattern, "i");
    const match = text.match(regex);
    if (match) return { pattern, match: match[0].slice(0, 280) };
  }
  return null;
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 Care Finder provider availability monitor"
      }
    });

    const body = await response.text();
    return {
      status: response.status,
      finalUrl: response.url,
      ok: response.status >= 200 && response.status < 400,
      text: normaliseText(body)
    };
  } catch (error) {
    return {
      status: "ERR",
      finalUrl: url,
      ok: false,
      error: error.name || error.message,
      text: ""
    };
  } finally {
    clearTimeout(timer);
  }
}

function statusFor(item, text) {
  const unavailable = findPattern(item.unavailablePatterns, text);
  const available = findPattern(item.availablePatterns, text);

  if (unavailable) {
    return {
      status: "unavailable",
      evidence: unavailable.match,
      matchedPattern: unavailable.pattern
    };
  }

  if (available) {
    return {
      status: "possibly_available",
      evidence: available.match,
      matchedPattern: available.pattern
    };
  }

  return {
    status: "unknown",
    evidence: "",
    matchedPattern: ""
  };
}

const watchlist = readJson(watchlistPath);
const items = Array.isArray(watchlist) ? watchlist : watchlist.items || [];
const checkedAt = new Date().toISOString();
const results = [];

for (const item of items) {
  const fetched = await fetchText(item.url);
  const detected = fetched.ok
    ? statusFor(item, fetched.text)
    : { status: "check_failed", evidence: fetched.error || String(fetched.status), matchedPattern: "" };

  const changed = fetched.ok
    && item.lastKnownStatus
    && detected.status !== "unknown"
    && detected.status !== item.lastKnownStatus;

  const result = {
    id: item.id,
    name: item.name,
    region: item.region,
    type: item.type,
    url: item.url,
    httpStatus: fetched.status,
    finalUrl: fetched.finalUrl,
    lastKnownStatus: item.lastKnownStatus || "",
    detectedStatus: detected.status,
    changed,
    evidence: detected.evidence,
    matchedPattern: detected.matchedPattern,
    checkedAt
  };

  results.push(result);

  const prefix = changed ? "AVAILABILITY_CHANGED" : "AVAILABILITY";
  console.log(`${prefix} ${result.detectedStatus} ${item.name} (${item.region})`);
  if (result.evidence) console.log(`  Evidence: ${result.evidence}`);
}

const report = {
  checkedAt,
  watchlistPath,
  total: results.length,
  changed: results.filter((result) => result.changed).length,
  unknown: results.filter((result) => result.detectedStatus === "unknown").length,
  failed: results.filter((result) => result.detectedStatus === "check_failed").length,
  results
};

ensureParent(reportPath);
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote availability monitor report to ${path.resolve(reportPath)}.`);

if (process.env.FAIL_ON_AVAILABILITY_CHANGE === "1" && report.changed > 0) {
  process.exitCode = 1;
}
