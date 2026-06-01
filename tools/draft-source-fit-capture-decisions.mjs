import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULTS = {
  capture: "data/provider-source-fit-evidence-capture.json",
  providers: "providers.json",
  jsonOut: "data/source-fit-capture-decision-draft.json",
  mdOut: "SOURCE_FIT_CAPTURE_DECISION_DRAFT.md",
  status: "safe_removal_candidate",
  statusExplicit: false,
  batchKey: "",
  providerId: "",
  rule: "",
  target: "",
  reviewer: "",
  reviewedDate: "",
  sourceUrl: "",
  sourceExcerpt: "",
  notes: "",
  confirmedHumanReview: false,
  limit: Infinity
};

const ALLOWED_STATUSES = new Set(["safe_removal_candidate", "source_support_found", "needs_human_browser_review", "source_skipped", "fetch_failed"]);
const APPLYABLE_FIELDS = new Set(["tags", "needScope", "advertisedSpecialties", "onlineAvailable", "phoneSupport"]);

function parseArgs(argv = process.argv.slice(2)) {
  const config = { ...DEFAULTS };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--capture") config.capture = argv[++index];
    else if (arg === "--providers") config.providers = argv[++index];
    else if (arg === "--json-out") config.jsonOut = argv[++index];
    else if (arg === "--md-out") config.mdOut = argv[++index];
    else if (arg === "--status") {
      config.status = argv[++index];
      config.statusExplicit = true;
    }
    else if (arg === "--batch-key") config.batchKey = argv[++index];
    else if (arg === "--provider-id") config.providerId = argv[++index];
    else if (arg === "--rule") config.rule = argv[++index];
    else if (arg === "--target") config.target = argv[++index];
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

function hasUsefulReviewText(config) {
  return [config.sourceExcerpt, config.notes].filter(Boolean).join(" ").replace(/\s+/g, "").length >= 12;
}

function assertConfig(config) {
  if (!ALLOWED_STATUSES.has(config.status)) throw new Error(`Unsupported --status "${config.status}".`);
}

function assertReviewPolicy(items, config) {
  const hasSafeRemoval = items.some((item) => item.status === "safe_removal_candidate");
  if (!hasSafeRemoval) return;
  if (!config.confirmedHumanReview) throw new Error("--confirmed-human-review is required before drafting source-fit removal decisions.");
  if (!config.reviewer.trim()) throw new Error("--reviewer is required before drafting source-fit removal decisions.");
  if (!hasUsefulReviewText(config)) throw new Error("--source-excerpt or --notes must explain the reviewer-confirmed source-fit removal.");
}

function filteredItems(capture, config) {
  let items = asArray(capture.items);
  if (config.batchKey) items = items.filter((item) => item.batchKey === config.batchKey);
  const shouldFilterStatus = config.statusExplicit || !config.batchKey || config.status !== DEFAULTS.status;
  if (shouldFilterStatus) items = items.filter((item) => item.status === config.status);
  if (config.providerId) items = items.filter((item) => item.providerId === config.providerId);
  if (config.rule) items = items.filter((item) => item.rule === config.rule);
  if (config.target) items = items.filter((item) => item.target === config.target);
  if (Number.isFinite(config.limit) && config.limit > 0) items = items.slice(0, config.limit);
  return items;
}

function groupByProvider(items) {
  const groups = new Map();
  for (const item of items) {
    const bucket = groups.get(item.providerId) || [];
    bucket.push(item);
    groups.set(item.providerId, bucket);
  }
  return [...groups.entries()];
}

function countBy(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item) || "unknown";
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function removeFromArray(current, values) {
  const remove = new Set(values.map((value) => String(value).toLowerCase()));
  return asArray(current).filter((value) => !remove.has(String(value).toLowerCase()));
}

function mergedCorrection(provider, items) {
  const removeTags = [];
  const removeNeedScope = [];
  const removeAdvertised = [];
  let turnOffOnline = false;
  let turnOffPhone = false;

  for (const item of items) {
    const fields = item.correctedFields || {};
    for (const field of Object.keys(fields)) {
      if (!APPLYABLE_FIELDS.has(field)) throw new Error(`Unsafe source-fit corrected field "${field}" for ${item.providerId}.`);
    }
    if (Array.isArray(fields.tags)) {
      const nextSet = new Set(fields.tags.map((value) => String(value)));
      removeTags.push(...asArray(provider.tags).filter((value) => !nextSet.has(String(value))));
    }
    if (Array.isArray(fields.needScope)) {
      const nextSet = new Set(fields.needScope.map((value) => String(value)));
      removeNeedScope.push(...asArray(provider.needScope).filter((value) => !nextSet.has(String(value))));
    }
    if (Array.isArray(fields.advertisedSpecialties)) {
      const nextSet = new Set(fields.advertisedSpecialties.map((value) => String(value)));
      removeAdvertised.push(...asArray(provider.advertisedSpecialties).filter((value) => !nextSet.has(String(value))));
    }
    if (fields.onlineAvailable === false && provider.onlineAvailable === true) turnOffOnline = true;
    if (fields.phoneSupport === false && provider.phoneSupport === true) turnOffPhone = true;
  }

  const correctedFields = {};
  const nextTags = removeFromArray(provider.tags, unique(removeTags));
  if (nextTags.length !== asArray(provider.tags).length) correctedFields.tags = nextTags;
  const nextNeedScope = removeFromArray(provider.needScope, unique(removeNeedScope));
  if (nextNeedScope.length !== asArray(provider.needScope).length) correctedFields.needScope = nextNeedScope;
  const nextAdvertised = removeFromArray(provider.advertisedSpecialties, unique(removeAdvertised));
  if (nextAdvertised.length !== asArray(provider.advertisedSpecialties).length) correctedFields.advertisedSpecialties = nextAdvertised;
  if (turnOffOnline) correctedFields.onlineAvailable = false;
  if (turnOffPhone) correctedFields.phoneSupport = false;
  return correctedFields;
}

function decisionForGroup(providerId, provider, items, config) {
  const correctedFields = mergedCorrection(provider, items);
  if (!Object.keys(correctedFields).length) return null;
  return {
    reviewId: `source-fit-capture:${providerId}`,
    providerId,
    action: "adjust",
    reviewer: config.reviewer,
    reviewedDate: config.reviewedDate || today(),
    sourceUrl: config.sourceUrl || unique(items.map((item) => item.sourceUrl))[0] || provider.source || provider.website || "",
    sourceExcerpt: config.sourceExcerpt,
    auditRulesResolved: unique(items.flatMap((item) => asArray(item.auditRules).length ? item.auditRules : [item.rule])),
    correctedFields,
    reviewNotes: [
      config.notes,
      "Drafted from reviewed source-fit evidence capture safe-removal candidate(s).",
      `Targets removed: ${unique(items.map((item) => item.target)).join(", ")}`,
      `Capture rows represented: ${items.length}`,
      "This draft only removes unsupported claims or turns off unsupported telehealth flags; it does not add provider capabilities."
    ].filter(Boolean).join("\n")
  };
}

function needsMoreInfoDecision(item, config) {
  return {
    reviewId: `source-fit-capture:${item.providerId}:${item.rule}:${item.target}`,
    providerId: item.providerId,
    action: "needs_more_info",
    reviewer: config.reviewer,
    reviewedDate: config.reviewedDate || today(),
    sourceUrl: item.sourceUrl || "",
    sourceExcerpt: config.sourceExcerpt,
    auditRulesResolved: asArray(item.auditRules).length ? item.auditRules : [item.rule],
    correctedFields: {},
    reviewNotes: [
      config.notes,
      `Source-fit capture status: ${item.status}`,
      item.fetchStatus?.error ? `Fetch/source issue: ${item.fetchStatus.error}` : "",
      item.issue || "",
      "No live provider data should change from this draft."
    ].filter(Boolean).join("\n")
  };
}

export function buildSourceFitCaptureDecisionDraft(config = {}) {
  const merged = { ...DEFAULTS, ...config };
  assertConfig(merged);
  const capture = readJson(merged.capture);
  const providers = readJson(merged.providers);
  const providersById = new Map(providers.map((provider) => [provider.id, provider]));
  const items = filteredItems(capture, merged);
  assertReviewPolicy(items, merged);
  const decisions = [];
  const skipped = [];
  const safeRemovalItems = items.filter((item) => item.status === "safe_removal_candidate");
  const needsInfoItems = items.filter((item) => item.status !== "safe_removal_candidate");

  if (safeRemovalItems.length) {
    for (const [providerId, providerItems] of groupByProvider(safeRemovalItems)) {
      const provider = providersById.get(providerId);
      if (!provider) {
        skipped.push({ providerId, reason: "Provider not found in providers.json." });
        continue;
      }
      const decision = decisionForGroup(providerId, provider, providerItems, merged);
      if (decision) decisions.push(decision);
      else skipped.push({ providerId, reason: "No correction would change live provider fields." });
    }
  }
  for (const item of needsInfoItems) decisions.push(needsMoreInfoDecision(item, merged));

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    sourceCaptureGeneratedAt: capture.generatedAt || "",
    safety: {
      draftOnly: true,
      noLiveProviderMutation: true,
      applyRequiresReviewScript: true,
      highRiskAdjustmentsRequireConfirmedHumanReview: merged.status === "safe_removal_candidate",
      noAddedTagsOrCapabilities: true,
      noAvailabilityUpgrade: true,
      groupedByProviderToAvoidTagReadd: true
    },
    input: {
      status: merged.status,
      statusExplicit: Boolean(merged.statusExplicit),
      batchKey: merged.batchKey,
      providerId: merged.providerId,
      rule: merged.rule,
      target: merged.target,
      confirmedHumanReview: merged.confirmedHumanReview
    },
    summary: {
      captureRowsMatched: items.length,
      uniqueProvidersMatched: groupByProvider(items).length,
      decisionsDrafted: decisions.length,
      skipped: skipped.length,
      byStatus: countBy(items, (item) => item.status),
      byBatch: countBy(items, (item) => item.batchKey)
    },
    decisions,
    skipped
  };
}

function writeMarkdown(filePath, draft) {
  const lines = [
    "# Source-Fit Capture Decision Draft",
    "",
    `Generated: ${draft.generatedAt}`,
    "",
    "This draft turns reviewed source-fit capture rows into controlled review decisions. It does not change `providers.json`; apply only through `npm run apply:review` after checking the source.",
    "",
    "## Summary",
    "",
    `- Batch key: ${draft.input.batchKey || "(none)"}`,
    `- Status filter: ${draft.input.statusExplicit || !draft.input.batchKey || draft.input.status !== DEFAULTS.status ? draft.input.status : "(inferred from batch)"}`,
    `- Rule filter: ${draft.input.rule || "(none)"}`,
    `- Target filter: ${draft.input.target || "(none)"}`,
    `- Capture rows matched: ${draft.summary.captureRowsMatched}`,
    `- Unique providers matched: ${draft.summary.uniqueProvidersMatched}`,
    `- Decisions drafted: ${draft.summary.decisionsDrafted}`,
    `- Skipped: ${draft.summary.skipped}`,
    "",
    "## Rows By Status",
    "",
    "| Status | Rows |",
    "| --- | ---: |"
  ];
  for (const [status, count] of Object.entries(draft.summary.byStatus || {}).sort()) {
    lines.push(`| ${status} | ${count} |`);
  }
  lines.push(
    "",
    "## Rows By Batch",
    "",
    "| Batch | Rows |",
    "| --- | ---: |"
  );
  for (const [batch, count] of Object.entries(draft.summary.byBatch || {}).sort()) {
    lines.push(`| ${batch.replace(/\|/g, "\\|")} | ${count} |`);
  }
  lines.push(
    "",
    "## Draft Decisions",
    "",
    "| Provider | Action | Corrected fields |",
    "| --- | --- | --- |"
  );
  for (const decision of draft.decisions.slice(0, 80)) {
    lines.push(`| ${decision.providerId} | ${decision.action} | ${JSON.stringify(decision.correctedFields).replace(/\|/g, "\\|")} |`);
  }
  if (draft.skipped.length) {
    lines.push("", "## Skipped", "", "| Provider | Reason |", "| --- | --- |");
    for (const item of draft.skipped) lines.push(`| ${item.providerId} | ${String(item.reason || "").replace(/\|/g, "\\|")} |`);
  }
  lines.push(
    "",
    "## Safety",
    "",
    "- Safe-removal drafts require `--confirmed-human-review`, reviewer, and source excerpt or notes.",
    "- Corrections are grouped by provider so removing several tags from one provider cannot re-add a previously removed tag.",
    "- The helper only removes array values or turns unsupported telehealth booleans off.",
    "- It cannot add support tags, telehealth, advertised specialties, availability, referral pathway, or provider type claims."
  );
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

export function writeSourceFitCaptureDecisionDraft(draft, config = {}) {
  const merged = { ...DEFAULTS, ...config };
  writeJson(merged.jsonOut, draft);
  writeMarkdown(merged.mdOut, draft);
}

export function runCli(argv = process.argv.slice(2)) {
  const config = parseArgs(argv);
  const draft = buildSourceFitCaptureDecisionDraft(config);
  writeSourceFitCaptureDecisionDraft(draft, config);
  console.log(`Drafted ${draft.summary.decisionsDrafted} decision(s) from ${draft.summary.captureRowsMatched} source-fit capture row(s).`);
  console.log(`JSON: ${path.resolve(config.jsonOut)}`);
  console.log(`Markdown: ${path.resolve(config.mdOut)}`);
  return draft;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
