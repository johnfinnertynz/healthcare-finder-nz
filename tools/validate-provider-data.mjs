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
  "verified",
  "lastVerified",
  "confidence",
  "sourceQuality"
];

const allowedConfidence = new Set(["high", "medium", "low"]);
const allowedNeedScope = new Set(["depression", "anxiety", "trauma", "addiction", "work"]);
const broadNeedTags = new Set(["depression", "anxiety", "work", "stress", "relationships", "grief", "addiction"]);
const coreMentalHealthTags = new Set(["depression", "anxiety", "trauma", "addiction", "relationships", "grief"]);

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

function urlPath(value) {
  try {
    return new URL(value).pathname.toLowerCase();
  } catch {
    return "";
  }
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
    if (!Object.hasOwn(provider, "needScope")) {
      recordIssue(errors, provider, 'missing required field "needScope"');
    } else {
      if (!Array.isArray(provider.needScope)) {
        recordIssue(errors, provider, "needScope must be an array");
      } else {
        for (const need of provider.needScope) {
          if (!allowedNeedScope.has(need)) recordIssue(errors, provider, `invalid needScope "${need}"`);
        }
      }
    }
    if (provider.source && !isUrl(provider.source)) recordIssue(errors, provider, "source must be an http(s) URL");
    if (provider.website && !isUrl(provider.website)) recordIssue(errors, provider, "website must be an http(s) URL");
    if (provider.bookingUrl && !isUrl(provider.bookingUrl)) recordIssue(errors, provider, "bookingUrl must be an http(s) URL");
    if (provider.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(provider.email)) recordIssue(errors, provider, `invalid email "${provider.email}"`);
    if (monthAge(provider.verified) > 6) recordIssue(errors, provider, `verified month is missing or older than 6 months (${provider.verified || "missing"})`);
    if (monthAge(provider.lastVerified) > 6) recordIssue(errors, provider, `lastVerified month is missing or older than 6 months (${provider.lastVerified || "missing"})`);
    if (provider.confidence && !allowedConfidence.has(provider.confidence)) recordIssue(errors, provider, `invalid confidence "${provider.confidence}"`);
    if (typeof provider.needsManualVerification !== "boolean") recordIssue(errors, provider, "needsManualVerification must be true or false");

    if (provider.type !== "directory" && !hasUsableContact(provider)) {
      recordIssue(errors, provider, "direct-service records need at least one public contact method");
    }

    if (provider.type === "directory" && !provider.website) {
      recordIssue(errors, provider, "directory records need a website");
    }

    if ((provider.type === "directory" || provider.tags?.includes("directory")) && provider.tags?.includes("direct-contact")) {
      recordIssue(errors, provider, "directory records must not be tagged direct-contact");
    }

    if (provider.tags?.includes("crisis") && !["public-service", "helpline", "directory"].includes(provider.type)) {
      recordIssue(errors, provider, "crisis-tagged records must be public-service, helpline, or directory");
    }

    if (provider.crisisOnly === true && !provider.tags?.includes("crisis")) {
      recordIssue(errors, provider, "crisisOnly records must include the crisis tag");
    }

    if (provider.crisisOnly === true && ["gp", "counsellor", "psychologist", "psychiatrist"].includes(provider.type)) {
      recordIssue(errors, provider, "crisisOnly records must not be routine provider types");
    }

    const availabilityText = [provider.name, provider.fit, provider.firstStep, provider.hours].join(" ");
    if (unavailablePattern.test(availabilityText)) {
      recordIssue(errors, provider, "appears unavailable to new clients; move to provider availability watchlist");
    }

    const scopeText = [
      provider.type,
      provider.fit,
      provider.firstStep,
      ...(provider.tags || []),
      ...(provider.specialties || [])
    ].join(" ");
    if (urlPath(provider.source).includes("/sexual-harm/")
      && /\b(neuropsychology|psychological services|mental injury)\b/i.test(scopeText)) {
      recordIssue(errors, provider, "sexual-harm source appears over-scoped; remove unsupported broad psychology/neuropsychology wording");
    }

    const sexualHarmOnly = provider.tags?.includes("sexual-harm")
      && !provider.tags.some((tag) => broadNeedTags.has(tag));
    if (sexualHarmOnly && !provider.needScope?.includes("trauma")) {
      recordIssue(errors, provider, "sexual-harm-only services must include needScope [\"trauma\"] so unrelated concerns do not rank them");
    }

    const rehabWorkOnly = provider.type === "psychologist"
      && provider.tags?.includes("rehabilitation")
      && ["acc", "concussion", "pain", "return-to-work", "vocational"].some((tag) => provider.tags?.includes(tag))
      && !provider.tags.some((tag) => coreMentalHealthTags.has(tag));
    if (rehabWorkOnly && !provider.needScope?.includes("work")) {
      recordIssue(errors, provider, "rehabilitation-only psychology services must include needScope [\"work\"] so they do not rank for unrelated low-mood or anxiety flows");
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
  }
}

for (const warning of warnings.slice(0, 30)) console.log(`WARN ${warning}`);
if (warnings.length > 30) console.log(`WARN ...and ${warnings.length - 30} more data-quality warnings`);
for (const error of errors) console.log(`ERROR ${error}`);

console.log(`Validated ${Array.isArray(providers) ? providers.length : 0} providers. Errors: ${errors.length}. Warnings: ${warnings.length}.`);
process.exitCode = errors.length ? 1 : 0;
