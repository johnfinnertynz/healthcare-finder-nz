import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULTS = {
  pack: "data/location-distance-review-pack.json",
  providers: "providers.json",
  jsonOut: "data/location-distance-decision-draft.json",
  mdOut: "LOCATION_DISTANCE_DECISION_DRAFT.md",
  decision: "adjust",
  batchKey: "",
  priority: "",
  issueType: "",
  region: "",
  type: "",
  providerId: "",
  reviewer: "",
  reviewedDate: "",
  notes: "",
  sourceExcerpt: "",
  confirmedHumanReview: false,
  limit: Infinity
};

const LOCATION_FIELDS = new Set([
  "address",
  "lat",
  "lon",
  "coordinateSource",
  "coordinatePrecision",
  "coordinateConfidence",
  "geocodeNeedsManualReview"
]);

function parseArgs(argv = process.argv.slice(2)) {
  const config = { ...DEFAULTS };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--pack") config.pack = argv[++index];
    else if (arg === "--providers") config.providers = argv[++index];
    else if (arg === "--json-out") config.jsonOut = argv[++index];
    else if (arg === "--md-out") config.mdOut = argv[++index];
    else if (arg === "--decision") config.decision = argv[++index];
    else if (arg === "--batch-key") config.batchKey = argv[++index];
    else if (arg === "--priority") config.priority = argv[++index];
    else if (arg === "--issue-type") config.issueType = argv[++index];
    else if (arg === "--region") config.region = argv[++index];
    else if (arg === "--type") config.type = argv[++index];
    else if (arg === "--provider-id") config.providerId = argv[++index];
    else if (arg === "--reviewer") config.reviewer = argv[++index];
    else if (arg === "--reviewed-date") config.reviewedDate = argv[++index];
    else if (arg === "--notes") config.notes = argv[++index];
    else if (arg === "--source-excerpt") config.sourceExcerpt = argv[++index];
    else if (arg === "--confirmed-human-review") config.confirmedHumanReview = true;
    else if (arg === "--limit") config.limit = Number(argv[++index]);
  }
  return config;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null && String(value).trim() !== ""))];
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function compact(value, max = 320) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function meaningfulText(value) {
  return String(value || "").replace(/\s+/g, "").length >= 20;
}

function countBy(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item) || "unknown";
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function itemSourceUrl(item) {
  return item.bestCandidate?.googleMapsUri
    || item.bestCandidate?.website
    || asArray(item.sourceUrls).find(Boolean)
    || item.currentProvider?.source
    || item.currentProvider?.website
    || item.source
    || "";
}

function itemSourceExcerpt(item, config) {
  return config.sourceExcerpt
    || item.sourceEvidenceSummary
    || item.bestCandidate?.address
    || asArray(item.sourceEvidence?.locationDistanceReview).map((claim) => claim.excerpt).find(Boolean)
    || "";
}

function cleanCorrectedFields(item, provider) {
  const raw = { ...(item.draftCorrectedFields || item.correctedFields || {}) };
  const unsafe = Object.keys(raw).filter((field) => !LOCATION_FIELDS.has(field));
  if (unsafe.length) throw new Error(`Unsafe location corrected field(s) for ${item.providerId}: ${unsafe.join(", ")}`);
  const cleaned = Object.fromEntries(Object.entries(raw).filter(([, value]) => value !== undefined && value !== ""));
  if (cleaned.coordinateSource === "google_places_candidate_pending_human_review") {
    cleaned.coordinateSource = `Google Places public business listing; human-reviewed ${today()}`;
  }
  if (cleaned.geocodeNeedsManualReview === true) cleaned.geocodeNeedsManualReview = false;
  if (provider.address && cleaned.address && cleaned.address !== provider.address && !item.bestCandidate?.matchSignals?.includes("address")) {
    delete cleaned.address;
  }
  return cleaned;
}

function assertConfig(config) {
  if (!["adjust", "needs_more_info"].includes(config.decision)) throw new Error(`Unsupported --decision "${config.decision}".`);
  if (config.decision === "adjust") {
    if (!config.confirmedHumanReview) throw new Error("--confirmed-human-review is required before drafting location adjustments.");
    if (!config.reviewer.trim()) throw new Error("--reviewer is required before drafting location adjustments.");
  }
}

function filteredItems(pack, config) {
  let items = asArray(pack.items);
  if (config.batchKey) items = items.filter((item) => item.batchKey === config.batchKey);
  if (config.priority) items = items.filter((item) => item.priority === config.priority);
  if (config.issueType) items = items.filter((item) => item.issueType === config.issueType);
  if (config.region) items = items.filter((item) => item.region === config.region);
  if (config.type) items = items.filter((item) => item.type === config.type);
  if (config.providerId) items = items.filter((item) => item.providerId === config.providerId);
  if (Number.isFinite(config.limit) && config.limit > 0) items = items.slice(0, config.limit);
  return items;
}

function decisionForAdjust(item, provider, config) {
  const correctedFields = cleanCorrectedFields(item, provider);
  if (!Object.keys(correctedFields).length) return { skipped: "No location fields to update." };
  const sourceExcerpt = itemSourceExcerpt(item, config);
  if (!meaningfulText(sourceExcerpt)) return { skipped: "Missing human-checkable source excerpt or location note." };
  return {
    decision: {
      reviewId: `location-distance:${item.providerId}`,
      providerId: item.providerId,
      action: "adjust",
      reviewer: config.reviewer,
      reviewedDate: config.reviewedDate || today(),
      sourceUrl: itemSourceUrl(item),
      sourceExcerpt,
      auditRulesResolved: unique(["location-distance-review-pack", item.issueType, ...asArray(item.auditRules)]),
      correctedFields,
      reviewNotes: [
        config.notes,
        "Drafted from a reviewer-confirmed location/distance review-pack row.",
        "Only public address and coordinate metadata fields are updated.",
        "No provider type, clinical scope, availability, referral, cost, telehealth, or support-preference claims are approved by this decision.",
        `Location issue: ${item.issueType || "unknown"}.`,
        `Candidate match strength: ${item.bestCandidate?.matchStrength || "no candidate"}.`
      ].filter(Boolean).join("\n")
    }
  };
}

function decisionForNeedsMoreInfo(item, config) {
  return {
    decision: {
      reviewId: `location-distance:${item.providerId}`,
      providerId: item.providerId,
      action: "needs_more_info",
      reviewer: config.reviewer,
      reviewedDate: config.reviewedDate || today(),
      sourceUrl: itemSourceUrl(item),
      sourceExcerpt: config.sourceExcerpt || item.sourceEvidenceSummary || "",
      auditRulesResolved: unique(["location-distance-review-pack", item.issueType, ...asArray(item.auditRules)]),
      correctedFields: {},
      reviewNotes: [
        config.notes,
        `Location/distance issue: ${item.issueType || "unknown"}.`,
        `Review-pack priority: ${item.priority || "unknown"}.`,
        "No live provider data should change from this draft."
      ].filter(Boolean).join("\n")
    }
  };
}

export function buildLocationDistanceDecisionDraft(config = {}) {
  const merged = { ...DEFAULTS, ...config };
  assertConfig(merged);
  const pack = readJson(merged.pack);
  const providers = readJson(merged.providers);
  const providersById = new Map(providers.map((provider) => [provider.id, provider]));
  const items = filteredItems(pack, merged);
  const decisions = [];
  const skipped = [];

  for (const item of items) {
    const provider = providersById.get(item.providerId);
    if (!provider) {
      skipped.push({ providerId: item.providerId || "", reason: "Provider not found in providers.json." });
      continue;
    }

    try {
      const result = merged.decision === "adjust"
        ? decisionForAdjust(item, provider, merged)
        : decisionForNeedsMoreInfo(item, merged);
      if (result.skipped) skipped.push({ providerId: item.providerId, reason: result.skipped });
      else decisions.push(result.decision);
    } catch (error) {
      skipped.push({ providerId: item.providerId || "", reason: error.message });
    }
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    locationDistanceReviewPackGeneratedAt: pack.generatedAt || "",
    safety: {
      draftOnly: true,
      noLiveProviderMutation: true,
      applyRequiresReviewScript: true,
      confirmedHumanReviewRequiredForAdjust: merged.decision === "adjust",
      locationFieldsOnly: true,
      googlePlacesIsCorroborationOnly: true,
      noClinicalAvailabilityReferralOrSupportClaims: true
    },
    input: {
      decision: merged.decision,
      batchKey: merged.batchKey,
      priority: merged.priority,
      issueType: merged.issueType,
      region: merged.region,
      type: merged.type,
      providerId: merged.providerId,
      confirmedHumanReview: merged.confirmedHumanReview
    },
    summary: {
      packRowsMatched: items.length,
      decisionsDrafted: decisions.length,
      skipped: skipped.length,
      byBatch: countBy(items, (item) => item.batchKey),
      byIssueType: countBy(items, (item) => item.issueType),
      byPriority: countBy(items, (item) => item.priority)
    },
    decisions,
    skipped
  };
}

function writeMarkdown(filePath, draft) {
  const lines = [
    "# Location Distance Decision Draft",
    "",
    `Generated: ${draft.generatedAt}`,
    "",
    "This draft turns reviewed location/distance review-pack rows into controlled review decisions. It does not change `providers.json`; apply only through `npm run apply:review` after checking the source.",
    "",
    "## Summary",
    "",
    `- Batch key: ${draft.input.batchKey || "(none)"}`,
    `- Issue type: ${draft.input.issueType || "(any)"}`,
    `- Priority: ${draft.input.priority || "(any)"}`,
    `- Pack rows matched: ${draft.summary.packRowsMatched}`,
    `- Decisions drafted: ${draft.summary.decisionsDrafted}`,
    `- Skipped: ${draft.summary.skipped}`,
    "",
    "## Rows By Batch",
    "",
    "| Batch | Rows |",
    "| --- | ---: |"
  ];
  for (const [batch, count] of Object.entries(draft.summary.byBatch || {}).sort()) {
    lines.push(`| ${String(batch).replace(/\|/g, "\\|")} | ${count} |`);
  }
  lines.push(
    "",
    "## Rows By Issue Type",
    "",
    "| Issue | Rows |",
    "| --- | ---: |"
  );
  for (const [issue, count] of Object.entries(draft.summary.byIssueType || {}).sort()) {
    lines.push(`| ${issue} | ${count} |`);
  }
  lines.push(
    "",
    "## Draft Decisions",
    "",
    "| Provider | Action | Source | Corrected fields |",
    "| --- | --- | --- | --- |"
  );
  for (const decision of draft.decisions.slice(0, 120)) {
    lines.push(`| ${decision.providerId} | ${decision.action} | ${decision.sourceUrl || ""} | ${compact(JSON.stringify(decision.correctedFields), 600).replace(/\|/g, "\\|")} |`);
  }
  if (draft.skipped.length) {
    lines.push("", "## Skipped", "", "| Provider | Reason |", "| --- | --- |");
    for (const item of draft.skipped) lines.push(`| ${item.providerId} | ${String(item.reason || "").replace(/\|/g, "\\|")} |`);
  }
  lines.push(
    "",
    "## Safety",
    "",
    "- Adjustment drafts require `--confirmed-human-review` and a reviewer.",
    "- The helper only drafts public address and coordinate metadata fields.",
    "- Google Places remains a location clue; it does not approve provider type, scope, availability, referral, cost, telehealth, or support-preference claims.",
    "- Apply through `npm run apply:review`, then rerun validation, audits, tests, and link checks before committing."
  );
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

export function writeLocationDistanceDecisionDraft(draft, config = {}) {
  const merged = { ...DEFAULTS, ...config };
  writeJson(merged.jsonOut, draft);
  writeMarkdown(merged.mdOut, draft);
}

export function runCli(argv = process.argv.slice(2)) {
  const config = parseArgs(argv);
  const draft = buildLocationDistanceDecisionDraft(config);
  writeLocationDistanceDecisionDraft(draft, config);
  console.log(`Drafted ${draft.summary.decisionsDrafted} location/distance decision(s) from ${draft.summary.packRowsMatched} review-pack row(s).`);
  console.log(`JSON: ${path.resolve(config.jsonOut)}`);
  console.log(`Markdown: ${path.resolve(config.mdOut)}`);
  return draft;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
