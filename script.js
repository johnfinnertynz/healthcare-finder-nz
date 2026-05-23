const form = document.querySelector("#intakeForm");
const profileLine = document.querySelector("#profileLine");
const resultList = document.querySelector("#resultList");
const contactMessage = document.querySelector("#contactMessage");
const contactName = document.querySelector("#contactName");
const contactReply = document.querySelector("#contactReply");
const contactAsk = document.querySelector("#contactAsk");
const contactComfort = document.querySelector("#contactComfort");
const contactPreference = document.querySelector("#contactPreference");
const copyMessage = document.querySelector("#copyMessage");
const copyStatus = document.querySelector("#copyStatus");
const emailMessage = document.querySelector("#emailMessage");
const callTarget = document.querySelector("#callTarget");
const textTarget = document.querySelector("#textTarget");
const websiteTarget = document.querySelector("#websiteTarget");
const contactAvailability = document.querySelector("#contactAvailability");
const addressInput = document.querySelector("#address");
const addressSuggestions = document.querySelector("#addressSuggestions");
const addressStatus = document.querySelector("#addressStatus");
const providerSearch = document.querySelector("#providerSearch");
const providerType = document.querySelector("#providerType");
const providerCost = document.querySelector("#providerCost");
const providerCount = document.querySelector("#providerCount");
const providerList = document.querySelector("#providerList");
const showMoreProviders = document.querySelector("#showMoreProviders");
const selectedProvider = document.querySelector("#selectedProvider");
const providerFinder = document.querySelector(".provider-finder");
const contactLayout = document.querySelector(".contact-layout");
const canterburyOnlyContact = document.querySelector(".canterbury-only-contact");
const formProgressBar = document.querySelector("#formProgressBar");
const formProgressText = document.querySelector("#formProgressText");

let providers = [];
let selectedProviderId = "";
let contactProviderId = "";
let providerVisibleCount = 5;
let userCoords = null;
let matchedRegion = "";
let providerDirectoryFallbackActive = false;
let addressSuggestionMatches = [];
let activeAddressSuggestionIndex = -1;
let addressLookupController = null;
let addressResolveTimer = null;
let addressLookupToken = 0;
let wasIntakeComplete = false;
let pendingCarePathScroll = false;
let carePathScrollScheduled = false;
const providerBatchSize = 5;
const telehealthDistanceThresholdKm = 100;

const links = {
  healthNz: "https://www.healthnz.govt.nz/health-topics/mental-health/where-to-get-help",
  winz: "https://www.workandincome.govt.nz/eligibility/health-and-disability/counselling.html",
  accessChoice: "https://www.wellbeingsupport.health.nz/about-access-and-choice",
  healthpoint: "https://www.healthpoint.co.nz/mental-health-addictions/",
  canMen: "https://www.canmen.org.nz/",
  acc: "https://www.acc.co.nz/for-providers/provider-contracts-and-services/sensitive-claims-service"
};

const needLabels = {
  depression: "depression or low mood",
  anxiety: "anxiety, panic, or overwhelm",
  trauma: "trauma or sexual harm",
  addiction: "alcohol, drug, or gambling harm",
  work: "work, study, money, or housing stress"
};

const barrierLabels = {
  cost: "cost",
  wait: "long waits",
  transport: "transport",
  privacy: "privacy or shame",
  culture: "finding culturally safe support"
};

const preferenceLabels = {
  maori: "Maori provider or kaupapa Maori support",
  pasifika: "Pasifika provider or service",
  asian: "Asian provider or service",
  rainbow: "Rainbow / LGBTQIA+ affirming support",
  "trauma-informed": "trauma-informed support",
  telehealth: "phone or video appointments",
  "female-provider": "a female provider",
  "male-provider": "a male provider"
};

const regionAliases = {
  northland: "Northland",
  auckland: "Auckland",
  waikato: "Waikato",
  "bay of plenty": "Bay of Plenty",
  "rotorua and taupo": "Rotorua and Taupo",
  rotorua: "Rotorua and Taupo",
  taupo: "Rotorua and Taupo",
  gisborne: "Tairawhiti",
  tairawhiti: "Tairawhiti",
  "hawke's bay": "Hawke's Bay",
  hawkes: "Hawke's Bay",
  taranaki: "Taranaki",
  "manawatu-whanganui": "Manawatu-Whanganui",
  manawatu: "Manawatu-Whanganui",
  whanganui: "Manawatu-Whanganui",
  wairarapa: "Wairarapa",
  wellington: "Wellington",
  hutt: "Wellington",
  kapiti: "Wellington",
  tasman: "Nelson Marlborough Tasman",
  nelson: "Nelson Marlborough Tasman",
  marlborough: "Nelson Marlborough Tasman",
  "west coast": "West Coast",
  canterbury: "Canterbury",
  christchurch: "Canterbury",
  "south canterbury": "South Canterbury",
  timaru: "South Canterbury",
  otago: "Otago",
  dunedin: "Otago",
  southland: "Southland",
  invercargill: "Southland"
};

const regionCentres = [
  { region: "Northland", lat: -35.725, lon: 174.323 },
  { region: "Auckland", lat: -36.848, lon: 174.763 },
  { region: "Waikato", lat: -37.787, lon: 175.279 },
  { region: "Bay of Plenty", lat: -37.687, lon: 176.166 },
  { region: "Rotorua and Taupo", lat: -38.136, lon: 176.249 },
  { region: "Tairawhiti", lat: -38.662, lon: 178.018 },
  { region: "Hawke's Bay", lat: -39.492, lon: 176.912 },
  { region: "Taranaki", lat: -39.057, lon: 174.079 },
  { region: "Manawatu-Whanganui", lat: -40.353, lon: 175.608 },
  { region: "Wairarapa", lat: -40.951, lon: 175.658 },
  { region: "Wellington", lat: -41.286, lon: 174.776 },
  { region: "Nelson Marlborough Tasman", lat: -41.513, lon: 173.962 },
  { region: "West Coast", lat: -42.451, lon: 171.211 },
  { region: "Canterbury", lat: -43.532, lon: 172.636 },
  { region: "South Canterbury", lat: -44.397, lon: 171.255 },
  { region: "Otago", lat: -45.879, lon: 170.501 },
  { region: "Southland", lat: -46.413, lon: 168.353 }
];

const fallbackAddressPlaces = [
  { name: "Auckland Central", city: "Auckland", region: "Auckland", lat: -36.8485, lon: 174.7633 },
  { name: "Albany", city: "Auckland", region: "Auckland", lat: -36.7285, lon: 174.7013 },
  { name: "Henderson", city: "Auckland", region: "Auckland", lat: -36.8772, lon: 174.6302 },
  { name: "Manukau", city: "Auckland", region: "Auckland", lat: -36.9928, lon: 174.8793 },
  { name: "New Lynn", city: "Auckland", region: "Auckland", lat: -36.9089, lon: 174.6858 },
  { name: "Hamilton", city: "Hamilton", region: "Waikato", lat: -37.787, lon: 175.2793 },
  { name: "Tauranga", city: "Tauranga", region: "Bay of Plenty", lat: -37.6878, lon: 176.1651 },
  { name: "Rotorua", city: "Rotorua", region: "Rotorua and Taupo", lat: -38.1368, lon: 176.2497 },
  { name: "Taupo", city: "Taupo", region: "Rotorua and Taupo", lat: -38.6857, lon: 176.0702 },
  { name: "Gisborne", city: "Gisborne", region: "Tairawhiti", lat: -38.6623, lon: 178.0176 },
  { name: "Napier", city: "Napier", region: "Hawke's Bay", lat: -39.4928, lon: 176.912 },
  { name: "Hastings", city: "Hastings", region: "Hawke's Bay", lat: -39.6381, lon: 176.8492 },
  { name: "New Plymouth", city: "New Plymouth", region: "Taranaki", lat: -39.0556, lon: 174.0752 },
  { name: "Palmerston North", city: "Palmerston North", region: "Manawatu-Whanganui", lat: -40.3523, lon: 175.6082 },
  { name: "Whanganui", city: "Whanganui", region: "Manawatu-Whanganui", lat: -39.9301, lon: 175.0479 },
  { name: "Masterton", city: "Masterton", region: "Wairarapa", lat: -40.9511, lon: 175.6574 },
  { name: "Wellington Central", city: "Wellington", region: "Wellington", lat: -41.2865, lon: 174.7762 },
  { name: "Lower Hutt", city: "Lower Hutt", region: "Wellington", lat: -41.2125, lon: 174.9003 },
  { name: "Porirua", city: "Porirua", region: "Wellington", lat: -41.1243, lon: 174.8393 },
  { name: "Nelson", city: "Nelson", region: "Nelson Marlborough Tasman", lat: -41.2706, lon: 173.284 },
  { name: "Blenheim", city: "Blenheim", region: "Nelson Marlborough Tasman", lat: -41.5134, lon: 173.9612 },
  { name: "Greymouth", city: "Greymouth", region: "West Coast", lat: -42.4504, lon: 171.2108 },
  { name: "Christchurch Central", city: "Christchurch", region: "Canterbury", lat: -43.5321, lon: 172.6362 },
  { name: "Linwood", city: "Christchurch", region: "Canterbury", lat: -43.5329, lon: 172.6724 },
  { name: "Riccarton", city: "Christchurch", region: "Canterbury", lat: -43.5309, lon: 172.5986 },
  { name: "Papanui", city: "Christchurch", region: "Canterbury", lat: -43.4955, lon: 172.6076 },
  { name: "New Brighton", city: "Christchurch", region: "Canterbury", lat: -43.5067, lon: 172.7292 },
  { name: "Rangiora", city: "Rangiora", region: "Canterbury", lat: -43.3035, lon: 172.5957 },
  { name: "Rolleston", city: "Rolleston", region: "Canterbury", lat: -43.5962, lon: 172.3832 },
  { name: "Timaru", city: "Timaru", region: "South Canterbury", lat: -44.397, lon: 171.255 },
  { name: "Dunedin Central", city: "Dunedin", region: "Otago", lat: -45.8795, lon: 170.5006 },
  { name: "Queenstown", city: "Queenstown", region: "Otago", lat: -45.0312, lon: 168.6626 },
  { name: "Invercargill", city: "Invercargill", region: "Southland", lat: -46.4132, lon: 168.3538 }
];

const optInPreferenceTags = ["maori", "pasifika", "asian", "rainbow"];
const supportPreferenceTags = [...optInPreferenceTags, "trauma-informed"];
const providerGenderPreferenceTags = {
  "female-provider": "female",
  "male-provider": "male"
};
const matchablePreferenceTags = [
  ...supportPreferenceTags,
  ...Object.values(providerGenderPreferenceTags)
];

function checkedValues(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map((item) => item.value);
}

function intakeStatus() {
  const age = Number(document.querySelector("#age").value || 0);
  const address = addressInput.value.trim();
  const hasResolvedAddress = Boolean(matchedRegion || userCoords);
  const identity = document.querySelector("#identity").value;
  const needs = checkedValues("need");
  const preference = contactPreference.value;
  const missing = [];
  let completed = 0;

  if (age) completed += 1;
  else missing.push("age");
  if (address && hasResolvedAddress) completed += 1;
  else missing.push("street address or suburb");
  if (identity) completed += 1;
  else missing.push("gender");
  if (needs.length) completed += 1;
  else missing.push("what is happening");
  if (preference) completed += 1;
  else missing.push("who you want to talk to");

  return { complete: missing.length === 0, completed, total: 5, missing };
}

function renderProgress(status) {
  const percent = Math.round((status.completed / status.total) * 100);
  formProgressBar.style.width = `${percent}%`;
  formProgressText.textContent = status.complete
    ? "Guide questions complete"
    : `${status.completed} of ${status.total} guide questions complete`;
}

function sentenceList(items) {
  if (items.length === 0) return "general wellbeing support";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function labelledList(items, labels) {
  return sentenceList(items.map((item) => labels[item] || item));
}

function preferenceTagFor(preference) {
  return providerGenderPreferenceTags[preference] || preference;
}

function selectedSupportPreferences(preferences = checkedValues("preference")) {
  return preferences
    .map(preferenceTagFor)
    .filter((preference) => matchablePreferenceTags.includes(preference));
}

function supportPreferenceMatches(tags, preferences = checkedValues("preference")) {
  const selected = selectedSupportPreferences(preferences);
  return selected.filter((preference) => tags.includes(preference));
}

function hasProviderGenderConflict(tags, preferences = checkedValues("preference")) {
  const wantsFemale = preferences.includes("female-provider");
  const wantsMale = preferences.includes("male-provider");
  if (wantsFemale && wantsMale) return false;
  return (wantsFemale && tags.includes("male")) || (wantsMale && tags.includes("female"));
}

function addPath(paths, item) {
  if (!paths.some((path) => path.title === item.title)) paths.push(item);
}

function normalisePhone(phone) {
  return String(phone || "").replace(/[^\d+]/g, "");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeHref(value, { allowHash = false } = {}) {
  const href = String(value || "").trim();
  if (allowHash && /^#[\w-]+$/.test(href)) return href;
  if (/^https?:\/\//i.test(href)) return href;
  return "";
}

function profileText(provider) {
  return [
    provider.name,
    provider.type,
    provider.region,
    provider.city,
    provider.cost,
    provider.fit,
    provider.firstStep,
    ...(provider.tags || [])
  ].join(" ").toLowerCase();
}

function hasSpecialtyMatch(provider, need) {
  const text = profileText(provider);
  const terms = {
    depression: ["depression", "low mood", "mood"],
    anxiety: ["anxiety", "panic", "overwhelm", "obsessive-compulsive", "ocd"],
    trauma: ["trauma", "sexual harm", "sexual abuse", "sensitive claims", "emdr", "dissociative"],
    addiction: ["addiction", "alcohol", "drug", "gambling"],
    work: ["work", "stress", "study", "money", "housing", "burnout"]
  }[need] || [need];

  return terms.some((term) => text.includes(term));
}

function providerSpecialties(provider) {
  const fit = provider.fit || "";
  const match = fit.match(/specialt(?:y|ies) including\s+(.+?)(?:\.|$)/i);
  if (match) return match[1];

  const specialtyTags = (provider.tags || [])
    .filter((tag) => ![
      provider.type,
      "fit",
      "clinical-psychologist",
      "primary-care",
      "telehealth",
      "directory",
      "cost"
    ].includes(tag))
    .map((tag) => tag.replace(/-/g, " "));

  return specialtyTags.slice(0, 6).join(", ");
}

function isDirectoryLike(provider) {
  return provider.type === "directory" || provider.tags?.includes("directory");
}

function isDirectContact(provider) {
  return !isDirectoryLike(provider) && Boolean(provider.phone || provider.text || provider.email || provider.website);
}

function providerMatchesSelectedType(provider, type, directoryFallback = false) {
  const directory = isDirectoryLike(provider);
  const tags = provider.tags || [];

  if (type === "all") return true;
  if (type === "directory") return directory;

  if (directory) {
    if (!directoryFallback) return false;
    return tags.includes(type) || (type === "counsellor" && tags.includes("therapy"));
  }

  return provider.type === type
    || (type === "counsellor" && provider.type === "mens-centre")
    || (type === "addiction" && tags.includes("addiction"));
}

function selectedContactType() {
  const preference = contactPreference.value;
  if (preference === "therapist") return "counsellor";
  if (preference === "unsure") return "all";
  return preference;
}

function providerMatchesProfile(provider) {
  const location = matchedRegion || "";
  const identity = document.querySelector("#identity").value;
  const needs = checkedValues("need");
  const barriers = checkedValues("barrier");
  const preferences = checkedValues("preference");
  const tags = provider.tags || [];
  const distance = distanceToProvider(provider);
  const telehealth = isTelehealthProvider(provider);
  const wantsTelehealth = preferences.includes("telehealth");

  let score = 0;
  const preferenceType = selectedContactType();
  if (provider.region === "National") score += barriers.includes("transport") ? 2 : 0;
  if (provider.region === location) score += 5;
  if (distance !== null) {
    if (distance <= 5) score += telehealth ? 2 : 8;
    else if (distance <= 15) score += telehealth ? 1 : 6;
    else if (distance <= 40) score += telehealth ? 0 : 4;
    else if (distance <= 100) score += telehealth ? -1 : 1;
    else if (!telehealth) score -= 4;
  }
  if (preferenceType !== "all" && provider.type === preferenceType) score += 6;
  if (identity === "male" && tags.includes("male")) score += 2;
  if (identity === "female" && tags.includes("female")) score += 2;
  needs.forEach((need) => {
    if (tags.includes(need)) score += 4;
    if (hasSpecialtyMatch(provider, need)) score += provider.type === "psychologist" ? 6 : 3;
  });
  if (provider.type === "helpline" && tags.includes("addiction")) {
    if (tags.includes("alcohol") && tags.includes("drug")) score += 3;
    if (tags.includes("meth")) score -= 2;
  }
  barriers.forEach((barrier) => {
    if (tags.includes(barrier)) score += 1;
  });
  if (telehealth) {
    if (wantsTelehealth) score += 12;
    else score += barriers.includes("transport") ? -2 : -14;
  } else if (wantsTelehealth) {
    score -= 3;
  }
  const matchedSupportPreferences = supportPreferenceMatches(tags, preferences);
  if (selectedSupportPreferences(preferences).length) {
    score += matchedSupportPreferences.length * 12;
    if (!matchedSupportPreferences.length) score -= 4;
  }
  if (hasProviderGenderConflict(tags, preferences)) score -= 30;
  preferences.forEach((preference) => {
    const preferenceTag = preferenceTagFor(preference);
    if (!matchablePreferenceTags.includes(preferenceTag) && tags.includes(preferenceTag)) score += 2;
  });
  if (provider.email) score += 2;
  if (provider.phone || provider.text) score += 2;
  if (provider.website) score += 1;
  return score;
}

function providerSortValue(provider) {
  const needs = checkedValues("need");
  const specialtyMatches = needs.filter((need) => hasSpecialtyMatch(provider, need)).length;
  const directContacts = [provider.email, provider.phone, provider.text].filter(Boolean).length;
  const distance = distanceToProvider(provider);
  const tags = provider.tags || [];
  const wantsTelehealth = checkedValues("preference").includes("telehealth");
  const telehealth = isTelehealthProvider(provider);
  return {
    preferenceMatches: supportPreferenceMatches(tags).length,
    telehealthMatch: wantsTelehealth && telehealth ? 1 : 0,
    specialtyMatches,
    directContacts,
    isLocal: provider.region === (matchedRegion || "") ? 1 : 0,
    isTelehealth: telehealth ? 1 : 0,
    distance: distance === null ? Infinity : distance
  };
}

function compareProviders(a, b) {
  const aSort = providerSortValue(a);
  const bSort = providerSortValue(b);
  return b.score - a.score
    || bSort.preferenceMatches - aSort.preferenceMatches
    || bSort.telehealthMatch - aSort.telehealthMatch
    || bSort.specialtyMatches - aSort.specialtyMatches
    || bSort.isLocal - aSort.isLocal
    || aSort.isTelehealth - bSort.isTelehealth
    || aSort.distance - bSort.distance
    || bSort.directContacts - aSort.directContacts
    || a.name.localeCompare(b.name);
}

function filteredProviders() {
  const query = providerSearch.value.trim().toLowerCase();
  const type = providerType.value;
  const cost = providerCost.value;
  const location = matchedRegion || "";
  const preferences = checkedValues("preference");

  const matchesFor = ({ directoriesOnly = false, directoryFallback = false } = {}) => providers
    .map((provider) => ({ ...provider, score: providerMatchesProfile(provider) }))
    .filter((provider) => {
      const directory = isDirectoryLike(provider);
      const haystack = [
        provider.name,
        provider.type,
        provider.region,
        provider.city,
        provider.address,
        provider.cost,
        provider.fit,
        provider.firstStep,
        ...(provider.tags || [])
      ].join(" ").toLowerCase();

      const typeOk = providerMatchesSelectedType(provider, type, directoryFallback);
      const queryOk = !query || haystack.includes(query);
      const regionOk = provider.region === "National" || provider.region === location || Boolean(query);
      const optInTags = (provider.tags || []).filter((tag) => optInPreferenceTags.includes(tag));
      const preferenceOk = optInTags.length === 0 || optInTags.some((tag) => preferences.includes(tag));
      const genderOk = !hasProviderGenderConflict(provider.tags || [], preferences);
      const crisisOk = !provider.tags?.includes("crisis");
      const contactOk = directoriesOnly
        ? directory && Boolean(provider.website)
        : !directory && isDirectContact(provider);
      const costText = `${provider.cost} ${(provider.tags || []).join(" ")}`.toLowerCase();
      const costOk = cost === "any"
        || (cost === "free" && /free|public|funded/.test(costText))
        || (cost === "winz" && /winz|cost|funded|directory/.test(costText));

      return typeOk && queryOk && regionOk && preferenceOk && genderOk && crisisOk && contactOk && costOk;
    })
    .sort(compareProviders);

  providerDirectoryFallbackActive = false;

  if (type === "directory") return matchesFor({ directoriesOnly: true, directoryFallback: true });

  const directMatches = matchesFor();
  if (directMatches.length) return directMatches;

  const directoryMatches = matchesFor({ directoriesOnly: true, directoryFallback: true });
  providerDirectoryFallbackActive = directoryMatches.length > 0;
  return directoryMatches;
}

function recommendationCandidates(type = "all") {
  const location = matchedRegion || "";
  const preferences = checkedValues("preference");

  return providers
    .map((provider) => ({ ...provider, score: providerMatchesProfile(provider) }))
    .filter((provider) => {
      const typeOk = type === "all"
        || provider.type === type
        || (type === "counsellor" && provider.type === "mens-centre")
        || (type === "addiction" && provider.tags?.includes("addiction"));
      const regionOk = provider.region === "National" || provider.region === location;
      const optInTags = (provider.tags || []).filter((tag) => optInPreferenceTags.includes(tag));
      const preferenceOk = optInTags.length === 0 || optInTags.some((tag) => preferences.includes(tag));
      const genderOk = !hasProviderGenderConflict(provider.tags || [], preferences);
      const crisisOk = !provider.tags?.includes("crisis");
      const directOk = isDirectContact(provider);
      return typeOk && regionOk && preferenceOk && genderOk && crisisOk && directOk;
    })
    .sort(compareProviders);
}

function providerTypeLabel(type) {
  return {
    gp: "GP / medical practice",
    counsellor: "Counsellor",
    psychologist: "Psychologist",
    psychiatrist: "Psychiatrist",
    helpline: "Helpline",
    "mens-centre": "Men's centre",
    youth: "Youth",
    addiction: "Addiction",
    directory: "Navigator",
    "public-service": "Public service"
  }[type] || type;
}

function renderProviders() {
  if (!providers.length) {
    providerCount.textContent = "No providers loaded yet.";
    providerList.innerHTML = "";
    showMoreProviders.hidden = true;
    return;
  }

  const matches = filteredProviders();
  if (!matches.some((provider) => provider.id === selectedProviderId)) {
    selectedProviderId = matches[0]?.id || "";
  }
  if (contactProviderId && !matches.some((provider) => provider.id === contactProviderId)) {
    contactProviderId = "";
  }
  const visibleMatches = matches.slice(0, providerVisibleCount);
  providerCount.textContent = providerDirectoryFallbackActive
    ? `No direct contact options match these filters, so showing ${visibleMatches.length} of ${matches.length} directory options with websites.`
    : `Showing ${visibleMatches.length} of ${matches.length} contact options from the local database. Best matches are shown first.`;
  providerList.innerHTML = visibleMatches
    .map((provider) => {
      const isSelected = provider.id === selectedProviderId;
      const directory = isDirectoryLike(provider);
      const helpline = provider.type === "helpline";
      const specialty = providerSpecialties(provider);
      const distance = distanceToProvider(provider);
      const distanceLabel = providerDistanceLabel(provider, distance);
      const website = safeHref(provider.website);
      const providerId = escapeHtml(provider.id);
      const providerName = escapeHtml(provider.name);
      const providerType = escapeHtml(providerTypeLabel(provider.type));
      const providerRegion = escapeHtml(provider.region);
      const providerCity = escapeHtml(provider.city);
      const providerFit = escapeHtml(provider.fit);
      const providerFirstStep = escapeHtml(provider.firstStep);
      const providerCost = escapeHtml(provider.cost);
      const providerSpecialty = escapeHtml(specialty);
      const providerDistance = escapeHtml(distanceLabel);
      const contact = [
        !directory && provider.phone ? `Phone ${escapeHtml(provider.phone)}` : "",
        !directory && provider.text ? `Text ${escapeHtml(provider.text)}` : "",
        !directory && provider.email ? escapeHtml(provider.email) : "",
        directory && website ? "Website directory" : ""
      ].filter(Boolean).join(" | ");
      const primaryAction = directory
        ? website
          ? `<a class="button button--primary" href="${escapeHtml(website)}">Open directory</a>`
          : ""
        : helpline
          ? provider.phone
            ? `<a class="button button--primary" href="tel:${normalisePhone(provider.phone)}">Call</a>`
            : provider.text
              ? `<a class="button button--primary" href="sms:${normalisePhone(provider.text)}">Text</a>`
              : website
                ? `<a class="button button--primary" href="${escapeHtml(website)}">Website</a>`
                : ""
        : `<button class="button button--primary select-provider" type="button" data-provider-id="${providerId}">
              Use this contact
            </button>`;
      const secondaryActions = directory
        ? ""
        : helpline
          ? `
            ${provider.phone && provider.text ? `<a class="button button--quiet" href="sms:${normalisePhone(provider.text)}">Text</a>` : ""}
            ${website ? `<a class="button button--quiet" href="${escapeHtml(website)}">Website</a>` : ""}
          `
          : `
            ${provider.phone ? `<a class="button button--quiet" href="tel:${normalisePhone(provider.phone)}">Call</a>` : ""}
            ${provider.text ? `<a class="button button--quiet" href="sms:${normalisePhone(provider.text)}">Text</a>` : ""}
            ${website ? `<a class="button button--quiet" href="${escapeHtml(website)}">Website</a>` : ""}
          `;

      return `
        <article class="provider-card ${isSelected ? "selected" : ""}">
          <div>
            <p class="provider-meta">${providerType} | ${providerRegion}${provider.city ? ` | ${providerCity}` : ""}${distanceLabel ? ` | ${providerDistance}` : ""}</p>
            <h3>${providerName}</h3>
            <p>${providerFit}</p>
            ${specialty ? `<p class="provider-detail"><strong>Specialties:</strong> ${providerSpecialty}</p>` : ""}
            <p class="provider-detail"><strong>First step:</strong> ${providerFirstStep}</p>
            <p class="provider-detail"><strong>Cost:</strong> ${providerCost}</p>
            ${contact ? `<p class="provider-detail"><strong>Contact:</strong> ${contact}</p>` : ""}
          </div>
          <div class="provider-actions">
            ${primaryAction}
            ${secondaryActions}
          </div>
        </article>
      `;
    })
    .join("");

  if (!visibleMatches.length) {
    const typeLabel = providerType.options[providerType.selectedIndex]?.textContent?.toLowerCase() || "contacts";
    providerList.innerHTML = `
      <article class="provider-card provider-card--empty">
        <div>
          <h3>No direct ${typeLabel} loaded for this area yet</h3>
          <p>We do not have a direct contact that matches these filters yet. Try another contact type, a nearby suburb, or remove the search text.</p>
          <p class="provider-detail"><strong>Still useful:</strong> choose one of the suggested first steps above, or use 1737 if you need to talk to someone now.</p>
        </div>
      </article>
    `;
  }

  showMoreProviders.hidden = providerVisibleCount >= matches.length;
}

async function loadProviders() {
  try {
    const response = await fetch("providers.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Provider database failed to load");
    providers = await response.json();
    const firstMatch = filteredProviders()[0];
    if (firstMatch) selectedProviderId = firstMatch.id;
    contactProviderId = "";
    render();
  } catch {
    providerCount.textContent = "Could not load the local provider database.";
  }
}

function distanceKm(a, b) {
  const toRad = (value) => value * Math.PI / 180;
  const radius = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const haversine = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function providerCoords(provider) {
  const lat = Number(provider.lat ?? provider.latitude);
  const lon = Number(provider.lon ?? provider.lng ?? provider.longitude);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

function distanceToProvider(provider) {
  const coords = providerCoords(provider);
  return userCoords && coords ? distanceKm(userCoords, coords) : null;
}

function isTelehealthProvider(provider) {
  return provider.tags?.includes("telehealth") || provider.region === "National";
}

function providerDistanceLabel(provider, distance = distanceToProvider(provider)) {
  if (isTelehealthProvider(provider) && (distance === null || distance > telehealthDistanceThresholdKm)) return "Telehealth provider";
  if (distance === null) return "";
  return `${distance.toFixed(1)} km away`;
}

function nearestRegionFromCoords(lat, lon) {
  return regionCentres
    .map((centre) => ({ ...centre, distance: distanceKm({ lat, lon }, centre) }))
    .sort((a, b) => a.distance - b.distance)[0]?.region || "";
}

async function reverseGeocodeRegion(lat, lon) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1200);

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", lat);
    url.searchParams.set("lon", lon);
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("zoom", "10");
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { "Accept": "application/json" }
    });
    if (!response.ok) return "";
    const data = await response.json();
    const address = data.address || {};
    return [
      address.state,
      address.region,
      address.city,
      address.town,
      address.suburb
    ].filter(Boolean).map((value) => regionAliases[String(value).toLowerCase()] || value)[0] || "";
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

function inferRegionFromText(value) {
  const text = String(value || "").toLowerCase();
  const match = Object.entries(regionAliases)
    .find(([alias]) => new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text));
  return match?.[1] || "";
}

function regionFromAddressMatch(match) {
  const address = match?.address || {};
  const values = [
    address.state,
    address.region,
    address.county,
    address.city,
    address.town,
    address.village,
    address.suburb,
    match?.display_name
  ].filter(Boolean);

  for (const value of values) {
    const direct = regionAliases[String(value).toLowerCase()];
    if (direct) return direct;
    const inferred = inferRegionFromText(value);
    if (inferred) return inferred;
  }

  return "";
}

function addressSummary(match) {
  return String(match?.display_name || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 4)
    .join(", ");
}

function isNzAddressMatch(match) {
  const address = match?.address || {};
  return address.country_code === "nz" || /\bnew zealand\b/i.test(match?.display_name || "");
}

function addressSuggestionDetail(match) {
  const address = match?.address || {};
  return [
    address.suburb,
    address.city || address.town || address.village,
    address.state || address.region,
    "New Zealand"
  ].filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index)
    .join(", ");
}

function fallbackMatchFromPlace(place) {
  return {
    display_name: `${place.name}, ${place.city}, ${place.region}, New Zealand`,
    lat: place.lat,
    lon: place.lon,
    address: {
      country_code: "nz",
      suburb: place.name === place.city ? "" : place.name,
      city: place.city,
      state: place.region,
      country: "New Zealand"
    }
  };
}

function localAddressMatches(query, limit = 5) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const regionMatches = regionCentres.map((centre) => fallbackMatchFromPlace({
    name: centre.region,
    city: centre.region,
    region: centre.region,
    lat: centre.lat,
    lon: centre.lon
  }));
  const placeMatches = fallbackAddressPlaces.map(fallbackMatchFromPlace);

  return [...placeMatches, ...regionMatches]
    .filter((match) => {
      const text = `${match.display_name} ${Object.values(match.address || {}).join(" ")}`.toLowerCase();
      return terms.every((term) => text.includes(term));
    })
    .slice(0, limit);
}

async function fetchAddressMatches(query, limit = 5) {
  if (addressLookupController) addressLookupController.abort();
  const controller = new AbortController();
  addressLookupController = controller;
  let timedOut = false;
  let timeout;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("countrycodes", "nz");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("dedupe", "1");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("q", query);

  try {
    const lookup = fetch(url.toString(), {
      signal: controller.signal,
      headers: { "Accept": "application/json" }
    });
    const timeoutError = new Promise((_, reject) => {
      timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
        const error = new Error("Address lookup timed out");
        error.addressLookupTimedOut = true;
        reject(error);
      }, 1200);
    });
    lookup.catch(() => {});
    const response = await Promise.race([lookup, timeoutError]);
    if (!response.ok) throw new Error("Address lookup failed");
    const matches = await response.json();
    return matches.filter(isNzAddressMatch);
  } catch (error) {
    if (timedOut) error.addressLookupTimedOut = true;
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function renderAddressSuggestions(matches) {
  activeAddressSuggestionIndex = matches.length ? 0 : -1;
  addressInput.setAttribute("aria-expanded", matches.length ? "true" : "false");
  if (matches.length) {
    addressInput.setAttribute("aria-activedescendant", "address-suggestion-0");
  } else {
    addressInput.removeAttribute("aria-activedescendant");
  }
  addressSuggestions.hidden = !matches.length;
  addressSuggestions.innerHTML = matches
    .map((match, index) => {
      const summary = addressSummary(match);
      const detail = addressSuggestionDetail(match);
      const showDetail = detail && detail.toLowerCase() !== summary.toLowerCase();
      return `
        <button
          class="address-suggestion"
          id="address-suggestion-${index}"
          type="button"
          role="option"
          aria-selected="${index === activeAddressSuggestionIndex ? "true" : "false"}"
          data-address-index="${index}"
        >
          <span class="address-suggestion__title">${escapeHtml(summary)}</span>
          ${showDetail ? `<span class="address-suggestion__meta">${escapeHtml(detail)}</span>` : ""}
        </button>
      `;
    })
    .join("");
}

function setActiveAddressSuggestion(index) {
  if (!addressSuggestionMatches.length) return;
  activeAddressSuggestionIndex = (index + addressSuggestionMatches.length) % addressSuggestionMatches.length;
  addressInput.setAttribute("aria-activedescendant", `address-suggestion-${activeAddressSuggestionIndex}`);

  [...addressSuggestions.querySelectorAll(".address-suggestion")].forEach((button, buttonIndex) => {
    button.setAttribute("aria-selected", buttonIndex === activeAddressSuggestionIndex ? "true" : "false");
    if (buttonIndex === activeAddressSuggestionIndex) button.scrollIntoView({ block: "nearest" });
  });
}

function hideAddressSuggestions() {
  activeAddressSuggestionIndex = -1;
  addressSuggestions.hidden = true;
  addressSuggestions.innerHTML = "";
  addressInput.setAttribute("aria-expanded", "false");
  addressInput.removeAttribute("aria-activedescendant");
}

async function updateAddressSuggestions(query, token) {
  if (query.length < 3) {
    addressSuggestionMatches = [];
    hideAddressSuggestions();
    return;
  }

  try {
    let usedFallback = false;
    let matches = await fetchAddressMatches(query, 5);
    if (!matches.length) {
      matches = localAddressMatches(query, 5);
      usedFallback = matches.length > 0;
    }
    if (token !== addressLookupToken || addressInput.value.trim() !== query) return;
    addressSuggestionMatches = matches;
    renderAddressSuggestions(matches);
    if (matches.length) {
      addressStatus.textContent = usedFallback
        ? "Showing New Zealand place matches. Choose one, press Enter, or pause to use the best match."
        : "New Zealand matches found. Choose one, press Enter, or pause to use the best match.";
      clearTimeout(addressResolveTimer);
      addressResolveTimer = setTimeout(() => {
        if (addressInput.value.trim() === query && !matchedRegion) resolveAddressFromInput("pause");
      }, 2200);
    } else {
      addressStatus.textContent = "No New Zealand matches yet. Try a suburb, town, or fuller address.";
    }
  } catch (error) {
    if (error.name === "AbortError" && !error.addressLookupTimedOut) return;
    const matches = localAddressMatches(query, 5);
    if (token !== addressLookupToken || addressInput.value.trim() !== query) return;
    addressSuggestionMatches = matches;
    renderAddressSuggestions(matches);
    if (matches.length) {
      addressStatus.textContent = "Showing New Zealand place matches. Choose one, press Enter, or pause to use the best match.";
      clearTimeout(addressResolveTimer);
      addressResolveTimer = setTimeout(() => {
        if (addressInput.value.trim() === query && !matchedRegion) resolveAddressFromInput("pause");
      }, 2200);
    } else {
      addressStatus.textContent = "Address suggestions did not load. Keep typing a suburb, town, or city.";
    }
  }
}

async function applyAddressMatch(match, statusPrefix = "Using distance from") {
  const lat = Number(match.lat);
  const lon = Number(match.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error("Address match missing coordinates");

  userCoords = { lat, lon };
  const resolvedRegion = regionFromAddressMatch(match)
    || await reverseGeocodeRegion(lat, lon)
    || nearestRegionFromCoords(lat, lon);

  matchedRegion = resolvedRegion;
  addressInput.value = addressSummary(match);
  addressStatus.textContent = resolvedRegion
    ? `${statusPrefix} ${addressInput.value}.`
    : `Using distance from ${addressInput.value}.`;
  hideAddressSuggestions();
  render();
}

async function resolveAddressFromInput(reason = "pause") {
  const query = addressInput.value.trim();
  const token = ++addressLookupToken;
  clearTimeout(addressResolveTimer);

  if (query.length < 3) {
    userCoords = null;
    matchedRegion = "";
    addressSuggestionMatches = [];
    hideAddressSuggestions();
    addressStatus.textContent = "Start typing a New Zealand address or suburb.";
    render();
    return;
  }

  addressStatus.textContent = reason === "enter"
    ? "Finding the best New Zealand match..."
    : "Checking the best New Zealand match...";

  try {
    const exactMatch = addressSuggestionMatches.find((match) => addressSummary(match).toLowerCase() === query.toLowerCase());
    const localMatch = localAddressMatches(query, 1)[0];
    const match = exactMatch || addressSuggestionMatches[0] || localMatch || (await fetchAddressMatches(query, 1))[0];
    if (token !== addressLookupToken) return;
    if (!match) throw new Error("No address match");
    await applyAddressMatch(match, reason === "enter" ? "Using" : "Using distance from");
  } catch (error) {
    if (error.name === "AbortError") return;
    const fallbackRegion = inferRegionFromText(query);
    matchedRegion = fallbackRegion;
    userCoords = null;
    hideAddressSuggestions();
    addressStatus.textContent = fallbackRegion
      ? `Using ${fallbackRegion} for local matching. Add more address detail for distance.`
      : "Could not match that address yet. Try a suburb, town, or full street address in New Zealand.";
    render();
  }
}

function buildPaths() {
  const age = Number(document.querySelector("#age").value || 0);
  const location = matchedRegion || "your area";
  const identity = document.querySelector("#identity").value;
  const needs = checkedValues("need");
  const barriers = checkedValues("barrier");
  const preferences = checkedValues("preference");
  const paths = [];

  const needText = needs.length ? labelledList(needs, needLabels) : "general wellbeing support";
  const barrierText = barriers.length ? `Main barriers: ${labelledList(barriers, barrierLabels)}.` : "No major barriers selected.";
  const preferenceText = preferences.length ? ` Preferences: ${labelledList(preferences, preferenceLabels)}.` : "";
  profileLine.textContent = `${age || "Adult"} in ${location}: ${needText}. ${barrierText}${preferenceText}`;

  addPath(paths, {
    title: "Book a GP or nurse appointment",
    body: "Ask for a mental health plan, medication discussion if relevant, referral options, and whether the practice has free Access and Choice support such as a Health Improvement Practitioner, health coach, or community support worker.",
    action: "Read about Access and Choice",
    href: links.accessChoice
  });

  if (barriers.includes("cost")) {
    addPath(paths, {
      tone: "funding",
      title: "Ask about WINZ counselling funding",
      body: "If the condition is likely to last at least 6 months and counselling costs are ongoing, Work and Income may help through Disability Allowance. Ask whether the counsellor is a recognised provider and can complete the Disability Certificate - Counselling form.",
      action: "WINZ counselling help",
      href: links.winz
    });
  }

  if (needs.includes("trauma")) {
    addPath(paths, {
      tone: "funding",
      title: "Check ACC Sensitive Claims",
      body: "For distress connected to sexual abuse or assault, ACC Sensitive Claims can provide fully funded support, treatment, and assessment. A registered provider can help start the process.",
      action: "ACC Sensitive Claims",
      href: links.acc
    });
  }

  if (needs.includes("addiction")) {
    addPath(paths, {
      title: "Addiction and mental health support",
      body: "If alcohol, drugs, or gambling are part of the picture, start with a direct addiction service where one fits. If local options are thin, dedicated addiction helplines can talk now and help locate treatment.",
      action: "Show addiction contacts",
      href: "#providerList"
    });
  }

  const wantsFemaleProvider = preferences.includes("female-provider") && !preferences.includes("male-provider");
  if (identity === "male" && !wantsFemaleProvider && /canterbury/i.test(location)) {
    addPath(paths, {
      tone: "local",
      title: "Try Canterbury Men's Centre",
      body: "For men in Christchurch or Canterbury, this can be a lower-pressure front door for a free first assessment, counselling pathways, peer support, and practical navigation.",
      action: "Canterbury Men's Centre",
      href: links.canMen
    });
  } else if (identity === "male" && !wantsFemaleProvider) {
    addPath(paths, {
      tone: "local",
      title: "Look for a male-friendly first contact",
      body: "If talking to someone feels hard, choose a GP, 1737, a local counselling service, or a men's support option in your region. Ask directly whether they work often with men and whether the first contact can be low pressure.",
      action: "Search local services",
      href: links.healthpoint
    });
  }

  if (barriers.includes("wait")) {
    addPath(paths, {
      title: "Use bridge support while waiting",
      body: "Ask services about cancellation lists and short appointments. Use 1737 between appointments, and ask your GP for brief intervention or same-day wellbeing support.",
      action: "Health NZ help options",
      href: links.healthNz
    });
  }

  if (barriers.includes("transport")) {
    addPath(paths, {
      tone: "funding",
      title: "Reduce transport barriers",
      body: "Ask whether phone or video appointments are possible. If eligible, WINZ Disability Allowance can include transport costs for counselling.",
      action: "WINZ counselling help",
      href: links.winz
    });
  }

  if (barriers.includes("culture") || preferences.some((item) => ["maori", "pasifika", "asian", "rainbow", "trauma-informed"].includes(item))) {
    addPath(paths, {
      title: "Ask for a culturally safe fit",
      body: "You can ask for Maori, Pasifika, Asian, Rainbow, youth-friendly, trauma-informed, male, or female support. Fit matters, and changing provider is allowed.",
      action: "Find local services",
      href: links.healthpoint
    });
  }

  if (age > 0 && age < 25) {
    addPath(paths, {
      title: "Youth-friendly support may fit better",
      body: "For rangatahi and young adults, ask about Youthline, school or tertiary counselling, youth one-stop shops, and free digital tools such as Headstrong.",
      action: "Health NZ helplines",
      href: links.healthNz
    });
  }

  addPath(paths, {
    title: "Therapist, psychologist, or psychiatrist",
    body: "Counsellors and therapists are often the easiest talking-therapy route. Psychologists add specialist assessment and therapy. Psychiatrists are medical specialists for complex diagnosis, medication, high risk, or care that is not improving.",
    action: "Search Healthpoint",
    href: links.healthpoint
  });

  return paths;
}

function pathFilterOptions(paths) {
  const options = [
    { label: "All matches", type: "all" },
    { label: "GP or nurse", type: "gp" },
    { label: "Helpline now", type: "helpline" },
    { label: "Counsellor / therapist", type: "counsellor" },
    { label: "Psychologist", type: "psychologist" },
    { label: "Psychiatrist", type: "psychiatrist" },
    { label: "Public mental health", type: "public-service" }
  ];

  if (paths.some((path) => path.title.includes("ACC") || path.title.includes("trauma"))) {
    options.push({ label: "Trauma support", search: "trauma" });
  }

  if (paths.some((path) => path.title.includes("Addiction"))) {
    options.push({ label: "Addiction support", type: "addiction" });
  }

  if (paths.some((path) => path.title.includes("Youth"))) {
    options.push({ label: "Youth support", type: "youth" });
  }

  return options;
}

function providerHeading(provider) {
  if (provider.type === "gp") return "Start with a GP or nurse";
  if (provider.type === "helpline" && provider.tags?.includes("addiction")) return "Use an addiction helpline";
  if (provider.type === "helpline") return "Talk to someone now";
  if (provider.type === "counsellor") return "Ask a counsellor or therapist";
  if (provider.type === "psychologist") return "Look for a psychologist";
  if (provider.type === "mens-centre") return "Use lower-pressure counselling support";
  if (provider.type === "public-service") return "Ask a funded public service";
  if (provider.type === "addiction") return "Use addiction and mental health support";
  if (provider.type === "youth") return "Use youth-friendly support";
  return "Use a service navigator";
}

function reasonForProvider(provider) {
  const age = Number(document.querySelector("#age").value || 0);
  const needs = checkedValues("need");
  const barriers = checkedValues("barrier");
  const preferences = checkedValues("preference");
  const reasons = [];
  const tags = provider.tags || [];
  const specialty = providerSpecialties(provider);
  const matchedNeeds = needs.filter((need) => hasSpecialtyMatch(provider, need));
  const distance = distanceToProvider(provider);
  const distanceLabel = providerDistanceLabel(provider, distance);

  if (distanceLabel === "Telehealth provider") {
    reasons.push(preferences.includes("telehealth")
      ? "This matches your preference for phone or video appointments."
      : "Telehealth provider.");
  } else if (distanceLabel) {
    reasons.push(`This option is about ${distanceLabel.replace(" away", "")} from the address or suburb you entered.`);
  }

  if (provider.type === "gp") {
    reasons.push("A GP or nurse can turn this into a medical plan, referrals, medication options if wanted, and funded primary mental health support.");
    if (barriers.includes("cost")) reasons.push("Because cost is a barrier, ask about free Access and Choice support, Community Services Card fees, and WINZ paperwork.");
    if (barriers.includes("wait")) reasons.push("GP teams can sometimes offer brief same-week support while you wait for counselling.");
  }

  if (provider.type === "helpline") {
    reasons.push("This is useful when booking feels like too much: no enrolment, no diagnosis, and you can call or text first.");
    if (needs.includes("addiction") && tags.includes("addiction")) reasons.push("This is addiction-specific, so you do not have to frame alcohol, drug, or gambling harm as a general mental health issue.");
    if (needs.includes("anxiety")) reasons.push("For anxiety or overwhelm, a helpline can help you slow the next step down into one manageable action.");
    if (barriers.includes("privacy")) reasons.push("Text or phone support can feel more private than walking into a clinic.");
  }

  if (provider.type === "counsellor" || provider.type === "psychologist") {
    reasons.push("Talking therapy is a direct fit for depression, anxiety, trauma, stress, and patterns that are hard to shift alone.");
    if (specialty) reasons.push(`Their listed focus includes ${specialty}.`);
    if (matchedNeeds.length) reasons.push(`That directly matches ${labelledList(matchedNeeds, needLabels)} from your answers.`);
    if (barriers.includes("cost")) reasons.push("Ask before booking about WINZ Disability Allowance, ACC, EAP, funded places, or reduced-fee sessions.");
    if (preferences.length) reasons.push("Your preferences can be named in the first message so you do not have to explain them on the spot.");
  }

  if (provider.type === "psychiatrist") {
    reasons.push("A psychiatrist is a medical specialist, which can fit medication complexity, diagnosis questions, high risk, or care that has not improved.");
    if (specialty) reasons.push(`Their listed focus includes ${specialty}.`);
    if (matchedNeeds.length) reasons.push(`That directly matches ${labelledList(matchedNeeds, needLabels)} from your answers.`);
  }

  if (provider.type === "mens-centre" || provider.type === "helpline" || barriers.includes("privacy")) {
    reasons.push("This may feel less exposing if talking about mental health directly is hard, and it can still connect you into proper care.");
  }

  if (provider.type === "public-service") {
    reasons.push("Public services can be a better fit when you need funded support, navigation, or help coordinating several problems at once.");
  }

  if (provider.type === "addiction") {
    reasons.push("Addiction services are built for alcohol, drug, gambling, and mental health overlap, so you do not need to separate the issues first.");
  }

  if (provider.type === "youth" || (age > 0 && age < 25)) {
    reasons.push("Youth-friendly services can be easier to approach and are used to helping young adults start care.");
  }

  if (preferences.includes("maori") && tags.includes("maori")) reasons.push("This matches your preference for Maori or kaupapa Maori support.");
  if (preferences.includes("pasifika") && tags.includes("pasifika")) reasons.push("This matches your preference for Pasifika support.");
  if (preferences.includes("asian") && tags.includes("asian")) reasons.push("This matches your preference for Asian support.");
  if (preferences.includes("rainbow") && tags.includes("rainbow")) reasons.push("This matches your preference for Rainbow-affirming support.");
  if (preferences.includes("trauma-informed") && tags.includes("trauma-informed")) reasons.push("This matches your preference for trauma-informed support.");
  if (preferences.includes("telehealth") && isTelehealthProvider(provider) && distanceLabel !== "Telehealth provider") reasons.push("This matches your preference for phone or video appointments.");
  if (preferences.includes("female-provider") && tags.includes("female")) reasons.push("This matches your preference for a female provider.");
  if (preferences.includes("male-provider") && tags.includes("male")) reasons.push("This matches your preference for a male provider.");

  if (!reasons.length) {
    reasons.push("This option is available for your selected area and gives you a clear next contact step.");
  }

  return reasons.slice(0, 4);
}

function similarActionLabel(provider) {
  if (provider.type === "gp") return "Show similar GP options";
  if (provider.type === "helpline") return "Show similar helplines";
  if (provider.type === "psychologist") return "Show similar psychologists";
  if (provider.type === "counsellor") return "Show similar counsellors";
  if (provider.type === "mens-centre") return "Show similar counselling support";
  return "Show similar contacts";
}

function addRecommendation(recommendations, provider, title) {
  if (!provider || recommendations.some((item) => item.provider.id === provider.id)) return;

  recommendations.push({
    provider,
    title: title || providerHeading(provider),
    similarAction: similarActionLabel(provider),
    reasons: reasonForProvider(provider)
  });
}

function exactPreferenceType() {
  const preference = selectedContactType();
  return ["gp", "psychologist", "psychiatrist"].includes(preference) ? preference : "";
}

function recommendedMoves() {
  const matches = recommendationCandidates();
  const preference = selectedContactType();
  const needs = checkedValues("need");
  const barriers = checkedValues("barrier");
  const preferences = checkedValues("preference");
  const identity = document.querySelector("#identity").value;
  const recommendations = [];
  const best = (predicate) => matches.find(predicate);
  const preferredMatches = preference === "all" ? [] : recommendationCandidates(preference);
  const exactType = exactPreferenceType();

  preferredMatches.slice(0, 3).forEach((provider, index) => {
    addRecommendation(
      recommendations,
      provider,
      index === 0 ? "Your selected first step" : "Another good option"
    );
  });

  if (exactType) return recommendations.slice(0, 3);

  if (recommendations.length >= 3) return recommendations.slice(0, 3);

  addRecommendation(recommendations, best((provider) => provider.type === "gp"), "Start with a GP or nurse");

  if (contactPreference.value !== "unsure" && (needs.includes("anxiety") || needs.includes("depression") || barriers.includes("privacy"))) {
    addRecommendation(recommendations, best((provider) => provider.type === "helpline"), "Talk to someone before booking");
  }

  if (identity === "male" && contactPreference.value === "therapist") {
    addRecommendation(recommendations, best((provider) => provider.type === "mens-centre" || provider.tags?.includes("male")), "Use lower-pressure counselling support");
  }

  if (preferences.length || barriers.includes("culture")) {
    addRecommendation(
      recommendations,
      best((provider) => (provider.tags || []).some((tag) => preferences.includes(tag))),
      "Prioritise a safer fit"
    );
  }

  if (needs.includes("trauma")) {
    addRecommendation(recommendations, best((provider) => provider.tags?.includes("trauma")), "Use trauma-informed support");
  }

  if (needs.includes("addiction")) {
    addRecommendation(recommendations, best((provider) => provider.type === "addiction" || provider.tags?.includes("addiction")), "Use addiction-aware support");
  }

  if (barriers.includes("cost") || barriers.includes("wait")) {
    addRecommendation(recommendations, best((provider) => provider.type === "public-service" || provider.tags?.includes("cost")), "Look for funded or low-cost support");
  }

  addRecommendation(recommendations, best((provider) => provider.type === "counsellor"), "Ask a counsellor or therapist");
  addRecommendation(recommendations, best((provider) => provider.type === "psychologist"), "Look for a psychologist");
  addRecommendation(recommendations, matches[0], "Best overall match");

  return recommendations.slice(0, 3);
}

function contactTarget() {
  const provider = providers.find((item) => item.id === contactProviderId);
  if (provider) {
    const directory = isDirectoryLike(provider);
    return {
      label: provider.name,
      email: directory ? "" : provider.email || "",
      phone: directory ? "" : provider.phone || "",
      text: directory ? "" : provider.text || "",
      website: safeHref(provider.website),
      isDirectory: directory,
      subject: `Support request for ${provider.name}`,
      greeting: provider.name.includes("1737") ? "Kia ora" : `Kia ora ${provider.name}`
    };
  }

  const preference = contactPreference.value;

  if (preference === "helpline") {
    return {
      label: "1737",
      email: "",
      phone: "1737",
      text: "1737",
      website: "",
      isDirectory: false,
      subject: "I need mental health support",
      greeting: "Kia ora"
    };
  }

  if (preference === "therapist") {
    return {
      label: "a counsellor or therapist",
      email: "",
      phone: "",
      text: "",
      website: "",
      isDirectory: false,
      subject: "Counselling enquiry",
      greeting: "Kia ora"
    };
  }

  if (preference === "psychologist") {
    return {
      label: "a psychologist",
      email: "",
      phone: "",
      text: "",
      website: "",
      isDirectory: false,
      subject: "Psychology appointment enquiry",
      greeting: "Kia ora"
    };
  }

  if (preference === "psychiatrist") {
    return {
      label: "a psychiatrist",
      email: "",
      phone: "",
      text: "",
      website: "",
      isDirectory: false,
      subject: "Psychiatry appointment enquiry",
      greeting: "Kia ora"
    };
  }

  if (preference === "unsure") {
    return {
      label: "a care provider",
      email: "",
      phone: "",
      text: "",
      website: "",
      isDirectory: false,
      subject: "Mental health support enquiry",
      greeting: "Kia ora"
    };
  }

  return {
    label: "my GP clinic",
    email: "",
    phone: "",
    text: "",
    website: "",
    isDirectory: false,
    subject: "Mental health appointment request",
    greeting: "Kia ora"
  };
}

function askLine() {
  const ask = contactAsk.value;
  if (ask === "callback") return "Could someone please call me back about the next step?";
  if (ask === "cost") return "Could you please confirm your fees and any WINZ, ACC, EAP, funded, or low-cost options?";
  if (ask === "fit") return "Could you please let me know whether your service is a good fit, or suggest another option if not?";
  if (ask === "judgement") return "Could we start with a gentle, non-judgemental first step?";
  return "Could I please book an appointment, or be told the soonest available option?";
}

function messageContextLine(age, location, needs) {
  const ageText = age ? `I am ${age}` : "I am an adult";
  return `${ageText} and based in ${location}. I am looking for support with ${labelledList(needs, needLabels)}.`;
}

function buildContactMessage() {
  const age = Number(document.querySelector("#age").value || 0);
  const location = matchedRegion || "my area";
  const needs = checkedValues("need");
  const barriers = checkedValues("barrier");
  const preferences = checkedValues("preference");
  const target = contactTarget();
  const comfort = contactComfort.value;
  const name = contactName.value.trim();
  const reply = contactReply.value.trim();
  const lines = [
    target.greeting,
    "",
    messageContextLine(age, location, needs),
    askLine()
  ];

  if (barriers.length && comfort !== "minimal") {
    lines.push(`The main things making care harder are ${labelledList(barriers, barrierLabels)}.`);
  }

  if (preferences.length) {
    lines.push(`If possible, I would prefer ${labelledList(preferences, preferenceLabels)}.`);
  }

  if (comfort === "open") {
    lines.push("A clear first step would help.");
  } else if (comfort === "minimal") {
    lines.push("A simple next step would help.");
  }

  if (reply) lines.push(`My preferred contact is ${reply}.`);
  if (barriers.includes("cost")) {
    lines.push("Cost is a concern, so I would appreciate any funding information, including whether WINZ Disability Allowance may apply.");
  }
  if (barriers.includes("privacy")) {
    lines.push("Privacy matters to me, so please let me know what information is needed at this stage.");
  }

  lines.push("", "Thank you.");
  if (name) lines.push(name);

  return lines.join("\n");
}

function contactAvailabilityNote(target, provider) {
  if (!provider) {
    return "Choose a specific provider to show only the contact buttons we have confirmed for them.";
  }

  if (target.isDirectory) {
    return "This is a directory or navigator, not a direct provider. Email and call buttons are hidden; open the website and choose a specific service.";
  }

  const missing = [];
  if (!target.email) missing.push("an email address");
  if (!target.phone && !target.text) missing.push("a phone or text number");
  if (!missing.length) return "";

  const fallback = target.website
    ? " You can copy the message and use their website or contact form."
    : " Choose another provider if you need that contact method.";
  return `This provider does not publish ${sentenceList(missing)} in our database.${fallback}`;
}

function setContactAction(element, href, label) {
  if (!href) {
    element.hidden = true;
    element.textContent = "";
    element.removeAttribute("href");
    element.removeAttribute("target");
    element.removeAttribute("rel");
    return;
  }

  element.hidden = false;
  element.href = href;
  element.textContent = label;

  if (/^https?:\/\//i.test(href)) {
    element.target = "_blank";
    element.rel = "noopener noreferrer";
  } else {
    element.removeAttribute("target");
    element.removeAttribute("rel");
  }
}

function contactMailtoHref(target, message) {
  if (!target.email) return "";

  const subject = encodeURIComponent(target.subject || "Mental health support enquiry");
  const body = encodeURIComponent(message || "");
  return `mailto:${target.email}?subject=${subject}&body=${body}`;
}

function updateContactActions(target, message) {
  setContactAction(emailMessage, contactMailtoHref(target, message), `Email ${target.label}`);
  setContactAction(callTarget, target.phone ? `tel:${normalisePhone(target.phone)}` : "", `Call ${target.label}`);
  setContactAction(textTarget, target.text ? `sms:${normalisePhone(target.text)}` : "", `Text ${target.label}`);
  setContactAction(websiteTarget, target.website || "", `Open ${target.label} website`);
}

function renderContact() {
  const location = matchedRegion || "";
  if (canterburyOnlyContact) {
    canterburyOnlyContact.hidden = !/canterbury/i.test(location);
  }

  if (!intakeStatus().complete) {
    contactMessage.value = "";
    selectedProvider.textContent = "Complete the guide questions first, then we will build a first message.";
    setContactAction(emailMessage, "", "");
    setContactAction(callTarget, "tel:1737", "Call 1737");
    setContactAction(textTarget, "", "");
    setContactAction(websiteTarget, "", "");
    contactAvailability.textContent = "";
    return;
  }

  const target = contactTarget();
  const message = buildContactMessage();
  contactMessage.value = message;
  updateContactActions(target, message);

  const provider = providers.find((item) => item.id === contactProviderId);
  selectedProvider.textContent = provider
    ? target.isDirectory
      ? `${provider.name} is a directory or navigator. Use the website to choose a specific provider; this tool will not email or call it as if it were a provider.`
      : `Using ${provider.name}. You can still edit the message before sending.`
    : "Choose a provider above, or use the message with any service you find.";
  contactAvailability.textContent = contactAvailabilityNote(target, provider);
}

function scrollToSuggestedFirstStep() {
  if (carePathScrollScheduled) return;
  carePathScrollScheduled = true;

  requestAnimationFrame(() => {
    const target = resultList.querySelector(".recommendation-card--primary")
      || resultList.querySelector(".intake-gate")
      || document.querySelector(".results");
    pendingCarePathScroll = false;
    carePathScrollScheduled = false;
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function render() {
  const status = intakeStatus();
  const becameComplete = status.complete && !wasIntakeComplete;
  wasIntakeComplete = status.complete;
  if (becameComplete) pendingCarePathScroll = true;
  renderProgress(status);
  providerFinder.hidden = !status.complete;
  contactLayout.hidden = !status.complete;

  if (!status.complete) {
    pendingCarePathScroll = false;
    profileLine.textContent = "Answer the guide questions to unlock a care path.";
    resultList.innerHTML = `
      <article class="intake-gate">
        <h3>We will show your care path after these are filled in.</h3>
        <p>Needed: ${sentenceList(status.missing)}.</p>
        <p>Nothing needs to be perfect. A rough answer is enough to suggest safer first-contact options.</p>
      </article>
    `;
    renderContact();
    return;
  }

  if (!providers.length) {
    profileLine.textContent = "Loading care options...";
    resultList.innerHTML = `
      <article class="intake-gate">
        <h3>Finding care options for your answers.</h3>
        <p>This should only take a moment.</p>
      </article>
    `;
    return;
  }

  const paths = buildPaths();
  const moves = recommendedMoves();
  const exactType = exactPreferenceType();
  if (exactType) {
    const selected = providers.find((provider) => provider.id === selectedProviderId);
    if (!selected || selected.type !== exactType) {
      selectedProviderId = recommendationCandidates(exactType)[0]?.id || "";
      contactProviderId = "";
    }
  }
  const filterOptions = pathFilterOptions(paths)
    .map(
      (option) => `
        <button class="path-filter" type="button" data-provider-type="${escapeHtml(option.type || "")}" data-provider-search="${escapeHtml(option.search || "")}">
          ${escapeHtml(option.label)}
        </button>
      `
    )
    .join("");

  resultList.innerHTML = `
    ${moves.length ? `
      <div class="recommendation-grid" aria-label="Recommended first contact options">
        ${moves.map((move, index) => `
        <article class="recommendation-card ${index === 0 ? "recommendation-card--primary" : ""}">
          <div class="recommendation-rank">${index + 1}</div>
          <div>
            <p class="recommendation-kicker">${escapeHtml(move.title)}</p>
            <h3>${escapeHtml(move.provider.name)}</h3>
            <p>${escapeHtml(move.provider.firstStep)}</p>
            <ul>
              ${move.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}
            </ul>
            <div class="recommendation-actions">
              <button class="button button--primary use-path" type="button" data-provider-id="${escapeHtml(move.provider.id)}">
                Use this path
              </button>
              <button class="button button--quiet path-filter" type="button" data-provider-type="${escapeHtml(move.provider.type)}" data-provider-search="">
                ${escapeHtml(move.similarAction)}
              </button>
            </div>
          </div>
        </article>
        `).join("")}
      </div>
    ` : `
      <article class="intake-gate">
        <h3>No direct ${providerTypeLabel(exactType || "provider").toLowerCase()} contacts loaded for this area yet.</h3>
        <p>This tool will not substitute unrelated services when you choose a specific professional type. Try a nearby suburb, choose another contact type, or add verified provider data to the local database.</p>
      </article>
    `}
    <div class="path-filter-row" aria-label="Tune contact matches">
      ${filterOptions}
    </div>
    <details class="path-details">
      <summary>Why these paths?</summary>
      ${paths.map((path) => `
        <article class="path-card ${escapeHtml(path.tone || "")}">
          <h3>${escapeHtml(path.title)}</h3>
          <p>${escapeHtml(path.body)}</p>
          ${safeHref(path.href, { allowHash: true }) ? `<a href="${escapeHtml(safeHref(path.href, { allowHash: true }))}">${escapeHtml(path.action)}</a>` : ""}
        </article>
      `).join("")}
    </details>
  `;
  renderProviders();
  renderContact();
  if (pendingCarePathScroll) {
    scrollToSuggestedFirstStep();
  }
}

form.addEventListener("submit", (event) => event.preventDefault());
form.addEventListener("input", render);

function chooseProviderForContact(providerId) {
  selectedProviderId = providerId;
  const provider = providers.find((item) => item.id === selectedProviderId);
  if (provider) {
    contactProviderId = isDirectoryLike(provider) ? "" : provider.id;
    providerType.value = provider.type;
    providerSearch.value = "";
    providerVisibleCount = providerBatchSize;
  } else {
    contactProviderId = "";
  }
  renderProviders();
  renderContact();
  document.querySelector(".contact-layout").scrollIntoView({ behavior: "smooth", block: "start" });
}

resultList.addEventListener("click", (event) => {
  const usePath = event.target.closest(".use-path");
  if (usePath) {
    chooseProviderForContact(usePath.dataset.providerId);
    return;
  }

  const button = event.target.closest(".path-filter");
  if (!button) return;
  providerType.value = button.dataset.providerType || "all";
  providerSearch.value = button.dataset.providerSearch || "";
  contactProviderId = "";
  providerVisibleCount = providerBatchSize;
  renderProviders();
  renderContact();
  document.querySelector(".provider-finder").scrollIntoView({ behavior: "smooth", block: "start" });
});
contactName.addEventListener("input", renderContact);
contactReply.addEventListener("input", renderContact);
contactAsk.addEventListener("input", renderContact);
contactComfort.addEventListener("input", renderContact);
contactMessage.addEventListener("input", () => {
  if (!intakeStatus().complete) return;
  updateContactActions(contactTarget(), contactMessage.value);
});
contactPreference.addEventListener("input", () => {
  const preference = selectedContactType();
  const firstMatch = recommendationCandidates(preference)[0] || (exactPreferenceType() ? null : filteredProviders()[0]);
  if (firstMatch) selectedProviderId = firstMatch.id;
  else selectedProviderId = "";
  contactProviderId = "";
  render();
});
addressInput.addEventListener("input", () => {
  const query = addressInput.value.trim();
  const token = ++addressLookupToken;

  userCoords = null;
  matchedRegion = "";
  clearTimeout(addressResolveTimer);

  if (query.length < 3) {
    addressSuggestionMatches = [];
    hideAddressSuggestions();
    addressStatus.textContent = "Start typing a New Zealand address or suburb.";
    render();
    return;
  }

  addressStatus.textContent = "Looking for New Zealand address matches...";
  updateAddressSuggestions(query, token);
  render();
});
addressInput.addEventListener("keydown", async (event) => {
  if (event.key === "ArrowDown" && addressSuggestionMatches.length) {
    event.preventDefault();
    setActiveAddressSuggestion(activeAddressSuggestionIndex + 1);
    return;
  }

  if (event.key === "ArrowUp" && addressSuggestionMatches.length) {
    event.preventDefault();
    setActiveAddressSuggestion(activeAddressSuggestionIndex - 1);
    return;
  }

  if (event.key === "Escape") {
    hideAddressSuggestions();
    return;
  }

  if (event.key !== "Enter") return;
  event.preventDefault();

  const activeMatch = addressSuggestionMatches[activeAddressSuggestionIndex];
  if (activeMatch) {
    await applyAddressMatch(activeMatch, "Using");
    return;
  }

  await resolveAddressFromInput("enter");
});
addressInput.addEventListener("change", () => {
  if (addressInput.value.trim()) resolveAddressFromInput("change");
});
addressInput.addEventListener("blur", () => {
  setTimeout(() => {
    if (addressInput.value.trim() && !matchedRegion) resolveAddressFromInput("pause");
    else hideAddressSuggestions();
  }, 120);
});
addressSuggestions.addEventListener("mousedown", (event) => {
  if (event.target.closest(".address-suggestion")) event.preventDefault();
});
addressSuggestions.addEventListener("click", async (event) => {
  const button = event.target.closest(".address-suggestion");
  if (!button) return;
  const match = addressSuggestionMatches[Number(button.dataset.addressIndex)];
  if (match) await applyAddressMatch(match, "Using");
});
function resetProviderList() {
  providerVisibleCount = providerBatchSize;
  contactProviderId = "";
  renderProviders();
  renderContact();
}

providerSearch.addEventListener("input", resetProviderList);
providerType.addEventListener("input", resetProviderList);
providerCost.addEventListener("input", resetProviderList);
showMoreProviders.addEventListener("click", () => {
  providerVisibleCount += providerBatchSize;
  renderProviders();
});
providerList.addEventListener("click", (event) => {
  const button = event.target.closest(".select-provider");
  if (!button) return;
  chooseProviderForContact(button.dataset.providerId);
});
copyMessage.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(contactMessage.value);
    copyStatus.textContent = "Message copied.";
  } catch {
    contactMessage.select();
    document.execCommand("copy");
    copyStatus.textContent = "Message selected and copied.";
  }
});
render();
loadProviders();
