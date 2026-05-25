import fs from "node:fs";
import path from "node:path";
import {
  detectAvailabilityFromText,
  directAvailabilityTypes,
  normaliseAvailabilityText,
  providerAvailability,
  requiresAvailabilityMetadata,
  restrictiveStatuses,
  statusFromWatchlistItem
} from "./lib/provider-availability.mjs";

const [
  ,
  ,
  providersPath = "providers.json",
  watchlistPath = "data/monitors/provider-availability-watchlist.json",
  reportPath = "data/provider-availability-recheck-results.json"
] = process.argv.filter((arg) => !arg.startsWith("--"));

const args = new Set(process.argv.slice(2).filter((arg) => arg.startsWith("--")));
const includeLive = args.has("--include-live");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const rateLimitArg = process.argv.find((arg) => arg.startsWith("--rate-limit-ms="));
const maxChecks = limitArg ? Number(limitArg.split("=")[1]) : Infinity;
const rateLimitMs = rateLimitArg ? Number(rateLimitArg.split("=")[1]) : 1200;

function readJson(filePath, fallback) {
  return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf8")) : fallback;
}

function ensureParent(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sourceUrlForProvider(provider) {
  return provider.website || provider.source || "";
}

function isRecheckableProvider(provider) {
  if (!directAvailabilityTypes.has(provider.type)) return false;
  if (!requiresAvailabilityMetadata(provider)) return false;
  const url = sourceUrlForProvider(provider);
  return /^https?:\/\//i.test(url);
}

function itemSpecificDetection(item, text) {
  for (const pattern of item.unavailablePatterns || []) {
    const match = text.match(new RegExp(pattern, "i"));
    if (match) {
      return {
        status: statusFromWatchlistItem(item),
        evidence: match[0].slice(0, 320),
        matchedPattern: pattern
      };
    }
  }

  for (const pattern of item.availablePatterns || []) {
    const match = text.match(new RegExp(pattern, "i"));
    if (match) {
      return {
        status: "possibly_available",
        evidence: match[0].slice(0, 320),
        matchedPattern: pattern
      };
    }
  }

  return null;
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "user-agent": "Mozilla/5.0 Care Finder provider availability recheck"
      }
    });

    const contentType = response.headers.get("content-type") || "";
    const body = /text|html|xml|json/i.test(contentType) ? await response.text() : "";
    return {
      ok: response.status >= 200 && response.status < 400,
      blocked: [401, 403, 429].includes(response.status),
      status: response.status,
      finalUrl: response.url,
      text: normaliseAvailabilityText(body)
    };
  } catch (error) {
    return {
      ok: false,
      blocked: false,
      status: "ERR",
      finalUrl: url,
      error: error.name || error.message,
      text: ""
    };
  } finally {
    clearTimeout(timer);
  }
}

function watchlistTargets(watchlistItems) {
  return watchlistItems
    .filter((item) => /^https?:\/\//i.test(item.url || ""))
    .map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      region: item.region,
      city: item.city,
      url: item.url,
      currentStatus: item.availabilityStatus || statusFromWatchlistItem(item),
      checkedAt: item.availabilityCheckedAt || item.checkedAt || "",
      sourceKind: "watchlist",
      item
    }));
}

function liveProviderTargets(providers) {
  return providers
    .filter(isRecheckableProvider)
    .map((provider) => ({
      id: provider.id,
      name: provider.name,
      type: provider.type,
      region: provider.region,
      city: provider.city,
      url: sourceUrlForProvider(provider),
      currentStatus: providerAvailability(provider).status,
      checkedAt: provider.availabilityCheckedAt || "",
      sourceKind: "live-provider",
      provider
    }));
}

function recommendedActionFor(target, detectedStatus, fetched) {
  if (!fetched.ok) return "Manual browser/call/email review needed; do not infer availability from a blocked or failed request.";
  if (target.sourceKind === "watchlist" && detectedStatus === "possibly_available") {
    return "Manually verify before moving this provider back into live results.";
  }
  if (target.sourceKind === "watchlist" && restrictiveStatuses.has(detectedStatus)) {
    return "Keep on watchlist and recheck within 14 days.";
  }
  if (target.sourceKind === "live-provider" && restrictiveStatuses.has(detectedStatus)) {
    return "Move to the unavailable watchlist or mark unavailable so it does not lead first recommendations.";
  }
  if (detectedStatus === "accepting") return "Review the evidence before marking accepting; accepting must be explicit and current.";
  return "Keep current status unless a human review finds clearer evidence.";
}

const providers = readJson(providersPath, []);
const watchlist = readJson(watchlistPath, { items: [] });
const watchlistItems = Array.isArray(watchlist) ? watchlist : watchlist.items || [];
const checkedAt = new Date().toISOString();
const targets = [
  ...watchlistTargets(watchlistItems),
  ...(includeLive ? liveProviderTargets(providers) : [])
].slice(0, Number.isFinite(maxChecks) ? maxChecks : undefined);

const results = [];

for (const target of targets) {
  const fetched = await fetchText(target.url);
  let detected = { status: fetched.blocked ? "blocked" : "check_failed", evidence: fetched.error || String(fetched.status), matchedPattern: "" };

  if (fetched.ok) {
    const itemSpecific = target.item ? itemSpecificDetection(target.item, fetched.text) : null;
    const generic = detectAvailabilityFromText(fetched.text);
    detected = itemSpecific || generic;
    if (detected.status === "not_published") {
      detected = { status: "unknown", evidence: "", matchedPattern: "" };
    }
  } else if (fetched.blocked) {
    detected = { status: "blocked", evidence: String(fetched.status), matchedPattern: "" };
  }

  const result = {
    id: target.id,
    name: target.name,
    type: target.type,
    region: target.region,
    city: target.city,
    sourceKind: target.sourceKind,
    url: target.url,
    httpStatus: fetched.status,
    finalUrl: fetched.finalUrl,
    blocked: fetched.blocked,
    currentStatus: target.currentStatus,
    detectedStatus: detected.status,
    changed: fetched.ok && detected.status !== "unknown" && detected.status !== target.currentStatus,
    evidence: detected.evidence,
    matchedPattern: detected.matchedPattern,
    recommendedAction: recommendedActionFor(target, detected.status, fetched),
    checkedAt
  };

  results.push(result);
  console.log(`${result.sourceKind.toUpperCase()} ${result.detectedStatus} ${result.name} (${result.region})`);
  if (result.evidence) console.log(`  Evidence: ${result.evidence}`);
  await sleep(rateLimitMs);
}

const report = {
  checkedAt,
  providersPath,
  watchlistPath,
  includeLive,
  rateLimitMs,
  total: results.length,
  changed: results.filter((result) => result.changed).length,
  blocked: results.filter((result) => result.blocked).length,
  unknown: results.filter((result) => result.detectedStatus === "unknown").length,
  failed: results.filter((result) => result.detectedStatus === "check_failed").length,
  results
};

ensureParent(reportPath);
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote availability recheck results to ${path.resolve(reportPath)}.`);
