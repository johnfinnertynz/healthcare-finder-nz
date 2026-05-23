import fs from "node:fs";
import path from "node:path";
import { geocodeProviderRecords } from "./lib/provider-geocoder.mjs";

const args = process.argv.slice(2);
const noGeocode = args.includes("--no-geocode");
const positional = args.filter((arg) => !arg.startsWith("--"));
const [bundlePath, providersPath = "providers.json"] = positional;

if (!bundlePath) {
  console.error("Usage: node tools/import-provider-fhir.mjs <fhir-bundle.json> [providers.json] [--no-geocode]");
  console.error("");
  console.error("Imports public provider contact details from FHIR Bundle resources.");
  console.error("Supported resources: Organization, HealthcareService, Location.");
  process.exit(1);
}

const regionMap = new Map([
  ["northland", "Northland"],
  ["auckland", "Auckland"],
  ["north auckland", "Auckland"],
  ["central auckland", "Auckland"],
  ["east auckland", "Auckland"],
  ["west auckland", "Auckland"],
  ["south auckland", "Auckland"],
  ["waikato", "Waikato"],
  ["bay of plenty", "Bay of Plenty"],
  ["lakes", "Rotorua and Taupo"],
  ["rotorua", "Rotorua and Taupo"],
  ["taupo", "Rotorua and Taupo"],
  ["tairawhiti", "Tairawhiti"],
  ["gisborne", "Tairawhiti"],
  ["hawke's bay", "Hawke's Bay"],
  ["hawkes bay", "Hawke's Bay"],
  ["taranaki", "Taranaki"],
  ["whanganui", "Manawatu-Whanganui"],
  ["manawatu", "Manawatu-Whanganui"],
  ["midcentral", "Manawatu-Whanganui"],
  ["wairarapa", "Wairarapa"],
  ["wellington", "Wellington"],
  ["hutt", "Wellington"],
  ["kapiti", "Wellington"],
  ["nelson", "Nelson Marlborough Tasman"],
  ["marlborough", "Nelson Marlborough Tasman"],
  ["tasman", "Nelson Marlborough Tasman"],
  ["west coast", "West Coast"],
  ["canterbury", "Canterbury"],
  ["south canterbury", "South Canterbury"],
  ["otago", "Otago"],
  ["dunedin", "Otago"],
  ["southland", "Southland"]
]);

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function telecom(resource, system) {
  return asArray(resource.telecom)
    .find((item) => item.system === system && item.value)?.value || "";
}

function addressText(resource) {
  const address = asArray(resource.address)[0];
  if (!address) return "";
  return [
    ...(address.line || []),
    address.suburb,
    address.city,
    address.district,
    address.postalCode
  ].filter(Boolean).join(", ");
}

function firstRegion(resource) {
  const address = asArray(resource.address)[0] || {};
  const candidates = [
    address.state,
    address.district,
    address.city,
    resource.name
  ].filter(Boolean);

  for (const candidate of candidates) {
    const text = String(candidate).toLowerCase();
    const match = [...regionMap.entries()].find(([key]) => text.includes(key));
    if (match) return match[1];
  }

  return "National";
}

function city(resource) {
  const address = asArray(resource.address)[0] || {};
  return address.city || address.district || "";
}

function textFromCodeableConcepts(values) {
  return asArray(values)
    .flatMap((value) => [
      value.text,
      ...asArray(value.coding).flatMap((coding) => [coding.display, coding.code])
    ])
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
}

function providerType(resource) {
  const text = [
    resource.name,
    ...textFromCodeableConcepts(resource.type),
    ...textFromCodeableConcepts(resource.category),
    ...textFromCodeableConcepts(resource.specialty)
  ].join(" ");

  if (/psychologist|psychology/.test(text)) return "psychologist";
  if (/psychiatrist|psychiatry/.test(text)) return "psychiatrist";
  if (/addiction|alcohol|drug|gambling/.test(text)) return "addiction";
  if (/youth|rangatahi/.test(text)) return "youth";
  if (/helpline|phone line|support line/.test(text)) return "helpline";
  if (/general practice|medical centre|gp clinic|\bgp\b/.test(text)) return "gp";
  if (/mental health|counselling|counsellor|therapy|therapist/.test(text)) return "counsellor";
  return "public-service";
}

function tagsFor(resource, type) {
  const sourceText = [
    resource.name,
    resource.comment,
    resource.description,
    resource.extraDetails,
    ...textFromCodeableConcepts(resource.type),
    ...textFromCodeableConcepts(resource.category),
    ...textFromCodeableConcepts(resource.specialty)
  ].join(" ").toLowerCase();

  const tags = new Set([type, "fit"]);
  if (type === "gp") tags.add("primary-care");
  if (/mental health|wellbeing|depression|anxiety|counselling|therapy/.test(sourceText)) {
    tags.add("depression");
    tags.add("anxiety");
  }
  if (/trauma|sexual harm|abuse|sensitive claim/.test(sourceText)) tags.add("trauma");
  if (/addiction|alcohol|drug|gambling/.test(sourceText)) tags.add("addiction");
  if (/maori|māori|kaupapa/.test(sourceText)) tags.add("maori");
  if (/pasifika|pacific/.test(sourceText)) tags.add("pasifika");
  if (/asian|migrant|refugee/.test(sourceText)) tags.add("asian");
  if (/rainbow|lgbt|lgbtq|takatapui|takatāpui/.test(sourceText)) tags.add("rainbow");
  if (/free|funded|public/.test(sourceText)) tags.add("cost");
  if (/telehealth|online|virtual/.test(sourceText)) tags.add("telehealth");
  return [...tags];
}

function sourceUrl(resource) {
  const endpoint = asArray(resource.endpoint)
    .map((item) => item.reference || item.display)
    .find(Boolean);
  return telecom(resource, "url") || resource.url || endpoint || "";
}

function displayName(resource) {
  return resource.name || resource.alias?.[0] || resource.id || "";
}

function position(resource) {
  const latitude = Number(resource.position?.latitude);
  const longitude = Number(resource.position?.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? { lat: latitude, lon: longitude }
    : { lat: "", lon: "" };
}

function resourceRecords(bundle) {
  const entries = asArray(bundle.entry).map((entry) => entry.resource).filter(Boolean);
  return entries
    .filter((resource) => ["Organization", "HealthcareService", "Location"].includes(resource.resourceType))
    .map((resource) => {
      const name = displayName(resource);
      const type = providerType(resource);
      const website = sourceUrl(resource);
      const phone = telecom(resource, "phone");
      const email = telecom(resource, "email");
      const region = firstRegion(resource);
      const coords = position(resource);
      const generatedId = `${slugify(region)}-${slugify(type)}-${slugify(name || resource.id)}`;

      return {
        id: resource.identifier?.[0]?.value ? `fhir-${slugify(resource.identifier[0].value)}` : generatedId,
        name,
        type,
        region,
        city: city(resource),
        address: addressText(resource),
        phone,
        text: "",
        email,
        website,
        lat: coords.lat,
        lon: coords.lon,
        hours: resource.availableTime ? "See source for opening hours" : "Ask provider about hours",
        cost: type === "gp"
          ? "Varies by practice; enrolled patients usually pay less. Ask about Community Services Card and Very Low Cost Access fees."
          : "Ask provider about costs, funded options, WINZ, ACC, EAP, or reduced fees",
        tags: tagsFor(resource, type),
        fit: resource.description || `${name} can be used as a first contact for support, service information, appointment options, or referral guidance.`,
        firstStep: phone
          ? "Call and ask for the simplest next step, costs, and whether this service is a good fit."
          : "Use the website or email contact to ask for the simplest next step, costs, and whether this service is a good fit.",
        source: website || `FHIR ${resource.resourceType}/${resource.id || ""}`.trim(),
        verified: new Date().toISOString().slice(0, 7)
      };
    })
    .filter((record) => record.name && (record.phone || record.email || record.website));
}

const existing = JSON.parse(fs.readFileSync(providersPath, "utf8"));
const bundle = JSON.parse(fs.readFileSync(bundlePath, "utf8"));
const imported = resourceRecords(bundle);
const providersById = new Map(existing.map((provider) => [provider.id, provider]));
const changedIds = new Set();
let added = 0;
let updated = 0;

function mergeProvider(previous, incoming) {
  if (!previous) return incoming;
  const merged = { ...previous };
  for (const [key, value] of Object.entries(incoming)) {
    const emptyArray = Array.isArray(value) && value.length === 0;
    if (value === "" || value === undefined || value === null || emptyArray) continue;
    merged[key] = value;
  }
  return merged;
}

for (const provider of imported) {
  if (providersById.has(provider.id)) updated += 1;
  else added += 1;
  providersById.set(provider.id, mergeProvider(providersById.get(provider.id), provider));
  changedIds.add(provider.id);
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
console.log(`Imported provider contact records into ${path.resolve(providersPath)}. Added ${added}; updated ${updated}.`);
if (geocodeSummary) {
  for (const line of geocodeSummary.logs) console.log(line);
  console.log(`Geocoding for this import: checked ${geocodeSummary.checked}; updated ${geocodeSummary.updated}; no match ${geocodeSummary.noMatch}; failed ${geocodeSummary.failed}; skipped ${geocodeSummary.skipped}.`);
}
