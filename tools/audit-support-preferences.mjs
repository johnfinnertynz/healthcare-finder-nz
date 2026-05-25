import fs from "node:fs";

const [, , providersPath = "providers.json"] = process.argv;
const providers = JSON.parse(fs.readFileSync(providersPath, "utf8"));

const supportPreferences = {
  maori: {
    label: "Maori / kaupapa Maori",
    pattern: /\b(whanau|whānau|marae|iwi|maori|māori|kaupapa|ngāti|ngati|rongoa|rongoā)\b/i
  },
  pasifika: {
    label: "Pasifika",
    pattern: /\b(pasifika|pacific|tongan|samoan|cook islands|vaka|fono|langimālie|langimalie|etu pasifika|etū pasifika)\b/i
  },
  asian: {
    label: "Asian",
    pattern: /\b(asian|chinese|korean|indian|mandarin|cantonese|hong kong|vietnamese|japanese|filipino|thai|hindi|punjabi|gujarati|urdu|tamil|telugu)\b/i
  },
  rainbow: {
    label: "Rainbow / LGBTQIA+",
    pattern: /\b(rainbow|lgbt|lgbtq|lgbtqia|takatapui|takatāpui|sexuality|gender diverse|transgender|gay|lesbian|bisexual|intersex)\b/i
  },
  "trauma-informed": {
    label: "Trauma-informed",
    pattern: /\b(trauma-informed|trauma informed)\b/i
  }
};

const genderPreferences = {
  female: /\b(female|woman|women|wahine)\b/i,
  male: /\b(male|man|men|tāne|tane)\b/i
};

const providerGenderPreferenceValues = new Set(["female-provider", "male-provider"]);
const optInPreferenceTags = new Set(["maori", "pasifika", "asian", "rainbow"]);

function providerGenderFor(provider) {
  const explicit = String(provider.providerGender || "").toLowerCase();
  if (explicit === "female" || explicit === "male") return explicit;
  const tags = provider.tags || [];
  if (tags.includes("female") && !tags.includes("male")) return "female";
  if (tags.includes("male") && !tags.includes("female")) return "male";
  return "";
}

function evidenceText(provider) {
  return [
    provider.name,
    provider.website,
    provider.source,
    provider.fit,
    provider.firstStep,
    provider.cost,
    ...(provider.specialties || []),
    ...(provider.patientGroups || []),
    ...(provider.ageGroups || []),
    ...(provider.services || []),
    ...(provider.languages || [])
  ].join(" ");
}

function highConfidenceEvidenceText(provider) {
  return [
    provider.name,
    provider.website
  ].join(" ");
}

function summaryFor(tag, config) {
  const tagged = providers.filter((provider) => (provider.tags || []).includes(tag));
  const candidates = providers.filter((provider) => config.pattern.test(highConfidenceEvidenceText(provider)));
  const missing = candidates.filter((provider) => !(provider.tags || []).includes(tag));
  const weakEvidence = tagged.filter((provider) => !config.pattern.test(evidenceText(provider)));

  return {
    tag,
    label: config.label,
    tagged,
    candidates,
    missing,
    weakEvidence
  };
}

let failures = 0;

for (const [tag, config] of Object.entries(supportPreferences)) {
  const summary = summaryFor(tag, config);
  console.log(`\n${summary.label}`);
  console.log(`  tagged=${summary.tagged.length} evidenceCandidates=${summary.candidates.length} missingTag=${summary.missing.length} weakEvidence=${summary.weakEvidence.length}`);

  for (const provider of summary.missing.slice(0, 30)) {
    console.log(`  MISSING_${tag.toUpperCase()} ${provider.id} | ${provider.type} | ${provider.region} | ${provider.name}`);
  }

  for (const provider of summary.weakEvidence.slice(0, 30)) {
    console.log(`  REVIEW_${tag.toUpperCase()} ${provider.id} | ${provider.type} | ${provider.region} | ${provider.name}`);
  }

  if (summary.missing.length) failures += 1;
}

for (const [tag, pattern] of Object.entries(genderPreferences)) {
  const tagged = providers.filter((provider) => providerGenderFor(provider) === tag);
  const weakEvidence = tagged.filter((provider) => !provider.providerGenderSource && !pattern.test(evidenceText(provider)));

  console.log(`\n${tag} provider preference`);
  console.log(`  tagged=${tagged.length} sourceBacked=${tagged.filter((provider) => provider.providerGenderSource).length} weakEvidence=${weakEvidence.length}`);
  if (!tagged.length) {
    console.log("  NO_VERIFIED_PROVIDER_TAGS loaded yet. The website will keep this as a soft preference until verified provider-gender data is added.");
  }

  for (const provider of weakEvidence.slice(0, 30)) {
    console.log(`  REVIEW_${tag.toUpperCase()} ${provider.id} | ${provider.type} | ${provider.region} | ${provider.name}`);
  }

  if (weakEvidence.length) {
    console.log("  Review only: gender tags can be valid when a service is explicitly for that group.");
  }
}

const invalidPreferenceTags = providers.filter((provider) =>
  (provider.tags || []).some((tag) => providerGenderPreferenceValues.has(tag))
);

if (invalidPreferenceTags.length) {
  console.log("\nInvalid provider-gender preference tags");
  for (const provider of invalidPreferenceTags) {
    console.log(`  INVALID_GENDER_PREFERENCE_TAG ${provider.id} | ${provider.name}`);
  }
  failures += 1;
}

const optInVisibleWithoutPreference = providers.filter((provider) => {
  const tags = provider.tags || [];
  return tags.some((tag) => optInPreferenceTags.has(tag)) && provider.type !== "directory";
});

console.log(`\nOpt-in preference records: ${optInVisibleWithoutPreference.length}`);
console.log("These remain hidden unless the matching support preference is selected, while general providers remain available as fallback.");

process.exitCode = failures ? 1 : 0;
