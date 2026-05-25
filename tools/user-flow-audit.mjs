import fs from "node:fs";
import { pathToFileURL } from "node:url";

const providers = JSON.parse(fs.readFileSync("providers.json", "utf8"));
const optInPreferenceTags = new Set(["maori", "pasifika", "asian", "rainbow"]);
const broadNeedTags = new Set(["depression", "anxiety", "work", "stress", "relationships", "grief", "addiction"]);

export const personas = [
  { name: "16-year-old female in Northland with anxiety", region: "Northland", age: 16, want: "therapist", needs: ["anxiety"], preferences: ["female-provider"], barriers: ["privacy"], goal: "avoid sexual-harm-only services" },
  { name: "Auckland parent looking for ADHD assessment for child", region: "Auckland", age: 42, want: "psychologist", needs: ["work"], preferences: [], barriers: ["cost"], goal: "find assessment-capable professionals" },
  { name: "Wellington university student with depression", region: "Wellington", age: 20, want: "therapist", needs: ["depression"], preferences: [], barriers: ["cost"], goal: "find low-cost counselling" },
  { name: "Rural South Island user with poor transport", region: "Southland", age: 31, want: "therapist", needs: ["anxiety"], preferences: ["telehealth"], barriers: ["transport"], goal: "find phone or video options" },
  { name: "Maori user seeking culturally appropriate support", region: "Northland", age: 34, want: "unsure", needs: ["depression"], preferences: ["maori"], barriers: ["culture"], goal: "find kaupapa Maori or culturally safe support" },
  { name: "Pacific family needing free counselling", region: "Auckland", age: 38, want: "therapist", needs: ["work"], preferences: ["pasifika"], barriers: ["cost"], goal: "find Pasifika-friendly support" },
  { name: "User in crisis needing immediate help", region: "Waikato", age: 29, want: "unsure", needs: ["depression"], preferences: [], barriers: ["privacy"], goal: "see crisis guidance immediately" },
  { name: "Person looking for addiction support", region: "Bay of Plenty", age: 45, want: "addiction", needs: ["addiction"], preferences: [], barriers: ["cost"], goal: "find alcohol, drug, or gambling help" },
  { name: "Male trades worker reluctant to seek help", region: "Canterbury", age: 36, want: "therapist", needs: ["depression"], preferences: ["male-provider"], barriers: ["privacy"], goal: "find a lower-pressure first contact" },
  { name: "LGBTQIA+ youth seeking safe support", region: "Wellington", age: 17, want: "unsure", needs: ["anxiety"], preferences: ["rainbow"], barriers: ["culture"], goal: "find Rainbow-affirming support" },
  { name: "Low technical literacy user", region: "Taranaki", age: 51, want: "gp", needs: ["depression"], preferences: [], barriers: [], goal: "get one obvious contact" },
  { name: "Elderly person searching on mobile", region: "Wairarapa", age: 72, want: "gp", needs: ["anxiety"], preferences: [], barriers: ["transport"], goal: "find nearby primary care" },
  { name: "User with limited English", region: "Auckland", age: 28, want: "therapist", needs: ["anxiety"], preferences: ["asian"], barriers: ["culture"], goal: "find culturally matched support" },
  { name: "Domestic violence victim seeking discreet help", region: "Tairawhiti", age: 33, want: "therapist", needs: ["trauma"], preferences: ["trauma-informed"], barriers: ["privacy"], goal: "find trauma-informed help" },
  { name: "Someone searching at 2am while distressed", region: "Otago", age: 24, want: "unsure", needs: ["anxiety"], preferences: [], barriers: ["wait"], goal: "find something usable after hours" },
  { name: "User looking for free or low-cost support only", region: "Hawke's Bay", age: 27, want: "unsure", needs: ["depression"], preferences: [], barriers: ["cost"], goal: "find funded options" },
  { name: "User overwhelmed by too many options", region: "Auckland", age: 30, want: "unsure", needs: ["anxiety"], preferences: [], barriers: ["privacy"], goal: "see a small ranked set" },
  { name: "User unsure whether serious enough", region: "Nelson Marlborough Tasman", age: 40, want: "gp", needs: ["work"], preferences: [], barriers: [], goal: "feel allowed to ask a GP" },
  { name: "User helping a friend or family member", region: "Manawatu-Whanganui", age: 44, want: "unsure", needs: ["depression"], preferences: [], barriers: ["cost"], goal: "find practical first contacts" },
  { name: "Comparing online vs in-person services", region: "Rotorua and Taupo", age: 35, want: "psychologist", needs: ["anxiety"], preferences: ["telehealth"], barriers: ["transport"], goal: "compare telehealth and local providers" }
];

function isDirectoryLike(provider) {
  return provider.type === "directory" || provider.tags?.includes("directory");
}

function hasContact(provider) {
  return Boolean(provider.phone || provider.text || provider.email || provider.website);
}

function isTelehealthProvider(provider) {
  const tags = provider.tags || [];
  if (tags.includes("telehealth") || tags.includes("online")) return true;
  if (provider.onlineAvailable === true || provider.phoneSupport === true) return true;
  if (provider.type === "helpline") return true;
  return provider.region === "National"
    && ["addiction", "youth"].includes(provider.type)
    && Boolean(provider.phone || provider.text || tags.includes("online"));
}

function hasNationalServiceReach(provider) {
  if (provider.region !== "National") return false;
  if (isTelehealthProvider(provider)) return true;
  if (isDirectoryLike(provider)) return true;
  if (provider.type === "helpline") return true;
  return ["addiction", "public-service", "youth"].includes(provider.type)
    && Boolean(provider.phone || provider.text || provider.email || provider.website);
}

function matchesRegion(provider, region, preferences = []) {
  if (provider.region === region) return true;
  if (hasNationalServiceReach(provider)) return true;
  return preferences.includes("telehealth") && isTelehealthProvider(provider);
}

function selectedType(want) {
  if (want === "therapist") return "counsellor";
  if (want === "unsure") return "all";
  return want;
}

function preferenceAllowed(provider, preferences) {
  const tags = provider.tags || [];
  const optInTags = tags.filter((tag) => optInPreferenceTags.has(tag));
  if (optInTags.length && !optInTags.some((tag) => preferences.includes(tag))) return false;
  if (preferences.includes("female-provider") && !preferences.includes("male-provider") && tags.includes("male")) return false;
  if (preferences.includes("male-provider") && !preferences.includes("female-provider") && tags.includes("female")) return false;
  return true;
}

function matchesType(provider, type) {
  if (type === "all") return true;
  if (type === "counsellor") return provider.type === "counsellor" || provider.type === "mens-centre";
  if (type === "addiction") return provider.type === "addiction" || provider.tags?.includes("addiction");
  if (type === "psychiatrist") return provider.type === "psychiatrist" || provider.tags?.includes("psychiatry-service");
  return provider.type === type;
}

function providerNeedScope(provider) {
  if (Array.isArray(provider.needScope) && provider.needScope.length) return provider.needScope;
  if (provider.tags?.includes("sexual-harm") && !provider.tags.some((tag) => broadNeedTags.has(tag))) return ["trauma"];
  if ((provider.type === "addiction" || (provider.type === "helpline" && provider.tags?.includes("addiction"))) && !["depression", "anxiety", "trauma", "work"].some((tag) => provider.tags?.includes(tag))) return ["addiction"];
  return [];
}

function matchesSelectedNeeds(provider, needs) {
  const scope = providerNeedScope(provider);
  return !scope.length || !needs.length || scope.some((need) => needs.includes(need));
}

function providerMatchesAge(provider, age) {
  if (!age || !Array.isArray(provider.ageGroups) || !provider.ageGroups.length) return true;
  const text = [...provider.ageGroups, ...(provider.patientGroups || [])].join(" ").toLowerCase();
  const allowsChild = /child|children|tamariki|under\s*13|0\s*-\s*12|5\s*years/.test(text);
  const allowsAdolescent = /adolescent|teen|rangatahi|youth|young adult|13|17|18/.test(text);
  const allowsAdult = /adult|pakeke|18|25|60/.test(text);
  const allowsOlder = /older|kaumatua|senior|65|60\+/.test(text);
  const hasSpecificAge = allowsChild || allowsAdolescent || allowsAdult || allowsOlder;
  if (!hasSpecificAge) return true;
  if (age < 13) return allowsChild;
  if (age < 18) return allowsAdolescent || allowsChild;
  if (age < 25) return allowsAdult || allowsAdolescent;
  if (age < 65) return allowsAdult;
  return allowsOlder || allowsAdult;
}

function score(provider, persona, type) {
  const tags = provider.tags || [];
  let value = 0;
  if (provider.region === persona.region) value += 12;
  if (hasNationalServiceReach(provider)) value += persona.barriers.includes("transport") || persona.preferences.includes("telehealth") ? 5 : -3;
  if (provider.type === type) value += 8;
  if (type === "all" && ["gp", "counsellor", "psychologist", "public-service", "youth"].includes(provider.type)) value += 2;
  for (const need of persona.needs) if (tags.includes(need) || provider.fit?.toLowerCase().includes(need)) value += 5;
  for (const preference of persona.preferences) if (tags.includes(preference)) value += 8;
  if (persona.preferences.includes("telehealth") && isTelehealthProvider(provider)) value += 8;
  if (!persona.preferences.includes("telehealth") && isTelehealthProvider(provider)) value -= 3;
  if (persona.barriers.includes("cost") && /free|funded|public|winz|low-cost|reduced/i.test(`${provider.cost} ${tags.join(" ")}`)) value += 5;
  if (provider.email) value += 2;
  if (provider.phone || provider.text) value += 2;
  return value;
}

export function recommendations(persona) {
  const type = selectedType(persona.want);
  const strictExactTypes = new Set(["gp", "psychologist", "psychiatrist"]);
  const baseFilter = (provider) =>
    matchesRegion(provider, persona.region, persona.preferences)
    && preferenceAllowed(provider, persona.preferences)
    && providerMatchesAge(provider, persona.age)
    && matchesSelectedNeeds(provider, persona.needs)
    && !provider.tags?.includes("crisis")
    && !isDirectoryLike(provider)
    && hasContact(provider);

  const primary = providers
    .filter((provider) => matchesType(provider, type))
    .filter(baseFilter)
    .map((provider) => ({ provider, score: score(provider, persona, type) }))
    .sort((a, b) => b.score - a.score || a.provider.name.localeCompare(b.provider.name))
    .map((entry) => entry.provider);

  const fill = providers
    .filter(baseFilter)
    .map((provider) => ({ provider, score: score(provider, persona, "all") }))
    .sort((a, b) => b.score - a.score || a.provider.name.localeCompare(b.provider.name))
    .map((entry) => entry.provider);

  const merged = type === "all" || !strictExactTypes.has(type)
    ? [...new Map([...primary, ...fill].map((provider) => [provider.id, provider])).values()]
    : primary;

  return merged
    .map((provider, index) => ({
      provider,
      index,
      preferenceMatches: persona.preferences.filter((preference) => provider.tags?.includes(preference)).length
    }))
    .sort((a, b) => b.preferenceMatches - a.preferenceMatches || a.index - b.index)
    .map(({ provider }) => provider)
    .slice(0, 3);
}

function escapeCell(value) {
  return String(value || "").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
}

export function runAudit() {
  return personas.map((persona) => {
    const matches = recommendations(persona);
    const optInPreferences = persona.preferences.filter((preference) => optInPreferenceTags.has(preference));
    return {
      persona: persona.name,
      goal: persona.goal,
      topThree: matches.map((provider) => provider.name),
      passed: matches.length > 0
        && matches.every((provider) => matchesSelectedNeeds(provider, persona.needs))
        && matches.every((provider) => providerMatchesAge(provider, persona.age))
        && !matches.some((provider) => provider.tags?.includes("crisis"))
        && !matches.some(isDirectoryLike)
        && (!optInPreferences.length || matches.some((provider) => optInPreferences.some((preference) => provider.tags?.includes(preference))))
    };
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const rows = runAudit();
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(rows, null, 2));
  } else {
    console.log("| Persona | Goal | Top three | Result |");
    console.log("| --- | --- | --- | --- |");
    for (const row of rows) {
      console.log(`| ${escapeCell(row.persona)} | ${escapeCell(row.goal)} | ${escapeCell(row.topThree.join("; "))} | ${row.passed ? "Pass" : "Review"} |`);
    }
  }
  process.exitCode = rows.every((row) => row.passed) ? 0 : 1;
}
