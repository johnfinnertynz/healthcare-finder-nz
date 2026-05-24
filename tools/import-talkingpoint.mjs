import fs from "node:fs";
import { geocodeProviderRecords } from "./lib/provider-geocoder.mjs";

const args = process.argv.slice(2);
const noGeocode = args.includes("--no-geocode");
const positional = args.filter((arg) => !arg.startsWith("--"));
const [providersPath = "providers.json"] = positional;

const pages = {
  home: "https://www.talkingpoint.co.nz/",
  newPlymouth: "https://www.talkingpoint.co.nz/new-plymouth/",
  cambridge: "https://www.talkingpoint.co.nz/cambridge/",
  selfReferral: "https://www.talkingpoint.co.nz/self-referral/"
};

const userAgent = "Care Finder NZ provider verification (john@johnfinnerty.co.nz)";

function cleanText(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function firstMatch(text, pattern) {
  return text.match(pattern)?.[1]?.trim() || "";
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { "user-agent": userAgent } });
  if (!response.ok) throw new Error(`TalkingPoint fetch failed for ${url}: ${response.status}`);
  return cleanText(await response.text());
}

const [homeText, newPlymouthText, cambridgeText, selfReferralText] = await Promise.all([
  fetchText(pages.home),
  fetchText(pages.newPlymouth),
  fetchText(pages.cambridge),
  fetchText(pages.selfReferral)
]);

const phone = firstMatch(`${homeText} ${selfReferralText}`, /\bPh:\s*([0-9 ]{8,})\b/i) || "06 757 4898";
const email = firstMatch(newPlymouthText, /\b([A-Z0-9._%+-]+@talkingpoint\.co\.nz)\b/i);
const address = firstMatch(newPlymouthText, /\b(27 Courtenay Street,\s*New Plymouth)\b/i);
const acceptsPrivateClients = /accepting new private clients now/i.test(`${homeText} ${selfReferralText}`);
const newPlymouthAccepting = /Accepting New Referrals/i.test(newPlymouthText);

const newPlymouthSpecialties = [
  "Stress",
  "OCD treatment",
  "Neuropsychology",
  "Health psychology",
  "Anger management",
  "Self esteem counselling",
  "Anxiety",
  "Personal development psychology",
  "Competency assessments",
  "Grief counselling/PTSD",
  "Trauma counselling",
  "Child ADHD",
  "Child OCD",
  "Child psychology",
  "Child learning disorder assessments"
];

const cambridgeSpecialties = [
  "Stress",
  "OCD treatment",
  "Health psychology",
  "Anger management",
  "Self esteem counselling",
  "Anxiety",
  "Personal development psychology",
  "Competency assessments",
  "Grief counselling/PTSD",
  "Trauma counselling",
  "Family and parenting interventions",
  "Child, adolescent, and adult support"
];

const verifiedMonth = new Date().toISOString().slice(0, 7);
const sharedTags = [
  "psychologist",
  "clinical-psychologist",
  "depression",
  "anxiety",
  "stress",
  "ocd",
  "trauma",
  "ptsd",
  "grief",
  "assessment",
  "fit",
  "direct-contact"
];

function recordForNewPlymouth(previous = {}) {
  const resolvedAddress = address || previous.address || "27 Courtenay Street, New Plymouth";
  const keepPreviousCoords = previous.address === resolvedAddress;

  return {
    ...previous,
    id: "taranaki-talkingpoint-new-plymouth",
    name: "TalkingPoint New Plymouth",
    type: "psychologist",
    region: "Taranaki",
    city: "New Plymouth",
    address: resolvedAddress,
    phone,
    text: "",
    email,
    website: pages.newPlymouth,
    lat: keepPreviousCoords ? previous.lat || "" : "",
    lon: keepPreviousCoords ? previous.lon || "" : "",
    coordinateSource: keepPreviousCoords ? previous.coordinateSource || "" : "",
    hours: acceptsPrivateClients || newPlymouthAccepting
      ? "Site says private client self-referral and New Plymouth referrals are currently available; contact to confirm clinician availability."
      : "Contact to ask about current availability.",
    cost: "Private clients and ACC clients are mentioned. Ask about current fees, ACC, EAP, insurance, WINZ, or other funding options.",
    tags: [
      ...new Set([
        ...sharedTags,
        "neuropsychology",
        "health",
        "anger",
        "self-esteem",
        "personal-development",
        "adhd",
        "child",
        "acc"
      ])
    ],
    specialties: newPlymouthSpecialties,
    patientGroups: [
      "Private clients",
      "ACC clients",
      "Children",
      "Adults",
      "People seeking a Maori clinical psychologist",
      "LGBQ+ friendly"
    ],
    ageGroups: ["Children", "Adults"],
    fit: "Clinical psychology practice in New Plymouth. The site lists anxiety, OCD, neuropsychology, health psychology, trauma, PTSD, grief, ADHD, child psychology, learning disorder assessments, ACC and private-client pathways, a Maori clinical psychologist, and LGBQ+ friendly support.",
    firstStep: "Call, email, or use the self-referral form and ask whether a clinician is available for your concern, costs, ACC or other funding, and the simplest first appointment step.",
    source: pages.newPlymouth,
    verified: verifiedMonth,
    lastVerified: verifiedMonth,
    confidence: "high",
    sourceQuality: "provider-owned page",
    needsManualVerification: false
  };
}

function recordForCambridge(previous = {}) {
  return {
    ...previous,
    id: "waikato-talkingpoint-cambridge",
    name: "TalkingPoint Cambridge",
    type: "psychologist",
    region: "Waikato",
    city: "Cambridge",
    address: previous.address || "",
    phone,
    text: "",
    email: previous.email || "",
    website: pages.cambridge,
    hours: acceptsPrivateClients
      ? "Site says private client self-referral is currently available; contact to confirm Cambridge availability."
      : "Contact to ask about current availability.",
    cost: "Private fees may apply. Ask about current fees, ACC, EAP, insurance, WINZ, or other funding options.",
    tags: [
      ...new Set([
        ...sharedTags,
        "health",
        "anger",
        "self-esteem",
        "personal-development",
        "parenting",
        "child",
        "adolescent"
      ])
    ],
    specialties: cambridgeSpecialties,
    patientGroups: ["Private clients", "Children", "Adolescents", "Adults", "Parents and families"],
    ageGroups: ["Children", "Adolescents", "Adults"],
    fit: "Cambridge psychology service. The site lists support for stress, OCD, health psychology, anger, self-esteem, anxiety, personal development, competency assessments, grief/PTSD, trauma, parenting, and adults, adolescents, and children with anxiety, depression, and stress.",
    firstStep: "Call or use the self-referral form, choose Cambridge, and ask about availability, costs, funding options, and whether the service fits your concern.",
    source: pages.cambridge,
    verified: verifiedMonth,
    lastVerified: verifiedMonth,
    confidence: "high",
    sourceQuality: "provider-owned page",
    needsManualVerification: false
  };
}

const providers = JSON.parse(fs.readFileSync(providersPath, "utf8"));
const byId = new Map(providers.map((provider) => [provider.id, provider]));
const changedIds = new Set();

for (const record of [
  recordForNewPlymouth(byId.get("taranaki-talkingpoint-new-plymouth")),
  recordForCambridge(byId.get("waikato-talkingpoint-cambridge"))
]) {
  if (byId.has(record.id)) {
    const index = providers.findIndex((provider) => provider.id === record.id);
    providers[index] = record;
  } else {
    providers.push(record);
  }
  changedIds.add(record.id);
}

const geocodeSummary = noGeocode
  ? null
  : await geocodeProviderRecords(providers, {
      providerIds: changedIds,
      force: true,
      failSoft: true
    });

fs.writeFileSync(providersPath, `${JSON.stringify(providers, null, 2)}\n`);

console.log(`Imported TalkingPoint provider records into ${providersPath}. Updated/added ${changedIds.size}.`);
console.log(`TalkingPoint phone: ${phone}. New Plymouth email: ${email || "not found"}.`);
if (geocodeSummary) {
  for (const line of geocodeSummary.logs) console.log(line);
  console.log(`Geocoding for this import: checked ${geocodeSummary.checked}; updated ${geocodeSummary.updated}; no match ${geocodeSummary.noMatch}; failed ${geocodeSummary.failed}; skipped ${geocodeSummary.skipped}.`);
}
