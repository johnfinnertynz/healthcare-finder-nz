const QUEUE_URL = "../data/provider-review-queue.json";
const DECISION_STORAGE_KEY = "healthcare-finder-provider-review-decisions-v1";

const state = {
  queue: null,
  items: [],
  filtered: [],
  selectedId: "",
  decisions: loadDecisions()
};

const els = {
  queueSummary: document.querySelector("#queueSummary"),
  queueList: document.querySelector("#queueList"),
  emptyState: document.querySelector("#emptyState"),
  detailView: document.querySelector("#detailView"),
  detailMeta: document.querySelector("#detailMeta"),
  detailTitle: document.querySelector("#detailTitle"),
  detailSubtitle: document.querySelector("#detailSubtitle"),
  detailBadges: document.querySelector("#detailBadges"),
  publicPreview: document.querySelector("#publicPreview"),
  auditFindings: document.querySelector("#auditFindings"),
  rankingFields: document.querySelector("#rankingFields"),
  availabilityFields: document.querySelector("#availabilityFields"),
  referralFields: document.querySelector("#referralFields"),
  locationFields: document.querySelector("#locationFields"),
  tagsFields: document.querySelector("#tagsFields"),
  sourceLinks: document.querySelector("#sourceLinks"),
  sourcePreview: document.querySelector("#sourcePreview"),
  sourceEvidenceJson: document.querySelector("#sourceEvidenceJson"),
  rawProvider: document.querySelector("#rawProvider"),
  decisionForm: document.querySelector("#decisionForm"),
  decisionStatus: document.querySelector("#decisionStatus"),
  exportDecisions: document.querySelector("#exportDecisions"),
  clearDecision: document.querySelector("#clearDecision"),
  filters: {
    search: document.querySelector("#search"),
    priority: document.querySelector("#priorityFilter"),
    region: document.querySelector("#regionFilter"),
    type: document.querySelector("#typeFilter"),
    rule: document.querySelector("#ruleFilter"),
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
  optionList(els.filters.severity, [...new Set(state.items.map((item) => item.auditSeverity))]);
  optionList(els.filters.availability, [...new Set(state.items.map((item) => item.availabilityStatus))]);
  optionList(els.filters.referral, [...new Set(state.items.map((item) => item.referralType))]);
  optionList(els.filters.decision, ["approve", "adjust", "reject", "move_to_watchlist", "duplicate", "needs_more_info"]);
}

function itemDecision(item) {
  return state.decisions[item.reviewId]?.action || state.decisions[item.reviewId]?.reviewDecision || "";
}

function filterItems() {
  const query = els.filters.search.value.trim().toLowerCase();
  const filters = {
    priority: els.filters.priority.value,
    region: els.filters.region.value,
    type: els.filters.type.value,
    rule: els.filters.rule.value,
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
      ...(item.auditRules || []),
      ...(item.reviewReasons || [])
    ].join(" ").toLowerCase();
    return (!query || haystack.includes(query))
      && (!filters.priority || item.reviewPriority === filters.priority)
      && (!filters.region || item.region === filters.region)
      && (!filters.type || item.type === filters.type)
      && (!filters.rule || item.auditRules?.includes(filters.rule))
      && (!filters.severity || item.auditSeverity === filters.severity)
      && (!filters.availability || item.availabilityStatus === filters.availability)
      && (!filters.referral || item.referralType === filters.referral)
      && (!filters.decision || itemDecision(item) === filters.decision);
  });
  renderQueue();
}

function renderQueue() {
  els.queueSummary.textContent = `${state.filtered.length} shown from ${state.items.length} review items. ${Object.keys(state.decisions).length} local decision(s) saved.`;
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

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
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

  els.publicPreview.textContent = item.publicCardPreviewText || "No public preview available.";
  renderFindings(item);
  renderSources(item);
  renderDecision(item);
  dl(els.rankingFields, [
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
    link.textContent = index === 0 ? "Open primary source in new tab" : `Open source ${index + 1}`;
    els.sourceLinks.append(link);
  }
  els.sourcePreview.src = links[0];
}

function renderDecision(item) {
  const saved = state.decisions[item.reviewId] || {};
  els.decisionForm.reset();
  const radio = els.decisionForm.querySelector(`input[name="decision"][value="${saved.action || ""}"]`);
  if (radio) radio.checked = true;
  els.decisionForm.reviewer.value = saved.reviewer || "";
  els.decisionForm.reviewedDate.value = saved.reviewedDate || new Date().toISOString().slice(0, 10);
  els.decisionForm.sourceUrl.value = saved.sourceUrl || item.sourceUrls?.[0] || "";
  els.decisionForm.keptProviderId.value = saved.keptProviderId || "";
  els.decisionForm.sourceExcerpt.value = saved.sourceExcerpt || "";
  els.decisionForm.correctedFields.value = saved.correctedFields ? JSON.stringify(saved.correctedFields, null, 2) : "";
  els.decisionForm.reviewNotes.value = saved.reviewNotes || "";
  els.decisionStatus.textContent = saved.action ? `Saved local decision: ${saved.action}` : "No local decision saved for this provider.";
}

function formDecision() {
  const item = state.items.find((entry) => entry.reviewId === state.selectedId);
  const data = new FormData(els.decisionForm);
  const action = data.get("decision");
  if (!item) throw new Error("No provider selected.");
  if (!action) throw new Error("Choose a decision.");
  let correctedFields = {};
  const correctedText = data.get("correctedFields").trim();
  if (correctedText) correctedFields = JSON.parse(correctedText);
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

els.clearDecision.addEventListener("click", () => {
  if (!state.selectedId) return;
  delete state.decisions[state.selectedId];
  saveDecisions();
  const item = state.items.find((entry) => entry.reviewId === state.selectedId);
  if (item) renderDecision(item);
  filterItems();
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
    const response = await fetch(QUEUE_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not load queue JSON (${response.status})`);
    state.queue = await response.json();
    state.items = Array.isArray(state.queue.items) ? state.queue.items : [];
    setOptions();
    filterItems();
  } catch (error) {
    els.queueSummary.textContent = error.message;
  }
}

init();
