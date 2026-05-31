import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULTS = {
  providers: "providers.json",
  sourceFitAudit: "data/provider-source-fit-audit.json",
  jsonOut: "data/gp-source-corroboration-queue.json",
  csvOut: "data/gp-source-corroboration-queue.csv",
  mdOut: "GP_SOURCE_CORROBORATION_QUEUE.md",
  includeAll: false,
  region: "",
  limit: Infinity
};

const allowedEvidenceSources = [
  "practice-owned website or contact page",
  "Healthpoint GP listing or approved Healthpoint export",
  "PHO, Health NZ, HPI/FHIR, or other official provider dataset",
  "official clinic network page",
  "provider-owned booking or enrolment page"
];

const disallowedEvidenceSources = [
  "search-result snippet alone",
  "DoctorPricer alone",
  "LinkedIn or social profile alone",
  "blocked, private, login-only, or paywalled page",
  "name-based inference for services, language, culture, or availability"
];

const safeUpdateFields = [
  "website",
  "phone",
  "address",
  "lat",
  "lon",
  "coordinateSource",
  "coordinatePrecision",
  "coordinateConfidence",
  "source",
  "sourceQuality",
  "confidence",
  "needsManualVerification",
  "lastVerified",
  "sourceEvidence"
];

function parseArgs(argv = process.argv.slice(2)) {
  const config = { ...DEFAULTS };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--providers") config.providers = argv[++index];
    else if (arg === "--source-fit-audit") config.sourceFitAudit = argv[++index];
    else if (arg === "--json-out") config.jsonOut = argv[++index];
    else if (arg === "--csv-out") config.csvOut = argv[++index];
    else if (arg === "--md-out") config.mdOut = argv[++index];
    else if (arg === "--include-all") config.includeAll = true;
    else if (arg === "--region") config.region = argv[++index];
    else if (arg === "--limit") config.limit = Number(argv[++index]);
  }
  return config;
}

function readJsonIfExists(filePath, fallback) {
  if (!filePath || !fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readProviders(input) {
  if (Array.isArray(input)) return input;
  if (!input || !fs.existsSync(input)) throw new Error(`Provider file not found: ${input || "(missing)"}`);
  return JSON.parse(fs.readFileSync(input, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
}

function compact(value, max = 240) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null && String(value).trim() !== ""))];
}

function csvCell(value) {
  const text = Array.isArray(value) ? value.join("; ") : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function isWeakGpSource(provider) {
  return provider?.type === "gp"
    && /third-party|doctorpricer/i.test(`${provider.sourceQuality || ""} ${provider.importSource || ""} ${provider.source || ""}`)
    && (!provider.phone || !provider.website);
}

function isGp(provider) {
  return provider?.type === "gp";
}

function missingFields(provider) {
  return ["phone", "website"].filter((field) => !provider[field]);
}

function priorityFor(provider, missing) {
  if (missing.includes("phone") && missing.includes("website")) return "high";
  if (missing.includes("phone")) return "high";
  if (missing.includes("website")) return "medium";
  if (/third-party|doctorpricer/i.test(`${provider.sourceQuality || ""} ${provider.importSource || ""} ${provider.source || ""}`)) return "low";
  return "low";
}

function priorityScore(priority) {
  return { high: 300, medium: 200, low: 100 }[priority] || 100;
}

function sourceFitFindingsByProvider(audit) {
  const map = new Map();
  for (const finding of audit?.findings || []) {
    if (finding.rule !== "weak-gp-source") continue;
    const id = finding.providerId || finding.id || "";
    if (!id) continue;
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(finding);
  }
  return map;
}

function suggestedSearches(provider) {
  const terms = [];
  const name = provider.name || "";
  const city = provider.city || provider.region || "New Zealand";
  const address = provider.address || "";
  const phone = provider.phone || "";

  if (name) terms.push(`"${name}" "${city}" GP NZ`);
  if (name && address) terms.push(`"${name}" "${address}"`);
  if (phone && name) terms.push(`"${phone}" "${name}"`);
  if (name) terms.push(`site:healthpoint.co.nz "${name}" "${city}"`);
  if (name) terms.push(`site:health.govt.nz "${name}" "${city}"`);
  if (name) terms.push(`"${name}" "${city}" "medical centre" NZ`);
  return unique(terms);
}

function reviewReason(provider, missing) {
  const pieces = [];
  if (missing.length) pieces.push(`missing ${missing.join(" and ")}`);
  if (/doctorpricer/i.test(`${provider.importSource || ""} ${provider.source || ""}`)) pieces.push("DoctorPricer-derived source");
  else if (/third-party/i.test(provider.sourceQuality || "")) pieces.push("third-party source quality");
  return pieces.length
    ? `GP record needs stronger corroboration: ${pieces.join("; ")}.`
    : "GP record can be checked against stronger official or practice-owned sources.";
}

function taskFromProvider(provider, auditFindings = []) {
  const missing = missingFields(provider);
  const priority = priorityFor(provider, missing);
  const sourceUrls = unique([
    provider.source,
    provider.website,
    provider.bookingUrl,
    provider.availabilitySource,
    ...auditFindings.map((finding) => finding.source || finding.sourceUrl)
  ]);

  return {
    taskId: `gp-corroborate:${provider.id}`,
    providerId: provider.id || "",
    name: provider.name || "",
    type: provider.type || "",
    region: provider.region || "",
    city: provider.city || "",
    address: provider.address || "",
    lat: provider.lat ?? "",
    lon: provider.lon ?? "",
    phone: provider.phone || "",
    website: provider.website || "",
    source: provider.source || "",
    sourceQuality: provider.sourceQuality || "",
    importSource: provider.importSource || "",
    confidence: provider.confidence || "",
    lastVerified: provider.lastVerified || "",
    missingFields: missing,
    fieldsToVerify: unique(["website", "phone", "address", "lat", "lon", "sourceQuality"]),
    priority,
    priorityScore: priorityScore(priority),
    reviewReason: reviewReason(provider, missing),
    auditRules: unique(auditFindings.map((finding) => finding.rule || "weak-gp-source")),
    auditIssues: unique(auditFindings.map((finding) => finding.issue || finding.message)),
    sourceUrls,
    suggestedSearches: suggestedSearches(provider),
    apiOrImportHints: [
      "Prefer an approved Healthpoint/HPI/FHIR import when credentials or exports are available.",
      "Use the practice-owned website or official PHO/Health NZ source if found.",
      "Keep DoctorPricer as discovery-only unless a stronger source corroborates the contact details."
    ],
    allowedEvidenceSources,
    disallowedEvidenceSources,
    evidenceToCapture: [
      "source URL",
      "short excerpt showing practice name and public contact details",
      "captured date",
      "whether the page is practice-owned, official, or third-party",
      "any conflict between source phone/address/website and current stored fields"
    ],
    decisionGuidance: {
      canAutoApply: false,
      liveMutationAllowed: false,
      reviewGateRequired: true,
      allowedCorrectionFields: safeUpdateFields,
      neverGuess: [
        "availabilityStatus accepting",
        "mental-health specialty tags",
        "cultural or language support tags",
        "enrolment status",
        "funding eligibility"
      ]
    },
    expectedOutcome: "Add source-backed website/contact evidence, leave as needsManualVerification, or keep as third-party-only if no stronger public source exists.",
    publicCardPreviewText: compact([
      provider.name,
      `${provider.region || ""}${provider.city ? ` / ${provider.city}` : ""}`,
      provider.address,
      provider.phone ? `Phone: ${provider.phone}` : "",
      provider.website ? `Website: ${provider.website}` : "Website missing",
      `Source: ${provider.sourceQuality || provider.source || "unknown"}`
    ].filter(Boolean).join("\n"), 1000),
    reviewDecision: "",
    correctedFields: {},
    reviewer: "",
    reviewedDate: "",
    reviewNotes: ""
  };
}

function sortTasks(a, b) {
  return b.priorityScore - a.priorityScore
    || a.region.localeCompare(b.region)
    || a.city.localeCompare(b.city)
    || a.name.localeCompare(b.name);
}

function summarise(tasks) {
  const byRegion = {};
  const byPriority = {};
  let missingPhone = 0;
  let missingWebsite = 0;
  for (const task of tasks) {
    byRegion[task.region || "(missing)"] = (byRegion[task.region || "(missing)"] || 0) + 1;
    byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;
    if (task.missingFields.includes("phone")) missingPhone += 1;
    if (task.missingFields.includes("website")) missingWebsite += 1;
  }
  return {
    totalTasks: tasks.length,
    missingPhone,
    missingWebsite,
    byRegion: Object.fromEntries(Object.entries(byRegion).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
    byPriority: Object.fromEntries(Object.entries(byPriority).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
    noLiveProviderMutation: true,
    reviewGateRequired: true
  };
}

function renderCsv(queue) {
  const columns = [
    "taskId",
    "providerId",
    "name",
    "priority",
    "region",
    "city",
    "address",
    "phone",
    "website",
    "missingFields",
    "source",
    "sourceQuality",
    "importSource",
    "reviewReason",
    "suggestedSearches"
  ];
  const lines = [columns.map(csvCell).join(",")];
  for (const task of queue.tasks) {
    lines.push(columns.map((column) => csvCell(task[column])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function renderMarkdown(queue) {
  const lines = [
    "# GP Source Corroboration Queue",
    "",
    `Generated: ${queue.generatedAt}`,
    "",
    "This queue turns weak GP source records into focused, review-gated source checks. It does not mutate `providers.json` and it must not be used to infer availability, enrolment, mental-health specialty, or cultural support claims.",
    "",
    "## Summary",
    "",
    `- Tasks: ${queue.summary.totalTasks}`,
    `- Missing phone: ${queue.summary.missingPhone}`,
    `- Missing website: ${queue.summary.missingWebsite}`,
    "- Live provider mutation: no",
    "- Human review required before provider updates: yes",
    "",
    "## Region Counts",
    "",
    "| Region | Tasks |",
    "| --- | ---: |"
  ];

  for (const [region, count] of Object.entries(queue.summary.byRegion)) {
    lines.push(`| ${region} | ${count} |`);
  }

  lines.push(
    "",
    "## Acceptable Evidence",
    "",
    ...allowedEvidenceSources.map((source) => `- ${source}`),
    "",
    "Do not use search-result snippets, DoctorPricer alone, LinkedIn/social-only pages, or blocked/private pages as evidence.",
    "",
    "## First Tasks",
    "",
    "| Priority | Provider | Region / city | Missing | Phone | Current source | Suggested search |",
    "| --- | --- | --- | --- | --- | --- | --- |"
  );

  for (const task of queue.tasks.slice(0, 80)) {
    lines.push([
      task.priority,
      `${task.name} (${task.providerId})`,
      `${task.region} / ${task.city}`,
      task.missingFields.join(", ") || "none",
      task.phone || "",
      task.sourceQuality || task.source || "",
      task.suggestedSearches[0] || ""
    ].map((value) => ` ${String(value).replace(/\|/g, "\\|")} `).join("|").replace(/^/, "|").replace(/$/, "|"));
  }

  if (queue.tasks.length > 80) {
    lines.push("", `Only the first 80 tasks are shown. See \`${queue.outputs.json}\` or \`${queue.outputs.csv}\` for the full queue.`);
  }

  return `${lines.join("\n")}\n`;
}

export function buildGpSourceCorroborationQueue(options = {}) {
  const config = { ...DEFAULTS, ...options };
  const providers = readProviders(config.providers);
  const sourceFitAudit = config.sourceFitAudit && typeof config.sourceFitAudit === "object" && !Array.isArray(config.sourceFitAudit)
    ? config.sourceFitAudit
    : readJsonIfExists(config.sourceFitAudit, { findings: [] });
  const findingsByProvider = sourceFitFindingsByProvider(sourceFitAudit);
  const regionFilter = String(config.region || "").toLowerCase();

  const tasks = providers
    .filter((provider) => isGp(provider))
    .filter((provider) => config.includeAll || isWeakGpSource(provider))
    .filter((provider) => !regionFilter || String(provider.region || "").toLowerCase() === regionFilter)
    .map((provider) => taskFromProvider(provider, findingsByProvider.get(provider.id) || []))
    .sort(sortTasks)
    .slice(0, Number.isFinite(config.limit) ? config.limit : undefined);

  return {
    generatedAt: new Date().toISOString(),
    source: {
      providers: typeof config.providers === "string" ? config.providers : "provided array",
      sourceFitAudit: typeof config.sourceFitAudit === "string" ? config.sourceFitAudit : "provided object",
      includeAll: Boolean(config.includeAll),
      region: config.region || "",
      limit: Number.isFinite(config.limit) ? config.limit : null
    },
    summary: summarise(tasks),
    safety: {
      noNetworkFetch: true,
      noLiveProviderMutation: true,
      reviewGateRequired: true,
      allowedEvidenceSources,
      disallowedEvidenceSources,
      safeUpdateFields
    },
    outputs: {
      json: config.jsonOut,
      csv: config.csvOut,
      markdown: config.mdOut
    },
    tasks
  };
}

export function writeGpSourceCorroborationQueue(queue, config = DEFAULTS) {
  writeJson(config.jsonOut, queue);
  writeText(config.csvOut, renderCsv(queue));
  writeText(config.mdOut, renderMarkdown(queue));
}

async function main() {
  const config = parseArgs();
  const queue = buildGpSourceCorroborationQueue(config);
  writeGpSourceCorroborationQueue(queue, config);
  console.log(`GP source corroboration queue: ${queue.summary.totalTasks} tasks (${queue.summary.missingWebsite} missing website, ${queue.summary.missingPhone} missing phone).`);
  console.log(`Wrote ${path.resolve(config.jsonOut)}, ${path.resolve(config.csvOut)}, and ${path.resolve(config.mdOut)}.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
