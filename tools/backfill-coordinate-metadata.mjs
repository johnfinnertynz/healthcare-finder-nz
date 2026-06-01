import fs from "node:fs";
import { coordinateMetadataFromSource, isNewZealandCoordinate } from "./lib/provider-geocoder.mjs";

const args = process.argv.slice(2);
const providersPath = args.find((arg) => !arg.startsWith("--")) || "providers.json";
const dryRun = args.includes("--dry-run");
const providers = JSON.parse(fs.readFileSync(providersPath, "utf8"));

function hasCoords(provider) {
  return provider.lat !== undefined && provider.lat !== "" && provider.lon !== undefined && provider.lon !== "";
}

function missing(value) {
  return value === undefined || value === null || value === "";
}

function inferredCoordinateSource(provider) {
  const verified = provider.lastVerified || provider.verified || "";
  const suffix = verified ? ` ${verified}` : "";
  const source = String(provider.source || provider.website || "");
  if (provider.id?.startsWith("ranzcp-") || source.includes("yourhealthinmind.org/find-a-psychiatrist/profile")) {
    return `RANZCP Your Health in Mind profile${suffix}`;
  }
  if (String(provider.sourceQuality || "").toLowerCase().includes("official fhir")) {
    return `official FHIR provider export${suffix}`;
  }
  return "";
}

const summary = {
  checked: 0,
  updated: 0,
  outsideNz: 0,
  fields: {
    coordinateSource: 0,
    coordinatePrecision: 0,
    coordinateConfidence: 0,
    geocodeNeedsManualReview: 0
  }
};

for (const provider of providers) {
  if (!hasCoords(provider)) continue;
  summary.checked += 1;

  if (!isNewZealandCoordinate(provider.lat, provider.lon)) {
    summary.outsideNz += 1;
    if (missing(provider.geocodeNeedsManualReview)) {
      provider.geocodeNeedsManualReview = true;
      summary.fields.geocodeNeedsManualReview += 1;
      summary.updated += 1;
    }
    continue;
  }

  let providerChanged = false;
  const inferredSource = inferredCoordinateSource(provider);
  const sourceWasUnrecorded = provider.coordinateSource === "not recorded - needs manual review";
  if (missing(provider.coordinateSource) || (sourceWasUnrecorded && inferredSource)) {
    provider.coordinateSource = inferredSource || "not recorded - needs manual review";
    summary.fields.coordinateSource += 1;
    providerChanged = true;
  }

  const metadata = coordinateMetadataFromSource(provider.coordinateSource);
  for (const field of ["coordinatePrecision", "coordinateConfidence", "geocodeNeedsManualReview"]) {
    if (!missing(provider[field]) && !(sourceWasUnrecorded && inferredSource && field !== "geocodeNeedsManualReview")) continue;
    provider[field] = metadata[field];
    summary.fields[field] += 1;
    providerChanged = true;
  }

  if (providerChanged) summary.updated += 1;
}

if (!dryRun) {
  fs.writeFileSync(providersPath, `${JSON.stringify(providers, null, 2)}\n`);
}

console.log(`Checked ${summary.checked} coordinate records.`);
console.log(`Updated ${summary.updated} providers. Outside NZ flagged ${summary.outsideNz}.`);
console.log(`Fields added: ${JSON.stringify(summary.fields)}`);
if (dryRun) console.log("Dry run only; no files written.");
