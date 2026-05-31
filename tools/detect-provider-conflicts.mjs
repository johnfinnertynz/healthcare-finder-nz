import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { emailDomain, normaliseComparable, sourceDomain, unique } from "./lib/provider-evidence-scorer.mjs";

const DEFAULTS = {
  providers: "providers.json",
  graph: "data/provider-evidence-graph.json",
  jsonOut: "data/provider-conflicts.json",
  mdOut: "PROVIDER_CONFLICTS.md"
};

function parseArgs(argv = process.argv.slice(2)) {
  const config = { ...DEFAULTS };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--providers") config.providers = argv[++index];
    else if (arg === "--graph") config.graph = argv[++index];
    else if (arg === "--json-out") config.jsonOut = argv[++index];
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

function groupBy(providers, keyFn) {
  const groups = new Map();
  for (const provider of providers) {
    const key = keyFn(provider);
    if (!key) continue;
    const bucket = groups.get(key) || [];
    bucket.push(provider);
    groups.set(key, bucket);
  }
  return [...groups.entries()].filter(([, items]) => items.length > 1);
}

function clinicianName(provider) {
  return normaliseComparable(provider.clinicianName || provider.name || "");
}

function practiceName(provider) {
  return normaliseComparable(provider.practiceName || provider.name || "");
}

function looksLikeSameClinician(items) {
  const clinicians = unique(items.map(clinicianName).filter(Boolean));
  return clinicians.length === 1;
}

function sharedPracticeNotDuplicate(items) {
  const clinicians = unique(items.map(clinicianName).filter(Boolean));
  const practices = unique(items.map(practiceName).filter(Boolean));
  return clinicians.length > 1 && practices.length <= 2;
}

function conflictFromGroup(kind, key, items) {
  const regions = unique(items.map((item) => item.region));
  const cities = unique(items.map((item) => item.city));
  const types = unique(items.map((item) => item.type));
  const providerIds = items.map((item) => item.id);
  const sameClinician = looksLikeSameClinician(items);
  const sharedPractice = sharedPracticeNotDuplicate(items);
  return {
    conflictId: `${kind}:${key}`,
    kind,
    key,
    providerIds,
    names: items.map((item) => item.name),
    clinicians: unique(items.map((item) => item.clinicianName).filter(Boolean)),
    practices: unique(items.map((item) => item.practiceName).filter(Boolean)),
    regions,
    cities,
    types,
    severity: sameClinician ? "high" : sharedPractice ? "low" : "medium",
    likelyDuplicate: sameClinician && !sharedPractice,
    likelySharedPractice: sharedPractice,
    suggestedAction: sameClinician
      ? "Review as possible duplicate and keep the best sourced record."
      : sharedPractice
        ? "Do not merge automatically; confirm shared practice details can be reused per clinician."
        : "Compare source pages before merging or correcting."
  };
}

function graphFieldConflicts(graph) {
  const conflicts = [];
  for (const node of asArray(graph.nodes)) {
    for (const [field, info] of Object.entries(node.confidenceByField || {})) {
      if (!Array.isArray(info.conflicts) || info.conflicts.length <= 1) continue;
      conflicts.push({
        conflictId: `claim:${node.providerId || node.candidateId}:${field}`,
        kind: "claim-field-conflict",
        key: field,
        providerIds: [node.providerId || node.candidateId],
        names: [node.name || node.providerName || node.candidateId],
        field,
        values: info.conflicts,
        severity: "high",
        likelyDuplicate: false,
        likelySharedPractice: false,
        suggestedAction: "Review conflicting field values and prefer the strongest source; do not overwrite automatically."
      });
    }
  }
  return conflicts;
}

function writeMarkdown(filePath, output) {
  const lines = [
    "# Provider Conflict Report",
    "",
    `Generated: ${output.generatedAt}`,
    "",
    "This report flags possible duplicates and shared-practice records. It is advisory and does not merge providers.",
    "",
    "## Summary",
    "",
    `- Conflicts/groups: ${output.conflicts.length}`,
    `- High: ${output.summary.bySeverity.high || 0}`,
    `- Medium: ${output.summary.bySeverity.medium || 0}`,
    `- Low: ${output.summary.bySeverity.low || 0}`,
    "",
    "## Top Conflicts",
    "",
    "| Severity | Kind | Key | Providers | Suggested action |",
    "| --- | --- | --- | --- | --- |"
  ];
  for (const conflict of output.conflicts.slice(0, 120)) {
    lines.push(`| ${conflict.severity} | ${conflict.kind} | ${String(conflict.key).replace(/\|/g, "\\|")} | ${conflict.providerIds.join(", ")} | ${conflict.suggestedAction.replace(/\|/g, "\\|")} |`);
  }
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function countBy(items, field) {
  return items.reduce((counts, item) => {
    const key = item[field] || "unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

export function detectProviderConflicts(config = {}) {
  const merged = { ...DEFAULTS, ...config };
  const providers = readJsonIfExists(merged.providers, []);
  const graph = readJsonIfExists(merged.graph, { nodes: [] });
  const groups = [
    ...groupBy(providers, (provider) => provider.phone ? normaliseComparable(provider.phone) : "").map(([key, items]) => conflictFromGroup("shared-phone", key, items)),
    ...groupBy(providers, (provider) => provider.email ? provider.email.toLowerCase() : "").map(([key, items]) => conflictFromGroup("shared-email", key, items)),
    ...groupBy(providers, (provider) => {
      const domain = sourceDomain(provider.website || provider.source || "");
      return domain && !/(healthpoint|doctorpricer|nzccp|psychologytoday|yourhealthinmind|ranzcp)\./i.test(domain) ? domain : "";
    }).map(([key, items]) => conflictFromGroup("shared-domain", key, items)),
    ...groupBy(providers, (provider) => {
      const key = normaliseComparable(provider.address || "");
      return key && key.length > 8 ? key : "";
    }).map(([key, items]) => conflictFromGroup("shared-address", key, items)),
    ...graphFieldConflicts(graph)
  ];

  const conflicts = groups.sort((a, b) =>
    (b.severity === "high") - (a.severity === "high")
    || (b.likelyDuplicate === true) - (a.likelyDuplicate === true)
    || a.kind.localeCompare(b.kind)
    || String(a.key).localeCompare(String(b.key))
  );
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    safety: {
      advisoryOnly: true,
      doNotMergeSharedCliniciansAutomatically: true,
      noLiveProviderMutation: true
    },
    summary: {
      total: conflicts.length,
      bySeverity: countBy(conflicts, "severity"),
      byKind: countBy(conflicts, "kind"),
      likelyDuplicates: conflicts.filter((item) => item.likelyDuplicate).length,
      likelySharedPractices: conflicts.filter((item) => item.likelySharedPractice).length
    },
    conflicts
  };
}

export function writeProviderConflicts(output, config = {}) {
  const merged = { ...DEFAULTS, ...config };
  writeJson(merged.jsonOut, output);
  writeMarkdown(merged.mdOut, output);
}

export function runCli(argv = process.argv.slice(2)) {
  const config = parseArgs(argv);
  const output = detectProviderConflicts(config);
  writeProviderConflicts(output, config);
  console.log(`Detected ${output.summary.total} provider conflict/shared-practice groups.`);
  console.log(`JSON: ${path.resolve(config.jsonOut)}`);
  console.log(`Markdown: ${path.resolve(config.mdOut)}`);
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
