import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULTS = {
  providers: "providers.json",
  sourceFitAudit: "data/provider-source-fit-audit.json",
  availabilityAudit: "data/provider-availability-audit.json",
  referralAudit: "data/provider-psychiatrist-referral-audit.json",
  gpCorroborationQueue: "data/gp-source-corroboration-queue.json",
  monitorQueue: "data/provider-monitor-queue.json",
  watchlist: "data/monitors/provider-availability-watchlist.json",
  jsonOut: "data/regional-data-quality-report.json",
  mdOut: "REGIONAL_DATA_QUALITY_REPORT.md"
};

const EXPECTED_LOCAL_REGIONS = [
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

const DIRECT_TYPES = new Set([
  "gp",
  "counsellor",
  "psychologist",
  "psychiatrist",
  "mens-centre",
  "youth",
  "addiction",
  "public-service"
]);

const RESTRICTIVE_AVAILABILITY = new Set(["not_accepting", "referrals_paused"]);

function parseArgs(argv = process.argv.slice(2)) {
  const config = { ...DEFAULTS };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--providers") config.providers = argv[++index];
    else if (arg === "--source-fit-audit") config.sourceFitAudit = argv[++index];
    else if (arg === "--availability-audit") config.availabilityAudit = argv[++index];
    else if (arg === "--referral-audit") config.referralAudit = argv[++index];
    else if (arg === "--gp-corroboration-queue") config.gpCorroborationQueue = argv[++index];
    else if (arg === "--monitor-queue") config.monitorQueue = argv[++index];
    else if (arg === "--watchlist") config.watchlist = argv[++index];
    else if (arg === "--json-out") config.jsonOut = argv[++index];
    else if (arg === "--md-out") config.mdOut = argv[++index];
  }
  return config;
}

function readJsonIfExists(input, fallback) {
  if (Array.isArray(input) || (input && typeof input === "object")) return input;
  if (!input || !fs.existsSync(input)) return fallback;
  return JSON.parse(fs.readFileSync(input, "utf8"));
}

function readProviders(input) {
  if (Array.isArray(input)) return input;
  if (!input || !fs.existsSync(input)) throw new Error(`Provider file not found: ${input || "(missing)"}`);
  return JSON.parse(fs.readFileSync(input, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(filePath, value) {
  const directory = path.dirname(filePath);
  if (directory && directory !== ".") fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(filePath, value);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function compact(value, max = 220) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function countBy(items, getter) {
  return items.reduce((counts, item) => {
    const key = getter(item) || "unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null && String(value).trim() !== ""))];
}

function hasCoords(provider) {
  return provider.lat !== undefined
    && provider.lon !== undefined
    && provider.lat !== ""
    && provider.lon !== ""
    && !Number.isNaN(Number(provider.lat))
    && !Number.isNaN(Number(provider.lon));
}

function isRemote(provider) {
  const text = [
    provider.name,
    provider.region,
    provider.city,
    provider.address,
    provider.website,
    provider.fit,
    provider.firstStep,
    ...(provider.tags || [])
  ].join(" ").toLowerCase();
  return provider.onlineAvailable === true
    || provider.phoneSupport === true
    || /telehealth|online|video|phone appointment|remote|virtual|national/.test(text);
}

function isDirectoryLike(provider) {
  return provider.type === "directory" || provider.tags?.includes("directory");
}

function hasPublicContact(provider) {
  return Boolean(provider.phone || provider.text || provider.email || provider.website || provider.bookingUrl);
}

function isDirectCare(provider) {
  return DIRECT_TYPES.has(provider.type)
    && !isDirectoryLike(provider)
    && !provider.crisisOnly
    && !RESTRICTIVE_AVAILABILITY.has(provider.availabilityStatus)
    && hasPublicContact(provider);
}

function isLocalDirectCare(provider) {
  return isDirectCare(provider) && provider.region !== "National" && !isRemote(provider);
}

function itemRegion(item = {}) {
  return item.region || item.providerRegion || "Unknown";
}

function severityCounts(findings) {
  return {
    total: findings.length,
    high: findings.filter((finding) => finding.severity === "high").length,
    highUnallowlisted: findings.filter((finding) => finding.severity === "high" && !finding.allowlisted).length,
    highAllowlisted: findings.filter((finding) => finding.severity === "high" && finding.allowlisted).length,
    medium: findings.filter((finding) => finding.severity === "medium").length,
    low: findings.filter((finding) => finding.severity === "low").length,
    byRule: countBy(findings, (finding) => finding.rule)
  };
}

function regionBucket(region) {
  return {
    region,
    providers: [],
    directCare: [],
    localDirectCare: [],
    sourceFitFindings: [],
    availabilityFindings: [],
    referralFindings: [],
    gpCorroborationTasks: [],
    monitorItems: [],
    watchlistItems: []
  };
}

function addByRegion(buckets, region, field, value) {
  const key = region || "Unknown";
  if (!buckets.has(key)) buckets.set(key, regionBucket(key));
  buckets.get(key)[field].push(value);
}

function coverageSignals(localDirect) {
  const byType = countBy(localDirect, (provider) => provider.type);
  const talkingTherapy = (byType.counsellor || 0) + (byType.psychologist || 0);
  const publicMentalHealth = localDirect.filter((provider) =>
    provider.type === "public-service"
    && /mental|mha|community|psych/i.test(`${provider.name || ""} ${provider.fit || ""} ${(provider.tags || []).join(" ")}`)
  ).length;

  return {
    byType,
    gp: byType.gp || 0,
    counsellor: byType.counsellor || 0,
    psychologist: byType.psychologist || 0,
    talkingTherapy,
    psychiatrist: byType.psychiatrist || 0,
    youth: byType.youth || 0,
    addiction: byType.addiction || 0,
    publicMentalHealth
  };
}

function missingCoverage(signals) {
  const missing = [];
  if (signals.gp < 1) missing.push("local GP contact");
  if (signals.talkingTherapy < 1) missing.push("local counselling/psychology contact");
  if (signals.psychologist < 1) missing.push("local psychologist");
  if (signals.psychiatrist < 1) missing.push("local psychiatrist or psychiatry pathway");
  if (signals.youth < 1) missing.push("local youth/rangatahi support");
  if (signals.addiction < 1) missing.push("local addiction support");
  if (signals.publicMentalHealth < 1) missing.push("local public mental health pathway");
  return missing;
}

function providerReviewSamples(bucket) {
  const samples = [];
  const seen = new Set();
  function add(provider, reason) {
    if (!provider?.id || seen.has(provider.id)) return;
    seen.add(provider.id);
    samples.push({
      providerId: provider.id,
      name: provider.name || "",
      type: provider.type || "",
      city: provider.city || "",
      reason
    });
  }

  const providerMap = new Map(bucket.providers.map((provider) => [provider.id, provider]));
  for (const task of bucket.gpCorroborationTasks.slice(0, 3)) {
    add(providerMap.get(task.providerId) || task, "GP source corroboration");
  }
  for (const finding of bucket.sourceFitFindings.slice(0, 5)) {
    add(providerMap.get(finding.providerId), finding.rule || "source-fit finding");
  }
  for (const provider of bucket.directCare.filter((item) => !item.address && !isRemote(item)).slice(0, 3)) {
    add(provider, "missing address");
  }
  for (const provider of bucket.directCare.filter((item) => item.address && !hasCoords(item) && !isRemote(item)).slice(0, 3)) {
    add(provider, "missing coordinates");
  }
  return samples.slice(0, 8);
}

function recommendedActions({ region, coverage, missing, sourceFit, gpTasks, availability, referral, watchlist, address }) {
  const actions = [];
  if (region === "National") {
    if (sourceFit.medium || sourceFit.low || sourceFit.highUnallowlisted) {
      actions.push("Review national fallback records for overbroad tags, weak source evidence, or directory/direct-contact confusion.");
    }
    if (availability.total || referral.total || watchlist.length) {
      actions.push("Check national fallback availability, referral, and watchlist items before they are used as safety-net options.");
    }
    if (address.missingAddress || address.missingCoords) {
      actions.push("Resolve any national-record address fields that are accidentally being treated as local distance-ranking signals.");
    }
    actions.push("Keep national services as reviewed fallback options, not substitutes for local direct-care coverage.");
    return actions.slice(0, 6);
  }

  if (missing.includes("local GP contact")) {
    actions.push("Find or verify at least one local GP clinic with practice-owned or official contact evidence.");
  } else if (gpTasks.length) {
    actions.push(`Corroborate ${gpTasks.length} GP record${gpTasks.length === 1 ? "" : "s"} against practice-owned, Healthpoint, PHO, HPI, or approved FHIR sources.`);
  }
  if (coverage.talkingTherapy < 1) actions.push("Research local counsellor, therapist, or psychologist contacts before relying on directory fallback.");
  else if (coverage.psychologist < 1) actions.push("Look for source-backed local psychologist records or document the best nearby/telehealth fallback.");
  if (coverage.psychiatrist < 1) actions.push("Find the clearest local psychiatry referral pathway and capture whether GP referral is required.");
  if (coverage.youth < 1) actions.push("Add or verify a youth/rangatahi support pathway for this region.");
  if (coverage.addiction < 1) actions.push("Add or verify alcohol, drug, or gambling support options for this region.");
  if (coverage.publicMentalHealth < 1) actions.push("Add or verify the public mental health/community team entry for the region.");
  if (sourceFit.highUnallowlisted) actions.push(`Resolve ${sourceFit.highUnallowlisted} unallowlisted high source-fit finding${sourceFit.highUnallowlisted === 1 ? "" : "s"} before launch changes.`);
  else if (sourceFit.medium) actions.push(`Review ${sourceFit.medium} medium source-fit finding${sourceFit.medium === 1 ? "" : "s"} for overbroad tags, directories, or weak support-preference evidence.`);
  if (availability.total || referral.total || watchlist.length) actions.push("Check availability/referral/watchlist items so unavailable or GP-referral services do not lead first recommendations.");
  if (address.missingAddress || address.missingCoords) actions.push("Resolve address and coordinate gaps that affect distance ranking.");
  if (!actions.length && region !== "National") actions.push("Keep routine verification current and prioritise any newly discovered source conflicts.");
  if (!actions.length) actions.push("Maintain national fallback records as reviewed support, not substitutes for local coverage.");
  return actions.slice(0, 6);
}

function priorityScoreFor({ localDirectCount, missing, sourceFit, gpTasks, availability, referral, watchlist, address, needsManualVerification }) {
  let score = 0;
  if (localDirectCount < 5) score += 45;
  else if (localDirectCount < 10) score += 20;

  for (const gap of missing) {
    if (/GP|counselling|psychology/.test(gap)) score += 35;
    else if (/psychiatrist/.test(gap)) score += 25;
    else score += 12;
  }

  score += Math.min(sourceFit.highUnallowlisted * 30, 90);
  score += Math.min(sourceFit.highAllowlisted * 6, 24);
  score += Math.min(sourceFit.medium * 2, 60);
  score += Math.min(sourceFit.low * 0.5, 20);
  score += Math.min(gpTasks.length * 3, 60);
  score += Math.min(availability.total * 10, 40);
  score += Math.min(referral.total * 10, 30);
  score += Math.min(watchlist.length * 3, 25);
  score += Math.min((address.missingAddress + address.missingCoords) * 2, 45);
  score += Math.min(needsManualVerification * 0.25, 30);
  return Math.round(score);
}

function priorityLevel(score) {
  if (score >= 90) return "high";
  if (score >= 45) return "medium";
  return "low";
}

function addressSignals(providers) {
  const weighted = providers.filter((provider) => DIRECT_TYPES.has(provider.type));
  const missingAddress = weighted.filter((provider) => !provider.address && !isRemote(provider)).length;
  const missingCoords = weighted.filter((provider) => provider.address && !hasCoords(provider) && !isRemote(provider)).length;
  return { missingAddress, missingCoords };
}

export function buildRegionalDataQualityReport(input = {}) {
  const generatedAt = input.generatedAt || new Date().toISOString();
  const providers = readProviders(input.providers ?? DEFAULTS.providers);
  const sourceFitAudit = readJsonIfExists(input.sourceFitAudit ?? DEFAULTS.sourceFitAudit, { findings: [] });
  const availabilityAudit = readJsonIfExists(input.availabilityAudit ?? DEFAULTS.availabilityAudit, { findings: [] });
  const referralAudit = readJsonIfExists(input.referralAudit ?? DEFAULTS.referralAudit, { findings: [] });
  const gpQueue = readJsonIfExists(input.gpCorroborationQueue ?? DEFAULTS.gpCorroborationQueue, { tasks: [] });
  const monitorQueue = readJsonIfExists(input.monitorQueue ?? DEFAULTS.monitorQueue, { items: [] });
  const watchlist = readJsonIfExists(input.watchlist ?? DEFAULTS.watchlist, { items: [] });

  const regions = unique([
    ...EXPECTED_LOCAL_REGIONS,
    ...providers.map((provider) => provider.region),
    ...asArray(sourceFitAudit.findings).map(itemRegion),
    ...asArray(availabilityAudit.findings).map(itemRegion),
    ...asArray(referralAudit.findings).map(itemRegion),
    ...asArray(gpQueue.tasks).map(itemRegion),
    ...asArray(monitorQueue.items).map(itemRegion),
    ...asArray(watchlist.items).map(itemRegion)
  ]).filter((region) => region !== "Unknown");

  const buckets = new Map(regions.map((region) => [region, regionBucket(region)]));
  for (const provider of providers) {
    addByRegion(buckets, provider.region || "Unknown", "providers", provider);
    if (isDirectCare(provider)) addByRegion(buckets, provider.region || "Unknown", "directCare", provider);
    if (isLocalDirectCare(provider)) addByRegion(buckets, provider.region || "Unknown", "localDirectCare", provider);
  }
  for (const finding of asArray(sourceFitAudit.findings)) addByRegion(buckets, itemRegion(finding), "sourceFitFindings", finding);
  for (const finding of asArray(availabilityAudit.findings)) addByRegion(buckets, itemRegion(finding), "availabilityFindings", finding);
  for (const finding of asArray(referralAudit.findings)) addByRegion(buckets, itemRegion(finding), "referralFindings", finding);
  for (const task of asArray(gpQueue.tasks)) addByRegion(buckets, itemRegion(task), "gpCorroborationTasks", task);
  for (const item of asArray(monitorQueue.items)) addByRegion(buckets, itemRegion(item), "monitorItems", item);
  for (const item of asArray(watchlist.items)) addByRegion(buckets, itemRegion(item), "watchlistItems", item);

  const regionReports = [...buckets.values()].map((bucket) => {
    const coverage = coverageSignals(bucket.localDirectCare);
    const missing = bucket.region === "National" ? [] : missingCoverage(coverage);
    const sourceFit = severityCounts(bucket.sourceFitFindings);
    const availability = severityCounts(bucket.availabilityFindings);
    const referral = severityCounts(bucket.referralFindings);
    const address = addressSignals(bucket.directCare);
    const needsManualVerification = bucket.providers.filter((provider) => provider.needsManualVerification).length;
    const thirdPartyOnlyGp = bucket.providers.filter((provider) =>
      provider.type === "gp" && /third-party|doctorpricer/i.test(`${provider.sourceQuality || ""} ${provider.importSource || ""} ${provider.source || ""}`)
    ).length;
    const score = priorityScoreFor({
      localDirectCount: bucket.localDirectCare.length,
      missing,
      sourceFit,
      gpTasks: bucket.gpCorroborationTasks,
      availability,
      referral,
      watchlist: bucket.watchlistItems,
      address,
      needsManualVerification
    });

    return {
      region: bucket.region,
      priorityLevel: priorityLevel(score),
      priorityScore: score,
      coverage: {
        totalProviders: bucket.providers.length,
        directCare: bucket.directCare.length,
        localDirectCare: bucket.localDirectCare.length,
        ...coverage,
        missingSignals: missing
      },
      qualitySignals: {
        sourceFit,
        availability,
        referral,
        gpCorroborationTasks: bucket.gpCorroborationTasks.length,
        monitorItems: bucket.monitorItems.length,
        watchlistItems: bucket.watchlistItems.length,
        missingAddress: address.missingAddress,
        missingCoords: address.missingCoords,
        needsManualVerification,
        thirdPartyOnlyGp
      },
      sampleProvidersNeedingReview: providerReviewSamples(bucket),
      recommendedActions: recommendedActions({
        region: bucket.region,
        coverage,
        missing,
        sourceFit,
        gpTasks: bucket.gpCorroborationTasks,
        availability,
        referral,
        watchlist: bucket.watchlistItems,
        address
      })
    };
  }).sort((a, b) =>
    b.priorityScore - a.priorityScore
    || a.region.localeCompare(b.region)
  );

  return {
    generatedAt,
    safety: {
      purpose: "Reviewer triage only. This report does not prove provider availability and must not mutate live provider data.",
      noLiveProviderMutation: true,
      reviewGateRequired: true
    },
    sources: {
      providers: input.providers ?? DEFAULTS.providers,
      sourceFitAudit: input.sourceFitAudit ?? DEFAULTS.sourceFitAudit,
      availabilityAudit: input.availabilityAudit ?? DEFAULTS.availabilityAudit,
      referralAudit: input.referralAudit ?? DEFAULTS.referralAudit,
      gpCorroborationQueue: input.gpCorroborationQueue ?? DEFAULTS.gpCorroborationQueue,
      monitorQueue: input.monitorQueue ?? DEFAULTS.monitorQueue,
      watchlist: input.watchlist ?? DEFAULTS.watchlist
    },
    summary: {
      regions: regionReports.length,
      highPriorityRegions: regionReports.filter((region) => region.priorityLevel === "high").length,
      mediumPriorityRegions: regionReports.filter((region) => region.priorityLevel === "medium").length,
      lowPriorityRegions: regionReports.filter((region) => region.priorityLevel === "low").length,
      topPriorities: regionReports.slice(0, 5).map((region) => ({
        region: region.region,
        priorityLevel: region.priorityLevel,
        priorityScore: region.priorityScore,
        firstAction: region.recommendedActions[0] || ""
      }))
    },
    regions: regionReports
  };
}

function markdownTable(rows) {
  return [
    "| Priority | Score | Region | Local direct | GP | Therapy | Psychologist | Psychiatrist | Youth | Addiction | Weak GP | Source-fit | Address gaps | First action |",
    "| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
    ...rows.map((region) => [
      region.priorityLevel,
      region.priorityScore,
      region.region,
      region.coverage.localDirectCare,
      region.coverage.gp,
      region.coverage.talkingTherapy,
      region.coverage.psychologist,
      region.coverage.psychiatrist,
      region.coverage.youth,
      region.coverage.addiction,
      region.qualitySignals.gpCorroborationTasks,
      region.qualitySignals.sourceFit.total,
      region.qualitySignals.missingAddress + region.qualitySignals.missingCoords,
      compact(region.recommendedActions[0] || "", 120)
    ].map((value) => String(value).replace(/\|/g, "/")).join(" | ").replace(/^/, "| ").replace(/$/, " |"))
  ].join("\n");
}

export function renderRegionalDataQualityMarkdown(report) {
  const lines = [
    "# Regional Data Quality Priority Report",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "This is a reviewer triage report only. It highlights where the database looks thin, weakly sourced, stale, or risky; it does not prove provider availability and it does not update live recommendations.",
    "",
    "## Summary",
    "",
    `- Regions reviewed: ${report.summary.regions}`,
    `- High priority: ${report.summary.highPriorityRegions}`,
    `- Medium priority: ${report.summary.mediumPriorityRegions}`,
    `- Low priority: ${report.summary.lowPriorityRegions}`,
    `- Live data mutation: ${report.safety.noLiveProviderMutation ? "none" : "unexpected"}`,
    "",
    "## Regional Priorities",
    "",
    markdownTable(report.regions),
    "",
    "## Region Detail"
  ];

  for (const region of report.regions) {
    lines.push(
      "",
      `### ${region.region}`,
      "",
      `Priority: ${region.priorityLevel} (${region.priorityScore})`,
      "",
      `Coverage: ${region.coverage.localDirectCare} local direct-care contacts, ${region.coverage.gp} GP, ${region.coverage.talkingTherapy} counselling/psychology, ${region.coverage.psychologist} psychologist, ${region.coverage.psychiatrist} psychiatrist, ${region.coverage.youth} youth, ${region.coverage.addiction} addiction.`,
      "",
      `Quality signals: ${region.qualitySignals.sourceFit.total} source-fit findings (${region.qualitySignals.sourceFit.highUnallowlisted} unallowlisted high), ${region.qualitySignals.gpCorroborationTasks} GP corroboration tasks, ${region.qualitySignals.availability.total} availability findings, ${region.qualitySignals.referral.total} referral findings, ${region.qualitySignals.missingAddress + region.qualitySignals.missingCoords} address/coordinate gaps.`,
      "",
      "Recommended next actions:"
    );
    for (const action of region.recommendedActions) lines.push(`- ${action}`);
    if (region.coverage.missingSignals.length) {
      lines.push("", `Missing coverage signals: ${region.coverage.missingSignals.join("; ")}.`);
    }
    if (region.sampleProvidersNeedingReview.length) {
      lines.push("", "Sample records to inspect:");
      for (const provider of region.sampleProvidersNeedingReview) {
        lines.push(`- ${provider.providerId} | ${provider.type} | ${provider.name} | ${provider.reason}`);
      }
    }
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

export function writeRegionalDataQualityReport(report, config = DEFAULTS) {
  writeJson(config.jsonOut || DEFAULTS.jsonOut, report);
  writeText(config.mdOut || DEFAULTS.mdOut, renderRegionalDataQualityMarkdown(report));
}

async function main() {
  const config = parseArgs();
  const report = buildRegionalDataQualityReport(config);
  writeRegionalDataQualityReport(report, config);
  console.log(`Regional data-quality report: ${report.summary.regions} regions; ${report.summary.highPriorityRegions} high priority.`);
  console.log(`Wrote ${path.resolve(config.jsonOut)} and ${path.resolve(config.mdOut)}.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
