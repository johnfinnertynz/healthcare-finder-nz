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
const useGpsLocation = document.querySelector("#useGpsLocation");
const locationStatus = document.querySelector("#locationStatus");
const providerSearch = document.querySelector("#providerSearch");
const providerType = document.querySelector("#providerType");
const providerCost = document.querySelector("#providerCost");
const providerCount = document.querySelector("#providerCount");
const providerList = document.querySelector("#providerList");
const showMoreProviders = document.querySelector("#showMoreProviders");
const selectedProvider = document.querySelector("#selectedProvider");
const providerFinder = document.querySelector(".provider-finder");
const contactLayout = document.querySelector(".contact-layout");

let providers = [];
let selectedProviderId = "";
let providerVisibleCount = 5;
const providerBatchSize = 5;

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

const optInPreferenceTags = ["maori", "pasifika", "asian", "rainbow"];

function checkedValues(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map((item) => item.value);
}

function intakeStatus() {
  const age = Number(document.querySelector("#age").value || 0);
  const location = document.querySelector("#location").value;
  const identity = document.querySelector("#identity").value;
  const needs = checkedValues("need");
  const preference = contactPreference.value;
  const missing = [];

  if (!age) missing.push("age");
  if (!location) missing.push("location");
  if (!identity) missing.push("gender");
  if (!needs.length) missing.push("what is happening");
  if (!preference) missing.push("who you want to talk to");

  return { complete: missing.length === 0, missing };
}

function sentenceList(items) {
  if (items.length === 0) return "general wellbeing support";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function labelledList(items, labels) {
  return sentenceList(items.map((item) => labels[item] || item));
}

function addPath(paths, item) {
  if (!paths.some((path) => path.title === item.title)) paths.push(item);
}

function normalisePhone(phone) {
  return String(phone || "").replace(/[^\d+]/g, "");
}

function providerMatchesProfile(provider) {
  const location = document.querySelector("#location").value || "";
  const identity = document.querySelector("#identity").value;
  const needs = checkedValues("need");
  const barriers = checkedValues("barrier");
  const preferences = checkedValues("preference");
  const tags = provider.tags || [];

  let score = 0;
  const preferenceType = contactPreference.value === "therapist" ? "counsellor" : contactPreference.value;
  if (provider.region === "National") score += 2;
  if (provider.region === location) score += 5;
  if (provider.type === preferenceType) score += 4;
  if (identity === "male" && tags.includes("male")) score += 2;
  if (identity === "female" && tags.includes("female")) score += 2;
  needs.forEach((need) => {
    if (tags.includes(need)) score += 2;
  });
  barriers.forEach((barrier) => {
    if (tags.includes(barrier)) score += 1;
  });
  if (tags.includes("telehealth")) {
    score += barriers.includes("transport") ? 4 : -3;
  }
  preferences.forEach((preference) => {
    if (tags.includes(preference)) score += 2;
    if (preference === "female-provider" && tags.includes("female")) score += 2;
    if (preference === "male-provider" && tags.includes("male")) score += 2;
  });
  if (provider.phone || provider.email || provider.text) score += 1;
  return score;
}

function filteredProviders() {
  const query = providerSearch.value.trim().toLowerCase();
  const type = providerType.value;
  const cost = providerCost.value;
  const location = document.querySelector("#location").value || "";
  const preferences = checkedValues("preference");

  return providers
    .map((provider) => ({ ...provider, score: providerMatchesProfile(provider) }))
    .filter((provider) => {
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

      const typeOk = type === "all" || provider.type === type;
      const queryOk = !query || haystack.includes(query);
      const regionOk = provider.region === "National" || provider.region === location || Boolean(query);
      const optInTags = (provider.tags || []).filter((tag) => optInPreferenceTags.includes(tag));
      const preferenceOk = Boolean(query) || optInTags.length === 0 || optInTags.some((tag) => preferences.includes(tag));
      const crisisOk = Boolean(query) || !provider.tags?.includes("crisis");
      const costText = `${provider.cost} ${(provider.tags || []).join(" ")}`.toLowerCase();
      const costOk = cost === "any"
        || (cost === "free" && /free|public|funded/.test(costText))
        || (cost === "winz" && /winz|cost|funded|directory/.test(costText));

      return typeOk && queryOk && regionOk && preferenceOk && crisisOk && costOk;
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

function recommendationCandidates(type = "all") {
  const location = document.querySelector("#location").value || "";
  const preferences = checkedValues("preference");

  return providers
    .map((provider) => ({ ...provider, score: providerMatchesProfile(provider) }))
    .filter((provider) => {
      const typeOk = type === "all" || provider.type === type;
      const regionOk = provider.region === "National" || provider.region === location;
      const optInTags = (provider.tags || []).filter((tag) => optInPreferenceTags.includes(tag));
      const preferenceOk = optInTags.length === 0 || optInTags.some((tag) => preferences.includes(tag));
      const crisisOk = !provider.tags?.includes("crisis");
      return typeOk && regionOk && preferenceOk && crisisOk;
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

function providerTypeLabel(type) {
  return {
    gp: "GP / medical practice",
    counsellor: "Counsellor",
    psychologist: "Psychologist",
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
  const visibleMatches = matches.slice(0, providerVisibleCount);
  providerCount.textContent = `Showing ${visibleMatches.length} of ${matches.length} contact options from the local database. Best matches are shown first.`;
  providerList.innerHTML = visibleMatches
    .map((provider) => {
      const isSelected = provider.id === selectedProviderId;
      const contact = [
        provider.phone ? `Phone ${provider.phone}` : "",
        provider.text ? `Text ${provider.text}` : "",
        provider.email ? provider.email : ""
      ].filter(Boolean).join(" | ");

      return `
        <article class="provider-card ${isSelected ? "selected" : ""}">
          <div>
            <p class="provider-meta">${providerTypeLabel(provider.type)} | ${provider.region}${provider.city ? ` | ${provider.city}` : ""}</p>
            <h3>${provider.name}</h3>
            <p>${provider.fit}</p>
            <p class="provider-detail"><strong>First step:</strong> ${provider.firstStep}</p>
            <p class="provider-detail"><strong>Cost:</strong> ${provider.cost}</p>
            ${contact ? `<p class="provider-detail"><strong>Contact:</strong> ${contact}</p>` : ""}
          </div>
          <div class="provider-actions">
            <button class="button button--primary select-provider" type="button" data-provider-id="${provider.id}">
              Use this contact
            </button>
            ${provider.phone ? `<a class="button button--quiet" href="tel:${normalisePhone(provider.phone)}">Call</a>` : ""}
            ${provider.text ? `<a class="button button--quiet" href="sms:${normalisePhone(provider.text)}">Text</a>` : ""}
            ${provider.website ? `<a class="button button--quiet" href="${provider.website}">Website</a>` : ""}
          </div>
        </article>
      `;
    })
    .join("");

  showMoreProviders.hidden = providerVisibleCount >= matches.length;
}

async function loadProviders() {
  try {
    const response = await fetch("providers.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Provider database failed to load");
    providers = await response.json();
    const firstMatch = filteredProviders()[0];
    if (firstMatch) selectedProviderId = firstMatch.id;
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

function nearestRegionFromCoords(lat, lon) {
  return regionCentres
    .map((centre) => ({ ...centre, distance: distanceKm({ lat, lon }, centre) }))
    .sort((a, b) => a.distance - b.distance)[0]?.region || "";
}

function setLocationFromGps() {
  if (!navigator.geolocation) {
    locationStatus.textContent = "GPS is not available in this browser. Please choose a region.";
    return;
  }

  locationStatus.textContent = "Waiting for GPS permission...";
  useGpsLocation.disabled = true;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const region = nearestRegionFromCoords(
        position.coords.latitude,
        position.coords.longitude
      );

      if (!region) {
        locationStatus.textContent = "Could not match GPS to a region. Please choose manually.";
        useGpsLocation.disabled = false;
        return;
      }

      document.querySelector("#location").value = region;
      locationStatus.textContent = `Using nearest region: ${region}. You can change it.`;
      useGpsLocation.disabled = false;
      render();
    },
    () => {
      locationStatus.textContent = "GPS was not allowed or did not work. Please choose a region.";
      useGpsLocation.disabled = false;
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
  );
}

function buildPaths() {
  const age = Number(document.querySelector("#age").value || 0);
  const location = document.querySelector("#location").value || "your area";
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
      body: "If alcohol, drugs, or gambling are part of the picture, look for combined addiction and mental health services. A GP, 1737, or Healthpoint can help find local options.",
      action: "Search Healthpoint",
      href: links.healthpoint
    });
  }

  if (identity === "male" && /canterbury/i.test(location)) {
    addPath(paths, {
      tone: "local",
      title: "Try Canterbury Men's Centre",
      body: "For men in Christchurch or Canterbury, this can be a lower-pressure front door for a free first assessment, counselling pathways, peer support, and practical navigation.",
      action: "Canterbury Men's Centre",
      href: links.canMen
    });
  } else if (identity === "male") {
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
  if (provider.type === "helpline") return "Talk to someone now";
  if (provider.type === "counsellor") return "Ask a counsellor or therapist";
  if (provider.type === "psychologist") return "Look for a psychologist";
  if (provider.type === "mens-centre") return "Use a lower-pressure men's support option";
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
  const identity = document.querySelector("#identity").value;
  const reasons = [];
  const tags = provider.tags || [];

  if (provider.type === "gp") {
    reasons.push("A GP or nurse can turn this into a medical plan, referrals, medication options if wanted, and funded primary mental health support.");
    if (barriers.includes("cost")) reasons.push("Because cost is a barrier, ask about free Access and Choice support, Community Services Card fees, and WINZ paperwork.");
    if (barriers.includes("wait")) reasons.push("GP teams can sometimes offer brief same-week support while you wait for counselling.");
  }

  if (provider.type === "helpline") {
    reasons.push("This is useful when booking feels like too much: no enrolment, no diagnosis, and you can call or text first.");
    if (needs.includes("anxiety")) reasons.push("For anxiety or overwhelm, a helpline can help you slow the next step down into one manageable action.");
    if (barriers.includes("privacy")) reasons.push("Text or phone support can feel more private than walking into a clinic.");
  }

  if (provider.type === "counsellor" || provider.type === "psychologist") {
    reasons.push("Talking therapy is a direct fit for depression, anxiety, trauma, stress, and patterns that are hard to shift alone.");
    if (barriers.includes("cost")) reasons.push("Ask before booking about WINZ Disability Allowance, ACC, EAP, funded places, or reduced-fee sessions.");
    if (preferences.length) reasons.push("Your preferences can be named in the first message so you do not have to explain them on the spot.");
  }

  if (provider.type === "mens-centre" || tags.includes("male") || identity === "male") {
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

  if (!reasons.length) {
    reasons.push("This option is available for your selected area and gives you a clear next contact step.");
  }

  return reasons.slice(0, 3);
}

function addRecommendation(recommendations, provider, title, action) {
  if (!provider || recommendations.some((item) => item.provider.id === provider.id)) return;

  recommendations.push({
    provider,
    title: title || providerHeading(provider),
    action: action || "Show matching contacts",
    reasons: reasonForProvider(provider)
  });
}

function recommendedMoves() {
  const matches = recommendationCandidates();
  const preference = contactPreference.value === "therapist" ? "counsellor" : contactPreference.value;
  const needs = checkedValues("need");
  const barriers = checkedValues("barrier");
  const preferences = checkedValues("preference");
  const identity = document.querySelector("#identity").value;
  const recommendations = [];
  const best = (predicate) => matches.find(predicate);
  const preferredMatches = recommendationCandidates(preference);

  preferredMatches.slice(0, 3).forEach((provider, index) => {
    addRecommendation(
      recommendations,
      provider,
      index === 0 ? "Your selected first step" : "Another good option",
      index === 0 ? "Use this path" : "Show similar contacts"
    );
  });

  if (recommendations.length >= 3) return recommendations.slice(0, 3);

  addRecommendation(recommendations, best((provider) => provider.type === "gp"), "Start with a GP or nurse", "Show GP options");

  if (needs.includes("anxiety") || needs.includes("depression") || barriers.includes("privacy")) {
    addRecommendation(recommendations, best((provider) => provider.type === "helpline"), "Talk to someone before booking", "Show helplines");
  }

  if (identity === "male") {
    addRecommendation(recommendations, best((provider) => provider.type === "mens-centre" || provider.tags?.includes("male")), "Use a lower-pressure men's option", "Show men's support");
  }

  if (preferences.length || barriers.includes("culture")) {
    addRecommendation(
      recommendations,
      best((provider) => (provider.tags || []).some((tag) => preferences.includes(tag))),
      "Prioritise a safer fit",
      "Show preference matches"
    );
  }

  if (needs.includes("trauma")) {
    addRecommendation(recommendations, best((provider) => provider.tags?.includes("trauma")), "Use trauma-informed support", "Show trauma support");
  }

  if (needs.includes("addiction")) {
    addRecommendation(recommendations, best((provider) => provider.type === "addiction" || provider.tags?.includes("addiction")), "Use addiction-aware support", "Show addiction support");
  }

  if (barriers.includes("cost") || barriers.includes("wait")) {
    addRecommendation(recommendations, best((provider) => provider.type === "public-service" || provider.tags?.includes("cost")), "Look for funded or low-cost support", "Show funded options");
  }

  addRecommendation(recommendations, best((provider) => provider.type === "counsellor"), "Ask a counsellor or therapist", "Show counsellors");
  addRecommendation(recommendations, best((provider) => provider.type === "psychologist"), "Look for a psychologist", "Show psychologists");
  addRecommendation(recommendations, matches[0], "Best overall match", "Keep these matches");

  return recommendations.slice(0, 3);
}

function contactTarget() {
  const provider = providers.find((item) => item.id === selectedProviderId);
  if (provider) {
    return {
      label: provider.name,
      email: provider.email || "",
      phone: provider.phone || provider.text || "",
      website: provider.website || "",
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
      subject: "I need mental health support",
      greeting: "Kia ora"
    };
  }

  if (preference === "mens-centre") {
    return {
      label: "Canterbury Men's Centre",
      email: "enquiries@canmen.org.nz",
      phone: "033659000",
      subject: "Request for support",
      greeting: "Kia ora Canterbury Men's Centre"
    };
  }

  if (preference === "therapist") {
    return {
      label: "a counsellor or therapist",
      email: "",
      phone: "",
      subject: "Counselling enquiry",
      greeting: "Kia ora"
    };
  }

  if (preference === "psychologist") {
    return {
      label: "a psychologist",
      email: "",
      phone: "",
      subject: "Psychology appointment enquiry",
      greeting: "Kia ora"
    };
  }

  return {
    label: "my GP clinic",
    email: "",
    phone: "",
    subject: "Mental health appointment request",
    greeting: "Kia ora"
  };
}

function askLine() {
  const ask = contactAsk.value;
  if (ask === "callback") return "Could someone please call me back to talk through the next step?";
  if (ask === "cost") return "Could you please tell me about costs, WINZ Disability Allowance, ACC, EAP, or any low-cost options? If WINZ may apply, can you complete the Disability Certificate - Counselling form?";
  if (ask === "fit") return "Could you please let me know whether your service is a good fit, or where I should try if it is not?";
  if (ask === "judgement") return "I am nervous about being judged and would appreciate a gentle, non-judgemental first step.";
  return "Could I please book an appointment or be told the soonest available option?";
}

function buildContactMessage() {
  const age = Number(document.querySelector("#age").value || 0);
  const location = document.querySelector("#location").value || "my area";
  const needs = checkedValues("need");
  const barriers = checkedValues("barrier");
  const preferences = checkedValues("preference");
  const target = contactTarget();
  const comfort = contactComfort.value;
  const name = contactName.value.trim();
  const reply = contactReply.value.trim();
  const safety = "I need help getting care started.";

  const lines = [target.greeting, ""];

  if (comfort === "minimal") {
    lines.push(
      `I am finding things hard with ${labelledList(needs, needLabels)} and want to make a first step toward support.`,
      askLine(),
      "I do not know exactly what to say yet. A simple next step would help."
    );
  } else {
    lines.push(
      `I am ${age || "an adult"} in ${location}. I am looking for help with ${labelledList(needs, needLabels)}.`,
      safety,
      `The main things making care hard are ${labelledList(barriers, barrierLabels)}.`,
      askLine()
    );
  }

  if (preferences.length && comfort !== "minimal") {
    lines.push(`I would prefer ${labelledList(preferences, preferenceLabels)} if available.`);
  } else if (preferences.length) {
    lines.push(`I would prefer ${labelledList(preferences, preferenceLabels)} if available.`);
  }

  if (comfort === "open") {
    lines.push(
      "I am worried about judgement and about finding someone who is a good match.",
      "If your service is not the right fit, could you please point me toward another option?"
    );
  }

  lines.push("", "I would appreciate a simple next step. A short reply is okay.");

  if (reply) lines.push(`You can contact me at: ${reply}.`);
  if (barriers.includes("cost")) {
    lines.push("Cost is a barrier, so I would like to know whether WINZ Disability Allowance for counselling could help.");
  }
  if (barriers.includes("privacy")) {
    lines.push("Privacy is a concern for me, so please let me know what information I need to share at this stage.");
  }
  if (name) lines.push("", `Thank you,`, name);

  return lines.join("\n");
}

function renderContact() {
  if (!intakeStatus().complete) {
    contactMessage.value = "";
    selectedProvider.textContent = "Complete the guide questions first, then we will build a first message.";
    emailMessage.hidden = true;
    emailMessage.removeAttribute("href");
    callTarget.href = "tel:1737";
    callTarget.textContent = "Call 1737";
    return;
  }

  const target = contactTarget();
  const message = buildContactMessage();
  contactMessage.value = message;
  const subject = encodeURIComponent(target.subject);
  const body = encodeURIComponent(message);

  if (target.email) {
    emailMessage.hidden = false;
    emailMessage.href = `mailto:${target.email}?subject=${subject}&body=${body}`;
    emailMessage.textContent = `Email ${target.label}`;
  } else if (target.website) {
    emailMessage.hidden = false;
    emailMessage.href = target.website;
    emailMessage.textContent = "Open contact page";
  } else {
    emailMessage.hidden = true;
    emailMessage.removeAttribute("href");
  }

  if (target.phone) {
    callTarget.href = `tel:${normalisePhone(target.phone)}`;
    callTarget.textContent = `Call ${target.label}`;
  } else if (target.website) {
    callTarget.href = target.website;
    callTarget.textContent = "Open website";
  } else {
    callTarget.href = "https://www.healthpoint.co.nz/mental-health-addictions/";
    callTarget.textContent = "Find contact details";
  }

  const provider = providers.find((item) => item.id === selectedProviderId);
  selectedProvider.textContent = provider
    ? `Using ${provider.name}. You can still edit the message before sending.`
    : "Choose a provider above, or use the message with any service you find.";
}

function render() {
  const status = intakeStatus();
  providerFinder.hidden = !status.complete;
  contactLayout.hidden = !status.complete;

  if (!status.complete) {
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
  const filterOptions = pathFilterOptions(paths)
    .map(
      (option) => `
        <button class="path-filter" type="button" data-provider-type="${option.type || ""}" data-provider-search="${option.search || ""}">
          ${option.label}
        </button>
      `
    )
    .join("");

  resultList.innerHTML = `
    <div class="recommendation-grid" aria-label="Recommended first contact options">
      ${moves.map((move, index) => `
        <article class="recommendation-card ${index === 0 ? "recommendation-card--primary" : ""}">
          <div class="recommendation-rank">${index + 1}</div>
          <div>
            <p class="recommendation-kicker">${move.title}</p>
            <h3>${move.provider.name}</h3>
            <p>${move.provider.firstStep}</p>
            <ul>
              ${move.reasons.map((reason) => `<li>${reason}</li>`).join("")}
            </ul>
            <button class="button ${index === 0 ? "button--primary" : "button--quiet"} path-filter" type="button" data-provider-type="${move.provider.type}" data-provider-search="">
              ${move.action}
            </button>
          </div>
        </article>
      `).join("")}
    </div>
    <div class="path-filter-row" aria-label="Tune contact matches">
      ${filterOptions}
    </div>
    <details class="path-details">
      <summary>Why these paths?</summary>
      ${paths.map((path) => `
        <article class="path-card ${path.tone || ""}">
          <h3>${path.title}</h3>
          <p>${path.body}</p>
          <a href="${path.href}">${path.action}</a>
        </article>
      `).join("")}
    </details>
  `;
  renderProviders();
  renderContact();
}

form.addEventListener("input", render);
resultList.addEventListener("click", (event) => {
  const button = event.target.closest(".path-filter");
  if (!button) return;
  providerType.value = button.dataset.providerType || "all";
  providerSearch.value = button.dataset.providerSearch || "";
  providerVisibleCount = providerBatchSize;
  renderProviders();
  renderContact();
  document.querySelector(".provider-finder").scrollIntoView({ behavior: "smooth", block: "start" });
});
contactName.addEventListener("input", renderContact);
contactReply.addEventListener("input", renderContact);
contactAsk.addEventListener("input", renderContact);
contactComfort.addEventListener("input", renderContact);
contactPreference.addEventListener("input", () => {
  const preference = contactPreference.value === "therapist" ? "counsellor" : contactPreference.value;
  const firstMatch = recommendationCandidates(preference)[0] || filteredProviders()[0];
  if (firstMatch) selectedProviderId = firstMatch.id;
  render();
});
useGpsLocation.addEventListener("click", setLocationFromGps);
function resetProviderList() {
  providerVisibleCount = providerBatchSize;
  renderProviders();
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
  selectedProviderId = button.dataset.providerId;
  renderProviders();
  renderContact();
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
