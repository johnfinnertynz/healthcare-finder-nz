import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const [, , configPath = "provider-sources.json"] = process.argv;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function exists(filePath) {
  return filePath && fs.existsSync(filePath);
}

function ensureParent(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function runStep(label, args, options = {}) {
  const started = Date.now();
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: process.env
  });

  const step = {
    label,
    command: `node ${args.join(" ")}`,
    ok: result.status === 0,
    status: result.status,
    durationMs: Date.now() - started,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
    optional: Boolean(options.optional)
  };

  console.log(`\n== ${label} ==`);
  if (step.stdout) console.log(step.stdout);
  if (step.stderr) console.error(step.stderr);
  if (!step.ok && !step.optional) process.exitCode = 1;
  return step;
}

function skipStep(label, reason) {
  console.log(`\n== ${label} ==`);
  console.log(`Skipped: ${reason}`);
  return { label, ok: true, skipped: true, reason };
}

const config = readJson(configPath);
const providersPath = config.providersPath || "providers.json";
const imports = config.imports || {};
const outputs = config.outputs || {};
const live = config.liveSources || {};
const reportPath = config.reportsPath || "data/reports/provider-refresh-report.json";
const steps = [];

ensureParent(reportPath);
if (outputs.doctorRegister) ensureParent(outputs.doctorRegister);
if (outputs.practitionerRoles) ensureParent(outputs.practitionerRoles);
if (outputs.psychologistRegister) ensureParent(outputs.psychologistRegister);
if (outputs.psychologistResearchQueue) ensureParent(outputs.psychologistResearchQueue);
if (outputs.healthpointFhirBundle) ensureParent(outputs.healthpointFhirBundle);

const healthpointConfig = live.healthpointApi || {};
const healthpointUrl = process.env[healthpointConfig.urlEnv || "HEALTHPOINT_API_URL"];

if (healthpointUrl) {
  steps.push(runStep("Fetch approved Healthpoint or HPI FHIR Bundle", [
    "tools/fetch-healthpoint-fhir.mjs",
    outputs.healthpointFhirBundle || imports.healthpointFhirBundle || "data/imports/healthpoint-provider-bundle.json"
  ]));
}

const fhirBundlePath = outputs.healthpointFhirBundle || imports.healthpointFhirBundle;
if (exists(fhirBundlePath)) {
  steps.push(runStep("Import FHIR provider bundle", [
    "tools/import-provider-fhir.mjs",
    fhirBundlePath,
    providersPath
  ]));
  steps.push(runStep("Import backend-only FHIR practitioner roles", [
    "tools/import-practitioner-roles-fhir.mjs",
    fhirBundlePath,
    outputs.practitionerRoles || "data/registers/practitioner-roles.json"
  ], { optional: true }));
} else {
  steps.push(skipStep("Import FHIR provider bundle", "no approved FHIR bundle found"));
  steps.push(skipStep("Import backend-only FHIR practitioner roles", "no approved FHIR bundle found"));
}

if (exists(imports.gpPracticesCsv)) {
  steps.push(runStep("Import GP practice CSV", [
    "tools/import-gp-practices.mjs",
    imports.gpPracticesCsv,
    providersPath
  ]));
} else {
  steps.push(skipStep("Import GP practice CSV", "no approved GP practice CSV found"));
}

if (exists(imports.directCareCsv)) {
  steps.push(runStep("Import direct care CSV", [
    "tools/import-care-providers.mjs",
    imports.directCareCsv,
    providersPath
  ]));
} else {
  steps.push(skipStep("Import direct care CSV", "no approved direct care CSV found"));
}

if (exists(imports.nzccpDirectoryPages)) {
  const args = [
    "tools/import-nzccp-directory.mjs",
    imports.nzccpDirectoryPages
  ];
  if (exists(imports.nzccpProfilePages)) args.push(imports.nzccpProfilePages);
  args.push(providersPath);
  steps.push(runStep("Import approved NZCCP snapshot", args));
} else {
  steps.push(skipStep("Import approved NZCCP snapshot", "no saved NZCCP directory snapshot found"));
}

if (live.ranzcpPsychiatrists) {
  steps.push(runStep("Refresh opt-in RANZCP psychiatrists", [
    "tools/import-ranzcp-psychiatrists.mjs",
    providersPath
  ], { optional: true }));
}

if (exists(imports.mcnzRegisterCsv)) {
  steps.push(runStep("Import backend-only MCNZ doctor register", [
    "tools/import-mcnz-register.mjs",
    imports.mcnzRegisterCsv,
    outputs.doctorRegister || "data/registers/doctors.json"
  ]));
} else {
  steps.push(skipStep("Import backend-only MCNZ doctor register", "no approved MCNZ register CSV found"));
}

if (exists(imports.psychologistsBoardCsv)) {
  steps.push(runStep("Import backend-only Psychologists Board register", [
    "tools/import-psychologists-board-register.mjs",
    imports.psychologistsBoardCsv,
    outputs.psychologistRegister || "data/registers/psychologists.json"
  ]));
  steps.push(runStep("Prepare psychologist public-contact research queue", [
    "tools/prepare-psychologists-board-research.mjs",
    imports.psychologistsBoardCsv,
    outputs.psychologistResearchQueue || "data/registers/psychologists-board-research.json"
  ]));
} else {
  steps.push(skipStep("Import backend-only Psychologists Board register", "no Psychologists Board register CSV found"));
}

steps.push(runStep("Geocode provider addresses", [
  "tools/geocode-provider-addresses.mjs",
  providersPath,
  configPath
], { optional: true }));

steps.push(runStep("Audit provider contact quality", [
  "tools/audit-provider-quality.mjs",
  providersPath
]));

steps.push(runStep("Audit address and coordinate coverage", [
  "tools/audit-address-coverage.mjs",
  providersPath
], { optional: true }));

const report = {
  refreshedAt: new Date().toISOString(),
  configPath,
  providersPath,
  steps
};

fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`\nWrote refresh report to ${path.resolve(reportPath)}.`);
