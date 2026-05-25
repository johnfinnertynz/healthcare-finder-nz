import fs from "node:fs";
import path from "node:path";
import { geocodeProviderRecords } from "./lib/provider-geocoder.mjs";
import { withAvailabilityDefaults } from "./lib/provider-availability.mjs";

const args = process.argv.slice(2);
const noGeocode = args.includes("--no-geocode");
const positional = args.filter((arg) => !arg.startsWith("--"));
const [csvPath, providersPath = "providers.json"] = positional;

if (!csvPath) {
  console.error("Usage: node tools/import-care-providers.mjs <care-providers.csv> [providers.json] [--no-geocode]");
  console.error("");
  console.error("Required columns: name, type, region, city, source");
  console.error("Required contact: at least one of phone, text, email, website");
  console.error("Allowed type: counsellor, psychologist, psychiatrist");
  console.error("Optional columns: id, address, lat, lon, cost, hours, tags, needScope, fit, firstStep, verified, lastVerified, confidence, sourceQuality, needsManualVerification");
  process.exit(1);
}

const allowedTypes = new Set(["counsellor", "psychologist", "psychiatrist"]);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted && char === "\"" && next === "\"") {
      cell += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      quoted = !quoted;
      continue;
    }

    if (!quoted && char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function toObjects(rows) {
  const [header, ...records] = rows;
  const keys = header.map((key) => key.trim());
  return records.map((record) => Object.fromEntries(
    keys.map((key, index) => [key, (record[index] || "").trim()])
  ));
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function listCell(value) {
  return String(value || "").split(/[|;]/).map((item) => item.trim()).filter(Boolean);
}

function booleanCell(value, fallback) {
  if (value === undefined || value === "") return fallback;
  return /^(true|yes|1)$/i.test(String(value).trim());
}

function tagList(row) {
  const defaults = [row.type, "fit"];
  if (row.type === "psychiatrist") defaults.push("medical-specialist");
  if (row.type === "psychologist") defaults.push("clinical-assessment");

  return [...new Set([
    ...defaults,
    ...listCell(row.tags)
  ])];
}

const requiredFields = ["name", "type", "region", "city", "source"];
const existing = JSON.parse(fs.readFileSync(providersPath, "utf8"));
const providersById = new Map(existing.map((provider) => [provider.id, provider]));
const rows = toObjects(parseCsv(fs.readFileSync(csvPath, "utf8")));
const changedIds = new Set();
let added = 0;
let updated = 0;

function mergeProvider(previous, incoming) {
  if (!previous) return incoming;
  const merged = { ...previous };
  for (const [key, value] of Object.entries(incoming)) {
    const emptyArray = Array.isArray(value) && value.length === 0 && key !== "needScope";
    if (value === "" || value === undefined || value === null || emptyArray) continue;
    merged[key] = value;
  }
  return merged;
}

for (const row of rows) {
  const missing = requiredFields.filter((field) => !row[field]);
  const hasContact = Boolean(row.phone || row.text || row.email || row.website);

  if (missing.length || !hasContact || !allowedTypes.has(row.type)) {
    console.warn(`Skipping ${row.name || "(unnamed)"}: missing=${missing.join("|") || "none"} contact=${hasContact} type=${row.type || "none"}`);
    continue;
  }

  const id = row.id || `${slugify(row.region)}-${slugify(row.type)}-${slugify(row.name)}`;
  const record = withAvailabilityDefaults({
    id,
    name: row.name,
    type: row.type,
    region: row.region,
    city: row.city,
    address: row.address || "",
    phone: row.phone || "",
    text: row.text || "",
    email: row.email || "",
    website: row.website || row.source,
    lat: row.lat || row.latitude || "",
    lon: row.lon || row.lng || row.longitude || "",
    hours: row.hours || "Ask provider about current availability",
    cost: row.cost || "Ask provider about fees, WINZ, ACC, EAP, insurance, or funded options",
    tags: tagList(row),
    needScope: listCell(row.needScope),
    fit: row.fit || `${row.name} is a ${row.type} contact with public contact details verified from the listed source.`,
    firstStep: row.firstStep || "Send a short enquiry asking about availability, fees, funding options, and whether they are a good fit for what is happening.",
    source: row.source,
    verified: row.verified || new Date().toISOString().slice(0, 7),
    lastVerified: row.lastVerified || row.verified || new Date().toISOString().slice(0, 7),
    confidence: row.confidence || "medium",
    sourceQuality: row.sourceQuality || "provider-owned or NGO public page",
    needsManualVerification: booleanCell(row.needsManualVerification, true),
    availabilityStatus: row.availabilityStatus || "",
    availabilityCheckedAt: row.availabilityCheckedAt || "",
    availabilityEvidence: row.availabilityEvidence || "",
    availabilitySource: row.availabilitySource || "",
    availabilityNeedsManualReview: booleanCell(row.availabilityNeedsManualReview, undefined)
  });

  if (providersById.has(id)) updated += 1;
  else added += 1;
  providersById.set(id, mergeProvider(providersById.get(id), record));
  changedIds.add(id);
}

const output = [...providersById.values()].sort((a, b) =>
  a.region.localeCompare(b.region) || a.name.localeCompare(b.name)
);

const geocodeSummary = noGeocode
  ? null
  : await geocodeProviderRecords(output, {
      providerIds: changedIds,
      failSoft: true
    });

fs.writeFileSync(providersPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Imported direct care provider records into ${path.resolve(providersPath)}. Added ${added}; updated ${updated}.`);
if (geocodeSummary) {
  for (const line of geocodeSummary.logs) console.log(line);
  console.log(`Geocoding for this import: checked ${geocodeSummary.checked}; updated ${geocodeSummary.updated}; no match ${geocodeSummary.noMatch}; failed ${geocodeSummary.failed}; skipped ${geocodeSummary.skipped}.`);
}
