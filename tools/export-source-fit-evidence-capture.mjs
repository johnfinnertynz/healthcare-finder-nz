import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { fetchPublicSource } from "./lib/source-fetcher.mjs";
import {
  excerptAround,
  extractProviderEvidence,
  stripHtml
} from "./lib/provider-evidence-extractor.mjs";
import {
  sourceOwnerTypeFromQuality,
  sourceTypeFromUrl
} from "./lib/provider-evidence-scorer.mjs";

const DEFAULTS = {
  providers: "providers.json",
  sourceFitAudit: "data/provider-source-fit-audit.json",
  jsonOut: "data/provider-source-fit-evidence-capture.json",
  csvOut: "data/provider-source-fit-evidence-capture.csv",
  mdOut: "PROVIDER_SOURCE_FIT_EVIDENCE_CAPTURE.md",
  limit: Infinity,
  rateLimitMs: 1500,
  maxBytes: 750_000,
  noNetwork: false,
  rule: ""
};

const CAPTURE_RULES = new Set([
  "broad-tag-without-source-support",
  "weak-maori-evidence",
  "weak-pasifika-evidence",
  "weak-asian-evidence",
  "weak-rainbow-evidence",
  "weak-telehealth-evidence"
]);

const TAG_PATTERNS = {
  depression: /\b(depression|depressive|low mood|mood disorder|mood disorders)\b/i,
  anxiety: /\b(anxiety|panic|overwhelm|ocd|obsessive-compulsive|worry)\b/i,
  trauma: /\b(trauma|ptsd|post-traumatic|sexual harm|sexual abuse|sensitive claims|emdr)\b/i,
  addiction: /\b(addiction|alcohol|drug|gambling|aod|substance)\b/i,
  work: /\b(work stress|burnout|workplace|employment|return to work|vocational|study stress|housing stress|money stress)\b/i,
  maori: /\b(maori|kaupapa|whanau|whanau|iwi|marae|tangata whenua|takatapui|ngati)\b/i,
  pasifika: /\b(pasifika|pacific|samoan|tongan|cook islands|fijian|vaka|fono)\b/i,
  asian: /\b(asian|chinese|korean|indian|mandarin|cantonese|hindi|japanese|vietnamese|filipino|thai)\b/i,
  rainbow: /\b(rainbow|lgbt|lgbtq|lgbtqia|gender diverse|transgender|gay|lesbian|bisexual|intersex)\b/i,
  telehealth: /\b(telehealth|online appointments?|video appointments?|phone appointments?|zoom|remote sessions?|virtual appointments?|online sessions?)\b/i
};

function parseArgs(argv = process.argv.slice(2)) {
  const config = { ...DEFAULTS };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--providers") config.providers = argv[++index];
    else if (arg === "--source-fit-audit") config.sourceFitAudit = argv[++index];
    else if (arg === "--json-out") config.jsonOut = argv[++index];
    else if (arg === "--csv-out") config.csvOut = argv[++index];
    else if (arg === "--md-out") config.mdOut = argv[++index];
    else if (arg === "--limit") config.limit = Number(argv[++index]);
    else if (arg === "--rate-limit-ms") config.rateLimitMs = Number(argv[++index]);
    else if (arg === "--max-bytes") config.maxBytes = Number(argv[++index]);
    else if (arg === "--rule") config.rule = argv[++index];
    else if (arg === "--no-network") config.noNetwork = true;
  }
  return config;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null && String(value).trim() !== ""))];
}

function compact(value, max = 260) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function targetFromFinding(finding) {
  const rule = finding.rule || "";
  if (rule === "broad-tag-without-source-support") {
    return finding.issue?.match(/"([^"]+)"/)?.[1] || "";
  }
  const supportMatch = rule.match(/^weak-(maori|pasifika|asian|rainbow)-evidence$/);
  if (supportMatch) return supportMatch[1];
  if (rule === "weak-telehealth-evidence") return "telehealth";
  return "";
}

function sourceUrlFor(provider, finding) {
  return finding.source || provider.source || provider.website || provider.bookingUrl || "";
}

function issueKey(finding) {
  return [finding.providerId, finding.rule, targetFromFinding(finding)].join("|");
}

function relevantFindings(findings, config) {
  const seen = new Set();
  const filtered = [];
  for (const finding of findings) {
    if (!CAPTURE_RULES.has(finding.rule)) continue;
    if (config.rule && finding.rule !== config.rule) continue;
    const target = targetFromFinding(finding);
    if (!target) continue;
    const key = issueKey(finding);
    if (seen.has(key)) continue;
    seen.add(key);
    filtered.push(finding);
  }
  return Number.isFinite(config.limit) ? filtered.slice(0, Math.max(0, config.limit)) : filtered;
}

function claimsSupporting(claims, target) {
  const wanted = target === "telehealth" ? new Set(["telehealth", "online"]) : new Set([target]);
  return claims.filter((claim) => {
    if (!["tags", "advertisedSpecialties", "services", "specialties", "patientGroups", "ageGroups", "cost"].includes(claim.field)) return false;
    return asArray(claim.value).some((value) => wanted.has(String(value).toLowerCase()));
  });
}

function textEvidence(text, target, sourceUrl, capturedAt) {
  const pattern = TAG_PATTERNS[target];
  if (!pattern || !pattern.test(text)) return null;
  return {
    field: target === "telehealth" ? "telehealth" : "tags",
    value: target,
    sourceUrl,
    sourceType: sourceTypeFromUrl(sourceUrl),
    excerpt: excerptAround(text, pattern),
    capturedAt,
    confidence: "medium",
    extractor: "source-fit-evidence-capture",
    needsManualReview: true
  };
}

function proposedRemoval(provider, target) {
  const correctedFields = {};
  if (target === "telehealth") {
    const nextTags = asArray(provider.tags).filter((tag) => !["telehealth", "online"].includes(String(tag).toLowerCase()));
    if (nextTags.length !== asArray(provider.tags).length) correctedFields.tags = nextTags;
    if (provider.onlineAvailable === true) correctedFields.onlineAvailable = false;
    if (provider.phoneSupport === true) correctedFields.phoneSupport = false;
    return correctedFields;
  }

  const nextTags = asArray(provider.tags).filter((tag) => String(tag).toLowerCase() !== target);
  if (nextTags.length !== asArray(provider.tags).length) correctedFields.tags = nextTags;
  const nextNeedScope = asArray(provider.needScope).filter((value) => String(value).toLowerCase() !== target);
  if (nextNeedScope.length !== asArray(provider.needScope).length) correctedFields.needScope = nextNeedScope;
  const nextAdvertised = asArray(provider.advertisedSpecialties).filter((value) => String(value).toLowerCase() !== target);
  if (nextAdvertised.length !== asArray(provider.advertisedSpecialties).length) correctedFields.advertisedSpecialties = nextAdvertised;
  return correctedFields;
}

function captureStatus({ fetchResult, evidence }) {
  if (!fetchResult) return "not_fetched";
  if (fetchResult.ok && evidence.length) return "source_support_found";
  if (fetchResult.ok) return "safe_removal_candidate";
  if (fetchResult.blocked) return "needs_human_browser_review";
  if (fetchResult.skipped) return "source_skipped";
  return "fetch_failed";
}

async function fetchOnce(cache, url, options) {
  if (cache.has(url)) return cache.get(url);
  const result = await options.fetcher(url, options);
  cache.set(url, result);
  if (options.rateLimitMs > 0) await delay(options.rateLimitMs);
  return result;
}

export async function buildSourceFitEvidenceCapture(config = {}) {
  const merged = { ...DEFAULTS, ...config };
  const providers = readJson(merged.providers);
  const providerById = new Map(providers.map((provider) => [provider.id, provider]));
  const audit = readJson(merged.sourceFitAudit);
  const findings = relevantFindings(asArray(audit.findings || audit), merged);
  const fetcher = merged.fetcher || fetchPublicSource;
  const fetchCache = new Map();
  const items = [];

  for (const finding of findings) {
    const provider = providerById.get(finding.providerId);
    if (!provider) {
      items.push({
        providerId: finding.providerId,
        providerName: finding.providerName || "",
        rule: finding.rule,
        target: targetFromFinding(finding),
        status: "provider_missing",
        reviewCategory: "source-fit evidence capture",
        reviewPriority: finding.severity === "high" ? "high" : "medium",
        issue: finding.issue || "",
        sourceUrl: finding.source || "",
        evidence: [],
        correctedFields: {}
      });
      continue;
    }

    const target = targetFromFinding(finding);
    const sourceUrl = sourceUrlFor(provider, finding);
    let fetchResult = null;
    let evidence = [];
    let sourceText = "";

    if (!merged.noNetwork && sourceUrl) {
      fetchResult = await fetchOnce(fetchCache, sourceUrl, {
        ...merged,
        fetcher,
        timeoutMs: merged.timeoutMs || 12_000,
        maxBytes: merged.maxBytes || 750_000
      });
      if (fetchResult.ok) {
        sourceText = stripHtml(fetchResult.text || "");
        const claims = extractProviderEvidence({
          html: fetchResult.text || "",
          url: fetchResult.finalUrl || sourceUrl,
          sourceType: sourceTypeFromUrl(fetchResult.finalUrl || sourceUrl),
          capturedAt: fetchResult.capturedAt,
          region: provider.region,
          city: provider.city,
          type: provider.type
        });
        evidence = [
          ...claimsSupporting(claims, target),
          textEvidence(sourceText, target, fetchResult.finalUrl || sourceUrl, fetchResult.capturedAt)
        ].filter(Boolean);
      }
    }

    const status = captureStatus({ fetchResult, evidence });
    const correctedFields = status === "safe_removal_candidate" ? proposedRemoval(provider, target) : {};
    items.push({
      reviewId: `source-fit-capture:${provider.id}:${finding.rule}:${target}`,
      providerId: provider.id,
      providerName: provider.name,
      name: provider.name,
      type: provider.type,
      region: provider.region,
      city: provider.city,
      address: provider.address || "",
      phone: provider.phone || "",
      text: provider.text || "",
      email: provider.email || "",
      website: provider.website || "",
      source: provider.source || "",
      sourceQuality: provider.sourceQuality || "",
      confidence: provider.confidence || "",
      tags: asArray(provider.tags),
      needScope: asArray(provider.needScope),
      rule: finding.rule,
      target,
      status,
      reviewCategory: "source-fit evidence capture",
      reviewPriority: finding.severity === "high" ? "high" : "medium",
      auditSeverity: finding.severity || "medium",
      auditRules: ["source-fit evidence capture", finding.rule, status],
      sourceUrl,
      sourceUrls: unique([sourceUrl, provider.website, provider.source]),
      sourceType: sourceTypeFromUrl(sourceUrl),
      sourceOwnerType: sourceOwnerTypeFromQuality(provider.sourceQuality, sourceUrl),
      issue: finding.issue || "",
      suggestedFix: finding.suggestedFix || "",
      auditIssues: [finding.issue || ""].filter(Boolean),
      suggestedFixes: [finding.suggestedFix || ""].filter(Boolean),
      reviewReasons: unique([
        finding.issue,
        finding.suggestedFix,
        status === "safe_removal_candidate" ? "Reachable source did not show wording for the flagged claim." : "",
        status === "source_support_found" ? "Source wording was captured; human reviewer still needs to confirm this claim." : ""
      ]),
      sourceCheckedAt: fetchResult?.capturedAt || "",
      fetchStatus: fetchResult ? {
        ok: fetchResult.ok,
        blocked: fetchResult.blocked,
        skipped: fetchResult.skipped,
        status: fetchResult.status,
        error: fetchResult.error || "",
        finalUrl: fetchResult.finalUrl || sourceUrl,
        sourceHash: fetchResult.sourceHash || ""
      } : {
        ok: false,
        blocked: false,
        skipped: true,
        status: 0,
        error: merged.noNetwork ? "no-network" : "missing-source-url",
        finalUrl: sourceUrl,
        sourceHash: ""
      },
      evidence,
      sourceEvidence: {
        sourceFitCapture: evidence
      },
      evidenceSummary: evidence.length
        ? unique(evidence.map((item) => compact(item.excerpt, 180))).join(" | ")
        : "",
      correctedFields,
      prefillCorrectedFields: correctedFields,
      sourceCapture: {
        status,
        error: fetchResult?.error || "",
        finalUrl: fetchResult?.finalUrl || sourceUrl
      },
      claimField: target === "telehealth" ? "telehealth" : "tags",
      claimValue: target,
      claimDecision: "review",
      claimRiskLevel: finding.severity === "high" ? "high" : "medium",
      claimReason: finding.issue || "",
      requiredHumanAction: status === "safe_removal_candidate"
        ? "Review the source, then use Adjust to remove the unsupported tag or telehealth flags if the missing evidence is confirmed."
        : status === "source_support_found"
          ? "Review the captured excerpt, then keep the claim only if the wording is current and actually applies to this provider."
          : "Open the source manually or leave this as needs_more_info.",
      publicCardPreviewText: [
        `${provider.name} | ${provider.type} | ${provider.region}${provider.city ? ` / ${provider.city}` : ""}`,
        finding.issue || "",
        evidence.length ? `Captured evidence: ${unique(evidence.map((item) => compact(item.excerpt, 140))).join(" | ")}` : "No supporting source wording captured.",
        Object.keys(correctedFields).length ? `Prefilled conservative correction: ${JSON.stringify(correctedFields)}` : ""
      ].filter(Boolean).join("\n"),
      currentProvider: provider,
      suggestedDecision: status === "source_support_found"
        ? "needs human confirmation: add source evidence or leave current tag with review note"
        : status === "safe_removal_candidate"
          ? "review-gated adjust: remove unsupported matching tag/flags"
          : "needs_more_info",
      publicSafetyNote: status === "safe_removal_candidate"
        ? "The source was reachable but this tool did not find wording for the flagged claim. Removing it would make public matching less certain, not more certain, but still requires reviewer approval."
        : "No live provider data changed."
    });
  }

  const summary = {
    findingsConsidered: findings.length,
    sourceSupportFound: items.filter((item) => item.status === "source_support_found").length,
    safeRemovalCandidates: items.filter((item) => item.status === "safe_removal_candidate").length,
    needsHumanBrowserReview: items.filter((item) => item.status === "needs_human_browser_review").length,
    fetchFailed: items.filter((item) => item.status === "fetch_failed").length,
    sourceSkipped: items.filter((item) => item.status === "source_skipped").length,
    notFetched: items.filter((item) => item.status === "not_fetched").length,
    byRule: items.reduce((counts, item) => {
      counts[item.rule] = (counts[item.rule] || 0) + 1;
      return counts;
    }, {}),
    byStatus: items.reduce((counts, item) => {
      counts[item.status] = (counts[item.status] || 0) + 1;
      return counts;
    }, {})
  };

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    safety: {
      noLiveProviderMutation: true,
      reviewGatedCorrectionsOnly: true,
      noAcceptingFromSilence: true,
      noSensitiveTagAutoApproval: true,
      weakOrBlockedSourcesNeedHumanReview: true
    },
    input: {
      sourceFitAudit: merged.sourceFitAudit,
      limit: merged.limit,
      rule: merged.rule || "",
      noNetwork: merged.noNetwork
    },
    summary,
    items
  };
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join("; ") : typeof value === "object" && value !== null ? JSON.stringify(value) : String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(filePath, items) {
  const headers = [
    "reviewId",
    "providerId",
    "providerName",
    "type",
    "region",
    "rule",
    "target",
    "status",
    "sourceUrl",
    "evidenceSummary",
    "suggestedDecision",
    "correctedFields"
  ];
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${[
    headers.join(","),
    ...items.map((item) => headers.map((header) => csvEscape(item[header])).join(","))
  ].join("\n")}\n`);
}

function writeMarkdown(filePath, output) {
  const lines = [
    "# Provider Source-Fit Evidence Capture",
    "",
    `Generated: ${output.generatedAt}`,
    "",
    "This report fetches public source pages for selected source-fit findings and captures short evidence excerpts. It does not change `providers.json`.",
    "",
    "## Summary",
    "",
    `- Findings considered: ${output.summary.findingsConsidered}`,
    `- Source support found: ${output.summary.sourceSupportFound}`,
    `- Safe removal candidates: ${output.summary.safeRemovalCandidates}`,
    `- Needs human browser review: ${output.summary.needsHumanBrowserReview}`,
    `- Fetch failed: ${output.summary.fetchFailed}`,
    `- Source skipped/not fetched: ${output.summary.sourceSkipped + output.summary.notFetched}`,
    "",
    "## Status Counts",
    "",
    "| Status | Count |",
    "| --- | ---: |"
  ];
  for (const [status, count] of Object.entries(output.summary.byStatus)) {
    lines.push(`| ${status} | ${count} |`);
  }
  lines.push("", "## Review Items", "", "| Status | Provider | Rule | Target | Evidence / action |", "| --- | --- | --- | --- | --- |");
  for (const item of output.items.slice(0, 80)) {
    const evidence = item.evidenceSummary || item.suggestedDecision || item.fetchStatus?.error || "";
    lines.push(`| ${item.status} | ${item.providerId} | ${item.rule} | ${item.target} | ${compact(evidence, 180).replace(/\|/g, "\\|")} |`);
  }
  lines.push(
    "",
    "## Safety Notes",
    "",
    "- Source support found is not an automatic approval. A reviewer must confirm the excerpt matches the current provider and field.",
    "- Safe removal candidates are review-gated downgrades only. They remove unsupported tags or telehealth flags; they do not add new capability claims.",
    "- Blocked, skipped, failed, or missing sources should remain `needs_more_info` or go to human browser review."
  );
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

export function writeSourceFitEvidenceCapture(output, config = {}) {
  const merged = { ...DEFAULTS, ...config };
  writeJson(merged.jsonOut, output);
  writeCsv(merged.csvOut, output.items);
  writeMarkdown(merged.mdOut, output);
}

export async function runCli(argv = process.argv.slice(2)) {
  const config = parseArgs(argv);
  const output = await buildSourceFitEvidenceCapture(config);
  writeSourceFitEvidenceCapture(output, config);
  console.log(`Source-fit evidence capture: ${output.summary.findingsConsidered} finding(s), ${output.summary.sourceSupportFound} supported, ${output.summary.safeRemovalCandidates} safe removal candidate(s).`);
  console.log(`JSON: ${path.resolve(config.jsonOut)}`);
  console.log(`CSV: ${path.resolve(config.csvOut)}`);
  console.log(`Markdown: ${path.resolve(config.mdOut)}`);
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runCli();
}
