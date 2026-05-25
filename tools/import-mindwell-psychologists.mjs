import fs from "node:fs";
import { withAvailabilityDefaults } from "./lib/provider-availability.mjs";

const [, , providersPath = "providers.json"] = process.argv;

const sitemapUrl = "https://www.mindwell.co.nz/sitemap.xml";
const homeUrl = "https://www.mindwell.co.nz/";
const userAgent = "Care Finder NZ provider verification (john@johnfinnerty.co.nz)";

function decodeHtml(value) {
  return String(value || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&ndash;/g, "-")
    .replace(/&mdash;/g, "-")
    .replace(/&middot;/g, ".")
    .replace(/&rsquo;|&#8217;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"");
}

function cleanText(value) {
  return decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugId(url) {
  return url
    .replace(/^https?:\/\/www\.mindwell\.co\.nz\//i, "")
    .replace(/\.html$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function titleCaseFromSlug(url) {
  return slugId(url)
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function firstMatch(text, pattern) {
  return text.match(pattern)?.[1]?.trim() || "";
}

function sectionList(html, heading) {
  const pattern = new RegExp(`<h2[^>]*>\\s*${heading}\\s*<\\/h2>\\s*<ul>([\\s\\S]*?)<\\/ul>`, "i");
  const listHtml = html.match(pattern)?.[1] || "";
  return [...listHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) => cleanText(match[1]))
    .filter(Boolean);
}

function sideValue(html, label) {
  const pattern = new RegExp(`<dt[^>]*>\\s*${label}\\s*<\\/dt>\\s*<dd[^>]*>([\\s\\S]*?)<\\/dd>`, "i");
  return cleanText(html.match(pattern)?.[1] || "");
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { "user-agent": userAgent } });
  if (!response.ok) throw new Error(`Mindwell fetch failed for ${url}: ${response.status}`);
  return response.text();
}

function tagsFromText(text, role) {
  const haystack = text.toLowerCase();
  const tags = new Set([
    "psychologist",
    "telehealth",
    "online",
    "direct-contact",
    "fit"
  ]);

  if (/clinical psychologist/i.test(role)) tags.add("clinical-psychologist");
  if (/counselling psychologist/i.test(role)) tags.add("counselling-psychologist");
  if (/anxiety|panic|worry/.test(haystack)) tags.add("anxiety");
  if (/depression|low mood|mood disorders/.test(haystack)) tags.add("depression");
  if (/trauma|ptsd|sexual/.test(haystack)) {
    tags.add("trauma");
    tags.add("ptsd");
  }
  if (/trauma-informed/.test(haystack)) tags.add("trauma-informed");
  if (/obsessive|ocd|\berp\b|exposure and response/.test(haystack)) tags.add("ocd");
  if (/stress|burnout/.test(haystack)) {
    tags.add("stress");
  }
  if (/work stress|career|burnout/.test(haystack)) {
    tags.add("work");
  }
  if (/eating|body image/.test(haystack)) tags.add("eating");
  if (/chronic pain|pain/.test(haystack)) tags.add("pain");
  if (/adhd/.test(haystack)) tags.add("adhd");
  if (/sleep|insomnia/.test(haystack)) tags.add("sleep");
  if (/parent|family/.test(haystack)) tags.add("parenting");
  if (/adolescent|youth/.test(haystack)) tags.add("youth");
  if (/older adult/.test(haystack)) tags.add("senior");
  if (/grief|loss/.test(haystack)) tags.add("grief");
  if (/emotion dysregulation|emotional regulation|dbt|bpd|personality/.test(haystack)) tags.add("emotion-regulation");
  if (/\bacc\b/.test(haystack)) tags.add("acc");

  return [...tags];
}

function ageGroupsFromWorksWith(worksWith) {
  const groups = [];
  if (/adolescent/i.test(worksWith)) groups.push("Adolescents");
  if (/adult|18\+/i.test(worksWith)) groups.push("Adults 18+");
  if (/parent/i.test(worksWith)) groups.push("Parents");
  if (/older adult/i.test(worksWith)) groups.push("Older adults");
  return groups.length ? groups : ["Adults 18+"];
}

function conciseFit(name, role, areas, therapies, worksWith) {
  const areaText = areas.slice(0, 8).join(", ");
  const therapyText = therapies.slice(0, 4).join(", ");
  return `${name} is a ${role.toLowerCase()} with Mindwell Online Psychology. The profile lists support for ${areaText}${therapyText ? `, using approaches such as ${therapyText}` : ""}. Works with ${worksWith || "adults 18+"} online across New Zealand.`;
}

const [sitemapXml, homeHtml] = await Promise.all([fetchText(sitemapUrl), fetchText(homeUrl)]);
const profileUrls = [...sitemapXml.matchAll(/<loc>(https:\/\/www\.mindwell\.co\.nz\/[^<]+\.html)<\/loc>/gi)]
  .map((match) => match[1])
  .filter((url) => !/sitemap|privacy|terms/i.test(url));

const email = firstMatch(homeHtml, /mailto:([A-Z0-9._%+-]+@mindwell\.co\.nz)/i);
const bookingUrl = firstMatch(homeHtml, /href="(https:\/\/book\.carepatron\.com\/Mindwell\/All[^"]+)"/i);
const homeText = cleanText(homeHtml);
const fee = firstMatch(homeText, /Session Fee\s*(\$[0-9]+\s*\+\s*GST\s*\$[0-9.]+\s*incl\.\s*GST per 50-minute session)/i);
const availability = firstMatch(homeText, /AVAILABILITY\s*(Within [0-9]+ days)/i);
const verifiedMonth = new Date().toISOString().slice(0, 7);

const providers = JSON.parse(fs.readFileSync(providersPath, "utf8"));
const byId = new Map(providers.map((provider) => [provider.id, provider]));
let added = 0;
let updated = 0;

for (const profileUrl of profileUrls) {
  const html = await fetchText(profileUrl);
  const name = cleanText(firstMatch(html, /<h1[^>]*class="profile-name"[^>]*>([\s\S]*?)<\/h1>/i)) || titleCaseFromSlug(profileUrl);
  const role = cleanText(firstMatch(html, /<p[^>]*class="profile-role"[^>]*>([\s\S]*?)<\/p>/i)) || sideValue(html, "Role") || "Registered Psychologist";
  const areas = sectionList(html, "Areas of expertise").length
    ? sectionList(html, "Areas of expertise")
    : sectionList(html, "Areas of interest");
  const therapies = sectionList(html, "Therapies offered");
  const worksWith = sideValue(html, "Works with") || "Adults 18+";
  const registration = sideValue(html, "Registration");
  const membership = sideValue(html, "Membership");
  const qualification = sideValue(html, "Qualification") || sideValue(html, "Qualifications");
  const experience = sideValue(html, "Experience");
  const evidenceText = `${role} ${areas.join(" ")} ${therapies.join(" ")} ${worksWith} ${registration} ${membership}`;
  const id = `national-mindwell-${slugId(profileUrl)}`;
  const previous = byId.get(id) || {};
  const record = withAvailabilityDefaults({
    ...previous,
    id,
    name: `${name}, Mindwell Online Psychology`,
    type: "psychologist",
    region: "National",
    city: "Online across New Zealand",
    address: "",
    phone: "",
    text: "",
    email,
    website: profileUrl,
    bookingUrl,
    hours: availability
      ? `Mindwell homepage lists online booking availability as ${availability}; confirm current clinician availability when booking.`
      : "Mindwell offers online booking; confirm current clinician availability when booking.",
    cost: fee
      ? `${fee}. Private fees apply; ask about ACC, EAP, insurance, WINZ, or other funding options before booking.`
      : "Private fees apply. Ask about ACC, EAP, insurance, WINZ, or other funding options before booking.",
    tags: tagsFromText(evidenceText, role),
    needScope: [],
    specialties: areas,
    services: therapies,
    patientGroups: ageGroupsFromWorksWith(worksWith),
    ageGroups: ageGroupsFromWorksWith(worksWith),
    fit: conciseFit(name, role, areas, therapies, worksWith),
    firstStep: "Email Mindwell or use the profile's Book a Session button. Ask about current availability, fees, funding options, and whether this psychologist fits what is happening.",
    eligibility: worksWith || "Adults 18+",
    crisisOnly: false,
    onlineAvailable: true,
    phoneSupport: false,
    inPerson: false,
    source: profileUrl,
    verified: verifiedMonth,
    lastVerified: verifiedMonth,
    confidence: "high",
    sourceQuality: "provider-owned page",
    needsManualVerification: false,
    registration,
    membership,
    qualification,
    experience
  }, { checkedAt: verifiedMonth });

  if (byId.has(id)) {
    const index = providers.findIndex((provider) => provider.id === id);
    providers[index] = record;
    updated += 1;
  } else {
    providers.push(record);
    added += 1;
  }
}

fs.writeFileSync(providersPath, `${JSON.stringify(providers, null, 2)}\n`);

console.log(`Imported Mindwell psychologist records into ${providersPath}. Added ${added}; updated ${updated}.`);
console.log(`Mindwell profiles: ${profileUrls.length}. Contact email: ${email || "not found"}. Booking URL: ${bookingUrl || "not found"}.`);
