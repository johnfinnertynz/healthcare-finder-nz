import { geocodeProviderFile } from "./lib/provider-geocoder.mjs";

const args = process.argv.slice(2);
const flags = args.filter((arg) => arg.startsWith("--"));
const positional = args.filter((arg) => !arg.startsWith("--"));
const [providersPath = "providers.json", configPath = "provider-sources.json"] = positional;
const limitFlag = flags.find((flag) => flag.startsWith("--limit="));
const limit = limitFlag ? Number(limitFlag.slice("--limit=".length)) : Infinity;
const dryRun = flags.includes("--dry-run");

const summary = await geocodeProviderFile(providersPath, {
  configPath,
  limit,
  dryRun,
  failSoft: false
});

for (const line of summary.logs) {
  console.log(line);
}

console.log(`Checked ${summary.checked} addresses. Updated ${summary.updated}. No match ${summary.noMatch}. Failed ${summary.failed}. Skipped ${summary.skipped}.`);
