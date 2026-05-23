import fs from "node:fs";

const [, , providersPath = "providers.json", ...flags] = process.argv;
const strict = flags.includes("--strict");
const providers = JSON.parse(fs.readFileSync(providersPath, "utf8"));
const distanceWeightedTypes = new Set([
  "gp",
  "counsellor",
  "psychologist",
  "psychiatrist",
  "mens-centre",
  "youth",
  "addiction",
  "public-service"
]);

function hasCoords(provider) {
  return provider.lat !== undefined && provider.lon !== undefined && provider.lat !== "" && provider.lon !== "";
}

function isRemote(provider) {
  const text = `${provider.name || ""} ${provider.address || ""} ${(provider.tags || []).join(" ")}`.toLowerCase();
  return /telehealth|online|phone|video|national/.test(text);
}

const ranked = providers.filter((provider) => distanceWeightedTypes.has(provider.type));
const byType = new Map();

for (const provider of ranked) {
  const bucket = byType.get(provider.type) || {
    total: 0,
    withAddress: 0,
    withCoords: 0,
    remote: 0,
    missingAddress: [],
    missingCoords: []
  };

  bucket.total += 1;
  if (provider.address) bucket.withAddress += 1;
  if (hasCoords(provider)) bucket.withCoords += 1;
  if (isRemote(provider)) bucket.remote += 1;
  if (!provider.address && !isRemote(provider)) bucket.missingAddress.push(provider);
  if (provider.address && !hasCoords(provider) && !isRemote(provider)) bucket.missingCoords.push(provider);
  byType.set(provider.type, bucket);
}

console.log("Provider address and coordinate coverage");

for (const [type, bucket] of [...byType.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  console.log(`${type}: total=${bucket.total} address=${bucket.withAddress} coords=${bucket.withCoords} remote=${bucket.remote}`);
  for (const provider of bucket.missingAddress.slice(0, 5)) {
    console.log(`  MISSING_ADDRESS ${provider.id} ${provider.name}`);
  }
  for (const provider of bucket.missingCoords.slice(0, 5)) {
    console.log(`  MISSING_COORDS ${provider.id} ${provider.name}`);
  }
}

const strictFailures = [...byType.values()]
  .flatMap((bucket) => [...bucket.missingAddress, ...bucket.missingCoords]);

if (strict && strictFailures.length) {
  process.exitCode = 1;
}
