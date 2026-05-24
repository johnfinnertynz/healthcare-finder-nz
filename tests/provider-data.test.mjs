import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import test from "node:test";

const providers = JSON.parse(fs.readFileSync("providers.json", "utf8"));
const optInPreferenceTags = new Set(["maori", "pasifika", "asian", "rainbow"]);
const exactTypes = ["gp", "counsellor", "psychologist", "psychiatrist"];
const expectedRegions = [
  "Northland",
  "Auckland",
  "Waikato",
  "Bay of Plenty",
  "Rotorua and Taupo",
  "Tairawhiti",
  "Hawke's Bay",
  "Taranaki",
  "Manawatu-Whanganui",
  "Wairarapa",
  "Wellington",
  "Nelson Marlborough Tasman",
  "Canterbury",
  "South Canterbury",
  "West Coast",
  "Otago",
  "Southland"
];

function isDirectoryLike(provider) {
  return provider.type === "directory" || provider.tags?.includes("directory");
}

function hasContact(provider) {
  return Boolean(provider.phone || provider.text || provider.email || provider.website);
}

function hasGenderConflict(provider, preferences) {
  const wantsFemale = preferences.includes("female-provider");
  const wantsMale = preferences.includes("male-provider");
  if (wantsFemale && wantsMale) return false;
  return (wantsFemale && provider.tags?.includes("male")) || (wantsMale && provider.tags?.includes("female"));
}

function matchesPreferencePrivacy(provider, preferences) {
  const optInTags = (provider.tags || []).filter((tag) => optInPreferenceTags.has(tag));
  return optInTags.length === 0 || optInTags.some((tag) => preferences.includes(tag));
}

function providerMatchesType(provider, type) {
  if (type === "all") return true;
  if (type === "directory") return isDirectoryLike(provider);
  return provider.type === type
    || (type === "counsellor" && provider.type === "mens-centre")
    || (type === "addiction" && provider.tags?.includes("addiction"));
}

function visibleMatches({ region, type = "all", preferences = [], query = "" }) {
  const normalisedQuery = query.trim().toLowerCase();
  return providers.filter((provider) => {
    const text = [
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

    return providerMatchesType(provider, type)
      && (provider.region === region || provider.region === "National" || Boolean(normalisedQuery))
      && (!normalisedQuery || text.includes(normalisedQuery))
      && matchesPreferencePrivacy(provider, preferences)
      && !hasGenderConflict(provider, preferences)
      && !provider.tags?.includes("crisis")
      && !isDirectoryLike(provider)
      && hasContact(provider);
  });
}

test("provider data validation script passes", () => {
  execFileSync(process.execPath, ["tools/validate-provider-data.mjs"], { stdio: "pipe" });
});

test("all current region filters have useful visible direct contacts", () => {
  for (const region of expectedRegions) {
    assert.ok(visibleMatches({ region }).length >= 5, `${region} should have at least five visible direct contacts`);
  }
});

test("exact professional filters do not substitute unrelated provider types", () => {
  for (const region of ["Auckland", "Canterbury", "Otago", "Wellington"]) {
    for (const type of exactTypes) {
      const matches = visibleMatches({ region, type });
      assert.ok(matches.length > 0, `${region} should have at least one ${type} or valid counsellor adjunct result`);
      const invalid = matches.filter((provider) => {
        if (type === "counsellor") return !["counsellor", "mens-centre"].includes(provider.type);
        return provider.type !== type;
      });
      assert.deepEqual(invalid.map((provider) => `${provider.id}:${provider.type}`), []);
    }
  }
});

test("opt-in cultural providers stay hidden unless selected", () => {
  const general = visibleMatches({ region: "Auckland", type: "counsellor" });
  const asianSelected = visibleMatches({ region: "Auckland", type: "counsellor", preferences: ["asian"] });

  assert.equal(general.some((provider) => provider.id === "national-asian-family-services"), false);
  assert.equal(asianSelected.some((provider) => provider.id === "national-asian-family-services"), true);
});

test("provider records used for contact have safe public contact fields", () => {
  const missing = providers
    .filter((provider) => !isDirectoryLike(provider))
    .filter((provider) => !hasContact(provider))
    .map((provider) => provider.id);

  assert.deepEqual(missing, []);
});
