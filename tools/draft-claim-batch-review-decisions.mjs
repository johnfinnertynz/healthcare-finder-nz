import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULTS = {
  claimQueue: "data/provider-claim-review-queue.json",
  providers: "providers.json",
  jsonOut: "data/provider-claim-batch-decision-draft.json",
  mdOut: "PROVIDER_CLAIM_BATCH_DECISION_DRAFT.md",
  batchKey: "",
  providerId: "",
  decision: "needs_more_info",
  field: "",
  removeValues: [],
  removeClaimValues: false,
  reviewer: "",
  reviewedDate: "",
  sourceUrl: "",
  sourceExcerpt: "",
  notes: "",
  confirmedHumanReview: false,
  limit: Infinity
};

const VALID_DECISIONS = new Set(["adjust", "needs_more_info"]);
const ARRAY_FIELDS = new Set(["tags", "needScope", "specialties", "services", "patientGroups", "ageGroups"]);

function parseArgs(argv = process.argv.slice(2)) {
  const config = { ...DEFAULTS };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--claim-queue") config.claimQueue = argv[++index];
    else if (arg === "--providers") config.providers = argv[++index];
    else if (arg === "--json-out") config.jsonOut = argv[++index];
    else if (arg === "--md-out") config.mdOut = argv[++index];
    else if (arg === "--batch-key") config.batchKey = argv[++index];
    else if (arg === "--provider-id") config.providerId = argv[++index];
    else if (arg === "--decision") config.decision = argv[++index];
    else if (arg === "--field") config.field = argv[++index];
    else if (arg === "--remove-values") config.removeValues = splitCsv(argv[++index]);
    else if (arg === "--remove-claim-values") config.removeClaimValues = true;
    else if (arg === "--reviewer") config.reviewer = argv[++index];
    else if (arg === "--reviewed-date") config.reviewedDate = argv[++index];
    else if (arg === "--source-url") config.sourceUrl = argv[++index];
    else if (arg === "--source-excerpt") config.sourceExcerpt = argv[++index];
    else if (arg === "--notes") config.notes = argv[++index];
    else if (arg === "--confirmed-human-review") config.confirmedHumanReview = true;
    else if (arg === "--limit") config.limit = Number(argv[++index]);
  }
  return config;
}

function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null && String(value).trim() !== ""))];
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function evidenceText(config) {
  return [config.sourceExcerpt, config.notes].filter(Boolean).join(" ");
}

function assertConfig(config) {
  if (!config.batchKey) throw new Error("--batch-key is required.");
  if (!VALID_DECISIONS.has(config.decision)) throw new Error(`Unsupported --decision "${config.decision}". Use adjust or needs_more_info.`);
  if (config.decision === "adjust") {
    if (!config.confirmedHumanReview) throw new Error("--confirmed-human-review is required before drafting adjustment decisions.");
    if (!config.reviewer.trim()) throw new Error("--reviewer is required before drafting adjustment decisions.");
    if (evidenceText(config).replace(/\s+/g, "").length < 12) throw new Error("--source-excerpt or --notes must explain the reviewed evidence.");
    if (config.removeClaimValues && config.removeValues.length) throw new Error("Use either --remove-claim-values or --remove-values, not both.");
  }
}

function itemsForBatch(queue, config) {
  const items = asArray(queue.items).filter((item) => item.batchKey === config.batchKey);
  const filtered = config.providerId ? items.filter((item) => item.providerId === config.providerId) : items;
  if (Number.isFinite(config.limit) && config.limit > 0) return filtered.slice(0, config.limit);
  return filtered;
}

function groupByProvider(items) {
  const map = new Map();
  for (const item of items) {
    const bucket = map.get(item.providerId) || [];
    bucket.push(item);
    map.set(item.providerId, bucket);
  }
  return [...map.entries()];
}

function valuesToRemove(items, config, field) {
  const values = config.removeClaimValues
    ? items.filter((item) => item.claimField === field).map((item) => item.claimValue)
    : config.removeValues;
  return new Set(unique(values.map((value) => String(value))));
}

function reviewNotesFor(providerItems, config, field, removedValues) {
  return [
    config.notes,
    `Drafted from claim batch: ${config.batchKey}`,
    field ? `Field: ${field}` : "",
    removedValues.length ? `Proposed removal values: ${removedValues.join(", ")}` : "",
    `Claim rows represented: ${providerItems.length}`,
    "Draft only. Apply through tools/apply-provider-review-decisions.mjs after validation."
  ].filter(Boolean).join("\n");
}

function sourceUrlFor(providerItems, config, provider) {
  return config.sourceUrl
    || providerItems.flatMap((item) => asArray(item.sourceUrls))[0]
    || provider.source
    || provider.website
    || "";
}

function draftNeedsMoreInfo(providerId, provider, providerItems, config) {
  return {
    reviewId: `claim-batch:${providerId}:${config.batchKey}`,
    providerId,
    action: "needs_more_info",
    reviewer: config.reviewer,
    reviewedDate: config.reviewedDate || today(),
    sourceUrl: sourceUrlFor(providerItems, config, provider),
    sourceExcerpt: config.sourceExcerpt,
    auditRulesResolved: unique(providerItems.flatMap((item) => asArray(item.auditRules))),
    correctedFields: {},
    reviewNotes: reviewNotesFor(providerItems, config, "", [])
  };
}

function draftAdjust(providerId, provider, providerItems, config) {
  const field = config.field || providerItems[0]?.claimField || "";
  if (!ARRAY_FIELDS.has(field)) {
    throw new Error(`Batch adjustment currently supports array fields only (${[...ARRAY_FIELDS].join(", ")}). Got "${field}".`);
  }
  const current = asArray(provider[field]).map((value) => String(value));
  const removeSet = valuesToRemove(providerItems, config, field);
  if (!removeSet.size) throw new Error("No values were selected for removal.");
  const next = current.filter((value) => !removeSet.has(value));
  const removed = current.filter((value) => removeSet.has(value));
  if (!removed.length) return null;
  return {
    reviewId: `claim-batch:${providerId}:${config.batchKey}`,
    providerId,
    action: "adjust",
    reviewer: config.reviewer,
    reviewedDate: config.reviewedDate || today(),
    sourceUrl: sourceUrlFor(providerItems, config, provider),
    sourceExcerpt: config.sourceExcerpt,
    auditRulesResolved: unique(providerItems.flatMap((item) => asArray(item.auditRules))),
    correctedFields: {
      [field]: next
    },
    reviewNotes: reviewNotesFor(providerItems, config, field, removed)
  };
}

export function buildClaimBatchDecisionDraft(config = {}) {
  const merged = { ...DEFAULTS, ...config };
  assertConfig(merged);
  const claimQueue = readJson(merged.claimQueue);
  const providers = readJson(merged.providers);
  const providersById = new Map(providers.map((provider) => [provider.id, provider]));
  const items = itemsForBatch(claimQueue, merged);
  if (!items.length) throw new Error(`No claim queue items matched batch key "${merged.batchKey}".`);

  const decisions = [];
  const skipped = [];
  for (const [providerId, providerItems] of groupByProvider(items)) {
    const provider = providersById.get(providerId);
    if (!provider) {
      skipped.push({ providerId, reason: "Provider not found in providers.json." });
      continue;
    }
    const decision = merged.decision === "adjust"
      ? draftAdjust(providerId, provider, providerItems, merged)
      : draftNeedsMoreInfo(providerId, provider, providerItems, merged);
    if (decision) decisions.push(decision);
    else skipped.push({ providerId, reason: "No field value would change." });
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    sourceQueueGeneratedAt: claimQueue.generatedAt || "",
    safety: {
      draftOnly: true,
      noLiveProviderMutation: true,
      applyRequiresReviewScript: true,
      highRiskAdjustmentsRequireConfirmedHumanReview: true,
      noAddedTagsOrCapabilities: merged.decision === "adjust"
    },
    input: {
      batchKey: merged.batchKey,
      providerId: merged.providerId,
      decision: merged.decision,
      field: merged.field,
      removeValues: merged.removeValues,
      removeClaimValues: merged.removeClaimValues,
      confirmedHumanReview: merged.confirmedHumanReview
    },
    summary: {
      claimRowsMatched: items.length,
      uniqueProvidersMatched: groupByProvider(items).length,
      decisionsDrafted: decisions.length,
      skipped: skipped.length
    },
    decisions,
    skipped
  };
}

function writeMarkdown(filePath, draft) {
  const lines = [
    "# Provider Claim Batch Decision Draft",
    "",
    `Generated: ${draft.generatedAt}`,
    "",
    "This is a draft review-decision file. It does not change `providers.json` and it must be applied only through `tools/apply-provider-review-decisions.mjs` after validation.",
    "",
    "## Summary",
    "",
    `- Batch key: ${draft.input.batchKey}`,
    `- Decision: ${draft.input.decision}`,
    `- Claim rows matched: ${draft.summary.claimRowsMatched}`,
    `- Unique providers matched: ${draft.summary.uniqueProvidersMatched}`,
    `- Decisions drafted: ${draft.summary.decisionsDrafted}`,
    `- Skipped: ${draft.summary.skipped}`,
    "",
    "## Draft Decisions",
    "",
    "| Provider | Action | Corrected fields |",
    "| --- | --- | --- |"
  ];
  for (const decision of draft.decisions.slice(0, 80)) {
    lines.push(`| ${decision.providerId} | ${decision.action} | ${JSON.stringify(decision.correctedFields).replace(/\|/g, "\\|")} |`);
  }
  if (draft.skipped.length) {
    lines.push("", "## Skipped", "", "| Provider | Reason |", "| --- | --- |");
    for (const item of draft.skipped) lines.push(`| ${item.providerId} | ${item.reason.replace(/\|/g, "\\|")} |`);
  }
  lines.push(
    "",
    "## Safety",
    "",
    "- Drafts are not live data changes.",
    "- The tool only drafts `needs_more_info` or array-value removals for `adjust` decisions.",
    "- High-risk adjustments require `--confirmed-human-review`, reviewer name, and source excerpt or notes.",
    "- Run `npm run validate`, `npm test`, and the relevant audits after applying any reviewed decision file."
  );
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

export function writeClaimBatchDecisionDraft(draft, config = {}) {
  const merged = { ...DEFAULTS, ...config };
  writeJson(merged.jsonOut, draft);
  writeMarkdown(merged.mdOut, draft);
}

export function runCli(argv = process.argv.slice(2)) {
  const config = parseArgs(argv);
  const draft = buildClaimBatchDecisionDraft(config);
  writeClaimBatchDecisionDraft(draft, config);
  console.log(`Drafted ${draft.summary.decisionsDrafted} decision(s) from ${draft.summary.claimRowsMatched} claim row(s).`);
  console.log(`JSON: ${path.resolve(config.jsonOut)}`);
  console.log(`Markdown: ${path.resolve(config.mdOut)}`);
  return draft;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
