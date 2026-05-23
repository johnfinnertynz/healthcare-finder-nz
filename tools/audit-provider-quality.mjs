import fs from "node:fs";

const [, , providersPath = "providers.json"] = process.argv;
const providers = JSON.parse(fs.readFileSync(providersPath, "utf8"));
const now = new Date();
const directTypes = new Set(["gp", "counsellor", "psychologist", "psychiatrist"]);

function monthAge(value) {
  if (!/^\d{4}-\d{2}$/.test(value || "")) return Infinity;
  const [year, month] = value.split("-").map(Number);
  return (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month);
}

function hasContact(provider) {
  return Boolean(provider.phone || provider.text || provider.email || provider.website);
}

const directCare = providers.filter((provider) => directTypes.has(provider.type));
const missingContact = directCare.filter((provider) => !hasContact(provider));
const stale = directCare.filter((provider) => monthAge(provider.verified) > 6);
const directoryLikeDirectCare = directCare.filter((provider) => provider.tags?.includes("directory"));
const gpDirectories = providers.filter((provider) => provider.tags?.includes("directory") && provider.tags?.includes("gp") && provider.type === "gp");

console.log(`Providers: ${providers.length}`);
console.log(`Direct care records: ${directCare.length}`);
console.log(`Missing contact details: ${missingContact.length}`);
console.log(`Verification older than 6 months/missing: ${stale.length}`);
console.log(`Directory-like records in direct-care types: ${directoryLikeDirectCare.length}`);
console.log(`GP directories incorrectly typed as GP: ${gpDirectories.length}`);

for (const provider of missingContact) {
  console.log(`MISSING_CONTACT ${provider.id} ${provider.name}`);
}

for (const provider of stale) {
  console.log(`STALE_VERIFY ${provider.id} ${provider.name} verified=${provider.verified || "missing"}`);
}

for (const provider of directoryLikeDirectCare) {
  console.log(`DIRECTORY_LIKE ${provider.id} ${provider.name}`);
}

for (const provider of gpDirectories) {
  console.log(`GP_DIRECTORY_TYPED_AS_GP ${provider.id} ${provider.name}`);
}

process.exitCode = missingContact.length || stale.length || directoryLikeDirectCare.length || gpDirectories.length ? 1 : 0;
