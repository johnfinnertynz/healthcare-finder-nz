import fs from "node:fs";
import {
  availabilityEvidenceText,
  availabilityStatuses,
  detectAvailabilityFromText,
  isCrisisProvider,
  isDirectoryLike,
  restrictiveStatuses
} from "./lib/provider-availability.mjs";
import {
  isPsychiatryRecord,
  normaliseReferralConfidence,
  normaliseReferralType,
  referralEvidenceText
} from "./lib/provider-referrals.mjs";
import {
  allowedPsychiatristBaselineScope,
  baselinePsychiatristScopeNote,
  baselinePsychiatristScopeSource
} from "./lib/provider-scope.mjs";
import { isNewZealandCoordinate } from "./lib/provider-geocoder.mjs";

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
  "sourceQuality",
  "availabilityStatus",
  "availabilityCheckedAt",
  "availabilitySource"
];

const allowedConfidence = new Set(["high", "medium", "low"]);
const allowedNeedScope = new Set(["depression", "anxiety", "trauma", "addiction", "work"]);
const broadNeedTags = new Set(["depression", "anxiety", "work", "stress", "relationships", "grief", "addiction"]);
const coreMentalHealthTags = new Set(["depression", "anxiety", "trauma", "addiction", "relationships", "grief"]);
const psychiatristBaselineCore = [
  "depression/mood disorders",
  "anxiety disorders",
  "bipolar disorder",
  "psychosis/schizophrenia",
  "trauma/PTSD",
  "medication review/diagnosis/risk assessment"
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

function isMonthOrDate(value) {
  return /^\d{4}-\d{2}(-\d{2})?$/.test(value || "");
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
    if (Object.hasOwn(provider, "advertisedSpecialties") && !Array.isArray(provider.advertisedSpecialties)) recordIssue(errors, provider, "advertisedSpecialties must be an array when present");
    if (Object.hasOwn(provider, "advertisedSpecialtyEvidence") && !Array.isArray(provider.advertisedSpecialtyEvidence)) recordIssue(errors, provider, "advertisedSpecialtyEvidence must be an array when present");
    if (provider.type !== "psychiatrist" && Array.isArray(provider.baselineScope) && provider.baselineScope.length) {
      recordIssue(errors, provider, "baselineScope is only allowed for named psychiatrist records");
    }
    if (!availabilityStatuses.has(provider.availabilityStatus)) recordIssue(errors, provider, `invalid availabilityStatus "${provider.availabilityStatus}"`);
    if (!isMonthOrDate(provider.availabilityCheckedAt)) recordIssue(errors, provider, "availabilityCheckedAt must be YYYY-MM or YYYY-MM-DD");
    if (provider.availabilitySource && !isUrl(provider.availabilitySource)) recordIssue(errors, provider, "availabilitySource must be an http(s) URL");
    if (typeof provider.availabilityNeedsManualReview !== "boolean") recordIssue(errors, provider, "availabilityNeedsManualReview must be true or false");

    if (isPsychiatryRecord(provider)) {
      if (typeof provider.requiresReferral !== "boolean") recordIssue(errors, provider, "psychiatry records need requiresReferral true or false");
      if (!normaliseReferralType(provider.referralType)) recordIssue(errors, provider, "psychiatry records need referralType gp, self, specialist, or unknown");
      if (!hasValue(provider.referralSourceUrl) || !isUrl(provider.referralSourceUrl)) recordIssue(errors, provider, "psychiatry records need referralSourceUrl");
      if (!hasValue(provider.referralSourceExcerpt)) recordIssue(errors, provider, "psychiatry records need referralSourceExcerpt");
      if (!normaliseReferralConfidence(provider.referralConfidence)) recordIssue(errors, provider, "psychiatry records need referralConfidence high, medium, or low");
      if (!isMonthOrDate(provider.referralLastChecked)) recordIssue(errors, provider, "psychiatry records need referralLastChecked YYYY-MM or YYYY-MM-DD");
      if (typeof provider.referralNeedsManualReview !== "boolean") recordIssue(errors, provider, "psychiatry records need referralNeedsManualReview true or false");
      if (provider.requiresReferral === true && !["gp", "specialist"].includes(provider.referralType)) recordIssue(errors, provider, "requiresReferral true must use referralType gp or specialist");
      if (provider.referralType === "self" && provider.requiresReferral === true) recordIssue(errors, provider, "self-referral records must not have requiresReferral true");
      const referralText = referralEvidenceText(provider);
      if (/\bmust\s+first\s+see\s+(?:your\s+)?gp\b|\bgp\s+referral\s+(?:is\s+)?(?:required|needed)\b/i.test(referralText) && provider.referralType === "self") {
        recordIssue(errors, provider, "referral evidence mentions GP referral but record is self-referral");
      }
    }

    if (provider.type === "psychiatrist") {
      if (!Array.isArray(provider.baselineScope) || !provider.baselineScope.length) {
        recordIssue(errors, provider, "psychiatrist records need baselineScope metadata");
      } else {
        for (const scope of provider.baselineScope) {
          if (!allowedPsychiatristBaselineScope.has(scope)) recordIssue(errors, provider, `invalid psychiatrist baselineScope "${scope}"`);
        }
        for (const coreScope of psychiatristBaselineCore) {
          if (!provider.baselineScope.includes(coreScope)) recordIssue(errors, provider, `psychiatrist baselineScope missing core item "${coreScope}"`);
        }
      }
      if (provider.baselineScopeSource !== baselinePsychiatristScopeSource) recordIssue(errors, provider, "psychiatrist baselineScopeSource must be the approved psychiatry scope source");
      if (provider.baselineScopeNote !== baselinePsychiatristScopeNote) recordIssue(errors, provider, "psychiatrist baselineScopeNote must use the standard non-specialty disclaimer");
      if (!Array.isArray(provider.advertisedSpecialties)) recordIssue(errors, provider, "psychiatrist records need advertisedSpecialties array");
      if (!Array.isArray(provider.advertisedSpecialtyEvidence)) {
        recordIssue(errors, provider, "psychiatrist records need advertisedSpecialtyEvidence array");
      } else if (provider.advertisedSpecialties?.length && !provider.advertisedSpecialtyEvidence.length) {
        recordIssue(errors, provider, "advertisedSpecialties require source evidence");
      }
      if (provider.advertisedSpecialtyEvidence?.some((item) => item && item.sourceUrl && !isUrl(item.sourceUrl))) {
        recordIssue(errors, provider, "advertisedSpecialtyEvidence sourceUrl must be an http(s) URL when present");
      }
      if (!hasValue(provider.specialtyTagsSource)) recordIssue(errors, provider, "psychiatrist records need specialtyTagsSource");
    }

    const detectedAvailability = detectAvailabilityFromText(availabilityEvidenceText(provider));
    if (provider.availabilityStatus === "accepting" && detectedAvailability.status !== "accepting" && !provider.availabilityEvidence) {
      recordIssue(errors, provider, "availabilityStatus accepting requires explicit accepting-new-clients evidence");
    }
    if (restrictiveStatuses.has(detectedAvailability.status) && !restrictiveStatuses.has(provider.availabilityStatus)) {
      recordIssue(errors, provider, `availability source fields look restrictive (${detectedAvailability.status}) but record is ${provider.availabilityStatus}`);
    }
    if (isDirectoryLike(provider) && provider.availabilityStatus === "accepting") {
      recordIssue(errors, provider, "directory records must not be marked as accepting direct provider availability");
    }
    if (isCrisisProvider(provider) && provider.availabilityStatus === "accepting") {
      recordIssue(errors, provider, "crisis providers must not be marked as routine accepting providers");
    }

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
      if (!isNewZealandCoordinate(lat, lon)) recordIssue(errors, provider, `coordinates look outside New Zealand (${provider.lat}, ${provider.lon})`);
    }
  }
}

for (const warning of warnings.slice(0, 30)) console.log(`WARN ${warning}`);
if (warnings.length > 30) console.log(`WARN ...and ${warnings.length - 30} more data-quality warnings`);
for (const error of errors) console.log(`ERROR ${error}`);

console.log(`Validated ${Array.isArray(providers) ? providers.length : 0} providers. Errors: ${errors.length}. Warnings: ${warnings.length}.`);
process.exitCode = errors.length ? 1 : 0;
