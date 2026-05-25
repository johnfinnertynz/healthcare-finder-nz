import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";

export const ALLOWED_CORRECTED_FIELDS = new Set([
  "name",
  "clinicianName",
  "practiceName",
  "type",
  "region",
  "city",
  "address",
  "lat",
  "lon",
  "coordinateSource",
  "coordinatePrecision",
  "coordinateConfidence",
  "geocodeNeedsManualReview",
  "phone",
  "text",
  "email",
  "website",
  "bookingUrl",
  "source",
  "sourceQuality",
  "confidence",
  "needsManualVerification",
  "verified",
  "lastVerified",
  "availabilityStatus",
  "availabilityCheckedAt",
  "availabilityEvidence",
  "availabilitySource",
  "availabilityNeedsManualReview",
  "requiresReferral",
  "referralType",
  "referralSourceUrl",
  "referralSourceExcerpt",
  "referralConfidence",
  "referralLastChecked",
  "referralNeedsManualReview",
  "tags",
  "needScope",
  "specialties",
  "services",
  "patientGroups",
  "ageGroups",
  "onlineAvailable",
  "phoneSupport",
  "inPerson",
  "crisisOnly",
  "firstStep",
  "fit",
  "cost",
  "hours"
]);

const VALID_DECISIONS = new Set(["approve", "adjust", "reject", "move_to_watchlist", "duplicate", "needs_more_info"]);
const SUPPORT_TAGS = new Set(["maori", "pasifika", "asian", "rainbow"]);
const TELEHEALTH_TAGS = new Set(["telehealth", "online"]);
const BROAD_TAGS = new Set(["depression", "anxiety", "trauma", "addiction", "work", "stress", "relationships", "grief"]);
const AVAILABILITY_STATUSES = new Set(["accepting", "waitlist", "not_accepting", "referrals_paused", "unknown", "not_published"]);

function parseArgs(argv = process.argv.slice(2)) {
  const config = {
    decisions: "data/provider-review-decisions.json",
    providers: "providers.json",
    watchlist: "data/monitors/provider-availability-watchlist.json",
    log: "data/provider-review-log.jsonl",
    allowUnsafeFields: false,
    dryRun: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--decisions") config.decisions = argv[++index];
    else if (arg === "--providers") config.providers = argv[++index];
    else if (arg === "--watchlist") config.watchlist = argv[++index];
    else if (arg === "--log") config.log = argv[++index];
    else if (arg === "--allow-unsafe-fields") config.allowUnsafeFields = true;
    else if (arg === "--dry-run") config.dryRun = true;
  }
  return config;
}

function readJsonIfExists(filePath, fallback) {
  if (!filePath || !fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function appendJsonl(filePath, events) {
  if (!events.length) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, events.map((event) => JSON.stringify(event)).join("\n") + "\n");
}

function monthFromDate(value) {
  if (/^\d{4}-\d{2}/.test(value || "")) return String(value).slice(0, 7);
  return new Date().toISOString().slice(0, 7);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function decisionList(input) {
  if (Array.isArray(input)) return input;
  return Array.isArray(input.decisions) ? input.decisions : [];
}

function providerLabel(provider) {
  return provider?.name || provider?.id || "(unknown provider)";
}

function explicitApprovals(decision) {
  return new Set(Array.isArray(decision.explicitApprovals) ? decision.explicitApprovals : []);
}

function decisionEvidenceText(decision, provider, nextProvider = provider) {
  return [
    decision.sourceExcerpt,
    decision.reviewNotes,
    decision.notes,
    decision.sourceEvidenceSummary,
    decision.correctedFields?.availabilityEvidence,
    decision.correctedFields?.referralSourceExcerpt,
    nextProvider?.availabilityEvidence,
    nextProvider?.referralSourceExcerpt,
    provider?.availabilityEvidence,
    provider?.referralSourceExcerpt
  ].filter(Boolean).join(" ");
}

function hasAnyEvidence(decision, provider, nextProvider = provider) {
  return /\S{12,}/.test(decisionEvidenceText(decision, provider, nextProvider));
}

function hasExplicitAvailabilityEvidence(provider, decision) {
  return /\b(accepting new|taking new|currently available|available for new|book (?:a )?(?:session|appointment|consultation)|new client enqu)/i
    .test(`${provider.availabilityEvidence || ""} ${decision.sourceExcerpt || ""} ${decision.correctedFields?.availabilityEvidence || ""}`);
}

function hasExplicitSelfReferralEvidence(provider, decision) {
  return /\b(self[- ]referr|self referral|refer yourself|direct referral|without (?:a )?referral|no referral required|contact (?:us|the practice) directly|book directly)\b/i
    .test(`${provider.referralSourceExcerpt || ""} ${decision.sourceExcerpt || ""} ${decision.correctedFields?.referralSourceExcerpt || ""}`);
}

function sourceHost(value) {
  try {
    return new URL(value || "").hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function isRegisterOrDirectorySource(provider) {
  return /register|directory|professional/i.test(`${provider.sourceQuality || ""} ${provider.source || ""} ${provider.website || ""}`);
}

function isSameSourceWebsite(provider) {
  return sourceHost(provider.source) && sourceHost(provider.source) === sourceHost(provider.website);
}

function hasDirectPracticeContact(provider) {
  return Boolean(provider.phone || provider.email || provider.bookingUrl)
    || (provider.website && !isRegisterOrDirectorySource(provider));
}

function ensureAllowedFields(correctedFields, allowUnsafeFields) {
  if (allowUnsafeFields) return;
  const unsafe = Object.keys(correctedFields || {}).filter((field) => !ALLOWED_CORRECTED_FIELDS.has(field));
  if (unsafe.length) throw new Error(`Unsafe correctedFields rejected: ${unsafe.join(", ")}`);
}

function changedArrayValues(before = [], after = []) {
  const beforeSet = new Set(Array.isArray(before) ? before : []);
  return (Array.isArray(after) ? after : []).filter((value) => !beforeSet.has(value));
}

function validateSafety(provider, nextProvider, decision) {
  const approvals = explicitApprovals(decision);
  const action = decision.action || decision.reviewDecision;
  const evidenceText = decisionEvidenceText(decision, provider, nextProvider);

  if (action === "approve" && provider.needsManualVerification && !hasAnyEvidence(decision, provider, nextProvider)) {
    throw new Error(`${providerLabel(provider)} cannot be approved without source evidence or review notes.`);
  }

  if (nextProvider.availabilityStatus && !AVAILABILITY_STATUSES.has(nextProvider.availabilityStatus)) {
    throw new Error(`${providerLabel(provider)} has invalid availabilityStatus "${nextProvider.availabilityStatus}".`);
  }

  if (nextProvider.availabilityStatus === "accepting" && !hasExplicitAvailabilityEvidence(nextProvider, decision)) {
    throw new Error(`${providerLabel(provider)} cannot be marked accepting without explicit accepting-new-clients evidence.`);
  }

  if (/blocked|unreachable|403|404|timeout|could not read/i.test(`${decision.sourceStatus || ""} ${decision.sourceExcerpt || ""}`) && nextProvider.availabilityStatus === "accepting") {
    throw new Error(`${providerLabel(provider)} cannot use blocked or unreachable pages as availability evidence.`);
  }

  const isPsychiatry = nextProvider.type === "psychiatrist" || nextProvider.tags?.includes("psychiatry-service");
  if (isPsychiatry && nextProvider.referralType === "self" && !hasExplicitSelfReferralEvidence(nextProvider, decision)) {
    throw new Error(`${providerLabel(provider)} cannot be marked self-referral without explicit self-referral evidence.`);
  }

  if (isPsychiatry && provider.id?.startsWith("ranzcp-")
    && (provider.referralType === "gp" || provider.requiresReferral === true)
    && (nextProvider.referralType === "self" || nextProvider.requiresReferral === false)
    && (!hasExplicitSelfReferralEvidence(nextProvider, decision) || !approvals.has("ranzcp-referral-change"))) {
    throw new Error(`${providerLabel(provider)} is a RANZCP GP-referral record; changing to self-referral requires explicit source evidence and ranzcp-referral-change approval.`);
  }

  const addedTags = changedArrayValues(provider.tags, nextProvider.tags);
  const addedSupport = addedTags.filter((tag) => SUPPORT_TAGS.has(tag));
  if (addedSupport.length && !approvals.has("support-preference-tags") && !addedSupport.every((tag) => approvals.has(`tag:${tag}`)) && !evidenceText) {
    throw new Error(`${providerLabel(provider)} cannot add support-preference tags without evidence or explicit reviewer approval.`);
  }

  const addedTelehealth = addedTags.filter((tag) => TELEHEALTH_TAGS.has(tag));
  const telehealthTurnedOn = (provider.onlineAvailable !== true && nextProvider.onlineAvailable === true)
    || (provider.phoneSupport !== true && nextProvider.phoneSupport === true);
  if ((addedTelehealth.length || telehealthTurnedOn) && !approvals.has("telehealth") && !/\b(telehealth|online|video|zoom|phone appointment|remote|virtual)\b/i.test(evidenceText)) {
    throw new Error(`${providerLabel(provider)} cannot add telehealth/online claims without evidence or explicit telehealth approval.`);
  }

  const addedBroadTags = addedTags.filter((tag) => BROAD_TAGS.has(tag));
  if (addedBroadTags.length && !approvals.has("broad-tags") && !addedBroadTags.every((tag) => approvals.has(`tag:${tag}`)) && !evidenceText) {
    throw new Error(`${providerLabel(provider)} cannot add broad need tags without source evidence or explicit reviewer approval.`);
  }

  if ((provider.type === "directory" || provider.tags?.includes("directory")) && nextProvider.type !== "directory" && !hasDirectPracticeContact(nextProvider)) {
    throw new Error(`${providerLabel(provider)} cannot be changed from directory to direct provider without direct provider contact/source.`);
  }

  if (["psychologist", "psychiatrist"].includes(nextProvider.type)
    && isRegisterOrDirectorySource(nextProvider)
    && isSameSourceWebsite(nextProvider)
    && !hasDirectPracticeContact(nextProvider)) {
    throw new Error(`${providerLabel(provider)} is register/directory-only and cannot become a public contact provider without separate practice contact evidence.`);
  }
}

function oldFieldsFor(provider, correctedFields) {
  return Object.fromEntries(Object.keys(correctedFields || {}).map((field) => [field, provider[field]]));
}

function applyCorrectedFields(provider, correctedFields) {
  return { ...provider, ...clone(correctedFields || {}) };
}

function makeWatchlistItem(provider, decision) {
  const checkedDate = decision.reviewedDate || new Date().toISOString().slice(0, 10);
  return {
    id: provider.id,
    name: provider.name,
    type: provider.type,
    region: provider.region,
    city: provider.city,
    url: decision.sourceUrl || provider.availabilitySource || provider.source || provider.website || "",
    lastKnownStatus: provider.availabilityStatus === "referrals_paused" ? "referrals_paused" : "unavailable",
    reason: decision.sourceExcerpt || provider.availabilityEvidence || decision.reviewNotes || "Moved from live providers by manual review decision.",
    unavailablePatterns: [
      "not\\s+(?:currently\\s+)?(?:taking|accepting)\\s+(?:on\\s+)?new\\s+(?:clients|patients|referrals)",
      "books?\\s+(?:are\\s+)?closed",
      "no\\s+(?:current\\s+)?availability",
      "referrals?\\s+(?:are\\s+)?paused"
    ],
    availablePatterns: [
      "taking\\s+new\\s+(?:clients|patients|referrals)",
      "accepting\\s+new\\s+(?:clients|patients|referrals)",
      "new\\s+client\\s+enquir(?:y|ies)",
      "book\\s+(?:an\\s+)?appointment"
    ],
    checkedAt: checkedDate,
    providerCandidate: {
      name: provider.name,
      clinicianName: provider.clinicianName || "",
      practiceName: provider.practiceName || "",
      type: provider.type,
      region: provider.region,
      city: provider.city,
      address: provider.address || "",
      phone: provider.phone || "",
      text: provider.text || "",
      email: provider.email || "",
      website: provider.website || "",
      source: provider.source || "",
      tags: provider.tags || [],
      needScope: provider.needScope || [],
      fit: provider.fit || "",
      firstStep: provider.firstStep || "",
      cost: provider.cost || "",
      confidence: provider.confidence || "low",
      sourceQuality: provider.sourceQuality || ""
    }
  };
}

function updateWatchlist(watchlist, item) {
  const next = Array.isArray(watchlist) ? { version: 1, updated: new Date().toISOString().slice(0, 10), items: watchlist } : clone(watchlist || { version: 1, items: [] });
  next.version = next.version || 1;
  next.updated = new Date().toISOString().slice(0, 10);
  next.items = Array.isArray(next.items) ? next.items : [];
  const index = next.items.findIndex((existing) => existing.id === item.id);
  if (index >= 0) next.items[index] = { ...next.items[index], ...item };
  else next.items.push(item);
  return next;
}

function makeLogEvent({ provider, action, decision, oldFields, newFields, correctedFields }) {
  return {
    eventId: crypto.randomUUID(),
    providerId: provider?.id || decision.providerId || "",
    providerName: provider?.name || decision.providerName || "",
    action,
    reviewer: decision.reviewer || "",
    reviewedDate: decision.reviewedDate || "",
    sourceUrl: decision.sourceUrl || decision.correctedFields?.source || provider?.source || provider?.website || "",
    sourceExcerpt: decision.sourceExcerpt || decision.correctedFields?.availabilityEvidence || decision.correctedFields?.referralSourceExcerpt || "",
    auditRulesResolved: Array.isArray(decision.auditRulesResolved) ? decision.auditRulesResolved : [],
    oldFields,
    newFields,
    correctedFields: correctedFields || {},
    notes: decision.reviewNotes || decision.notes || "",
    generatedAt: new Date().toISOString()
  };
}

export function applyReviewDecisions({
  providers,
  decisions,
  watchlist = { version: 1, items: [] },
  allowUnsafeFields = false
}) {
  const nextProviders = clone(providers);
  let nextWatchlist = clone(watchlist);
  const events = [];
  const errors = [];
  const applied = [];

  for (const decision of decisionList(decisions)) {
    const action = decision.action || decision.reviewDecision;
    if (!VALID_DECISIONS.has(action)) {
      errors.push({ providerId: decision.providerId || "", action, error: `Unsupported review decision "${action}".` });
      continue;
    }
    const index = nextProviders.findIndex((provider) => provider.id === decision.providerId);
    const provider = index >= 0 ? nextProviders[index] : null;
    if (!provider) {
      errors.push({ providerId: decision.providerId || "", action, error: "Provider not found in providers.json." });
      continue;
    }

    try {
      ensureAllowedFields(decision.correctedFields || {}, allowUnsafeFields);
      const correctedFields = clone(decision.correctedFields || {});
      let oldFields = {};
      let newFields = {};

      if (action === "needs_more_info") {
        oldFields = {};
        newFields = {};
      } else if (action === "approve") {
        const reviewedMonth = monthFromDate(decision.reviewedDate);
        const nextProvider = {
          ...provider,
          needsManualVerification: false,
          lastVerified: provider.lastVerified || reviewedMonth,
          verified: provider.verified || reviewedMonth,
          ...correctedFields
        };
        validateSafety(provider, nextProvider, decision);
        oldFields = oldFieldsFor(provider, { needsManualVerification: false, lastVerified: nextProvider.lastVerified, verified: nextProvider.verified, ...correctedFields });
        newFields = {
          needsManualVerification: nextProvider.needsManualVerification,
          lastVerified: nextProvider.lastVerified,
          verified: nextProvider.verified,
          ...correctedFields
        };
        nextProviders[index] = nextProvider;
      } else if (action === "adjust") {
        const nextProvider = applyCorrectedFields(provider, correctedFields);
        validateSafety(provider, nextProvider, decision);
        oldFields = oldFieldsFor(provider, correctedFields);
        newFields = Object.fromEntries(Object.keys(correctedFields).map((field) => [field, nextProvider[field]]));
        nextProviders[index] = nextProvider;
      } else if (action === "reject") {
        oldFields = clone(provider);
        newFields = { excludedFromLiveProviders: true };
        nextProviders.splice(index, 1);
      } else if (action === "move_to_watchlist") {
        const watchlistItem = makeWatchlistItem(provider, decision);
        nextWatchlist = updateWatchlist(nextWatchlist, watchlistItem);
        oldFields = clone(provider);
        newFields = { movedToWatchlist: watchlistItem.id };
        nextProviders.splice(index, 1);
      } else if (action === "duplicate") {
        if (!decision.keptProviderId) throw new Error("duplicate decision requires keptProviderId.");
        if (!nextProviders.some((candidate) => candidate.id === decision.keptProviderId)) throw new Error(`keptProviderId "${decision.keptProviderId}" was not found.`);
        oldFields = clone(provider);
        newFields = { duplicateOf: decision.keptProviderId };
        nextProviders.splice(index, 1);
      }

      events.push(makeLogEvent({ provider, action, decision, oldFields, newFields, correctedFields }));
      applied.push({ providerId: provider.id, action });
    } catch (error) {
      errors.push({ providerId: decision.providerId || "", action, error: error.message });
    }
  }

  return { providers: nextProviders, watchlist: nextWatchlist, events, errors, applied };
}

export function runCli(argv = process.argv.slice(2)) {
  const config = parseArgs(argv);
  const providers = readJsonIfExists(config.providers, []);
  const decisions = readJsonIfExists(config.decisions, { decisions: [] });
  const watchlist = readJsonIfExists(config.watchlist, { version: 1, items: [] });
  const result = applyReviewDecisions({
    providers,
    decisions,
    watchlist,
    allowUnsafeFields: config.allowUnsafeFields
  });

  if (result.errors.length) {
    for (const error of result.errors) console.error(`ERROR ${error.providerId} ${error.action}: ${error.error}`);
    process.exitCode = 1;
    return result;
  }

  if (!config.dryRun) {
    writeJson(config.providers, result.providers);
    writeJson(config.watchlist, result.watchlist);
    appendJsonl(config.log, result.events);
  }

  console.log(`${config.dryRun ? "Validated" : "Applied"} ${result.applied.length} provider review decision(s).`);
  console.log(`Review log events: ${result.events.length}${config.dryRun ? " (dry run; not written)" : ""}.`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
