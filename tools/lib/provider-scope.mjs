export const baselinePsychiatristScope = [
  "depression/mood disorders",
  "anxiety disorders",
  "bipolar disorder",
  "psychosis/schizophrenia",
  "trauma/PTSD",
  "medication review/diagnosis/risk assessment"
];

export const conditionalPsychiatristScope = {
  adhd: "ADHD/neurodevelopmental assessment",
  addiction: "substance/addiction comorbidity"
};

export const allowedPsychiatristBaselineScope = new Set([
  ...baselinePsychiatristScope,
  ...Object.values(conditionalPsychiatristScope)
]);

export const baselinePsychiatristScopeSource = "https://www.mcnz.org.nz/registration/scopes-of-practice/vocational-and-provisional-vocational/types-of-vocational-scope/psychiatry/";

export const baselinePsychiatristScopeNote = "Baseline routing aid only: psychiatrists are medical specialists trained in psychiatry who may assess diagnosis, medication, risk, and common psychiatric presentations. Public listed interests remain in advertisedSpecialties.";

function textForScope(provider = {}) {
  return [
    provider.fit,
    provider.firstStep,
    provider.cost,
    ...(provider.specialties || []),
    ...(provider.advertisedSpecialties || []),
    ...(provider.services || []),
    ...(provider.tags || [])
  ].join(" ");
}

export function inferPsychiatristBaselineScope(provider = {}) {
  const scope = new Set(baselinePsychiatristScope);
  const text = textForScope(provider);

  if (/\b(adhd|autism|autistic|neurodevelopmental|neurodiversity)\b/i.test(text)) {
    scope.add(conditionalPsychiatristScope.adhd);
  }

  if (/\b(addiction|alcohol|drug|gambling|substance|aod)\b/i.test(text)) {
    scope.add(conditionalPsychiatristScope.addiction);
  }

  return [...scope];
}

export function advertisedSpecialtyEvidenceFor(provider = {}, advertisedSpecialties = []) {
  if (!advertisedSpecialties.length) return [];

  const sourceUrl = provider.source || provider.website || provider.referralSourceUrl || "";
  const fit = String(provider.fit || "");
  const match = fit.match(/(?:special interests?|listed interests?|listed focus|healthpoint lists|has experience with|has interests in|with interests in|specialises in|expertise in|specialt(?:y|ies))\s*(?:including|include|includes|are)?\s+(.+?)(?:\.|$)/i);
  const specificMatch = fit.match(/works in person and via telehealth with\s+(.+?)(?:\.|$)/i);
  const evidenceMatch = match || specificMatch;
  const excerpt = evidenceMatch
    ? evidenceMatch[0].trim()
    : `Advertised specialties/interests recorded as: ${advertisedSpecialties.slice(0, 12).join(", ")}.`;

  return [{
    sourceUrl,
    excerpt,
    capturedAt: provider.lastVerified || provider.verified || provider.referralLastChecked || "",
    confidence: provider.confidence || "medium",
    needsManualReview: provider.needsManualVerification === true
  }];
}

function splitAdvertisedList(value) {
  return String(value || "")
    .replace(/\s+and\s+/gi, ", ")
    .split(",")
    .map((item) => item.replace(/^(especially|including|related)\s+/i, "").trim())
    .filter((item) => !/^(seeing people|ages?\b|adults?$|children$|adolescents?$|older adults?$)/i.test(item))
    .filter((item) => item.length >= 3)
    .slice(0, 12);
}

export function inferAdvertisedSpecialties(provider = {}) {
  if (Array.isArray(provider.advertisedSpecialties) && provider.advertisedSpecialties.length) return provider.advertisedSpecialties;
  if (Array.isArray(provider.specialties) && provider.specialties.length) return provider.specialties;

  const fit = String(provider.fit || "");
  const patterns = [
    /works in person and via telehealth with\s+(.+?)(?:\.|$)/i,
    /(?:special interests?|listed interests?|listed focus|healthpoint lists|has experience with|has interests in|with interests in|specialises in|expertise in)\s*(?:including|include|includes|are)?\s+(.+?)(?:\.|$)/i
  ];

  for (const pattern of patterns) {
    const match = fit.match(pattern);
    if (match) return splitAdvertisedList(match[1]);
  }

  return [];
}

export function withPsychiatristScopeMetadata(provider = {}) {
  if (provider.type !== "psychiatrist") return provider;

  const advertisedSpecialties = inferAdvertisedSpecialties(provider);

  return {
    ...provider,
    baselineScope: Array.isArray(provider.baselineScope) && provider.baselineScope.length
      ? provider.baselineScope
      : inferPsychiatristBaselineScope({ ...provider, advertisedSpecialties }),
    baselineScopeSource: provider.baselineScopeSource || baselinePsychiatristScopeSource,
    baselineScopeNote: provider.baselineScopeNote || baselinePsychiatristScopeNote,
    advertisedSpecialties,
    advertisedSpecialtyEvidence: Array.isArray(provider.advertisedSpecialtyEvidence) && provider.advertisedSpecialtyEvidence.length
      ? provider.advertisedSpecialtyEvidence
      : advertisedSpecialtyEvidenceFor(provider, advertisedSpecialties),
    specialtyTagsSource: provider.specialtyTagsSource || (advertisedSpecialties.length ? "source-backed advertised specialties/interests" : "no advertised specialties recorded")
  };
}
