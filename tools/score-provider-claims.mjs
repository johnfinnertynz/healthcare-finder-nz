import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { buildProviderEvidenceGraph } from "./build-provider-evidence-graph.mjs";

const DEFAULTS = {
  graph: "data/provider-evidence-graph.json",
  claims: "data/provider-claims.json",
  providers: "providers.json",
  jsonOut: "data/provider-claim-scores.json",
  csvOut: "data/provider-claim-scores.csv"
};

function parseArgs(argv = process.argv.slice(2)) {
  const config = { ...DEFAULTS };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--graph") config.graph = argv[++index];
    else if (arg === "--claims") config.claims = argv[++index];
    else if (arg === "--providers") config.providers = argv[++index];
    else if (arg === "--json-out") config.jsonOut = argv[++index];
    else if (arg === "--csv-out") config.csvOut = argv[++index];
  }
  return config;
}

function readJsonIfExists(filePath, fallback) {
  if (!filePath || !fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value, pretty = true) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${pretty ? JSON.stringify(value, null, 2) : JSON.stringify(value)}\n`);
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join("; ") : typeof value === "object" && value !== null ? JSON.stringify(value) : String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(filePath, claims) {
  const headers = [
    "claimId",
    "providerId",
    "providerName",
    "field",
    "value",
    "riskLevel",
    "confidence",
    "score",
    "decision",
    "sourceType",
    "sourceOwnerType",
    "sourceUrl",
    "auditRules",
    "reason",
    "requiredHumanAction"
  ];
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${[
    headers.join(","),
    ...claims.map((claim) => headers.map((header) => csvEscape(claim[header])).join(","))
  ].join("\n")}\n`);
}

function countBy(items, getter) {
  return items.reduce((counts, item) => {
    const key = getter(item) || "unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

export function scoreProviderClaims(config = {}) {
  const merged = { ...DEFAULTS, ...config };
  let graph = readJsonIfExists(merged.graph, null);
  if (!graph) graph = buildProviderEvidenceGraph({ providers: merged.providers });
  const claimPayload = readJsonIfExists(merged.claims, { claims: [] });
  const claims = graph.claims || claimPayload.claims || graph.nodes?.flatMap((node) => node.claims || []) || [];
  const output = {
    version: 1,
    generatedAt: new Date().toISOString(),
    sourceGraphGeneratedAt: graph.generatedAt || "",
    safety: {
      advisoryOnly: true,
      noLiveProviderMutation: true
    },
    summary: {
      totalClaims: claims.length,
      byDecision: countBy(claims, (claim) => claim.decision),
      byRisk: countBy(claims, (claim) => claim.riskLevel),
      byConfidence: countBy(claims, (claim) => claim.confidence),
      byField: countBy(claims, (claim) => claim.field),
      bySourceType: countBy(claims, (claim) => claim.sourceType)
    },
    claimsPath: merged.claims,
    csvPath: merged.csvOut,
    sampleClaims: claims.sort((a, b) =>
      (b.decision === "review") - (a.decision === "review")
      || (b.riskLevel === "high") - (a.riskLevel === "high")
      || a.providerName.localeCompare(b.providerName)
      || a.field.localeCompare(b.field)
    ).slice(0, 500)
  };
  return output;
}

export function writeProviderClaimScores(output, config = {}) {
  const merged = { ...DEFAULTS, ...config };
  writeJson(merged.jsonOut, output, false);
  const claims = readJsonIfExists(merged.claims, { claims: output.sampleClaims }).claims || output.sampleClaims;
  writeCsv(merged.csvOut, claims);
}

export function runCli(argv = process.argv.slice(2)) {
  const config = parseArgs(argv);
  const output = scoreProviderClaims(config);
  writeProviderClaimScores(output, config);
  console.log(`Scored ${output.summary.totalClaims} provider claims.`);
  console.log(`JSON: ${path.resolve(config.jsonOut)}`);
  console.log(`CSV: ${path.resolve(config.csvOut)}`);
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
