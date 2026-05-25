import fs from "node:fs";
import path from "node:path";

const [
  ,
  ,
  providersPath = "providers.json",
  reportPath = "data/reports/provider-identity-scan-2026-05-25.json"
] = process.argv;

const REVIEW_TYPES = new Set(["gp", "psychologist", "psychiatrist", "counsellor", "addiction", "youth", "mens-centre", "public-service"]);
const MAX_EXTRA_PAGES = Number(process.env.IDENTITY_SCAN_EXTRA_PAGES || 3);
const CONCURRENCY = Number(process.env.IDENTITY_SCAN_CONCURRENCY || 8);
const TIMEOUT_MS = Number(process.env.IDENTITY_SCAN_TIMEOUT_MS || 20000);
const MAX_HTML_CHARS = 800_000;

const CLINIC_WORDS = /\b(clinic|centre|center|practice|psychology|psychiatry|counselling|counseling|therapy|therapies|health|healthcare|medical|doctors|doctor|gp|hauora|wellbeing|wellness|service|services|trust|collective|associates|group)\b/i;
const ROLE_WORDS = /\b(clinical psychologist|psychologist|psychiatrist|counsellor|counselor|psychotherapist|therapist|mental health nurse|gp|general practitioner|doctor)\b/i;
const BAD_NAME_WORDS = /\b(home|about|contact|privacy|terms|fees|book|booking|online|telehealth|services|resources|news|blog|menu|search|login|register|registered|clinical|copyright|reserved|email|phone|address|referral|appointments?|website|qualification|qualifications|board|chair|best|new zealand|zealand|aotearoa|nz)\b/i;
const LINK_HINTS = /\b(about|team|staff|people|clinician|practitioner|psychologist|psychiatrist|counsellor|counselor|therapist|contact)\b/i;
const SERVICE_SIGNALS = {
  depressionLowMood: {
    label: "Depression or low mood",
    patterns: [/\bdepression\b/i, /\blow mood\b/i, /\bmood disorder/i, /\bpostnatal depression\b/i]
  },
  anxietyPanicOverwhelm: {
    label: "Anxiety, panic, or overwhelm",
    patterns: [/\banxiety\b/i, /\bpanic attacks?\b/i, /\bpanic disorder\b/i, /\boverwhelm(?:ed|ing)?\b/i]
  },
  traumaSexualHarm: {
    label: "Trauma or sexual harm",
    patterns: [/\btrauma\b/i, /\bptsd\b/i, /\bpost-traumatic\b/i, /\bsexual abuse\b/i, /\bsexual harm\b/i, /\brape\b/i, /\bsensitive claims?\b/i]
  },
  addictionGambling: {
    label: "Alcohol, drug, or gambling harm",
    patterns: [/\baddiction\b/i, /\balcohol\b/i, /\bdrug(?:s)?\b/i, /\bsubstance\b/i, /\bgambling\b/i, /\baod\b/i]
  },
  workStudyMoneyHousing: {
    label: "Work, study, money, or housing stress",
    patterns: [/\bwork stress\b/i, /\bworkplace\b/i, /\bemployment\b/i, /\bstudy stress\b/i, /\bstudent support\b/i, /\bfinancial stress\b/i, /\bmoney worries\b/i, /\bhousing\b/i, /\bburnout\b/i]
  }
};
const SUPPORT_SIGNALS = {
  maori: {
    label: "Maori",
    patterns: [/\bm[āa]ori\b/i, /\bkaupapa\b/i, /\bwh[āa]nau\b/i, /\btikanga\b/i, /\bte reo\b/i, /\btangata whenua\b/i, /\bmanaakitanga\b/i]
  },
  pasifika: {
    label: "Pasifika",
    patterns: [/\bpasifika\b/i, /\bpacific peoples?\b/i, /\bsamoan\b/i, /\btongan\b/i, /\bfijian\b/i, /\bcook islands?\b/i, /\bniuean\b/i, /\btokelauan\b/i]
  },
  asian: {
    label: "Asian",
    patterns: [/\basian\b/i, /\bchinese\b/i, /\bmandarin\b/i, /\bcantonese\b/i, /\bkorean\b/i, /\bhindi\b/i, /\bindian\b/i, /\bjapanese\b/i, /\bfilipino\b/i, /\bvietnamese\b/i, /\bthai\b/i]
  },
  rainbow: {
    label: "Rainbow / LGBTQIA+",
    patterns: [/\brainbow\b/i, /\blgbtq?i?a?\+?\b/i, /\bqueer\b/i, /\btransgender\b/i, /\bgender diverse\b/i, /\btakat[āa]pui\b/i]
  },
  traumaInformed: {
    label: "Trauma-informed",
    patterns: [/\btrauma-informed\b/i, /\btrauma informed\b/i, /\bsafety and stabilisation\b/i, /\bsafe and supportive\b/i]
  },
  telehealth: {
    label: "Telehealth / phone or video appointments",
    patterns: [/\btelehealth\b/i, /\bonline therapy\b/i, /\bonline counselling\b/i, /\bvideo appointment/i, /\bvideo session/i, /\bzoom\b/i, /\bphone appointment/i, /\btelephone appointment/i, /\bvirtual appointment/i, /\bremote session/i]
  }
};
const COST_PATTERNS = [
  /\bfree\b/i,
  /\bfunded\b/i,
  /\blow[- ]cost\b/i,
  /\bfees?\b/i,
  /\bcosts?\b/i,
  /\bpricing\b/i,
  /\$\s?\d+/i,
  /\bacc\b/i,
  /\bwinz\b/i,
  /\bdisability allowance\b/i,
  /\beap\b/i,
  /\bsubsid(?:y|ised|ized)\b/i
];
const ACCEPTING_PATTERNS = [
  /\btaking new (?:clients|patients|referrals)\b/i,
  /\baccepting new (?:clients|patients|referrals)\b/i,
  /\bnew (?:client|patient) enquir(?:y|ies)\b/i,
  /\bbook (?:an )?appointment\b/i
];
const UNAVAILABLE_PATTERNS = [
  /\bnot (?:currently )?(?:taking|accepting) (?:on )?new (?:clients|patients|referrals)\b/i,
  /\bclosed to new (?:clients|patients|referrals)\b/i,
  /\bbooks? (?:are )?closed\b/i,
  /\bno (?:current )?availability\b/i,
  /\bcurrently full\b/i,
  /\bfull capacity\b/i,
  /\bat capacity\b/i
];
const LONG_WAIT_PATTERNS = [
  /\blong wait\b/i,
  /\bwait ?list\b/i,
  /\bwaiting list\b/i,
  /\bwaiting time\b/i,
  /\bwait(?:ing)? (?:time )?(?:of )?\d+\s*(?:weeks?|months?)\b/i,
  /\b\d+\s*(?:weeks?|months?) wait\b/i
];
const BOOKING_PATTERNS = [
  /\bbook online\b/i,
  /\bbook now\b/i,
  /\bbook (?:an )?appointment\b/i,
  /\bonline booking\b/i,
  /\bmake (?:an )?appointment\b/i,
  /\brequest (?:an )?appointment\b/i,
  /\bself[- ]referral form\b/i,
  /\breferral form\b/i
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function decodeHtml(value = "") {
  return String(value)
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&ndash;|&#8211;/gi, "-")
    .replace(/&mdash;|&#8212;/gi, "-")
    .replace(/&rsquo;|&#8217;/gi, "'")
    .replace(/&lsquo;|&#8216;/gi, "'")
    .replace(/&ldquo;|&#8220;/gi, '"')
    .replace(/&rdquo;|&#8221;/gi, '"')
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function normaliseText(html = "") {
  return decodeHtml(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/?(h[1-6]|p|div|li|section|article|tr|td|th)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function cleanInline(value = "") {
  return decodeHtml(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHonorifics(value = "") {
  return value
    .replace(/\b(dr|doctor|prof|professor|mr|mrs|ms|miss)\.?\s+/gi, "")
    .replace(/\s*,?\s*(clinical psychologist|psychologist|psychiatrist|counsellor|counselor|psychotherapist|therapist|general practitioner|registered clinical|registered psychologist|qualifications?|mnzccp|fnzccp|franzcp|mbchb|mbbs|mrcgp|phd|dclinpsy|pgdipclinpsy)\b.*$/i, "")
    .trim();
}

function titleCaseName(value = "") {
  return value
    .split(/\s+/)
    .map((part) => part.length <= 3 && part === part.toUpperCase() ? part : part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
    .replace(/\bMc([a-z])/g, (_, c) => `Mc${c.toUpperCase()}`);
}

function isLikelyPersonName(value = "") {
  const clean = stripHonorifics(value)
    .replace(/\([^)]*\)/g, "")
    .replace(/[|–—].*$/g, "")
    .replace(/\b(website|qualifications?|registered|clinical|general practitioner|board|chair)\b.*$/i, "")
    .trim();
  if (!clean || clean.length < 5 || clean.length > 60) return false;
  if (BAD_NAME_WORDS.test(clean) || CLINIC_WORDS.test(clean)) return false;
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length < 2 || parts.length > 4) return false;
  const namePart = /^[A-Z][A-Za-zÀ-ÖØ-öø-ÿ'’.-]+$/;
  return parts.every((part) => namePart.test(part) || /^(de|du|van|von|der|den|te|la|le)$/i.test(part));
}

function normaliseName(value = "") {
  return titleCaseName(stripHonorifics(value)
    .replace(/\([^)]*\)/g, "")
    .replace(/[|–—].*$/g, "")
    .replace(/\s+/g, " ")
    .trim());
}

function isIndividualProvider(provider) {
  if (provider.clinicianName) return true;
  const name = provider.name || "";
  if (/^(dr|doctor|prof|mr|mrs|ms|miss)\b/i.test(name)) return true;
  if (CLINIC_WORDS.test(name)) return false;
  return isLikelyPersonName(name);
}

function sourceUrlFor(provider) {
  const candidates = [
    provider.website,
    provider.source && !/doctorpricer\.co\.nz\/?$/i.test(provider.source) ? provider.source : "",
    provider.availabilitySource && !/doctorpricer\.co\.nz\/?$/i.test(provider.availabilitySource) ? provider.availabilitySource : "",
    provider.source,
    provider.availabilitySource
  ].filter(Boolean);
  return candidates.find((url) => /^https?:\/\//i.test(url)) || "";
}

function sameOriginUrl(base, href) {
  try {
    const url = new URL(href, base);
    const root = new URL(base);
    if (url.origin !== root.origin) return "";
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

function extractTitle(html) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "";
  return cleanInline(title).replace(/\s*[|–—-]\s*(Home|About|Contact|Services)\s*$/i, "").trim();
}

function extractMeta(html, property) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["'][^>]*>`, "i")
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return cleanInline(match[1]);
  }
  return "";
}

function extractJsonLdNames(html) {
  const names = [];
  const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || [];
  for (const script of scripts) {
    const raw = script.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "").trim();
    try {
      const parsed = JSON.parse(decodeHtml(raw));
      const stack = Array.isArray(parsed) ? [...parsed] : [parsed];
      while (stack.length) {
        const item = stack.shift();
        if (!item || typeof item !== "object") continue;
        const type = Array.isArray(item["@type"]) ? item["@type"].join(" ") : item["@type"] || "";
        if (item.name && /(Person|Organization|LocalBusiness|MedicalBusiness|MedicalClinic|Physician|ProfessionalService)/i.test(type)) {
          names.push({ name: cleanInline(item.name), type });
        }
        for (const value of Object.values(item)) {
          if (Array.isArray(value)) stack.push(...value.filter((entry) => entry && typeof entry === "object"));
          else if (value && typeof value === "object") stack.push(value);
        }
      }
    } catch {
      // Ignore malformed JSON-LD. Many small sites ship invalid structured data.
    }
  }
  return names;
}

function candidatePracticeFromPage(provider, page) {
  const values = [
    extractMeta(page.html, "og:site_name"),
    ...extractJsonLdNames(page.html).filter((item) => !/Person/i.test(item.type)).map((item) => item.name),
    extractTitle(page.html).replace(/\s*[|–—-]\s*.+$/g, ""),
    provider.practiceName,
    !isIndividualProvider(provider) ? provider.name : ""
  ].filter(Boolean);

  for (const value of values) {
    const clean = cleanInline(value)
      .replace(/\s+-\s+.+$/g, "")
      .replace(/\s+\|\s+.+$/g, "")
      .trim();
    if (clean.length >= 3 && clean.length <= 80 && !/^home$/i.test(clean) && (CLINIC_WORDS.test(clean) || clean === provider.name)) {
      return clean;
    }
  }
  return "";
}

function extractPageLinks(baseUrl, html) {
  const links = [];
  const anchorRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchorRegex)) {
    const href = match[1];
    const label = cleanInline(match[2]);
    const absolute = sameOriginUrl(baseUrl, href);
    if (!absolute || absolute === baseUrl) continue;
    if (LINK_HINTS.test(`${href} ${label}`)) links.push(absolute);
  }
  return [...new Set(links)].slice(0, MAX_EXTRA_PAGES);
}

function findRoleEvidence(text, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const aroundName = new RegExp(`.{0,120}${escaped}.{0,180}`, "i");
  const roleNearName = text.match(aroundName)?.[0] || "";
  if (ROLE_WORDS.test(roleNearName)) return roleNearName.replace(/\s+/g, " ").trim().slice(0, 280);

  const lines = text.split("\n");
  const index = lines.findIndex((line) => line.includes(name));
  if (index >= 0) {
    const block = lines.slice(Math.max(0, index - 2), index + 4).join(" ");
    if (ROLE_WORDS.test(block)) return block.replace(/\s+/g, " ").trim().slice(0, 280);
  }
  return "";
}

function snippetAround(text, index, size = 320) {
  const start = Math.max(0, index - Math.floor(size / 2));
  const end = Math.min(text.length, index + Math.floor(size / 2));
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

function findEvidenceInPages(pages, patterns) {
  for (const page of pages) {
    if (!page.ok || !page.text) continue;
    for (const pattern of patterns) {
      const match = page.text.match(pattern);
      if (match && typeof match.index === "number") {
        return {
          value: "found",
          evidence: snippetAround(page.text, match.index),
          sourceUrl: page.finalUrl || page.url,
          matched: match[0]
        };
      }
    }
  }
  return { value: "unclear", evidence: "", sourceUrl: "", matched: "" };
}

function scanSignalGroup(pages, signalMap) {
  return Object.fromEntries(
    Object.entries(signalMap).map(([key, config]) => [
      key,
      {
        label: config.label,
        ...findEvidenceInPages(pages, config.patterns)
      }
    ])
  );
}

function findBookingFlow(pages) {
  for (const page of pages) {
    if (!page.ok) continue;
    const textHit = findEvidenceInPages([page], BOOKING_PATTERNS);
    const htmlHasForm = /<form\b/i.test(page.html) && /\b(book|appointment|referral|enquiry|contact)\b/i.test(page.html);
    const hrefHit = page.html.match(/<a\b[^>]*(?:href=["'][^"']*(?:book|appointment|referral|enquiry|contact)[^"']*["'][^>]*)>([\s\S]{0,120}?)<\/a>/i);
    if (textHit.value === "found") return { value: "found", evidence: textHit.evidence, sourceUrl: textHit.sourceUrl };
    if (hrefHit) return { value: "found", evidence: `Link/button text: ${cleanInline(hrefHit[1]) || "booking/contact link"}`, sourceUrl: page.finalUrl || page.url };
    if (htmlHasForm) return { value: "found", evidence: "Page contains a contact, booking, enquiry, or referral form.", sourceUrl: page.finalUrl || page.url };
  }
  return { value: "unclear", evidence: "", sourceUrl: "" };
}

function findAvailabilitySignal(pages) {
  const unavailable = findEvidenceInPages(pages, UNAVAILABLE_PATTERNS);
  if (unavailable.value === "found") return { status: "not_accepting_or_limited", ...unavailable };
  const longWait = findEvidenceInPages(pages, LONG_WAIT_PATTERNS);
  if (longWait.value === "found") return { status: "long_wait_or_waitlist", ...longWait };
  const accepting = findEvidenceInPages(pages, ACCEPTING_PATTERNS);
  if (accepting.value === "found") return { status: "accepting_or_booking_available", ...accepting };
  return { status: "unclear", value: "unclear", evidence: "", sourceUrl: "", matched: "" };
}

function findGenderSignal(provider, text, candidates) {
  const names = [
    provider.clinicianName,
    isIndividualProvider(provider) ? provider.name : "",
    ...candidates.map((candidate) => candidate.name)
  ].filter(Boolean);
  for (const name of names) {
    const clean = normaliseName(name);
    if (!clean) continue;
    const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = text.match(new RegExp(`.{0,220}${escaped}.{0,420}`, "i"));
    const block = match?.[0] || "";
    if (/\b(she\/her|she, her|she is|her work|her approach|herself)\b/i.test(block)) {
      return { value: "female", evidence: block.replace(/\s+/g, " ").slice(0, 320) };
    }
    if (/\b(he\/him|he, him|he is|his work|his approach|himself)\b/i.test(block)) {
      return { value: "male", evidence: block.replace(/\s+/g, " ").slice(0, 320) };
    }
    if (/\b(they\/them|they are|their work|their approach)\b/i.test(block)) {
      return { value: "gender diverse or unspecified", evidence: block.replace(/\s+/g, " ").slice(0, 320) };
    }
  }
  if (provider.providerGender) return { value: provider.providerGender, evidence: "Existing providerGender field." };
  return { value: "unclear", evidence: "" };
}

function extractCliniciansFromText(text) {
  const candidates = new Map();
  const patterns = [
    /\b(?:Dr|Doctor|Prof|Professor|Mr|Mrs|Ms|Miss)\.?\s+([A-Z][A-Za-zÀ-ÖØ-öø-ÿ'’.-]+(?:\s+(?:de|du|van|von|der|den|te|la|le|[A-Z][A-Za-zÀ-ÖØ-öø-ÿ'’.-]+)){1,3})\b/g,
    /\b([A-Z][A-Za-zÀ-ÖØ-öø-ÿ'’.-]+(?:\s+(?:de|du|van|von|der|den|te|la|le|[A-Z][A-Za-zÀ-ÖØ-öø-ÿ'’.-]+)){1,3})\s*,?\s+(?:Clinical Psychologist|Psychologist|Psychiatrist|Counsellor|Counselor|Psychotherapist|Therapist)\b/g,
    /\b(?:Clinical Psychologist|Psychologist|Psychiatrist|Counsellor|Counselor|Psychotherapist|Therapist)\s+([A-Z][A-Za-zÀ-ÖØ-öø-ÿ'’.-]+(?:\s+(?:de|du|van|von|der|den|te|la|le|[A-Z][A-Za-zÀ-ÖØ-öø-ÿ'’.-]+)){1,3})\b/g
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const name = normaliseName(match[1]);
      if (!isLikelyPersonName(name)) continue;
      const evidence = findRoleEvidence(text, name) || match[0];
      candidates.set(name.toLowerCase(), { name, evidence });
    }
  }
  return [...candidates.values()].slice(0, 30);
}

function confidenceFor(provider, clinicianGuess, practiceGuess, pages, candidates) {
  if (provider.clinicianName || provider.practiceName) return "existing";
  if (isIndividualProvider(provider) && clinicianGuess) return "high";
  if (candidates.length === 1 && clinicianGuess && practiceGuess) return "medium";
  if (!clinicianGuess && practiceGuess) return "medium";
  if (candidates.length > 1) return "candidate-list";
  if (pages.some((page) => page.status && page.status !== 200)) return "low";
  return "low";
}

async function fetchPage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-NZ,en;q=0.9",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36"
      }
    });
    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("text") || contentType.includes("html") || contentType.includes("xml")
      ? (await response.text()).slice(0, MAX_HTML_CHARS)
      : "";
    return {
      url,
      finalUrl: response.url,
      ok: response.status >= 200 && response.status < 400 && Boolean(body),
      status: response.status,
      contentType,
      html: body,
      text: normaliseText(body)
    };
  } catch (error) {
    return {
      url,
      finalUrl: url,
      ok: false,
      status: error.name || "ERR",
      error: error.message,
      contentType: "",
      html: "",
      text: ""
    };
  } finally {
    clearTimeout(timer);
  }
}

function makeUrlScanner() {
  const cache = new Map();
  return async function scanUrl(url) {
    if (cache.has(url)) return cache.get(url);
    const promise = (async () => {
      const primary = await fetchPage(url);
      const pages = [primary];
      if (primary.ok) {
        const extraLinks = extractPageLinks(primary.finalUrl || url, primary.html);
        for (const link of extraLinks) {
          if (pages.some((page) => page.finalUrl === link || page.url === link)) continue;
          pages.push(await fetchPage(link));
        }
      }
      return pages;
    })();
    cache.set(url, promise);
    return promise;
  };
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

const providers = readJson(providersPath)
  .filter((provider) => REVIEW_TYPES.has(provider.type))
  .filter((provider) => !provider.id?.startsWith("crisis-"))
  .filter((provider) => sourceUrlFor(provider));

const checkedAt = new Date().toISOString();
const scanUrl = makeUrlScanner();
let completed = 0;

const records = await mapLimit(providers, CONCURRENCY, async (provider) => {
  const sourceUrl = sourceUrlFor(provider);
  const pages = await scanUrl(sourceUrl);
  const readablePages = pages.filter((page) => page.ok);
  const combinedText = readablePages.map((page) => page.text).join("\n").slice(0, 120_000);
  const allCandidates = new Map();
  for (const page of readablePages) {
    for (const candidate of extractCliniciansFromText(page.text)) {
      allCandidates.set(candidate.name.toLowerCase(), {
        ...candidate,
        sourceUrl: page.finalUrl || page.url
      });
    }
    for (const item of extractJsonLdNames(page.html).filter((entry) => /Person/i.test(entry.type))) {
      const name = normaliseName(item.name);
      if (isLikelyPersonName(name) && !allCandidates.has(name.toLowerCase())) {
        allCandidates.set(name.toLowerCase(), {
          name,
          evidence: `${name} found in structured data`,
          sourceUrl: page.finalUrl || page.url
        });
      }
    }
  }

  const candidates = [...allCandidates.values()];
  const providerName = normaliseName(provider.name || "");
  const matchingCandidate = candidates.find((candidate) => candidate.name.toLowerCase() === providerName.toLowerCase());
  const singleCandidate = candidates.length === 1 ? candidates[0] : null;
  const clinicianGuess = provider.clinicianName || (isIndividualProvider(provider) ? provider.name : "") || matchingCandidate?.name || singleCandidate?.name || "";
  const practiceGuess = provider.practiceName || readablePages.map((page) => candidatePracticeFromPage(provider, page)).find(Boolean) || (!isIndividualProvider(provider) ? provider.name : "");
  const evidence = matchingCandidate?.evidence || singleCandidate?.evidence || readablePages.map((page) => extractTitle(page.html)).find(Boolean) || "";
  const serviceSignals = scanSignalGroup(readablePages, SERVICE_SIGNALS);
  const supportSignals = scanSignalGroup(readablePages, SUPPORT_SIGNALS);
  const costFundingSignal = findEvidenceInPages(readablePages, COST_PATTERNS);
  const availabilitySignal = findAvailabilitySignal(readablePages);
  const bookingSignal = findBookingFlow(readablePages);
  const genderSignal = findGenderSignal(provider, combinedText, candidates);
  const statuses = pages.map((page) => `${page.status}:${page.finalUrl || page.url}`).slice(0, 5);
  completed += 1;
  if (completed % 50 === 0 || completed === providers.length) {
    console.error(`Scanned ${completed}/${providers.length} provider source records...`);
  }

  return {
    providerId: provider.id || "",
    providerName: provider.name || "",
    providerType: provider.type || "",
    region: provider.region || "",
    city: provider.city || "",
    sourceUrl,
    pagesChecked: pages.map((page) => ({
      url: page.url,
      finalUrl: page.finalUrl,
      status: page.status,
      ok: page.ok,
      error: page.error || ""
    })),
    existingClinicianName: provider.clinicianName || "",
    existingPracticeName: provider.practiceName || "",
    autoClinicianName: clinicianGuess,
    autoPracticeName: practiceGuess,
    autoConfidence: confidenceFor(provider, clinicianGuess, practiceGuess, pages, candidates),
    autoEvidence: evidence.replace(/\s+/g, " ").slice(0, 420),
    serviceSignals,
    supportSignals,
    clinicianGenderSignal: genderSignal,
    costFundingSignal,
    availabilitySignal,
    bookingSignal,
    candidateClinicians: candidates,
    notes: pages.every((page) => !page.ok) ? `Could not read source. Statuses: ${statuses.join("; ")}` : ""
  };
});

const report = {
  generatedAt: checkedAt,
  providersScanned: providers.length,
  readableProviders: records.filter((record) => record.pagesChecked.some((page) => page.ok)).length,
  withAutoClinician: records.filter((record) => record.autoClinicianName).length,
  withAutoPractice: records.filter((record) => record.autoPracticeName).length,
  withMultipleClinicianCandidates: records.filter((record) => record.candidateClinicians.length > 1).length,
  serviceSignalCounts: Object.fromEntries(Object.keys(SERVICE_SIGNALS).map((key) => [
    key,
    records.filter((record) => record.serviceSignals?.[key]?.value === "found").length
  ])),
  supportSignalCounts: Object.fromEntries(Object.keys(SUPPORT_SIGNALS).map((key) => [
    key,
    records.filter((record) => record.supportSignals?.[key]?.value === "found").length
  ])),
  availabilitySignalCounts: records.reduce((counts, record) => {
    const key = record.availabilitySignal?.status || "unclear";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {}),
  records
};

writeJson(reportPath, report);
console.log(JSON.stringify({
  reportPath,
  providersScanned: report.providersScanned,
  readableProviders: report.readableProviders,
  withAutoClinician: report.withAutoClinician,
  withAutoPractice: report.withAutoPractice,
  withMultipleClinicianCandidates: report.withMultipleClinicianCandidates,
  serviceSignalCounts: report.serviceSignalCounts,
  supportSignalCounts: report.supportSignalCounts,
  availabilitySignalCounts: report.availabilitySignalCounts
}, null, 2));
