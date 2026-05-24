import fs from "node:fs";

const [, , providersPath = "providers.json"] = process.argv;
const providers = JSON.parse(fs.readFileSync(providersPath, "utf8"));

const allowedTypes = new Set([
  "gp",
  "counsellor",
  "psychologist",
  "psychiatrist",
  "helpline",
  "mens-centre",
  "youth",
  "addiction",
  "directory",
  "public-service"
]);

const allowedRegions = new Set([
  "Northland",
  "Auckland",
  "Waikato",
  "Bay of Plenty",
  "Rotorua and Taupo",
  "Tairawhiti",
  "Hawke's Bay",
  "Taranaki",
  "Manawatu-Whanganui",
  "Wairarapa",
  "Wellington",
  "Nelson Marlborough Tasman",
  "Canterbury",
  "South Canterbury",
  "West Coast",
  "Otago",
  "Southland",
  "National"
]);

const requiredFields = [
  "id",
  "name",
  "type",
  "region",
  "city",
  "cost",
  "tags",
  "fit",
  "firstStep",
  "source",
  "verified"
];

const unavailablePattern = /\b(not taking new (clients|patients)|not accepting (new )?(clients|patients|referrals)|books are closed|closed to new (clients|patients)|unable to accept new (clients|patients|referrals))\b/i;
const errors = [];
const warnings = [];
const ids = new Map();

function hasValue(value) {
  return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && String(value).trim() !== "";
}

function hasUsableContact(provider) {
  return Boolean(provider.phone || provider.text || provider.email || provider.website);
}

function isUrl(value) {
  return /^https?:\/\//i.test(String(value || ""));
}

function monthAge(value) {
  if (!/^\d{4}-\d{2}$/.test(value || "")) return Infinity;
  const [year, month] = value.split("-").map(Number);
  const now = new Date();
  return (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month);
}

function recordIssue(bucket, provider, message) {
  bucket.push(`${provider.id || "(missing id)"}: ${message}`);
}

if (!Array.isArray(providers)) {
  errors.push("providers.json must contain an array");
} else {
  for (const provider of providers) {
    for (const field of requiredFields) {
      if (!hasValue(provider[field])) recordIssue(errors, provider, `missing required field "${field}"`);
    }

    if (provider.id) {
      if (ids.has(provider.id)) recordIssue(errors, provider, `duplicate id; first seen at ${ids.get(provider.id)}`);
      ids.set(provider.id, provider.name || "(unnamed)");
    }

    if (!allowedTypes.has(provider.type)) recordIssue(errors, provider, `invalid type "${provider.type}"`);
    if (!allowedRegions.has(provider.region)) recordIssue(errors, provider, `invalid region "${provider.region}"`);
    if (!Array.isArray(provider.tags)) recordIssue(errors, provider, "tags must be an array");
    if (provider.source && !isUrl(provider.source)) recordIssue(errors, provider, "source must be an http(s) URL");
    if (provider.website && !isUrl(provider.website)) recordIssue(errors, provider, "website must be an http(s) URL");
    if (provider.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(provider.email)) recordIssue(errors, provider, `invalid email "${provider.email}"`);
    if (monthAge(provider.verified) > 6) recordIssue(errors, provider, `verified month is missing or older than 6 months (${provider.verified || "missing"})`);

    if (provider.type !== "directory" && !hasUsableContact(provider)) {
      recordIssue(errors, provider, "direct-service records need at least one public contact method");
    }

    if (provider.type === "directory" && !provider.website) {
      recordIssue(errors, provider, "directory records need a website");
    }

    if (provider.type !== "directory" && provider.tags?.includes("directory")) {
      recordIssue(warnings, provider, "carries the directory tag and will be treated as a navigator in the UI");
    }

    if (provider.tags?.includes("crisis") && !["public-service", "helpline", "directory"].includes(provider.type)) {
      recordIssue(errors, provider, "crisis-tagged records must be public-service, helpline, or directory");
    }

    const availabilityText = [provider.name, provider.fit, provider.firstStep, provider.hours].join(" ");
    if (unavailablePattern.test(availabilityText)) {
      recordIssue(errors, provider, "appears unavailable to new clients; move to provider availability watchlist");
    }

    const hasLat = provider.lat !== undefined && provider.lat !== "";
    const hasLon = provider.lon !== undefined && provider.lon !== "";
    if (hasLat !== hasLon) recordIssue(errors, provider, "lat and lon must be supplied together");
    if (hasLat && hasLon) {
      const lat = Number(provider.lat);
      const lon = Number(provider.lon);
      if (!Number.isFinite(lat) || lat < -48 || lat > -33) recordIssue(errors, provider, `lat looks outside New Zealand (${provider.lat})`);
      if (!Number.isFinite(lon) || lon < 165 || lon > 180) recordIssue(errors, provider, `lon looks outside New Zealand (${provider.lon})`);
    }

    if (!provider.confidence) {
      recordIssue(warnings, provider, "confidence not set; use high/medium/low when practical");
    }
  }
}

for (const warning of warnings.slice(0, 30)) console.log(`WARN ${warning}`);
if (warnings.length > 30) console.log(`WARN ...and ${warnings.length - 30} more confidence/data-quality warnings`);
for (const error of errors) console.log(`ERROR ${error}`);

console.log(`Validated ${Array.isArray(providers) ? providers.length : 0} providers. Errors: ${errors.length}. Warnings: ${warnings.length}.`);
process.exitCode = errors.length ? 1 : 0;
