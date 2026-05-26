import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  confidenceRank,
  sourceDomain,
  sourceEvidenceShape,
  sourceTypeLabel,
  unique
} from "./lib/provider-evidence-scorer.mjs";

const DEFAULTS = {
  graph: "data/discovery/provider-evidence-graph.json",
  providers: "providers.json",
  jsonOut: "data/discovery/provider-suggestions.json",
  csvOut: "data/discovery/provider-suggestions.csv",
  mdOut: "PROVIDER_DISCOVERY_SUGGESTIONS.md"
};

const LIVE_SAFE_SOURCE_TYPES = new Set(["provider_owned", "clinic_owned", "healthpoint", "official_register", "professional_directory", "ngo_directory"]);
const RISKY_FIELDS = new Set(["availabilityStatus", "referralType", "tags", "advertisedSpecialties", "specialties", "needScope", "onlineAvailable", "phoneSupport"]);
const CONTACT_FIELDS = ["phone", "text", "email", "website", "bookingUrl", "address"];

function parseArgs(argv = process.argv.slice(2)) {
  const config = { ...DEFAULTS };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--graph") config.graph = argv[++index];
    else if (arg === "--providers") config.providers = argv[++index];
    else if (arg === "--json-out") config.jsonOut = argv[++index];
    else if (arg === "--csv-out") config.csvOut = argv[++index];
    else if (arg === "--md-out") config.mdOut = argv[++index];
    else if (arg === "--apply-reviewed") config.applyReviewed = true;
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

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join("; ") : typeof value === "object" && value !== null ? JSON.stringify(value) : String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function highestConfidence(values = []) {
  return values.reduce((best, value) => confidenceRank[value] > confidenceRank[best] ? value : best, "none");
}

function hasExplicitEvidence(node, field, valuePattern = /.+/) {
  return (node.claims || []).some((claim) =>
    claim.field === field
    && valuePattern.test(String(claim.value || ""))
    && claim.sourceType !== "search_result"
    && claim.sourceType !== "linkedIn_public"
    && claim.excerpt
  );
}

function hasAcceptingEvidence(node) {
  return (node.claims || []).some((claim) =>
    claim.field === "availabilityStatus"
    && claim.value === "accepting"
    && claim.excerpt
    && claim.sourceType !== "search_result"
    && claim.sourceType !== "linkedIn_public"
  );
}

function hasSelfReferralEvidence(node) {
  return (node.claims || []).some((claim) =>
    claim.field === "referralType"
    && claim.value === "self"
    && claim.excerpt
    && claim.sourceType !== "search_result"
    && claim.sourceType !== "linkedIn_public"
  );
}

function onlyDiscoverySignals(node = {}) {
  const types = new Set(node.sourceTypes || []);
  return ![...types].some((type) => LIVE_SAFE_SOURCE_TYPES.has(type));
}

function sourceSummary(node = {}) {
  return unique((node.sourceTypes || []).map(sourceTypeLabel)).join(", ");
}

function compareExisting(provider = {}, candidate = {}) {
  const changes = {};
  for (const field of CONTACT_FIELDS) {
    if (candidate[field] && candidate[field] !== provider[field]) changes[field] = candidate[field];
  }
  for (const field of ["region", "city", "type", "clinicianName", "practiceName"]) {
    if (candidate[field] && !provider[field]) changes[field] = candidate[field];
  }
  if (candidate.availabilityStatus && candidate.availabilityStatus !== "not_published" && candidate.availabilityStatus !== provider.availabilityStatus) {
    changes.availabilityStatus = candidate.availabilityStatus;
    changes.availabilityEvidence = candidate.availabilityEvidence;
    changes.availabilitySource = candidate.availabilitySource;
    changes.availabilityNeedsManualReview = true;
  }
  return changes;
}

function suggestionAction(node, candidateRecord, existingProvider) {
  if (node.conflicts?.length) return "needs_manual_research";
  if (onlyDiscoverySignals(node)) return "needs_manual_research";
  if (existingProvider) {
    const changes = compareExisting(existingProvider, candidateRecord);
    return Object.keys(changes).length ? "update_existing_provider" : "needs_manual_research";
  }
  if (candidateRecord.availabilityStatus === "not_accepting" || candidateRecord.availabilityStatus === "referrals_paused") return "move_to_watchlist";
  const hasContact = CONTACT_FIELDS.some((field) => candidateRecord[field]);
  if (!hasContact) return "needs_manual_research";
  return "add_new_provider";
}

function reviewReasonsFor(node, candidateRecord, action) {
  const reasons = [...(node.reviewReasons || [])];
  if (onlyDiscoverySignals(node)) reasons.push("search-result, LinkedIn, or unknown-source data cannot create a live provider");
  if (node.conflicts?.length) reasons.push(`conflicting fields: ${node.conflicts.map((conflict) => conflict.field).join(", ")}`);
  if (candidateRecord.availabilityStatus === "accepting" && !hasAcceptingEvidence(node)) {
    reasons.push("accepting availability is not explicit enough to publish");
    candidateRecord.availabilityStatus = "not_published";
    candidateRecord.availabilityNeedsManualReview = true;
  }
  if (candidateRecord.type === "psychiatrist" && candidateRecord.referralType === "self" && !hasSelfReferralEvidence(node)) {
    reasons.push("psychiatry self-referral cannot be inferred from contact details alone");
    candidateRecord.referralType = "unknown";
    candidateRecord.referralNeedsManualReview = true;
  }
  for (const claim of node.claims || []) {
    if (claim.field === "tags" && ["sexual-harm", "sensitive-claims"].includes(claim.value) && !/sexual harm|sexual abuse|rape|sensitive claims/i.test(`${claim.excerpt} ${claim.value}`)) {
      reasons.push("sexual-harm related tags need explicit source wording");
    }
    if (RISKY_FIELDS.has(claim.field) && claim.sourceType === "linkedIn_public") {
      reasons.push("LinkedIn signal ignored for ranking-sensitive specialty, availability, or referral claims");
    }
  }
  if (action === "add_new_provider") reasons.push("new public provider candidate requires human approval before import");
  if (action === "update_existing_provider") reasons.push("existing provider update requires human approval before patching");
  return unique(reasons);
}

function sourceEvidenceForSuggestion(node = {}) {
  return node.suggestedProviderRecord?.sourceEvidence || sourceEvidenceShape(node.claims || []);
}

function confidenceSummary(node = {}) {
  const values = Object.values(node.confidenceByField || {}).map((item) => item.confidence);
  return highestConfidence(values);
}

export function suggestionFromNode(node = {}, providersById = new Map()) {
  const candidateRecord = {
    ...(node.suggestedProviderRecord || {}),
    needsManualVerification: true,
    sourceEvidence: sourceEvidenceForSuggestion(node),
    confidenceByField: node.confidenceByField || {}
  };
  const existingProviderId = node.possibleProviderIds?.find((id) => providersById.has(id)) || "";
  const existingProvider = existingProviderId ? providersById.get(existingProviderId) : null;
  const action = suggestionAction(node, candidateRecord, existingProvider);
  const suggestedChanges = existingProvider ? compareExisting(existingProvider, candidateRecord) : candidateRecord;
  const reviewReasons = reviewReasonsFor(node, candidateRecord, action);
  const sourceUrlsUsed = unique([
    ...(node.sourceUrls || []),
    ...(node.claims || []).map((claim) => claim.sourceUrl)
  ]);

  return {
    suggestionId: `suggestion:${node.candidateId}`,
    candidateId: node.candidateId,
    action,
    existingProviderId,
    possibleProviderIds: node.possibleProviderIds || [],
    name: candidateRecord.clinicianName || candidateRecord.practiceName || candidateRecord.name || node.candidateId,
    type: candidateRecord.type || "",
    region: candidateRecord.region || "",
    city: candidateRecord.city || "",
    sourceSummary: sourceSummary(node),
    confidence: confidenceSummary(node),
    corroborationScore: node.corroborationScore || 0,
    conflicts: node.conflicts || [],
    suggestedProviderRecord: candidateRecord,
    suggestedPatchForExistingProvider: existingProvider ? suggestedChanges : {},
    suggestedChanges,
    sourceEvidence: candidateRecord.sourceEvidence,
    confidenceByField: node.confidenceByField || {},
    reviewReasons,
    sourceUrlsUsed,
    reviewGateRequired: true,
    liveMutationAllowed: false
  };
}

function writeCsv(filePath, suggestions) {
  const headers = [
    "suggestionId",
    "action",
    "existingProviderId",
    "name",
    "type",
    "region",
    "city",
    "confidence",
    "corroborationScore",
    "sourceSummary",
    "reviewReasons",
    "sourceUrlsUsed"
  ];
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${[
    headers.join(","),
    ...suggestions.map((item) => headers.map((header) => csvEscape(item[header])).join(","))
  ].join("\n")}\n`);
}

function writeMarkdown(filePath, output) {
  const lines = [
    "# Provider Discovery Suggestions",
    "",
    `Generated: ${output.generatedAt}`,
    "",
    "Suggestions are review-gated. They must be inspected in the auditor console and applied with controlled review decisions before public recommendations change.",
    "",
    "## Summary",
    "",
    `- Suggestions: ${output.suggestions.length}`,
    `- Add new provider: ${output.summary.byAction.add_new_provider || 0}`,
    `- Update existing provider: ${output.summary.byAction.update_existing_provider || 0}`,
    `- Move to watchlist: ${output.summary.byAction.move_to_watchlist || 0}`,
    `- Needs manual research: ${output.summary.byAction.needs_manual_research || 0}`,
    "",
    "## Top Suggestions",
    "",
    "| Action | Provider | Type | Region / city | Confidence | Reasons |",
    "| --- | --- | --- | --- | --- | --- |"
  ];
  for (const suggestion of output.suggestions.slice(0, 100)) {
    lines.push(`| ${suggestion.action} | ${String(suggestion.name).replace(/\|/g, "\\|")} | ${suggestion.type} | ${suggestion.region} / ${suggestion.city} | ${suggestion.confidence} | ${suggestion.reviewReasons.join("; ").replace(/\|/g, "\\|")} |`);
  }
  lines.push("", "## Safety Notes", "", "- Search result snippets and public LinkedIn signals are discovery/corroboration only.", "- Availability, referral pathways, cultural tags, telehealth, and advertised specialties require explicit evidence or reviewer approval.", "- This script does not mutate `providers.json`.");
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function countBy(items, field) {
  return items.reduce((counts, item) => {
    const key = item[field] || "unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

export function buildProviderSuggestions(config = {}) {
  const merged = { ...DEFAULTS, ...config };
  if (merged.applyReviewed) {
    throw new Error("This tool only builds review-gated suggestions. Use tools/apply-provider-review-decisions.mjs with reviewed decisions to change live data.");
  }
  const providers = readJsonIfExists(merged.providers, []);
  const providersById = new Map(providers.map((provider) => [provider.id, provider]));
  const graph = readJsonIfExists(merged.graph, { nodes: [] });
  const nodes = graph.nodes || graph.candidates || [];
  const suggestions = nodes
    .map((node) => suggestionFromNode(node, providersById))
    .sort((a, b) =>
      (b.action === "add_new_provider") - (a.action === "add_new_provider")
      || (b.action === "update_existing_provider") - (a.action === "update_existing_provider")
      || b.corroborationScore - a.corroborationScore
      || a.name.localeCompare(b.name)
    );

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    safety: {
      reviewGateRequired: true,
      noDirectProvidersJsonMutation: true,
      linkedInCorroborationOnly: true,
      searchSnippetsDiscoveryOnly: true,
      noAcceptingFromSilence: true,
      noPsychiatrySelfReferralFromSilence: true
    },
    inputs: {
      graph: merged.graph,
      nodes: nodes.length,
      providers: providers.length
    },
    summary: {
      total: suggestions.length,
      byAction: countBy(suggestions, "action"),
      byType: countBy(suggestions, "type"),
      byRegion: countBy(suggestions, "region")
    },
    suggestions
  };
}

export function writeProviderSuggestions(output, config = {}) {
  const merged = { ...DEFAULTS, ...config };
  writeJson(merged.jsonOut, output);
  writeCsv(merged.csvOut, output.suggestions);
  writeMarkdown(merged.mdOut, output);
}

export function runCli(argv = process.argv.slice(2)) {
  const config = parseArgs(argv);
  const output = buildProviderSuggestions(config);
  writeProviderSuggestions(output, config);
  console.log(`Built ${output.suggestions.length} provider discovery suggestions.`);
  console.log(`JSON: ${path.resolve(config.jsonOut)}`);
  console.log(`CSV: ${path.resolve(config.csvOut)}`);
  console.log(`Markdown: ${path.resolve(config.mdOut)}`);
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    runCli();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
