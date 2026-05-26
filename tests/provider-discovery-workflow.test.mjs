import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { auditProviders } from "../tools/audit-provider-source-fit.mjs";
import { buildProviderReviewQueue } from "../tools/export-provider-review-queue.mjs";
import { buildProviderSuggestions } from "../tools/build-provider-suggestions.mjs";
import { buildRoundOneQueries, buildSnowballQueries, enrichProviderCandidates } from "../tools/enrich-provider-candidates.mjs";
import { extractProviderEvidence } from "../tools/lib/provider-evidence-extractor.mjs";
import { fetchPublicSource } from "../tools/lib/source-fetcher.mjs";
import { withPsychiatristScopeMetadata } from "../tools/lib/provider-scope.mjs";
import {
  confidenceByField,
  evidenceItem,
  sourceEvidenceShape,
  unique
} from "../tools/lib/provider-evidence-scorer.mjs";

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "care-finder-discovery-"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function claim(field, value, sourceType = "provider_owned", sourceUrl = "https://exampleclinic.nz", excerpt = "") {
  return evidenceItem({
    field,
    value,
    sourceUrl,
    sourceType,
    excerpt: excerpt || `${field}: ${value}`,
    capturedAt: "2026-05-26T00:00:00.000Z",
    confidence: sourceType === "search_result" || sourceType === "linkedIn_public" ? "low" : "high",
    extractor: "test",
    needsManualReview: sourceType === "search_result" || sourceType === "linkedIn_public"
  });
}

function node(candidateId, claims, extras = {}) {
  const byField = confidenceByField(claims);
  const valuesFor = (field) => unique(claims.filter((item) => item.field === field).map((item) => item.value));
  const conflicts = Object.entries(byField)
    .filter(([, value]) => value.conflicts?.length > 1)
    .map(([field, value]) => ({ field, values: value.conflicts }));
  return {
    candidateId,
    possibleProviderIds: extras.possibleProviderIds || [],
    names: valuesFor("name"),
    clinicianNames: valuesFor("clinicianName"),
    practiceNames: valuesFor("practiceName"),
    sourceUrls: unique(claims.map((item) => item.sourceUrl)),
    sourceTypes: unique(claims.map((item) => item.sourceType)),
    addresses: valuesFor("address"),
    phones: valuesFor("phone"),
    emails: valuesFor("email"),
    websites: valuesFor("website"),
    cities: valuesFor("city"),
    regions: valuesFor("region"),
    types: valuesFor("type"),
    claims,
    confidenceByField: byField,
    corroborationScore: extras.corroborationScore ?? 0.6,
    conflicts,
    needsManualReview: true,
    suggestedProviderRecord: {
      id: candidateId,
      name: valuesFor("name")[0] || valuesFor("practiceName")[0] || valuesFor("clinicianName")[0],
      clinicianName: valuesFor("clinicianName")[0] || "",
      practiceName: valuesFor("practiceName")[0] || "",
      type: valuesFor("type")[0] || "",
      region: valuesFor("region")[0] || "",
      city: valuesFor("city")[0] || "",
      address: valuesFor("address")[0] || "",
      phone: valuesFor("phone")[0] || "",
      email: valuesFor("email")[0] || "",
      website: valuesFor("website")[0] || "",
      source: unique(claims.map((item) => item.sourceUrl))[0] || "",
      availabilityStatus: valuesFor("availabilityStatus")[0] || "not_published",
      referralType: valuesFor("referralType")[0] || "",
      tags: valuesFor("tags"),
      advertisedSpecialties: valuesFor("advertisedSpecialties"),
      sourceEvidence: sourceEvidenceShape(claims),
      confidenceByField: byField,
      needsManualVerification: true
    },
    suggestedPatchForExistingProvider: {},
    reviewReasons: extras.reviewReasons || []
  };
}

function suggestionsFor(nodes, providers = []) {
  const dir = tempDir();
  const graphPath = path.join(dir, "graph.json");
  const providersPath = path.join(dir, "providers.json");
  writeJson(graphPath, { nodes });
  writeJson(providersPath, providers);
  return buildProviderSuggestions({
    graph: graphPath,
    providers: providersPath,
    jsonOut: path.join(dir, "suggestions.json"),
    csvOut: path.join(dir, "suggestions.csv"),
    mdOut: path.join(dir, "suggestions.md")
  });
}

test("snowball search creates second-round queries from found clinician, practice, address, and domain data", () => {
  const seedQueries = buildRoundOneQueries({
    seedId: "seed-1",
    city: "Whangarei",
    region: "Northland",
    providerType: "psychologist",
    knownClinicianName: "Aroha Smith",
    knownPracticeName: "North Clinic",
    knownAddress: "10 Bank Street Whangarei"
  }).map((item) => item.query);
  assert(seedQueries.some((query) => query.includes("Whangarei psychologist")));
  assert(seedQueries.some((query) => query.includes("site:healthpoint.co.nz")));

  const snowball = buildSnowballQueries({
    clinicianNames: ["Aroha Smith"],
    practiceNames: ["North Clinic"],
    addresses: ["10 Bank Street Whangarei"],
    phones: ["09 123 4567"],
    emails: ["hello@northclinic.nz"],
    websites: ["https://northclinic.nz"],
    cities: ["Whangarei"],
    regions: ["Northland"],
    types: ["psychologist"],
    sourceTypes: ["healthpoint"]
  }, 2).map((item) => item.query);
  assert(snowball.some((query) => query.includes("Aroha Smith North Clinic")));
  assert(snowball.some((query) => query.includes("northclinic.nz Aroha Smith")));
  assert(snowball.some((query) => query.includes("10 Bank Street Whangarei psychologist")));
});

test("LinkedIn public source is corroboration only, not sole source for specialties or availability", () => {
  const output = suggestionsFor([
    node("candidate-linkedin", [
      claim("clinicianName", "Taylor Lee", "linkedIn_public", "https://www.linkedin.com/in/taylor-lee", "Clinical psychologist at Example Clinic"),
      claim("type", "psychologist", "linkedIn_public", "https://www.linkedin.com/in/taylor-lee"),
      claim("advertisedSpecialties", "anxiety", "linkedIn_public", "https://www.linkedin.com/in/taylor-lee"),
      claim("availabilityStatus", "accepting", "linkedIn_public", "https://www.linkedin.com/in/taylor-lee")
    ])
  ]);
  const suggestion = output.suggestions[0];
  assert.equal(suggestion.action, "needs_manual_research");
  assert(suggestion.reviewReasons.some((reason) => /LinkedIn/.test(reason)));
  assert.notEqual(suggestion.suggestedProviderRecord.availabilityStatus, "accepting");
});

test("search-result snippet alone cannot create a live provider suggestion", () => {
  const output = suggestionsFor([
    node("candidate-snippet", [
      claim("name", "Snippet Psychology", "search_result", "https://www.google.com/search?q=snippet", "Snippet Psychology - counsellor in Dunedin"),
      claim("type", "psychologist", "search_result", "https://www.google.com/search?q=snippet")
    ])
  ]);
  assert.equal(output.suggestions[0].action, "needs_manual_research");
});

test("provider-owned page plus directory corroborates contact data", () => {
  const output = suggestionsFor([
    node("candidate-corroborated", [
      claim("name", "Harbour Psychology", "provider_owned", "https://harbourpsych.nz"),
      claim("type", "psychologist", "provider_owned", "https://harbourpsych.nz"),
      claim("phone", "03 555 1111", "provider_owned", "https://harbourpsych.nz"),
      claim("phone", "03 555 1111", "professional_directory", "https://www.psychologytoday.com/nz/counselling/harbour"),
      claim("website", "https://harbourpsych.nz", "provider_owned", "https://harbourpsych.nz")
    ], { corroborationScore: 0.9 })
  ]);
  const suggestion = output.suggestions[0];
  assert.equal(suggestion.action, "add_new_provider");
  assert.equal(suggestion.confidenceByField.phone.confidence, "high");
});

test("conflicting addresses create manual review rather than overwrite", () => {
  const output = suggestionsFor([
    node("candidate-conflict", [
      claim("name", "Conflict Clinic"),
      claim("type", "counsellor"),
      claim("address", "1 Queen Street Auckland", "provider_owned", "https://conflict.nz"),
      claim("address", "2 Queen Street Auckland", "healthpoint", "https://www.healthpoint.co.nz/conflict")
    ])
  ]);
  assert.equal(output.suggestions[0].action, "needs_manual_research");
  assert(output.suggestions[0].conflicts.some((conflict) => conflict.field === "address"));
});

test("candidate identity matching avoids merging different clinicians at the same clinic", async () => {
  const dir = tempDir();
  const seedFile = path.join(dir, "seeds.json");
  const providersPath = path.join(dir, "providers.json");
  writeJson(seedFile, {
    generatedAt: "2026-05-26T00:00:00.000Z",
    seeds: [
      { seedId: "one", knownClinicianName: "Alex One", knownPracticeName: "Shared Clinic", knownWebsite: "https://sharedclinic.nz", providerType: "psychologist", region: "Canterbury", city: "Christchurch", priority: 90 },
      { seedId: "two", knownClinicianName: "Blair Two", knownPracticeName: "Shared Clinic", knownWebsite: "https://sharedclinic.nz", providerType: "psychologist", region: "Canterbury", city: "Christchurch", priority: 90 }
    ]
  });
  writeJson(providersPath, []);
  const output = await enrichProviderCandidates({
    seedFile,
    providers: providersPath,
    noNetwork: true,
    dryRun: true,
    limit: 2
  });
  assert.equal(output.candidates.length, 2);
  assert.deepEqual(output.candidates.map((candidate) => candidate.clinicianNames[0]).sort(), ["Alex One", "Blair Two"]);
});

test("broad psychologist and counsellor tags still require source evidence", () => {
  const report = auditProviders([{
    id: "psych-unsupported",
    name: "Unsupported Psychologist",
    type: "psychologist",
    region: "Auckland",
    city: "Auckland",
    website: "https://example.nz",
    source: "https://example.nz",
    sourceQuality: "provider-owned page",
    tags: ["psychologist", "depression"],
    needScope: [],
    fit: "Provides appointments.",
    firstStep: "Contact the practice."
  }], [], { generatedAt: "2026-05-26T00:00:00.000Z" });
  assert(report.findings.some((finding) => finding.rule === "broad-tag-without-source-support"));
});

test("psychiatrist baselineScope does not become advertisedSpecialties", () => {
  const psychiatrist = withPsychiatristScopeMetadata({
    id: "psych-md",
    name: "Dr Baseline",
    type: "psychiatrist",
    fit: "General psychiatrist.",
    source: "https://examplepsychiatry.nz",
    website: "https://examplepsychiatry.nz",
    specialties: []
  });
  assert(psychiatrist.baselineScope.includes("depression/mood disorders"));
  assert.deepEqual(psychiatrist.advertisedSpecialties, []);
  assert(!psychiatrist.baselineScopeNote.includes("specialises"));
});

test("sexual-harm specialist scope requires explicit source wording before broad ranking", () => {
  const report = auditProviders([{
    id: "sexual-harm-only",
    name: "Sensitive Claims Counselling",
    type: "counsellor",
    region: "Auckland",
    city: "Auckland",
    website: "https://example.nz",
    source: "https://example.nz",
    sourceQuality: "provider-owned page",
    tags: ["counsellor", "sexual-harm", "depression"],
    needScope: [],
    fit: "Rape and sexual abuse counselling. ACC Sensitive Claims counselling for victims and survivors of sexual harm.",
    firstStep: "Contact the practice."
  }], [], { generatedAt: "2026-05-26T00:00:00.000Z" });
  assert(report.findings.some((finding) => finding.rule === "sexual-harm-overbroad"));
});

test("not accepting or waitlist wording creates availability metadata or a watchlist suggestion", () => {
  const claims = extractProviderEvidence({
    html: "<html><body><h1>Closed Clinic</h1><p>We are not currently taking new clients.</p></body></html>",
    url: "https://closedclinic.nz",
    sourceType: "provider_owned",
    type: "psychologist",
    city: "Nelson",
    region: "Nelson Marlborough Tasman",
    capturedAt: "2026-05-26T00:00:00.000Z"
  });
  assert(claims.some((item) => item.field === "availabilityStatus" && item.value === "not_accepting"));
  const output = suggestionsFor([node("candidate-closed", [
    ...claims,
    claim("type", "psychologist"),
    claim("website", "https://closedclinic.nz")
  ])]);
  assert.equal(output.suggestions[0].action, "move_to_watchlist");
});

test("accepting availability is not inferred from silence", () => {
  const claims = extractProviderEvidence({
    html: "<html><body><h1>Quiet Clinic</h1><p>Psychology appointments and therapy.</p></body></html>",
    url: "https://quietclinic.nz",
    sourceType: "provider_owned",
    type: "psychologist",
    capturedAt: "2026-05-26T00:00:00.000Z"
  });
  assert(!claims.some((item) => item.field === "availabilityStatus" && item.value === "accepting"));
});

test("psychiatry self-referral is not inferred from contact details alone", () => {
  const output = suggestionsFor([
    node("candidate-psychiatry-contact", [
      claim("name", "Contact Psychiatry"),
      claim("type", "psychiatrist"),
      claim("phone", "04 555 1212"),
      claim("website", "https://contactpsychiatry.nz"),
      claim("referralType", "self", "search_result", "https://www.google.com/search?q=contact+psychiatry", "Book online")
    ])
  ]);
  const suggestion = output.suggestions[0];
  assert.equal(suggestion.suggestedProviderRecord.referralType, "unknown");
  assert(suggestion.reviewReasons.some((reason) => /self-referral/.test(reason)));
});

test("discovery suggestions feed the provider review queue", () => {
  const dir = tempDir();
  const providersPath = path.join(dir, "providers.json");
  const suggestionsPath = path.join(dir, "suggestions.json");
  writeJson(providersPath, []);
  writeJson(suggestionsPath, suggestionsFor([
    node("candidate-review", [
      claim("name", "Review Clinic"),
      claim("type", "psychologist"),
      claim("phone", "09 222 3333"),
      claim("website", "https://reviewclinic.nz")
    ])
  ]));
  const queue = buildProviderReviewQueue({
    providers: providersPath,
    providerSuggestions: suggestionsPath,
    skipAuditRun: true,
    jsonOut: path.join(dir, "queue.json"),
    csvOut: path.join(dir, "queue.csv"),
    mdOut: path.join(dir, "queue.md")
  });
  assert(queue.items.some((item) => item.reviewId.startsWith("discovery:")));
});

test("generated suggested patches include source evidence", () => {
  const existing = [{
    id: "existing-clinic",
    name: "Existing Clinic",
    type: "psychologist",
    phone: "03 000 0000",
    website: "https://existing.nz",
    source: "https://existing.nz",
    tags: []
  }];
  const output = suggestionsFor([
    node("candidate-existing", [
      claim("name", "Existing Clinic"),
      claim("type", "psychologist"),
      claim("phone", "03 999 9999"),
      claim("website", "https://existing.nz")
    ], { possibleProviderIds: ["existing-clinic"] })
  ], existing);
  const suggestion = output.suggestions[0];
  assert.equal(suggestion.action, "update_existing_provider");
  assert.equal(suggestion.suggestedPatchForExistingProvider.phone, "03 999 9999");
  assert(suggestion.sourceEvidence.contact.length >= 1);
});

test("suggestion building does not mutate providers.json without reviewed apply flow", () => {
  const dir = tempDir();
  const providersPath = path.join(dir, "providers.json");
  const graphPath = path.join(dir, "graph.json");
  const providers = [{ id: "stable", name: "Stable Clinic", type: "psychologist", phone: "01", website: "https://stable.nz" }];
  writeJson(providersPath, providers);
  writeJson(graphPath, { nodes: [node("candidate-stable", [claim("name", "New Clinic"), claim("type", "psychologist"), claim("phone", "02"), claim("website", "https://new.nz")])] });
  const before = fs.readFileSync(providersPath, "utf8");
  buildProviderSuggestions({ graph: graphPath, providers: providersPath });
  const after = fs.readFileSync(providersPath, "utf8");
  assert.equal(after, before);
});

test("fetcher records blocked or skipped pages without guessing", async () => {
  const result = await fetchPublicSource("https://www.google.com/search?q=psychologist");
  assert.equal(result.ok, false);
  assert.equal(result.skipped, true);
  assert.match(result.reason || result.error, /search-result|Search result pages/);
});
