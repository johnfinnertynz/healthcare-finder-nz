import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { auditAvailability } from "../tools/audit-provider-availability.mjs";
import { auditProviders } from "../tools/audit-provider-source-fit.mjs";

const providers = JSON.parse(fs.readFileSync("providers.json", "utf8"));
const indexHtml = fs.readFileSync("index.html", "utf8");
const publicHtmlPages = [
  "index.html",
  "privacy.html",
  "terms.html",
  "data-sources.html",
  "crisis.html",
  "medium-healthcare-pitfalls.html"
];
const optInPreferenceTags = new Set(["maori", "pasifika", "asian", "rainbow"]);
const broadNeedTags = new Set(["depression", "anxiety", "work", "stress", "relationships", "grief", "addiction"]);
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

function matchesRegion(provider, region, preferences = [], query = "") {
  if (query) return true;
  if (provider.region === region) return true;
  if (hasNationalServiceReach(provider)) return true;
  return preferences.includes("telehealth") && isTelehealthProvider(provider);
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
    || (type === "psychiatrist" && provider.tags?.includes("psychiatry-service"))
    || (type === "addiction" && provider.tags?.includes("addiction"));
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

function visibleMatches({ region, type = "all", preferences = [], needs = [], query = "" }) {
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
      && matchesRegion(provider, region, preferences, normalisedQuery)
      && (!normalisedQuery || text.includes(normalisedQuery))
      && matchesPreferencePrivacy(provider, preferences)
      && !hasGenderConflict(provider, preferences)
      && (Boolean(normalisedQuery) || matchesSelectedNeeds(provider, needs))
      && !provider.tags?.includes("crisis")
      && !isDirectoryLike(provider)
      && hasContact(provider);
  });
}

test("provider data validation script passes", () => {
  execFileSync(process.execPath, ["tools/validate-provider-data.mjs"], { stdio: "pipe" });
});

test("provider source-fit audit passes without unallowlisted high-severity findings", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "provider-source-fit-"));
  execFileSync(process.execPath, [
    "tools/audit-provider-source-fit.mjs",
    "providers.json",
    "--allowlist",
    "data/provider-source-fit-allowlist.json",
    "--json-out",
    path.join(tempDir, "provider-source-fit-audit.json"),
    "--md-out",
    path.join(tempDir, "PROVIDER_SOURCE_FIT_AUDIT.md")
  ], { stdio: "pipe" });

  const report = JSON.parse(fs.readFileSync(path.join(tempDir, "provider-source-fit-audit.json"), "utf8"));
  assert.equal(report.summary.highUnallowlisted, 0);
  assert.ok(report.summary.total >= 1, "audit should keep reporting reviewable source-fit findings");
});

test("provider availability audit passes without unallowlisted high-severity findings", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "provider-availability-"));
  execFileSync(process.execPath, [
    "tools/audit-provider-availability.mjs",
    "providers.json",
    "--allowlist",
    "data/provider-availability-allowlist.json",
    "--json-out",
    path.join(tempDir, "provider-availability-audit.json"),
    "--md-out",
    path.join(tempDir, "AVAILABILITY_RECHECK_REPORT.md")
  ], { stdio: "pipe" });

  const report = JSON.parse(fs.readFileSync(path.join(tempDir, "provider-availability-audit.json"), "utf8"));
  assert.equal(report.summary.highUnallowlisted, 0);
  assert.ok(report.providersScanned >= providers.length);
});

test("availability audit catches stale or unsafe availability metadata", () => {
  const baseProvider = {
    id: "availability-sample",
    name: "Availability Sample",
    type: "psychologist",
    region: "Auckland",
    city: "Auckland",
    phone: "09 000 0000",
    email: "hello@example.org",
    website: "https://example.org",
    cost: "Private fees apply.",
    tags: ["psychologist", "direct-contact"],
    fit: "Psychology service.",
    firstStep: "Ask about fit.",
    source: "https://example.org",
    verified: "2026-05",
    lastVerified: "2026-05",
    confidence: "medium",
    sourceQuality: "provider-owned page",
    needsManualVerification: true,
    needScope: []
  };

  const report = auditAvailability({
    generatedAt: "2026-05-25T00:00:00.000Z",
    providers: [
      {
        ...baseProvider,
        id: "accepting-without-evidence",
        availabilityStatus: "accepting",
        availabilityCheckedAt: "2026-05-20",
        availabilityEvidence: "",
        availabilitySource: "https://example.org"
      },
      {
        ...baseProvider,
        id: "stale-not-accepting",
        availabilityStatus: "not_accepting",
        availabilityCheckedAt: "2026-04-01",
        availabilityEvidence: "Currently not accepting new clients",
        availabilitySource: "https://example.org",
        availabilityNeedsManualReview: true
      },
      {
        ...baseProvider,
        id: "contradictory-status",
        availabilityStatus: "not_published",
        availabilityCheckedAt: "2026-05-20",
        availabilityEvidence: "Referrals are paused.",
        availabilitySource: "https://example.org",
        availabilityNeedsManualReview: true
      },
      {
        ...baseProvider,
        id: "directory-accepting",
        type: "directory",
        tags: ["directory"],
        availabilityStatus: "accepting",
        availabilityCheckedAt: "2026-05-20",
        availabilityEvidence: "Accepting new clients",
        availabilitySource: "https://example.org"
      }
    ],
    allowlistEntries: []
  });

  const rules = report.findings.map((finding) => `${finding.providerId}:${finding.rule}:${finding.severity}`);
  assert.ok(rules.includes("accepting-without-evidence:accepting-without-explicit-evidence:high"));
  assert.ok(rules.includes("stale-not-accepting:stale-availability:high"));
  assert.ok(rules.includes("contradictory-status:restrictive-evidence-status-mismatch:high"));
  assert.ok(rules.includes("directory-accepting:directory-marked-accepting:high"));
  assert.equal(report.summary.highUnallowlisted, 5);
});

test("source-fit audit catches known unsafe provider patterns", () => {
  const baseProvider = {
    id: "sample",
    name: "Sample Provider",
    type: "psychologist",
    region: "Auckland",
    city: "Auckland",
    address: "",
    phone: "09 000 0000",
    text: "",
    email: "",
    website: "https://example.org",
    cost: "Ask about fees.",
    tags: ["psychologist", "direct-contact"],
    fit: "Public listing.",
    firstStep: "Ask about fit.",
    source: "https://example.org",
    verified: "2026-05",
    lastVerified: "2026-05",
    confidence: "medium",
    sourceQuality: "provider-owned page",
    needsManualVerification: true,
    needScope: []
  };

  const report = auditProviders([
    {
      ...baseProvider,
      id: "bad-sexual-harm",
      tags: ["psychologist", "sexual-harm", "sensitive-claims", "depression", "direct-contact"],
      fit: "Rape and sexual abuse counselling. ACC Sensitive Claims counselling for victims and survivors of sexual harm.",
      needScope: []
    },
    {
      ...baseProvider,
      id: "bad-rehab",
      tags: ["psychologist", "rehabilitation", "acc", "concussion", "depression", "anxiety", "direct-contact"],
      fit: "ACC rehabilitation, concussion, pain, and return to work assessment.",
      needScope: []
    },
    {
      ...baseProvider,
      id: "bad-national-clinician",
      region: "National",
      city: "Aotearoa New Zealand",
      tags: ["psychologist", "depression", "direct-contact"],
      fit: "In-person psychology practice.",
      needScope: []
    },
    {
      ...baseProvider,
      id: "bad-directory",
      type: "directory",
      tags: ["directory", "direct-contact"],
      fit: "Directory of services.",
      website: "https://example.org/directory",
      phone: "09 111 1111",
      email: "hello@example.org",
      needScope: []
    }
  ], [], { generatedAt: "2026-05-25T00:00:00.000Z" });

  const rules = report.findings.map((finding) => `${finding.providerId}:${finding.rule}:${finding.severity}`);
  assert.ok(rules.includes("bad-sexual-harm:sexual-harm-overbroad:high"));
  assert.ok(rules.includes("bad-rehab:narrow-rehab-overbroad-tags:high"));
  assert.ok(rules.includes("bad-national-clinician:national-clinician-no-telehealth:high"));
  assert.ok(rules.includes("bad-directory:directory-treated-direct:high"));
  assert.equal(report.summary.highUnallowlisted, 4);
});

test("source-fit allowlist suppresses reviewed high-severity exceptions only", () => {
  const report = auditProviders([
    {
      id: "reviewed-directory",
      name: "Reviewed Directory",
      type: "directory",
      region: "National",
      city: "Aotearoa New Zealand",
      phone: "0800 000 000",
      email: "",
      website: "https://example.org/directory",
      tags: ["directory"],
      needScope: [],
      source: "https://example.org/directory"
    }
  ], [{
    id: "reviewed-directory",
    rule: "directory-treated-direct",
    reason: "Navigation phone retained but UI treats this as a directory.",
    reviewedBy: "test",
    reviewedDate: "2026-05-25",
    expiryDate: "2026-08-25"
  }], { generatedAt: "2026-05-25T00:00:00.000Z" });

  assert.equal(report.summary.high, 1);
  assert.equal(report.summary.highUnallowlisted, 0);
  assert.equal(report.summary.allowlisted, 1);
});

test("all current region filters have useful visible direct contacts", () => {
  for (const region of expectedRegions) {
    assert.ok(visibleMatches({ region }).length >= 5, `${region} should have at least five visible direct contacts`);
  }
});

test("location filtering only returns the selected region or confirmed national-reach providers", () => {
  for (const region of expectedRegions) {
    const offRegion = visibleMatches({ region })
      .filter((provider) => provider.region !== region && !hasNationalServiceReach(provider))
      .map((provider) => `${provider.id}:${provider.region}`);

    assert.deepEqual(offRegion, []);
  }

  assert.equal(visibleMatches({ region: "South Canterbury" }).some((provider) => provider.id === "canterbury-mens-centre"), false);
});

test("individual psychologists are not treated as nationally available without confirmed telehealth", () => {
  const alex = providers.find((provider) => provider.id === "nzccp-alex-richards");
  assert.ok(alex);
  assert.equal(alex.region, "Canterbury");
  assert.equal(isTelehealthProvider(alex), false);
  assert.equal(hasNationalServiceReach(alex), false);

  const westCoastPsychologists = visibleMatches({
    region: "West Coast",
    type: "psychologist",
    needs: ["depression"]
  });

  assert.equal(westCoastPsychologists.some((provider) => provider.id === "nzccp-alex-richards"), false);
});

test("exact professional filters do not substitute unrelated provider types", () => {
  for (const region of ["Auckland", "Canterbury", "Otago", "Wellington"]) {
    for (const type of exactTypes) {
      const matches = visibleMatches({ region, type });
      assert.ok(matches.length > 0, `${region} should have at least one ${type} or valid counsellor adjunct result`);
      const invalid = matches.filter((provider) => {
        if (type === "counsellor") return !["counsellor", "mens-centre"].includes(provider.type);
        if (type === "psychiatrist") return provider.type !== "psychiatrist" && !provider.tags?.includes("psychiatry-service");
        return provider.type !== type;
      });
      assert.deepEqual(invalid.map((provider) => `${provider.id}:${provider.type}`), []);
    }
  }
});

test("psychiatrist filters may include specialist public psychiatry services but not unrelated contacts", () => {
  for (const region of ["Rotorua and Taupo", "Tairawhiti", "Taranaki", "Wairarapa"]) {
    const matches = visibleMatches({ region, type: "psychiatrist" });
    assert.ok(matches.length > 0, `${region} should have a psychiatrist or specialist psychiatry-service pathway`);
    const unrelated = matches.filter((provider) =>
      provider.type !== "psychiatrist" && !provider.tags?.includes("psychiatry-service")
    );
    assert.deepEqual(unrelated.map((provider) => `${provider.id}:${provider.type}`), []);
  }
});

test("opt-in cultural providers stay hidden unless selected", () => {
  const general = visibleMatches({ region: "Auckland", type: "counsellor" });
  const asianSelected = visibleMatches({ region: "Auckland", type: "counsellor", preferences: ["asian"] });

  assert.equal(general.some((provider) => provider.id === "national-asian-family-services"), false);
  assert.equal(asianSelected.some((provider) => provider.id === "national-asian-family-services"), true);
});

test("telehealth psychologist preference has multiple direct online options", () => {
  const matches = visibleMatches({
    region: "Otago",
    type: "psychologist",
    preferences: ["telehealth"]
  }).filter((provider) => provider.region === "National" && provider.tags?.includes("telehealth"));

  assert.ok(matches.length >= 3, "telehealth psychologist searches should not collapse to one online clinician");
});

test("telehealth preference can use online providers outside the entered region", () => {
  const matches = visibleMatches({
    region: "West Coast",
    type: "psychiatrist",
    preferences: ["telehealth"]
  });

  assert.ok(matches.some((provider) => provider.id === "bay-of-plenty-anteris-private-psychiatry"));
});

test("Xtrapsychplus is scoped to sexual harm counselling, not broad psychology", () => {
  const provider = providers.find((item) => item.id === "northland-xtrapsychplus");
  assert.ok(provider);
  assert.equal(provider.type, "counsellor");
  assert.equal(provider.phone, "");
  assert.equal(provider.address, "");
  assert.equal(provider.tags.includes("psychologist"), false);
  assert.equal(provider.tags.includes("neuropsychology"), false);
  assert.deepEqual(provider.needScope, ["trauma"]);
  assert.equal(/neuropsychology|psychological services|mental injury/i.test(provider.fit), false);
  assert.match(provider.fit, /sexual harm counselling/i);
});

test("clinician-led practice records can display the clinician above the practice", () => {
  const provider = providers.find((item) => item.id === "hawkes-bay-alive-psychology");
  assert.ok(provider);
  assert.equal(provider.clinicianName, "Bhavna Nagar");
  assert.equal(provider.practiceName, "Alive! Psychological Services");
  assert.equal(provider.email, "bhavna@alivepsych.co.nz");
});

test("rehabilitation psychology is scoped away from general low-mood searches", () => {
  const provider = providers.find((item) => item.id === "west-coast-proactive-greymouth-psychology");
  assert.ok(provider);
  assert.equal(provider.type, "psychologist");
  assert.deepEqual(provider.needScope, ["work"]);
  assert.equal(provider.tags.includes("depression"), false);
  assert.equal(provider.tags.includes("anxiety"), false);
  assert.match(provider.fit, /occupational health and rehabilitation/i);
  assert.equal(/general mental health psychology/i.test(provider.fit), false);
});

test("need-scoped sexual harm services do not rank for unrelated concern selections", () => {
  const anxietyMatches = visibleMatches({
    region: "Northland",
    type: "counsellor",
    needs: ["anxiety"]
  });
  const traumaMatches = visibleMatches({
    region: "Northland",
    type: "counsellor",
    needs: ["trauma"]
  });

  assert.equal(anxietyMatches.some((provider) => provider.id === "northland-xtrapsychplus"), false);
  assert.equal(traumaMatches.some((provider) => provider.id === "northland-xtrapsychplus"), true);
});

test("need-scoped rehabilitation services do not rank for unrelated low-mood searches", () => {
  const depressionMatches = visibleMatches({
    region: "West Coast",
    type: "psychologist",
    needs: ["depression"]
  });
  const workMatches = visibleMatches({
    region: "West Coast",
    type: "psychologist",
    needs: ["work"]
  });

  assert.equal(depressionMatches.some((provider) => provider.id === "west-coast-proactive-greymouth-psychology"), false);
  assert.equal(workMatches.some((provider) => provider.id === "west-coast-proactive-greymouth-psychology"), true);
});

test("provider records used for contact have safe public contact fields", () => {
  const missing = providers
    .filter((provider) => !isDirectoryLike(provider))
    .filter((provider) => !hasContact(provider))
    .map((provider) => provider.id);

  assert.deepEqual(missing, []);
});

test("every provider has launch verification metadata", () => {
  const missing = providers
    .filter((provider) => !provider.source || !provider.confidence || !provider.sourceQuality || !provider.lastVerified || typeof provider.needsManualVerification !== "boolean" || !Array.isArray(provider.needScope))
    .map((provider) => provider.id);

  const invalidConfidence = providers
    .filter((provider) => !["high", "medium", "low"].includes(provider.confidence))
    .map((provider) => `${provider.id}:${provider.confidence}`);

  const missingAvailability = providers
    .filter((provider) => !provider.availabilityStatus || !provider.availabilityCheckedAt || !provider.availabilitySource || typeof provider.availabilityNeedsManualReview !== "boolean")
    .map((provider) => provider.id);

  const invalidAvailability = providers
    .filter((provider) => !["accepting", "waitlist", "not_accepting", "referrals_paused", "unknown", "not_published"].includes(provider.availabilityStatus))
    .map((provider) => `${provider.id}:${provider.availabilityStatus}`);

  assert.deepEqual(missing, []);
  assert.deepEqual(invalidConfidence, []);
  assert.deepEqual(missingAvailability, []);
  assert.deepEqual(invalidAvailability, []);
});

test("privacy, disclaimer, correction, and crisis links are visible from the home page", () => {
  for (const href of ["privacy.html", "terms.html", "data-sources.html", "crisis.html"]) {
    assert.match(indexHtml, new RegExp(`href="${href}"`));
  }

  assert.match(indexHtml, /Report a correction/i);
  assert.match(indexHtml, /Soft launch pilot/i);
  assert.match(indexHtml, /Provider database last updated/i);
});

test("public pages include the Shielded Site widget assets", () => {
  const shieldedScript = fs.readFileSync("assets/shielded-site.js", "utf8");
  assert.match(shieldedScript, /https:\/\/staticcdn\.co\.nz\/embed\/embed\.js/, "Shielded Site initializer should load the official embed script");
  assert.match(shieldedScript, /https:\/\/shielded\.co\.nz\/img\/custom-logo\.png/, "Shielded Site initializer should use the official button logo");

  for (const pagePath of publicHtmlPages) {
    const html = fs.readFileSync(pagePath, "utf8");
    assert.match(html, /href="assets\/shielded-site\.css"/, `${pagePath} should load Shielded Site styles`);
    assert.match(html, /src="assets\/shielded-site\.js"/, `${pagePath} should initialise the Shielded Site button`);
  }
});
