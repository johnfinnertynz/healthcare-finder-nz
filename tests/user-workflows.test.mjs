import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const providers = JSON.parse(fs.readFileSync("providers.json", "utf8"));
const indexHtml = fs.readFileSync("index.html", "utf8");
const trustPages = ["privacy.html", "terms.html", "data-sources.html", "crisis.html"];
const optInPreferenceTags = new Set(["maori", "pasifika", "asian", "rainbow"]);
const broadNeedTags = new Set(["depression", "anxiety", "work", "stress", "relationships", "grief", "addiction"]);

const personas = [
  { name: "16-year-old female in Northland with anxiety", region: "Northland", age: 16, want: "therapist", needs: ["anxiety"], preferences: ["female-provider"], barriers: ["privacy"], goal: "find age-appropriate anxiety support without sexual-harm-only services" },
  { name: "Auckland parent looking for ADHD assessment for child", region: "Auckland", age: 42, want: "psychologist", needs: ["work"], preferences: [], barriers: ["cost"], goal: "find assessment-capable professionals" },
  { name: "Wellington university student with depression", region: "Wellington", age: 20, want: "therapist", needs: ["depression"], preferences: [], barriers: ["cost"], goal: "find low-cost counselling" },
  { name: "Rural South Island user with poor transport", region: "Southland", age: 31, want: "therapist", needs: ["anxiety"], preferences: ["telehealth"], barriers: ["transport"], goal: "find phone or video options" },
  { name: "Maori user seeking culturally appropriate support", region: "Northland", age: 34, want: "unsure", needs: ["depression"], preferences: ["maori"], barriers: ["culture"], goal: "find kaupapa Maori or culturally safe support" },
  { name: "Pacific family needing free counselling", region: "Auckland", age: 38, want: "therapist", needs: ["work"], preferences: ["pasifika"], barriers: ["cost"], goal: "find Pasifika-friendly support" },
  { name: "User in crisis needing immediate help", region: "Waikato", age: 29, want: "unsure", needs: ["depression"], preferences: [], barriers: ["privacy"], crisis: true, goal: "see 111 and 1737 immediately" },
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

function availabilityStatus(provider) {
  return ["accepting", "waitlist", "not_accepting", "referrals_paused", "unknown", "not_published"].includes(provider.availabilityStatus)
    ? provider.availabilityStatus
    : "not_published";
}

function unavailableForFirstRecommendations(provider) {
  return ["not_accepting", "referrals_paused"].includes(availabilityStatus(provider));
}

function availabilityTier(provider) {
  const status = availabilityStatus(provider);
  if (status === "accepting" && provider.availabilityEvidence) return 3;
  if (status === "unknown" || status === "not_published") return 2;
  if (status === "waitlist") return 1;
  return unavailableForFirstRecommendations(provider) ? 0 : 2;
}

function availabilityScore(provider) {
  const status = availabilityStatus(provider);
  if (status === "accepting" && provider.availabilityEvidence) return 2;
  if (status === "waitlist") return -10;
  if (unavailableForFirstRecommendations(provider)) return -120;
  return 0;
}

function referralTier(provider) {
  if (provider.type !== "psychiatrist" && !provider.tags?.includes("psychiatry-service")) return 2;
  if (provider.referralType === "self") return 3;
  if (provider.referralType === "unknown") return 2;
  if (provider.referralType === "gp" || provider.referralType === "specialist") return 1;
  return 2;
}

function referralScore(provider, type) {
  if (type !== "psychiatrist" || (provider.type !== "psychiatrist" && !provider.tags?.includes("psychiatry-service"))) return 0;
  if (provider.referralType === "self") return 8;
  if (provider.referralType === "unknown") return -2;
  if (provider.referralType === "gp" || provider.referralType === "specialist") return -6;
  return 0;
}

function isTelehealthProvider(provider) {
  const tags = provider.tags || [];
  if (tags.includes("telehealth") || tags.includes("online")) return true;
  if (provider.onlineAvailable === true) return true;
  if (provider.type === "helpline") return true;
  if (provider.phoneSupport === true && (provider.region === "National" || ["helpline", "addiction", "youth"].includes(provider.type))) return true;
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
  let value = availabilityScore(provider) + referralScore(provider, type);
  if (provider.region === persona.region) value += 12;
  if (hasNationalServiceReach(provider)) value += persona.barriers.includes("transport") || persona.preferences.includes("telehealth") ? 5 : -3;
  if (!matchesSelectedNeeds(provider, persona.needs)) value -= 80;
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

function recommendations(persona) {
  const type = selectedType(persona.want);
  const strictExactTypes = new Set(["gp", "psychologist", "psychiatrist"]);
  const primary = providers
    .filter((provider) => matchesType(provider, type))
    .filter((provider) => matchesRegion(provider, persona.region, persona.preferences))
    .filter((provider) => preferenceAllowed(provider, persona.preferences))
    .filter((provider) => providerMatchesAge(provider, persona.age))
    .filter((provider) => matchesSelectedNeeds(provider, persona.needs))
    .filter((provider) => !provider.tags?.includes("crisis"))
    .filter((provider) => !unavailableForFirstRecommendations(provider))
    .filter((provider) => !isDirectoryLike(provider) && hasContact(provider))
    .map((provider) => ({ provider, score: score(provider, persona, type) }))
    .sort((a, b) => b.score - a.score || availabilityTier(b.provider) - availabilityTier(a.provider) || referralTier(b.provider) - referralTier(a.provider) || a.provider.name.localeCompare(b.provider.name))
    .map((entry) => entry.provider);

  const fill = providers
    .filter((provider) => matchesRegion(provider, persona.region, persona.preferences))
    .filter((provider) => preferenceAllowed(provider, persona.preferences))
    .filter((provider) => providerMatchesAge(provider, persona.age))
    .filter((provider) => matchesSelectedNeeds(provider, persona.needs))
    .filter((provider) => !provider.tags?.includes("crisis"))
    .filter((provider) => !unavailableForFirstRecommendations(provider))
    .filter((provider) => !isDirectoryLike(provider) && hasContact(provider))
    .map((provider) => ({ provider, score: score(provider, persona, "all") }))
    .sort((a, b) => b.score - a.score || availabilityTier(b.provider) - availabilityTier(a.provider) || referralTier(b.provider) - referralTier(a.provider) || a.provider.name.localeCompare(b.provider.name))
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

test("emergency guidance is visible without using filters", () => {
  assert.match(indexHtml, /call\s+111/i);
  assert.match(indexHtml, /1737/i);
  assert.match(indexHtml, /not an emergency service|not a replacement/i);
  assert.match(indexHtml, /href="crisis\.html"/i);
});

test("trust pages render with safety navigation", () => {
  for (const page of trustPages) {
    const html = fs.readFileSync(page, "utf8");
    assert.match(html, /<title>.+Care Finder Aotearoa<\/title>/i, `${page} should have a title`);
    assert.match(html, /<h1>/i, `${page} should have a main heading`);
    assert.match(html, /1737/i, `${page} should include 1737 guidance`);
    assert.match(html, /111/i, `${page} should include 111 guidance`);
    assert.match(html, /index\.html/i, `${page} should link back to the app`);
  }
});

test("20 simulated user workflows reach actionable, non-directory options", () => {
  for (const persona of personas) {
    const matches = recommendations(persona);
    assert.ok(matches.length > 0, `${persona.name}: should reach at least one actionable provider`);
    assert.ok(matches.length <= 3, `${persona.name}: should keep the first decision small`);
    assert.equal(matches.some(isDirectoryLike), false, `${persona.name}: recommendations should not be directories`);
    assert.equal(matches.some((provider) => provider.tags?.includes("crisis")), false, `${persona.name}: crisis teams should not appear as default recommendations`);
    assert.equal(matches.some(unavailableForFirstRecommendations), false, `${persona.name}: first recommendations should not start with providers listed as unavailable`);
    assert.ok(matches.every(hasContact), `${persona.name}: every recommendation needs a public contact route`);
    assert.ok(
      matches.every((provider) => matchesSelectedNeeds(provider, persona.needs)),
      `${persona.name}: recommendations should not include need-scoped providers for unrelated concerns`
    );
    assert.ok(
      matches.every((provider) => providerMatchesAge(provider, persona.age)),
      `${persona.name}: recommendations should respect age-gated services`
    );

    if (["gp", "psychologist", "psychiatrist"].includes(selectedType(persona.want))) {
      assert.ok(matches.every((provider) => matchesType(provider, selectedType(persona.want))), `${persona.name}: exact contact type should be respected`);
    }

    if (persona.preferences.some((preference) => optInPreferenceTags.has(preference))) {
      assert.ok(
        matches.some((provider) => persona.preferences.some((preference) => provider.tags?.includes(preference))),
        `${persona.name}: should include at least one requested opt-in cultural/safety match`
      );
    }

    if (persona.barriers.includes("cost")) {
      assert.ok(
        matches.some((provider) => /free|funded|public|winz|low-cost|reduced/i.test(`${provider.cost} ${(provider.tags || []).join(" ")}`)),
        `${persona.name}: should surface a free, funded, public, or cost-aware option`
      );
    }

    if (persona.preferences.includes("telehealth")) {
      assert.ok(
        matches.some((provider) => provider.region === "National" || provider.tags?.includes("telehealth")),
        `${persona.name}: should surface at least one telehealth or remote-friendly option`
      );
    }
  }
});

test("Northland teenage anxiety flow does not recommend Xtrapsychplus", () => {
  const persona = personas.find((item) => item.name === "16-year-old female in Northland with anxiety");
  const matches = recommendations(persona);
  assert.ok(matches.length > 0, "teenage Northland anxiety flow should still find options");
  assert.equal(matches.some((provider) => provider.id === "northland-xtrapsychplus"), false);
  assert.equal(matches.some((provider) => provider.needScope?.includes("trauma")), false);
});

test("Greymouth psychologist flow does not recommend Christchurch providers as telehealth by accident", () => {
  const matches = recommendations({
    name: "19-year-old male in Greymouth with low mood seeking a psychologist",
    region: "West Coast",
    age: 19,
    want: "psychologist",
    needs: ["depression"],
    preferences: [],
    barriers: []
  });

  assert.ok(matches.length > 0, "Greymouth psychologist flow should still find options");
  assert.equal(matches.some((provider) => provider.id === "nzccp-alex-richards"), false);
  assert.equal(matches.some((provider) => provider.id === "west-coast-proactive-greymouth-psychology"), false);
  assert.ok(
    matches.every((provider) => provider.region === "West Coast" || hasNationalServiceReach(provider)),
    "out-of-region recommendations must have confirmed national or telehealth reach"
  );
});

test("Greymouth work-related psychologist flow may include scoped rehabilitation psychology", () => {
  const matches = recommendations({
    name: "27-year-old male in Greymouth with work stress seeking a psychologist",
    region: "West Coast",
    age: 27,
    want: "psychologist",
    needs: ["work"],
    preferences: [],
    barriers: []
  });

  assert.ok(matches.length > 0, "Greymouth work-related psychologist flow should still find options");
  assert.equal(matches.some((provider) => provider.id === "west-coast-proactive-greymouth-psychology"), true);
});

test("availability metadata lowers waitlists and removes unavailable providers from first recommendations", () => {
  const accepting = {
    id: "accepting-local",
    name: "Accepting Local Psychology",
    type: "psychologist",
    region: "Otago",
    city: "Dunedin",
    phone: "03 000 0000",
    tags: ["psychologist", "depression", "direct-contact"],
    fit: "Depression support.",
    availabilityStatus: "accepting",
    availabilityEvidence: "Accepting new clients"
  };
  const waitlist = {
    ...accepting,
    id: "waitlist-local",
    name: "Waitlist Local Psychology",
    availabilityStatus: "waitlist",
    availabilityEvidence: "Limited availability"
  };
  const unavailable = {
    ...accepting,
    id: "unavailable-local",
    name: "Unavailable Local Psychology",
    availabilityStatus: "not_accepting",
    availabilityEvidence: "Currently not accepting new clients"
  };
  const persona = {
    region: "Otago",
    age: 27,
    want: "psychologist",
    needs: ["depression"],
    preferences: [],
    barriers: []
  };

  const ranked = [waitlist, unavailable, accepting]
    .filter((provider) => !unavailableForFirstRecommendations(provider))
    .map((provider) => ({ provider, score: score(provider, persona, "psychologist") }))
    .sort((a, b) => b.score - a.score || availabilityTier(b.provider) - availabilityTier(a.provider))
    .map((entry) => entry.provider.id);

  assert.deepEqual(ranked, ["accepting-local", "waitlist-local"]);
});

test("all main intake choices have matching logic coverage", () => {
  const needs = ["depression", "anxiety", "trauma", "addiction", "work"];
  const wants = ["unsure", "gp", "therapist", "psychologist", "psychiatrist"];
  const preferenceSets = [
    ["maori"],
    ["pasifika"],
    ["asian"],
    ["rainbow"],
    ["trauma-informed"],
    ["telehealth"],
    ["female-provider"],
    ["male-provider"]
  ];

  for (const need of needs) {
    const matches = recommendations({ name: `need ${need}`, region: "Auckland", age: 30, want: "unsure", needs: [need], preferences: [], barriers: [] });
    assert.ok(matches.length > 0, `need ${need} should produce recommendations`);
    assert.ok(matches.every((provider) => matchesSelectedNeeds(provider, [need])), `need ${need} should not return unrelated scoped services`);
  }

  for (const want of wants) {
    const matches = recommendations({ name: `want ${want}`, region: "Wellington", age: 30, want, needs: ["anxiety"], preferences: [], barriers: [] });
    assert.ok(matches.length > 0, `contact preference ${want} should produce recommendations`);
    if (["gp", "psychologist", "psychiatrist"].includes(selectedType(want))) {
      assert.ok(matches.every((provider) => matchesType(provider, selectedType(want))), `contact preference ${want} should stay exact`);
    }
  }

  for (const preferences of preferenceSets) {
    const matches = recommendations({ name: `preferences ${preferences.join(",")}`, region: "Auckland", age: 30, want: "unsure", needs: ["anxiety"], preferences, barriers: [] });
    assert.ok(matches.length > 0, `support preference ${preferences.join(",")} should still produce recommendations`);
    if (preferences.some((preference) => optInPreferenceTags.has(preference))) {
      assert.ok(matches.some((provider) => preferences.some((preference) => provider.tags?.includes(preference))), `support preference ${preferences.join(",")} should surface at least one matched provider`);
    }
  }
});
