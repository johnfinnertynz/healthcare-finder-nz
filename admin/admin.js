const QUEUE_SOURCES = {
  review: {
    url: "../data/provider-review-queue.json",
    help: "Manual review queue: first-pass data corrections before public recommendations change.",
    itemName: "review item(s)"
  },
  claims: {
    url: "../data/provider-claim-review-queue.json",
    help: "Claim review queue: field-level evidence tasks grouped into batches so repeated source/risk issues can be reviewed faster.",
    itemName: "claim review item(s)"
  },
  gp: {
    url: "../data/gp-source-corroboration-queue.json",
    help: "GP source corroboration: focused checks for DoctorPricer/third-party GP records that need stronger practice-owned, Healthpoint, PHO, HPI, or official source evidence.",
    itemName: "GP source task(s)"
  },
  auto: {
    url: "../data/provider-auto-resolution-proposals.json",
    help: "Auto-resolution proposals: advisory-only groups for de-prioritising safe low-risk checks and keeping risky batches review-gated.",
    itemName: "proposal group(s)"
  },
  monitor: {
    url: "../data/provider-monitor-queue.json",
    help: "Ongoing monitor queue: automated fetch and audit findings that need human confirmation before changing public data.",
    itemName: "monitor item(s)"
  }
};
const DECISION_STORAGE_KEY = "healthcare-finder-provider-review-decisions-v1";

const TYPE_OPTIONS = [
  "gp",
  "counsellor",
  "psychologist",
  "psychiatrist",
  "public-service",
  "youth",
  "addiction",
  "directory",
  "helpline",
  "mens-centre"
];

const AVAILABILITY_OPTIONS = [
  "accepting",
  "waitlist",
  "not_accepting",
  "referrals_paused",
  "unknown",
  "not_published"
];

const REFERRAL_OPTIONS = ["gp", "self", "specialist", "unknown"];
const CONFIDENCE_OPTIONS = ["high", "medium", "low"];
const SOURCE_QUALITY_OPTIONS = [
  "provider-owned page",
  "provider-owned or NGO public page",
  "trusted health directory",
  "trusted health directory reviewed by service",
  "official government or health agency",
  "professional register or directory",
  "third-party public GP listing",
  "watchlist candidate",
  "unknown"
];

const TAG_OPTIONS = [
  "maori",
  "pasifika",
  "asian",
  "rainbow",
  "trauma-informed",
  "telehealth",
  "online",
  "phone",
  "directory",
  "crisis",
  "youth",
  "men",
  "addiction",
  "gp",
  "counsellor",
  "psychologist",
  "psychiatrist",
  "psychiatry-service"
];

const NEED_SCOPE_OPTIONS = ["depression", "anxiety", "trauma", "addiction", "work", "stress", "relationships", "grief"];
const AGE_GROUP_OPTIONS = ["child", "youth", "adult", "older-adult", "all-ages"];
const PATIENT_GROUP_OPTIONS = ["maori", "pasifika", "asian", "rainbow", "men", "women", "youth", "family", "acc", "sensitive-claims"];

const COMMON_CORRECTION_FIELDS = [
  { field: "name", label: "Provider display name", group: "Identity", kind: "text" },
  { field: "clinicianName", label: "Clinician name", group: "Identity", kind: "text" },
  { field: "practiceName", label: "Practice name", group: "Identity", kind: "text" },
  { field: "type", label: "Provider type", group: "Identity", kind: "select", options: TYPE_OPTIONS },
  { field: "confidence", label: "Record confidence", group: "Evidence quality", kind: "select", options: CONFIDENCE_OPTIONS },
  { field: "sourceQuality", label: "Source quality", group: "Evidence quality", kind: "select", options: SOURCE_QUALITY_OPTIONS },
  { field: "needsManualVerification", label: "Needs manual verification", group: "Evidence quality", kind: "boolean" },
  { field: "verified", label: "Verified month", group: "Evidence quality", kind: "text", placeholder: "YYYY-MM" },
  { field: "lastVerified", label: "Last verified month", group: "Evidence quality", kind: "text", placeholder: "YYYY-MM" },
  { field: "region", label: "Region", group: "Location", kind: "dynamic-select", source: "region" },
  { field: "city", label: "City or town", group: "Location", kind: "text" },
  { field: "address", label: "Address", group: "Location", kind: "text" },
  { field: "lat", label: "Latitude", group: "Location", kind: "number" },
  { field: "lon", label: "Longitude", group: "Location", kind: "number" },
  { field: "coordinateSource", label: "Coordinate source", group: "Location", kind: "text" },
  { field: "coordinateConfidence", label: "Coordinate confidence", group: "Location", kind: "select", options: CONFIDENCE_OPTIONS },
  { field: "phone", label: "Phone", group: "Contact", kind: "text" },
  { field: "text", label: "Text/SMS", group: "Contact", kind: "text" },
  { field: "email", label: "Email", group: "Contact", kind: "text" },
  { field: "website", label: "Website", group: "Contact", kind: "url" },
  { field: "bookingUrl", label: "Booking URL", group: "Contact", kind: "url" },
  { field: "source", label: "Main source URL", group: "Contact", kind: "url" },
  { field: "availabilityStatus", label: "Availability status", group: "Availability", kind: "select", options: AVAILABILITY_OPTIONS },
  { field: "availabilityEvidence", label: "Availability evidence", group: "Availability", kind: "textarea" },
  { field: "availabilityCheckedAt", label: "Availability checked", group: "Availability", kind: "text", placeholder: "YYYY-MM or YYYY-MM-DD" },
  { field: "availabilitySource", label: "Availability source URL", group: "Availability", kind: "url" },
  { field: "availabilityNeedsManualReview", label: "Availability needs review", group: "Availability", kind: "boolean" },
  { field: "requiresReferral", label: "Requires referral", group: "Referral", kind: "boolean" },
  { field: "referralType", label: "Referral type", group: "Referral", kind: "select", options: REFERRAL_OPTIONS },
  { field: "referralSourceUrl", label: "Referral source URL", group: "Referral", kind: "url" },
  { field: "referralSourceExcerpt", label: "Referral source excerpt", group: "Referral", kind: "textarea" },
  { field: "referralConfidence", label: "Referral confidence", group: "Referral", kind: "select", options: CONFIDENCE_OPTIONS },
  { field: "referralLastChecked", label: "Referral checked", group: "Referral", kind: "text", placeholder: "YYYY-MM or YYYY-MM-DD" },
  { field: "referralNeedsManualReview", label: "Referral needs review", group: "Referral", kind: "boolean" },
  { field: "onlineAvailable", label: "Telehealth/video available", group: "Access mode", kind: "boolean" },
  { field: "phoneSupport", label: "Phone support available", group: "Access mode", kind: "boolean" },
  { field: "inPerson", label: "In-person service", group: "Access mode", kind: "boolean" },
  { field: "crisisOnly", label: "Crisis-only service", group: "Access mode", kind: "boolean" },
  { field: "tags", label: "Tags", group: "Scope and support", kind: "checks", options: TAG_OPTIONS },
  { field: "needScope", label: "Need scope", group: "Scope and support", kind: "checks", options: NEED_SCOPE_OPTIONS },
  { field: "patientGroups", label: "Patient groups", group: "Scope and support", kind: "checks", options: PATIENT_GROUP_OPTIONS },
  { field: "ageGroups", label: "Age groups", group: "Scope and support", kind: "checks", options: AGE_GROUP_OPTIONS },
  { field: "services", label: "Services", group: "Scope and support", kind: "list" },
  { field: "specialties", label: "Specialties", group: "Scope and support", kind: "list" },
  { field: "fit", label: "Public fit text", group: "Public card text", kind: "textarea" },
  { field: "firstStep", label: "First step text", group: "Public card text", kind: "textarea" },
  { field: "cost", label: "Cost/support notes", group: "Public card text", kind: "textarea" },
  { field: "hours", label: "Hours", group: "Public card text", kind: "textarea" }
];

const COMMON_FIELD_NAMES = new Set(COMMON_CORRECTION_FIELDS.map((config) => config.field));

const DECISION_HELP = {
  approve: "Use only when the current record is accurate enough and risky fields have evidence or clear notes.",
  adjust: "Use when the provider is valid but one or more fields need changing. The generated correctedFields preview shows what will be applied.",
  reject: "Use when the record should not stay in live provider data, such as a wrong type, bad source, duplicate source, or unsafe listing.",
  move_to_watchlist: "Use when the provider may be useful later but should not appear in first recommendations now, usually because availability is closed or paused.",
  duplicate: "Use when another provider record should be kept instead. Fill in the kept provider ID.",
  needs_more_info: "Use when the source is unclear, blocked, conflicting, or needs a phone/email check before changing public recommendations."
};

const state = {
  queue: null,
  items: [],
  providers: [],
  filtered: [],
  selectedId: "",
  decisions: loadDecisions()
};

const els = {
  queueSummary: document.querySelector("#queueSummary"),
  queueModeHelp: document.querySelector("#queueModeHelp"),
  queueSource: document.querySelector("#queueSource"),
  queueJsonLink: document.querySelector("#queueJsonLink"),
  progressText: document.querySelector("#progressText"),
  progressPercent: document.querySelector("#progressPercent"),
  reviewProgress: document.querySelector("#reviewProgress"),
  queueList: document.querySelector("#queueList"),
  emptyState: document.querySelector("#emptyState"),
  detailView: document.querySelector("#detailView"),
  detailMeta: document.querySelector("#detailMeta"),
  detailTitle: document.querySelector("#detailTitle"),
  detailSubtitle: document.querySelector("#detailSubtitle"),
  detailBadges: document.querySelector("#detailBadges"),
  itemChecklist: document.querySelector("#itemChecklist"),
  publicPreview: document.querySelector("#publicPreview"),
  auditFindings: document.querySelector("#auditFindings"),
  rankingFields: document.querySelector("#rankingFields"),
  availabilityFields: document.querySelector("#availabilityFields"),
  referralFields: document.querySelector("#referralFields"),
  locationFields: document.querySelector("#locationFields"),
  tagsFields: document.querySelector("#tagsFields"),
  practiceSignals: document.querySelector("#practiceSignals"),
  relatedRecords: document.querySelector("#relatedRecords"),
  practiceTemplateJson: document.querySelector("#practiceTemplateJson"),
  copyPracticeTemplate: document.querySelector("#copyPracticeTemplate"),
  practiceTemplateStatus: document.querySelector("#practiceTemplateStatus"),
  sourceLinks: document.querySelector("#sourceLinks"),
  sourcePreview: document.querySelector("#sourcePreview"),
  sourceEvidenceJson: document.querySelector("#sourceEvidenceJson"),
  rawProvider: document.querySelector("#rawProvider"),
  safetyWarnings: document.querySelector("#safetyWarnings"),
  decisionForm: document.querySelector("#decisionForm"),
  decisionHelp: document.querySelector("#decisionHelp"),
  commonCorrections: document.querySelector("#commonCorrections"),
  correctionPreview: document.querySelector("#correctionPreview"),
  decisionStatus: document.querySelector("#decisionStatus"),
  exportDecisions: document.querySelector("#exportDecisions"),
  clearDecision: document.querySelector("#clearDecision"),
  filters: {
    search: document.querySelector("#search"),
    priority: document.querySelector("#priorityFilter"),
    region: document.querySelector("#regionFilter"),
    type: document.querySelector("#typeFilter"),
    rule: document.querySelector("#ruleFilter"),
    category: document.querySelector("#categoryFilter"),
    batch: document.querySelector("#batchFilter"),
    severity: document.querySelector("#severityFilter"),
    availability: document.querySelector("#availabilityFilter"),
    referral: document.querySelector("#referralFilter"),
    decision: document.querySelector("#decisionFilter")
  }
};

function loadDecisions() {
  try {
    const saved = JSON.parse(localStorage.getItem(DECISION_STORAGE_KEY) || "{}");
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

function saveDecisions() {
  localStorage.setItem(DECISION_STORAGE_KEY, JSON.stringify(state.decisions));
}

function text(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (value === undefined || value === null || value === "") return "Not set";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function compact(value, max = 180) {
  const clean = text(value).replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}...` : clean;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function unique(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function today() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function providerValue(item, field) {
  const provider = item.currentProvider || {};
  return provider[field] ?? item[field];
}

function recordValue(record, field) {
  const provider = record.currentProvider || record.provider || record;
  return provider[field] ?? record[field];
}

function editableValue(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (value === undefined || value === null) return "";
  return String(value);
}

function normalizeForCompare(value) {
  if (Array.isArray(value)) return JSON.stringify(unique(value).sort());
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function normalizeComparable(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compactPhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function sourceHost(value) {
  try {
    return new URL(value || "").hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function emailHost(value) {
  return String(value || "").split("@")[1]?.toLowerCase() || "";
}

function isProviderOwnedHost(host) {
  return host && !/(healthpoint|nzccp|psychologytoday|yourhealthinmind|ranzcp|mcnz|psychologistsboard|linkedin|google|bing)\./i.test(host);
}

function optionList(select, values, currentLabel = "") {
  const first = select.querySelector("option");
  select.replaceChildren(first);
  for (const value of values.filter(Boolean).sort((a, b) => a.localeCompare(b))) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = currentLabel ? `${currentLabel}: ${value}` : value;
    select.append(option);
  }
}

function setOptions() {
  optionList(els.filters.priority, [...new Set(state.items.map((item) => item.reviewPriority))]);
  optionList(els.filters.region, [...new Set(state.items.map((item) => item.region))]);
  optionList(els.filters.type, [...new Set(state.items.map((item) => item.type))]);
  optionList(els.filters.rule, [...new Set(state.items.flatMap((item) => item.auditRules || []))]);
  optionList(els.filters.category, [...new Set(state.items.map((item) => item.reviewCategory))]);
  optionList(els.filters.batch, [...new Set(state.items.map((item) => item.batchKey))]);
  optionList(els.filters.severity, [...new Set(state.items.map((item) => item.auditSeverity))]);
  optionList(els.filters.availability, [...new Set(state.items.map((item) => item.availabilityStatus))]);
  optionList(els.filters.referral, [...new Set(state.items.map((item) => item.referralType))]);
  optionList(els.filters.decision, ["approve", "adjust", "reject", "move_to_watchlist", "duplicate", "needs_more_info"]);
}

function itemDecision(item) {
  return state.decisions[item.reviewId]?.action || state.decisions[item.reviewId]?.reviewDecision || "";
}

function priorityFromRisk(riskLevel) {
  if (riskLevel === "low") return "low";
  if (riskLevel === "medium") return "medium";
  return "high";
}

function proposalTitle(proposal) {
  if (proposal.action === "auto_deprioritize_low_risk_claims") {
    return `Low-risk ${proposal.field || "claim"} checks from ${proposal.sourceType || "trusted source"}`;
  }
  return `${proposal.reviewCategory || "Manual batch"}${proposal.field ? `: ${proposal.field}` : ""}`;
}

function proposalToItem(proposal, index, kind) {
  const samples = asArray(proposal.sampleProviders);
  const sourceUrls = unique(samples.map((sample) => sample.sourceUrl));
  const actionLabel = kind === "auto" ? "Advisory auto-deprioritisation" : "Manual batch review";
  return {
    ...proposal,
    reviewId: proposal.proposalId || `${kind}-proposal-${index + 1}`,
    providerId: "",
    name: proposalTitle(proposal),
    type: proposal.sourceType || kind,
    region: "",
    city: "",
    confidence: proposal.riskLevel === "low" ? "high" : "review",
    sourceQuality: proposal.sourceType || "",
    reviewPriority: priorityFromRisk(proposal.riskLevel),
    auditSeverity: proposal.riskLevel || "medium",
    batchKey: proposal.proposalId || "",
    auditRules: unique([proposal.action, proposal.reviewCategory, proposal.field]),
    reviewReasons: unique([
      proposal.reason,
      proposal.safeAutomation,
      `${proposal.count || 0} claim(s) across ${proposal.affectedProviders || 0} provider(s).`,
      proposal.liveMutationAllowed === false ? "This proposal must not mutate providers.json directly." : ""
    ]),
    auditFindings: [{
      rule: proposal.action || actionLabel,
      severity: proposal.riskLevel || "medium",
      issue: proposal.reason || "Review this proposal group.",
      suggestedFix: proposal.safeAutomation || "Use reviewed decisions before applying provider-data changes."
    }],
    publicCardPreviewText: [
      actionLabel,
      `Count: ${proposal.count || 0} claim(s), ${proposal.affectedProviders || 0} provider(s).`,
      `Category: ${proposal.reviewCategory || "not set"}.`,
      `Field: ${proposal.field || "not field-specific"}.`,
      `Safe action: ${proposal.safeAutomation || "Review before applying."}`,
      "Provider data changes still require exported decisions, controlled apply, validation, audits, and tests.",
      samples.length ? `Sample providers:\n${samples.map((sample) => `- ${sample.providerName || sample.providerId || "Unknown provider"} (${sample.field || proposal.field || "field"})`).join("\n")}` : ""
    ].filter(Boolean).join("\n"),
    sourceUrls,
    sourceEvidence: {
      proposal: [{
        field: proposal.field || "batch",
        value: proposal.reviewCategory || proposal.action || "",
        sourceUrl: sourceUrls[0] || "",
        excerpt: proposal.reason || "",
        confidence: proposal.riskLevel === "low" ? "high" : "review",
        needsManualReview: kind !== "auto"
      }]
    },
    currentProvider: proposal,
    claimId: proposal.proposalId,
    claimField: proposal.field,
    claimValue: proposal.reviewCategory,
    claimDecision: kind === "auto" ? "auto_accept" : "review",
    claimRiskLevel: proposal.riskLevel,
    claimReason: proposal.reason,
    requiredHumanAction: proposal.safeAutomation
  };
}

function taskSeverity(priority) {
  if (priority === "high") return "high";
  if (priority === "low") return "low";
  return "medium";
}

function taskSourceEvidence(task) {
  const sourceUrl = asArray(task.sourceUrls)[0] || task.source || task.website || "";
  const contact = [
    {
      field: "phone",
      value: task.phone || "",
      sourceUrl,
      excerpt: task.phone
        ? `Current GP record stores phone ${task.phone}. Confirm this against a practice-owned, Healthpoint, PHO, HPI/FHIR, or official source.`
        : "Phone is missing. Do not guess it from search snippets.",
      confidence: task.phone ? task.confidence || "medium" : "low",
      needsManualReview: true
    },
    {
      field: "website",
      value: task.website || "",
      sourceUrl: task.website || sourceUrl,
      excerpt: task.website
        ? `Current GP record stores website ${task.website}. Confirm this is the current practice site.`
        : "Website is missing. Find a practice-owned, Healthpoint, PHO, HPI/FHIR, or official source before adding one.",
      confidence: task.website ? task.confidence || "medium" : "low",
      needsManualReview: true
    }
  ];

  const address = [
    {
      field: "address",
      value: task.address || "",
      sourceUrl,
      excerpt: task.address
        ? `Current GP record stores address ${task.address}. Confirm it matches a stronger public source.`
        : "Address is missing.",
      confidence: task.confidence || "medium",
      needsManualReview: true
    },
    {
      field: "lat",
      value: task.lat ?? "",
      sourceUrl,
      excerpt: "Coordinates should only be kept when they match the verified professional address.",
      confidence: task.coordinateConfidence || task.confidence || "medium",
      needsManualReview: Boolean(task.address)
    },
    {
      field: "lon",
      value: task.lon ?? "",
      sourceUrl,
      excerpt: "Coordinates should only be kept when they match the verified professional address.",
      confidence: task.coordinateConfidence || task.confidence || "medium",
      needsManualReview: Boolean(task.address)
    }
  ];

  return {
    contact,
    address,
    sourceQuality: [{
      field: "sourceQuality",
      value: task.sourceQuality || "",
      sourceUrl,
      excerpt: task.reviewReason || "GP record needs stronger corroboration before source quality is treated as reliable.",
      confidence: task.confidence || "medium",
      needsManualReview: true
    }],
    gpCorroboration: [
      ...asArray(task.allowedEvidenceSources).map((value) => ({
        field: "allowedEvidenceSources",
        value,
        sourceUrl: "",
        excerpt: `Acceptable evidence: ${value}`,
        confidence: "policy",
        needsManualReview: false
      })),
      ...asArray(task.disallowedEvidenceSources).map((value) => ({
        field: "disallowedEvidenceSources",
        value,
        sourceUrl: "",
        excerpt: `Do not use as evidence: ${value}`,
        confidence: "policy",
        needsManualReview: false
      }))
    ]
  };
}

function gpTaskToItem(task, index) {
  const priority = task.priority || task.reviewPriority || "medium";
  const missing = asArray(task.missingFields);
  const sourceUrls = unique([
    ...asArray(task.sourceUrls),
    task.source,
    task.website,
    task.bookingUrl
  ]);
  const auditRules = unique([
    ...asArray(task.auditRules),
    "weak-gp-source"
  ]);
  const auditIssues = asArray(task.auditIssues);

  return {
    ...task,
    reviewId: task.reviewId || task.taskId || `gp-corroboration-${index + 1}`,
    reviewCategory: "GP source corroboration",
    reviewPriority: priority,
    auditSeverity: taskSeverity(priority),
    batchKey: task.region ? `gp-source:${task.region}` : "gp-source",
    auditRules,
    auditFindings: auditRules.map((rule, ruleIndex) => ({
      rule,
      severity: taskSeverity(priority),
      issue: auditIssues[ruleIndex] || task.reviewReason || "GP record needs stronger source corroboration.",
      suggestedFix: "Find a practice-owned, Healthpoint, PHO, HPI/FHIR, or official source before changing website, phone, address, coordinates, source quality, confidence, or verification metadata."
    })),
    reviewReasons: unique([
      task.reviewReason,
      missing.length ? `Missing field(s): ${missing.join(", ")}.` : "",
      "DoctorPricer and search snippets are discovery-only; they are not enough to approve current GP contact details.",
      "Do not infer availability, enrolment, mental-health specialties, cultural support, language support, or funding eligibility from this task."
    ]),
    sourceEvidence: task.sourceEvidence || taskSourceEvidence(task),
    sourceUrls,
    claimId: task.taskId,
    claimField: "sourceQuality",
    claimValue: task.sourceQuality || task.importSource || "third-party GP source",
    claimDecision: "review",
    claimRiskLevel: priority,
    claimReason: task.reviewReason,
    requiredHumanAction: "Capture a stronger public source URL and short excerpt, then adjust safe fields or leave the record needing more information.",
    publicCardPreviewText: task.publicCardPreviewText || [
      task.name,
      `${task.region || ""}${task.city ? ` / ${task.city}` : ""}`,
      task.address,
      task.phone ? `Phone: ${task.phone}` : "Phone missing",
      task.website ? `Website: ${task.website}` : "Website missing",
      `Current source: ${task.sourceQuality || task.source || "unknown"}`
    ].filter(Boolean).join("\n"),
    currentProvider: task
  };
}

function queueItemsFromPayload(queue) {
  if (Array.isArray(queue.items)) return queue.items;
  if (Array.isArray(queue.tasks) && queue.summary?.reviewGateRequired) {
    return queue.tasks.map((task, index) => gpTaskToItem(task, index));
  }
  if (Array.isArray(queue.autoDeprioritizeProposals) || Array.isArray(queue.manualBatchProposals)) {
    return [
      ...asArray(queue.autoDeprioritizeProposals).map((proposal, index) => proposalToItem(proposal, index, "auto")),
      ...asArray(queue.manualBatchProposals).map((proposal, index) => proposalToItem(proposal, index, "manual"))
    ];
  }
  return [];
}

function decisionsForCurrentQueue() {
  const ids = new Set(state.items.map((item) => item.reviewId));
  return Object.keys(state.decisions).filter((reviewId) => ids.has(reviewId));
}

function updateProgress() {
  const savedCount = decisionsForCurrentQueue().length;
  const total = state.items.length || 1;
  const percent = Math.round((savedCount / total) * 100);
  els.progressText.textContent = `${savedCount} of ${state.items.length} queue item(s) have local decisions.`;
  els.progressPercent.textContent = `${percent}%`;
  els.reviewProgress.max = total;
  els.reviewProgress.value = savedCount;
}

function filterItems() {
  const query = els.filters.search.value.trim().toLowerCase();
  const filters = {
    priority: els.filters.priority.value,
    region: els.filters.region.value,
    type: els.filters.type.value,
    rule: els.filters.rule.value,
    category: els.filters.category.value,
    batch: els.filters.batch.value,
    severity: els.filters.severity.value,
    availability: els.filters.availability.value,
    referral: els.filters.referral.value,
    decision: els.filters.decision.value
  };

  state.filtered = state.items.filter((item) => {
    const haystack = [
      item.name,
      item.clinicianName,
      item.practiceName,
      item.city,
      item.region,
      item.source,
      item.website,
      item.sourceEvidenceSummary,
      item.reviewCategory,
      item.batchKey,
      item.claimField,
      item.action,
      item.safeAutomation,
      ...(item.auditRules || []),
      ...(item.reviewReasons || [])
    ].join(" ").toLowerCase();
    return (!query || haystack.includes(query))
      && (!filters.priority || item.reviewPriority === filters.priority)
      && (!filters.region || item.region === filters.region)
      && (!filters.type || item.type === filters.type)
      && (!filters.rule || item.auditRules?.includes(filters.rule))
      && (!filters.category || item.reviewCategory === filters.category)
      && (!filters.batch || item.batchKey === filters.batch)
      && (!filters.severity || item.auditSeverity === filters.severity)
      && (!filters.availability || item.availabilityStatus === filters.availability)
      && (!filters.referral || item.referralType === filters.referral)
      && (!filters.decision || itemDecision(item) === filters.decision);
  });
  renderQueue();
}

function currentQueueSource() {
  return QUEUE_SOURCES[els.queueSource?.value] || QUEUE_SOURCES.review;
}

function renderQueue() {
  updateProgress();
  const source = currentQueueSource();
  els.queueSummary.textContent = `${state.filtered.length} shown from ${state.items.length} ${source.itemName || "review item(s)"}.`;
  els.queueList.replaceChildren();
  for (const item of state.filtered) {
    const li = document.createElement("li");
    li.className = "queue-item";
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-current", item.reviewId === state.selectedId ? "true" : "false");
    button.dataset.reviewId = item.reviewId;
    button.innerHTML = `
      <span class="queue-title">${escapeHtml(item.name || item.providerId)}</span>
      <span class="queue-meta">${escapeHtml([item.type, item.region, item.city].filter(Boolean).join(" | "))}</span>
      <span class="queue-meta"><span class="priority ${escapeHtml(item.reviewPriority)}">${escapeHtml(item.reviewPriority)}</span> ${escapeHtml(compact((item.auditRules || []).join(", "), 90))}</span>
      ${itemDecision(item) ? `<span class="queue-meta">Decision: ${escapeHtml(itemDecision(item))}</span>` : ""}
    `;
    button.addEventListener("click", () => selectItem(item.reviewId));
    li.append(button);
    els.queueList.append(li);
  }
}

function dl(container, rows) {
  container.replaceChildren();
  for (const [label, value] of rows) {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = text(value);
    container.append(dt, dd);
  }
}

function evidenceBuckets(item) {
  const evidence = item.sourceEvidence || {};
  const entries = [];
  for (const value of Object.values(evidence)) {
    if (Array.isArray(value)) entries.push(...value);
    else if (value && typeof value === "object") {
      for (const nested of Object.values(value)) entries.push(...asArray(nested));
    }
  }
  return entries.filter(Boolean);
}

function evidenceForField(item, field) {
  const entries = evidenceBuckets(item).filter((entry) => entry.field === field || (field === "tags" && entry.field === "tags"));
  if (field === "availabilityStatus") return entries.concat(asArray(item.sourceEvidence?.availability));
  if (field === "referralType") return entries.concat(asArray(item.sourceEvidence?.referral));
  if (["phone", "text", "email", "website", "bookingUrl"].includes(field)) return entries.concat(asArray(item.sourceEvidence?.contact).filter((entry) => entry.field === field));
  if (["address", "lat", "lon"].includes(field)) return entries.concat(asArray(item.sourceEvidence?.address));
  return entries;
}

function bestEvidence(item, field) {
  const entries = evidenceForField(item, field);
  return entries.find((entry) => entry.excerpt || entry.sourceUrl || entry.confidence) || null;
}

function sourceUrlForField(item, field) {
  const evidence = bestEvidence(item, field);
  return evidence?.sourceUrl || item[`${field}Source`] || item.source || item.website || item.sourceUrls?.[0] || "";
}

function confidenceForField(item, field) {
  const evidence = bestEvidence(item, field);
  if (evidence?.confidence) return evidence.confidence;
  if (field.startsWith("referral")) return item.referralConfidence || item.confidence || "unknown";
  if (field.startsWith("coordinate") || ["address", "lat", "lon"].includes(field)) return item.coordinateConfidence || item.confidence || "unknown";
  return item.confidence || "unknown";
}

function needsFieldReview(item, field) {
  const value = providerValue(item, field);
  const evidence = evidenceForField(item, field);
  if (evidence.some((entry) => entry.needsManualReview)) return true;
  if (["email", "phone", "website", "source"].includes(field) && !value) return true;
  if (["clinicianName", "practiceName"].includes(field) && item.type !== "gp" && !value) return true;
  if (["lat", "lon"].includes(field) && item.address && !value && !item.onlineAvailable) return true;
  if (field === "availabilityStatus" && ["accepting", "waitlist", "not_accepting", "referrals_paused"].includes(value || "") && !item.availabilityEvidence) return true;
  if (field === "referralType" && item.type === "psychiatrist" && (!value || value === "unknown")) return true;
  if (field === "tags" && asArray(value).some((tag) => TAG_OPTIONS.includes(tag))) return true;
  if (field === "needScope" && asArray(value).length > 0) return true;
  return false;
}

function renderChecklist(item) {
  els.itemChecklist.replaceChildren();
  const title = document.createElement("h3");
  title.textContent = "Required checks for this item";
  const list = document.createElement("ul");
  const checks = unique([
    item.claimId ? `Resolve claim "${item.claimField}" (${item.claimRiskLevel} risk): ${item.requiredHumanAction || item.claimReason}` : "",
    item.claimDecision === "auto_accept" ? "This is an advisory low-risk auto-accept claim; still use reviewed decisions before live data changes." : "",
    item.reviewCategory === "GP source corroboration" ? "Find one stronger public source: practice-owned page, Healthpoint listing/export, PHO/Health NZ/HPI/FHIR data, official clinic network page, or provider-owned booking/enrolment page." : "",
    item.reviewCategory === "GP source corroboration" ? "Capture source URL, source type, short excerpt, captured date, and any phone/address/website conflict." : "",
    item.reviewCategory === "GP source corroboration" ? "Do not use search-result snippets, DoctorPricer alone, LinkedIn/social-only pages, blocked pages, or name-based inference as evidence." : "",
    ...(item.reviewReasons || []),
    ...(item.auditFindings || []).map((finding) => finding.issue || finding.rule),
    item.availabilityNeedsManualReview ? "Confirm availability status and do not mark accepting without explicit evidence." : "",
    item.type === "psychiatrist" ? "Confirm whether a GP/specialist referral is required before direct contact." : "",
    item.tags?.some((tag) => ["maori", "pasifika", "asian", "rainbow", "telehealth", "online"].includes(tag))
      ? "Verify support-preference and telehealth tags from source evidence." : "",
    item.needScope?.length ? "Check that needs such as depression, anxiety, trauma, addiction, or work stress are actually supported by the source." : "",
    item.address && (!item.lat || !item.lon) ? "Check address and coordinates for distance ranking." : ""
  ]).slice(0, 8);

  if (!checks.length) checks.push("No special audit issue is attached. Confirm the public card and source link still match.");

  for (const check of checks) {
    const li = document.createElement("li");
    li.textContent = check;
    list.append(li);
  }
  els.itemChecklist.append(title, list);
}

function renderSafetyWarnings(item) {
  els.safetyWarnings.replaceChildren();
  const warnings = unique([
    item.claimRiskLevel === "high"
      ? "This claim is high risk. Do not approve or adjust it without source evidence or explicit reviewer notes." : "",
    item.claimDecision === "watchlist"
      ? "This claim points to unavailable or paused status. Keep it out of first recommendations unless a current source proves otherwise." : "",
    item.availabilityStatus === "accepting" && !item.availabilityEvidence
      ? "Availability is marked accepting without explicit evidence. Add evidence or change the status." : "",
    item.type === "psychiatrist" && item.referralType === "self" && !item.referralSourceExcerpt
      ? "Self-referral for a psychiatrist needs explicit source evidence." : "",
    item.type === "psychiatrist" && (!item.referralType || item.referralType === "unknown")
      ? "Psychiatrist referral pathway is unknown. Confirm GP, specialist, self, or leave as unknown with notes." : "",
    item.type === "directory" || item.tags?.includes("directory")
      ? "Directory records should not be turned into direct providers unless a separate direct provider source exists." : "",
    item.sourceQuality?.includes("register")
      ? "Register-only records need a separate public practice/contact source before being treated as direct providers." : "",
    item.tags?.some((tag) => ["maori", "pasifika", "asian", "rainbow", "telehealth", "online"].includes(tag))
      ? "Support-preference and telehealth tags affect recommendations; keep only tags supported by source evidence or explicit review notes." : ""
  ]);

  if (!warnings.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "No high-risk safety warning generated for this record. Still verify source evidence before approving.";
    els.safetyWarnings.append(p);
    return;
  }

  const list = document.createElement("ul");
  for (const warning of warnings) {
    const li = document.createElement("li");
    li.textContent = warning;
    list.append(li);
  }
  els.safetyWarnings.append(list);
}

function displayNameForRecord(record) {
  const clinician = recordValue(record, "clinicianName");
  const practice = recordValue(record, "practiceName");
  const name = recordValue(record, "name");
  return clinician ? `${clinician}${practice ? `, ${practice}` : ""}` : name || recordValue(record, "providerId") || recordValue(record, "id");
}

function practiceSignalsFor(record) {
  const practiceName = recordValue(record, "practiceName") || (recordValue(record, "clinicianName") ? "" : recordValue(record, "name"));
  const domains = unique([
    recordValue(record, "website"),
    recordValue(record, "source"),
    recordValue(record, "bookingUrl")
  ].map(sourceHost)).filter(isProviderOwnedHost);
  const emailDomain = emailHost(recordValue(record, "email"));
  const phone = compactPhone(recordValue(record, "phone"));
  const address = normalizeComparable(recordValue(record, "address"));
  return {
    practiceName,
    practiceKey: normalizeComparable(practiceName),
    domains,
    emailDomain,
    phone,
    address,
    city: normalizeComparable(recordValue(record, "city")),
    region: normalizeComparable(recordValue(record, "region"))
  };
}

function recordIdentity(record) {
  return record.reviewId || record.providerId || record.id || "";
}

function allAuditorRecords() {
  const queueByProviderId = new Map(state.items.map((item) => [item.providerId, item]));
  const liveProviderIds = new Set(state.providers.map((provider) => provider.id));
  const liveRecords = state.providers.map((provider) => ({
    ...provider,
    recordKind: "live provider",
    queueItem: queueByProviderId.get(provider.id) || null
  }));
  const suggestionRecords = state.items
    .filter((item) => !item.currentProvider && !liveProviderIds.has(item.providerId))
    .map((item) => ({
      ...item,
      recordKind: item.reviewId?.startsWith("discovery:") ? "discovery suggestion" : "queue item",
      queueItem: item
    }));
  return [...liveRecords, ...suggestionRecords];
}

function relatedMatchReasons(current, candidate) {
  if (recordIdentity(current) && recordIdentity(current) === recordIdentity(candidate)) return [];
  if (recordValue(current, "id") && recordValue(current, "id") === recordValue(candidate, "id")) return [];

  const a = practiceSignalsFor(current);
  const b = practiceSignalsFor(candidate);
  const reasons = [];
  if (a.practiceKey && b.practiceKey && a.practiceKey === b.practiceKey) reasons.push("same practice name");
  if (a.domains.some((host) => b.domains.includes(host))) reasons.push("same provider-owned website");
  if (a.phone && b.phone && a.phone === b.phone) reasons.push("same phone");
  if (a.address && b.address && a.address === b.address) reasons.push("same address");
  if (a.emailDomain && b.emailDomain && a.emailDomain === b.emailDomain && isProviderOwnedHost(a.emailDomain)) reasons.push("same email domain");

  const strongEnough = reasons.includes("same practice name")
    || reasons.includes("same provider-owned website")
    || reasons.includes("same phone")
    || reasons.includes("same address")
    || reasons.length >= 2;
  return strongEnough ? reasons : [];
}

function relatedPracticeRecords(item) {
  return allAuditorRecords()
    .map((record) => ({ record, reasons: relatedMatchReasons(item, record) }))
    .filter((entry) => entry.reasons.length)
    .sort((a, b) =>
      b.reasons.length - a.reasons.length
      || displayNameForRecord(a.record).localeCompare(displayNameForRecord(b.record))
    )
    .slice(0, 16);
}

function practiceTemplateFor(item) {
  const practiceName = providerValue(item, "practiceName") || (providerValue(item, "clinicianName") ? providerValue(item, "name") : "");
  const currentType = providerValue(item, "type") || "";
  const clinicianTypes = new Set(["counsellor", "gp", "psychologist", "psychiatrist"]);
  const type = clinicianTypes.has(currentType) ? currentType : "";
  const todayValue = today();
  const sourceName = providerValue(item, "name") || practiceName || "selected record";
  const draftNotes = [
    "Draft copied from shared practice details only.",
    "Confirm clinician name, clinician-specific contact source, scope, availability, referral pathway, and support-preference tags before importing."
  ];
  if (!type) {
    draftNotes.push(`The selected record is ${currentType || "not typed"} (${sourceName}), so do not treat it as an individual clinician without a separate public clinician/practice source.`);
  }
  return {
    id: `TODO-${type || "clinician"}-new-clinician-${normalizeComparable(practiceName || providerValue(item, "name")).replace(/\s+/g, "-")}`,
    name: `TODO clinician name${practiceName ? `, ${practiceName}` : ""}`,
    clinicianName: "",
    practiceName,
    type,
    region: providerValue(item, "region") || "",
    city: providerValue(item, "city") || "",
    address: providerValue(item, "address") || "",
    lat: providerValue(item, "lat") ?? "",
    lon: providerValue(item, "lon") ?? "",
    phone: providerValue(item, "phone") || "",
    text: providerValue(item, "text") || "",
    email: providerValue(item, "email") || "",
    website: providerValue(item, "website") || "",
    bookingUrl: providerValue(item, "bookingUrl") || "",
    source: providerValue(item, "source") || providerValue(item, "website") || "",
    sourceQuality: providerValue(item, "sourceQuality") || "provider-owned page",
    confidence: "low",
    needsManualVerification: true,
    verified: "",
    lastVerified: "",
    availabilityStatus: "not_published",
    availabilityCheckedAt: todayValue,
    availabilityEvidence: "",
    availabilitySource: "",
    availabilityNeedsManualReview: true,
    requiresReferral: type === "psychiatrist" ? true : "",
    referralType: type === "psychiatrist" ? "unknown" : "",
    referralSourceUrl: "",
    referralSourceExcerpt: "",
    referralConfidence: type === "psychiatrist" ? "low" : "",
    referralLastChecked: "",
    referralNeedsManualReview: type === "psychiatrist" ? true : "",
    tags: [],
    needScope: [],
    specialties: [],
    services: [],
    patientGroups: [],
    ageGroups: [],
    onlineAvailable: providerValue(item, "onlineAvailable") === true,
    phoneSupport: providerValue(item, "phoneSupport") === true,
    inPerson: providerValue(item, "inPerson") !== false,
    crisisOnly: false,
    fit: "",
    firstStep: "",
    cost: providerValue(item, "cost") || "",
    hours: "",
    sourceEvidence: {
      identity: [],
      contact: [],
      address: [],
      availability: [],
      referral: [],
      scope: [],
      tags: {},
      telehealth: [],
      cultural: [],
      cost: []
    },
    reviewNotes: draftNotes.join(" ")
  };
}

function renderPracticeGroup(item) {
  els.practiceSignals.replaceChildren();
  els.relatedRecords.replaceChildren();
  const signals = practiceSignalsFor(item);
  const chips = [
    signals.practiceName ? `Practice: ${signals.practiceName}` : "",
    signals.domains.length ? `Domain: ${signals.domains.join(", ")}` : "",
    signals.phone ? `Phone: ${providerValue(item, "phone")}` : "",
    signals.address ? `Address: ${providerValue(item, "address")}` : ""
  ].filter(Boolean);
  if (!chips.length) chips.push("No strong shared-practice signal on this record yet.");
  for (const chipText of chips) {
    const chip = document.createElement("span");
    chip.className = "practice-chip";
    chip.textContent = chipText;
    els.practiceSignals.append(chip);
  }

  const related = relatedPracticeRecords(item);
  if (!related.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "No related live providers or queue items found from practice name, website, phone, email domain, or address.";
    els.relatedRecords.append(p);
  } else {
    for (const { record, reasons } of related) {
      const card = document.createElement("article");
      card.className = "related-record";
      const queueItem = record.queueItem || state.items.find((entry) => entry.providerId && entry.providerId === recordValue(record, "id"));
      const queueButton = queueItem
        ? `<button type="button" data-open-related="${escapeHtml(queueItem.reviewId)}">Open queue item</button>`
        : "";
      card.innerHTML = `
        <header>
          <div>
            <h4>${escapeHtml(displayNameForRecord(record))}</h4>
            <p class="queue-meta">${escapeHtml([recordValue(record, "type"), recordValue(record, "region"), recordValue(record, "city"), record.recordKind].filter(Boolean).join(" | "))}</p>
          </div>
          <div class="related-actions">${queueButton}</div>
        </header>
        <p class="match-reasons">Matched by: ${escapeHtml(reasons.join(", "))}</p>
        <p class="queue-meta">${escapeHtml(recordValue(record, "id") || recordValue(record, "providerId") || recordIdentity(record))}</p>
      `;
      const button = card.querySelector("[data-open-related]");
      button?.addEventListener("click", () => selectItem(button.dataset.openRelated));
      els.relatedRecords.append(card);
    }
  }

  const template = practiceTemplateFor(item);
  els.practiceTemplateJson.textContent = `${JSON.stringify(template, null, 2)}\n`;
  els.practiceTemplateStatus.textContent = "";
}

function selectItem(reviewId) {
  state.selectedId = reviewId;
  const item = state.items.find((entry) => entry.reviewId === reviewId);
  renderQueue();
  if (!item) return;
  els.emptyState.classList.add("hidden");
  els.detailView.classList.remove("hidden");

  els.detailMeta.textContent = `${item.reviewPriority} priority | ${item.auditSeverity} severity | ${item.reviewId}`;
  els.detailTitle.textContent = item.clinicianName
    ? `${item.clinicianName}${item.practiceName ? `, ${item.practiceName}` : ""}`
    : item.name;
  els.detailSubtitle.textContent = [item.type, item.region, item.city, item.confidence].filter(Boolean).join(" | ");
  els.detailBadges.replaceChildren(...[item.reviewPriority, item.auditSeverity, item.availabilityStatus, item.referralType]
    .filter(Boolean)
    .map((value) => {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = value;
      return badge;
    }));

  renderChecklist(item);
  els.publicPreview.textContent = item.publicCardPreviewText || "No public preview available.";
  renderFindings(item);
  renderPracticeGroup(item);
  renderSources(item);
  renderSafetyWarnings(item);
  renderDecision(item);
  dl(els.rankingFields, [
    ...(item.claimId ? [
      ["Claim field", item.claimField],
      ["Claim value", item.claimValue],
      ["Claim decision", item.claimDecision],
      ["Claim risk", item.claimRiskLevel],
      ["Claim score", item.claimScore],
      ["Batch key", item.batchKey]
    ] : []),
    ["Name", item.name],
    ["Clinician", item.clinicianName],
    ["Practice", item.practiceName],
    ["Type", item.type],
    ["Confidence", item.confidence],
    ["Source quality", item.sourceQuality],
    ["Needs manual verification", item.needsManualVerification]
  ]);
  dl(els.availabilityFields, [
    ["Status", item.availabilityStatus],
    ["Checked", item.availabilityCheckedAt],
    ["Evidence", item.availabilityEvidence],
    ["Source", item.availabilitySource],
    ["Needs review", item.availabilityNeedsManualReview]
  ]);
  dl(els.referralFields, [
    ["Requires referral", item.requiresReferral],
    ["Referral type", item.referralType],
    ["Confidence", item.referralConfidence],
    ["Checked", item.referralLastChecked],
    ["Source", item.referralSourceUrl],
    ["Excerpt", item.referralSourceExcerpt],
    ["Needs review", item.referralNeedsManualReview]
  ]);
  dl(els.locationFields, [
    ["Address", item.address],
    ["City", item.city],
    ["Region", item.region],
    ["Latitude", item.lat],
    ["Longitude", item.lon]
  ]);
  dl(els.tagsFields, [
    ["Tags", item.tags],
    ["Need scope", item.needScope],
    ["Specialties", item.specialties],
    ["Services", item.services],
    ["Patient groups", item.patientGroups],
    ["Age groups", item.ageGroups],
    ["Online available", item.onlineAvailable],
    ["Phone support", item.phoneSupport],
    ["In person", item.inPerson],
    ["Crisis only", item.crisisOnly]
  ]);
  els.sourceEvidenceJson.textContent = JSON.stringify(item.sourceEvidence || {}, null, 2);
  els.rawProvider.textContent = JSON.stringify(item.currentProvider || item, null, 2);
}

function renderFindings(item) {
  els.auditFindings.replaceChildren();
  if (!item.auditFindings?.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = item.reviewReasons?.join("; ") || "No audit findings attached; review is driven by manual metadata.";
    els.auditFindings.append(p);
    return;
  }
  for (const finding of item.auditFindings) {
    const section = document.createElement("section");
    section.className = `finding ${finding.severity || ""}`;
    section.innerHTML = `
      <strong>${escapeHtml(finding.rule || "audit finding")} (${escapeHtml(finding.severity || "unknown")})</strong>
      <p>${escapeHtml(finding.issue || "")}</p>
      <p><strong>Suggested:</strong> ${escapeHtml(finding.suggestedFix || "")}</p>
      ${finding.allowlisted ? "<p><strong>Allowlisted:</strong> yes</p>" : ""}
    `;
    els.auditFindings.append(section);
  }
}

function renderSources(item) {
  els.sourceLinks.replaceChildren();
  const links = [...new Set(item.sourceUrls || [])].filter((url) => /^https?:\/\//i.test(url));
  if (!links.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "No source links available.";
    els.sourceLinks.append(p);
    els.sourcePreview.removeAttribute("src");
    return;
  }
  for (const [index, url] of links.entries()) {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = index === 0 ? "Open primary source in new tab (required)" : `Open source ${index + 1}`;
    els.sourceLinks.append(link);
  }
  const searches = asArray(item.suggestedSearches).filter(Boolean);
  if (searches.length) {
    const details = document.createElement("details");
    details.className = "suggested-searches";
    details.open = true;
    const summary = document.createElement("summary");
    summary.textContent = "Suggested searches";
    const list = document.createElement("ul");
    for (const search of searches.slice(0, 8)) {
      const li = document.createElement("li");
      const code = document.createElement("code");
      code.textContent = search;
      li.append(code);
      list.append(li);
    }
    details.append(summary, list);
    els.sourceLinks.append(details);
  }
  els.sourcePreview.src = links[0];
}

function buildCorrectionInput(config, value) {
  if (config.kind === "select" || config.kind === "dynamic-select") {
    const select = document.createElement("select");
    select.dataset.correctionField = config.field;
    const options = config.kind === "dynamic-select"
      ? unique(state.items.map((item) => item[config.source])).sort((a, b) => a.localeCompare(b))
      : [...config.options];
    if (value && !options.includes(value)) options.unshift(value);
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "Not set";
    select.append(empty);
    for (const optionValue of options) {
      const option = document.createElement("option");
      option.value = optionValue;
      option.textContent = optionValue;
      select.append(option);
    }
    select.value = value || "";
    return select;
  }

  if (config.kind === "boolean") {
    const select = document.createElement("select");
    select.dataset.correctionField = config.field;
    for (const [optionValue, label] of [["", "Not set"], ["true", "Yes"], ["false", "No"]]) {
      const option = document.createElement("option");
      option.value = optionValue;
      option.textContent = label;
      select.append(option);
    }
    select.value = value === true ? "true" : value === false ? "false" : "";
    return select;
  }

  if (config.kind === "checks") {
    const wrapper = document.createElement("div");
    wrapper.className = "choice-grid";
    wrapper.dataset.checkGroup = config.field;
    const selected = new Set(asArray(value).map(String));
    const knownOptions = [...config.options];
    const extraValues = [...selected].filter((entry) => !knownOptions.includes(entry));
    for (const optionValue of knownOptions) {
      const label = document.createElement("label");
      label.className = "choice-pill";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.dataset.correctionField = config.field;
      input.value = optionValue;
      input.checked = selected.has(optionValue);
      label.append(input, document.createTextNode(optionValue));
      wrapper.append(label);
    }
    const extraLabel = document.createElement("label");
    extraLabel.className = "choice-extra";
    extraLabel.textContent = "Other values";
    const extra = document.createElement("input");
    extra.dataset.correctionExtraField = config.field;
    extra.placeholder = "Comma-separated";
    extra.value = extraValues.join(", ");
    extraLabel.append(extra);
    wrapper.append(extraLabel);
    return wrapper;
  }

  if (config.kind === "textarea" || config.kind === "list") {
    const textarea = document.createElement("textarea");
    textarea.dataset.correctionField = config.field;
    textarea.rows = config.kind === "list" ? 2 : 3;
    textarea.placeholder = config.placeholder || (config.kind === "list" ? "Comma-separated" : "");
    textarea.value = editableValue(value);
    return textarea;
  }

  const input = document.createElement("input");
  input.dataset.correctionField = config.field;
  input.type = config.kind === "url" ? "url" : config.kind === "number" ? "number" : "text";
  if (config.kind === "number") input.step = "any";
  input.placeholder = config.placeholder || "";
  input.value = editableValue(value);
  return input;
}

function renderEvidenceMeta(row, item, config) {
  const meta = document.createElement("div");
  meta.className = "field-meta";
  const sourceUrl = sourceUrlForField(item, config.field);
  const evidence = bestEvidence(item, config.field);
  const confidence = confidenceForField(item, config.field);
  const status = needsFieldReview(item, config.field) ? "Needs check" : "Source-backed";
  const statusClass = status === "Needs check" ? "needs-check" : "source-backed";

  const statusBadge = document.createElement("span");
  statusBadge.className = `field-status ${statusClass}`;
  statusBadge.textContent = status;
  meta.append(statusBadge);

  const confidenceBadge = document.createElement("span");
  confidenceBadge.className = "field-status";
  confidenceBadge.textContent = `Confidence: ${confidence}`;
  meta.append(confidenceBadge);

  if (sourceUrl) {
    const link = document.createElement("a");
    link.href = sourceUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Source";
    meta.append(link);
  }
  if (evidence?.excerpt) {
    const excerpt = document.createElement("p");
    excerpt.className = "field-evidence";
    excerpt.textContent = compact(evidence.excerpt, 220);
    meta.append(excerpt);
  }
  row.append(meta);
}

function renderCorrectionBuilder(item, correctedFields = {}) {
  els.commonCorrections.replaceChildren();
  const groups = new Map();
  for (const config of COMMON_CORRECTION_FIELDS) {
    if (!groups.has(config.group)) groups.set(config.group, []);
    groups.get(config.group).push(config);
  }

  for (const [groupName, configs] of groups) {
    const group = document.createElement("section");
    group.className = "correction-group";
    const heading = document.createElement("h4");
    heading.textContent = groupName;
    group.append(heading);

    for (const config of configs) {
      const currentValue = providerValue(item, config.field);
      const value = Object.hasOwn(correctedFields, config.field) ? correctedFields[config.field] : currentValue;
      const row = document.createElement("div");
      row.className = `correction-row ${needsFieldReview(item, config.field) ? "needs-review" : ""}`;
      row.dataset.field = config.field;

      const label = document.createElement("label");
      label.className = "correction-label";
      const labelText = document.createElement("span");
      labelText.textContent = config.label;
      const current = document.createElement("span");
      current.className = "current-value";
      current.textContent = `Stored: ${text(currentValue)}`;
      label.append(labelText, current);

      const input = buildCorrectionInput(config, value);
      label.append(input);
      row.append(label);
      renderEvidenceMeta(row, item, config);
      group.append(row);
    }
    els.commonCorrections.append(group);
  }

  for (const control of els.commonCorrections.querySelectorAll("input, select, textarea")) {
    control.addEventListener("input", renderCorrectionPreview);
    control.addEventListener("change", renderCorrectionPreview);
  }
}

function valueFromControl(config) {
  if (config.kind === "checks") {
    const checked = [...els.commonCorrections.querySelectorAll(`[data-correction-field="${config.field}"]:checked`)]
      .map((input) => input.value);
    const extra = els.commonCorrections.querySelector(`[data-correction-extra-field="${config.field}"]`)?.value || "";
    return unique([...checked, ...extra.split(",")]);
  }

  const control = els.commonCorrections.querySelector(`[data-correction-field="${config.field}"]`);
  if (!control) return undefined;
  const value = control.value.trim();
  if (config.kind === "boolean") {
    if (value === "true") return true;
    if (value === "false") return false;
    return "";
  }
  if (config.kind === "number") {
    if (!value) return "";
    const number = Number(value);
    return Number.isFinite(number) ? number : value;
  }
  if (config.kind === "list") return unique(value.split(","));
  return value;
}

function commonCorrectionsFromHelper() {
  const item = state.items.find((entry) => entry.reviewId === state.selectedId);
  if (!item) return {};
  const corrected = {};
  for (const config of COMMON_CORRECTION_FIELDS) {
    const next = valueFromControl(config);
    if (next === undefined) continue;
    const current = providerValue(item, config.field);
    const currentComparable = config.kind === "list" || config.kind === "checks"
      ? normalizeForCompare(asArray(current))
      : normalizeForCompare(current);
    const nextComparable = config.kind === "list" || config.kind === "checks"
      ? normalizeForCompare(asArray(next))
      : normalizeForCompare(next);
    if (nextComparable !== currentComparable) corrected[config.field] = next;
  }
  return corrected;
}

function advancedCorrections() {
  const value = els.decisionForm.correctedFields.value.trim();
  if (!value) return {};
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Advanced corrected fields must be a JSON object.");
  }
  return parsed;
}

function mergedCorrectedFields() {
  return {
    ...commonCorrectionsFromHelper(),
    ...advancedCorrections()
  };
}

function renderCorrectionPreview() {
  try {
    const corrected = mergedCorrectedFields();
    els.correctionPreview.classList.remove("error");
    els.correctionPreview.textContent = `${JSON.stringify(corrected, null, 2)}\n`;
  } catch (error) {
    els.correctionPreview.classList.add("error");
    els.correctionPreview.textContent = `Advanced JSON is not valid: ${error.message}`;
  }
}

function splitCommonAndAdvanced(correctedFields = {}) {
  const common = {};
  const advanced = {};
  for (const [field, value] of Object.entries(correctedFields || {})) {
    if (COMMON_FIELD_NAMES.has(field)) common[field] = value;
    else advanced[field] = value;
  }
  return { common, advanced };
}

function updateDecisionHelp() {
  const selected = els.decisionForm.querySelector('input[name="decision"]:checked')?.value || "";
  els.decisionHelp.textContent = DECISION_HELP[selected] || "Choose the decision that best describes what should happen to this provider record.";
}

function renderDecision(item) {
  const saved = state.decisions[item.reviewId] || {};
  const { common, advanced } = splitCommonAndAdvanced(saved.correctedFields || {});
  els.decisionForm.reset();
  const radio = els.decisionForm.querySelector(`input[name="decision"][value="${saved.action || ""}"]`);
  if (radio) radio.checked = true;
  els.decisionForm.reviewer.value = saved.reviewer || "";
  els.decisionForm.reviewedDate.value = saved.reviewedDate || today();
  els.decisionForm.sourceUrl.value = saved.sourceUrl || item.sourceUrls?.[0] || "";
  els.decisionForm.keptProviderId.value = saved.keptProviderId || "";
  els.decisionForm.sourceExcerpt.value = saved.sourceExcerpt || "";
  els.decisionForm.correctedFields.value = Object.keys(advanced).length ? JSON.stringify(advanced, null, 2) : "";
  els.decisionForm.reviewNotes.value = saved.reviewNotes || "";
  renderCorrectionBuilder(item, common);
  updateDecisionHelp();
  renderCorrectionPreview();
  els.decisionStatus.textContent = saved.action ? `Saved local decision: ${saved.action}` : "No local decision saved for this provider.";
}

function formDecision() {
  const item = state.items.find((entry) => entry.reviewId === state.selectedId);
  const data = new FormData(els.decisionForm);
  const action = data.get("decision");
  if (!item) throw new Error("No provider selected.");
  if (!action) throw new Error("Choose a decision.");
  const correctedFields = mergedCorrectedFields();
  return {
    reviewId: item.reviewId,
    providerId: item.providerId,
    action,
    reviewer: data.get("reviewer").trim(),
    reviewedDate: data.get("reviewedDate"),
    sourceUrl: data.get("sourceUrl").trim(),
    sourceExcerpt: data.get("sourceExcerpt").trim(),
    keptProviderId: data.get("keptProviderId").trim(),
    auditRulesResolved: item.auditRules || [],
    correctedFields,
    reviewNotes: data.get("reviewNotes").trim()
  };
}

els.decisionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    const decision = formDecision();
    state.decisions[decision.reviewId] = decision;
    saveDecisions();
    els.decisionStatus.textContent = `Saved local decision: ${decision.action}`;
    filterItems();
  } catch (error) {
    els.decisionStatus.textContent = `Decision not saved: ${error.message}`;
  }
});

els.decisionForm.addEventListener("input", (event) => {
  if (event.target?.matches?.('input[name="decision"]')) updateDecisionHelp();
  if (event.target?.matches?.("#correctedFields")) renderCorrectionPreview();
});

els.decisionForm.addEventListener("change", (event) => {
  if (event.target?.matches?.('input[name="decision"]')) updateDecisionHelp();
  if (event.target?.matches?.("#correctedFields")) renderCorrectionPreview();
});

els.clearDecision.addEventListener("click", () => {
  if (!state.selectedId) return;
  delete state.decisions[state.selectedId];
  saveDecisions();
  const item = state.items.find((entry) => entry.reviewId === state.selectedId);
  if (item) renderDecision(item);
  filterItems();
});

els.copyPracticeTemplate?.addEventListener("click", async () => {
  const textValue = els.practiceTemplateJson.textContent || "";
  if (!textValue.trim()) return;
  try {
    await navigator.clipboard.writeText(textValue);
    els.practiceTemplateStatus.textContent = "Template copied. Keep it review-gated and add source evidence before importing.";
  } catch {
    els.practiceTemplateStatus.textContent = "Could not access clipboard. Select the template JSON and copy it manually.";
  }
});

els.exportDecisions.addEventListener("click", () => {
  const decisions = Object.values(state.decisions);
  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    sourceQueueGeneratedAt: state.queue?.generatedAt || "",
    decisions
  };
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "provider-review-decisions.json";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
});

for (const control of Object.values(els.filters)) {
  control.addEventListener("input", filterItems);
}

async function init() {
  try {
    const source = currentQueueSource();
    els.queueModeHelp.textContent = source.help;
    els.queueJsonLink.href = source.url;
    els.queueSummary.textContent = "Loading review queue...";
    els.queueList.replaceChildren();
    els.emptyState.classList.remove("hidden");
    els.detailView.classList.add("hidden");
    state.selectedId = "";
    const response = await fetch(source.url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not load queue JSON (${response.status})`);
    state.queue = await response.json();
    state.items = queueItemsFromPayload(state.queue);
    try {
      const providersResponse = await fetch("../providers.json", { cache: "no-store" });
      state.providers = providersResponse.ok ? await providersResponse.json() : [];
    } catch {
      state.providers = [];
    }
    setOptions();
    filterItems();
  } catch (error) {
    state.queue = null;
    state.items = [];
    state.providers = [];
    state.filtered = [];
    renderQueue();
    els.queueSummary.textContent = `${error.message}. Run npm run export:review, npm run export:claims, npm run export:gp-corroboration, or npm run export:monitor for the selected queue.`;
  }
}

els.queueSource?.addEventListener("change", init);

init();
