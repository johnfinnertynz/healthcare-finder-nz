import fs from "node:fs";
import { geocodeProviderRecords } from "./lib/provider-geocoder.mjs";

const args = process.argv.slice(2);
const noGeocode = args.includes("--no-geocode");
const positional = args.filter((arg) => !arg.startsWith("--"));
const [providersPath = "providers.json"] = positional;
const endpoint = "https://www.yourhealthinmind.org/RANZCPWebServices/PsychProfileService.asmx/SearchProfiles";
const sourceBase = "https://www.yourhealthinmind.org";

const regionMap = new Map([
  ["northland", "Northland"],
  ["auckland", "Auckland"],
  ["hamilton", "Waikato"],
  ["waikato", "Waikato"],
  ["tauranga", "Bay of Plenty"],
  ["bay of plenty", "Bay of Plenty"],
  ["rotorua", "Rotorua and Taupo"],
  ["taupo", "Rotorua and Taupo"],
  ["gisborne", "Tairawhiti"],
  ["tairawhiti", "Tairawhiti"],
  ["hawke", "Hawke's Bay"],
  ["napier", "Hawke's Bay"],
  ["hastings", "Hawke's Bay"],
  ["taranaki", "Taranaki"],
  ["new plymouth", "Taranaki"],
  ["whanganui", "Manawatu-Whanganui"],
  ["palmerston north", "Manawatu-Whanganui"],
  ["wairarapa", "Wairarapa"],
  ["wellington", "Wellington"],
  ["hutt", "Wellington"],
  ["kapiti", "Wellington"],
  ["nelson", "Nelson Marlborough Tasman"],
  ["marlborough", "Nelson Marlborough Tasman"],
  ["tasman", "Nelson Marlborough Tasman"],
  ["west coast", "West Coast"],
  ["christchurch", "Canterbury"],
  ["canterbury", "Canterbury"],
  ["timaru", "South Canterbury"],
  ["dunedin", "Otago"],
  ["otago", "Otago"],
  ["invercargill", "Southland"],
  ["southland", "Southland"]
]);

const needTags = [
  ["depression", /depression|mood/i],
  ["anxiety", /anxiety|panic|obsessive-compulsive|ocd/i],
  ["trauma", /trauma|post-traumatic|sexual assault|abuse|emdr/i],
  ["addiction", /addiction|gambling|alcohol|drug/i],
  ["work", /work|stress|professional|supervision/i]
];

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function regionFromAddress(address) {
  const text = [
    address?.locationName,
    address?.streetAddress1,
    address?.streetAddress2,
    address?.suburb,
    address?.townCity,
    address?.state
  ].filter(Boolean).join(" ").toLowerCase();

  for (const [key, region] of regionMap) {
    if (text.includes(key)) return region;
  }

  return "National";
}

function addressText(address) {
  return [
    address.streetAddress1,
    address.streetAddress2,
    address.streetAddress3,
    address.suburb,
    address.state,
    address.postCode
  ].filter(Boolean).join(", ");
}

function websiteUrl(value) {
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function cleanHtml(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tagsFor(profile, address) {
  const text = [
    profile.summary,
    profile.displayCredentials,
    profile.accreditedTier1Faculty,
    ...(profile.psychExpertises || []).map((item) => item.description),
    ...(profile.psychServices || []).map((item) => item.description),
    ...(profile.psychExperiencesWith || []).map((item) => item.description),
    ...(profile.psychLanguages || []).map((item) => item.description)
  ].join(" ");

  const tags = new Set(["psychiatrist", "medical-specialist", "fit"]);
  if (profile.offersOnlineServices) tags.add("telehealth");
  if (/maori|māori/i.test(text)) tags.add("maori");
  if (/pasifika|pacific|samoan|tongan/i.test(text)) tags.add("pasifika");
  if (/asian|mandarin|cantonese|hindi|korean|japanese|vietnamese/i.test(text)) tags.add("asian");
  if (/gender diverse|gay|lesbian|intersex|sexuality/i.test(text)) tags.add("rainbow");
  if (/ACC/i.test(text)) tags.add("cost");
  for (const [tag, pattern] of needTags) {
    if (pattern.test(text)) tags.add(tag);
  }
  if (address.email || address.phone) tags.add("direct-contact");
  return [...tags];
}

function firstContactAddress(profile) {
  return (profile.psychAddresses || []).find((address) =>
    address?.country === "NZ" && (address.phone || address.email || address.website)
  ) || (profile.psychAddresses || []).find((address) => address?.country === "NZ") || {};
}

async function fetchPage(page) {
  const query = {
    country: "NZ",
    psychSurname: null,
    locationText: null,
    locationName: null,
    state: null,
    seed: 12345,
    latitude: null,
    longitude: null,
    useCurrentLocation: false,
    onlineConsultations: false,
    radius: 10,
    expertiseIn: [],
    servicesOffered: [],
    experienceWith: [],
    treatsAges: [],
    languages: [],
    selectedResultId: null,
    page,
    searchLoading: false,
    validationErrors: {}
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ searchQuery: JSON.stringify(query) })
  });

  if (!response.ok) {
    throw new Error(`RANZCP search failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  return JSON.parse(payload.d);
}

function toRecord(profile) {
  const address = firstContactAddress(profile);
  const expertise = (profile.psychExpertises || []).map((item) => item.description).filter(Boolean);
  const services = (profile.psychServices || []).map((item) => item.description).filter(Boolean);
  const ages = (profile.psychAgeGroupsTreated || []).map((item) => item.description).filter(Boolean);
  const region = regionFromAddress(address);
  const profileUrl = `${sourceBase}${profile.profileUrl}`;
  const wait = profile.appointmentWaitTIme ? ` Appointment wait: ${profile.appointmentWaitTIme}.` : "";
  const focus = expertise.length ? ` Special interests include ${expertise.slice(0, 8).join(", ")}.` : "";
  const serviceText = services.length ? ` Services include ${services.slice(0, 6).join(", ")}.` : "";
  const ageText = ages.length ? ` Works with ${ages.join(", ")}.` : "";

  return {
    id: `ranzcp-${slugify(profile.ranzcP_ID || profile.id || profile.name)}`,
    name: profile.name,
    type: "psychiatrist",
    region,
    city: address.suburb || address.state || "",
    address: addressText(address),
    phone: address.phone || "",
    text: "",
    email: address.email || "",
    website: profileUrl,
    lat: address.latitude ?? "",
    lon: address.longitude ?? "",
    hours: wait.trim() || "Ask provider about current availability",
    cost: "Private specialist fees usually apply. Ask about referral needs, insurance, ACC, or any funded options.",
    tags: tagsFor(profile, address),
    fit: `RANZCP Your Health in Mind psychiatrist listing.${focus}${serviceText}${ageText}`.trim(),
    firstStep: address.email
      ? "Email the practice asking about fit, referral requirements, fees, wait time, and the simplest booking step."
      : "Call the practice asking about fit, referral requirements, fees, wait time, and the simplest booking step.",
    source: profileUrl,
    verified: new Date().toISOString().slice(0, 7),
    sourceUpdated: profile.lastUpdatedDate ? profile.lastUpdatedDate.slice(0, 10) : ""
  };
}

const existing = JSON.parse(fs.readFileSync(providersPath, "utf8"));
const providersById = new Map(existing.map((provider) => [provider.id, provider]));
const firstPage = await fetchPage(1);
const pageSize = firstPage.results.length || 10;
const totalPages = Math.ceil(firstPage.resultTotal / pageSize);
const profiles = [...firstPage.results];

for (let page = 2; page <= totalPages; page += 1) {
  const result = await fetchPage(page);
  profiles.push(...result.results);
}

const imported = profiles
  .map(toRecord)
  .filter((record) => record.name && (record.phone || record.email || record.website));

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
console.log(`Imported RANZCP psychiatrist records into ${providersPath}. Added ${added}; updated ${updated}.`);
if (geocodeSummary) {
  for (const line of geocodeSummary.logs) console.log(line);
  console.log(`Geocoding for this import: checked ${geocodeSummary.checked}; updated ${geocodeSummary.updated}; no match ${geocodeSummary.noMatch}; failed ${geocodeSummary.failed}; skipped ${geocodeSummary.skipped}.`);
}
