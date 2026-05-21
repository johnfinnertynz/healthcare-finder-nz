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

function checkedValues(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map((item) => item.value);
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
      const costText = `${provider.cost} ${(provider.tags || []).join(" ")}`.toLowerCase();
      const costOk = cost === "any"
        || (cost === "free" && /free|public|funded/.test(costText))
        || (cost === "winz" && /winz|cost|funded|directory/.test(costText));

      return typeOk && queryOk && regionOk && costOk;
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

function providerTypeLabel(type) {
  return {
    gp: "GP-linked",
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
    renderProviders();
    renderContact();
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
  const urgency = document.querySelector("#urgency").value;
  const needs = checkedValues("need");
  const barriers = checkedValues("barrier");
  const preferences = checkedValues("preference");
  const paths = [];

  const preferenceText = preferences.length ? ` Preferences: ${labelledList(preferences, preferenceLabels)}.` : "";
  profileLine.textContent = `${age || "Adult"} in ${location}: ${labelledList(needs, needLabels)}. Main barriers: ${labelledList(barriers, barrierLabels)}.${preferenceText}`;

  if (urgency === "crisis") {
    addPath(paths, {
      tone: "priority",
      title: "Immediate safety comes first",
      body: "Call 111, go to the nearest emergency department, or contact your local mental health crisis team. If you can stay safe while talking, call or text 1737 now.",
      action: "Health NZ crisis options",
      href: links.healthNz
    });
  }

  if (urgency === "same-day") {
    addPath(paths, {
      tone: "priority",
      title: "Get same-day human support",
      body: "Call or text 1737 today. Ask them to help you choose between GP, crisis team, local community support, or a helpline that fits what is happening.",
      action: "Call or text 1737",
      href: "tel:1737"
    });
  }

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

  if (barriers.includes("culture") || preferences.some((item) => ["maori", "pasifika", "rainbow", "trauma-informed"].includes(item))) {
    addPath(paths, {
      title: "Ask for a culturally safe fit",
      body: "You can ask for Maori, Pasifika, Rainbow, youth-friendly, trauma-informed, male, or female support. Fit matters, and changing provider is allowed.",
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
  const urgency = document.querySelector("#urgency").value;
  const needs = checkedValues("need");
  const barriers = checkedValues("barrier");
  const preferences = checkedValues("preference");
  const target = contactTarget();
  const comfort = contactComfort.value;
  const name = contactName.value.trim();
  const reply = contactReply.value.trim();
  const safety = urgency === "crisis"
    ? "I may not be safe and need urgent guidance."
    : urgency === "same-day"
      ? "I need help today if possible."
      : "I can stay safe today, but I need help getting care started.";

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
  const target = contactTarget();
  const message = buildContactMessage();
  contactMessage.value = message;
  const subject = encodeURIComponent(target.subject);
  const body = encodeURIComponent(message);

  emailMessage.href = target.email
    ? `mailto:${target.email}?subject=${subject}&body=${body}`
    : `mailto:?subject=${subject}&body=${body}`;
  emailMessage.textContent = target.email ? `Email ${target.label}` : "Open email";

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
  const paths = buildPaths();
  resultList.innerHTML = paths
    .map(
      (path, index) => `
        <article class="path-card ${path.tone || ""}">
          <h3>${index + 1}. ${path.title}</h3>
          <p>${path.body}</p>
          <a href="${path.href}">${path.action}</a>
        </article>
      `
    )
    .join("");
  renderProviders();
  renderContact();
}

form.addEventListener("input", render);
contactName.addEventListener("input", renderContact);
contactReply.addEventListener("input", renderContact);
contactAsk.addEventListener("input", renderContact);
contactComfort.addEventListener("input", renderContact);
contactPreference.addEventListener("input", () => {
  const firstMatch = filteredProviders()[0];
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
