import fs from "node:fs";
import path from "node:path";
import { geocodeProviderRecords } from "./lib/provider-geocoder.mjs";

const args = process.argv.slice(2);
const noGeocode = args.includes("--no-geocode");
const positional = args.filter((arg) => !arg.startsWith("--"));
const [directoryHtmlPath, profileHtmlDir = "", providersPath = "providers.json"] = positional;

if (!directoryHtmlPath) {
  console.error("Usage: node tools/import-nzccp-directory.mjs <nzccp-directory.html-or-dir> [profile-html-dir] [providers.json] [--no-geocode]");
  console.error("");
  console.error("Imports NZCCP clinical psychologist directory records from an approved/saved snapshot.");
  console.error("If the first argument is a directory, every .html/.htm file in it is imported.");
  console.error("Optional profile-html-dir can contain saved profile pages named by slug, e.g. aimee-hanson.html.");
  process.exit(1);
}

const baseUrl = "https://www.nzccp.co.nz";

const cityRegions = new Map([
  ["auckland", "Auckland"],
  ["warkworth", "Auckland"],
  ["whangaparoa", "Auckland"],
  ["whangarei", "Northland"],
  ["kerikeri", "Northland"],
  ["russell", "Northland"],
  ["hamilton", "Waikato"],
  ["cambridge", "Waikato"],
  ["waikato", "Waikato"],
  ["tauranga", "Bay of Plenty"],
  ["mt maunganui", "Bay of Plenty"],
  ["whakatane", "Bay of Plenty"],
  ["rotorua", "Rotorua and Taupo"],
  ["gisborne", "Tairawhiti"],
  ["napier", "Hawke's Bay"],
  ["new plymouth", "Taranaki"],
  ["taranaki", "Taranaki"],
  ["whanganui", "Manawatu-Whanganui"],
  ["palmerston north", "Manawatu-Whanganui"],
  ["turakina", "Manawatu-Whanganui"],
  ["masterton", "Wairarapa"],
  ["wairarapa", "Wairarapa"],
  ["wellington", "Wellington"],
  ["lower hutt", "Wellington"],
  ["upper hutt", "Wellington"],
  ["kapiti", "Wellington"],
  ["petone", "Wellington"],
  ["porirua", "Wellington"],
  ["paremata", "Wellington"],
  ["nelson", "Nelson Marlborough Tasman"],
  ["marlborough", "Nelson Marlborough Tasman"],
  ["westport", "West Coast"],
  ["greymouth", "West Coast"],
  ["hokitika", "West Coast"],
  ["franz josef", "West Coast"],
  ["christchurch", "Canterbury"],
  ["timaru", "South Canterbury"],
  ["dunedin", "Otago"],
  ["wanaka", "Otago"],
  ["queenstown", "Otago"],
  ["cromwell", "Otago"],
  ["alexandra", "Otago"],
  ["invercargill", "Southland"],
  ["online", "National"],
  ["teletherapy", "National"]
]);

const specialtyTags = new Map([
  ["acc", "acc"],
  ["addiction", "addiction"],
  ["substance", "addiction"],
  ["gambling", "addiction"],
  ["anxiety", "anxiety"],
  ["depression", "depression",
  ],
  ["mood", "depression"],
  ["trauma", "trauma"],
  ["post traumatic", "trauma"],
  ["sexual abuse", "trauma"],
  ["work stress", "work"],
  ["return to work", "work"],
  ["men's health", "male"],
  ["women's health", "female"],
  ["migrant", "culture"],
  ["cross-cultural", "culture"],
  ["gender dysphoria", "rainbow"],
  ["transgender", "rainbow"],
  ["online", "telehealth"],
  ["telepsychology", "telehealth"],
  ["cognitive behavioural", "cbt"],
  ["cbt", "cbt"],
  ["emdr", "emdr"],
  ["act", "act"],
  ["dbt", "dbt"]
]);

function decodeHtml(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value = "") {
  return decodeHtml(value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "));
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function absoluteUrl(href) {
  if (!href) return "";
  return href.startsWith("http") ? href : `${baseUrl}${href}`;
}

function cityToRegion(city) {
  const text = city.toLowerCase();
  for (const [key, region] of cityRegions.entries()) {
    if (text.includes(key)) return region;
  }
  return "National";
}

function tagsFromText(values) {
  const haystack = values.join(" ").toLowerCase();
  const tags = new Set(["psychologist", "clinical-psychologist", "fit"]);

  for (const [needle, tag] of specialtyTags.entries()) {
    if (haystack.includes(needle)) tags.add(tag);
  }

  if (!tags.has("depression") && /mental health|mood/.test(haystack)) tags.add("depression");
  if (!tags.has("anxiety") && /stress|panic|phobia|ocd/.test(haystack)) tags.add("anxiety");
  return [...tags];
}

function listingBlocks(html) {
  return html
    .split(/<div role="listitem" class="collection-item w-dyn-item">/g)
    .slice(1)
    .map((block) => block.split(/<div role="listitem" class="collection-item w-dyn-item">/)[0]);
}

function extractDirectoryRecords(html) {
  return listingBlocks(html)
    .map((block) => {
      const href = block.match(/href="([^"]*\/team\/[^"]+)"/)?.[1] || "";
      const name = decodeHtml(block.match(/fs-cmsfilter-field="name"[^>]*>([\s\S]*?)<\/h3>/)?.[1] || "");
      const city = decodeHtml(block.match(/fs-cmsfilter-field="regions"[^>]*>([\s\S]*?)<\/div>/)?.[1] || "");
      const specialties = [...block.matchAll(/fs-cmsfilter-field="specialities"[^>]*>([\s\S]*?)<\/div>/g)]
        .map((match) => stripTags(match[1]))
        .filter(Boolean);
      const treatments = [...block.matchAll(/fs-cmsfilter-field="treatment-therapies"[^>]*>([\s\S]*?)<\/a>/g)]
        .map((match) => stripTags(match[1]))
        .filter(Boolean);

      return {
        href: absoluteUrl(href),
        slug: slugify(href.replace(/^.*\/team\//, "")),
        name,
        city,
        specialties,
        treatments
      };
    })
    .filter((record) => record.name && record.href);
}

function profilePath(record) {
  if (!profileHtmlDir) return "";
  const candidates = [
    `${record.slug}.html`,
    `${record.slug}.htm`,
    `team-${record.slug}.html`
  ].map((file) => path.join(profileHtmlDir, file));
  return candidates.find((file) => fs.existsSync(file)) || "";
}

function profileContact(record) {
  const file = profilePath(record);
  if (!file) return { email: "", phone: "", website: "" };

  const html = fs.readFileSync(file, "utf8");
  const text = stripTags(html);
  const email = [...html.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)]
    .map((match) => match[0])
    .find((value) => !/example\.com$/i.test(value)) || "";
  const phone = [...text.matchAll(/(?:\+64|0)(?:[\s().-]*\d){7,10}/g)]
    .map((match) => match[0].replace(/\s+/g, " ").trim())
    .find((value) => !/^0 0 24 24/.test(value)) || "";
  const website = [...html.matchAll(/href="(https?:\/\/(?!www\.nzccp\.co\.nz)[^"]+)"/g)]
    .map((match) => decodeHtml(match[1]))
    .find((value) => !/webflow|website-files|schema\.org|w3\.org|googleapis|gstatic|facebook|linkedin|instagram|jsdelivr|cdn\.|\.css(?:$|\?)|\.js(?:$|\?)/i.test(value)) || "";

  return { email, phone, website };
}

const existing = JSON.parse(fs.readFileSync(providersPath, "utf8"));
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

function readDirectorySnapshots(inputPath) {
  const stat = fs.statSync(inputPath);
  if (!stat.isDirectory()) return [fs.readFileSync(inputPath, "utf8")];

  return fs.readdirSync(inputPath)
    .filter((file) => /\.html?$/i.test(file))
    .sort()
    .map((file) => fs.readFileSync(path.join(inputPath, file), "utf8"));
}

const directoryHtml = readDirectorySnapshots(directoryHtmlPath).join("\n");

for (const record of extractDirectoryRecords(directoryHtml)) {
  const id = `nzccp-${record.slug || slugify(record.name)}`;

  const contact = profileContact(record);
  const tags = tagsFromText([...record.specialties, ...record.treatments, record.city]);
  const city = record.city || "Aotearoa New Zealand";
  const source = record.href;

  const provider = {
    id,
    name: record.name,
    type: "psychologist",
    region: cityToRegion(city),
    city,
    address: "",
    phone: contact.phone,
    text: "",
    email: contact.email,
    website: contact.website || source,
    hours: "Ask the psychologist about availability and referral requirements",
    cost: "Private fees vary; ask about ACC, EAP, insurance, or funded options",
    tags,
    fit: `NZCCP clinical psychologist listing${record.specialties.length ? ` with specialties including ${record.specialties.slice(0, 5).join(", ")}` : ""}.`,
    firstStep: contact.email
      ? "Email a short enquiry asking about availability, fees, telehealth, and whether they are a good fit for what is happening."
      : "Open the profile and send a short enquiry asking about availability, fees, telehealth, and whether they are a good fit for what is happening.",
    source,
    verified: new Date().toISOString().slice(0, 7)
  };

  if (providersById.has(id)) updated += 1;
  else added += 1;
  providersById.set(id, mergeProvider(providersById.get(id), provider));
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
console.log(`Imported NZCCP psychologist records into ${path.resolve(providersPath)}. Added ${added}; updated ${updated}.`);
if (geocodeSummary) {
  for (const line of geocodeSummary.logs) console.log(line);
  console.log(`Geocoding for this import: checked ${geocodeSummary.checked}; updated ${geocodeSummary.updated}; no match ${geocodeSummary.noMatch}; failed ${geocodeSummary.failed}; skipped ${geocodeSummary.skipped}.`);
}
