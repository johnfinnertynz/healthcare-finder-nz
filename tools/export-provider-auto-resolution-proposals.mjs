import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULTS = {
  claims: "data/provider-claims.json",
  claimQueue: "data/provider-claim-review-queue.json",
  providerQueue: "data/provider-review-queue.json",
  conflicts: "data/provider-conflicts.json",
  jsonOut: "data/provider-auto-resolution-proposals.json",
  csvOut: "data/provider-auto-resolution-proposals.csv",
  mdOut: "PROVIDER_AUTO_RESOLUTION_PROPOSALS.md"
};

function parseArgs(argv = process.argv.slice(2)) {
  const config = { ...DEFAULTS };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--claims") config.claims = argv[++index];
    else if (arg === "--claim-queue") config.claimQueue = argv[++index];
    else if (arg === "--provider-queue") config.providerQueue = argv[++index];
    else if (arg === "--conflicts") config.conflicts = argv[++index];
    else if (arg === "--json-out") config.jsonOut = argv[++index];
    else if (arg === "--csv-out") config.csvOut = argv[++index];
    else if (arg === "--md-out") config.mdOut = argv[++index];
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

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null && String(value).trim() !== ""))];
}

function compact(value, max = 260) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function countBy(items, getter) {
  return items.reduce((counts, item) => {
    const key = getter(item) || "unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function groupBy(items, keyFn) {
  const groups = new Map();
  for (const item of items) {
    const key = keyFn(item);
    const bucket = groups.get(key) || [];
    bucket.push(item);
    groups.set(key, bucket);
  }
  return [...groups.entries()];
}

function proposalId(prefix, key) {
  return `${prefix}:${String(key).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90)}`;
}

function sampleProviders(items, max = 8) {
  return items.slice(0, max).map((item) => ({
    providerId: item.providerId,
    providerName: item.providerName || item.name || "",
    field: item.field || item.claimField || "",
    value: item.value ?? item.claimValue ?? "",
    sourceUrl: item.sourceUrl || asArray(item.sourceUrls)[0] || ""
  }));
}

function autoDeprioritizeProposals(claims) {
  const autoClaims = claims.filter((claim) => claim.decision === "auto_accept");
  return groupBy(autoClaims, (claim) => [claim.field, claim.sourceType, claim.sourceOwnerType].join("|"))
    .map(([key, items]) => {
      const [field, sourceType, sourceOwnerType] = key.split("|");
      return {
        proposalId: proposalId("auto-deprioritize", key),
        action: "auto_deprioritize_low_risk_claims",
        reviewCategory: "ready to auto-apply, low risk",
        riskLevel: "low",
        field,
        sourceType,
        sourceOwnerType,
        count: items.length,
        affectedProviders: unique(items.map((item) => item.providerId)).length,
        reason: "These are already stored low-risk public identity/contact/location claims from strong sources with no attached field-specific audit conflict.",
        safeAutomation: "Remove these claim-level checks from manual review dashboards unless the source changes; do not mutate providers.json from this proposal.",
        liveMutationAllowed: false,
        reviewGateRequiredForProviderData: true,
        sampleProviders: sampleProviders(items)
      };
    })
    .sort((a, b) => b.count - a.count || a.field.localeCompare(b.field));
}

function manualBatchProposals(claimQueue) {
  return asArray(claimQueue.batches).map((batch) => ({
    proposalId: proposalId("manual-batch", batch.batchKey),
    action: "batch_manual_review",
    reviewCategory: batch.reviewCategory,
    riskLevel: batch.claimRiskLevel,
    field: batch.claimField,
    sourceType: batch.sourceType,
    sourceOwnerType: "",
    count: batch.count,
    affectedProviders: batch.count,
    reason: `Claims in this batch still need human judgement: ${batch.reviewCategory}.`,
    safeAutomation: batch.suggestedBatchAction || "Review representative items, then apply individual reviewed decisions.",
    liveMutationAllowed: false,
    reviewGateRequiredForProviderData: true,
    sampleProviders: batch.providers || []
  })).sort((a, b) => b.count - a.count);
}

function blockedAutomationRules(claimQueue, conflicts) {
  const items = asArray(claimQueue.items);
  const highRisk = items.filter((item) => item.claimRiskLevel === "high").length;
  const availability = items.filter((item) => /availability/i.test(item.reviewCategory || "")).length;
  const referral = items.filter((item) => /referral/i.test(item.reviewCategory || "")).length;
  const sensitive = items.filter((item) => /sensitive|scope|tag/i.test(item.reviewCategory || "")).length;
  const conflictGroups = conflicts.summary?.total || asArray(conflicts.conflicts).length;
  return [
    {
      rule: "high-risk-claims-review-gated",
      count: highRisk,
      reason: "High-risk claims can affect suitability, clinical scope, referral, availability, culture, crisis, or telehealth matching."
    },
    {
      rule: "availability-not-auto-upgraded",
      count: availability,
      reason: "Availability can change quickly. Accepting status needs explicit current wording and reviewer approval."
    },
    {
      rule: "psychiatry-referral-not-inferred",
      count: referral,
      reason: "Psychiatrist self-referral cannot be inferred from contact details or silence."
    },
    {
      rule: "sensitive-tags-need-evidence",
      count: sensitive,
      reason: "Maori, Pasifika, Asian, Rainbow, trauma, addiction, sexual-harm, youth, men, and broad need tags need source evidence or explicit approval."
    },
    {
      rule: "conflicts-not-overwritten",
      count: conflictGroups,
      reason: "Conflicting and shared-practice records are advisory review groups; they are not automatic merges."
    }
  ].filter((item) => item.count > 0);
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join("; ") : typeof value === "object" && value !== null ? JSON.stringify(value) : String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(filePath, proposals) {
  const headers = [
    "proposalId",
    "action",
    "reviewCategory",
    "riskLevel",
    "field",
    "sourceType",
    "sourceOwnerType",
    "count",
    "affectedProviders",
    "reason",
    "safeAutomation",
    "liveMutationAllowed",
    "reviewGateRequiredForProviderData"
  ];
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${[
    headers.join(","),
    ...proposals.map((proposal) => headers.map((header) => csvEscape(proposal[header])).join(","))
  ].join("\n")}\n`);
}

function writeMarkdown(filePath, output) {
  const lines = [
    "# Provider Auto-Resolution Proposals",
    "",
    `Generated: ${output.generatedAt}`,
    "",
    "These proposals are a safety layer for reducing review noise. They do not mutate `providers.json` and they do not approve high-risk healthcare claims.",
    "",
    "## Summary",
    "",
    `- Provider-level review items: ${output.inputs.providerReviewItems}`,
    `- Claim-level review items: ${output.inputs.claimReviewItems}`,
    `- Claim batch groups: ${output.inputs.claimBatches}`,
    `- Low-risk claims that can be de-prioritized from manual claim review: ${output.summary.autoDeprioritizeClaims}`,
    `- Auto-deprioritize proposal groups: ${output.summary.autoDeprioritizeGroups}`,
    `- Manual batch proposal groups: ${output.summary.manualBatchGroups}`,
    "",
    "## Safe Auto-Deprioritization",
    "",
    "| Count | Field | Source type | Owner | Action |",
    "| ---: | --- | --- | --- | --- |"
  ];
  for (const proposal of output.autoDeprioritizeProposals.slice(0, 40)) {
    lines.push(`| ${proposal.count} | ${proposal.field} | ${proposal.sourceType} | ${proposal.sourceOwnerType} | ${proposal.safeAutomation.replace(/\|/g, "\\|")} |`);
  }
  lines.push("", "## Manual Batch Work", "", "| Count | Category | Field | Risk | Source type | Suggested action |", "| ---: | --- | --- | --- | --- | --- |");
  for (const proposal of output.manualBatchProposals.slice(0, 40)) {
    lines.push(`| ${proposal.count} | ${proposal.reviewCategory} | ${proposal.field} | ${proposal.riskLevel} | ${proposal.sourceType} | ${proposal.safeAutomation.replace(/\|/g, "\\|")} |`);
  }
  lines.push("", "## Automation Blocks", "", "| Rule | Count | Why blocked |", "| --- | ---: | --- |");
  for (const rule of output.blockedAutomationRules) {
    lines.push(`| ${rule.rule} | ${rule.count} | ${rule.reason.replace(/\|/g, "\\|")} |`);
  }
  lines.push(
    "",
    "## Policy",
    "",
    "- Auto-deprioritization removes noise from claim review dashboards only.",
    "- Provider data changes still require exported review decisions, the controlled apply script, validation, audits, and tests.",
    "- No accepting availability, psychiatrist self-referral, support tag, telehealth, provider type, cost, or scope claim is auto-approved here."
  );
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

export function buildProviderAutoResolutionProposals(config = {}) {
  const merged = { ...DEFAULTS, ...config };
  const claimsPayload = readJsonIfExists(merged.claims, { claims: [] });
  const claimQueue = readJsonIfExists(merged.claimQueue, { items: [], batches: [] });
  const providerQueue = readJsonIfExists(merged.providerQueue, { items: [] });
  const conflicts = readJsonIfExists(merged.conflicts, { conflicts: [], summary: {} });
  const claims = asArray(claimsPayload.claims);
  const autoProposals = autoDeprioritizeProposals(claims);
  const manualProposals = manualBatchProposals(claimQueue);
  const output = {
    version: 1,
    generatedAt: new Date().toISOString(),
    safety: {
      advisoryOnly: true,
      noLiveProviderMutation: true,
      highRiskClaimsReviewGated: true,
      noAcceptingFromSilence: true,
      noPsychiatrySelfReferralFromSilence: true,
      noSensitiveTagsWithoutEvidence: true
    },
    inputs: {
      claims: claims.length,
      providerReviewItems: asArray(providerQueue.items).length,
      claimReviewItems: asArray(claimQueue.items).length,
      claimBatches: asArray(claimQueue.batches).length,
      conflictGroups: conflicts.summary?.total || asArray(conflicts.conflicts).length
    },
    summary: {
      autoDeprioritizeClaims: autoProposals.reduce((sum, proposal) => sum + proposal.count, 0),
      autoDeprioritizeGroups: autoProposals.length,
      manualBatchGroups: manualProposals.length,
      blockedAutomationRules: blockedAutomationRules(claimQueue, conflicts).length,
      byAutoField: countBy(claims.filter((claim) => claim.decision === "auto_accept"), (claim) => claim.field),
      byManualCategory: countBy(asArray(claimQueue.items), (item) => item.reviewCategory)
    },
    autoDeprioritizeProposals: autoProposals,
    manualBatchProposals: manualProposals,
    blockedAutomationRules: blockedAutomationRules(claimQueue, conflicts),
    nextRecommendedActions: [
      "Hide or collapse auto-deprioritized low-risk claims in manual claim review dashboards.",
      "Start human review with the largest sensitive tag or scope evidence batches.",
      "Corroborate weak GP source batches against practice-owned or official sources.",
      "Do not apply provider data changes until reviewed decisions pass validation and audits."
    ]
  };
  return output;
}

export function writeProviderAutoResolutionProposals(output, config = {}) {
  const merged = { ...DEFAULTS, ...config };
  writeJson(merged.jsonOut, output);
  writeCsv(merged.csvOut, [...output.autoDeprioritizeProposals, ...output.manualBatchProposals]);
  writeMarkdown(merged.mdOut, output);
}

export function runCli(argv = process.argv.slice(2)) {
  const config = parseArgs(argv);
  const output = buildProviderAutoResolutionProposals(config);
  writeProviderAutoResolutionProposals(output, config);
  console.log(`Exported ${output.summary.autoDeprioritizeGroups} auto-deprioritize groups and ${output.summary.manualBatchGroups} manual batch groups.`);
  console.log(`Low-risk claims eligible for auto-deprioritization: ${output.summary.autoDeprioritizeClaims}.`);
  console.log(`JSON: ${path.resolve(config.jsonOut)}`);
  console.log(`CSV: ${path.resolve(config.csvOut)}`);
  console.log(`Markdown: ${path.resolve(config.mdOut)}`);
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
