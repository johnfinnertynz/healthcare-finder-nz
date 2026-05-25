import fs from "node:fs";
import { pathToFileURL } from "node:url";
import {
  inferReferralMetadata,
  isPsychiatryRecord,
  normaliseReferralConfidence,
  normaliseReferralType,
  referralEvidenceText
} from "./lib/provider-referrals.mjs";

const args = process.argv.slice(2);
const providersPath = args.find((arg) => !arg.startsWith("--")) || "providers.json";
const jsonOut = args[args.indexOf("--json-out") + 1] || "data/provider-psychiatrist-referral-audit.json";
const mdOut = args[args.indexOf("--md-out") + 1] || "PSYCHIATRIST_REFERRAL_AUDIT.md";

function issue(provider, rule, severity, message, suggestedAction) {
  return {
    providerId: provider.id,
    name: provider.name,
    region: provider.region,
    city: provider.city,
    referralType: provider.referralType || "",
    requiresReferral: provider.requiresReferral,
    sourceUrl: provider.referralSourceUrl || provider.source || provider.website || "",
    sourceExcerpt: provider.referralSourceExcerpt || "",
    confidence: provider.referralConfidence || "",
    needsManualReview: provider.referralNeedsManualReview,
    rule,
    severity,
    issue: message,
    suggestedAction
  };
}

export function auditPsychiatristReferrals(providers, { generatedAt = new Date().toISOString() } = {}) {
  const findings = [];
  const psychiatryRecords = providers.filter(isPsychiatryRecord);

  for (const provider of psychiatryRecords) {
    if (typeof provider.requiresReferral !== "boolean") {
      findings.push(issue(provider, "missing-requires-referral", "high", "Psychiatry record has no requiresReferral boolean.", "Add referral metadata from the provider source, or mark referralType unknown with manual review."));
    }
    if (!normaliseReferralType(provider.referralType)) {
      findings.push(issue(provider, "missing-referral-type", "high", "Psychiatry record has no valid referralType.", "Use gp, self, specialist, or unknown."));
    }
    if (!provider.referralSourceUrl || !/^https?:\/\//i.test(provider.referralSourceUrl)) {
      findings.push(issue(provider, "missing-referral-source", "high", "Referral source URL is missing or invalid.", "Link the source used for the referral judgement."));
    }
    if (!provider.referralSourceExcerpt) {
      findings.push(issue(provider, "missing-referral-excerpt", "medium", "Referral source excerpt is missing.", "Add a short source-backed note explaining the referral pathway."));
    }
    if (!normaliseReferralConfidence(provider.referralConfidence)) {
      findings.push(issue(provider, "missing-referral-confidence", "medium", "Referral confidence is missing or invalid.", "Use high, medium, or low."));
    }
    if (!/^\d{4}-\d{2}(-\d{2})?$/.test(provider.referralLastChecked || "")) {
      findings.push(issue(provider, "missing-referral-last-checked", "medium", "Referral last-checked date is missing or invalid.", "Add YYYY-MM or YYYY-MM-DD from the latest source check."));
    }
    if (typeof provider.referralNeedsManualReview !== "boolean") {
      findings.push(issue(provider, "missing-referral-manual-review", "medium", "Referral manual-review flag is missing.", "Set true unless source evidence is explicit and current."));
    }

    const text = referralEvidenceText(provider);
    const inferred = inferReferralMetadata(provider, { checkedAt: provider.referralLastChecked || "2026-05" });
    if (inferred.referralType === "gp" && provider.referralType && provider.referralType !== "gp") {
      findings.push(issue(provider, "gp-evidence-mismatch", "high", "Stored source text points to GP referral, but referralType is not gp.", "Change referralType to gp unless newer source evidence contradicts it."));
    }
    if (provider.referralType === "self" && /\bmust\s+first\s+see\s+(?:your\s+)?gp\b|\bgp\s+referral\s+(?:is\s+)?(?:required|needed)\b/i.test(text)) {
      findings.push(issue(provider, "self-referral-contradicted", "high", "Record says self-referral, but source text mentions GP referral.", "Review the source and avoid presenting direct contact as the main step."));
    }
    if (provider.referralType === "unknown" && provider.referralNeedsManualReview !== true) {
      findings.push(issue(provider, "unknown-without-review", "medium", "Unknown referral status is not marked for manual review.", "Keep unknown status visible but queue it for provider/source verification."));
    }
    if ((provider.referralType === "gp" || provider.requiresReferral === true) && /\b(email|call|contact)\b.{0,40}\b(practice|provider|psychiatrist)\b/i.test(provider.firstStep || "")) {
      findings.push(issue(provider, "gp-referral-direct-first-step", "medium", "GP-referral provider still has a direct-contact first step.", "Rewrite firstStep so the main action is booking with a GP and bringing the psychiatrist details."));
    }
  }

  const summary = {
    generatedAt,
    providersScanned: providers.length,
    psychiatryRecords: psychiatryRecords.length,
    high: findings.filter((finding) => finding.severity === "high").length,
    medium: findings.filter((finding) => finding.severity === "medium").length,
    low: findings.filter((finding) => finding.severity === "low").length
  };

  return { summary, findings };
}

function mdReport(report) {
  const lines = [
    "# Psychiatrist Referral Audit",
    "",
    `Generated: ${report.summary.generatedAt}`,
    "",
    `Scanned ${report.summary.psychiatryRecords} psychiatry records from ${report.summary.providersScanned} providers.`,
    "",
    `Findings: ${report.summary.high} high, ${report.summary.medium} medium, ${report.summary.low} low.`,
    "",
    "## Findings",
    ""
  ];

  if (!report.findings.length) {
    lines.push("No referral metadata findings.");
    return `${lines.join("\n")}\n`;
  }

  for (const finding of report.findings) {
    lines.push(
      `### ${finding.severity.toUpperCase()}: ${finding.name}`,
      "",
      `- Provider id: ${finding.providerId}`,
      `- Region/city: ${finding.region} / ${finding.city}`,
      `- Referral type: ${finding.referralType || "(missing)"}`,
      `- Requires referral: ${String(finding.requiresReferral)}`,
      `- Source: ${finding.sourceUrl || "(missing)"}`,
      `- Issue: ${finding.issue}`,
      `- Suggested action: ${finding.suggestedAction}`,
      ""
    );
  }

  return `${lines.join("\n")}\n`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const providers = JSON.parse(fs.readFileSync(providersPath, "utf8"));
  const report = auditPsychiatristReferrals(providers);

  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(jsonOut, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(mdOut, mdReport(report));

  console.log(`Audited ${report.summary.psychiatryRecords} psychiatry records. High: ${report.summary.high}. Medium: ${report.summary.medium}. Low: ${report.summary.low}.`);
  process.exitCode = report.summary.high ? 1 : 0;
}
