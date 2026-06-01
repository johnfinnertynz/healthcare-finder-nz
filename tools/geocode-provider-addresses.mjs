import { geocodeProviderFile } from "./lib/provider-geocoder.mjs";

const args = process.argv.slice(2);
const positional = [];
const options = {
  limit: Infinity,
  dryRun: false,
  failSoft: false,
  providerIds: null
};

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--dry-run") {
    options.dryRun = true;
  } else if (arg === "--fail-soft") {
    options.failSoft = true;
  } else if (arg === "--limit") {
    options.limit = Number(args[index + 1]);
    index += 1;
  } else if (arg.startsWith("--limit=")) {
    options.limit = Number(arg.slice("--limit=".length));
  } else if (arg === "--provider-id") {
    options.providerIds = [...(options.providerIds || []), args[index + 1]];
    index += 1;
  } else if (arg.startsWith("--provider-id=")) {
    options.providerIds = [...(options.providerIds || []), arg.slice("--provider-id=".length)];
  } else if (arg === "--provider-ids") {
    options.providerIds = [...(options.providerIds || []), ...String(args[index + 1] || "").split(",")];
    index += 1;
  } else if (arg.startsWith("--provider-ids=")) {
    options.providerIds = [...(options.providerIds || []), ...arg.slice("--provider-ids=".length).split(",")];
  } else {
    positional.push(arg);
  }
}

const [providersPath = "providers.json", configPath = "provider-sources.json"] = positional;

const summary = await geocodeProviderFile(providersPath, {
  configPath,
  limit: Number.isFinite(options.limit) ? options.limit : Infinity,
  dryRun: options.dryRun,
  failSoft: options.failSoft,
  providerIds: options.providerIds?.map((id) => id.trim()).filter(Boolean)
});

for (const line of summary.logs) {
  console.log(line);
}

console.log(`Checked ${summary.checked} addresses. Updated ${summary.updated}. No match ${summary.noMatch}. Outside NZ ${summary.outsideNz}. Failed ${summary.failed}. Skipped ${summary.skipped}.`);
