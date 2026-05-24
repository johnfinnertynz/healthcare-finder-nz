import fs from "node:fs";
import path from "node:path";

const [
  ,
  ,
  providersPath = "providers.json",
  reportPath = "data/reports/provider-unavailable-candidates.json"
] = process.argv;

const DIRECT_TYPES = new Set([
  "addiction",
  "counsellor",
  "mens-centre",
  "psychiatrist",
  "psychologist",
  "public-service",
  "youth"
]);

const UNAVAILABLE_PATTERNS = [
  "full\\s+capacity",
  "currently\\s+full",
  "books?\\s+(?:are\\s+)?closed",
  "wait\\s*list\\s+(?:is\\s+)?closed",
  "closed\\s+to\\s+new\\s+(?:clients|patients|referrals)",
  "not\\s+(?:currently\\s+)?(?:taking|accepting)\\s+(?:on\\s+)?new\\s+(?:clients|patients|referrals)",
  "unable\\s+to\\s+(?:take\\s+on|accept|see)\\s+new\\s+(?:clients|patients|referrals)",
  "no\\s+(?:current\\s+)?availability",
  "not\\s+available\\s+for\\s+new\\s+(?:clients|patients|referrals)"
];

const AVAILABLE_PATTERNS = [
  "taking\\s+new\\s+(?:clients|patients|referrals)",
  "accepting\\s+new\\s+(?:clients|patients|referrals)",
  "new\\s+client\\s+enquir(?:y|ies)",
  "book\\s+(?:an\\s+)?appointment"
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function ensureParent(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normaliseText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/?(h[1-6])[^>]*>/gi, "\n")
    .replace(/<\/(p|div|li|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function stripHonorifics(name) {
  return name
    .replace(/\b(dr|prof|mr|mrs|ms|miss)\.?\s+/gi, "")
    .replace(/\s+-\s+.+$/g, "")
    .trim();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function providerNameRegex(provider) {
  const cleaned = stripHonorifics(provider.name || "");
  const parts = cleaned.split(/\s+/).filter((part) => part.length > 1);
  if (parts.length >= 2) {
    return new RegExp(`${escapeRegex(parts[0])}[\\s\\S]{0,80}${escapeRegex(parts.at(-1))}`, "i");
  }
  if (parts.length === 1) return new RegExp(escapeRegex(parts[0]), "i");
  return null;
}

function isIndividualProvider(provider) {
  const name = provider.name || "";
  if (/^(dr|prof|mr|mrs|ms|miss)\b/i.test(name)) return true;
  if (/\b(clinic|centre|center|service|services|group|practice|psychology|psychiatry|therapy|counselling|health|trust|directory|programme|program)\b/i.test(name)) return false;
  const parts = stripHonorifics(name).split(/\s+/).filter(Boolean);
  return parts.length >= 2 && parts.length <= 4 && parts.every((part) => /^[A-Z][a-z'’-]+$/.test(part));
}

function likelyNextProviderHeading(line) {
  const clean = line.trim();
  if (clean.length < 5 || clean.length > 80) return false;
  if (/[.!?]$/.test(clean)) return false;
  if (/\b(psychologist|psychiatrist|counsellor|mbchb|franzcp|mnzccp|pg\s*dip|clin|b\.sc|m\.sc|ma\b|phd)\b/i.test(clean)) return false;
  return /^(dr|prof)\s+[a-z][a-z' -]+$/i.test(clean)
    || /^[A-Z][A-Z' -]{4,}$/.test(clean)
    || /^[A-Z][a-z'’-]+(?:\s+[A-Z][a-z'’-]+){1,3}$/.test(clean);
}

function findPattern(patterns, text) {
  for (const pattern of patterns) {
    const regex = new RegExp(pattern, "i");
    const match = text.match(regex);
    if (match) return { pattern, evidence: match[0].slice(0, 320) };
  }
  return null;
}

function relevantText(provider, text) {
  if (!isIndividualProvider(provider)) return { text, scoped: false };

  const nameRegex = providerNameRegex(provider);
  if (!nameRegex) return { text, scoped: false };

  const match = text.match(nameRegex);
  if (!match || typeof match.index !== "number") return { text: "", scoped: true };

  const start = match.index;
  const after = text.slice(start);
  const lines = after.split("\n");
  let section = lines[0] || "";
  for (const line of lines.slice(1)) {
    if (likelyNextProviderHeading(line)) break;
    section += `\n${line}`;
  }

  if (section.length > 2800) section = section.slice(0, 2800);
  const end = start + section.length;
  return { text: text.slice(start, end), scoped: true };
}

async function fetchPage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 Care Finder unavailable-provider scanner"
      }
    });

    return {
      ok: response.status >= 200 && response.status < 400,
      status: response.status,
      finalUrl: response.url,
      text: normaliseText(await response.text())
    };
  } catch (error) {
    return {
      ok: false,
      status: "ERR",
      finalUrl: url,
      error: error.name || error.message,
      text: ""
    };
  } finally {
    clearTimeout(timer);
  }
}

const providers = readJson(providersPath)
  .filter((provider) => DIRECT_TYPES.has(provider.type))
  .filter((provider) => !provider.id?.startsWith("crisis-"))
  .filter((provider) => provider.website || provider.source);

const byUrl = new Map();
for (const provider of providers) {
  const url = provider.website || provider.source;
  if (!/^https?:\/\//i.test(url)) continue;
  if (!byUrl.has(url)) byUrl.set(url, []);
  byUrl.get(url).push(provider);
}

const candidates = [];
const checkedAt = new Date().toISOString();
let checkedUrls = 0;
let failedUrls = 0;

for (const [url, urlProviders] of byUrl.entries()) {
  const page = await fetchPage(url);
  checkedUrls += 1;

  if (!page.ok) {
    failedUrls += 1;
    await sleep(200);
    continue;
  }

  for (const provider of urlProviders) {
    const scoped = relevantText(provider, page.text);
    if (!scoped.text) continue;

    const unavailable = findPattern(UNAVAILABLE_PATTERNS, scoped.text);
    if (!unavailable) continue;

    const available = findPattern(AVAILABLE_PATTERNS, scoped.text);
    candidates.push({
      id: provider.id,
      name: provider.name,
      type: provider.type,
      region: provider.region,
      city: provider.city,
      url,
      finalUrl: page.finalUrl,
      scopedToProviderName: scoped.scoped,
      unavailablePattern: unavailable.pattern,
      unavailableEvidence: unavailable.evidence,
      possibleAvailablePattern: available?.pattern || "",
      possibleAvailableEvidence: available?.evidence || "",
      provider
    });
  }

  await sleep(200);
}

const report = {
  checkedAt,
  providersScanned: providers.length,
  urlsScanned: checkedUrls,
  failedUrls,
  candidates
};

ensureParent(reportPath);
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

for (const candidate of candidates) {
  console.log(`${candidate.name} | ${candidate.region} | ${candidate.type}`);
  console.log(`  ${candidate.unavailableEvidence}`);
  console.log(`  ${candidate.url}`);
}

console.log(`Scanned ${providers.length} providers across ${checkedUrls} URLs. Candidates: ${candidates.length}. Failed URLs: ${failedUrls}.`);
console.log(`Wrote ${path.resolve(reportPath)}.`);
