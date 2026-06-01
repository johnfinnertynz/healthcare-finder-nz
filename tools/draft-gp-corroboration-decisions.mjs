import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULTS = {
  pack: "data/gp-corroboration-review-pack.json",
  providers: "providers.json",
  jsonOut: "data/gp-corroboration-decision-draft.json",
  mdOut: "GP_CORROBORATION_DECISION_DRAFT.md",
  status: "captured",
  priority: "ready_for_source_capture",
  region: "",
  providerId: "",
  sourceCategory: "",
  reviewer: "",
  reviewedDate: "",
  notes: "",
  sourceExcerpt: "",
  confirmedHumanReview: false,
  decision: "adjust",
  limit: Infinity
};

const CONTACT_SOURCE_FIELDS = new Set([
  "website",
  "source",
  "sourceQuality",
  "phone",
  "email",
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
    else if (arg === "--status") config.status = argv[++index];
    else if (arg === "--priority") config.priority = argv[++index];
    else if (arg === "--region") config.region = argv[++index];
    else if (arg === "--provider-id") config.providerId = argv[++index];
    else if (arg === "--source-category") config.sourceCategory = argv[++index];
    else if (arg === "--reviewer") config.reviewer = argv[++index];
    else if (arg === "--reviewed-date") config.reviewedDate = argv[++index];
    else if (arg === "--notes") config.notes = argv[++index];
    else if (arg === "--source-excerpt") config.sourceExcerpt = argv[++index];
    else if (arg === "--confirmed-human-review") config.confirmedHumanReview = true;
    else if (arg === "--decision") config.decision = argv[++index];
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

function sourceCategory(item) {
  return item.bestCandidate?.sourceCategory || item.sourceQuality || "";
}

function itemSourceUrl(item) {
  return item.sourceCapture?.finalUrl
    || item.sourceCapture?.requestedUrl
    || item.bestCandidate?.website
    || item.bestCandidate?.googleMapsUri
    || item.source
    || "";
}

function itemSourceExcerpt(item, config) {
  return config.sourceExcerpt
    || item.suggestedSourceExcerpt
    || item.sourceCapture?.suggestedSourceExcerpt
    || asArray(item.sourceCapture?.claims).map((claim) => claim.excerpt).find(Boolean)
    || "";
}

function reviewedSourceQuality(item) {
  const category = sourceCategory(item);
  if (category === "healthpoint_gp_listing") return "Healthpoint GP listing; human-reviewed public source";
  if (category === "practice_or_network_site") return "practice or clinic network website; human-reviewed public source";
  return item.draftCorrectedFields?.sourceQuality || item.correctedFields?.sourceQuality || "human-reviewed public GP source";
}

function cleanCorrectedFields(item) {
  const raw = { ...(item.draftCorrectedFields || item.correctedFields || {}) };
  const unsafe = Object.keys(raw).filter((field) => !CONTACT_SOURCE_FIELDS.has(field));
  if (unsafe.length) throw new Error(`Unsafe GP corroboration corrected field(s) for ${item.providerId}: ${unsafe.join(", ")}`);
  if (raw.sourceQuality) raw.sourceQuality = reviewedSourceQuality(item);
  return raw;
}

function assertConfig(config) {
  if (!["adjust", "needs_more_info"].includes(config.decision)) throw new Error(`Unsupported --decision "${config.decision}".`);
  if (config.decision === "adjust") {
    if (!config.confirmedHumanReview) throw new Error("--confirmed-human-review is required before drafting GP corroboration adjustments.");
    if (!config.reviewer.trim()) throw new Error("--reviewer is required before drafting GP corroboration adjustments.");
  }
}

function filteredItems(pack, config) {
  let items = asArray(pack.items);
  if (config.status) items = items.filter((item) => (item.sourceCapture?.status || "") === config.status);
  if (config.priority) items = items.filter((item) => item.priority === config.priority);
  if (config.region) items = items.filter((item) => item.region === config.region);
  if (config.providerId) items = items.filter((item) => item.providerId === config.providerId);
  if (config.sourceCategory) items = items.filter((item) => sourceCategory(item) === config.sourceCategory);
  if (Number.isFinite(config.limit) && config.limit > 0) items = items.slice(0, config.limit);
  return items;
}

function decisionForAdjust(item, provider, config) {
  const correctedFields = cleanCorrectedFields(item);
  if (!Object.keys(correctedFields).length) return { skipped: "No contact/source fields to update." };
  const sourceExcerpt = itemSourceExcerpt(item, config);
  if (!meaningfulText(sourceExcerpt)) return { skipped: "Missing human-checkable source excerpt." };
  return {
    decision: {
      reviewId: `gp-corroboration:${item.providerId}`,
      providerId: item.providerId,
      action: "adjust",
      reviewer: config.reviewer,
      reviewedDate: config.reviewedDate || today(),
      sourceUrl: itemSourceUrl(item) || provider.source || provider.website || "",
      sourceExcerpt,
      auditRulesResolved: unique(["gp-corroboration-review-pack", "weak-gp-source", ...asArray(item.auditRules)]),
      correctedFields,
      reviewNotes: [
        config.notes,
        "Drafted from a reviewer-confirmed GP corroboration review-pack row.",
        "Only public contact/source fields are updated.",
        "No availability, enrolment, mental-health scope, cultural support, funding, or referral claims are approved by this decision.",
        `Source capture status: ${item.sourceCapture?.status || "unknown"}`,
        `Candidate source category: ${sourceCategory(item) || "unknown"}`
      ].filter(Boolean).join("\n")
    }
  };
}

function decisionForNeedsMoreInfo(item, config) {
  return {
    decision: {
      reviewId: `gp-corroboration:${item.providerId}`,
      providerId: item.providerId,
      action: "needs_more_info",
      reviewer: config.reviewer,
      reviewedDate: config.reviewedDate || today(),
      sourceUrl: itemSourceUrl(item),
      sourceExcerpt: config.sourceExcerpt || item.suggestedSourceExcerpt || "",
      auditRulesResolved: unique(["gp-corroboration-review-pack", ...asArray(item.auditRules)]),
      correctedFields: {},
      reviewNotes: [
        config.notes,
        `GP corroboration source capture status: ${item.sourceCapture?.status || "unknown"}.`,
        item.sourceCapture?.error ? `Source issue: ${item.sourceCapture.error}` : "",
        "No live provider data should change from this draft."
      ].filter(Boolean).join("\n")
    }
  };
}

export function buildGpCorroborationDecisionDraft(config = {}) {
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
    gpCorroborationReviewPackGeneratedAt: pack.generatedAt || "",
    safety: {
      draftOnly: true,
      noLiveProviderMutation: true,
      applyRequiresReviewScript: true,
      confirmedHumanReviewRequiredForAdjust: merged.decision === "adjust",
      contactAndSourceFieldsOnly: true,
      noAvailabilityOrScopeClaims: true,
      noAcceptingFromSilence: true
    },
    input: {
      decision: merged.decision,
      status: merged.status,
      priority: merged.priority,
      region: merged.region,
      providerId: merged.providerId,
      sourceCategory: merged.sourceCategory,
      confirmedHumanReview: merged.confirmedHumanReview
    },
    summary: {
      packRowsMatched: items.length,
      decisionsDrafted: decisions.length,
      skipped: skipped.length
    },
    decisions,
    skipped
  };
}

function writeMarkdown(filePath, draft) {
  const lines = [
    "# GP Corroboration Decision Draft",
    "",
    `Generated: ${draft.generatedAt}`,
    "",
    "This draft turns reviewed GP corroboration review-pack rows into controlled review decisions. It does not change `providers.json`; apply only through `npm run apply:review` after checking the source.",
    "",
    "## Summary",
    "",
    `- Pack rows matched: ${draft.summary.packRowsMatched}`,
    `- Decisions drafted: ${draft.summary.decisionsDrafted}`,
    `- Skipped: ${draft.summary.skipped}`,
    "",
    "## Draft Decisions",
    "",
    "| Provider | Action | Source | Corrected fields |",
    "| --- | --- | --- | --- |"
  ];
  for (const decision of draft.decisions.slice(0, 100)) {
    lines.push(`| ${decision.providerId} | ${decision.action} | ${decision.sourceUrl || ""} | ${JSON.stringify(decision.correctedFields).replace(/\|/g, "\\|")} |`);
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
    "- The helper only drafts contact/source updates such as website, source, sourceQuality, public phone, address, or coordinates.",
    "- It does not approve availability, enrolment status, clinical scope, cultural support, funding, or referral claims.",
    "- Apply through `npm run apply:review`, then rerun validation, audits, tests, and link checks before committing."
  );
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

export function writeGpCorroborationDecisionDraft(draft, config = {}) {
  const merged = { ...DEFAULTS, ...config };
  writeJson(merged.jsonOut, draft);
  writeMarkdown(merged.mdOut, draft);
}

export function runCli(argv = process.argv.slice(2)) {
  const config = parseArgs(argv);
  const draft = buildGpCorroborationDecisionDraft(config);
  writeGpCorroborationDecisionDraft(draft, config);
  console.log(`Drafted ${draft.summary.decisionsDrafted} GP corroboration decision(s) from ${draft.summary.packRowsMatched} review-pack row(s).`);
  console.log(`JSON: ${path.resolve(config.jsonOut)}`);
  console.log(`Markdown: ${path.resolve(config.mdOut)}`);
  return draft;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
