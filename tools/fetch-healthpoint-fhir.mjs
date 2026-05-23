import fs from "node:fs";

const [, , outputPath = "healthpoint-provider-bundle.json"] = process.argv;

const apiUrl = process.env.HEALTHPOINT_API_URL;
const apiToken = process.env.HEALTHPOINT_API_TOKEN;
const maxPages = Number(process.env.HEALTHPOINT_API_MAX_PAGES || 100);

if (!apiUrl) {
  console.error("Usage: HEALTHPOINT_API_URL=<fhir-url> [HEALTHPOINT_API_TOKEN=<token>] node tools/fetch-healthpoint-fhir.mjs [output.json]");
  console.error("");
  console.error("This fetches an approved Healthpoint HL7 FHIR API/export endpoint and saves the Bundle for tools/import-provider-fhir.mjs.");
  console.error("Do not use this against public Healthpoint web pages or scraped search URLs.");
  process.exit(1);
}

const headers = {
  accept: "application/fhir+json, application/json"
};

if (apiToken) headers.authorization = `Bearer ${apiToken}`;

async function fetchBundle(url) {
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Healthpoint API request failed: ${response.status} ${response.statusText}`);
  }

  const bundle = await response.json();

  if (bundle.resourceType !== "Bundle") {
    throw new Error(`Expected a FHIR Bundle but received ${bundle.resourceType || "unknown JSON"}`);
  }

  return bundle;
}

function nextLink(bundle) {
  return (bundle.link || []).find((link) => link.relation === "next")?.url || "";
}

const firstBundle = await fetchBundle(apiUrl);
const merged = {
  ...firstBundle,
  entry: [...(firstBundle.entry || [])],
  link: (firstBundle.link || []).filter((link) => link.relation !== "next"),
  meta: {
    ...(firstBundle.meta || {}),
    fetchedAt: new Date().toISOString()
  }
};

let pages = 1;
let next = nextLink(firstBundle);

while (next && pages < maxPages) {
  const page = await fetchBundle(new URL(next, apiUrl).toString());
  merged.entry.push(...(page.entry || []));
  pages += 1;
  next = nextLink(page);
}

if (next) {
  throw new Error(`Stopped after ${maxPages} FHIR pages; increase HEALTHPOINT_API_MAX_PAGES to fetch the full result set.`);
}

fs.writeFileSync(outputPath, `${JSON.stringify(merged, null, 2)}\n`);
console.log(`Saved Healthpoint FHIR Bundle to ${outputPath}.`);
console.log(`Fetched ${pages} page(s), ${merged.entry.length} resource entries.`);
console.log("Next: node tools/import-provider-fhir.mjs " + outputPath);
